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

/// ECMA-167 §7.2 Descriptor Tag layout (16 bytes):
///   bytes 0..2:   Tag Identifier (u16 LE)
///   bytes 2..4:   Descriptor Version (u16 LE)
///   byte 4:       Tag Checksum (sum mod 256 of bytes 0..4 and 5..16)
///   byte 5:       Reserved (= 0)
///   bytes 6..8:   Tag Serial Number (u16 LE)
///   bytes 8..10:  Descriptor CRC (u16 LE) — IEC 60870-5 CRC of bytes 16..16+CRC_Length
///   bytes 10..12: Descriptor CRC Length (u16 LE)
///   bytes 12..16: Tag Location (u32 LE) — LBA of THIS descriptor, self-anchor
fn parse_descriptor_tag(buf: &[u8]) -> Option<DescriptorTag> {
    if buf.len() < 16 {
        return None;
    }
    let tag_id = u16::from_le_bytes([buf[0], buf[1]]);
    // Tag IDs > 266 are not assigned by the spec; treat as garbage.
    if tag_id == 0 || tag_id > 300 {
        return None;
    }

    // Tag Checksum (byte 4) = (sum of bytes 0..4 and 5..16) mod 256.
    let checksum = buf[4];
    let mut sum: u32 = 0;
    for &b in &buf[0..4] { sum = sum.wrapping_add(b as u32); }
    for &b in &buf[5..16] { sum = sum.wrapping_add(b as u32); }
    if (sum & 0xFF) as u8 != checksum {
        return None;
    }

    let crc_length = u16::from_le_bytes([buf[10], buf[11]]);
    let tag_location = u32::from_le_bytes([buf[12], buf[13], buf[14], buf[15]]);
    Some(DescriptorTag { tag_id, tag_location, crc_length })
}

/// Parse a tag AND verify its self-anchor matches the LBA we read from.
///
/// A mismatch means either: (a) we read a bad sector and got garbage that
/// happens to checksum, (b) the descriptor was relocated by a packet writer
/// without updating tag_location (rare), or (c) we computed the wrong LBA.
/// In all cases, trust the descriptor only when the anchor matches.
fn parse_descriptor_tag_at(buf: &[u8], expected_lba: u64) -> Option<DescriptorTag> {
    let tag = parse_descriptor_tag(buf)?;
    if tag.tag_location as u64 != expected_lba {
        tracing::debug!(
            "UDF: descriptor self-anchor mismatch at LBA {expected_lba}, tag says {}",
            tag.tag_location
        );
        return None;
    }
    Some(tag)
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
/// Per ECMA-167 §10.2.1, AVDPs MUST appear at one or more of:
///   • Logical Sector 256
///   • Logical Sector N - 256
///   • Logical Sector N
/// where N is the last addressable Logical Sector of the volume. Since
/// `reader.capacity()` returns "last LBA + 1", N = capacity - 1.
fn find_avdp(
    reader: &dyn SectorReader,
    damaged: &mut Vec<u64>,
) -> Option<(u32 /* main_vds_lba */, u32 /* main_vds_len */)> {
    let capacity = reader.capacity();
    if capacity == 0 {
        return None;
    }
    let n = capacity - 1;                          // last LBA
    let n_minus_256 = capacity.saturating_sub(257); // = n - 256
    let candidates: &[u64] = &[256, n_minus_256, n];

    for &lba in candidates {
        if lba >= capacity {
            continue;
        }
        let buf = read_sector_tolerant(reader, lba, damaged);
        // Use the validating parser so a sector that happens to look like an
        // AVDP only at the tag-ID level (but reports a different self-anchor)
        // doesn't fool us into a bogus VDS chase.
        let Some(tag) = parse_descriptor_tag_at(&buf, lba) else { continue };
        if tag.tag_id != TAG_ANCHOR_VOLUME_DESCRIPTOR_POINTER {
            continue;
        }
        // Main Volume Descriptor Sequence extent_ad at bytes 16..24:
        //   bytes 16..20: ExtentLength (u32, bytes)
        //   bytes 20..24: ExtentLocation (u32, LBA)
        if buf.len() < 24 {
            continue;
        }
        let vds_len = u32::from_le_bytes([buf[16], buf[17], buf[18], buf[19]]);
        let vds_lba = u32::from_le_bytes([buf[20], buf[21], buf[22], buf[23]]);
        tracing::info!("UDF: AVDP at LBA {lba} → main VDS @ {vds_lba} len={vds_len} bytes");
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
        let tag = match parse_descriptor_tag_at(&buf, lba) {
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
                // ECMA-167 §10.6 Logical Volume Descriptor layout:
                //   bytes 0..16:     Descriptor Tag
                //   bytes 16..20:    Volume Descriptor Sequence Number
                //   bytes 20..84:    Descriptor Character Set (charspec, 64 bytes)
                //   bytes 84..212:   Logical Volume Identifier (128-byte dstring)
                //   bytes 212..216:  Logical Block Size (u32)
                //   bytes 216..248:  Domain Identifier (EntityID, 32 bytes)
                //   bytes 248..264:  Logical Volume Contents Use (long_ad → FSD)
                //   bytes 264..268:  Map Table Length (u32)
                //   bytes 268..272:  Number of Partition Maps (u32)
                //   bytes 272..304:  Implementation Identifier (EntityID, 32 bytes)
                //   bytes 304..432:  Implementation Use (128 bytes)
                //   bytes 432..440:  Integrity Sequence Extent (extent_ad, 8 bytes)
                //   bytes 440..:     Partition Maps (Map Table Length bytes)

                if buf.len() >= 212 {
                    label = parse_dstring(&buf[84..212]);
                }

                // FSD long_ad lives at bytes 248..264. Inside the 16-byte
                // long_ad: length 0..4, lba 4..8, partition_ref 8..10.
                if buf.len() >= 264 {
                    let fsd_lba = u32::from_le_bytes([buf[252], buf[253], buf[254], buf[255]]);
                    let fsd_part = u16::from_le_bytes([buf[256], buf[257]]);
                    tracing::info!(
                        "UDF: FSD long_ad from LVD → LBA={fsd_lba} partition={fsd_part}"
                    );
                    fsd_loc = Some(FileSetLocation { lba: fsd_lba, partition_ref: fsd_part });
                }
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

/// Parse a UDF File Identifier payload (NOT a dstring).
///
/// ECMA-167 §14.4.9: the File Identifier field of a FID is structured as
///   byte 0  : Compression ID (8 or 16, same semantics as a dstring)
///   bytes 1..L_FI : character data
/// There is NO trailing length byte — the length is given by the FID's
/// `L_FI` field. This is easy to confuse with a dstring; the difference
/// matters because using `parse_dstring` here mis-interprets the last
/// character as a length and silently truncates the name.
fn parse_fi_name(buf: &[u8]) -> String {
    if buf.len() < 2 {
        return String::new();
    }
    let compression = buf[0];
    let chars = &buf[1..];
    match compression {
        8 => String::from_utf8_lossy(chars).trim_end_matches('\0').to_string(),
        16 if chars.len() % 2 == 0 => {
            // OSTA-CS0 16-bit characters are big-endian.
            let utf16: Vec<u16> = chars.chunks_exact(2)
                .map(|b| u16::from_be_bytes([b[0], b[1]]))
                .collect();
            String::from_utf16_lossy(&utf16).trim_end_matches('\0').to_string()
        }
        _ => String::from_utf8_lossy(chars).trim_end_matches('\0').to_string(),
    }
}

/// Parse a UDF dstring (OSTA-CS0 compressed Unicode).
///
/// UDF 2.50 §2.1.3: a `dstring[n]` field is laid out as:
///   byte 0     : Compression ID (8 = 8-bit chars, 16 = UTF-16BE chars)
///   bytes 1..n-1 : character data, zero-padded
///   byte n-1   : Length — TOTAL bytes used **including** the compression ID
///
/// So if the length byte is 9, the field contains 1 compression-ID byte + 8
/// bytes of character data; the last (8 - 1 * sizeof(unit)) bytes are payload.
///
/// Note OSTA-CS0 16-bit characters are big-endian per §6.3.2, contrary to
/// the rest of ECMA-167 (which is little-endian). Burned-in mistake in early
/// drafts that became permanent in real-world burners.
fn parse_dstring(buf: &[u8]) -> String {
    if buf.len() < 2 {
        return String::new();
    }
    let compression = buf[0];
    let used_total = *buf.last().unwrap() as usize;
    // used_total counts the compression ID + char bytes. Must be ≥ 1 (just
    // the ID) and must not exceed the field minus the length byte itself.
    if used_total < 1 || used_total > buf.len() - 1 {
        return String::new();
    }
    let char_bytes = used_total - 1;
    if char_bytes == 0 {
        return String::new();
    }
    let chars = &buf[1..1 + char_bytes];

    match compression {
        8 => String::from_utf8_lossy(chars).trim_end_matches('\0').to_string(),
        16 if chars.len() % 2 == 0 => {
            // OSTA-CS0 16-bit characters are encoded BIG-endian.
            let utf16: Vec<u16> = chars.chunks_exact(2)
                .map(|b| u16::from_be_bytes([b[0], b[1]]))
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
    // FSD tag_location is partition-relative, not absolute, so we validate
    // against fsd.lba (the partition-relative LBA) rather than abs_lba.
    let tag = parse_descriptor_tag_at(&buf, fsd.lba as u64)?;
    if tag.tag_id != TAG_FILE_SET_DESCRIPTOR {
        tracing::warn!(
            "UDF: expected FSD tag at LBA {abs_lba}, got tag_id={}", tag.tag_id
        );
        return None;
    }
    // Root Directory ICB long_ad at bytes 400..416 inside the FSD. The
    // 16-byte long_ad packs (length, lba, partition_ref, impl_use), so within
    // the FSD that means:
    //   bytes 400..404: ExtentLength (u32)
    //   bytes 404..408: ExtentLocation LBA (u32) ← what we want
    //   bytes 408..410: Partition Reference Number (u16)
    //   bytes 410..416: Implementation Use (6 bytes)
    if buf.len() < 416 {
        return None;
    }
    let root_lba = u32::from_le_bytes([buf[404], buf[405], buf[406], buf[407]]);
    let root_part = u16::from_le_bytes([buf[408], buf[409]]);
    tracing::info!("UDF: FSD ok → root dir ICB at partition-rel LBA={root_lba} part={root_part}");
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
    // ICB tag_location is partition-relative.
    let abs_icb = resolve_lba(icb_lba, partition);
    let icb_buf = read_sector_tolerant(reader, abs_icb, damaged);
    let tag = match parse_descriptor_tag_at(&icb_buf, icb_lba as u64) {
        Some(t) => t,
        None => {
            tracing::warn!("UDF: no valid tag at ICB LBA {abs_icb} (rel {icb_lba}) for {path}");
            return;
        }
    };

    if !matches!(tag.tag_id, TAG_FILE_ENTRY | TAG_EXTENDED_FILE_ENTRY) {
        return;
    }

    // ECMA-167 §14.9 File Entry / §14.17 Extended File Entry layout:
    //
    //   bytes 0..16:    Descriptor Tag
    //   bytes 16..36:   ICB Tag (20 bytes)
    //     ├ byte 27 (= 16+11): File Type           (4 = dir, 5 = file)
    //     └ bytes 34..36 (= 16+18..16+20): Flags   (low 3 bits = AD type)
    //   bytes 36..56:   UID(4), GID(4), Permissions(4), Link Count(2),
    //                   Record Format(1), Record Display Attrs(1), Record Length(4)
    //   bytes 56..64:   Information Length (u64) — the file size
    //   bytes 64..72:   Logical Blocks Recorded (u64)
    //   bytes 72..104:  Access / Modification / Attribute timestamps (12 bytes each)
    //   bytes 104..108: Checkpoint (u32)
    //   bytes 108..124: Extended Attribute ICB (long_ad, 16 bytes)
    //   bytes 124..156: Implementation Identifier (EntityID, 32 bytes)
    //   bytes 156..164: Unique ID (u64)
    //   bytes 164..168: Length of Extended Attributes (u32)
    //   bytes 168..172: Length of Allocation Descriptors (u32)
    //   bytes 172.. :   Extended Attributes (L_EA bytes) then Allocation Descriptors (L_AD bytes)
    //
    // Extended File Entry inserts an extra Stream Directory ICB (16 bytes) after
    // the Unique ID, pushing L_EA / L_AD and everything after it down by 16
    // bytes. The exact EFE offset of L_EA is 208 (= 164 + 16 + reorder), not
    // 168+8 as my earlier code assumed. Reference: ECMA-167 §14.17.
    let (l_ea_off, l_ad_off, base_data_off) = if tag.tag_id == TAG_EXTENDED_FILE_ENTRY {
        (208usize, 212usize, 216usize)
    } else {
        (168usize, 172usize, 176usize)
    };

    if icb_buf.len() < 28 {
        return;
    }
    let file_type = icb_buf[27];
    let is_dir = file_type == 4;

    let info_len: u64 = if icb_buf.len() >= 64 {
        u64::from_le_bytes([
            icb_buf[56], icb_buf[57], icb_buf[58], icb_buf[59],
            icb_buf[60], icb_buf[61], icb_buf[62], icb_buf[63],
        ])
    } else {
        0
    };

    // ICB Tag Flags = bytes 34..36 (offset 18..20 inside the 20-byte ICB Tag
    // which starts at File Entry byte 16). Allocation Descriptor Type is the
    // LOW 3 bits: 0=short_ad, 1=long_ad, 2=extended_ad, 3=embedded (inline).
    if icb_buf.len() < 36 {
        return;
    }
    let icb_flags = u16::from_le_bytes([icb_buf[34], icb_buf[35]]);
    let ad_type = icb_flags & 0x07;

    let ea_len: u32 = if icb_buf.len() >= l_ea_off + 4 {
        u32::from_le_bytes([
            icb_buf[l_ea_off], icb_buf[l_ea_off + 1],
            icb_buf[l_ea_off + 2], icb_buf[l_ea_off + 3],
        ])
    } else { 0 };
    let ad_len: u32 = if icb_buf.len() >= l_ad_off + 4 {
        u32::from_le_bytes([
            icb_buf[l_ad_off], icb_buf[l_ad_off + 1],
            icb_buf[l_ad_off + 2], icb_buf[l_ad_off + 3],
        ])
    } else { 0 };
    let base_offset = base_data_off;

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
        // ICB long_ad starts at FID byte 20 and is 16 bytes wide:
        //   bytes 20..24: ExtentLength (u32)  ← NOT what we want
        //   bytes 24..28: ExtentLocation LBA (u32) ← what we want
        //   bytes 28..30: Partition Reference Number (u16)
        //   bytes 30..36: Implementation Use (6 bytes)
        let icb_lba = u32::from_le_bytes([data[off + 24], data[off + 25], data[off + 26], data[off + 27]]);
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

        let name = parse_fi_name(&data[fi_start..fi_end]);
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

// ─── Tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::disc::sector::SectorReadResult;
    use std::collections::HashMap;
    use std::sync::Mutex;

    /// In-memory sector reader backed by a HashMap of LBA → 2048-byte sector.
    /// Missing LBAs return Failed reads so we can also exercise tolerant mode.
    struct MemReader {
        sectors: Mutex<HashMap<u64, Vec<u8>>>,
        capacity: u64,
    }
    impl MemReader {
        fn new(capacity: u64) -> Self {
            Self { sectors: Mutex::new(HashMap::new()), capacity }
        }
        fn put(&self, lba: u64, mut bytes: Vec<u8>) {
            bytes.resize(DVD_SECTOR_SIZE, 0);
            self.sectors.lock().unwrap().insert(lba, bytes);
        }
    }
    impl SectorReader for MemReader {
        fn read_sector(&self, lba: u64, _: crate::disc::sector::ReadOptions) -> SectorReadResult {
            match self.sectors.lock().unwrap().get(&lba) {
                Some(d) => SectorReadResult::ok(lba, d.clone(), 0),
                None => SectorReadResult::err(lba, crate::disc::sector::SectorError::MediumError, 0, 0),
            }
        }
        fn capacity(&self) -> u64 { self.capacity }
    }

    /// Build a 16-byte descriptor tag for `tag_id` self-anchored at `lba`,
    /// with checksum filled in correctly. CRC fields are zeroed (we don't
    /// validate CRC in the parser, only the tag checksum and self-anchor).
    fn make_tag(tag_id: u16, lba: u32) -> [u8; 16] {
        let mut t = [0u8; 16];
        t[0..2].copy_from_slice(&tag_id.to_le_bytes());
        t[2..4].copy_from_slice(&3u16.to_le_bytes()); // Descriptor version
        // bytes 6..8: serial = 0; bytes 8..10: CRC = 0; bytes 10..12: CRC_Length = 0
        t[12..16].copy_from_slice(&lba.to_le_bytes());
        // Tag Checksum = (sum of bytes 0..4 and 5..16) mod 256
        let mut sum: u32 = 0;
        for &b in &t[0..4] { sum = sum.wrapping_add(b as u32); }
        for &b in &t[5..16] { sum = sum.wrapping_add(b as u32); }
        t[4] = (sum & 0xFF) as u8;
        t
    }

    /// Build an 8-bit dstring of `n` field bytes containing the given ASCII.
    /// Layout: [compression=8, chars..., zero-pad..., length_in_bytes].
    fn make_dstring(field_size: usize, s: &str) -> Vec<u8> {
        let mut v = vec![0u8; field_size];
        v[0] = 8; // compression ID
        let n = s.len().min(field_size - 2);
        v[1..1 + n].copy_from_slice(&s.as_bytes()[..n]);
        // Length byte = total bytes used = 1 (compression ID) + n (chars)
        v[field_size - 1] = (1 + n) as u8;
        v
    }

    #[test]
    fn dstring_8bit_ascii_round_trip() {
        let d = make_dstring(32, "HELLO");
        assert_eq!(parse_dstring(&d), "HELLO");
    }

    #[test]
    fn dstring_empty_returns_empty() {
        let d = vec![8, 0, 0, 0, 0, 0, 0, 0, 1]; // length = 1 = just compression ID
        assert_eq!(parse_dstring(&d), "");
    }

    #[test]
    fn descriptor_tag_validates_self_anchor() {
        let mut sector = vec![0u8; DVD_SECTOR_SIZE];
        sector[..16].copy_from_slice(&make_tag(TAG_ANCHOR_VOLUME_DESCRIPTOR_POINTER, 256));
        // Read from LBA 256 → must match.
        assert!(parse_descriptor_tag_at(&sector, 256).is_some());
        // Read from LBA 999 → tag_location = 256 ≠ 999 → reject.
        assert!(parse_descriptor_tag_at(&sector, 999).is_none());
    }

    #[test]
    fn descriptor_tag_rejects_bad_checksum() {
        let mut sector = vec![0u8; DVD_SECTOR_SIZE];
        sector[..16].copy_from_slice(&make_tag(TAG_ANCHOR_VOLUME_DESCRIPTOR_POINTER, 256));
        // Corrupt one byte; checksum no longer matches.
        sector[15] ^= 0xFF;
        assert!(parse_descriptor_tag(&sector).is_none());
    }

    /// End-to-end: build a minimal valid UDF volume in memory (AVDP →
    /// VDS{PD, LVD, Terminating} → FSD → root FE → one FID → one file FE)
    /// and walk it. This exercises every offset table we just fixed.
    #[test]
    fn walks_minimal_udf_volume() {
        // Volume layout we'll construct:
        //   LBA 32  → start of partition
        //   LBA 33  → File Set Descriptor (partition-relative LBA = 1)
        //   LBA 34  → root directory File Entry (partition-relative LBA = 2)
        //   LBA 35  → root directory contents (one FID pointing at LBA 4 rel)
        //   LBA 36  → file's File Entry (partition-relative LBA = 4)
        //   LBA 37  → file data (one sector of 'A')
        //   LBA 100 → main VDS start (PD + LVD + Terminating, each one sector)
        //   LBA 256 → AVDP pointing at VDS @ 100
        let reader = MemReader::new(1024);
        const PARTITION_START: u32 = 32;
        const FSD_REL: u32 = 1;
        const ROOT_FE_REL: u32 = 2;
        const ROOT_DIR_CONTENT_REL: u32 = 3;
        const FILE_FE_REL: u32 = 4;
        const FILE_DATA_REL: u32 = 5;
        const VDS_LBA: u32 = 100;
        const AVDP_LBA: u32 = 256;

        // ── AVDP at LBA 256: points to VDS at LBA 100, length = 3 * 2048 ──
        let mut avdp = vec![0u8; DVD_SECTOR_SIZE];
        avdp[..16].copy_from_slice(&make_tag(TAG_ANCHOR_VOLUME_DESCRIPTOR_POINTER, AVDP_LBA));
        avdp[16..20].copy_from_slice(&(3u32 * DVD_SECTOR_SIZE as u32).to_le_bytes());
        avdp[20..24].copy_from_slice(&VDS_LBA.to_le_bytes());
        reader.put(AVDP_LBA as u64, avdp);

        // ── VDS sector 0 @ LBA 100: Partition Descriptor ──
        let mut pd = vec![0u8; DVD_SECTOR_SIZE];
        pd[..16].copy_from_slice(&make_tag(TAG_PARTITION_DESCRIPTOR, VDS_LBA));
        pd[22..24].copy_from_slice(&0u16.to_le_bytes()); // partition number = 0
        pd[188..192].copy_from_slice(&PARTITION_START.to_le_bytes());
        pd[192..196].copy_from_slice(&100u32.to_le_bytes()); // length
        reader.put(VDS_LBA as u64, pd);

        // ── VDS sector 1 @ LBA 101: Logical Volume Descriptor ──
        let mut lvd = vec![0u8; DVD_SECTOR_SIZE];
        lvd[..16].copy_from_slice(&make_tag(TAG_LOGICAL_VOLUME_DESCRIPTOR, VDS_LBA + 1));
        // Logical Volume Identifier dstring at bytes 84..212 (128 bytes).
        let label = make_dstring(128, "TEST_VOL");
        lvd[84..212].copy_from_slice(&label);
        // FSD long_ad at bytes 248..264. We need: length (4), lba (4), part_ref (2), impl-use (6).
        lvd[248..252].copy_from_slice(&(DVD_SECTOR_SIZE as u32).to_le_bytes()); // length
        lvd[252..256].copy_from_slice(&FSD_REL.to_le_bytes());                  // lba
        lvd[256..258].copy_from_slice(&0u16.to_le_bytes());                     // partition_ref = 0
        reader.put((VDS_LBA + 1) as u64, lvd);

        // ── VDS sector 2 @ LBA 102: Terminating Descriptor ──
        let mut term = vec![0u8; DVD_SECTOR_SIZE];
        term[..16].copy_from_slice(&make_tag(TAG_TERMINATING_DESCRIPTOR, VDS_LBA + 2));
        reader.put((VDS_LBA + 2) as u64, term);

        // ── File Set Descriptor at partition-relative LBA 1 → absolute 33 ──
        let mut fsd = vec![0u8; DVD_SECTOR_SIZE];
        fsd[..16].copy_from_slice(&make_tag(TAG_FILE_SET_DESCRIPTOR, FSD_REL));
        // Root Directory ICB long_ad at bytes 400..416.
        fsd[400..404].copy_from_slice(&(DVD_SECTOR_SIZE as u32).to_le_bytes());
        fsd[404..408].copy_from_slice(&ROOT_FE_REL.to_le_bytes());
        fsd[408..410].copy_from_slice(&0u16.to_le_bytes());
        reader.put((PARTITION_START + FSD_REL) as u64, fsd);

        // ── Root directory File Entry at partition-relative LBA 2 → absolute 34 ──
        // Uses short_ad allocation pointing at partition-relative LBA 3 (= absolute 35)
        // for one sector of FID content.
        let root_fe = build_file_entry(
            ROOT_FE_REL,
            /*file_type*/ 4, // directory
            /*info_len*/ DVD_SECTOR_SIZE as u64,
            /*ad_short_pos*/ ROOT_DIR_CONTENT_REL,
            /*ad_short_len*/ DVD_SECTOR_SIZE as u32,
        );
        reader.put((PARTITION_START + ROOT_FE_REL) as u64, root_fe);

        // ── Root directory contents @ partition-rel LBA 3 → absolute 35 ──
        // Single FID pointing at FILE_FE_REL with name "HELLO.TXT".
        let root_content = build_dir_with_one_fid("HELLO.TXT", FILE_FE_REL, /*is_dir*/ false);
        reader.put((PARTITION_START + ROOT_DIR_CONTENT_REL) as u64, root_content);

        // ── File's File Entry at partition-rel LBA 4 → absolute 36 ──
        let file_fe = build_file_entry(
            FILE_FE_REL,
            /*file_type*/ 5, // regular file
            /*info_len*/ 5, // "AAAAA"
            /*ad_short_pos*/ FILE_DATA_REL,
            /*ad_short_len*/ 5,
        );
        reader.put((PARTITION_START + FILE_FE_REL) as u64, file_fe);

        // ── File data sector (we don't actually read it during the walk, but
        //    we put something there so any future content-reading test passes).
        let mut file_data = vec![0u8; DVD_SECTOR_SIZE];
        file_data[..5].copy_from_slice(b"AAAAA");
        reader.put((PARTITION_START + FILE_DATA_REL) as u64, file_data);

        // ── Walk it! ──
        let vol = walk_udf(&reader).expect("UDF walk should succeed");
        assert_eq!(vol.label, "TEST_VOL");
        // Should have found exactly one file: HELLO.TXT
        let files: Vec<_> = vol.entries.iter().filter(|e| !e.is_dir).collect();
        assert_eq!(files.len(), 1, "expected 1 file, got {:?}", vol.entries);
        assert_eq!(files[0].path, "HELLO.TXT");
        assert_eq!(files[0].size_bytes, 5);
        assert_eq!(files[0].start_lba, (PARTITION_START + FILE_DATA_REL) as u64);
    }

    /// Build a minimal File Entry sector with one short_ad allocation descriptor.
    fn build_file_entry(
        self_lba: u32,
        file_type: u8,
        info_len: u64,
        ad_short_pos: u32,
        ad_short_len: u32,
    ) -> Vec<u8> {
        let mut fe = vec![0u8; DVD_SECTOR_SIZE];
        fe[..16].copy_from_slice(&make_tag(TAG_FILE_ENTRY, self_lba));
        // ICB Tag at bytes 16..36. File Type byte at 27 (= 16+11).
        fe[27] = file_type;
        // Strategy Type at bytes 20..22 (= 16+4..16+6): 4 = direct.
        fe[20..22].copy_from_slice(&4u16.to_le_bytes());
        // Flags at bytes 34..36 (= 16+18..16+20). AD type 0 = short_ad (low 3 bits = 0).
        fe[34..36].copy_from_slice(&0u16.to_le_bytes());
        // Information Length at bytes 56..64.
        fe[56..64].copy_from_slice(&info_len.to_le_bytes());
        // Per ECMA-167 §14.9 the FE layout is:
        //   bytes 168..172: L_EA  (Length of Extended Attributes)
        //   bytes 172..176: L_AD  (Length of Allocation Descriptors)
        //   bytes 176..(176+L_EA): EAs (none here)
        //   bytes (176+L_EA)..(176+L_EA+L_AD): allocation descriptors
        fe[168..172].copy_from_slice(&0u32.to_le_bytes()); // L_EA = 0
        fe[172..176].copy_from_slice(&8u32.to_le_bytes()); // L_AD = 8 (one short_ad)
        // short_ad at byte 176: length (4) + position (4).
        fe[176..180].copy_from_slice(&ad_short_len.to_le_bytes());
        fe[180..184].copy_from_slice(&ad_short_pos.to_le_bytes());
        fe
    }

    /// Build a directory-content sector with a single FID for `name`.
    fn build_dir_with_one_fid(name: &str, child_icb_rel_lba: u32, is_dir: bool) -> Vec<u8> {
        let mut dir = vec![0u8; DVD_SECTOR_SIZE];
        // FID tag at offset 0 of directory content. Self-anchor = the
        // partition-relative LBA the directory content sits at, but FIDs use
        // tag_location of the FIRST sector containing the FID; for a
        // single-sector dir starting at partition-relative LBA
        // ROOT_DIR_CONTENT_REL = 3 we use that. (parse_file_identifiers
        // uses the non-validating tag parser, so this isn't strictly required,
        // but we set it correctly for completeness.)
        let dir_self_anchor = 3u32; // matches ROOT_DIR_CONTENT_REL in the test above
        dir[..16].copy_from_slice(&make_tag(TAG_FILE_IDENTIFIER_DESCRIPTOR, dir_self_anchor));
        // FID body:
        //   bytes 16..18: File Version Number = 1
        //   byte 18: File Characteristics (bit 1 = directory)
        //   byte 19: L_FI = name length (raw bytes, including the compression
        //            ID prefix if name is encoded as a CS0 string)
        //   bytes 20..36: ICB long_ad (length, lba, part_ref, impl_use)
        //   bytes 36..38: L_IU = 0
        //   bytes 38..38+L_IU+L_FI: payload
        dir[16..18].copy_from_slice(&1u16.to_le_bytes());
        let mut chars: u8 = 0;
        if is_dir { chars |= 0x02; }
        dir[18] = chars;

        // File Identifier payload: 1 byte compression ID + raw bytes.
        let mut fi_payload = Vec::with_capacity(1 + name.len());
        fi_payload.push(8u8); // compression = 8-bit
        fi_payload.extend_from_slice(name.as_bytes());
        let l_fi = fi_payload.len();
        dir[19] = l_fi as u8;

        // ICB long_ad pointing at the child File Entry.
        dir[20..24].copy_from_slice(&(DVD_SECTOR_SIZE as u32).to_le_bytes());
        dir[24..28].copy_from_slice(&child_icb_rel_lba.to_le_bytes());
        dir[28..30].copy_from_slice(&0u16.to_le_bytes());

        dir[36..38].copy_from_slice(&0u16.to_le_bytes()); // L_IU = 0
        dir[38..38 + l_fi].copy_from_slice(&fi_payload);
        dir
    }
}
