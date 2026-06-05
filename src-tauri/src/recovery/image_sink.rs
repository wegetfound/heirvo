//! Disc image written *during* the recovery pass.
//!
//! Historically the engine read every sector but kept only the good/bad
//! `SectorMap` — the actual bytes were hashed for a receipt and thrown away, so
//! every output (ISO, MP4, file extraction) had to re-read the disc. On a dying
//! disc that is exactly wrong: each extra pass risks more damage (and can wedge
//! the drive firmware into a reset).
//!
//! `ImageSink` records each good sector's bytes at its offset in a local image
//! file as the rescue reads it, so the disc is read **once**. Downstream outputs
//! then derive from the local image instead of touching the disc again.
//!
//! Bad sectors are left as the file's zero-fill (matching the previous ISO
//! behavior). The file is pre-sized and reopened on resume so a continued
//! recovery patches it in place.

use std::fs::OpenOptions;
use std::io;
use std::path::{Path, PathBuf};

/// Deterministic path for a session's disc image: `<output_dir>/<label>.iso`.
///
/// Deterministic so a resumed recovery reopens the same file, and so the ISO /
/// extraction commands can find it without re-reading the disc.
pub fn disc_image_path(output_dir: &str, disc_label: &str) -> PathBuf {
    let safe: String = disc_label
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
        .collect();
    let trimmed = safe.trim_matches('_');
    let stem = if trimmed.is_empty() { "disc" } else { trimmed };
    PathBuf::from(output_dir).join(format!("{stem}.iso"))
}

/// Sink that records good sectors into a pre-sized image file via positioned
/// writes. Cheap, sequential (the read loop is single-threaded), and isolated so
/// the engine stays testable (the sink is optional).
pub struct ImageSink {
    file: std::fs::File,
    sector_size: u64,
    total_sectors: u64,
}

impl ImageSink {
    /// Open (creating if needed) the image at `path`, pre-sized to hold the whole
    /// disc. Existing content is preserved — a resumed recovery patches in place.
    pub fn create(path: &Path, total_sectors: u64, sector_size: u32) -> io::Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(path)?;
        let want = total_sectors.saturating_mul(sector_size as u64);
        // Pre-size (sparse on NTFS). Never shrink — resume keeps prior bytes.
        if file.metadata()?.len() < want {
            file.set_len(want)?;
        }
        Ok(Self {
            file,
            sector_size: sector_size as u64,
            total_sectors,
        })
    }

    /// Write one sector's bytes at `lba * sector_size`. Positioned and
    /// thread-safe. Best-effort: a write error (e.g. disk full) must NEVER abort
    /// recovery — the sector is still Good in the map and can be re-derived from
    /// the disc if absolutely needed.
    pub fn write_sector(&self, lba: u64, data: &[u8]) {
        // Guard against LBA out of bounds (bogus drive capacity).
        if lba >= self.total_sectors {
            tracing::warn!(
                "write_sector: LBA {lba} >= total_sectors {}, skipping",
                self.total_sectors
            );
            return;
        }
        // Guard against offset overflow.
        let mut offset = match lba.checked_mul(self.sector_size) {
            Some(off) => off,
            None => {
                tracing::warn!(
                    "write_sector: offset overflow for LBA {lba} * sector_size {}",
                    self.sector_size
                );
                return;
            }
        };
        let mut buf = data;
        while !buf.is_empty() {
            match self.write_at(buf, offset) {
                Ok(0) => break,
                Ok(n) => {
                    buf = &buf[n..];
                    offset += n as u64;
                }
                Err(ref e) if e.kind() == io::ErrorKind::Interrupted => continue,
                Err(_) => break,
            }
        }
    }

    #[cfg(windows)]
    fn write_at(&self, buf: &[u8], offset: u64) -> io::Result<usize> {
        use std::os::windows::fs::FileExt;
        self.file.seek_write(buf, offset)
    }

    #[cfg(not(windows))]
    fn write_at(&self, buf: &[u8], offset: u64) -> io::Result<usize> {
        use std::os::unix::fs::FileExt;
        self.file.write_at(buf, offset)
    }
}
