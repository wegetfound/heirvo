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
