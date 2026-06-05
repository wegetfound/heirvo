//! Console-window suppression for child processes.
//!
//! Heirvo is a GUI app. When a GUI process on Windows spawns a *console*
//! subprocess (ffmpeg, ffprobe, whisper-cli, taskkill, …) without the
//! `CREATE_NO_WINDOW` creation flag, Windows allocates and briefly shows a black
//! console window — which flashes up over the app during transcodes / probes /
//! transcription. This trait applies that flag uniformly so no console ever
//! appears. It is a no-op on non-Windows targets.
//!
//! Usage — insert `.no_console()` anywhere in the builder chain, e.g.
//! ```ignore
//! let out = Command::new(&ffmpeg).args(args).no_console().output().await?;
//! ```
//! or, for the `let mut cmd = …` style, call `cmd.no_console();` before spawn.

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Suppress the Windows console window for a spawned child process.
pub trait NoConsole {
    /// Apply `CREATE_NO_WINDOW` on Windows; no-op elsewhere. Returns `&mut Self`
    /// so it can sit anywhere in a builder chain.
    fn no_console(&mut self) -> &mut Self;
}

impl NoConsole for std::process::Command {
    fn no_console(&mut self) -> &mut Self {
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            self.creation_flags(CREATE_NO_WINDOW);
        }
        self
    }
}

impl NoConsole for tokio::process::Command {
    fn no_console(&mut self) -> &mut Self {
        #[cfg(windows)]
        {
            // tokio::process::Command exposes `creation_flags` natively on Windows.
            self.creation_flags(CREATE_NO_WINDOW);
        }
        self
    }
}
