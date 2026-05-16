#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Downloads whisper.cpp Windows x64 binary + ggml-base.en model into
    src-tauri/resources/whisper/.

.DESCRIPTION
    Fetches the official whisper.cpp Windows release (whisper-bin-x64.zip)
    and the ggml-base.en.bin model from Hugging Face (~142 MB).

    Idempotent — exits immediately if both whisper-cli.exe and
    ggml-base.en.bin are already present.

.PARAMETER Force
    Re-download even if files already exist.

.EXAMPLE
    pwsh ./scripts/fetch-whisper.ps1
    pwsh ./scripts/fetch-whisper.ps1 -Force
#>

[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'  # massively faster Invoke-WebRequest

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$TargetDir = Join-Path $RepoRoot 'src-tauri/resources/whisper'
$WhisperExe = Join-Path $TargetDir 'whisper-cli.exe'
$ModelFile = Join-Path $TargetDir 'ggml-base.en.bin'

function Format-MB {
    param([string]$Path)
    $mb = (Get-Item $Path).Length / 1MB
    return ('{0:N1} MB' -f $mb)
}

if (-not $Force -and (Test-Path $WhisperExe) -and (Test-Path $ModelFile)) {
    $fmsg = 'whisper.cpp already present at {0} — skipping.' -f $TargetDir
    Write-Host $fmsg -ForegroundColor Green
    Write-Host ('  whisper-cli.exe:   {0}' -f (Format-MB $WhisperExe))
    Write-Host ('  ggml-base.en.bin:  {0}' -f (Format-MB $ModelFile))
    Write-Host '  Pass -Force to re-download.'
    exit 0
}

New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null

$BinUrl = 'https://github.com/ggml-org/whisper.cpp/releases/latest/download/whisper-bin-x64.zip'
$ModelUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'
$ZipPath = Join-Path $env:TEMP "whisper-bin-x64-$([System.Guid]::NewGuid().ToString('N')).zip"
$ExtractDir = Join-Path $env:TEMP "whisper-extract-$([System.Guid]::NewGuid().ToString('N'))"

$totalStart = Get-Date

try {
    # ----- 1. Binary -----
    if ($Force -or -not (Test-Path $WhisperExe)) {
        Write-Host "Downloading whisper.cpp Windows x64 binary..." -ForegroundColor Cyan
        Write-Host "  URL: $BinUrl"
        $start = Get-Date
        Invoke-WebRequest -Uri $BinUrl -OutFile $ZipPath -UseBasicParsing
        $elapsed = (Get-Date) - $start
        $sizeMB = (Get-Item $ZipPath).Length / 1MB
        Write-Host ("  Downloaded {0:N1} MB in {1:N1}s" -f $sizeMB, $elapsed.TotalSeconds) -ForegroundColor Green

        Write-Host "Extracting..." -ForegroundColor Cyan
        Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir -Force

        # Layout has varied across releases. Search recursively. Older releases
        # called the binary `main.exe`; newer ones use `whisper-cli.exe`.
        $exeSrc = Get-ChildItem -Path $ExtractDir -Recurse -Filter 'whisper-cli.exe' | Select-Object -First 1
        if (-not $exeSrc) {
            $exeSrc = Get-ChildItem -Path $ExtractDir -Recurse -Filter 'main.exe' | Select-Object -First 1
        }
        if (-not $exeSrc) { throw "whisper-cli.exe / main.exe not found in archive" }

        Copy-Item $exeSrc.FullName $WhisperExe -Force
        Write-Host ('  whisper-cli.exe: {0}' -f (Format-MB $WhisperExe)) -ForegroundColor Green

        # Copy every DLL sitting next to the binary (whisper.dll, ggml*.dll, ...).
        $dlls = Get-ChildItem -Path $exeSrc.DirectoryName -Filter '*.dll'
        foreach ($dll in $dlls) {
            $dest = Join-Path $TargetDir $dll.Name
            Copy-Item $dll.FullName $dest -Force
            Write-Host ('  {0}: {1}' -f $dll.Name, (Format-MB $dest))
        }
    } else {
        Write-Host "whisper-cli.exe already present — skipping binary download." -ForegroundColor DarkGray
    }

    # ----- 2. Model -----
    if ($Force -or -not (Test-Path $ModelFile)) {
        Write-Host "Downloading ggml-base.en model (~142 MB)..." -ForegroundColor Cyan
        Write-Host "  URL: $ModelUrl"
        Write-Host "  This may take a minute or two."
        $start = Get-Date
        Invoke-WebRequest -Uri $ModelUrl -OutFile $ModelFile -UseBasicParsing
        $elapsed = (Get-Date) - $start
        Write-Host ('  Model: {0} in {1:N1}s' -f (Format-MB $ModelFile), $elapsed.TotalSeconds) -ForegroundColor Green
    } else {
        Write-Host "ggml-base.en.bin already present — skipping model download." -ForegroundColor DarkGray
    }

    $totalElapsed = (Get-Date) - $totalStart
    Write-Host ""
    Write-Host ("Installed whisper.cpp in {0:N1}s total:" -f $totalElapsed.TotalSeconds) -ForegroundColor Green
    Write-Host ('  {0}  ({1})' -f $WhisperExe, (Format-MB $WhisperExe))
    Write-Host ('  {0} ({1})' -f $ModelFile, (Format-MB $ModelFile))
} finally {
    if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue }
    if (Test-Path $ExtractDir) { Remove-Item $ExtractDir -Recurse -Force -ErrorAction SilentlyContinue }
}
