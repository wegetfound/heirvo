//! Walk a local .iso file with Heirvo's UDF parser and print every file.
//!
//! Same parser used by the Browse-ISO Tauri command, but command-line.
//! Lets us cross-validate the parser against `7z l` without involving the UI.
//!
//! Usage:
//!   cargo run --release --example walk_iso -- <path-to.iso>
//!
//! Output is one line per file: `<size>\t<path>` — easy to diff against 7z.

use std::path::Path;

fn main() -> std::io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 2 {
        eprintln!("Usage: cargo run --release --example walk_iso -- <path-to.iso>");
        std::process::exit(2);
    }
    let path = Path::new(&args[1]);
    if !path.exists() {
        eprintln!("Not found: {}", path.display());
        std::process::exit(1);
    }

    let reader = heirvo_lib::disc::iso_file::IsoFileSectorReader::open(path)?;
    use heirvo_lib::disc::sector::SectorReader;
    let capacity = reader.capacity();
    let size_mb = (capacity * 2048) as f64 / 1024.0 / 1024.0;
    eprintln!("walk_iso: opened {} ({:.1} MB, {} sectors)",
              path.display(), size_mb, capacity);

    // Try UDF first; fall back to ISO 9660. Same logic as the Tauri command.
    match heirvo_lib::dvd::udf::walk_udf(&reader) {
        Ok(vol) => {
            eprintln!("walk_iso: UDF ok — label={:?}, entries={}, damaged_sectors={}",
                      vol.label, vol.entries.len(), vol.unreadable_sectors.len());
            let mut files: Vec<_> = vol.entries.into_iter().filter(|e| !e.is_dir).collect();
            files.sort_by(|a, b| a.path.cmp(&b.path));
            println!("# parser=UDF label={:?} files={}", vol.label, files.len());
            for e in &files {
                println!("{}\t{}", e.size_bytes, e.path);
            }
            eprintln!("walk_iso: printed {} files", files.len());
        }
        Err(udf_err) => {
            eprintln!("walk_iso: UDF failed ({udf_err}); trying ISO 9660");
            match heirvo_lib::dvd::iso9660::walk_all_files(&reader) {
                Ok(entries) => {
                    let mut files: Vec<_> = entries.into_iter().filter(|e| !e.is_dir).collect();
                    files.sort_by(|a, b| a.name.cmp(&b.name));
                    println!("# parser=ISO9660 files={}", files.len());
                    for e in &files {
                        println!("{}\t{}", e.size_bytes, e.name);
                    }
                    eprintln!("walk_iso: ISO 9660 ok, printed {} files", files.len());
                }
                Err(iso_err) => {
                    eprintln!("walk_iso: ISO 9660 also failed ({iso_err})");
                    std::process::exit(3);
                }
            }
        }
    }
    Ok(())
}
