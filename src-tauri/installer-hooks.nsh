; Heirvo NSIS installer hooks.
;
; Shows a branded splash (the Heirvo shattered-disc logo) centered on screen for
; ~2.5s on the final leg of installation — like IsoBuster's installer.
;
; This does NOT touch the sidebar / header images configured in tauri.conf.json;
; it only ADDS a centered splash via the AdvSplash plugin (ships with Tauri NSIS).

!macro NSIS_HOOK_POSTINSTALL
  ; Stage the splash bitmap into the installer's temp plugins dir.
  InitPluginsDir
  File "/oname=$PLUGINSDIR\heirvo-splash.bmp" "D:\WeGetFound\brands\heirvo\src-tauri\installer-splash.bmp"

  ; advsplash::show  <hold_ms> <fadein_ms> <fadeout_ms> <keycolor> <file-no-ext>
  ; KeyColor -1 disables color-keying: the bitmap shows as a solid rectangular
  ; card (no transparency, so no magenta fringe). Design the BMP full-bleed with
  ; its own background. 10s hold + fades (~11.6s total) — maxed out for impact,
  ; just under the point where a static splash starts to feel like a hang.
  advsplash::show 10000 600 1000 -1 "$PLUGINSDIR\heirvo-splash"
  ; advsplash pushes a result code onto the stack — discard it.
  Pop $0
!macroend
