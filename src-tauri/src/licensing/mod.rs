//! License management for the freemium tier.
//!
//! v2 model (2026-05-18):
//! - **Free**     — full recovery (sector reads, sector map, disc health, preview).
//! - **Recover**  ($59) — unlocks Save (MP4, ISO, chapter extract, all-files).
//! - **Archive**  ($99) — Recover features + import personal media into vault.
//! - **Family**   ($149) — Archive features + (future) multi-user library sync.
//!
//! Backward compatibility:
//! - The legacy `Pro` variant remains and is treated as equivalent to **Archive**
//!   so existing keys on disk and existing call-sites that check `plan == Pro`
//!   continue to work without migration.
//!
//! Validation strategy:
//! - If a tier-specific `HEIRVO_LS_<TIER>_PRODUCT_ID` is set at compile time,
//!   `validate_online` calls Lemon Squeezy and matches the key against each
//!   configured product id, returning the matching tier.
//! - The legacy `HEIRVO_LS_PRODUCT_ID` is honored as the **Recover** product id
//!   when no tier-specific override is set (so existing prod builds keep working).
//! - In dev / CI builds with no product ids configured, `validate_key` accepts
//!   any well-formed key and grants **Archive** so all features unlock.
//!
//! No phone-home for free users — privacy-preserving by default.

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

/// Legacy single-product env var — treated as the Recover tier product id.
const LS_PRODUCT_ID: Option<&str> = option_env!("HEIRVO_LS_PRODUCT_ID");
/// Tier-specific product ids, set at compile time for production builds:
///   HEIRVO_LS_RECOVER_PRODUCT_ID=… HEIRVO_LS_ARCHIVE_PRODUCT_ID=… HEIRVO_LS_FAMILY_PRODUCT_ID=… cargo tauri build
const LS_RECOVER_PRODUCT_ID: Option<&str> = option_env!("HEIRVO_LS_RECOVER_PRODUCT_ID");
const LS_ARCHIVE_PRODUCT_ID: Option<&str> = option_env!("HEIRVO_LS_ARCHIVE_PRODUCT_ID");
const LS_FAMILY_PRODUCT_ID:  Option<&str> = option_env!("HEIRVO_LS_FAMILY_PRODUCT_ID");
const LS_VALIDATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/validate";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Plan {
    Free,
    /// Recover tier — Save features.
    Recover,
    /// Archive tier — Recover + personal media vault import.
    Archive,
    /// Family tier — Archive + (future) multi-user library sync.
    Family,
    /// Legacy alias for Archive. Existing call-sites comparing `plan == Pro`
    /// will see the variant unchanged; new code should use `is_paid()` /
    /// `can_save()` / `can_import_media()`.
    Pro,
}

impl Plan {
    /// Any paid tier (Recover / Archive / Family / legacy Pro).
    pub fn is_paid(self) -> bool {
        !matches!(self, Plan::Free)
    }

    /// Tiers that may import personal media files into the vault.
    /// Archive, Family, and the legacy Pro alias only.
    pub fn can_import_media(self) -> bool {
        matches!(self, Plan::Archive | Plan::Family | Plan::Pro)
    }

    /// Human-readable name for UI and logs.
    pub fn display_name(self) -> &'static str {
        match self {
            Plan::Free => "Free",
            Plan::Recover => "Recover",
            Plan::Archive => "Archive",
            Plan::Family => "Family",
            Plan::Pro => "Pro",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct LicenseStatus {
    pub plan: Plan,
    /// Email or short id of the buyer, if any.
    pub holder: Option<String>,
    /// Whether the SAVE features are unlocked.
    pub can_save: bool,
    /// Whether personal-media import into the vault is unlocked (Archive/Family).
    pub can_import_media: bool,
    /// How many MP4 exports this device has made (free tier gets 1 lifetime).
    pub exports_used: u32,
}

impl Default for LicenseStatus {
    fn default() -> Self {
        Self {
            plan: Plan::Free,
            holder: None,
            can_save: true, // Free tier: 1 lifetime export (gate enforced via exports_used)
            can_import_media: false,
            exports_used: 0,
        }
    }
}

// ─── Lemon Squeezy response shapes ───────────────────────────────────────────

#[derive(Deserialize)]
struct LsValidateResp {
    valid: bool,
    license_key: LsLicenseKey,
    meta: LsMeta,
}

#[derive(Deserialize)]
struct LsLicenseKey {
    status: String, // "active" | "inactive" | "expired" | "disabled"
}

#[derive(Deserialize)]
struct LsMeta {
    customer_email: Option<String>,
    product_id: u64,
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

static CACHE: Mutex<Option<LicenseStatus>> = Mutex::new(None);

fn license_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("license.key")
}

// ─── Validation ───────────────────────────────────────────────────────────────

// ─── Export counter (free tier: 1 lifetime MP4 export) ───────────────────────

fn exports_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("exports.count")
}

pub fn get_exports_used(app_data_dir: &PathBuf) -> u32 {
    std::fs::read_to_string(exports_path(app_data_dir))
        .ok()
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0)
}

/// Called after every successful MP4 export. Increments the on-disk counter
/// and invalidates the in-memory cache so the next status read is fresh.
pub fn record_export(app_data_dir: &PathBuf) {
    let count = get_exports_used(app_data_dir) + 1;
    let _ = std::fs::create_dir_all(app_data_dir);
    let _ = std::fs::write(exports_path(app_data_dir), count.to_string());
    *CACHE.lock().unwrap() = None;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/// Dev-mode stub: accepts any non-empty key with at least one `-` and ≥8 chars.
/// Used when no `HEIRVO_LS_*_PRODUCT_ID` is set at build time.
///
/// Tier inference for dev keys:
///   prefix `RECOVER-…`  → Recover
///   prefix `FAMILY-…`   → Family
///   anything else       → Archive (default — unlocks import for dev/testing)
pub fn validate_key(key: &str) -> Option<LicenseStatus> {
    let trimmed = key.trim();
    if trimmed.len() < 8 || !trimmed.contains('-') {
        return None;
    }
    let upper = trimmed.to_ascii_uppercase();
    let plan = if upper.starts_with("RECOVER-") {
        Plan::Recover
    } else if upper.starts_with("FAMILY-") {
        Plan::Family
    } else {
        Plan::Archive
    };
    Some(LicenseStatus {
        plan,
        holder: Some(trimmed.split('-').next().unwrap_or("").to_string()),
        can_save: true,
        can_import_media: plan.can_import_media(),
        exports_used: 0,
    })
}

/// Resolve a Lemon Squeezy product id to a tier.
/// Honors tier-specific env vars first, then falls back to the legacy
/// `HEIRVO_LS_PRODUCT_ID` (interpreted as Recover).
fn tier_for_product_id(product_id: u64) -> Option<Plan> {
    let parse = |opt: Option<&str>| -> Option<u64> { opt.and_then(|s| s.parse().ok()) };
    if Some(product_id) == parse(LS_RECOVER_PRODUCT_ID) {
        return Some(Plan::Recover);
    }
    if Some(product_id) == parse(LS_ARCHIVE_PRODUCT_ID) {
        return Some(Plan::Archive);
    }
    if Some(product_id) == parse(LS_FAMILY_PRODUCT_ID) {
        return Some(Plan::Family);
    }
    // Legacy single-product builds: treat as Recover.
    if Some(product_id) == parse(LS_PRODUCT_ID) {
        return Some(Plan::Recover);
    }
    None
}

/// Returns true if any production product id is configured at compile time.
fn any_product_configured() -> bool {
    LS_PRODUCT_ID.is_some()
        || LS_RECOVER_PRODUCT_ID.is_some()
        || LS_ARCHIVE_PRODUCT_ID.is_some()
        || LS_FAMILY_PRODUCT_ID.is_some()
}

/// Production validation via Lemon Squeezy.
/// Falls back to `validate_key` if `HEIRVO_LS_PRODUCT_ID` is not compiled in.
pub async fn validate_online(key: &str) -> Option<LicenseStatus> {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return None;
    }

    if !any_product_configured() {
        // Dev / CI build — use format check only.
        return validate_key(trimmed);
    }

    // Bounded HTTP client — never let a slow/hostile network hang license
    // validation indefinitely. 15s is generous for a single POST.
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .connect_timeout(std::time::Duration::from_secs(5))
        .build()
        .ok()?;

    let resp = client
        .post(LS_VALIDATE_URL)
        .header("Accept", "application/json")
        .form(&[("license_key", trimmed)])
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let v: LsValidateResp = resp.json().await.ok()?;

    if !v.valid || v.license_key.status != "active" {
        return None;
    }
    let plan = tier_for_product_id(v.meta.product_id)?;

    Some(LicenseStatus {
        plan,
        holder: v.meta.customer_email,
        can_save: true,
        can_import_media: plan.can_import_media(),
        exports_used: 0,
    })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/// Read the on-disk license, if present, and cache the result.
/// Uses format-only validation on load (no network call on every launch).
pub fn current(app_data_dir: &PathBuf) -> LicenseStatus {
    if let Some(c) = CACHE.lock().unwrap().clone() {
        return c;
    }
    let p = license_path(app_data_dir);
    let base = match std::fs::read_to_string(&p) {
        Ok(key) => validate_key(&key).unwrap_or_default(),
        Err(_) => LicenseStatus::default(),
    };
    let exports_used = get_exports_used(app_data_dir);
    let status = LicenseStatus {
        exports_used,
        // Any paid tier always saves; free users get exactly 1 lifetime export.
        can_save: base.plan.is_paid() || exports_used == 0,
        // Only Archive/Family/Pro may import personal media.
        can_import_media: base.plan.can_import_media(),
        ..base
    };
    *CACHE.lock().unwrap() = Some(status.clone());
    status
}

/// Apply a new license key — validates online (LS in prod, format-only in dev),
/// persists to disk, and returns the new status. Errors if the key is invalid.
pub async fn activate(app_data_dir: &PathBuf, key: &str) -> AppResult<LicenseStatus> {
    let status = validate_online(key)
        .await
        .ok_or_else(|| AppError::Internal("Invalid license key".into()))?;
    std::fs::create_dir_all(app_data_dir).ok();
    std::fs::write(license_path(app_data_dir), key.trim())?;
    *CACHE.lock().unwrap() = Some(status.clone());
    Ok(status)
}

/// Remove the license (sign-out / refund). Returns the new (Free) status.
pub fn deactivate(app_data_dir: &PathBuf) -> LicenseStatus {
    let _ = std::fs::remove_file(license_path(app_data_dir));
    *CACHE.lock().unwrap() = None;
    current(app_data_dir)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::{Mutex as StdMutex, MutexGuard};

    static SEQ: AtomicU64 = AtomicU64::new(0);
    static TEST_LOCK: StdMutex<()> = StdMutex::new(());

    fn tmp_dir() -> PathBuf {
        let seq = SEQ.fetch_add(1, Ordering::SeqCst);
        let p = env::temp_dir()
            .join(format!("heirvo-lic-test-{}-{}", std::process::id(), seq));
        std::fs::create_dir_all(&p).ok();
        p
    }

    fn lock() -> MutexGuard<'static, ()> {
        TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner())
    }

    #[test]
    fn empty_key_is_rejected() {
        assert!(validate_key("").is_none());
        assert!(validate_key("   ").is_none());
    }

    #[test]
    fn short_key_is_rejected() {
        assert!(validate_key("AB-CD").is_none());
    }

    #[test]
    fn key_without_dash_is_rejected() {
        assert!(validate_key("ABCDEFGH12345").is_none());
    }

    #[test]
    fn well_formed_key_is_accepted_in_dev() {
        // Default tier for an unprefixed dev key is Archive (unlocks import).
        let s = validate_key("HEIRVO-PRO-1234").expect("should accept dev key");
        assert_eq!(s.plan, Plan::Archive);
        assert!(s.can_save);
        assert!(s.can_import_media);
        assert_eq!(s.holder.as_deref(), Some("HEIRVO"));
    }

    #[test]
    fn recover_prefix_dev_key_grants_recover_only() {
        let s = validate_key("RECOVER-DEV-1234").expect("should accept");
        assert_eq!(s.plan, Plan::Recover);
        assert!(s.can_save);
        assert!(!s.can_import_media, "Recover tier must not allow media import");
    }

    #[test]
    fn family_prefix_dev_key_grants_family() {
        let s = validate_key("FAMILY-DEV-1234").expect("should accept");
        assert_eq!(s.plan, Plan::Family);
        assert!(s.can_import_media);
    }

    #[test]
    fn free_plan_cannot_import() {
        assert!(!Plan::Free.can_import_media());
        assert!(!Plan::Recover.can_import_media());
        assert!(Plan::Archive.can_import_media());
        assert!(Plan::Family.can_import_media());
        assert!(Plan::Pro.can_import_media(), "legacy Pro alias must keep import");
    }

    #[tokio::test]
    async fn activate_persists_and_round_trips() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;
        let s = activate(&dir, "TEST-KEY-1234").await.expect("activate ok");
        assert!(s.can_save);

        *CACHE.lock().unwrap() = None;
        let reloaded = current(&dir);
        assert!(reloaded.can_save);
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn deactivate_clears_status() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;
        // Use a temporary runtime for the async activate
        tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(activate(&dir, "X-Y-Z-1234"))
            .ok();
        let s = deactivate(&dir);
        assert_eq!(s.plan, Plan::Free);
        // After deactivate, plan is Free. can_save remains true because the
        // free tier gets exactly 1 lifetime export and exports_used = 0 here.
        // The real gate is `can_import_media`, which must be off on Free.
        assert!(!s.can_import_media, "Free tier must not allow media import after deactivate");
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn missing_license_returns_free() {
        let _g = lock();
        let dir = tmp_dir().join("never-existed");
        *CACHE.lock().unwrap() = None;
        let s = current(&dir);
        assert_eq!(s.plan, Plan::Free);
    }
}
