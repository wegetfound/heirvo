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

pub fn extract_files(
    reader: &dyn SectorReader,
    map: Option<&SectorMap>,
    files: &[IsoEntry],
    output_dir: &Path,
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
