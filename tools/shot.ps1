# shot.ps1 — capture a window (default: Heirvo) to a PNG so Claude can read it.
# Usage:  powershell -ExecutionPolicy Bypass -File tools/shot.ps1 [-Title "Heirvo"] [-OutPath "<path>"]
# Falls back to the full primary screen if no matching window is found.
# Note: captures the VISIBLE pixels at the window's bounds, so the window must
# be on-screen (not minimized/fully occluded) — this is the reliable path for
# GPU/WebView windows, where PrintWindow often returns black.
param(
  [string]$Process = "heirvo",            # process name (exe without .exe) — exact, unambiguous
  [string]$Title   = "",                  # optional window-title substring fallback
  [string]$OutPath = "$env:TEMP\heirvo_shot.png"
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
public struct RECT { public int Left, Top, Right, Bottom; }
public class WinShot {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

# Match by process name first (exact — avoids colliding with browser tabs whose
# title happens to contain the app name), then fall back to a title substring.
$proc = Get-Process -Name $Process -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc -and $Title) {
  $proc = Get-Process |
    Where-Object { $_.MainWindowTitle -like "*$Title*" -and $_.MainWindowHandle -ne 0 } |
    Select-Object -First 1
}

if ($proc) {
  # Bring the target window to the front so we capture IT, not whatever's on top.
  [void][WinShot]::ShowWindow($proc.MainWindowHandle, 9)   # SW_RESTORE
  [void][WinShot]::SetForegroundWindow($proc.MainWindowHandle)
  Start-Sleep -Milliseconds 400
  $r = New-Object RECT
  [void][WinShot]::GetWindowRect($proc.MainWindowHandle, [ref]$r)
  $w = $r.Right - $r.Left
  $h = $r.Bottom - $r.Top
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.Left, $r.Top, 0, 0, (New-Object System.Drawing.Size($w, $h)))
} else {
  $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
}

$bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output $OutPath
