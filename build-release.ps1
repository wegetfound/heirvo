# build-release.ps1 — builds a signed Heirvo installer with real license product IDs.
#
# Usage:
#   .\build-release.ps1            # production build (requires .env.heirvo)
#   .\build-release.ps1 -DevMode   # internal test build (HEIRVO_ALLOW_DEV_LICENSE=1)
#
# Requirements:
#   - .env.heirvo file in this directory (gitignored)
#   - Rust + cargo-tauri installed
#   - ffmpeg + whisper binaries in src-tauri/resources/ (fetched separately)

param(
    [switch]$DevMode
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$EnvFile = Join-Path $PSScriptRoot ".env.heirvo"

# ── Load .env.heirvo ───────────────────────────────────────────────────────────
if (-not (Test-Path $EnvFile)) {
    Write-Error "Missing .env.heirvo — copy .env.example and fill in your product IDs + HMAC secret."
    exit 1
}

Write-Host "Loading $EnvFile ..." -ForegroundColor Cyan
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#')) {
        $parts = $line.Split('=', 2)
        if ($parts.Count -eq 2) {
            $key   = $parts[0].Trim()
            $value = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
            Write-Host "  SET $key" -ForegroundColor DarkGray
        }
    }
}

# ── Dev mode override ──────────────────────────────────────────────────────────
if ($DevMode) {
    Write-Host "DEV MODE: setting HEIRVO_ALLOW_DEV_LICENSE=1" -ForegroundColor Yellow
    $env:HEIRVO_ALLOW_DEV_LICENSE = "1"
    # Clear product IDs so the dev stub is used.
    Remove-Item Env:\HEIRVO_LS_RECOVER_PRODUCT_ID -ErrorAction SilentlyContinue
    Remove-Item Env:\HEIRVO_LS_ARCHIVE_PRODUCT_ID -ErrorAction SilentlyContinue
    Remove-Item Env:\HEIRVO_LS_FAMILY_PRODUCT_ID  -ErrorAction SilentlyContinue
}

# ── Confirm product IDs are set (unless DevMode) ───────────────────────────────
if (-not $DevMode) {
    $required = @(
        "HEIRVO_LS_RECOVER_PRODUCT_ID",
        "HEIRVO_LS_ARCHIVE_PRODUCT_ID",
        "HEIRVO_LS_FAMILY_PRODUCT_ID",
        "HEIRVO_LICENSE_HMAC_SECRET"
    )
    $missing = $required | Where-Object { -not [System.Environment]::GetEnvironmentVariable($_, 'Process') }
    if ($missing) {
        Write-Error "Missing required env vars: $($missing -join ', ')"
        exit 1
    }
    Write-Host ""
    Write-Host "Product IDs:" -ForegroundColor Green
    Write-Host "  Recover : $env:HEIRVO_LS_RECOVER_PRODUCT_ID"
    Write-Host "  Archive : $env:HEIRVO_LS_ARCHIVE_PRODUCT_ID"
    Write-Host "  Family  : $env:HEIRVO_LS_FAMILY_PRODUCT_ID"
    Write-Host "  HMAC    : [set, $($env:HEIRVO_LICENSE_HMAC_SECRET.Length) chars]"
    Write-Host ""
}

# ── Build ──────────────────────────────────────────────────────────────────────
Write-Host "Starting cargo tauri build ..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
cargo tauri build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed (exit $LASTEXITCODE)"
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Build complete." -ForegroundColor Green
$installer = Get-ChildItem "src-tauri\target\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($installer) {
    Write-Host "Installer: $($installer.FullName)" -ForegroundColor Green
    Write-Host "Size     : $([math]::Round($installer.Length / 1MB, 1)) MB"
}
