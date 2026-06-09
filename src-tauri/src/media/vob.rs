//! VOB extraction — pulls individual VIDEO_TS files (.IFO/.BUP/.VOB) out of
//! a recovery session and writes them to disk as standalone files.
//!
//! Uses the ISO 9660 directory entries from `dvd::iso9660` for the file
//! locations, then streams each file's sector range from the drive.

use crate::disc::sector::{ReadOptions, SectorReader, DVD_SECTOR_SIZE};
use crate::dvd::iso9660::IsoEntry;
use crate::recovery::map::{SectorMap, SectorState};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedFile {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub good_sectors: u64,
    pub zero_filled_sectors: u64,
    pub good_read_failed_sectors: u64,
}

/// Extract VIDEO_TS / data-disc files to `output_dir`.
///
/// `skip_menu_and_empty`: when true (the Save-as-MP4 path), 0-byte entries and
/// DVD menu VOBs (`VIDEO_TS.VOB`, `VTS_nn_0.VOB`) are skipped — the muxer only
/// needs title VOBs, so writing those is pure clutter (the VMG menu is often a
/// 0-byte file). The "Original files" save passes false to keep the disc exactly
/// as it was.
pub fn extract_files(
    reader: &dyn SectorReader,
    map: Option<&SectorMap>,
    files: &[IsoEntry],
    output_dir: &Path,
    skip_menu_and_empty: bool,
) -> std::io::Result<Vec<ExtractedFile>> {
    std::fs::create_dir_all(output_dir)?;
    let mut results = Vec::with_capacity(files.len());
    let zero_block = [0u8; DVD_SECTOR_SIZE];
    let opts = ReadOptions { retries: 2, slow_mode: false, timeout_ms: 15_000 };

    for entry in files {
        // Defensive: never let an empty or NUL-bearing name reach a WinAPI path
        // call (std::fs hard-errors on interior NULs). The iso9660 parser already
        // strips these, but skip just in case rather than failing the whole save.
        if entry.name.trim().is_empty() || entry.name.contains('\0') {
            continue;
        }
        // Storage hygiene: don't even write the clutter on the MP4 path.
        if skip_menu_and_empty {
            let upper = entry.name.to_ascii_uppercase();
            let is_menu_vob = upper == "VIDEO_TS.VOB" || upper.ends_with("_0.VOB");
            if entry.size_bytes == 0 || is_menu_vob {
                continue;
            }
        }
        // Path-traversal guard: reject any entry whose name contains `..`,
        // an absolute root/prefix, or any non-Normal component (same pattern
        // as imagemagick_install.rs). Legitimate subdirectory paths such as
        // "PHOTOS/2003/IMG.JPG" consist entirely of Normal components and pass.
        if std::path::Path::new(&entry.name).components().any(|c| {
            !matches!(
                c,
                std::path::Component::Normal(_) | std::path::Component::CurDir
            )
        }) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("unsafe ISO entry path rejected: {}", entry.name),
            ));
        }

        let out_path = output_dir.join(&entry.name);
        // Ensure parent directories exist for nested entries (data-disc
        // recovery passes paths like "PHOTOS/2003/IMG.JPG").
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let file = File::create(&out_path)?;
        let mut writer = BufWriter::with_capacity(512 * 1024, file);

        let total = entry.sector_count();
        let mut good = 0u64;
        let mut zeroed = 0u64;
        let mut good_read_failed = 0u64;
        let mut bytes_remaining = entry.size_bytes;

        for i in 0..total {
            let lba = entry.start_lba + i;
            let known_bad =
                map.map(|m| matches!(m.get(lba), SectorState::Failed | SectorState::Skipped))
                    .unwrap_or(false);
            // For the last sector, only write the partial bytes that belong
            // to this file (DVD VOBs are sector-aligned but other files may not be).
            let bytes_to_write =
                std::cmp::min(bytes_remaining, DVD_SECTOR_SIZE as u64) as usize;

            if known_bad {
                writer.write_all(&zero_block[..bytes_to_write])?;
                zeroed += 1;
            } else {
                let res = reader.read_sector(lba, opts);
                match res.data {
                    Some(d) => {
                        writer.write_all(&d[..bytes_to_write])?;
                        good += 1;
                    }
                    None => {
                        writer.write_all(&zero_block[..bytes_to_write])?;
                        zeroed += 1;
                        good_read_failed += 1;
                    }
                }
            }
            bytes_remaining = bytes_remaining.saturating_sub(bytes_to_write as u64);
        }

        writer.flush()?;
        results.push(ExtractedFile {
            name: entry.name.clone(),
            path: out_path.to_string_lossy().to_string(),
            size_bytes: entry.size_bytes,
            good_sectors: good,
            zero_filled_sectors: zeroed,
            good_read_failed_sectors: good_read_failed,
        });
    }

    Ok(results)
}

/// Remove VOB/IFO/BUP working-files from a `VIDEO_TS` scratch directory after a
/// save has produced its real output (the `.mp4` and the recovery `.iso` both
/// live in the PARENT directory, never here, so they're untouched). Returns the
/// number of bytes reclaimed.
///
/// Safety: only files whose extension is `vob`/`ifo`/`bup` inside `video_ts_dir`
/// are deleted — nothing else, and nothing outside this directory. The directory
/// itself is removed only if it ends up empty. Best-effort: per-file errors are
/// logged and skipped (a tidy failure must never fail the save).
pub fn tidy_video_ts_scratch(video_ts_dir: &Path) -> u64 {
    let mut reclaimed = 0u64;
    let Ok(rd) = std::fs::read_dir(video_ts_dir) else {
        return 0;
    };
    for entry in rd.flatten() {
        let path = entry.path();
        let is_scratch = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| {
                let e = e.to_ascii_lowercase();
                e == "vob" || e == "ifo" || e == "bup"
            })
            .unwrap_or(false);
        if !is_scratch {
            continue;
        }
        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
        match std::fs::remove_file(&path) {
            Ok(()) => reclaimed += size,
            Err(e) => tracing::warn!("tidy_video_ts_scratch: remove {}: {e}", path.display()),
        }
    }
    // Remove the VIDEO_TS dir if it's now empty (leave it if anything remains).
    if std::fs::read_dir(video_ts_dir)
        .map(|mut d| d.next().is_none())
        .unwrap_or(false)
    {
        let _ = std::fs::remove_dir(video_ts_dir);
    }
    reclaimed
}

#[cfg(test)]
mod tests {
    use super::tidy_video_ts_scratch;
    use std::fs;

    #[test]
    fn tidy_removes_only_video_ts_scratch() {
        let base = std::env::temp_dir().join(format!("heirvo_tidy_test_{}", std::process::id()));
        let video_ts = base.join("VIDEO_TS");
        fs::create_dir_all(&video_ts).unwrap();
        // Scratch inside VIDEO_TS.
        fs::write(video_ts.join("VTS_01_1.VOB"), vec![0u8; 1000]).unwrap();
        fs::write(video_ts.join("VIDEO_TS.VOB"), b"").unwrap(); // 0-byte menu
        fs::write(video_ts.join("VTS_01_0.IFO"), vec![0u8; 200]).unwrap();
        // Deliverables in the PARENT dir — must survive.
        fs::write(base.join("disc.iso"), vec![0u8; 500]).unwrap();
        fs::write(base.join("disc.mp4"), vec![0u8; 500]).unwrap();

        let reclaimed = tidy_video_ts_scratch(&video_ts);

        assert_eq!(reclaimed, 1200); // 1000 + 0 + 200
        assert!(!video_ts.exists(), "empty VIDEO_TS dir should be removed");
        assert!(base.join("disc.iso").exists(), ".iso must be untouched");
        assert!(base.join("disc.mp4").exists(), ".mp4 must be untouched");

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn tidy_keeps_non_scratch_and_dir() {
        let base = std::env::temp_dir().join(format!("heirvo_tidy_test2_{}", std::process::id()));
        let video_ts = base.join("VIDEO_TS");
        fs::create_dir_all(&video_ts).unwrap();
        fs::write(video_ts.join("VTS_01_1.VOB"), vec![0u8; 100]).unwrap();
        fs::write(video_ts.join("notes.txt"), b"keep me").unwrap(); // not scratch

        tidy_video_ts_scratch(&video_ts);

        assert!(!video_ts.join("VTS_01_1.VOB").exists(), "VOB removed");
        assert!(video_ts.join("notes.txt").exists(), "non-scratch file kept");
        assert!(video_ts.exists(), "dir kept because a file remains");

        let _ = fs::remove_dir_all(&base);
    }
}
