fn main() {
    tauri_build::build();

    // H3 — Warn at build time when no production license product IDs are set.
    // The absence of ALL four vars means the runtime falls back to the permissive
    // DEV stub (any well-formed key grants Archive). This must NOT ship publicly.
    let any_set = std::env::var("HEIRVO_LS_PRODUCT_ID").is_ok()
        || std::env::var("HEIRVO_LS_RECOVER_PRODUCT_ID").is_ok()
        || std::env::var("HEIRVO_LS_ARCHIVE_PRODUCT_ID").is_ok()
        || std::env::var("HEIRVO_LS_FAMILY_PRODUCT_ID").is_ok();
    if !any_set {
        println!(
            "cargo:warning=No HEIRVO_LS_*_PRODUCT_ID set — license validation will use the \
             permissive DEV stub (any key grants Archive). \
             Do NOT ship a public release built this way."
        );
    }
}
