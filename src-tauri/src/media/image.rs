//! Image conversion helpers shared between `commands::library` (IPC) and
//! `library::promote` (internal pipeline). Extracted so `promote.rs` can call
//! them directly without going through Tauri IPC.

use std::path::Path;

// ── Format classification ────────────────────────────────────────────────────

/// Whether an extension is handled by the bundled `image` crate or needs an
/// external converter.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImageFormatClass {
    /// `image` crate can open this.
    Supported,
    /// Needs an external converter path (PCD, HEIC, RAW).
    SpecialFormat(SpecialFormat),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpecialFormat {
    Pcd,
    Heic,
    CameraRaw,
}

/// Classify a (lowercased) file extension.
pub fn classify_image_extension(ext: &str) -> ImageFormatClass {
    match ext {
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "tiff" | "tif" => {
            ImageFormatClass::Supported
        }
        "pcd" => ImageFormatClass::SpecialFormat(SpecialFormat::Pcd),
        "heic" | "heif" => ImageFormatClass::SpecialFormat(SpecialFormat::Heic),
        "cr2" | "cr3" | "nef" | "nrw" | "arw" | "srf" | "sr2" | "orf" | "rw2" | "pef"
        | "dng" | "raf" | "x3f" | "3fr" | "fff" | "mef" | "mos" | "mrw" | "ptx" | "raw"
        | "rwl" | "rwz" => ImageFormatClass::SpecialFormat(SpecialFormat::CameraRaw),
        _ => ImageFormatClass::SpecialFormat(SpecialFormat::CameraRaw),
    }
}

/// Human-readable reason + recommendation for an unsupported format. Used both
/// by the IPC command result and the promote pipeline for `converter_reason`.
pub fn special_format_reason(sf: SpecialFormat, ext: &str) -> (String, String) {
    match sf {
        SpecialFormat::Pcd => (
            "Kodak Photo CD (.pcd) has no maintained pure-Rust decoder. \
             An external converter (ImageMagick or pcdtojpeg) is required."
                .to_string(),
            "Bundle ImageMagick alongside the app and call: \
             magick convert input.pcd[2] output.jpg"
                .to_string(),
        ),
        SpecialFormat::Heic => (
            "HEIC/HEIF requires libheif (native library) which is not bundled. \
             ffmpeg with libde265 can convert HEIC on supported builds."
                .to_string(),
            "Run: ffmpeg -i input.heic output.jpg — if the bundled ffmpeg \
             was built with libde265 this will work. Otherwise use the heic \
             Rust crate (links libheif via bindgen)."
                .to_string(),
        ),
        SpecialFormat::CameraRaw => (
            format!(
                "Camera RAW format (.{ext}) is not decoded by the bundled \
                 image crate. A dedicated RAW developer is required."
            ),
            "Add the `rawloader` + `imagepipe` crates (pure Rust, clean \
             Windows build) for demosaic/tone-map, or shell out to \
             dcraw / rawtherapee-cli."
                .to_string(),
        ),
    }
}

// ── Standalone conversion helper ─────────────────────────────────────────────

/// Convert a source image to a JPEG and write it to `dst`.
///
/// Returns `Ok(())` on success. Returns `Err(reason)` when:
/// - the extension is a `SpecialFormat` (cannot convert here — `reason` is the
///   human-readable explanation)
/// - the image fails to decode or encode
///
/// `max_dim` caps the longest edge; pass `None` for full-resolution output.
///
/// This is the low-level workhorse called by `promote.rs` inside
/// `spawn_blocking`. The Tauri IPC command `convert_image_to_jpeg` in
/// `commands::library` wraps this with the `ConvertImageResult` enum.
pub fn convert_image_to_jpeg_path(
    src: &Path,
    dst: &Path,
    max_dim: Option<u32>,
) -> Result<(), String> {
    let ext = src
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    match classify_image_extension(&ext) {
        ImageFormatClass::SpecialFormat(sf) => {
            let (reason, _) = special_format_reason(sf, &ext);
            return Err(reason);
        }
        ImageFormatClass::Supported => {}
    }

    if let Some(parent) = dst.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("output dir create failed: {e}"))?;
    }

    let img = image::open(src)
        .map_err(|e| format!("decode failed for {}: {e}", src.display()))?;

    let img = match max_dim {
        Some(dim) if dim > 0 => img.thumbnail(dim, dim),
        _ => img,
    };

    let mut out = std::fs::File::create(dst)
        .map_err(|e| format!("create output file failed: {e}"))?;

    let mut enc = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 90);
    let rgb = img.to_rgb8();
    enc.encode(&rgb, rgb.width(), rgb.height(), image::ExtendedColorType::Rgb8)
        .map_err(|e| format!("JPEG encode failed: {e}"))?;

    Ok(())
}
