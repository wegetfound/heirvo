//! UDF 2.0/2.5 filesystem parser — tolerant walk for damaged media.
//!
//! ## Why UDF is required
//! Any disc burned after ~2005 (camcorder discs, photo CDs, drag-and-drop data
//! discs) uses UDF 2.0 or 2.5, not ISO 9660 alone. Without UDF parsing we see
//! an empty root directory or get random garbage from ISO 9660-only code.
//!
//! ## Spec references
//! - ECMA-167 (3rd edition, 1997) — "Volume and File Structure for Write-Once
//!   and Rewritable Media"
//! - OSTA UDF 2.5 (2003) — bridge specification layered on top of ECMA-167
//!
//! ## Tolerant mode design
//! Never abort the walk on a single bad descriptor or bad sector.
//! - Failed reads → synthesize a zeroed sector; log and continue
//! - Bad descriptor tags → skip the descriptor, mark the node as damaged
//! - Depth cap of 32 prevents infinite loops on self-referencing corrupted ICBs

use crate::disc::sector::{ReadOptions, SectorReader, DVD_SECTOR_SIZE};
use serde::{Deserialize, Serialize};
use std::io;

// ─── ECMA-167 / UDF descriptor tag identifiers ───────────────────────────
// All tag IDs from the spec are listed even if not yet referenced, so the
// code acts as a reference and future match arms don't need a doc lookup.
#[allow(dead_code)]
const TAG_PRIMARY_VOLUME_DESCRIPTOR: u16 = 1;
const TAG_ANCHOR_VOLUME_DESCRIPTOR_POINTER: u16 = 2;
#[allow(dead_code)] const TAG_VOLUME_DESCRIPTOR_POINTER: u16 = 3;
#[allow(dead_code)] const TAG_IMPLEMENTATION_USE_VOLUME_DESCRIPTOR: u16 = 4;
const TAG_PARTITION_DESCRIPTOR: u16 = 5;
const TAG_LOGICAL_VOLUME_DESCRIPTOR: u16 = 6;
#[allow(dead_code)] const TAG_UNALLOCATED_SPACE_DESCRIPTOR: u16 = 7;
const TAG_TERMINATING_DESCRIPTOR: u16 = 8;
#[allow(dead_code)] const TAG_LOGICAL_VOLUME_INTEGRITY_DESCRIPTOR: u16 = 9;
const TAG_FILE_SET_DESCRIPTOR: u16 = 256;
const TAG_FILE_IDENTIFIER_DESCRIPTOR: u16 = 257;
#[allow(dead_code)] const TAG_ALLOCATION_EXTENT_DESCRIPTOR: u16 = 258;
#[allow(dead_code)] const TAG_INDIRECT_ENTRY: u16 = 259;
#[allow(dead_code)] const TAG_TERMINAL_ENTRY: u16 = 260;
const TAG_FILE_ENTRY: u16 = 261;
#[allow(dead_code)] const TAG_EXTENDED_ATTRIBUTE_HEADER_DESCRIPTOR: u16 = 262;
#[allow(dead_code)] const TAG_UNALLOCATED_SPACE_ENTRY: u16 = 263;
#[allow(dead_code)] const TAG_SPACE_BITMAP_DESCRIPTOR: u16 = 264;
#[allow(dead_code)] const TAG_PARTITION_INTEGRITY_ENTRY: u16 = 265;
const TAG_EXTENDED_FILE_ENTRY: u16 = 266;

// ─── Descriptor Tag (ECMA-167 7.2) ───────────────────────────────────────

#[allow(dead_code)]
#[derive(Debug, Clone, Copy)]
struct DescriptorTag {
    tag_id: u16,
    tag_location: u32,
    crc_length: u16,
}

fn parse_descriptor_tag(buf: &[u8]) -> Option<DescriptorTag> {
    if buf.len() < 16 {
        return None;
    }
    let tag_id = u16::from_le_bytes([buf[0], buf[1]]);
    let crc_length = u16::from_le_bytes([buf[8], buf[9]]);
    let tag_location = u32::from_le_bytes([buf[10], buf[11], buf[12], buf[13]]);
    // tag_id 0 or 0xFFFF is invalid / unwritten.
    if tag_id == 0 || tag_id == 0xFFFF {
        return None;
    }
    Some(DescriptorTag { tag_id, tag_location, crc_length })
}

// ─── Short and Long Allocation Descriptors ───────────────────────────────

/// ECMA-167 Short Allocation Descriptor (4 bytes).
/// Encodes `(extent_length, relative_lba_in_partition)`.
#[derive(Debug, Clone, Copy)]
struct ShortAd {
    length: u32,
    position: u32,
}

fn parse_short_ad(buf: &[u8]) -> ShortAd {
    ShortAd {
        length: u32::from_le_bytes([buf[0], buf[1], buf[2], buf[3]]) & 0x3FFF_FFFF,
        position: u32::from_le_bytes([buf[4], buf[5], buf[6], buf[7]]),
    }
}

/// ECMA-167 Long Allocation Descriptor (16 bytes).
/// The `location` is a (LBA, partition_reference) pair.
#[allow(dead_code)]
#[derive(Debug, Clone, Copy)]
struct LongAd {
    length: u32,
    lba: u32,
    partition_ref: u16,
}

fn parse_long_ad(buf: &[u8]) -> LongAd {
    LongAd {
        length: u32::from_le_bytes([buf[0], buf[1], buf[2], buf[3]]) & 0x3FFF_FFFF,
        lba: u32::from_le_bytes([buf[4], buf[5], buf[6], buf[7]]),
        partition_ref: u16::from_le_bytes([buf[8], buf[9]]),
    }
}

// ─── UDF Partition / Volume metadata ─────────────────────────────────────

#[allow(dead_code)]
#[derive(Debug, Clone, Copy)]
struct PartitionDescriptor {
    /// Absolute start LBA of this partition on disc.
    start_lba: u32,
    /// Length in sectors.
    length: u32,
    /// Partition number used for cross-referencing from the LVD.
    partition_number: u16,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, Default)]
struct FileSetLocation {
    /// Start LBA of the File Set Descriptor (relative to partition start).
    lba: u32,
    partition_ref: u16,
}

// ─── Public output types ──────────────────────────────────────────────────

/// A single recovered file or directory from the UDF filesystem.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UdfEntry {
    pub path: String,
    pub is_dir: bool,
    /// First LBA of the file data (absolute, not partition-relative).
    pub start_lba: u64,
    pub size_bytes: u64,
    /// True when at least one ICB or File Identifier sector was unreadable.
    pub is_damaged: bool,
}

/// Result of a UDF volume walk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UdfVolume {
    pub label: String,
    pub entries: Vec<UdfEntry>,
    /// Sectors that were unreadable during the walk (logged but not fatal).
    pub unreadable_sectors: Vec<u64>,
}

// ─── Sector read helpers ──────────────────────────────────────────────────

/// Read a single 2048-byte sector. On read failure, returns a zeroed buffer
/// and records the LBA in `damaged`. Never panics.
fn read_sector_tolerant(
    reader: &dyn SectorReader,
    lba: u64,
    damaged: &mut Vec<u64>,
) -> Vec<u8> {
    let res = reader.read_sector(lba, ReadOptions::default());
    match res.data {
        Some(d) => d,
        None => {
            if !damaged.contains(&lba) {
                damaged.push(lba);
            }
            vec![0u8; DVD_SECTOR_SIZE]
        }
    }
}

// ─── Core UDF parsing ────────────────────────────────────────────────────

/// Find the Anchor Volume Descriptor Pointer.
///
/// Per ECMA-167 §9.1, AVDPs MUST appear at absolute LBA 256. A second copy
/// MAY appear at the last sector or at sector 512. We try all three.
fn find_avdp(
    reader: &dyn SectorReader,
    damaged: &mut Vec<u64>,
) -> Option<(u32 /* main_vds_lba */, u32 /* main_vds_len */)> {
    let capacity = reader.capacity();
    let candidates: &[u64] = &[256, 512, capacity.saturating_sub(256)];

    for &lba in candidates {
        if lba >= capacity {
            continue;
        }
        let buf = read_sector_tolerant(reader, lba, damaged);
        let tag = match parse_descriptor_tag(&buf) {
            Some(t) => t,
            None => continue,
        };
        if tag.tag_id != TAG_ANCHOR_VOLUME_DESCRIPTOR_POINTER {
            continue;
        }
        // Main VDS Extent: bytes 16..24.
        // ExtentLength at [16..20], ExtentLocation at [20..24].
        if buf.len() < 24 {
            continue;
        }
        let vds_len = u32::from_le_bytes([buf[16], buf[17], buf[18], buf[19]]);
        let vds_lba = u32::from_le_bytes([buf[20], buf[21], buf[22], buf[23]]);
        tracing::info!("UDF: AVDP found at LBA {lba}, main VDS @ LBA {vds_lba} len={vds_len}");
        return Some((vds_lba, vds_len));
    }
    None
}

/// Walk the Volume Descriptor Sequence and extract the Partition Descriptor
/// and the File Set Descriptor location from the Logical Volume Descriptor.
fn parse_vds(
    reader: &dyn SectorReader,
    vds_start: u32,
    vds_len: u32,
    damaged: &mut Vec<u64>,
) -> (Option<PartitionDescriptor>, Option<FileSetLocation>, String) {
    let sector_count = (vds_len as u64).div_ceil(DVD_SECTOR_SIZE as u64);
    let mut partition: Option<PartitionDescriptor> = None;
    let mut fsd_loc: Option<FileSetLocation> = None;
    let mut label = String::new();

    for i in 0..sector_count {
        let lba = vds_start as u64 + i;
        let buf = read_sector_tolerant(reader, lba, damaged);
        let tag = match parse_descriptor_tag(&buf) {
            Some(t) => t,
            None => continue,
        };

        match tag.tag_id {
            TAG_TERMINATING_DESCRIPTOR => {
                tracing::debug!("UDF VDS: terminating descriptor at LBA {lba}");
                break;
            }
            TAG_PARTITION_DESCRIPTOR => {
                if buf.len() < 92 {
                    continue;
                }
                // Partition Number at bytes 22..24 (u16 LE).
                let pnum = u16::from_le_bytes([buf[22], buf[23]]);
                // Partition Starting Location at bytes 188..192 (u32 LE).
                // Partition Length at bytes 192..196 (u32 LE).
                if buf.len() >= 196 {
                    let start = u32::from_le_bytes([buf[188], buf[189], buf[190], buf[191]]);
                    let len = u32::from_le_bytes([buf[192], buf[193], buf[194], buf[195]]);
                    tracing::info!(
                        "UDF: Partition #{pnum} start_lba={start} len={len}"
                    );
                    partition = Some(PartitionDescriptor {
                        start_lba: start,
                        length: len,
                        partition_number: pnum,
                    });
                }
            }
            TAG_LOGICAL_VOLUME_DESCRIPTOR => {
                // Volume identifier: dstring at bytes 84..212 (max 128 chars).
                if buf.len() >= 212 {
                    label = parse_dstring(&buf[84..212]);
                }
                // Logical Volume Contents Use / Map — we only need the
                // Integrity Sequence Extent to find the FSD. The FSD location
                // is stored in the Map Data at the end of the LVD. According
                // to UDF 2.5, the Type 1 partition map contains an 8-byte
                // Long_ad that is the FSD location.
                //
                // Rather than fully parsing the Map table, look for the Long_ad
                // embedded in the last part of the descriptor (byte 440+).
                // Typical UDF discs have a single partition; parse Logical
                // Volume Descriptor Length at bytes 264..268 and Map Data
                // starting at byte 440 (after the 384-byte fixed portion).
                let lvd_len = if buf.len() >= 268 {
                    u32::from_le_bytes([buf[264], buf[265], buf[266], buf[267]]) as usize
                } else {
                    0
                };
                // Map Data = rest of descriptor after fixed 440-byte header.
                // Each Type 1 Partition Map is 6 bytes; Type 2 is 64 bytes.
                // The Long_ad for the FSD is NOT here — it's in the LVD at
                // bytes 212..228 (Integrity Sequence Extent) which stores the
                // FSD Long_ad in the specific UDF layout.
                //
                // UDF 2.5 §2.2.4.4: Logical Volume Descriptor field offsets:
                //   Logical Volume Identifier = bytes 84..212
                //   Logical Volume Contents Use = bytes 212..228 (Long_ad = FSD location)
                if buf.len() >= 228 {
                    // Bytes 212..228: Long_ad (16 bytes) for the FSD.
                    let fsd_lba = u32::from_le_bytes([buf[212], buf[213], buf[214], buf[215]]);
                    let fsd_part = u16::from_le_bytes([buf[220], buf[221]]);
                    if fsd_lba > 0 || fsd_part > 0 {
                        tracing::info!(
                            "UDF: FSD Long_ad from LVD → LBA={fsd_lba} partition={fsd_part}"
                        );
                        fsd_loc = Some(FileSetLocation { lba: fsd_lba, partition_ref: fsd_part });
                    }
                }
                let _ = lvd_len;
            }
            TAG_PRIMARY_VOLUME_DESCRIPTOR => {
                // Fall back: use PVD volume identifier if LVD didn't have one.
                if label.is_empty() && buf.len() >= 56 {
                    label = parse_dstring(&buf[24..56]);
                }
            }
            _ => {} // Skip other descriptor types
        }
    }
    (partition, fsd_loc, label)
}

/// Parse a UDF dstring (variable-length character set with CS0 compression).
/// Byte 0 is the compression ID (8 = 8-bit chars, 16 = 16-bit UTF-16LE).
/// Last byte (before length byte) is the actual length of character data.
fn parse_dstring(buf: &[u8]) -> String {
    if buf.is_empty() {
        return String::new();
    }
    let compression = buf[0];
    let char_len = *buf.last().unwrap_or(&0) as usize;
    if char_len == 0 || char_len + 1 > buf.len() {
        return String::new();
    }
    let chars = &buf[1..1 + char_len.min(buf.len() - 1)];
    match compression {
        8 => String::from_utf8_lossy(chars).trim_end_matches('\0').to_string(),
        16 if chars.len() % 2 == 0 => {
            let utf16: Vec<u16> = chars.chunks_exact(2)
                .map(|b| u16::from_le_bytes([b[0], b[1]]))
                .collect();
            String::from_utf16_lossy(&utf16).trim_end_matches('\0').to_string()
        }
        _ => String::from_utf8_lossy(chars).trim_end_matches('\0').to_string(),
    }
}

/// Resolve a partition-relative LBA to an absolute disc LBA.
#[inline]
fn resolve_lba(relative_lba: u32, partition: &PartitionDescriptor) -> u64 {
    partition.start_lba as u64 + relative_lba as u64
}

/// Read the File Set Descriptor and return the root directory ICB LBA and
/// partition reference.
fn read_fsd(
    reader: &dyn SectorReader,
    fsd: FileSetLocation,
    partition: &PartitionDescriptor,
    damaged: &mut Vec<u64>,
) -> Option<(u32 /* root_icb_lba */, u16 /* partition_ref */)> {
    let abs_lba = resolve_lba(fsd.lba, partition);
    let buf = read_sector_tolerant(reader, abs_lba, damaged);
    let tag = parse_descriptor_tag(&buf)?;
    if tag.tag_id != TAG_FILE_SET_DESCRIPTOR {
        tracing::warn!(
            "UDF: expected FSD tag at LBA {abs_lba}, got tag_id={}", tag.tag_id
        );
        return None;
    }
    // Root Directory ICB Long_ad at bytes 400..416.
    if buf.len() < 416 {
        return None;
    }
    let root_lba = u32::from_le_bytes([buf[400], buf[401], buf[402], buf[403]]);
    let root_part = u16::from_le_bytes([buf[408], buf[409]]);
    tracing::info!("UDF: FSD found, root dir ICB @ LBA={root_lba} partition={root_part}");
    Some((root_lba, root_part))
}

/// Walk a UDF directory ICB and collect child entries.
///
/// "Tolerant mode": any sector we can't read is logged and skipped; the walk
/// continues. A corrupt directory record skips that entry only, not the whole
/// directory. Depth cap prevents loops on self-referencing corruption.
fn walk_udf_directory(
    reader: &dyn SectorReader,
    icb_lba: u32,
    partition: &PartitionDescriptor,
    path: &str,
    out: &mut Vec<UdfEntry>,
    damaged: &mut Vec<u64>,
    depth: u32,
) {
    if depth > 32 {
        tracing::warn!("UDF: walk depth capped at {path}");
        return;
    }

    // Read the File Entry or Extended File Entry for this ICB.
    let abs_icb = resolve_lba(icb_lba, partition);
    let icb_buf = read_sector_tolerant(reader, abs_icb, damaged);
    let tag = match parse_descriptor_tag(&icb_buf) {
        Some(t) => t,
        None => {
            tracing::warn!("UDF: no valid tag at ICB LBA {abs_icb} for {path}");
            return;
        }
    };

    if !matches!(tag.tag_id, TAG_FILE_ENTRY | TAG_EXTENDED_FILE_ENTRY) {
        return;
    }

    // File Entry layout (tag_id 261):
    //   bytes 0..16:  Descriptor Tag
    //   bytes 16..20: ICB Tag
    //   bytes 20..168: fixed fields  (length depends on extended vs basic)
    // Extended File Entry (tag_id 266) has the same layout with 8 extra bytes
    // (Stream Directory ICB field) before the Allocation Descriptors.
    let base_offset: usize = if tag.tag_id == TAG_EXTENDED_FILE_ENTRY { 168 + 8 } else { 168 };

    // ICB Tag at bytes 16..36. File Type is at byte 20 (relative to ICB Tag start = byte 16+4 = 20).
    // Actually ICB Tag = bytes 16..36 (20 bytes). File Type at offset 11 within ICB Tag = byte 27.
    if icb_buf.len() < 28 {
        return;
    }
    let file_type = icb_buf[27]; // ICB Tag file type: 4=directory, 5=regular file
    let is_dir = file_type == 4;

    // Information Length (file size) at bytes 56..64 (u64 LE).
    let info_len: u64 = if icb_buf.len() >= 64 {
        u64::from_le_bytes([
            icb_buf[56], icb_buf[57], icb_buf[58], icb_buf[59],
            icb_buf[60], icb_buf[61], icb_buf[62], icb_buf[63],
        ])
    } else {
        0
    };

    // Allocation Descriptors: the ICB Tag at bytes 16..36 has "Allocation
    // Descriptor Type" in the high 3 bits of bytes 20..22 (Flags field).
    let icb_flags = u16::from_le_bytes([icb_buf[16 + 4], icb_buf[16 + 5]]);
    let ad_type = (icb_flags >> 3) & 0x07; // bits 5:3

    // Extended Attribute Length at bytes 168..172 (u32 LE) — need to skip
    // past any extended attributes to reach the allocation descriptors.
    let ea_len: u32 = if icb_buf.len() >= 172 {
        u32::from_le_bytes([icb_buf[168], icb_buf[169], icb_buf[170], icb_buf[171]])
    } else {
        0
    };
    let ad_len: u32 = if icb_buf.len() >= 176 {
        u32::from_le_bytes([icb_buf[172], icb_buf[173], icb_buf[174], icb_buf[175]])
    } else {
        0
    };

    let ad_start = base_offset + ea_len as usize;
    let ad_end = ad_start + ad_len as usize;

    // For directory entries: the content IS the File Identifier Descriptors.
    // Read the sectors pointed to by the allocation descriptors and parse FIDs.
    if is_dir {
        let data = read_extent_data(reader, &icb_buf, ad_start, ad_end, ad_type, partition, damaged);
        parse_file_identifiers(reader, &data, partition, path, out, damaged, depth);
        return;
    }

    // For files: record the extent location as the start LBA.
    let (file_start_lba, is_damaged) = if ad_type == 3 {
        // Type 3 = data is inline in the ICB ("inline" allocation).
        // Treat start_lba as the ICB sector itself.
        (abs_icb, false)
    } else {
        let damaged_before = damaged.len();
        let start = first_extent_lba(&icb_buf, ad_start, ad_end, ad_type, partition);
        (start, damaged.len() > damaged_before)
    };

    if !path.is_empty() {
        out.push(UdfEntry {
            path: path.to_string(),
            is_dir: false,
            start_lba: file_start_lba,
            size_bytes: info_len,
            is_damaged,
        });
    }
}

/// Read all sectors referenced by the allocation descriptors starting at
/// `ad_start` within `icb_buf`, returning the concatenated content bytes.
fn read_extent_data(
    reader: &dyn SectorReader,
    icb_buf: &[u8],
    ad_start: usize,
    ad_end: usize,
    ad_type: u16,
    partition: &PartitionDescriptor,
    damaged: &mut Vec<u64>,
) -> Vec<u8> {
    let ad_end = ad_end.min(icb_buf.len());
    if ad_start >= ad_end {
        return Vec::new();
    }
    let mut out = Vec::new();
    match ad_type {
        0 => {
            // Short allocation descriptors (8 bytes each).
            for ad_bytes in icb_buf[ad_start..ad_end].chunks_exact(8) {
                let ad = parse_short_ad(ad_bytes);
                let abs = resolve_lba(ad.position, partition);
                let sectors = (ad.length as u64).div_ceil(DVD_SECTOR_SIZE as u64);
                for i in 0..sectors {
                    let s = read_sector_tolerant(reader, abs + i, damaged);
                    out.extend_from_slice(&s);
                }
            }
        }
        1 => {
            // Long allocation descriptors (16 bytes each).
            for ad_bytes in icb_buf[ad_start..ad_end].chunks_exact(16) {
                let ad = parse_long_ad(ad_bytes);
                let abs = resolve_lba(ad.lba, partition);
                let sectors = (ad.length as u64).div_ceil(DVD_SECTOR_SIZE as u64);
                for i in 0..sectors {
                    let s = read_sector_tolerant(reader, abs + i, damaged);
                    out.extend_from_slice(&s);
                }
            }
        }
        3 => {
            // Inline data stored in the ICB body itself.
            out.extend_from_slice(&icb_buf[ad_start..ad_end]);
        }
        _ => {}
    }
    out
}

/// Return the absolute start LBA of the first allocation descriptor, or 0.
fn first_extent_lba(
    icb_buf: &[u8],
    ad_start: usize,
    ad_end: usize,
    ad_type: u16,
    partition: &PartitionDescriptor,
) -> u64 {
    let ad_end = ad_end.min(icb_buf.len());
    if ad_start >= ad_end {
        return 0;
    }
    match ad_type {
        0 if ad_end - ad_start >= 8 => {
            let ad = parse_short_ad(&icb_buf[ad_start..ad_start + 8]);
            resolve_lba(ad.position, partition)
        }
        1 if ad_end - ad_start >= 16 => {
            let ad = parse_long_ad(&icb_buf[ad_start..ad_start + 16]);
            resolve_lba(ad.lba, partition)
        }
        _ => 0,
    }
}

/// Parse File Identifier Descriptors (FIDs) from directory content bytes
/// and recurse into sub-directories.
fn parse_file_identifiers(
    reader: &dyn SectorReader,
    data: &[u8],
    partition: &PartitionDescriptor,
    parent_path: &str,
    out: &mut Vec<UdfEntry>,
    damaged: &mut Vec<u64>,
    depth: u32,
) {
    let mut off = 0usize;
    while off + 38 <= data.len() {
        // FID Descriptor Tag at bytes 0..16.
        let tag = match parse_descriptor_tag(&data[off..]) {
            Some(t) => t,
            None => {
                // Pad to next 4-byte boundary.
                off = (off + 4) & !3;
                continue;
            }
        };
        if tag.tag_id != TAG_FILE_IDENTIFIER_DESCRIPTOR {
            // Not a FID — this can happen at the end of a directory sector. Advance.
            off += 4;
            continue;
        }

        // FID layout (ECMA-167 §14.4):
        //   bytes 0..16: Descriptor Tag
        //   bytes 16..18: File Version Number
        //   byte 18: File Characteristics
        //   byte 19: Length of File Identifier (L_FI)
        //   bytes 20..36: ICB (Long_ad, 16 bytes)
        //   bytes 36..38: Length of Implementation Use (L_IU)
        //   bytes 38..38+L_IU: Implementation Use
        //   bytes 38+L_IU..38+L_IU+L_FI: File Identifier (dstring)

        if off + 38 > data.len() {
            break;
        }
        let file_chars = data[off + 18];
        let l_fi = data[off + 19] as usize;
        let icb_lba = u32::from_le_bytes([data[off + 20], data[off + 21], data[off + 22], data[off + 23]]);
        let l_iu = u16::from_le_bytes([data[off + 36], data[off + 37]]) as usize;
        let fi_start = off + 38 + l_iu;
        let fi_end = fi_start + l_fi;

        // FID record length must be 4-byte aligned and at least 38 bytes.
        let raw_len = 38 + l_iu + l_fi;
        let fid_len = (raw_len + 3) & !3; // round up to 4-byte boundary

        // Characteristic bits: bit 3 = parent directory, bit 2 = hidden.
        let is_parent = (file_chars & 0x08) != 0;
        let _is_hidden = (file_chars & 0x04) != 0;
        let is_dir_bit = (file_chars & 0x02) != 0;

        if is_parent || l_fi == 0 {
            off += fid_len.max(4);
            continue;
        }
        if fi_end > data.len() {
            break;
        }

        let name = parse_dstring(&data[fi_start..fi_end]);
        if name.is_empty() || name == "." || name == ".." {
            off += fid_len.max(4);
            continue;
        }

        let child_path = if parent_path.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", parent_path, name)
        };

        if is_dir_bit {
            out.push(UdfEntry {
                path: child_path.clone(),
                is_dir: true,
                start_lba: resolve_lba(icb_lba, partition),
                size_bytes: 0,
                is_damaged: false,
            });
            walk_udf_directory(
                reader, icb_lba, partition, &child_path, out, damaged, depth + 1,
            );
        } else {
            walk_udf_directory(reader, icb_lba, partition, &child_path, out, damaged, depth + 1);
        }

        off += fid_len.max(4);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────

/// Walk the UDF filesystem on `reader` and return all entries.
///
/// Returns `Err` only if no UDF structure could be located at all (likely a
/// non-UDF disc). On partial damage the walk continues and returns whatever
/// was recoverable, with damaged sectors logged in `UdfVolume::unreadable_sectors`.
pub fn walk_udf(reader: &dyn SectorReader) -> io::Result<UdfVolume> {
    let mut damaged: Vec<u64> = Vec::new();

    let (vds_lba, vds_len) = find_avdp(reader, &mut damaged)
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "no UDF AVDP found"))?;

    let (partition, fsd_loc, label) = parse_vds(reader, vds_lba, vds_len, &mut damaged);

    let partition = partition.ok_or_else(|| {
        io::Error::new(io::ErrorKind::InvalidData, "UDF: no Partition Descriptor found in VDS")
    })?;

    let fsd_loc = fsd_loc.ok_or_else(|| {
        io::Error::new(io::ErrorKind::InvalidData, "UDF: no File Set Descriptor location in LVD")
    })?;

    let (root_icb_lba, _root_part) =
        read_fsd(reader, fsd_loc, &partition, &mut damaged).ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidData, "UDF: cannot read File Set Descriptor")
        })?;

    let mut entries = Vec::new();
    walk_udf_directory(reader, root_icb_lba, &partition, "", &mut entries, &mut damaged, 0);
    entries.sort_by(|a, b| a.path.cmp(&b.path));

    tracing::info!(
        "UDF walk complete: label={:?} entries={} damaged_sectors={}",
        label, entries.len(), damaged.len()
    );
    Ok(UdfVolume { label, entries, unreadable_sectors: damaged })
}

/// Try UDF first, fall back to ISO 9660 if UDF parsing fails.
///
/// Modern discs typically have BOTH a UDF filesystem and an ISO 9660 bridge
/// descriptor. UDF is authoritative for everything burned after ~2005.
pub fn walk_files_udf_or_iso(
    reader: &dyn SectorReader,
) -> io::Result<Vec<crate::dvd::iso9660::IsoEntry>> {
    if let Ok(vol) = walk_udf(reader) {
        let entries = vol.entries.into_iter()
            .filter(|e| !e.is_dir)
            .map(|e| crate::dvd::iso9660::IsoEntry {
                name: e.path,
                is_dir: false,
                start_lba: e.start_lba,
                size_bytes: e.size_bytes,
            })
            .collect();
        return Ok(entries);
    }
    // UDF failed — fall back to ISO 9660.
    crate::dvd::iso9660::walk_all_files(reader)
}
