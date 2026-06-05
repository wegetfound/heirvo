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
  ; keycolor 0xFF00FF (magenta) is keyed transparent so the logo "floats".
  advsplash::show 2500 600 600 0xFF00FF "$PLUGINSDIR\heirvo-splash"
  ; advsplash pushes a result code onto the stack — discard it.
  Pop $0
!macroend
