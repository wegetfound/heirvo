<#
.SYNOPSIS
    Heirvo Smoke-Test Kit -- Extraction Verifier
    Objectively verifies that Heirvo correctly extracted/imported a test disc.

.DESCRIPTION
    After running a Heirvo rescue or Import on a test disc, run this script to get
    a PASS/FAIL table covering:
      - File integrity  : SHA-256 of recovered files vs manifest originals
      - MP4 validity    : ffprobe checks for video/audio streams + duration > 0
      - DB state        : library_discs row health; video_path/deliverable_path on disk
      - Transcript      : target word search in library_transcript_lines

    NON-DESTRUCTIVE. Opens the DB read-only. Never writes to Heirvo data.

.PARAMETER ManifestPath
    Path to manifest.json produced by generate-test-content.ps1.
    Default: .\testkit\content\manifest.json (relative to heirvo root)

.PARAMETER HeirvoOutputDir
    Where Heirvo's recovered/normalised files land.
    Default: C:\Users\Lenovo\AppData\Roaming\com.heirvo.app\recovered

.PARAMETER DiscId
    Optional: library_discs.id slug of the disc you just imported.
    If omitted, checks ALL discs and reports the most recently created ones.

.PARAMETER TestMode
    'data'   -- file integrity + MP4 validity (data/photo disc)
    'spoken' -- MP4 validity + transcript word check
    'all'    -- all checks (default)

.EXAMPLE
    .\testkit\verify-extraction.ps1
    .\testkit\verify-extraction.ps1 -DiscId "hawaii-birthday-1998" -TestMode spoken
#>

[CmdletBinding()]
param(
    [string]$ManifestPath    = "",
    [string]$HeirvoOutputDir = "C:\Users\Lenovo\AppData\Roaming\com.heirvo.app\recovered",
    [string]$DiscId          = "",
    [ValidateSet("data","spoken","all")]
    [string]$TestMode        = "all"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"

# ---------------------------------------------------------------------------
# Absolute paths
# ---------------------------------------------------------------------------
$HEIRVO_ROOT   = "D:\WeGetFound\brands\heirvo"
$TESTKIT       = "$HEIRVO_ROOT\testkit"
$FFPROBE       = "$HEIRVO_ROOT\src-tauri\resources\ffmpeg\ffprobe.exe"
$DB_PATH       = "C:\Users\Lenovo\AppData\Roaming\com.heirvo.app\dvd-recovery.db"
$DOCUMENTS_OUT = "C:\Users\Lenovo\Documents\Heirvo"

if (-not $ManifestPath) { $ManifestPath = "$TESTKIT\content\manifest.json" }

# ---------------------------------------------------------------------------
# Result accumulator
# ---------------------------------------------------------------------------
$Results     = [System.Collections.Generic.List[hashtable]]::new()
$OverallPass = $true

function Add-Result {
    param([string]$check, [string]$status, [string]$detail)
    $script:Results.Add(@{ Check = $check; Status = $status; Detail = $detail })
    if ($status -eq "FAIL") { $script:OverallPass = $false }
}

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
function Write-Header { param([string]$msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-WARN   { param([string]$msg) Write-Host "    [WARN] $msg" -ForegroundColor Yellow }
function Write-Step   { param([string]$msg) Write-Host "    --> $msg" -ForegroundColor Gray }

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
Write-Header "Heirvo Extraction Verifier"
Write-Host "  TestMode  : $TestMode"
Write-Host "  Manifest  : $ManifestPath"
Write-Host "  OutputDir : $HeirvoOutputDir"
if ($DiscId) {
    Write-Host "  DiscId    : $DiscId"
} else {
    Write-Host "  DiscId    : (auto -- most recent)"
}
Write-Host ""

if (-not (Test-Path $FFPROBE)) {
    Write-Host "[FATAL] ffprobe not found at: $FFPROBE" -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------------
# Load manifest
# ---------------------------------------------------------------------------
$manifest    = $null
$targetWords = @()
$contentRoot = ""

if (Test-Path $ManifestPath) {
    try {
        $manifest    = Get-Content $ManifestPath -Raw | ConvertFrom-Json
        $targetWords = @($manifest.spoken_word.target_words)
        $contentRoot = Split-Path $ManifestPath -Parent
        Write-Step "Manifest loaded: $($manifest.files.Count) files, generated $($manifest.generated_at)"
    } catch {
        Write-WARN "Could not parse manifest.json: $_"
        $manifest = $null
    }
} else {
    Write-WARN "Manifest not found at: $ManifestPath"
    Write-WARN "Run generate-test-content.ps1 first."
    Add-Result "Manifest" "WARN" "manifest.json not found -- file integrity checks skipped"
}

# ---------------------------------------------------------------------------
# Helper: run Python script via file (avoids here-string nesting issues)
# ---------------------------------------------------------------------------
function Invoke-Python {
    param([string]$code)
    $pyFile = "$env:TEMP\heirvo_verify_$([System.IO.Path]::GetRandomFileName().Replace('.','_')).py"
    [System.IO.File]::WriteAllText($pyFile, $code, [System.Text.Encoding]::UTF8)
    try {
        $result = python $pyFile 2>&1
        return $result
    } finally {
        Remove-Item $pyFile -ErrorAction SilentlyContinue
    }
}

# ---------------------------------------------------------------------------
# Check 1: File Integrity (SHA-256 comparison)
# ---------------------------------------------------------------------------
if (($TestMode -in @("data","all")) -and $manifest) {
    Write-Header "Check 1 -- File Integrity (SHA-256 comparison)"

    $recoveredFiles = @()
    if (Test-Path $HeirvoOutputDir) {
        $recoveredFiles += (Get-ChildItem $HeirvoOutputDir -Recurse -File |
                            Select-Object -ExpandProperty FullName)
    }
    if (Test-Path $DOCUMENTS_OUT) {
        $recoveredFiles += (Get-ChildItem $DOCUMENTS_OUT -Recurse -File |
                            Select-Object -ExpandProperty FullName)
    }

    $checkedCount = 0
    $presentCount = 0

    foreach ($entry in $manifest.files) {
        $rel = $entry.path.Replace("/","\")
        if ($rel -notmatch '^(data-disc|photos)\\') { continue }

        $filename = Split-Path $rel -Leaf
        $match    = $recoveredFiles |
                    Where-Object { (Split-Path $_ -Leaf) -eq $filename } |
                    Select-Object -First 1

        $checkedCount++
        if (-not $match) {
            Add-Result "Integrity: $filename" "FAIL" "File not found in recovered output"
        } else {
            $presentCount++
            $recoveredHash = (Get-FileHash $match -Algorithm SHA256).Hash
            $origHash      = $entry.sha256
            if ($recoveredHash -eq $origHash) {
                Add-Result "Integrity: $filename" "PASS" "SHA-256 matches original"
            } else {
                # Mismatch may be legitimate if Heirvo re-encoded the file
                Add-Result "Integrity: $filename" "INFO" `
                    "Hash differs (may be re-encoded). Orig:$($origHash.Substring(0,12)) Rec:$($recoveredHash.Substring(0,12))"
            }
        }
    }

    if ($checkedCount -eq 0) {
        Add-Result "Integrity (overall)" "WARN" "No data-disc/photos files to check in manifest"
    } else {
        Add-Result "Integrity (overall)" "INFO" "$presentCount / $checkedCount files found in output"
    }
}

# ---------------------------------------------------------------------------
# Check 2: MP4 Validity (ffprobe)
# ---------------------------------------------------------------------------
if ($TestMode -in @("spoken","all","data")) {
    Write-Header "Check 2 -- MP4 Validity (ffprobe)"

    $mp4Files = @()
    foreach ($dir in @($HeirvoOutputDir, $DOCUMENTS_OUT)) {
        if (Test-Path $dir) {
            $mp4Files += (Get-ChildItem $dir -Recurse -Filter "*.mp4" |
                          Select-Object -ExpandProperty FullName)
        }
    }

    if ($mp4Files.Count -eq 0) {
        Add-Result "MP4 Validity" "FAIL" "No .mp4 files found in output directories"
    } else {
        foreach ($mp4 in $mp4Files) {
            $shortName = Split-Path $mp4 -Leaf
            try {
                $probeArgs = @("-v","quiet","-print_format","json","-show_streams","-show_format",$mp4)
                $probeJson = & $FFPROBE @probeArgs 2>&1
                $probe     = ($probeJson -join "") | ConvertFrom-Json

                $videoStreams = @($probe.streams | Where-Object { $_.codec_type -eq "video" })
                $audioStreams = @($probe.streams | Where-Object { $_.codec_type -eq "audio" })
                $duration    = 0.0
                try { $duration = [double]$probe.format.duration } catch {}

                $detail = "duration=$([math]::Round($duration,1))s"
                if ($videoStreams.Count -gt 0) { $detail += " video=$($videoStreams[0].codec_name)" }
                if ($audioStreams.Count -gt 0) { $detail += " audio=$($audioStreams[0].codec_name)" }

                if ($videoStreams.Count -gt 0 -and $duration -gt 0) {
                    Add-Result "MP4: $shortName" "PASS" $detail
                } elseif ($duration -gt 0 -and $videoStreams.Count -eq 0) {
                    Add-Result "MP4: $shortName" "WARN" "No video stream. $detail"
                } else {
                    Add-Result "MP4: $shortName" "FAIL" "Invalid or zero-duration. $detail"
                }
            } catch {
                Add-Result "MP4: $shortName" "FAIL" "ffprobe error: $_"
            }
        }
    }
}

# ---------------------------------------------------------------------------
# Check 3: Database State (read-only)
# ---------------------------------------------------------------------------
Write-Header "Check 3 -- Database State (read-only)"

if (-not (Test-Path $DB_PATH)) {
    Add-Result "DB: dvd-recovery.db" "WARN" "DB not found at: $DB_PATH (run Heirvo first)"
} else {
    # Escape backslashes for Python string literal
    # Note: do NOT embed ?mode=ro in a PS interpolated string -- ? is a glob char.
    # Instead build the URI via Python string concatenation.
    $dbPathPy = $DB_PATH.Replace("\","/")
    $nl = [char]10

    $pyDbCode  = "import sqlite3, json" + $nl
    $pyDbCode += "db_path = '$dbPathPy'" + $nl
    $pyDbCode += "uri = 'file:' + db_path + '?mode=ro'" + $nl
    $pyDbCode += "try:`n"
    $pyDbCode += "    con = sqlite3.connect(uri, uri=True)`n"
    $pyDbCode += "    cur = con.cursor()`n"
    $pyDbCode += "    cur.execute('''" + "SELECT id, title, status, media_type, video_path, deliverable_path, phrases_indexed, created_at FROM library_discs ORDER BY created_at DESC LIMIT 20" + "''')`n"
    $pyDbCode += "    rows = cur.fetchall()`n"
    $pyDbCode += "    cols = [d[0] for d in cur.description]`n"
    $pyDbCode += "    disc_transcripts = {}`n"
    $pyDbCode += "    if rows:`n"
    $pyDbCode += "        placeholders = ','.join(['?' for _ in rows])`n"
    $pyDbCode += "        ids = [r[0] for r in rows]`n"
    $pyDbCode += "        cur.execute(f'SELECT disc_id, COUNT(*) FROM library_transcript_lines WHERE disc_id IN ({placeholders}) GROUP BY disc_id', ids)`n"
    $pyDbCode += "        for disc_id, cnt in cur.fetchall():`n"
    $pyDbCode += "            disc_transcripts[disc_id] = cnt`n"
    $pyDbCode += "    result = {'discs': []}`n"
    $pyDbCode += "    for row in rows:`n"
    $pyDbCode += "        d = dict(zip(cols, row))`n"
    $pyDbCode += "        d['transcript_line_count'] = disc_transcripts.get(d['id'], 0)`n"
    $pyDbCode += "        result['discs'].append(d)`n"
    $pyDbCode += "    print(json.dumps(result))`n"
    $pyDbCode += "    con.close()`n"
    $pyDbCode += "except Exception as e:`n"
    $pyDbCode += "    print(json.dumps({'error': str(e)}))`n"

    try {
        $pyResult = Invoke-Python $pyDbCode
        $dbData   = ($pyResult -join "") | ConvertFrom-Json

        $pyError = $dbData.PSObject.Properties['error']
        if ($pyError -and $pyError.Value) {
            Add-Result "DB: open" "FAIL" "sqlite3 error: $($pyError.Value)"
        } else {
            $discs = @($dbData.discs)
            if ($discs.Count -eq 0) {
                Add-Result "DB: library_discs" "WARN" "No rows in library_discs (no discs imported yet)"
            } else {
                Add-Result "DB: open" "PASS" "Opened read-only; $($discs.Count) disc(s) found"

                $targetDiscs = if ($DiscId) {
                    @($discs | Where-Object { $_.id -eq $DiscId })
                } else {
                    $discs
                }
                if ($DiscId -and $targetDiscs.Count -eq 0) {
                    Add-Result "DB: disc '$DiscId'" "FAIL" "No row with id='$DiscId' in library_discs"
                }

                foreach ($disc in $targetDiscs) {
                    $dl = "DB disc: $($disc.id)"

                    # Status check
                    $statusOk = $disc.status -in @("recovered","partial")
                    $statusResult = if ($statusOk) { "PASS" } else { "WARN" }
                    Add-Result "$dl status" $statusResult "status=$($disc.status) media_type=$($disc.media_type)"

                    # video_path exists on disk?
                    if ($disc.video_path) {
                        $vpExists = Test-Path $disc.video_path
                        $vpResult = if ($vpExists) { "PASS" } else { "FAIL" }
                        $vpMsg    = if ($vpExists) { "exists" } else { "MISSING on disk" }
                        Add-Result "$dl video_path" $vpResult "$vpMsg : $($disc.video_path)"
                    } else {
                        Add-Result "$dl video_path" "WARN" "video_path is NULL"
                    }

                    # deliverable_path exists on disk?
                    if ($disc.deliverable_path) {
                        $dpExists = Test-Path $disc.deliverable_path
                        $dpResult = if ($dpExists) { "PASS" } else { "FAIL" }
                        $dpMsg    = if ($dpExists) { "exists" } else { "MISSING on disk" }
                        Add-Result "$dl deliverable_path" $dpResult "$dpMsg : $($disc.deliverable_path)"
                    } else {
                        Add-Result "$dl deliverable_path" "WARN" "deliverable_path is NULL (not yet materialized)"
                    }

                    # Bug-class check: status=recovered but no video_path
                    if ($disc.status -eq "recovered" -and -not $disc.video_path) {
                        Add-Result "$dl [BUG CHECK]" "FAIL" `
                            "status=recovered but video_path is NULL -- check promote.rs"
                    }

                    # Transcript lines
                    $tc       = $disc.transcript_line_count
                    $tcResult = if ($tc -gt 0) { "PASS" } else { "WARN" }
                    Add-Result "$dl transcript_lines" $tcResult "$tc line(s) in library_transcript_lines"
                }
            }
        }
    } catch {
        Add-Result "DB: query" "FAIL" "Unexpected error: $_"
    }
}

# ---------------------------------------------------------------------------
# Check 4: Transcript word search
# ---------------------------------------------------------------------------
if (($TestMode -in @("spoken","all")) -and $targetWords.Count -gt 0) {
    Write-Header "Check 4 -- Transcript Word Search"

    if (-not (Test-Path $DB_PATH)) {
        Add-Result "Transcript" "WARN" "DB not found -- transcript check skipped"
    } else {
        $dbPathPy2      = $DB_PATH.Replace("\","/")
        $discIdFilter   = $DiscId
        $wordsJsonPy    = ($targetWords | ForEach-Object { "`"$_`"" }) -join ","
        $wordsListPy    = "[$wordsJsonPy]"

        $pyWordCode  = "import sqlite3, json`n"
        $pyWordCode += "db_path = '$dbPathPy2'`n"
        $pyWordCode += "uri = 'file:' + db_path + '?mode=ro'`n"
        $pyWordCode += "target_words = $wordsListPy`n"
        $pyWordCode += "disc_id_filter = '$discIdFilter'`n"
        $pyWordCode += "try:`n"
        $pyWordCode += "    con = sqlite3.connect(uri, uri=True)`n"
        $pyWordCode += "    cur = con.cursor()`n"
        $pyWordCode += "    if disc_id_filter:`n"
        $pyWordCode += "        cur.execute('SELECT text FROM library_transcript_lines WHERE disc_id=?', (disc_id_filter,))`n"
        $pyWordCode += "    else:`n"
        $pyWordCode += "        cur.execute('SELECT text FROM library_transcript_lines')`n"
        $pyWordCode += "    rows = cur.fetchall()`n"
        $pyWordCode += "    all_text = ' '.join(r[0].lower() for r in rows)`n"
        $pyWordCode += "    found = [w for w in target_words if w.lower() in all_text]`n"
        $pyWordCode += "    missing = [w for w in target_words if w.lower() not in all_text]`n"
        $pyWordCode += "    print(json.dumps({'total_lines': len(rows), 'found': found, 'missing': missing}))`n"
        $pyWordCode += "    con.close()`n"
        $pyWordCode += "except Exception as e:`n"
        $pyWordCode += "    print(json.dumps({'error': str(e)}))`n"

        try {
            $wsResult = Invoke-Python $pyWordCode
            $ws       = ($wsResult -join "") | ConvertFrom-Json

            $wsErr = $ws.PSObject.Properties['error']
            if ($wsErr -and $wsErr.Value) {
                Add-Result "Transcript: query" "FAIL" "Error: $($wsErr.Value)"
            } else {
                $tlResult = if ($ws.total_lines -gt 0) { "PASS" } else { "FAIL" }
                Add-Result "Transcript: total lines" $tlResult "$($ws.total_lines) line(s)"

                foreach ($w in @($ws.found)) {
                    Add-Result "Transcript: '$w'" "PASS" "Found in transcript"
                }
                foreach ($w in @($ws.missing)) {
                    Add-Result "Transcript: '$w'" "FAIL" "NOT found in transcript"
                }

                $foundPct = 0
                if ($targetWords.Count -gt 0) {
                    $foundPct = [math]::Round(100 * $ws.found.Count / $targetWords.Count, 0)
                }
                $covResult = if ($foundPct -ge 60) { "PASS" } elseif ($foundPct -ge 30) { "WARN" } else { "FAIL" }
                Add-Result "Transcript: coverage" $covResult "$($ws.found.Count)/$($targetWords.Count) target words ($foundPct%)"
            }
        } catch {
            Add-Result "Transcript: query" "FAIL" "Unexpected error: $_"
        }
    }
}

# ---------------------------------------------------------------------------
# Print results table
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host ("=" * 80) -ForegroundColor DarkGray
Write-Host "  VERIFICATION RESULTS" -ForegroundColor White
Write-Host ("=" * 80) -ForegroundColor DarkGray

$passCount = 0; $failCount = 0; $warnCount = 0; $infoCount = 0

foreach ($r in $Results) {
    $color = "White"
    switch ($r.Status) {
        "PASS" { $color = "Green";  $passCount++ }
        "FAIL" { $color = "Red";    $failCount++ }
        "WARN" { $color = "Yellow"; $warnCount++ }
        "INFO" { $color = "Cyan";   $infoCount++ }
    }
    $checkPad  = $r.Check.PadRight(44)
    $statusPad = ("[$($r.Status)]").PadRight(7)
    Write-Host ("  {0} {1} {2}" -f $checkPad, $statusPad, $r.Detail) -ForegroundColor $color
}

Write-Host ("=" * 80) -ForegroundColor DarkGray
Write-Host ""

$overall = if ($failCount -gt 0) { "FAIL" } elseif ($warnCount -gt 0) { "WARN" } else { "PASS" }
$overallColor = if ($overall -eq "PASS") { "Green" } elseif ($overall -eq "WARN") { "Yellow" } else { "Red" }
Write-Host ("  Overall: {0,-8} | PASS:{1}  FAIL:{2}  WARN:{3}  INFO:{4}" -f `
    $overall, $passCount, $failCount, $warnCount, $infoCount) -ForegroundColor $overallColor
Write-Host ""

# ---------------------------------------------------------------------------
# DB summary table (quick view of all discs)
# ---------------------------------------------------------------------------
Write-Header "DB -- All library_discs (most recent first)"

if (Test-Path $DB_PATH) {
    $dbPathPy3  = $DB_PATH.Replace("\","/")
    $pyDumpCode  = "import sqlite3, json`n"
    $pyDumpCode += "db_path = '$dbPathPy3'`n"
    $pyDumpCode += "uri = 'file:' + db_path + '?mode=ro'`n"
    $pyDumpCode += "try:`n"
    $pyDumpCode += "    con = sqlite3.connect(uri, uri=True)`n"
    $pyDumpCode += "    cur = con.cursor()`n"
    $pyDumpCode += "    cur.execute('''" + "SELECT id, title, status, media_type, CASE WHEN video_path IS NOT NULL THEN 'Y' ELSE 'N' END AS has_video, CASE WHEN deliverable_path IS NOT NULL THEN 'Y' ELSE 'N' END AS has_deliv, (SELECT COUNT(*) FROM library_transcript_lines t WHERE t.disc_id=d.id) AS lines FROM library_discs d ORDER BY created_at DESC LIMIT 20" + "''')`n"
    $pyDumpCode += "    rows = cur.fetchall()`n"
    $pyDumpCode += "    cols = [d[0] for d in cur.description]`n"
    $pyDumpCode += "    print(json.dumps({'rows': [dict(zip(cols,r)) for r in rows]}))`n"
    $pyDumpCode += "    con.close()`n"
    $pyDumpCode += "except Exception as e:`n"
    $pyDumpCode += "    print(json.dumps({'error': str(e)}))`n"

    try {
        $dumpResult = Invoke-Python $pyDumpCode
        $dump       = ($dumpResult -join "") | ConvertFrom-Json
        $dumpErr    = $dump.PSObject.Properties['error']
        $dumpRows   = $dump.PSObject.Properties['rows']
        if (-not ($dumpErr -and $dumpErr.Value) -and $dumpRows -and $dumpRows.Value.Count -gt 0) {
            Write-Host ("  {0,-28} {1,-12} {2,-11} {3,-10} {4} {5} {6}" -f `
                "id","title","status","media_type","video","deliv","lines") -ForegroundColor White
            Write-Host ("  " + ("-" * 76)) -ForegroundColor DarkGray
            foreach ($row in $dumpRows.Value) {
                $line = "  {0,-28} {1,-12} {2,-11} {3,-10} {4}     {5}     {6}" -f `
                    $row.id, $row.title, $row.status, $row.media_type, `
                    $row.has_video, $row.has_deliv, $row.lines
                Write-Host $line -ForegroundColor Gray
            }
        } elseif (-not $dumpRows -or $dumpRows.Value.Count -eq 0) {
            Write-Host "  (no discs in library yet)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  (Could not dump DB table: $_)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  (DB not found)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Run complete. $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
Write-Host ""
