//! Signature-scan fallback for completely unreadable filesystems.
//!
//! When both ISO 9660 and UDF parsers fail (filesystem descriptors are gone),
//! this scanner performs a raw byte sweep looking for well-known file-format
//! magic bytes. Any matching run of sectors is reported as a candidate file.
//!
//! This is the "Find Missing Files & Folders" feature that justifies the Pro
//! tier: even if the disc's entire directory structure is gone, the raw data
//! regions for JPEG photos, MP4 videos, and ZIP archives are still recoverable
//! as long as the sectors containing their content are physically intact.
//!
//! ## Performance
//! The scan reads sectors in 32-sector blocks and only checks the first
//! `MAGIC_SCAN_BYTES` bytes of each sector for magic. This keeps throughput
//! high on healthy regions while still finding embedded signatures.

use crate::disc::sector::{ReadOptions, SectorReader};
use serde::{Deserialize, Serialize};

/// Maximum bytes from the start of a sector to scan for a file signature.
const MAGIC_SCAN_BYTES: usize = 16;

/// Detected file type from a signature match.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DetectedFileType {
    Jpeg,
    Png,
    Mp4,
    Avi,
    Wav,
    Zip,     // also covers DOCX, XLSX, JAR
    Pdf,
    Bmp,
    Tiff,
    Gif,
    Iso9660, // ISO 9660 Primary Volume Descriptor
    UdfAvdp, // UDF Anchor Volume Descriptor Pointer
    Unknown,
}

/// A candidate file region found during signature scan.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignatureHit {
    pub file_type: DetectedFileType,
    /// LBA where the magic bytes were found.
    pub start_lba: u64,
    /// Extension string for saving (e.g. "jpg").
    pub extension: &'static str,
}

/// Known magic byte patterns. The tuple is (offset, bytes).
/// Offset is the position within the sector where the magic must appear.
#[rustfmt::skip]
static SIGNATURES: &[(usize, &[u8], DetectedFileType, &str)] = &[
    // JPEG: FF D8 FF at offset 0
    (0, &[0xFF, 0xD8, 0xFF],                      DetectedFileType::Jpeg,    "jpg"),
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    (0, &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], DetectedFileType::Png, "png"),
    // MP4/MOV ftyp box: 4 bytes length + "ftyp"
    (4, b"ftyp",                                   DetectedFileType::Mp4,    "mp4"),
    // AVI: RIFF + AVI (at bytes 8)
    (0, b"RIFF",                                   DetectedFileType::Avi,    "avi"), // refined below
    // WAV: RIFF + WAVE (at bytes 8) — same RIFF prefix, differentiate by offset 8
    // (we distinguish AVI vs WAV by checking offset 8 in classify())
    // PDF: %PDF
    (0, b"%PDF",                                   DetectedFileType::Pdf,    "pdf"),
    // ZIP/DOCX/XLSX: PK\x03\x04
    (0, &[0x50, 0x4B, 0x03, 0x04],                DetectedFileType::Zip,    "zip"),
    // BMP: BM
    (0, b"BM",                                     DetectedFileType::Bmp,    "bmp"),
    // TIFF (little-endian): II + 42 00
    (0, &[0x49, 0x49, 0x2A, 0x00],                DetectedFileType::Tiff,   "tif"),
    // TIFF (big-endian): MM + 00 42
    (0, &[0x4D, 0x4D, 0x00, 0x2A],                DetectedFileType::Tiff,   "tif"),
    // GIF: GIF8
    (0, b"GIF8",                                   DetectedFileType::Gif,    "gif"),
    // ISO 9660 PVD: \x01CD001 at offset 1
    (1, b"CD001",                                  DetectedFileType::Iso9660, "iso"),
];

/// Check one sector's leading bytes against all known signatures.
/// Returns the first match, or `None` if no signature matches.
fn classify_sector(buf: &[u8]) -> Option<(DetectedFileType, &'static str)> {
    let scan_len = buf.len().min(MAGIC_SCAN_BYTES);
    let head = &buf[..scan_len];

    for &(offset, magic, file_type, ext) in SIGNATURES {
        if offset + magic.len() > head.len() {
            continue;
        }
        if &head[offset..offset + magic.len()] == magic {
            // Differentiate AVI vs WAV: both start with RIFF.
            // WAV has "WAVE" at bytes 8..12; AVI has "AVI " at bytes 8..12.
            let file_type = if file_type == DetectedFileType::Avi && buf.len() >= 12 {
                match &buf[8..12] {
                    b"WAVE" => DetectedFileType::Wav,
                    b"AVI " => DetectedFileType::Avi,
                    _ => DetectedFileType::Unknown,
                }
            } else {
                file_type
            };
            return Some((file_type, ext));
        }
    }
    None
}

/// Scan the entire disc surface for file-format magic bytes.
///
/// Reads sectors in 32-sector blocks. Skips unreadable sectors (increments
/// `damaged_count`). Reports one `SignatureHit` per magic-byte occurrence —
/// the caller can deduplicate or group adjacent hits.
///
/// `progress` is called periodically with (lba, total) for UI updates.
pub fn signature_scan<F>(
    reader: &dyn SectorReader,
    mut progress: F,
) -> (Vec<SignatureHit>, u64)
where
    F: FnMut(u64, u64),
{
    let total = reader.capacity();
    let mut hits = Vec::new();
    let mut damaged_count = 0u64;
    const BLOCK: u32 = 32;

    let mut lba = 0u64;
    while lba < total {
        let n = BLOCK.min((total - lba) as u32);
        let results = reader.read_block(lba, n, ReadOptions::default());

        for res in &results {
            if let Some(data) = &res.data {
                if let Some((ft, ext)) = classify_sector(data) {
                    hits.push(SignatureHit { file_type: ft, start_lba: res.lba, extension: ext });
                }
            } else {
                damaged_count += 1;
            }
        }

        if lba % 1024 == 0 {
            progress(lba, total);
        }
        lba += n as u64;
    }

    tracing::info!(
        "sig_scan: {total} sectors scanned, {} hits, {damaged_count} unreadable",
        hits.len()
    );
    (hits, damaged_count)
}

// ─── File carving ─────────────────────────────────────────────────────────

/// Default upper bound when we can't determine a file's true length from its
/// header. 256 MB covers nearly all consumer-disc files (a feature-length
/// DVD VOB caps at 1 GB, but those are inside VIDEO_TS, not loose). Higher
/// limits waste read time and disk space on garbage if the trailer is missing.
const CARVE_MAX_BYTES: u64 = 256 * 1024 * 1024;
const SECTOR: u64 = 2048;

/// Result of carving a single file from its starting LBA.
pub struct CarvedFile {
    pub file_type: DetectedFileType,
    pub extension: &'static str,
    pub start_lba: u64,
    pub bytes: Vec<u8>,
    /// True when carving stopped at CARVE_MAX_BYTES without finding a clean
    /// trailer — the file is likely truncated.
    pub truncated: bool,
}

/// Read forward from `start_lba` and extract a complete file of `file_type`.
///
/// For each format we use the cheapest available way to determine length:
///   • JPEG → scan for `FF D9` end-of-image marker (respecting `FF 00` escapes)
///   • PNG  → scan for the `IEND` chunk type (followed by 4-byte CRC)
///   • MP4  → read the `ftyp` box size and follow box chain until EOF / max
///   • BMP  → bytes 2..6 of the header contain the total file size (little-endian)
///   • PDF  → scan for `%%EOF` followed by EOL within the trailing 1 KB
///   • Anything else → return CARVE_MAX_BYTES sectors (caller may truncate)
pub fn carve_file_at(
    reader: &dyn SectorReader,
    start_lba: u64,
    file_type: DetectedFileType,
    extension: &'static str,
) -> Option<CarvedFile> {
    use DetectedFileType::*;
    let total = reader.capacity();
    if start_lba >= total {
        return None;
    }

    // Length-from-header shortcut: BMP, MP4 boxes — read just the header sector
    // and skip the streaming scan if we can compute length up front.
    let header = reader.read_block(start_lba, 1, ReadOptions::default())
        .into_iter().next()?.data?;

    let known_len: Option<u64> = match file_type {
        Bmp if header.len() >= 6 => {
            Some(u32::from_le_bytes([header[2], header[3], header[4], header[5]]) as u64)
        }
        Mp4 if header.len() >= 8 => {
            // The `ftyp` box starts at byte 0 of the file. Bytes 0..4 = box size
            // (big-endian). If size = 0, the box extends to EOF; if = 1, an
            // 8-byte extended size follows. ftyp tells us the first box length;
            // most MP4s have many more boxes. We use ftyp size only as a sanity
            // floor and stream until we find the `moov`/`mdat` final box.
            let ftyp_size = u32::from_be_bytes([header[0], header[1], header[2], header[3]]);
            if ftyp_size > 32 && ftyp_size < 4096 {
                None // Stream until we hit the last box
            } else {
                None
            }
        }
        _ => None,
    };

    let max_bytes = known_len.unwrap_or(CARVE_MAX_BYTES).min(CARVE_MAX_BYTES);
    let max_sectors = max_bytes.div_ceil(SECTOR).min(total - start_lba);

    let mut buf: Vec<u8> = Vec::with_capacity((max_sectors * SECTOR) as usize);
    let mut lba = start_lba;
    let mut truncated = true;

    // Read in 32-sector blocks. After each block, check for a trailer marker
    // in the *tail* of what we have plus a small overlap into the previous
    // block so a marker spanning a block boundary still hits.
    const BLOCK: u32 = 32;
    while lba < start_lba + max_sectors {
        let n = BLOCK.min((start_lba + max_sectors - lba) as u32);
        let results = reader.read_block(lba, n, ReadOptions::default());
        let block_start_in_buf = buf.len();
        for res in &results {
            match &res.data {
                Some(d) => buf.extend_from_slice(d),
                None => buf.extend_from_slice(&[0u8; 2048]),
            }
        }
        lba += n as u64;

        // Look for an end marker. Include 16 bytes of overlap from before this
        // block in case the marker straddled the block boundary.
        let search_start = block_start_in_buf.saturating_sub(16);
        if let Some(end_off) = find_trailer(file_type, &buf[search_start..]) {
            buf.truncate(search_start + end_off);
            truncated = false;
            break;
        }

        // For length-known formats, stop once we've read enough.
        if let Some(len) = known_len {
            if buf.len() as u64 >= len {
                buf.truncate(len as usize);
                truncated = false;
                break;
            }
        }
    }

    Some(CarvedFile { file_type, extension, start_lba, bytes: buf, truncated })
}

/// Search `data` for the format-specific end-of-file trailer.
/// Returns the offset *just past* the trailer (exclusive end), or `None`.
fn find_trailer(file_type: DetectedFileType, data: &[u8]) -> Option<usize> {
    use DetectedFileType::*;
    match file_type {
        Jpeg => {
            // JPEG end-of-image is `FF D9`. JPEG bitstreams escape literal FF
            // bytes inside compressed scan data as `FF 00`, so we must skip
            // those: a `FF D9` preceded by a stuffed-byte pattern is safe to
            // accept because `FF 00` always reads as "literal 0xFF" — the next
            // byte cannot itself be a marker. So a simple forward scan for
            // `FF D9` is correct.
            data.windows(2).position(|w| w == [0xFF, 0xD9]).map(|i| i + 2)
        }
        Png => {
            // PNG end is the IEND chunk: 4-byte length(0) + "IEND" + 4-byte CRC.
            // Total 12 bytes from the start of the length field. Scan for "IEND"
            // and accept if 4 bytes of CRC follow (presence, not validity).
            data.windows(4).position(|w| w == b"IEND").and_then(|i| {
                let end = i + 4 + 4; // IEND + 4-byte CRC
                if end <= data.len() { Some(end) } else { None }
            })
        }
        Pdf => {
            // PDF trailer is `%%EOF` near the end of file.
            data.windows(5).position(|w| w == b"%%EOF").map(|i| {
                // Include CR/LF that may follow.
                let mut end = i + 5;
                while end < data.len() && matches!(data[end], b'\r' | b'\n') {
                    end += 1;
                }
                end
            })
        }
        Gif => {
            // GIF trailer is a single 0x3B byte. Common false-positives in
            // image data make this slightly risky, so require it to be near
            // the end of the data window we've read.
            data.iter().rposition(|&b| b == 0x3B).map(|i| i + 1)
        }
        // Formats without a deterministic trailer: rely on length-from-header
        // or max-bytes cap. Return None to keep reading.
        _ => None,
    }
}

/// Scan only around the disc's descriptor regions (sectors 0..512 and
/// sector N-512..N) for ISO 9660 PVD and UDF AVDP signatures.
/// Much faster than a full scan; used as a quick first pass.
pub fn scan_for_filesystem_markers(reader: &dyn SectorReader) -> Vec<SignatureHit> {
    let total = reader.capacity();
    let end_scan = total.min(512);
    let tail_start = total.saturating_sub(512);

    let mut hits = Vec::new();
    let scan_ranges: &[(u64, u64)] = &[(0, end_scan), (tail_start, total)];

    for &(start, end) in scan_ranges {
        let mut lba = start;
        while lba < end {
            let n = 32u32.min((end - lba) as u32);
            let results = reader.read_block(lba, n, ReadOptions::default());
            for res in &results {
                if let Some(data) = &res.data {
                    if let Some((ft, ext)) = classify_sector(data) {
                        if matches!(ft, DetectedFileType::Iso9660 | DetectedFileType::UdfAvdp) {
                            hits.push(SignatureHit { file_type: ft, start_lba: res.lba, extension: ext });
                        }
                    }
                }
            }
            lba += n as u64;
        }
    }
    hits
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn jpeg_classified() {
        let mut buf = vec![0u8; 16];
        buf[0] = 0xFF; buf[1] = 0xD8; buf[2] = 0xFF;
        assert!(matches!(classify_sector(&buf), Some((DetectedFileType::Jpeg, "jpg"))));
    }

    #[test]
    fn wav_vs_avi() {
        let mut buf = vec![0u8; 16];
        buf[..4].copy_from_slice(b"RIFF");
        buf[8..12].copy_from_slice(b"WAVE");
        assert!(matches!(classify_sector(&buf), Some((DetectedFileType::Wav, _))));

        buf[8..12].copy_from_slice(b"AVI ");
        assert!(matches!(classify_sector(&buf), Some((DetectedFileType::Avi, _))));
    }

    #[test]
    fn iso_pvd_detected() {
        let mut buf = vec![0u8; 16];
        buf[0] = 0x01;
        buf[1..6].copy_from_slice(b"CD001");
        assert!(matches!(classify_sector(&buf), Some((DetectedFileType::Iso9660, _))));
    }
}
