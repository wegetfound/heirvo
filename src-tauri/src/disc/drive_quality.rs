//! Drive quality database for the Recovery Plan briefing.
//!
//! Looks up a drive's INQUIRY vendor + model strings in a curated table of
//! ~56 optical drives compiled from r/datahoarder, doom9, MakeMKV forum,
//! AccurateRip community, and DiscImageCreator's known-good list.
//!
//! The point of this table: warn users *before* they spend hours scanning
//! that their drive is too weak for damaged-media recovery, and recommend
//! a category of replacement when appropriate. Heirvo is the only consumer
//! recovery tool that does this.

use crate::disc::drive::{DriveAssessment, DriveQuality};

struct DriveEntry {
    vendor_prefix: &'static str,
    model_prefix: &'static str,
    quality: DriveQuality,
    category: &'static str,
    notes: &'static str,
}

/// Curated drive quality table — DO NOT reorder; the matcher returns the
/// first entry whose vendor + model prefix match the INQUIRY response.
/// Order matters: longer / more-specific model prefixes go first so that
/// e.g. "DVDRAM GT80N" wins over a hypothetical "DVDRAM" catch-all.
const DRIVE_DATABASE: &[DriveEntry] = &[
    // ---- Pioneer Blu-ray (Pro/Good) ----
    DriveEntry { vendor_prefix: "PIONEER", model_prefix: "BDR-212", quality: DriveQuality::Pro, category: "Desktop SATA Blu-ray", notes: "Current-generation Pioneer flagship; excellent laser pickup, PureRead 4+ error recovery, and mature MMC firmware make this a top pick for damaged media." },
    DriveEntry { vendor_prefix: "PIONEER", model_prefix: "BDR-211", quality: DriveQuality::Pro, category: "Desktop SATA Blu-ray", notes: "Previous-gen Pioneer flagship with PureRead 3+; one of the strongest internal Blu-ray drives ever shipped for recovery work." },
    DriveEntry { vendor_prefix: "PIONEER", model_prefix: "BDR-209", quality: DriveQuality::Pro, category: "Desktop SATA Blu-ray", notes: "Workhorse Pioneer SATA Blu-ray burner; PureRead 2 error retry and solid pickup tolerance for scratched discs." },
    DriveEntry { vendor_prefix: "PIONEER", model_prefix: "BDR-208", quality: DriveQuality::Good, category: "Desktop SATA Blu-ray", notes: "Reliable older Pioneer SATA Blu-ray; good recovery behaviour but slower than the 209/211/212 lineage." },
    DriveEntry { vendor_prefix: "PIONEER", model_prefix: "BDR-S12", quality: DriveQuality::Pro, category: "Desktop SATA Blu-ray", notes: "Premium retail variant of the BDR-212; PureRead 4+ and Real-Time PureRead make this a top recovery drive." },
    DriveEntry { vendor_prefix: "PIONEER", model_prefix: "BDR-S09", quality: DriveQuality::Pro, category: "Desktop SATA Blu-ray", notes: "Premium retail variant of the BDR-209 with the same strong laser and mature firmware; excellent for recovery." },
    DriveEntry { vendor_prefix: "PIONEER", model_prefix: "BDR-XS08", quality: DriveQuality::Good, category: "External AC-powered", notes: "Newer external Pioneer Blu-ray with PureRead 4+; very capable when powered from the included adapter." },
    DriveEntry { vendor_prefix: "PIONEER", model_prefix: "BDR-XS07", quality: DriveQuality::Good, category: "External AC-powered", notes: "External Pioneer Blu-ray; reliable for recovery if AC adapter is used, but bus-powered USB mode can drop under load." },
    DriveEntry { vendor_prefix: "PIONEER", model_prefix: "BDR-XD07", quality: DriveQuality::Acceptable, category: "External slim USB", notes: "Slim USB Pioneer Blu-ray; competent for healthy discs but bus power limits sustained recovery on damaged media." },
    DriveEntry { vendor_prefix: "PIONEER", model_prefix: "DVR-221", quality: DriveQuality::Good, category: "Desktop SATA DVD", notes: "Late-model Pioneer DVD burner; solid pickup and well-regarded for CD/DVD recovery, no Blu-ray support." },
    DriveEntry { vendor_prefix: "PIONEER", model_prefix: "DVR-S21", quality: DriveQuality::Good, category: "Desktop SATA DVD", notes: "Premium DVD-only Pioneer; reliable read behaviour on scratched CDs and DVDs." },

    // ---- LG / HL-DT-ST ----
    DriveEntry { vendor_prefix: "HL-DT-ST", model_prefix: "WH16NS40", quality: DriveQuality::Pro, category: "Desktop SATA Blu-ray", notes: "LG WH16NS40 is a gold-standard MakeMKV/recovery drive; strong pickup and flashable firmware for UHD-friendly behaviour." },
    DriveEntry { vendor_prefix: "HL-DT-ST", model_prefix: "WH14NS40", quality: DriveQuality::Good, category: "Desktop SATA Blu-ray", notes: "Earlier sibling of the WH16NS40 with similar mechanism; very capable for Blu-ray and DVD recovery." },
    DriveEntry { vendor_prefix: "HL-DT-ST", model_prefix: "BH16NS55", quality: DriveQuality::Pro, category: "Desktop SATA Blu-ray", notes: "LG internal Blu-ray; popular MakeMKV ripper, strong laser and broad firmware support for damaged Blu-ray and DVD." },
    DriveEntry { vendor_prefix: "HL-DT-ST", model_prefix: "BH16NS40", quality: DriveQuality::Good, category: "Desktop SATA Blu-ray", notes: "Older LG internal Blu-ray burner; reliable for healthy discs and acceptable on light damage." },
    DriveEntry { vendor_prefix: "HL-DT-ST", model_prefix: "GH24NSD1", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Common LG SATA DVD burner; fine for healthy discs but limited error-recovery features versus Pioneer/Plextor." },
    DriveEntry { vendor_prefix: "HL-DT-ST", model_prefix: "GH24NSC0", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Budget LG internal DVD burner; reliable for everyday discs, not ideal for heavily damaged media." },
    DriveEntry { vendor_prefix: "HL-DT-ST", model_prefix: "DVDRAM GT80N", quality: DriveQuality::Marginal, category: "External slim USB", notes: "Bus-powered USB slim drive; prone to disconnects on damaged media under sustained load. Recovery may fail or stall." },
    DriveEntry { vendor_prefix: "HL-DT-ST", model_prefix: "DVDRAM GT90N", quality: DriveQuality::Marginal, category: "External slim USB", notes: "Slim laptop-replacement mechanism; bus-powered USB enclosure makes sustained recovery on damaged discs unreliable." },
    DriveEntry { vendor_prefix: "HL-DT-ST", model_prefix: "DVDRAM GT50N", quality: DriveQuality::Marginal, category: "External slim USB", notes: "Older slim LG mechanism; weak pickup compared to half-height desktop drives, struggles with damaged media." },
    DriveEntry { vendor_prefix: "HL-DT-ST", model_prefix: "DVDRAM GP", quality: DriveQuality::Marginal, category: "External slim USB", notes: "LG GP-series slim external; bus-powered, fine for healthy discs but unreliable on damaged or marginal media." },

    // ---- ASUS ----
    DriveEntry { vendor_prefix: "ASUS", model_prefix: "BW-16D1HT", quality: DriveQuality::Pro, category: "Desktop SATA Blu-ray", notes: "ASUS rebadge of the LG WH16NS40 mechanism; popular MakeMKV pick and very strong for Blu-ray recovery." },
    DriveEntry { vendor_prefix: "ASUS", model_prefix: "BW-16D1H-U", quality: DriveQuality::Good, category: "External AC-powered", notes: "External ASUS Blu-ray with AC adapter; same strong mechanism as BW-16D1HT, reliable when not bus-powered." },
    DriveEntry { vendor_prefix: "ASUS", model_prefix: "BC-12D2HT", quality: DriveQuality::Good, category: "Desktop SATA Blu-ray", notes: "Internal Blu-ray combo (reader + DVD writer); solid for ripping and recovery on Blu-ray and DVD." },
    DriveEntry { vendor_prefix: "ASUS", model_prefix: "DRW-24D5MT", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Mainstream ASUS DVD burner; fine for healthy CDs/DVDs but limited error-recovery firmware." },
    DriveEntry { vendor_prefix: "ASUS", model_prefix: "DRW-24B1ST", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Older ASUS internal DVD writer; reliable on healthy media, not a strong recovery candidate." },
    DriveEntry { vendor_prefix: "ASUS", model_prefix: "SBW-06D2X-U", quality: DriveQuality::Acceptable, category: "External slim USB", notes: "Slim external ASUS Blu-ray writer; bus-powered, OK on healthy discs but stalls on heavy damage." },
    DriveEntry { vendor_prefix: "ASUS", model_prefix: "SDRW-08D2S-U", quality: DriveQuality::Marginal, category: "External slim USB", notes: "Slim USB DVD writer; bus power and weak laser limit performance on damaged discs." },

    // ---- Plextor (legacy gold-standard) ----
    DriveEntry { vendor_prefix: "PLEXTOR", model_prefix: "PX-891SAF", quality: DriveQuality::Pro, category: "Desktop SATA DVD", notes: "Last-generation Plextor DVD burner; excellent C2 error handling and a long-standing favourite for audio CD and DVD recovery." },
    DriveEntry { vendor_prefix: "PLEXTOR", model_prefix: "PX-891SA", quality: DriveQuality::Pro, category: "Desktop SATA DVD", notes: "Plextor SATA DVD writer; strong pickup and reliable MMC support, now a collector item." },
    DriveEntry { vendor_prefix: "PLEXTOR", model_prefix: "PX-755", quality: DriveQuality::Pro, category: "Desktop SATA DVD", notes: "Classic Plextor Premium-era DVD drive; legendary in AccurateRip circles for clean reads of damaged CDs." },
    DriveEntry { vendor_prefix: "PLEXTOR", model_prefix: "PX-760", quality: DriveQuality::Pro, category: "Desktop SATA DVD", notes: "Final true-Plextor-mechanism DVD drive; superb error recovery, prized for audio CD ripping." },
    DriveEntry { vendor_prefix: "PLEXTOR", model_prefix: "PREMIUM", quality: DriveQuality::Pro, category: "Desktop SATA DVD", notes: "Plextor Premium CD-RW; the AccurateRip gold standard for audio CD recovery — collector hardware, increasingly rare." },

    // ---- Lite-On ----
    DriveEntry { vendor_prefix: "LITE-ON", model_prefix: "IHBS112", quality: DriveQuality::Good, category: "Desktop SATA Blu-ray", notes: "Lite-On internal Blu-ray burner; competent for Blu-ray recovery, popular with MakeMKV users on a budget." },
    DriveEntry { vendor_prefix: "LITE-ON", model_prefix: "IHAS124", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Common Lite-On SATA DVD burner; reliable for healthy discs and modest damage, no advanced recovery firmware." },
    DriveEntry { vendor_prefix: "LITE-ON", model_prefix: "IHAS324", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Lite-On internal DVD writer; serviceable for everyday recovery, weaker pickup than Pioneer/Plextor." },
    DriveEntry { vendor_prefix: "LITE-ON", model_prefix: "EBAU108", quality: DriveQuality::Marginal, category: "External slim USB", notes: "Slim USB Lite-On DVD writer; bus-powered, prone to drop-outs on sustained recovery scans." },
    DriveEntry { vendor_prefix: "LITE-ON", model_prefix: "DH-", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Lite-On DH-series internal DVD reader/writer; fine for healthy media, limited error-recovery behaviour." },

    // ---- Buffalo (often AC-powered, Pioneer/Panasonic internals) ----
    DriveEntry { vendor_prefix: "BUFFALO", model_prefix: "BRXL-PC6VU2", quality: DriveQuality::Good, category: "External AC-powered", notes: "Buffalo external Blu-ray with AC adapter; uses solid Pioneer/Panasonic mechanism, reliable for recovery." },
    DriveEntry { vendor_prefix: "BUFFALO", model_prefix: "BRXL-PT6U2V", quality: DriveQuality::Acceptable, category: "External slim USB", notes: "Slim Buffalo external Blu-ray; bus-powered, capable on healthy discs but limited on damaged media." },
    DriveEntry { vendor_prefix: "BUFFALO", model_prefix: "BRXL-16U3", quality: DriveQuality::Good, category: "External AC-powered", notes: "AC-powered Buffalo Blu-ray writer; uses Pioneer-derived mechanism, well-suited to recovery work." },
    DriveEntry { vendor_prefix: "BUFFALO", model_prefix: "BRUHD-PU3", quality: DriveQuality::Good, category: "External AC-powered", notes: "Buffalo UHD-friendly external Blu-ray; AC-powered with Pioneer internals, reliable for recovery." },

    // ---- Samsung / TSSTcorp / Optiarc / Sony / BenQ ----
    DriveEntry { vendor_prefix: "SAMSUNG", model_prefix: "SH-224", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Mainstream Samsung internal DVD writer; reliable for healthy discs, modest performance on damaged media." },
    DriveEntry { vendor_prefix: "TSSTCORP", model_prefix: "SH-224", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Samsung/Toshiba TSSTcorp DVD writer; same mechanism as SH-224 retail, fine for general recovery." },
    DriveEntry { vendor_prefix: "TSSTCORP", model_prefix: "SE-208", quality: DriveQuality::Marginal, category: "External slim USB", notes: "Slim USB Samsung-branded DVD writer; bus-powered, struggles with sustained recovery on damaged discs." },
    DriveEntry { vendor_prefix: "OPTIARC", model_prefix: "AD-7260S", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Sony NEC Optiarc internal DVD writer; reliable on healthy CDs/DVDs, weaker than premium recovery drives." },
    DriveEntry { vendor_prefix: "OPTIARC", model_prefix: "AD-7280S", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Later Optiarc internal DVD writer; decent everyday performance, no advanced error-recovery firmware." },
    DriveEntry { vendor_prefix: "SONY", model_prefix: "BWU-500S", quality: DriveQuality::Good, category: "Desktop SATA Blu-ray", notes: "Sony internal Blu-ray writer; reliable mechanism, well regarded for Blu-ray recovery in its era." },
    DriveEntry { vendor_prefix: "BENQ", model_prefix: "DW1640", quality: DriveQuality::Good, category: "Desktop SATA DVD", notes: "Classic BenQ DVD writer with Solid Burn/WOPC; strong reader for damaged DVDs, popular legacy recovery drive." },
    DriveEntry { vendor_prefix: "BENQ", model_prefix: "DW1650", quality: DriveQuality::Good, category: "Desktop SATA DVD", notes: "BenQ successor to the DW1640; similar strong read behaviour on scratched DVDs." },
    DriveEntry { vendor_prefix: "BENQ", model_prefix: "DW2000", quality: DriveQuality::Acceptable, category: "Desktop SATA DVD", notes: "Late BenQ DVD writer; capable on healthy discs, less revered than the DW1640/1650 for recovery." },

    // ---- Server / OEM ----
    DriveEntry { vendor_prefix: "HITACHI", model_prefix: "DVD-ROM GDR", quality: DriveQuality::Acceptable, category: "Server", notes: "Hitachi-LG server DVD-ROM mechanism; stable for healthy media, no Blu-ray and limited error-recovery firmware." },
    DriveEntry { vendor_prefix: "HITACHI", model_prefix: "GD-", quality: DriveQuality::Acceptable, category: "Server", notes: "Hitachi GD-series server/desktop optical drive; reliable on healthy media, limited advanced recovery features." },
    DriveEntry { vendor_prefix: "IBM", model_prefix: "DROM", quality: DriveQuality::Acceptable, category: "Server", notes: "IBM-branded server DVD-ROM (Hitachi/LG OEM); reliable read-only behaviour for archival recovery of healthy discs." },

    // ---- Generic / Avoid ----
    DriveEntry { vendor_prefix: "MATSHITA", model_prefix: "UJ8", quality: DriveQuality::Marginal, category: "External slim USB", notes: "Panasonic/Matshita UJ8-series slim laptop drive; bus-powered when external, weak pickup for damaged media." },
    DriveEntry { vendor_prefix: "GENERIC", model_prefix: "USB2.0 CD", quality: DriveQuality::Avoid, category: "External slim USB", notes: "Unbranded USB-ATAPI slim drive; bridge chip often drops MMC commands silently, making recovery unreliable." },
];

/// Look up a drive by its INQUIRY vendor + model. Case-insensitive prefix match.
/// Returns `Unknown` if the drive isn't in our database — that's neutral, not
/// negative (we just have no data on this specific model).
pub fn assess_drive(vendor: &str, model: &str) -> DriveAssessment {
    let v = vendor.trim().to_uppercase();
    let m = model.trim().to_uppercase();
    for e in DRIVE_DATABASE {
        if v.starts_with(e.vendor_prefix) && m.starts_with(e.model_prefix) {
            return DriveAssessment {
                quality: e.quality,
                category: e.category.to_string(),
                notes: e.notes.to_string(),
            };
        }
    }
    DriveAssessment {
        quality: DriveQuality::Unknown,
        category: "Unknown".to_string(),
        notes: format!(
            "We don't have quality data for this drive ({} {}). Recovery should work — let us know how it goes.",
            vendor.trim(), model.trim()
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_user_test_drive() {
        let a = assess_drive("HL-DT-ST", "DVDRAM GT80N");
        assert_eq!(a.quality, DriveQuality::Marginal);
        assert!(a.notes.contains("disconnect"));
    }

    #[test]
    fn matches_case_insensitively() {
        let a = assess_drive("pioneer", "bdr-212ubk");
        assert_eq!(a.quality, DriveQuality::Pro);
    }

    #[test]
    fn unknown_drive_returns_unknown_not_panic() {
        let a = assess_drive("XYZCORP", "MODEL-9999");
        assert_eq!(a.quality, DriveQuality::Unknown);
    }
}
