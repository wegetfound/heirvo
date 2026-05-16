# Bundled whisper.cpp

Place `whisper-cli.exe` (+ any required `.dll`s like `whisper.dll`,
`ggml*.dll`) and the `ggml-base.en.bin` model here so they ship with the
installer.

## Why

The transcription pipeline shells out to `whisper-cli.exe` rather than
linking via FFI. Mirrors the FFmpeg pattern (clean licensing boundary,
easy version pinning, no C++ toolchain on dev/CI).

## Fetch automatically

```
npm run fetch-whisper
```

Pulls the latest official Windows x64 binary from
`https://github.com/ggml-org/whisper.cpp/releases` and the `ggml-base.en`
model (~142 MB) from Hugging Face.

## Don't commit the binaries

`*.exe`, `*.dll`, and `*.bin` are excluded by `.gitignore`. Each developer
fetches them locally via the script above.

## Runtime fallback

If `whisper-cli.exe` is absent, the transcription worker gracefully falls
back to the stub backend so the dev server stays usable. See
`src-tauri/src/transcription/whisper_cpp.rs::locate()` for the lookup order.
