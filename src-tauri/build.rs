fn main() {
    tauri_build::build();

    // Tell Cargo to re-run this script when any of these env vars change.
    println!("cargo:rerun-if-env-changed=HEIRVO_LS_PRODUCT_ID");
    println!("cargo:rerun-if-env-changed=HEIRVO_LS_RECOVER_PRODUCT_ID");
    println!("cargo:rerun-if-env-changed=HEIRVO_LS_ARCHIVE_PRODUCT_ID");
    println!("cargo:rerun-if-env-changed=HEIRVO_LS_FAMILY_PRODUCT_ID");
    println!("cargo:rerun-if-env-changed=HEIRVO_LICENSE_HMAC_SECRET");
    println!("cargo:rerun-if-env-changed=HEIRVO_ALLOW_DEV_LICENSE");

    let any_product_set = std::env::var("HEIRVO_LS_PRODUCT_ID").is_ok()
        || std::env::var("HEIRVO_LS_RECOVER_PRODUCT_ID").is_ok()
        || std::env::var("HEIRVO_LS_ARCHIVE_PRODUCT_ID").is_ok()
        || std::env::var("HEIRVO_LS_FAMILY_PRODUCT_ID").is_ok();

    let hmac_secret_set = std::env::var("HEIRVO_LICENSE_HMAC_SECRET").is_ok();

    let allow_dev = std::env::var("HEIRVO_ALLOW_DEV_LICENSE")
        .map(|v| v == "1")
        .unwrap_or(false);

    // Detect release profile: Cargo sets PROFILE=release for `cargo build
    // --release` / `cargo tauri build`. It is absent (or "debug") for normal
    // debug builds, so the panic below never fires during day-to-day dev.
    let is_release = std::env::var("PROFILE")
        .map(|p| p == "release")
        .unwrap_or(false);

    if is_release {
        if !any_product_set && !allow_dev {
            // Hard gate: refuse to build a public release with the open stub.
            println!("cargo:warning=RELEASE BUILD BLOCKED: No HEIRVO_LS_*_PRODUCT_ID env vars are set.");
            println!("cargo:warning=A release build without product IDs uses the permissive dev stub");
            println!("cargo:warning=(any well-formed key grants Archive). This MUST NOT ship publicly.");
            println!("cargo:warning=");
            println!("cargo:warning=Options:");
            println!("cargo:warning=  1. Set HEIRVO_LS_RECOVER_PRODUCT_ID, HEIRVO_LS_ARCHIVE_PRODUCT_ID,");
            println!("cargo:warning=     HEIRVO_LS_FAMILY_PRODUCT_ID for a real production build.");
            println!("cargo:warning=  2. Set HEIRVO_ALLOW_DEV_LICENSE=1 for an intentional test/internal");
            println!("cargo:warning=     release build that you will NOT distribute publicly.");
            panic!(
                "refusing to build a public release with the permissive dev license stub; \
                 set HEIRVO_LS_*_PRODUCT_ID or pass HEIRVO_ALLOW_DEV_LICENSE=1 for an \
                 intentional test build"
            );
        }

        if !hmac_secret_set {
            // Non-fatal for release but very important — warn loudly.
            println!("cargo:warning=RELEASE BUILD WARNING: HEIRVO_LICENSE_HMAC_SECRET is not set.");
            println!("cargo:warning=The license HMAC will fall back to the compile-time DEV default.");
            println!("cargo:warning=Set HEIRVO_LICENSE_HMAC_SECRET to a strong random secret for");
            println!("cargo:warning=production builds so that license.json cannot be forged by");
            println!("cargo:warning=copying a compiled-in default constant from another build.");
        }

        if !any_product_set && allow_dev {
            println!("cargo:warning=INTENTIONAL DEV RELEASE: HEIRVO_ALLOW_DEV_LICENSE=1 is set.");
            println!("cargo:warning=This build uses the permissive dev license stub. Do NOT distribute.");
        }
    } else {
        // Debug / CI build — non-fatal warning only.
        if !any_product_set {
            println!(
                "cargo:warning=No HEIRVO_LS_*_PRODUCT_ID set — license validation will use the \
                 permissive DEV stub (any key grants Archive). \
                 Do NOT ship a public release built this way."
            );
        }
    }
}
