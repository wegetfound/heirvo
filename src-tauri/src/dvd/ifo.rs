//! Native DVD-Video IFO/BUP parser.
//!
//! Implements the minimum DVD-Video spec needed to populate [`DvdStructure`]:
//!
//! * `VIDEO_TS.IFO` (VMGI) — magic, title-count, per-title VTS mapping.
//! * `VTS_NN_0.IFO` (VTSI) — magic, PGC playback time, chapter list, audio
//!   and subpicture stream attributes.
//! * Falls back to the `*.BUP` backup copy when the primary IFO is unreadable.
//! * Every multi-byte read is bounds-checked; partial/corrupt input produces a
//!   best-effort degraded entry rather than a panic or a hard error.
//!
//! All DVD-Video integers are **big-endian**.  Sector size = 2 048 bytes.

use crate::dvd::structure::{AudioTrack, Chapter, DvdStructure, SubtitleTrack, Title};
use crate::error::AppResult;
use std::fs;
use std::path::Path;

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/// Read a big-endian `u16` from `buf[offset..]`.  Returns `None` on OOB.
#[inline]
fn read_u16_be(buf: &[u8], offset: usize) -> Option<u16> {
    let b = buf.get(offset..offset + 2)?;
    Some(u16::from_be_bytes([b[0], b[1]]))
}

/// Read a big-endian `u32` from `buf[offset..]`.  Returns `None` on OOB.
#[inline]
fn read_u32_be(buf: &[u8], offset: usize) -> Option<u32> {
    let b = buf.get(offset..offset + 4)?;
    Some(u32::from_be_bytes([b[0], b[1], b[2], b[3]]))
}

/// Decode a single BCD nibble.  Values 0-9 are valid; 0xA-0xF are clipped to 0.
#[inline]
fn bcd_byte(b: u8) -> u8 {
    let hi = (b >> 4) & 0x0F;
    let lo = b & 0x0F;
    (if hi < 10 { hi } else { 0 }) * 10 + (if lo < 10 { lo } else { 0 })
}

/// Decode the 4-byte PGC playback time field → total seconds.
///
/// Layout (DVD-Video spec §5.2.7 / §5.3.6):
///   byte 0 — HH (BCD)
///   byte 1 — MM (BCD)
///   byte 2 — SS (BCD)
///   byte 3 — FF (BCD, frames) + frame-rate bits in bits 7-6 (we ignore)
fn decode_playback_time(buf: &[u8]) -> u32 {
    if buf.len() < 4 {
        return 0;
    }
    let hh = bcd_byte(buf[0]) as u32;
    let mm = bcd_byte(buf[1]) as u32;
    let ss = bcd_byte(buf[2]) as u32;
    hh * 3600 + mm * 60 + ss
}

/// Decode a 3-byte ISO 639-1 language code stored as two ASCII bytes padded
/// with a zero byte.  Returns an empty string when the bytes are not printable.
fn decode_lang(b0: u8, b1: u8) -> String {
    let a = if b0.is_ascii_alphabetic() { b0 as char } else { '?' };
    let b = if b1.is_ascii_alphabetic() { b1 as char } else { '?' };
    if a == '?' && b == '?' { String::new() } else { format!("{}{}", a, b) }
}

// ---------------------------------------------------------------------------
// File loading with BUP fallback
// ---------------------------------------------------------------------------

/// Load bytes from `primary`; if that fails (missing, unreadable, too small),
/// try `backup`.  If both fail, return `None`.
fn load_ifo(primary: &Path, backup: &Path) -> Option<Vec<u8>> {
    if let Ok(bytes) = fs::read(primary) {
        if bytes.len() >= 12 {
            return Some(bytes);
        }
    }
    if let Ok(bytes) = fs::read(backup) {
        if bytes.len() >= 12 {
            return Some(bytes);
        }
    }
    None
}

// ---------------------------------------------------------------------------
// VMGI (VIDEO_TS.IFO) parsing
// ---------------------------------------------------------------------------

/// Describes a single title as seen from the VMGI's Title PTR Search table.
#[derive(Debug)]
struct TitleRef {
    /// 1-based title number (matches user-visible numbering).
    title_num: u8,
    /// Which VTS this title lives in (1-based).
    vts_num: u8,
    /// Title number within that VTS (1-based).
    vts_ttn: u8,
}

/// Parse `VIDEO_TS.IFO` / `VIDEO_TS.BUP` and return the list of title refs.
///
/// On any structural corruption we return whatever we decoded so far rather
/// than an error — the caller will handle partial results.
fn parse_vmgi(buf: &[u8]) -> (String, Vec<TitleRef>) {
    // Magic check at byte 0 (12 bytes: "DVDVIDEO-VMG")
    let magic_ok = buf.get(0..12).map_or(false, |m| m == b"DVDVIDEO-VMG");
    if !magic_ok {
        tracing::warn!("ifo: VIDEO_TS magic mismatch");
        return (String::new(), Vec::new());
    }

    // Volume identifier: VMGI_MAT — starts at byte 0.
    // Volume label is stored in the ISO 9660 PVD, not in the IFO itself.
    // We leave volume_label to the caller.

    // Number of Title Sets: VMGI_MAT offset 0x3E (u16 be) = total VTS count.
    // Number of Titles: VMG_PTT_SRPT — the table we actually need.
    //
    // VMG_PTT_SRPT sector pointer: VMGI_MAT+0x00C4 (u32 be, sector number).
    // But for enumerating titles the simpler source is the
    // VMG_TT_SRPT (Title/Chapter Search Pointer Table) at VMGI_MAT+0x00C4.
    //
    // DVD spec layout for VMGI_MAT (all offsets relative to start of IFO):
    //   0x003E  u16  Number of VTS
    //   0x00C4  u32  Start sector of VMG_TT_SRPT
    //
    // VMG_TT_SRPT structure:
    //   +0x00  u16  number of title entries
    //   +0x02  u16  (end address low word)
    //   +0x04  u32  end byte address of table
    //   +0x08  N×12-byte records
    //
    // Each 12-byte TT_SRPT record:
    //   +0x00  u8   title type / nr_of_angles (we skip)
    //   +0x01  u8   nr_of_ptts (chapters)  — useful but not in Title struct; skip here
    //   +0x02  u16  nr_of_ptts (big-endian) — chapter count per title
    //   +0x04  u8   VTS title number within its title set
    //   +0x05  u8   VTS number (1-based)
    //   +0x06  u32  start sector of title (not used here)
    //   +0x0A  u16  (pad)

    let tt_srpt_sector = match read_u32_be(buf, 0x00C4) {
        Some(s) => s as usize,
        None => return (String::new(), Vec::new()),
    };
    let tt_srpt_offset = tt_srpt_sector * 2048;
    if tt_srpt_offset + 8 > buf.len() {
        tracing::warn!("ifo: TT_SRPT sector {} out of range (buf len {})", tt_srpt_sector, buf.len());
        return (String::new(), Vec::new());
    }

    let num_titles = match read_u16_be(buf, tt_srpt_offset) {
        Some(n) => n as usize,
        None => return (String::new(), Vec::new()),
    };

    let mut refs = Vec::with_capacity(num_titles);
    for i in 0..num_titles {
        let rec = tt_srpt_offset + 8 + i * 12;
        if rec + 12 > buf.len() {
            tracing::warn!("ifo: TT_SRPT record {} truncated", i);
            break;
        }
        let vts_ttn = buf[rec + 4];
        let vts_num = buf[rec + 5];
        refs.push(TitleRef {
            title_num: (i + 1) as u8,
            vts_num,
            vts_ttn,
        });
    }

    (String::new(), refs)
}

// ---------------------------------------------------------------------------
// VTSI (VTS_NN_0.IFO) parsing
// ---------------------------------------------------------------------------

/// Information extracted from a single VTS IFO.
#[derive(Debug, Default)]
struct VtsInfo {
    /// Per-PGC playback times (seconds), indexed by VTS-internal title number (0-based).
    pgc_duration_secs: Vec<u32>,
    /// Per-PGC chapter counts, indexed by VTS-internal title number (0-based).
    pgc_chapters: Vec<Vec<Chapter>>,
    /// Audio tracks (shared across all titles in this VTS).
    audio_tracks: Vec<AudioTrack>,
    /// Subtitle tracks (shared across all titles in this VTS).
    subtitle_tracks: Vec<SubtitleTrack>,
    /// First-cell start sector for this VTS (used as title start_sector).
    vts_start_sector: u64,
}

/// Parse `VTS_NN_0.IFO`.
fn parse_vtsi(buf: &[u8], vts_num: u8) -> VtsInfo {
    let mut info = VtsInfo::default();

    // Magic check
    let magic_ok = buf.get(0..12).map_or(false, |m| m == b"DVDVIDEO-VTS");
    if !magic_ok {
        tracing::warn!("ifo: VTS_{:02}_0.IFO magic mismatch", vts_num);
        return info;
    }

    // VTSI_MAT starts at byte 0.
    // VTS sector pointer (start of VTS on disc) is at VTSI_MAT+0x000C (u32 be).
    if let Some(s) = read_u32_be(buf, 0x000C) {
        info.vts_start_sector = s as u64;
    }

    // -----------------------------------------------------------------------
    // Audio stream attributes  VTSI_MAT+0x0100: u16 number of audio streams
    //   then N × 8-byte audio attribute records:
    //     +0x00  u8  coding mode (bits 7-5: 000=AC3 001=MPEG1 010=MPEG2ext 011=LPCM 100=DTS)
    //     +0x01  u8  multi-channel extension flags
    //     +0x02  u8  lang_type / application mode
    //     +0x03  u8  lang_code byte 0   (ISO 639-1)
    //     +0x04  u8  lang_code byte 1
    //     +0x05  u8  content / app info
    //     +0x06  u8  quant/drc
    //     +0x07  u8  nr_of_channels in bits [2:0]
    // -----------------------------------------------------------------------
    let n_audio = read_u16_be(buf, 0x0100).unwrap_or(0) as usize;
    let n_audio = n_audio.min(8); // spec max is 8 audio streams
    for i in 0..n_audio {
        let base = 0x0102 + i * 8;
        if base + 8 > buf.len() { break; }
        let coding_byte = buf[base];
        let lang_b0 = buf[base + 3];
        let lang_b1 = buf[base + 4];
        let ch_byte = buf[base + 7];
        let channels = (ch_byte & 0x07) + 1;

        let codec = match (coding_byte >> 5) & 0x07 {
            0 => "AC3",
            1 => "MPEG1",
            2 => "MPEG2ext",
            3 => "LPCM",
            4 => "DTS",
            _ => "Unknown",
        }
        .to_string();

        info.audio_tracks.push(AudioTrack {
            index: i as u8,
            language: decode_lang(lang_b0, lang_b1),
            codec,
            channels,
        });
    }

    // -----------------------------------------------------------------------
    // Subpicture (subtitle) stream attributes  VTSI_MAT+0x0154
    //   u16 number, then N × 6-byte records:
    //     +0x00  u8  coding mode flags
    //     +0x01  u8  lang_type
    //     +0x02  u8  lang_code byte 0
    //     +0x03  u8  lang_code byte 1
    //     +0x04  u8  content/code extension
    //     +0x05  u8  (reserved)
    // -----------------------------------------------------------------------
    let n_sub = read_u16_be(buf, 0x0154).unwrap_or(0) as usize;
    let n_sub = n_sub.min(32); // spec max is 32
    for i in 0..n_sub {
        let base = 0x0156 + i * 6;
        if base + 6 > buf.len() { break; }
        let lang_b0 = buf[base + 2];
        let lang_b1 = buf[base + 3];
        info.subtitle_tracks.push(SubtitleTrack {
            index: i as u8,
            language: decode_lang(lang_b0, lang_b1),
        });
    }

    // -----------------------------------------------------------------------
    // VTS_PGCI — Program Chain Information Table
    //   Sector pointer at VTSI_MAT+0x00CC (u32 be).
    //
    // VTS_PGCI header:
    //   +0x00  u16  number of VTS_PGC_SRPT (title program chains)
    //   +0x02  u16  (reserved)
    //   +0x04  u32  end-byte address
    //   +0x08  N × 8-byte PGCI_SRP records:
    //             +0x00  u8  entry PGC flags
    //             +0x01  u8  PGC title number (1-based within VTS)
    //             +0x02  u16 (reserved)
    //             +0x04  u32 offset to PGC from start of VTS_PGCI table
    //
    // PGC structure (relative to its offset from VTS_PGCI table start):
    //   +0x00  u16  (reserved)
    //   +0x02  u8   number of programs (chapters within this PGC)
    //   +0x03  u8   number of cells
    //   +0x04  4 bytes: playback time (HH MM SS FF/fps)
    //   ... (command tables, cell offset tables follow)
    // -----------------------------------------------------------------------
    let pgci_sector = match read_u32_be(buf, 0x00CC) {
        Some(s) => s as usize,
        None => return info,
    };
    let pgci_off = pgci_sector * 2048;
    if pgci_off + 8 > buf.len() {
        tracing::warn!("ifo: VTS_{:02} PGCI sector {} out of range", vts_num, pgci_sector);
        return info;
    }

    let num_pgcs = read_u16_be(buf, pgci_off).unwrap_or(0) as usize;
    // Reserve space indexed by VTS-TTN (1-based → 0-based).
    // We accumulate one entry per unique VTS title number.
    let mut pgc_map: Vec<(u32, Vec<Chapter>)> = Vec::new(); // indexed by vts_ttn-1

    for i in 0..num_pgcs {
        let srp_base = pgci_off + 8 + i * 8;
        if srp_base + 8 > buf.len() { break; }

        let vts_ttn_raw = buf[srp_base + 1]; // 1-based
        if vts_ttn_raw == 0 { continue; }
        let vts_ttn = (vts_ttn_raw - 1) as usize;

        let pgc_relative_off = match read_u32_be(buf, srp_base + 4) {
            Some(o) => o as usize,
            None => continue,
        };
        let pgc_abs = pgci_off + pgc_relative_off;
        if pgc_abs + 8 > buf.len() { continue; }

        let n_programs = buf.get(pgc_abs + 2).copied().unwrap_or(0) as usize;

        let playback_bytes = buf.get(pgc_abs + 4..pgc_abs + 8).unwrap_or(&[]);
        let duration = decode_playback_time(playback_bytes);

        // Build naive chapter list: equal-division of duration across programs.
        // The actual chapter cell offsets are in the Cell Playback Info table
        // (at pgc_abs + 0x00E4 + cell_idx * 0x18), which requires parsing the
        // Cell Address Table and C_ADT.  For the recovery-tool use-case the
        // timing estimate is sufficient; we emit chapters at 0 offset increments.
        let chapters: Vec<Chapter> = (0..n_programs.min(255))
            .map(|ci| Chapter {
                index: ci as u8,
                start_offset_secs: if n_programs > 0 {
                    (duration * ci as u32) / n_programs as u32
                } else {
                    0
                },
            })
            .collect();

        // Ensure pgc_map is large enough.
        while pgc_map.len() <= vts_ttn {
            pgc_map.push((0, Vec::new()));
        }
        // Only overwrite if this PGC has longer duration (entry-PGC preference).
        if duration > pgc_map[vts_ttn].0 || pgc_map[vts_ttn].1.is_empty() {
            pgc_map[vts_ttn] = (duration, chapters);
        }
    }

    info.pgc_duration_secs = pgc_map.iter().map(|(d, _)| *d).collect();
    info.pgc_chapters = pgc_map.into_iter().map(|(_, ch)| ch).collect();

    info
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Parse the `VIDEO_TS/` directory on an extracted DVD filesystem and return
/// a [`DvdStructure`].  Designed to degrade gracefully on damaged media.
pub fn parse_video_ts_dir(path: &Path) -> AppResult<DvdStructure> {
    // -----------------------------------------------------------------------
    // 1. Load VIDEO_TS.IFO (with BUP fallback).
    // -----------------------------------------------------------------------
    let vmgi_ifo = path.join("VIDEO_TS.IFO");
    let vmgi_bup = path.join("VIDEO_TS.BUP");
    let vmgi_buf = load_ifo(&vmgi_ifo, &vmgi_bup);

    let (_, title_refs) = if let Some(buf) = &vmgi_buf {
        parse_vmgi(buf)
    } else {
        tracing::warn!("ifo: VIDEO_TS.IFO and .BUP both missing or unreadable");
        (String::new(), Vec::new())
    };

    // Attempt to derive a volume label from the directory name as a fallback.
    let volume_label = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "DVD".to_string());

    // CSS protection heuristic: VIDEO_TS.IFO has a 1-byte flag at 0x0401.
    let has_css_protection = vmgi_buf
        .as_deref()
        .and_then(|b| b.get(0x0401).copied())
        .map(|b| b != 0)
        .unwrap_or(false);

    // -----------------------------------------------------------------------
    // 2. Parse each referenced VTS IFO.
    // -----------------------------------------------------------------------
    // Group title refs by VTS number to avoid re-parsing the same file.
    let max_vts = title_refs.iter().map(|r| r.vts_num as usize).max().unwrap_or(0);
    let mut vts_cache: Vec<Option<VtsInfo>> = (0..=max_vts).map(|_| None).collect();

    for i in 1..=max_vts {
        let ifo_name = format!("VTS_{:02}_0.IFO", i);
        let bup_name = format!("VTS_{:02}_0.BUP", i);
        let ifo_path = path.join(&ifo_name);
        let bup_path = path.join(&bup_name);
        if let Some(buf) = load_ifo(&ifo_path, &bup_path) {
            vts_cache[i] = Some(parse_vtsi(&buf, i as u8));
        } else {
            tracing::warn!("ifo: {} and .BUP both missing or unreadable", ifo_name);
        }
    }

    // -----------------------------------------------------------------------
    // 3. If VMGI gave us no title refs (corrupt disc), synthesise them by
    //    scanning for VTS_NN_0.IFO files that actually exist on disk.
    // -----------------------------------------------------------------------
    let title_refs = if title_refs.is_empty() {
        tracing::info!("ifo: no title refs from VMGI, scanning directory");
        let mut synthetic: Vec<TitleRef> = Vec::new();
        let mut tnum: u8 = 1;
        for i in 1u8..=99 {
            let ifo_name = format!("VTS_{:02}_0.IFO", i);
            let bup_name = format!("VTS_{:02}_0.BUP", i);
            if path.join(&ifo_name).exists() || path.join(&bup_name).exists() {
                // Ensure we have parsed this VTS.
                let vi = i as usize;
                if vi >= vts_cache.len() {
                    vts_cache.resize_with(vi + 1, || None);
                }
                if vts_cache[vi].is_none() {
                    let ifo_path = path.join(&ifo_name);
                    let bup_path = path.join(&bup_name);
                    if let Some(buf) = load_ifo(&ifo_path, &bup_path) {
                        vts_cache[vi] = Some(parse_vtsi(&buf, i));
                    }
                }
                // One synthetic title per PGC found in this VTS.
                let pgc_count = vts_cache[vi]
                    .as_ref()
                    .map(|v| v.pgc_duration_secs.len())
                    .unwrap_or(1)
                    .max(1);
                for pgc_idx in 1..=(pgc_count as u8) {
                    synthetic.push(TitleRef { title_num: tnum, vts_num: i, vts_ttn: pgc_idx });
                    tnum = tnum.saturating_add(1);
                }
            } else {
                break; // VTS numbers are contiguous; first gap = done.
            }
        }
        synthetic
    } else {
        title_refs
    };

    // -----------------------------------------------------------------------
    // 4. Build Title objects.
    // -----------------------------------------------------------------------
    let mut titles: Vec<Title> = Vec::with_capacity(title_refs.len());

    for tr in &title_refs {
        let vts_idx = tr.vts_num as usize;
        let ttn_idx = tr.vts_ttn.saturating_sub(1) as usize; // convert to 0-based

        let (duration_secs, chapters, audio_tracks, subtitle_tracks, start_sector) =
            if let Some(Some(vts)) = vts_cache.get(vts_idx) {
                let dur = vts.pgc_duration_secs.get(ttn_idx).copied().unwrap_or(0);
                let ch = vts.pgc_chapters.get(ttn_idx).cloned().unwrap_or_default();
                (dur, ch, vts.audio_tracks.clone(), vts.subtitle_tracks.clone(), vts.vts_start_sector)
            } else {
                (0, Vec::new(), Vec::new(), Vec::new(), 0)
            };

        titles.push(Title {
            index: tr.title_num,
            duration_secs,
            start_sector,
            end_sector: start_sector, // end_sector unknown without VOB map; set = start
            chapters,
            audio_tracks,
            subtitle_tracks,
        });
    }

    // Sort by title index for deterministic output.
    titles.sort_by_key(|t| t.index);

    Ok(DvdStructure {
        volume_label,
        titles,
        has_css_protection,
    })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    // -----------------------------------------------------------------------
    // Helper: build a minimal syntactically-valid VMGI buffer.
    // -----------------------------------------------------------------------
    fn build_vmgi(num_titles: u16, vts_map: &[(u8, u8)]) -> Vec<u8> {
        // We'll put the TT_SRPT in sector 1 (offset 2048).
        let tt_srpt_sector: u32 = 1;
        let mut buf = vec![0u8; 2048 * 2 + 8 + num_titles as usize * 12];

        // Magic
        buf[..12].copy_from_slice(b"DVDVIDEO-VMG");

        // TT_SRPT sector pointer at offset 0x00C4
        let ptr_bytes = tt_srpt_sector.to_be_bytes();
        buf[0x00C4..0x00C8].copy_from_slice(&ptr_bytes);

        // TT_SRPT header at 2048
        let hdr_off = 2048usize;
        buf[hdr_off..hdr_off + 2].copy_from_slice(&num_titles.to_be_bytes());
        // end address = header(8) + records
        let end_addr = (8u32 + num_titles as u32 * 12).to_be_bytes();
        buf[hdr_off + 4..hdr_off + 8].copy_from_slice(&end_addr);

        // Records
        for (i, &(vts_ttn, vts_num)) in vts_map.iter().enumerate() {
            let rec = hdr_off + 8 + i * 12;
            buf[rec + 4] = vts_ttn;
            buf[rec + 5] = vts_num;
        }

        buf
    }

    // -----------------------------------------------------------------------
    // Helper: build a minimal VTSI buffer with given PGCs and audio tracks.
    // -----------------------------------------------------------------------
    fn build_vtsi(
        pgcs: &[(u8 /* vts_ttn */, u8 /* n_programs */, u32 /* duration_secs */)],
        audio: &[(u8 /* coding */, &str /* lang */, u8 /* channels */)],
        subtitles: &[&str /* lang */],
    ) -> Vec<u8> {
        // Place VTS_PGCI at sector 2 (offset 4096)
        let pgci_sector: u32 = 2;

        // Calculate total PGC data size and allocate.
        let pgci_off = pgci_sector as usize * 2048;
        let total = pgci_off + 8 + pgcs.len() * 8 + pgcs.len() * 256;
        let mut buf = vec![0u8; total.max(pgci_off + 512)];

        // Magic
        buf[..12].copy_from_slice(b"DVDVIDEO-VTS");

        // VTS_PGCI sector pointer
        buf[0x00CC..0x00D0].copy_from_slice(&pgci_sector.to_be_bytes());

        // Audio count at 0x0100
        let n_audio = audio.len().min(8) as u16;
        buf[0x0100..0x0102].copy_from_slice(&n_audio.to_be_bytes());

        for (i, &(coding, lang, channels)) in audio.iter().enumerate().take(8) {
            let base = 0x0102 + i * 8;
            if base + 8 > buf.len() { break; }
            buf[base] = coding << 5;
            let lb = lang.as_bytes();
            buf[base + 3] = lb.first().copied().unwrap_or(0);
            buf[base + 4] = lb.get(1).copied().unwrap_or(0);
            buf[base + 7] = (channels.saturating_sub(1)) & 0x07;
        }

        // Subtitle count at 0x0154
        let n_sub = subtitles.len().min(32) as u16;
        buf[0x0154..0x0156].copy_from_slice(&n_sub.to_be_bytes());

        for (i, &lang) in subtitles.iter().enumerate().take(32) {
            let base = 0x0156 + i * 6;
            if base + 6 > buf.len() { break; }
            let lb = lang.as_bytes();
            buf[base + 2] = lb.first().copied().unwrap_or(0);
            buf[base + 3] = lb.get(1).copied().unwrap_or(0);
        }

        // VTS_PGCI header
        let num_pgcs = pgcs.len() as u16;
        buf[pgci_off..pgci_off + 2].copy_from_slice(&num_pgcs.to_be_bytes());

        let mut pgc_data_base = pgci_off + 8 + pgcs.len() * 8;
        for (i, &(vts_ttn, n_programs, duration_secs)) in pgcs.iter().enumerate() {
            let srp = pgci_off + 8 + i * 8;
            buf[srp + 1] = vts_ttn; // title num within VTS

            // offset from VTS_PGCI table start to PGC data
            let pgc_offset = (pgc_data_base - pgci_off) as u32;
            buf[srp + 4..srp + 8].copy_from_slice(&pgc_offset.to_be_bytes());

            // PGC data
            let p = pgc_data_base;
            if p + 8 <= buf.len() {
                buf[p + 2] = n_programs;
                // Encode duration as BCD HH MM SS 00
                let hh = duration_secs / 3600;
                let mm = (duration_secs % 3600) / 60;
                let ss = duration_secs % 60;
                buf[p + 4] = ((hh / 10) << 4 | (hh % 10)) as u8;
                buf[p + 5] = ((mm / 10) << 4 | (mm % 10)) as u8;
                buf[p + 6] = ((ss / 10) << 4 | (ss % 10)) as u8;
                buf[p + 7] = 0; // frames / fps bits
            }
            pgc_data_base += 256; // generous padding between PGC records
        }

        buf
    }

    fn write_file(dir: &Path, name: &str, data: &[u8]) {
        let mut f = fs::File::create(dir.join(name)).unwrap();
        f.write_all(data).unwrap();
    }

    // -----------------------------------------------------------------------
    // Test 1: happy path — 2 VTS each with 1 title, 1 audio stream.
    // -----------------------------------------------------------------------
    #[test]
    fn test_parse_two_titles() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path();

        // VIDEO_TS.IFO: 2 titles — title 1 in VTS 1 ttn 1, title 2 in VTS 2 ttn 1.
        let vmgi = build_vmgi(2, &[(1, 1), (1, 2)]);
        write_file(dir, "VIDEO_TS.IFO", &vmgi);

        // VTS_01_0.IFO: 1 PGC, 3 chapters, ~90 min.
        let vtsi1 = build_vtsi(
            &[(1, 3, 5400)],
            &[(0, "en", 2)],
            &["en"],
        );
        write_file(dir, "VTS_01_0.IFO", &vtsi1);

        // VTS_02_0.IFO: 1 PGC, 5 chapters, ~45 min.
        let vtsi2 = build_vtsi(
            &[(1, 5, 2700)],
            &[(0, "fr", 2)],
            &["fr"],
        );
        write_file(dir, "VTS_02_0.IFO", &vtsi2);

        let dvd = parse_video_ts_dir(dir).expect("parse should succeed");

        assert_eq!(dvd.titles.len(), 2, "expected 2 titles");

        let t1 = &dvd.titles[0];
        assert_eq!(t1.index, 1);
        assert_eq!(t1.duration_secs, 5400);
        assert_eq!(t1.chapters.len(), 3);
        assert_eq!(t1.audio_tracks.len(), 1);
        assert_eq!(t1.audio_tracks[0].codec, "AC3");
        assert_eq!(t1.audio_tracks[0].language, "en");
        assert_eq!(t1.subtitle_tracks.len(), 1);
        assert_eq!(t1.subtitle_tracks[0].language, "en");

        let t2 = &dvd.titles[1];
        assert_eq!(t2.index, 2);
        assert_eq!(t2.duration_secs, 2700);
        assert_eq!(t2.chapters.len(), 5);
        assert_eq!(t2.audio_tracks[0].language, "fr");
    }

    // -----------------------------------------------------------------------
    // Test 2: multiple audio streams + subtitles.
    // -----------------------------------------------------------------------
    #[test]
    fn test_audio_codec_and_subtitle_decode() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path();

        let vmgi = build_vmgi(1, &[(1, 1)]);
        write_file(dir, "VIDEO_TS.IFO", &vmgi);

        // coding byte >> 5: 0=AC3, 3=LPCM, 4=DTS
        let vtsi = build_vtsi(
            &[(1, 2, 3600)],
            &[(0, "en", 2), (3, "de", 2), (4, "ja", 6)],
            &["en", "de", "fr"],
        );
        write_file(dir, "VTS_01_0.IFO", &vtsi);

        let dvd = parse_video_ts_dir(dir).unwrap();
        assert_eq!(dvd.titles.len(), 1);
        let t = &dvd.titles[0];

        assert_eq!(t.audio_tracks.len(), 3);
        assert_eq!(t.audio_tracks[0].codec, "AC3");
        assert_eq!(t.audio_tracks[1].codec, "LPCM");
        assert_eq!(t.audio_tracks[2].codec, "DTS");
        assert_eq!(t.audio_tracks[2].channels, 6);

        assert_eq!(t.subtitle_tracks.len(), 3);
        assert_eq!(t.subtitle_tracks[0].language, "en");
        assert_eq!(t.subtitle_tracks[1].language, "de");
        assert_eq!(t.subtitle_tracks[2].language, "fr");
    }

    // -----------------------------------------------------------------------
    // Test 3: BCD duration decoding edge cases.
    // -----------------------------------------------------------------------
    #[test]
    fn test_bcd_duration() {
        // 01:30:00 = 5400 seconds
        let buf = [0x01u8, 0x30, 0x00, 0x00];
        assert_eq!(decode_playback_time(&buf), 5400);

        // 00:45:30 = 2730 seconds
        let buf = [0x00u8, 0x45, 0x30, 0x00];
        assert_eq!(decode_playback_time(&buf), 2730);

        // All zeros = 0
        let buf = [0x00u8, 0x00, 0x00, 0x00];
        assert_eq!(decode_playback_time(&buf), 0);

        // Truncated buffer → 0
        assert_eq!(decode_playback_time(&[0x01, 0x30]), 0);
    }

    // -----------------------------------------------------------------------
    // Test 4: truncated / garbage input — must return Ok (no panic).
    // -----------------------------------------------------------------------
    #[test]
    fn test_garbage_input_returns_ok() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path();

        // Write 17 bytes of garbage for both IFO and BUP.
        write_file(dir, "VIDEO_TS.IFO", b"not a real ifo!!");
        write_file(dir, "VIDEO_TS.BUP", b"also garbage!!!!");

        // VTS file completely absent — should not panic.
        let result = parse_video_ts_dir(dir);
        assert!(result.is_ok(), "garbage input must not return Err: {:?}", result);

        let dvd = result.unwrap();
        // No titles decoded from garbage header.
        assert_eq!(dvd.titles.len(), 0, "no titles expected from garbage input");
    }

    // -----------------------------------------------------------------------
    // Test 5: IFO missing, BUP present — should fall back successfully.
    // -----------------------------------------------------------------------
    #[test]
    fn test_bup_fallback() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path();

        // No VIDEO_TS.IFO, but valid BUP.
        let vmgi = build_vmgi(1, &[(1, 1)]);
        write_file(dir, "VIDEO_TS.BUP", &vmgi);

        let vtsi = build_vtsi(&[(1, 4, 7200)], &[(0, "en", 2)], &[]);
        // No VTS IFO either, only BUP.
        write_file(dir, "VTS_01_0.BUP", &vtsi);

        let dvd = parse_video_ts_dir(dir).unwrap();
        assert_eq!(dvd.titles.len(), 1);
        assert_eq!(dvd.titles[0].duration_secs, 7200);
        assert_eq!(dvd.titles[0].chapters.len(), 4);
    }

    // -----------------------------------------------------------------------
    // Test 6: empty directory — must not panic.
    // -----------------------------------------------------------------------
    #[test]
    fn test_empty_dir_ok() {
        let tmp = TempDir::new().unwrap();
        let result = parse_video_ts_dir(tmp.path());
        assert!(result.is_ok(), "empty dir must not error");
        assert_eq!(result.unwrap().titles.len(), 0);
    }

    // -----------------------------------------------------------------------
    // Test 7: VMGI corrupt but VTS files present — synthesised title list.
    // -----------------------------------------------------------------------
    #[test]
    fn test_synthesised_titles_when_vmgi_corrupt() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path();

        // Corrupt VMGI (wrong magic, valid length).
        write_file(dir, "VIDEO_TS.IFO", &vec![0xFFu8; 4096]);
        write_file(dir, "VIDEO_TS.BUP", &vec![0xFFu8; 4096]);

        // One valid VTS with 2 PGCs.
        let vtsi = build_vtsi(
            &[(1, 3, 1800), (2, 2, 900)],
            &[(0, "en", 2)],
            &[],
        );
        write_file(dir, "VTS_01_0.IFO", &vtsi);

        let dvd = parse_video_ts_dir(dir).unwrap();
        // Should synthesise 2 titles from the 2 PGCs.
        assert_eq!(dvd.titles.len(), 2, "expected 2 synthesised titles");
        assert_eq!(dvd.titles[0].duration_secs, 1800);
        assert_eq!(dvd.titles[0].chapters.len(), 3);
        assert_eq!(dvd.titles[1].duration_secs, 900);
    }
}
