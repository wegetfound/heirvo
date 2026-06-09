//! ISO image assembly from a recovery session's sector data.
//!
//! Streams raw 2048-byte sectors from the disc to a target .iso file:
//!   - Sectors marked Good are read fresh and written.
//!   - Sectors marked Failed/Skipped/Unknown are written as zero-filled blocks.
//!
//! The resulting file is exactly `total_sectors * 2048` bytes, so absolute
//! sector offsets in the original disc match offsets in the ISO. This lets
//! downstream tools (FFmpeg, libdvdread) mount it as a virtual disc.

use crate::disc::sector::{ReadOptions, SectorReader, DVD_SECTOR_SIZE};
use crate::recovery::map::{SectorMap, SectorState};
use std::fs::File;
use std::io::{BufWriter, Read, Write};
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

/// Progress callback: (current_lba, total_lbas, good, failed).
pub type ProgressFn = Arc<dyn Fn(u64, u64, u64, u64) + Send + Sync>;

pub struct AssembleStats {
    pub bytes_written: u64,
    /// Sectors that were marked Good in the map and were successfully re-read.
    pub good_sectors: u64,
    /// Sectors that were already-known-bad (Failed/Skipped/Unknown in the map)
    /// and were written as zero blocks. Does NOT include Good-in-map read failures.
    pub zero_filled_sectors: u64,
    /// Sectors that were marked Good in the map but whose physical re-read
    /// failed during assembly. Written as zero blocks. Non-zero means the
    /// disc degraded since the recovery pass — consider re-running recovery.
    pub good_read_failed_sectors: u64,
}

/// Assemble an ISO from a connected sector reader plus a known sector map.
///
/// Re-reads Good sectors fresh from the disc rather than caching them in
/// memory — for a single-layer DVD this still streams at the drive's sequential
/// read speed (~10 MB/s on damaged discs, faster on clean media).
pub fn assemble_iso(
    reader: &dyn SectorReader,
    map: &SectorMap,
    output_path: &Path,
    progress: Option<ProgressFn>,
    cancel: Option<Arc<std::sync::atomic::AtomicBool>>,
) -> std::io::Result<AssembleStats> {
    let total = map.total();
    if total != reader.capacity() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            format!(
                "sector map size {} does not match drive capacity {}",
                total,
                reader.capacity()
            ),
        ));
    }

    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let file = File::create(output_path)?;
    let mut writer = BufWriter::with_capacity(1024 * 1024, file);

    let zero_block = [0u8; DVD_SECTOR_SIZE];
    let good_count = AtomicU64::new(0);
    let zero_count = AtomicU64::new(0);
    let good_read_failed_count = AtomicU64::new(0);

    let report_every = (total / 200).max(100);
    let opts = ReadOptions { retries: 1, slow_mode: false, timeout_ms: 15_000 };

    for lba in 0..total {
        if let Some(c) = &cancel {
            if c.load(Ordering::SeqCst) {
                writer.flush()?;
                break;
            }
        }
        match map.get(lba) {
            SectorState::Good => {
                let res = reader.read_sector(lba, opts);
                match res.data {
                    Some(d) => {
                        writer.write_all(&d)?;
                        good_count.fetch_add(1, Ordering::Relaxed);
                    }
                    None => {
                        // Map said Good but the physical re-read failed now —
                        // write zeros and count separately so callers can
                        // distinguish degraded-Good from already-known-bad.
                        writer.write_all(&zero_block)?;
                        good_read_failed_count.fetch_add(1, Ordering::Relaxed);
                    }
                }
            }
            _ => {
                writer.write_all(&zero_block)?;
                zero_count.fetch_add(1, Ordering::Relaxed);
            }
        }
        if lba % report_every == 0 {
            if let Some(p) = &progress {
                p(
                    lba,
                    total,
                    good_count.load(Ordering::Relaxed),
                    zero_count.load(Ordering::Relaxed),
                );
            }
        }
    }

    writer.flush()?;
    drop(writer);

    Ok(AssembleStats {
        bytes_written: total * DVD_SECTOR_SIZE as u64,
        good_sectors: good_count.load(Ordering::Relaxed),
        zero_filled_sectors: zero_count.load(Ordering::Relaxed),
        good_read_failed_sectors: good_read_failed_count.load(Ordering::Relaxed),
    })
}

// ─── Dead-filesystem ISO recovery (program-stream carving) ──────────────────
//
// Recovered DVD-Video ISOs frequently have a *destroyed* filesystem: the
// ISO-9660 / UDF volume descriptors live in the first 16–256 sectors, which are
// exactly the sectors the engine couldn't read on a damaged disc. The result is
// an ISO that neither Windows (`Mount-DiskImage` → 0x80070570) nor ffmpeg
// (`-i file.iso` → "Invalid data found") can open — even though every VOB
// program-stream sector deeper in the image is intact.
//
// This is precisely why the old "Save as MP4" failed on the discs that only
// survived as ISO: there was no directory to locate VIDEO_TS/*.VOB. The fix is
// the same philosophy as `dvd::sig_scan` — ignore the dead metadata and read
// the raw payload directly. We find where the MPEG-2 Program Stream begins and
// let ffmpeg demux from there via the `subfile:` protocol (no mount, no temp
// file, no 3 GB copy).

/// Upper bound on how far we scan for the first pack-start code. The video
/// payload on every consumer DVD begins within the first few MB (right after
/// the small VIDEO_TS metadata area); 256 MB is a generous margin that still
/// covers images whose opening region was zero-filled by the recovery.
const MPEG_PS_SCAN_LIMIT: u64 = 256 * 1024 * 1024;

/// A real DVD program stream is a near-continuous run of ~2 KB packs, so a
/// healthy 1 MB window holds on the order of 500 pack-start codes. A
/// fragment-only *failed* recovery (the disc was too damaged — most sectors came
/// back as zeros) has only a handful of isolated packs adrift in a sea of zeros.
/// This threshold cleanly separates "real video here" from "scattered debris",
/// well below a genuine stream's density and far above stray fragments.
const MIN_PACKS_PER_DENSE_WINDOW: usize = 64;

/// Scan a raw disc image for the start of a *substantial* MPEG-2 Program Stream
/// and return the byte offset of its first pack-start code (`00 00 01 BA`), or
/// `None` if the image contains no continuous stream within
/// [`MPEG_PS_SCAN_LIMIT`].
///
/// We require continuity — a 1 MB window holding at least
/// [`MIN_PACKS_PER_DENSE_WINDOW`] packs — rather than returning the first stray
/// pack-start code. A nearly-empty failed recovery often has an isolated
/// fragment near the front followed by tens of MB of zeros; piping ffmpeg that
/// fragment yields a stalled, output-less transcode. Returning `None` lets the
/// caller honestly report "not enough was recovered to play" instead of hanging.
pub fn find_mpeg_ps_offset(path: &Path) -> std::io::Result<Option<u64>> {
    const PACK_START: [u8; 4] = [0x00, 0x00, 0x01, 0xBA];
    const WINDOW: usize = 1024 * 1024;

    let mut f = File::open(path)?;
    let mut buf = vec![0u8; WINDOW];
    let mut base: u64 = 0;

    while base < MPEG_PS_SCAN_LIMIT {
        // Fill a full window (reads can be short — accumulate until full or EOF)
        // so pack-density counting isn't skewed by buffering.
        let mut filled = 0usize;
        while filled < WINDOW {
            let n = f.read(&mut buf[filled..])?;
            if n == 0 {
                break;
            }
            filled += n;
        }
        if filled == 0 {
            break;
        }

        // Count pack-start codes in this window and note the first one.
        let win = &buf[..filled];
        let mut count = 0usize;
        let mut first: Option<usize> = None;
        let mut i = 0usize;
        while i + 4 <= win.len() {
            if win[i..i + 4] == PACK_START {
                count += 1;
                if first.is_none() {
                    first = Some(i);
                }
                i += 4;
            } else {
                i += 1;
            }
        }

        if count >= MIN_PACKS_PER_DENSE_WINDOW {
            // Dense window → a real, continuous program stream begins here.
            return Ok(Some(base + first.unwrap() as u64));
        }

        if filled < WINDOW {
            break; // hit EOF
        }
        base += filled as u64;
    }

    Ok(None)
}

/// Build an ffmpeg `-i` value that reads `path` starting at `start_byte` using
/// the `subfile:` protocol. This lets ffmpeg demux the MPEG-2 Program Stream
/// out of a recovered ISO whose filesystem is unreadable — no mount, no temp
/// file. Pair with [`find_mpeg_ps_offset`] to locate `start_byte`.
///
/// The `,,:` delimiter is verbatim ffmpeg syntax; everything after it is the
/// filename, so a Windows `D:\...` path (drive colon + backslashes) is passed
/// through unmodified.
///
/// NOTE: use this only for *short* reads such as `ffprobe` interlace detection.
/// For a full transcode, feed ffmpeg via a pipe with [`spawn_image_feeder`]
/// instead — the MPEG-PS demuxer back-seeks pathologically on a *seekable*
/// subfile input (measured ~0.2x realtime), whereas a non-seekable pipe forces
/// linear reads and restores full speed.
pub fn iso_program_stream_input(path: &Path, start_byte: u64) -> std::io::Result<String> {
    let size = std::fs::metadata(path)?.len();
    Ok(format!(
        "subfile,,start,{start_byte},end,{size},,:{}",
        path.display()
    ))
}

/// Stream `path` from `start_byte` to EOF into an ffmpeg child's stdin, reading
/// linearly. This is the fast counterpart to the `subfile:` protocol: piping
/// gives ffmpeg a *non-seekable* input, so the MPEG-PS demuxer reads forward
/// instead of seeking all over a multi-GB recovered image (~20x faster in
/// practice). Spawns a detached Tokio task; errors are logged and swallowed —
/// ffmpeg closing stdin early (player stop/seek, transcode done) is normal.
pub fn spawn_image_feeder(
    path: std::path::PathBuf,
    start_byte: u64,
    mut stdin: tokio::process::ChildStdin,
) {
    tokio::spawn(async move {
        use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt};
        let mut f = match tokio::fs::File::open(&path).await {
            Ok(f) => f,
            Err(e) => {
                tracing::warn!("image_feeder: open {}: {e}", path.display());
                return;
            }
        };
        if let Err(e) = f.seek(std::io::SeekFrom::Start(start_byte)).await {
            tracing::warn!("image_feeder: seek to {start_byte}: {e}");
            return;
        }
        let mut buf = vec![0u8; 1024 * 1024];
        loop {
            match f.read(&mut buf).await {
                Ok(0) => break,
                Ok(n) => {
                    if stdin.write_all(&buf[..n]).await.is_err() {
                        break; // ffmpeg closed stdin — normal on stop/seek/EOF
                    }
                }
                Err(e) => {
                    tracing::debug!("image_feeder: read: {e}");
                    break;
                }
            }
        }
        let _ = stdin.shutdown().await;
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Build a buffer that looks like a continuous program stream: `packs`
    /// pack-start codes spaced ~2 KB apart (each followed by filler bytes).
    fn dense_stream(packs: usize) -> Vec<u8> {
        let mut v = Vec::with_capacity(packs * 2048);
        for _ in 0..packs {
            v.extend_from_slice(&[0x00, 0x00, 0x01, 0xBA, 0x44, 0x00, 0xA7, 0x0D]);
            v.extend(std::iter::repeat(0x11u8).take(2040)); // non-zero filler
        }
        v
    }

    #[test]
    fn finds_dense_stream_after_zero_region() {
        let mut tmp = std::env::temp_dir();
        tmp.push("heirvo_test_ps_offset.bin");
        {
            let mut f = File::create(&tmp).unwrap();
            // 5000 bytes of zero (dead filesystem region), then a real stream.
            f.write_all(&vec![0u8; 5000]).unwrap();
            f.write_all(&dense_stream(600)).unwrap();
        }
        // The first pack of the dense window is found. The 5000 leading zeros
        // fall inside the first 1 MB window alongside the dense stream, so the
        // reported offset is the first pack within that window (byte 5000).
        let off = find_mpeg_ps_offset(&tmp).unwrap();
        assert_eq!(off, Some(5000));
        let _ = std::fs::remove_file(&tmp);
    }

    #[test]
    fn none_when_absent() {
        let mut tmp = std::env::temp_dir();
        tmp.push("heirvo_test_ps_offset_none.bin");
        {
            let mut f = File::create(&tmp).unwrap();
            f.write_all(&vec![0u8; 10_000]).unwrap();
        }
        assert_eq!(find_mpeg_ps_offset(&tmp).unwrap(), None);
        let _ = std::fs::remove_file(&tmp);
    }

    #[test]
    fn none_for_isolated_fragment() {
        // A failed recovery: one stray pack-start code adrift in 4 MB of zeros.
        // Must NOT be treated as a playable stream.
        let mut tmp = std::env::temp_dir();
        tmp.push("heirvo_test_ps_offset_fragment.bin");
        {
            let mut f = File::create(&tmp).unwrap();
            f.write_all(&vec![0u8; 1_000_000]).unwrap();
            f.write_all(&[0x00, 0x00, 0x01, 0xBA, 0x44, 0x00]).unwrap();
            f.write_all(&vec![0u8; 3_000_000]).unwrap();
        }
        assert_eq!(find_mpeg_ps_offset(&tmp).unwrap(), None);
        let _ = std::fs::remove_file(&tmp);
    }
}
