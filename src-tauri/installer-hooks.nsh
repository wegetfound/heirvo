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
  ; KeyColor -1 disables color-keying: solid rectangular card, no magenta fringe.
  ; IMPORTANT: advsplash BLOCKS the installer thread for the whole duration. Windows
  ; marks a window "Not Responding" after ~5s of a blocked message pump, so the hold
  ; MUST stay well under 5s or the installer appears frozen mid-install. 2.5s + short
  ; fades (~3.5s total) is the safe max — matches IsoBuster. The LONGER brand moment
  ; lives in the in-app load splash, which is non-blocking.
  advsplash::show 2500 400 600 -1 "$PLUGINSDIR\heirvo-splash"
  ; advsplash pushes a result code onto the stack — discard it.
  Pop $0
!macroend
