//! Generate a known-good UDF ISO image for testing Heirvo's Browse-ISO feature.
//!
//! Usage:
//!   cargo run --example make_test_iso -- C:\path\to\output.iso
//!
//! Produces a 2 MB UDF volume with this file layout:
//!
//!   /HELLO.TXT            (12 bytes  — "Hello, UDF!\n")
//!   /README.MD            (40 bytes  — short markdown)
//!   /PHOTOS/PIC.JPG       (256 bytes — dummy JPEG-like data)
//!   /docs/notes.txt       (16 bytes  — tests UTF-16 BE filename parsing)
//!
//! Open the resulting .iso in Heirvo (sidebar → Browse ISO) and you should
//! see exactly that file list. Cross-validate with `7z l <file>.iso` if you
//! want a second opinion.
//!
//! This generator uses the same byte layout the test suite validates, so if
//! the test suite passes and Heirvo shows a different list than what's below,
//! the bug is in either the IPC layer or the frontend — not the UDF parser.

use std::fs::File;
use std::io::Write;
use std::path::Path;

// ─── Constants from ECMA-167 / UDF 2.50 ───────────────────────────────────
const SECTOR: usize = 2048;

const TAG_AVDP: u16 = 2;
const TAG_PD: u16 = 5;
const TAG_LVD: u16 = 6;
const TAG_TERM: u16 = 8;
const TAG_FSD: u16 = 256;
const TAG_FID: u16 = 257;
const TAG_FE: u16 = 261;

// ─── Volume layout (absolute LBAs) ────────────────────────────────────────
const TOTAL_SECTORS: usize = 1024;
const AVDP_LBA: u32 = 256;
const VDS_LBA: u32 = 100;
const PARTITION_START: u32 = 32;

// Partition-relative LBAs:
const FSD_REL: u32 = 1;
const ROOT_FE_REL: u32 = 2;
const ROOT_DIR_CONTENT_REL: u32 = 3;
const HELLO_FE_REL: u32 = 4;
const HELLO_DATA_REL: u32 = 5;
const README_FE_REL: u32 = 6;
const README_DATA_REL: u32 = 7;
const PHOTOS_FE_REL: u32 = 8;
const PHOTOS_DIR_REL: u32 = 9;
const PIC_FE_REL: u32 = 10;
const PIC_DATA_REL: u32 = 11;
const DOCS_FE_REL: u32 = 12;
const DOCS_DIR_REL: u32 = 13;
const NOTES_FE_REL: u32 = 14;
const NOTES_DATA_REL: u32 = 15;

#[derive(Clone, Copy)]
enum AdKind { Short, Embedded }

struct FidSpec {
    name: String,
    name_utf16: bool,
    icb_lba: u32,
    is_dir: bool,
}

fn main() -> std::io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 2 {
        eprintln!("Usage: cargo run --example make_test_iso -- <output.iso>");
        std::process::exit(2);
    }
    let out_path = Path::new(&args[1]);

    // 1 KiB scratch volume, initially all zeros.
    let mut image = vec![0u8; TOTAL_SECTORS * SECTOR];

    // ── Volume Recognition Sequence (ECMA-167 §2.1.4) at sectors 16-18 ──
    //
    // Without VRS, mainstream tools (7-Zip, Linux mount, etc.) don't even
    // look for UDF structures past sector 16 — they assume the disc is plain
    // ISO 9660 only. Our parser doesn't require VRS because it goes straight
    // to the AVDP at LBA 256, but emitting VRS makes the ISO recognizable
    // to other software, which is what makes cross-validation possible.
    write_vrs_block(&mut image, 16, b"BEA01");
    write_vrs_block(&mut image, 17, b"NSR03"); // UDF 2.x uses NSR03
    write_vrs_block(&mut image, 18, b"TEA01");

    // ── AVDP @ LBA 256 → VDS @ 100, length = 3 sectors ──
    let mut avdp = vec![0u8; SECTOR];
    write_tag(&mut avdp, TAG_AVDP, AVDP_LBA);
    avdp[16..20].copy_from_slice(&((3u32 * SECTOR as u32).to_le_bytes()));
    avdp[20..24].copy_from_slice(&VDS_LBA.to_le_bytes());
    put_sector(&mut image, AVDP_LBA as usize, &avdp);

    // ── VDS: Partition Descriptor @ 100 ──
    let mut pd = vec![0u8; SECTOR];
    write_tag(&mut pd, TAG_PD, VDS_LBA);
    pd[22..24].copy_from_slice(&0u16.to_le_bytes()); // partition number
    pd[188..192].copy_from_slice(&PARTITION_START.to_le_bytes());
    pd[192..196].copy_from_slice(&100u32.to_le_bytes()); // length
    put_sector(&mut image, VDS_LBA as usize, &pd);

    // ── VDS: Logical Volume Descriptor @ 101 ──
    let mut lvd = vec![0u8; SECTOR];
    write_tag(&mut lvd, TAG_LVD, VDS_LBA + 1);
    write_dstring_8(&mut lvd[84..212], "HEIRVO_TEST");
    // FSD long_ad at bytes 248..264: length(4) lba(4) part_ref(2) impl_use(6)
    lvd[248..252].copy_from_slice(&(SECTOR as u32).to_le_bytes());
    lvd[252..256].copy_from_slice(&FSD_REL.to_le_bytes());
    lvd[256..258].copy_from_slice(&0u16.to_le_bytes());
    put_sector(&mut image, (VDS_LBA + 1) as usize, &lvd);

    // ── VDS: Terminating Descriptor @ 102 ──
    let mut term = vec![0u8; SECTOR];
    write_tag(&mut term, TAG_TERM, VDS_LBA + 2);
    put_sector(&mut image, (VDS_LBA + 2) as usize, &term);

    // ── FSD @ partition-rel 1 (= abs 33), Root Directory ICB long_ad @ 400..416 ──
    let mut fsd = vec![0u8; SECTOR];
    write_tag(&mut fsd, TAG_FSD, FSD_REL);
    fsd[400..404].copy_from_slice(&(SECTOR as u32).to_le_bytes());
    fsd[404..408].copy_from_slice(&ROOT_FE_REL.to_le_bytes());
    fsd[408..410].copy_from_slice(&0u16.to_le_bytes());
    put_sector(&mut image, (PARTITION_START + FSD_REL) as usize, &fsd);

    // ── Root directory FE @ rel 2 → content @ rel 3 ──
    put_sector(
        &mut image,
        (PARTITION_START + ROOT_FE_REL) as usize,
        &build_fe(ROOT_FE_REL, 4, SECTOR as u64, &[(SECTOR as u32, ROOT_DIR_CONTENT_REL)], None, AdKind::Short),
    );

    // ── Root directory content @ rel 3: HELLO.TXT, README.MD, PHOTOS, docs ──
    put_sector(
        &mut image,
        (PARTITION_START + ROOT_DIR_CONTENT_REL) as usize,
        &build_dir_content(ROOT_DIR_CONTENT_REL, &[
            FidSpec { name: "HELLO.TXT".into(), name_utf16: false, icb_lba: HELLO_FE_REL,  is_dir: false },
            FidSpec { name: "README.MD".into(), name_utf16: false, icb_lba: README_FE_REL, is_dir: false },
            FidSpec { name: "PHOTOS".into(),    name_utf16: false, icb_lba: PHOTOS_FE_REL, is_dir: true  },
            FidSpec { name: "docs".into(),      name_utf16: false, icb_lba: DOCS_FE_REL,   is_dir: true  },
        ]),
    );

    // ── HELLO.TXT FE + data ──
    let hello_data = b"Hello, UDF!\n";
    put_sector(
        &mut image,
        (PARTITION_START + HELLO_FE_REL) as usize,
        &build_fe(HELLO_FE_REL, 5, hello_data.len() as u64, &[(hello_data.len() as u32, HELLO_DATA_REL)], None, AdKind::Short),
    );
    put_data_sector(&mut image, (PARTITION_START + HELLO_DATA_REL) as usize, hello_data);

    // ── README.MD FE + data ──
    let readme_data = b"# Heirvo test ISO\n\nIf you can read this, the UDF parser works.\n";
    let readme_len = readme_data.len() as u32;
    put_sector(
        &mut image,
        (PARTITION_START + README_FE_REL) as usize,
        &build_fe(README_FE_REL, 5, readme_data.len() as u64, &[(readme_len, README_DATA_REL)], None, AdKind::Short),
    );
    put_data_sector(&mut image, (PARTITION_START + README_DATA_REL) as usize, readme_data);

    // ── PHOTOS subdirectory FE + content + PIC.JPG ──
    put_sector(
        &mut image,
        (PARTITION_START + PHOTOS_FE_REL) as usize,
        &build_fe(PHOTOS_FE_REL, 4, SECTOR as u64, &[(SECTOR as u32, PHOTOS_DIR_REL)], None, AdKind::Short),
    );
    put_sector(
        &mut image,
        (PARTITION_START + PHOTOS_DIR_REL) as usize,
        &build_dir_content(PHOTOS_DIR_REL, &[
            FidSpec { name: "PIC.JPG".into(), name_utf16: false, icb_lba: PIC_FE_REL, is_dir: false },
        ]),
    );
    // Dummy JPEG-shaped data: 0xFF 0xD8 0xFF + filler + 0xFF 0xD9 trailer
    let mut pic_data = vec![0u8; 256];
    pic_data[0..3].copy_from_slice(&[0xFF, 0xD8, 0xFF]);
    pic_data[254..256].copy_from_slice(&[0xFF, 0xD9]);
    put_sector(
        &mut image,
        (PARTITION_START + PIC_FE_REL) as usize,
        &build_fe(PIC_FE_REL, 5, pic_data.len() as u64, &[(pic_data.len() as u32, PIC_DATA_REL)], None, AdKind::Short),
    );
    put_data_sector(&mut image, (PARTITION_START + PIC_DATA_REL) as usize, &pic_data);

    // ── docs/ subdirectory with one UTF-16-named file ──
    put_sector(
        &mut image,
        (PARTITION_START + DOCS_FE_REL) as usize,
        &build_fe(DOCS_FE_REL, 4, SECTOR as u64, &[(SECTOR as u32, DOCS_DIR_REL)], None, AdKind::Short),
    );
    // The filename is "café-notes" — has a non-ASCII char to exercise UTF-16 BE parsing.
    put_sector(
        &mut image,
        (PARTITION_START + DOCS_DIR_REL) as usize,
        &build_dir_content(DOCS_DIR_REL, &[
            FidSpec { name: "café-notes".into(), name_utf16: true, icb_lba: NOTES_FE_REL, is_dir: false },
        ]),
    );
    let notes_data = b"non-ascii path";
    put_sector(
        &mut image,
        (PARTITION_START + NOTES_FE_REL) as usize,
        &build_fe(NOTES_FE_REL, 5, notes_data.len() as u64, &[(notes_data.len() as u32, NOTES_DATA_REL)], None, AdKind::Short),
    );
    put_data_sector(&mut image, (PARTITION_START + NOTES_DATA_REL) as usize, notes_data);

    // ── Write to disk ──
    let mut f = File::create(out_path)?;
    f.write_all(&image)?;
    f.sync_all()?;

    println!("Wrote {} bytes ({} sectors) to {}",
             image.len(), TOTAL_SECTORS, out_path.display());
    println!();
    println!("Expected file list when opened in Heirvo:");
    println!("  HELLO.TXT          12 bytes");
    println!("  README.MD          {} bytes", readme_data.len());
    println!("  PHOTOS/PIC.JPG     256 bytes");
    println!("  docs/café-notes    {} bytes", notes_data.len());
    println!();
    println!("Open it: Heirvo → sidebar → Browse ISO → Open ISO… → {}",
             out_path.display());

    Ok(())
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/// Write one 2048-byte Volume Recognition Structure (ECMA-167 §2.1.5):
///   byte 0   : Structure Type (= 0)
///   bytes 1..6: Standard Identifier ("BEA01", "NSR03", "TEA01", etc.)
///   byte 6   : Structure Version (= 1)
///   rest     : zeros
fn write_vrs_block(image: &mut [u8], lba: usize, identifier: &[u8; 5]) {
    let mut block = vec![0u8; SECTOR];
    block[0] = 0;
    block[1..6].copy_from_slice(identifier);
    block[6] = 1;
    put_sector(image, lba, &block);
}

fn put_sector(image: &mut [u8], lba: usize, sector: &[u8]) {
    let off = lba * SECTOR;
    image[off..off + sector.len().min(SECTOR)].copy_from_slice(&sector[..sector.len().min(SECTOR)]);
}

fn put_data_sector(image: &mut [u8], lba: usize, data: &[u8]) {
    let off = lba * SECTOR;
    image[off..off + data.len()].copy_from_slice(data);
}

/// Write a 16-byte ECMA-167 §7.2 Descriptor Tag at the start of `buf`,
/// self-anchored at `lba`, with checksum filled in.
fn write_tag(buf: &mut [u8], tag_id: u16, lba: u32) {
    buf[0..2].copy_from_slice(&tag_id.to_le_bytes());
    buf[2..4].copy_from_slice(&3u16.to_le_bytes()); // Descriptor Version
    // bytes 6..8 serial, 8..10 CRC, 10..12 CRC length all left zero
    buf[12..16].copy_from_slice(&lba.to_le_bytes());
    // Tag Checksum = (sum of bytes 0..4 and 5..16) mod 256
    let mut sum: u32 = 0;
    for &b in &buf[0..4] { sum = sum.wrapping_add(b as u32); }
    for &b in &buf[5..16] { sum = sum.wrapping_add(b as u32); }
    buf[4] = (sum & 0xFF) as u8;
}

/// Write an 8-bit OSTA-CS0 dstring into `field` (entire field length used).
/// Layout: [compression=8, chars..., zero-pad..., length_in_bytes].
fn write_dstring_8(field: &mut [u8], s: &str) {
    field.fill(0);
    field[0] = 8;
    let n = s.len().min(field.len() - 2);
    field[1..1 + n].copy_from_slice(&s.as_bytes()[..n]);
    let last = field.len() - 1;
    field[last] = (1 + n) as u8; // total used bytes including compression ID
}

fn build_fe(
    self_lba: u32,
    file_type: u8,
    info_len: u64,
    extents: &[(u32, u32)],
    inline_data: Option<&[u8]>,
    ad: AdKind,
) -> Vec<u8> {
    let mut fe = vec![0u8; SECTOR];
    write_tag(&mut fe, TAG_FE, self_lba);
    fe[27] = file_type;
    fe[20..22].copy_from_slice(&4u16.to_le_bytes()); // Strategy Type = 4 (direct)
    let ad_bits: u16 = match ad { AdKind::Short => 0, AdKind::Embedded => 3 };
    fe[34..36].copy_from_slice(&ad_bits.to_le_bytes()); // Flags low 3 bits = AD type
    fe[56..64].copy_from_slice(&info_len.to_le_bytes());
    fe[168..172].copy_from_slice(&0u32.to_le_bytes()); // L_EA = 0

    match (ad, inline_data) {
        (AdKind::Embedded, Some(bytes)) => {
            fe[172..176].copy_from_slice(&(bytes.len() as u32).to_le_bytes());
            fe[176..176 + bytes.len()].copy_from_slice(bytes);
        }
        (AdKind::Short, _) => {
            fe[172..176].copy_from_slice(&((extents.len() * 8) as u32).to_le_bytes());
            for (i, &(len, pos)) in extents.iter().enumerate() {
                let o = 176 + i * 8;
                fe[o..o + 4].copy_from_slice(&len.to_le_bytes());
                fe[o + 4..o + 8].copy_from_slice(&pos.to_le_bytes());
            }
        }
        (AdKind::Embedded, None) => panic!("Embedded requires inline_data"),
    }
    fe
}

fn build_dir_content(self_anchor: u32, fids: &[FidSpec]) -> Vec<u8> {
    let mut dir = vec![0u8; SECTOR];
    let mut off = 0usize;

    for fid in fids {
        let mut fi: Vec<u8> = Vec::new();
        if fid.name_utf16 {
            fi.push(16);
            for c in fid.name.encode_utf16() {
                fi.extend_from_slice(&c.to_be_bytes()); // OSTA-CS0 is big-endian
            }
        } else {
            fi.push(8);
            fi.extend_from_slice(fid.name.as_bytes());
        }
        let l_fi = fi.len();
        let raw_len = 38 + l_fi;
        let fid_len = (raw_len + 3) & !3;
        if off + fid_len > SECTOR {
            panic!("test ISO directory overflows one sector — add more sectors or fewer FIDs");
        }
        write_tag(&mut dir[off..off + 16], TAG_FID, self_anchor);
        dir[off + 16..off + 18].copy_from_slice(&1u16.to_le_bytes()); // version
        dir[off + 18] = if fid.is_dir { 0x02 } else { 0x00 };
        dir[off + 19] = l_fi as u8;
        // ICB long_ad: length(4) lba(4) part_ref(2) impl_use(6)
        dir[off + 20..off + 24].copy_from_slice(&(SECTOR as u32).to_le_bytes());
        dir[off + 24..off + 28].copy_from_slice(&fid.icb_lba.to_le_bytes());
        dir[off + 28..off + 30].copy_from_slice(&0u16.to_le_bytes());
        dir[off + 36..off + 38].copy_from_slice(&0u16.to_le_bytes()); // L_IU = 0
        dir[off + 38..off + 38 + l_fi].copy_from_slice(&fi);
        off += fid_len;
    }
    dir
}
