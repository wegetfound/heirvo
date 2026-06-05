//! License management for the freemium tier.
//!
//! v3 model (2026-06-04):
//! - **Free**     — full recovery (sector reads, sector map, disc health, preview).
//! - **Recover**  ($59) — unlocks Save (MP4, ISO, chapter extract, all-files).
//! - **Archive**  ($99) — Recover features + import personal media into vault.
//! - **Family**   ($149) — Archive features + (future) multi-user library sync.
//!
//! ## Security model
//!
//! The on-disk license record (`license.json`) is an HMAC-SHA256-signed JSON
//! envelope.  `current()` verifies the HMAC before trusting ANY field.  A
//! tampered or hand-edited file is treated as if no license exists (Free).
//!
//! The HMAC signing key is `HEIRVO_LICENSE_HMAC_SECRET` compiled in at build
//! time via `option_env!`.  In dev builds with the env var unset, a hardcoded
//! dev-only default is used — clearly distinct from the production secret.
//!
//! ## Offline grace
//!
//! `current()` is synchronous and fast: it reads and verifies `license.json`,
//! then applies a trust decision based on `last_validated_unix`:
//!   - ≤ 14 days since last validation → Trusted (serve from cache).
//!   - ≤ 30 days → NeedsRevalidation (serve plan but schedule background refresh).
//!   - > 30 days → Expired (downgrade to Free; set `needs_reconnect`).
//!
//! Background refresh (`spawn_background_refresh`) calls Lemon Squeezy, updates
//! `last_validated_unix`, re-signs `license.json`, refreshes `CACHE`, and emits
//! `license:updated`.  Network failure is non-fatal; offline grace covers it.
//!
//! ## Backward compatibility
//!
//! - The legacy `Pro` variant remains (≡ Archive) for existing call-sites.
//! - `LicenseStatus` gains only one new field (`needs_reconnect: bool`) which
//!   defaults to `false` — no breaking change for the frontend.
//! - The old plaintext `license.key` is migrated only when product IDs are
//!   configured AND a live network call succeeds; otherwise it is ignored.

use crate::error::{AppError, AppResult};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

// ─── HMAC key ────────────────────────────────────────────────────────────────

/// The HMAC signing key for `license.json`.
///
/// Production builds MUST set `HEIRVO_LICENSE_HMAC_SECRET` at compile time to
/// a strong random secret.  In debug / CI builds the dev fallback is used —
/// clearly distinct from any production secret and documented here.
///
/// SECURITY: If the dev fallback ships in a production binary (because the env
/// var was not set), an attacker who reverse-engineers the binary can forge
/// `license.json`.  The release `build.rs` gate warns about this loudly.
const HMAC_KEY: &str = match option_env!("HEIRVO_LICENSE_HMAC_SECRET") {
    Some(k) => k,
    None => "heirvo-dev-hmac-secret-NOT-FOR-PRODUCTION-2026",
};

// ─── Lemon Squeezy product-id consts ─────────────────────────────────────────

/// Legacy single-product env var — treated as the Recover tier product id.
const LS_PRODUCT_ID: Option<&str> = option_env!("HEIRVO_LS_PRODUCT_ID");
/// Tier-specific product ids, set at compile time for production builds.
const LS_RECOVER_PRODUCT_ID: Option<&str> = option_env!("HEIRVO_LS_RECOVER_PRODUCT_ID");
const LS_ARCHIVE_PRODUCT_ID: Option<&str> = option_env!("HEIRVO_LS_ARCHIVE_PRODUCT_ID");
const LS_FAMILY_PRODUCT_ID: Option<&str> = option_env!("HEIRVO_LS_FAMILY_PRODUCT_ID");

// ─── Lemon Squeezy endpoint URLs ─────────────────────────────────────────────

const LS_VALIDATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/validate";
const LS_ACTIVATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/activate";
const LS_DEACTIVATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/deactivate";

// ─── Revalidation constants ───────────────────────────────────────────────────

/// Serve from cache without revalidation for this many seconds (14 days).
const REVALIDATE_AFTER_SECS: i64 = 14 * 24 * 3600;
/// Maximum time to serve a paid plan without an online validation (30 days).
const OFFLINE_GRACE_SECS: i64 = 30 * 24 * 3600;

// ─── Plan ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

// ─── LicenseStatus (returned to frontend) ────────────────────────────────────

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
    /// `true` when the license has exceeded the offline grace window and the
    /// user must reconnect to revalidate.  The frontend may show a gentle
    /// "reconnect your license" notice.  Defaults to `false`.
    pub needs_reconnect: bool,
}

impl Default for LicenseStatus {
    fn default() -> Self {
        Self {
            plan: Plan::Free,
            holder: None,
            can_save: true, // Free tier: 1 lifetime export (gate enforced via exports_used)
            can_import_media: false,
            exports_used: 0,
            needs_reconnect: false,
        }
    }
}

// ─── Signed on-disk record ────────────────────────────────────────────────────

/// The payload stored inside `license.json` → `data` field.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredLicense {
    key: String,
    /// Lemon Squeezy instance ID (seat tracking). None in dev stub mode.
    instance_id: Option<String>,
    plan: Plan,
    /// Customer email from Lemon Squeezy, or stub holder in dev.
    holder: Option<String>,
    /// Unix timestamp when this license was first activated on this device.
    activated_unix: i64,
    /// Unix timestamp of the last successful online validation (or activation).
    last_validated_unix: i64,
}

/// The envelope written to `license.json`.
#[derive(Debug, Serialize, Deserialize)]
struct LicenseEnvelope {
    /// `serde_json::to_string(&StoredLicense)` — kept as a raw string so the
    /// HMAC covers the exact bytes that were serialized (no round-trip drift).
    data: String,
    /// Hex HMAC-SHA256 of `data` bytes, keyed with `HMAC_KEY`.
    sig: String,
}

// ─── HMAC helpers ────────────────────────────────────────────────────────────

type HmacSha256 = Hmac<Sha256>;

fn hmac_sign(data: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(HMAC_KEY.as_bytes())
        .expect("HMAC accepts any key length");
    mac.update(data.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

fn hmac_verify(data: &str, sig: &str) -> bool {
    let expected = hmac_sign(data);
    // Both `expected` and `sig` are lowercase hex strings of the same digest
    // length.  Use constant-time comparison to prevent timing attacks.
    constant_time_eq(expected.as_bytes(), sig.as_bytes())
}

/// Constant-time byte-slice equality.  Both slices must be the same length
/// (both are hex strings of the same digest, so they always are).
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

// ─── license.json I/O ────────────────────────────────────────────────────────

fn license_json_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("license.json")
}

/// Legacy plaintext file from v1/v2. Never trusted for a paid plan; used only
/// as a hint for migration.
fn legacy_key_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("license.key")
}

/// Write a `StoredLicense` to `license.json` with HMAC signature.
fn write_license(app_data_dir: &PathBuf, record: &StoredLicense) -> AppResult<()> {
    std::fs::create_dir_all(app_data_dir)?;
    let data = serde_json::to_string(record)?;
    let sig = hmac_sign(&data);
    let envelope = LicenseEnvelope { data, sig };
    let json = serde_json::to_string_pretty(&envelope)?;
    std::fs::write(license_json_path(app_data_dir), json)?;
    Ok(())
}

/// Load and verify `license.json`.  Returns `None` if the file is absent,
/// unreadable, malformed, or the HMAC does not match (tampered).
fn load_license(app_data_dir: &PathBuf) -> Option<StoredLicense> {
    let raw = std::fs::read_to_string(license_json_path(app_data_dir)).ok()?;
    let envelope: LicenseEnvelope = serde_json::from_str(&raw).ok()?;
    if !hmac_verify(&envelope.data, &envelope.sig) {
        tracing::warn!("license.json HMAC verification failed — treating as unlicensed");
        return None;
    }
    serde_json::from_str::<StoredLicense>(&envelope.data).ok()
}

// ─── Trust decision (pure, testable) ─────────────────────────────────────────

/// Result of the offline-grace trust decision.
#[derive(Debug, PartialEq, Eq)]
pub enum CacheTrust {
    /// Within REVALIDATE_AFTER window — no action needed.
    Trusted,
    /// Past REVALIDATE_AFTER but within OFFLINE_GRACE — still serve the plan
    /// but schedule a background revalidation.
    NeedsRevalidation,
    /// Past OFFLINE_GRACE — downgrade to Free and set `needs_reconnect`.
    Expired,
}

/// Pure helper: given timestamps and "now", decide how much to trust the cache.
/// Extracted so unit tests can exercise all boundaries without I/O.
pub fn trust_decision(last_validated_unix: i64, now_unix: i64) -> CacheTrust {
    let age = now_unix.saturating_sub(last_validated_unix);
    if age <= REVALIDATE_AFTER_SECS {
        CacheTrust::Trusted
    } else if age <= OFFLINE_GRACE_SECS {
        CacheTrust::NeedsRevalidation
    } else {
        CacheTrust::Expired
    }
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

static CACHE: Mutex<Option<LicenseStatus>> = Mutex::new(None);

// ─── Lemon Squeezy response shapes ───────────────────────────────────────────

#[derive(Deserialize)]
struct LsValidateResp {
    valid: bool,
    license_key: LsLicenseKeyField,
    meta: LsMeta,
}

#[derive(Deserialize)]
struct LsLicenseKeyField {
    status: String, // "active" | "inactive" | "expired" | "disabled"
}

#[derive(Deserialize)]
struct LsMeta {
    customer_email: Option<String>,
    product_id: u64,
}

#[allow(dead_code)]
#[derive(Deserialize)]
struct LsActivateResp {
    activated: bool,
    instance: Option<LsInstance>,
    license_key: LsActivateLicenseKey,
    meta: LsActivateMeta,
}

#[allow(dead_code)]
#[derive(Deserialize)]
struct LsInstance {
    id: String,
}

#[allow(dead_code)]
#[derive(Deserialize)]
struct LsActivateLicenseKey {
    status: String,
}

#[allow(dead_code)]
#[derive(Deserialize)]
struct LsActivateMeta {
    customer_email: Option<String>,
    product_id: u64,
}

#[allow(dead_code)]
#[derive(Deserialize)]
struct LsDeactivateResp {
    deactivated: bool,
}

// ─── Product-id helpers ───────────────────────────────────────────────────────

/// Returns true if any production product id is configured at compile time.
fn any_product_configured() -> bool {
    LS_PRODUCT_ID.is_some()
        || LS_RECOVER_PRODUCT_ID.is_some()
        || LS_ARCHIVE_PRODUCT_ID.is_some()
        || LS_FAMILY_PRODUCT_ID.is_some()
}

/// Resolve a Lemon Squeezy product id to a tier.
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

// ─── Export counter (free tier: 1 lifetime MP4 export) ───────────────────────
//
// SECURITY: the counter is stored in an HMAC-signed envelope (`exports.json`),
// the SAME signing scheme as `license.json`.  This stops the obvious power-user
// reset — opening a plaintext file and changing `1` back to `0`.  Editing the
// number now requires the compiled-in `HMAC_KEY`, i.e. reverse-engineering the
// binary, not Notepad.
//
// Fail-closed semantics:
//   - File ABSENT            → genuine fresh install → count 0 (free export available).
//   - File present + valid   → trust the signed count.
//   - File present + TAMPERED → treat as already-used (count 1) so corrupting
//                               the signature is never a winning move.
//
// NOTE (honest limit): a full wipe of the app-data directory still resets the
// counter — that is inherent to any client-side limit without a server anchor
// for anonymous free users.  HMAC closes the easy edit; a determined user who
// deletes their whole profile gets one more free export.  The paid features
// remain gated by the server-validated license, which this does not weaken.

/// Tiny signed payload for the export counter.  Serialized into a
/// `LicenseEnvelope.data` field and HMAC-signed exactly like `StoredLicense`.
#[derive(Debug, Serialize, Deserialize)]
struct ExportCounter {
    count: u32,
}

fn exports_json_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("exports.json")
}

/// Pre-signing plaintext counter (`exports.count`).  Read once for migration,
/// then deleted so it can never be used to reset the count.
fn legacy_exports_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("exports.count")
}

/// Write the export count as a signed envelope and remove the legacy plaintext
/// file.  Best-effort: any I/O failure is swallowed (the gate fails safe — a
/// missing file reads back as 0 only on a genuine fresh profile).
fn write_exports_count(app_data_dir: &PathBuf, count: u32) {
    let _ = std::fs::create_dir_all(app_data_dir);
    if let Ok(data) = serde_json::to_string(&ExportCounter { count }) {
        let sig = hmac_sign(&data);
        if let Ok(json) = serde_json::to_string_pretty(&LicenseEnvelope { data, sig }) {
            let _ = std::fs::write(exports_json_path(app_data_dir), json);
        }
    }
    // Retire the editable plaintext counter so it can't be used to reset.
    let _ = std::fs::remove_file(legacy_exports_path(app_data_dir));
}

pub fn get_exports_used(app_data_dir: &PathBuf) -> u32 {
    // ── Signed counter is authoritative. ──────────────────────────────────────
    if let Ok(raw) = std::fs::read_to_string(exports_json_path(app_data_dir)) {
        match serde_json::from_str::<LicenseEnvelope>(&raw) {
            Ok(env) if hmac_verify(&env.data, &env.sig) => {
                if let Ok(c) = serde_json::from_str::<ExportCounter>(&env.data) {
                    return c.count;
                }
                tracing::warn!("exports.json verified but unparseable — failing closed");
                return 1;
            }
            _ => {
                tracing::warn!(
                    "exports.json present but HMAC invalid — failing closed (free export treated as used)"
                );
                return 1;
            }
        }
    }

    // ── No signed file: one-time migration from the legacy plaintext counter. ──
    let legacy = std::fs::read_to_string(legacy_exports_path(app_data_dir))
        .ok()
        .and_then(|s| s.trim().parse::<u32>().ok())
        .unwrap_or(0);
    if legacy > 0 {
        // Persist as signed so the old file can no longer be edited to reset.
        write_exports_count(app_data_dir, legacy);
    }
    legacy
}

/// Called after every successful export. Increments the signed on-disk counter
/// and invalidates the in-memory cache so the next status read is fresh.
pub fn record_export(app_data_dir: &PathBuf) {
    let count = get_exports_used(app_data_dir).saturating_add(1);
    write_exports_count(app_data_dir, count);
    *CACHE.lock().unwrap() = None;
}

// ─── Dev-mode format stub ─────────────────────────────────────────────────────

/// Dev-mode stub: accepts any non-empty key with at least one `-` and ≥8 chars.
/// Used when no `HEIRVO_LS_*_PRODUCT_ID` is set at build time.
///
/// SECURITY: This is the DEV stub — no online revalidation.  Build with
/// `HEIRVO_LS_*_PRODUCT_ID` env vars set to enable real LS validation.
///
/// Tier inference for dev keys:
///   prefix `RECOVER-…`  → Recover
///   prefix `FAMILY-…`   → Family
///   anything else       → Archive (unlocks import for dev/testing)
pub fn validate_key(key: &str) -> Option<(Plan, Option<String>)> {
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
    let holder = Some(trimmed.split('-').next().unwrap_or("").to_string());
    Some((plan, holder))
}

// ─── Device ID ────────────────────────────────────────────────────────────────

fn device_id_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("device.id")
}

/// Returns a stable per-device UUID, generating and persisting one on first
/// call.  This is NOT PII — just a random opaque identifier for LS seat
/// tracking (the `instance_name` field on activation).
fn get_or_create_device_id(app_data_dir: &PathBuf) -> String {
    let path = device_id_path(app_data_dir);
    if let Ok(s) = std::fs::read_to_string(&path) {
        let trimmed = s.trim().to_string();
        if !trimmed.is_empty() {
            return trimmed;
        }
    }
    let id = uuid::Uuid::new_v4().to_string();
    let _ = std::fs::create_dir_all(app_data_dir);
    let _ = std::fs::write(&path, &id);
    id
}

// ─── HTTP client helper ───────────────────────────────────────────────────────

fn build_http_client() -> Option<reqwest::Client> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .connect_timeout(std::time::Duration::from_secs(5))
        .build()
        .ok()
}

// ─── Public API ───────────────────────────────────────────────────────────────

/// Build a `LicenseStatus` from a `StoredLicense` and export count, applying
/// the offline-grace trust decision.  Returns `(status, needs_background_refresh)`.
fn status_from_record(record: &StoredLicense, exports_used: u32) -> (LicenseStatus, bool) {
    let now = chrono::Utc::now().timestamp();
    let (plan, needs_reconnect, needs_refresh) = match trust_decision(record.last_validated_unix, now) {
        CacheTrust::Trusted => (record.plan, false, false),
        CacheTrust::NeedsRevalidation => (record.plan, false, true),
        CacheTrust::Expired => (Plan::Free, true, false),
    };

    let status = LicenseStatus {
        plan,
        holder: record.holder.clone(),
        can_save: plan.is_paid() || exports_used == 0,
        can_import_media: plan.can_import_media(),
        exports_used,
        needs_reconnect,
    };
    (status, needs_refresh)
}

/// Read the on-disk license, verify the HMAC, and return the cached status.
///
/// This is the single source of trust for the paid plan gate:
/// - Verifies HMAC before trusting anything.
/// - Applies offline-grace window via `trust_decision`.
/// - If `license.json` is missing/invalid → Free (no network call).
/// - If `license.json` exists but `license.key` also exists, the signed JSON
///   wins; the legacy plaintext file is ignored.
/// - Migration: if `license.json` absent, `license.key` present, product IDs
///   configured, and network reachable → attempt one live validation and, on
///   success, write a signed `license.json`.  Failure → Free.
pub fn current(app_data_dir: &PathBuf) -> LicenseStatus {
    current_with_refresh_hint(app_data_dir).0
}

/// Backend authorization gate for any EXPORT that leaves Heirvo (MP4, ISO,
/// original files, disc burn, audio WAV). The frontend already hides these
/// behind the paywall, but that is UI-only — a script (or an instrumented
/// renderer) could call the export commands directly. Every export command MUST
/// call this first so the free-tier "1 lifetime export" limit is enforced in the
/// backend, not just the UI.
///
/// Paid plans (within offline grace): unlimited. Free tier: allowed only while
/// `exports_used == 0`. No network call — reads the local signed record.
pub fn export_allowed(app_data_dir: &PathBuf) -> bool {
    let exports_used = get_exports_used(app_data_dir);
    match load_license(app_data_dir) {
        Some(record) => status_from_record(&record, exports_used).0.can_save,
        None => exports_used == 0,
    }
}

/// Like `current`, but also returns `true` if a background refresh is advised.
pub fn current_with_refresh_hint(app_data_dir: &PathBuf) -> (LicenseStatus, bool) {
    if let Some(c) = CACHE.lock().unwrap().clone() {
        // Cache hit — still check refresh hint from trust_decision, but we
        // need the record timestamps for that.  For simplicity: if we have a
        // paid-plan cache hit, spawn will check on its own cadence.
        return (c, false);
    }

    let exports_used = get_exports_used(app_data_dir);

    // ── Try signed license.json first (authoritative). ────────────────────────
    if let Some(record) = load_license(app_data_dir) {
        let (status, needs_refresh) = status_from_record(&record, exports_used);
        *CACHE.lock().unwrap() = Some(status.clone());
        return (status, needs_refresh);
    }

    // ── No valid license.json. ────────────────────────────────────────────────
    // Legacy license.key: NEVER trust for a paid tier directly.
    // If product IDs are configured, flag for async migration (the caller /
    // background spawn can attempt online validation and write license.json).
    // We return Free now — the async path will upgrade if the key is valid.
    let legacy_exists = legacy_key_path(app_data_dir).exists();
    let needs_migration = legacy_exists && any_product_configured();

    let status = LicenseStatus {
        exports_used,
        can_save: exports_used == 0,
        ..Default::default()
    };
    *CACHE.lock().unwrap() = Some(status.clone());
    // needs_refresh doubles as the signal for "attempt migration" when product
    // IDs are configured and a legacy file exists.
    (status, needs_migration)
}

/// Activate a license key.
///
/// Production (product IDs configured):
///   1. Calls `POST /v1/licenses/activate` on Lemon Squeezy.
///   2. On success, writes a signed `license.json` with the instance_id.
///
/// Dev (no product IDs):
///   1. Validates via the format stub.
///   2. Still writes a signed `license.json` (exercises the signing path).
pub async fn activate(app_data_dir: &PathBuf, key: &str) -> AppResult<LicenseStatus> {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return Err(AppError::Internal("License key must not be empty".into()));
    }

    let now = chrono::Utc::now().timestamp();

    if any_product_configured() {
        // ── Production activation via Lemon Squeezy. ──────────────────────────
        let client = build_http_client()
            .ok_or_else(|| AppError::Internal("Failed to build HTTP client".into()))?;
        let device_id = get_or_create_device_id(app_data_dir);
        let instance_name = format!("heirvo-{}", &device_id[..8]);

        let resp = client
            .post(LS_ACTIVATE_URL)
            .header("Accept", "application/json")
            .form(&[
                ("license_key", trimmed),
                ("instance_name", instance_name.as_str()),
            ])
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Network error activating license: {e}")))?;

        if !resp.status().is_success() {
            // Parse LS's machine-readable `error` WITHOUT ever surfacing the raw
            // body — it contains the customer's email and order IDs (PII). Map the
            // known cases to calm, actionable messages.
            let body = resp.text().await.unwrap_or_default();
            let ls_err = serde_json::from_str::<serde_json::Value>(&body)
                .ok()
                .and_then(|v| v.get("error").and_then(|e| e.as_str()).map(str::to_owned))
                .unwrap_or_default();
            let lower = ls_err.to_lowercase();
            let friendly: String = if lower.contains("activation limit") {
                "This license key is already in use on the maximum number of devices. \
                 If you reinstalled Heirvo or switched computers, contact support at \
                 heirvo.com and we'll reset it right away."
                    .to_string()
            } else if lower.contains("expired") {
                "This license key has expired.".to_string()
            } else if lower.contains("not found") || lower.contains("does not exist") {
                "We couldn't find that license key. Make sure it matches the one in \
                 your purchase email."
                    .to_string()
            } else if lower.contains("disabled") || lower.contains("revoked") {
                "This license key is no longer active. Contact support at heirvo.com \
                 if you believe this is a mistake."
                    .to_string()
            } else if !ls_err.is_empty() {
                // LS's own message is already user-safe (no PII) — use it verbatim.
                ls_err
            } else {
                "Activation failed. Please double-check your key and try again.".to_string()
            };
            return Err(AppError::Internal(friendly));
        }

        let ls: LsActivateResp = resp.json().await.map_err(|e| {
            AppError::Internal(format!("Failed to parse activation response: {e}"))
        })?;

        if !ls.activated {
            return Err(AppError::Internal(
                "Lemon Squeezy rejected the activation (key may be over seat limit, \
                 expired, or already used on too many devices)"
                    .into(),
            ));
        }

        if ls.license_key.status != "active" {
            return Err(AppError::Internal(format!(
                "License key status is '{}' — must be 'active' to use this app",
                ls.license_key.status
            )));
        }

        let plan = tier_for_product_id(ls.meta.product_id).ok_or_else(|| {
            AppError::Internal(format!(
                "Unknown product id {} — this key is not for Heirvo",
                ls.meta.product_id
            ))
        })?;

        let instance_id = ls.instance.map(|i| i.id);

        let record = StoredLicense {
            key: trimmed.to_string(),
            instance_id,
            plan,
            holder: ls.meta.customer_email,
            activated_unix: now,
            last_validated_unix: now,
        };
        write_license(app_data_dir, &record)?;

        let exports_used = get_exports_used(app_data_dir);
        let status = LicenseStatus {
            plan,
            holder: record.holder.clone(),
            can_save: true,
            can_import_media: plan.can_import_media(),
            exports_used,
            needs_reconnect: false,
        };
        *CACHE.lock().unwrap() = Some(status.clone());
        return Ok(status);
    }

    // ── Dev / CI: format stub + write signed license.json. ───────────────────
    let (plan, holder) = validate_key(trimmed)
        .ok_or_else(|| AppError::Internal("Invalid license key format".into()))?;

    let record = StoredLicense {
        key: trimmed.to_string(),
        instance_id: None,
        plan,
        holder: holder.clone(),
        activated_unix: now,
        last_validated_unix: now,
    };
    write_license(app_data_dir, &record)?;

    let exports_used = get_exports_used(app_data_dir);
    let status = LicenseStatus {
        plan,
        holder,
        can_save: true,
        can_import_media: plan.can_import_media(),
        exports_used,
        needs_reconnect: false,
    };
    *CACHE.lock().unwrap() = Some(status.clone());
    Ok(status)
}

/// Deactivate the license on this device.
///
/// If product IDs are configured and the stored record has an `instance_id`,
/// calls `POST /v1/licenses/deactivate` on Lemon Squeezy (best-effort; network
/// failure does NOT prevent local deactivation).
///
/// Deletes `license.json`, clears `CACHE`, returns Free.
pub fn deactivate(app_data_dir: &PathBuf) -> LicenseStatus {
    // Capture the record before we delete it, so we can call LS.
    let maybe_record = load_license(app_data_dir);
    let _ = std::fs::remove_file(license_json_path(app_data_dir));
    // Also clean up legacy key file if it exists.
    let _ = std::fs::remove_file(legacy_key_path(app_data_dir));
    *CACHE.lock().unwrap() = None;

    // Best-effort LS deactivation — spawn and forget.
    if any_product_configured() {
        if let Some(record) = maybe_record {
            if let Some(instance_id) = record.instance_id {
                let key = record.key.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = call_ls_deactivate(&key, &instance_id).await;
                });
            }
        }
    }

    // Return Free status.
    let exports_used = get_exports_used(app_data_dir);
    LicenseStatus {
        exports_used,
        can_save: exports_used == 0,
        ..Default::default()
    }
}

/// Best-effort Lemon Squeezy deactivation call (frees a seat).
async fn call_ls_deactivate(key: &str, instance_id: &str) -> Option<()> {
    let client = build_http_client()?;
    let resp = client
        .post(LS_DEACTIVATE_URL)
        .header("Accept", "application/json")
        .form(&[("license_key", key), ("instance_id", instance_id)])
        .send()
        .await
        .ok()?;
    if resp.status().is_success() {
        let d: LsDeactivateResp = resp.json().await.ok()?;
        if d.deactivated {
            tracing::info!("License seat freed on Lemon Squeezy (instance {instance_id})");
        }
    }
    Some(())
}

// ─── Background revalidation ──────────────────────────────────────────────────

/// Spawn the background license revalidation task.
///
/// Call from `AppState::init` after migrations.  The task:
/// 1. Reads `license.json` and checks if revalidation is needed.
/// 2. If yes AND product IDs configured, calls LS validate.
/// 3. On success: updates `last_validated_unix`, re-signs, refreshes CACHE.
/// 4. On LS saying the key is revoked/refunded: downgrades to Free.
/// 5. On any network failure: logs and exits (offline grace covers it).
/// 6. If `license.json` is absent but `license.key` exists (legacy migration):
///    attempts activation via LS validate, writes `license.json` on success.
///
/// Non-fatal in all code paths.
pub fn spawn_background_refresh(app: tauri::AppHandle) {
    use tauri::Emitter;
    tauri::async_runtime::spawn(async move {
        let data_dir = match app.path().app_data_dir() {
            Ok(d) => d,
            Err(e) => {
                tracing::warn!("background_refresh: cannot get app_data_dir: {e}");
                return;
            }
        };

        // ── Step 1: determine if action is needed. ────────────────────────────
        let (action, key, instance_id) = if let Some(record) = load_license(&data_dir) {
            let now = chrono::Utc::now().timestamp();
            let trust = trust_decision(record.last_validated_unix, now);
            match trust {
                CacheTrust::Trusted => {
                    tracing::debug!("background_refresh: cache is fresh, skipping");
                    return;
                }
                CacheTrust::NeedsRevalidation | CacheTrust::Expired => {
                    tracing::info!(
                        "background_refresh: revalidating license (trust={:?})",
                        trust
                    );
                    ("revalidate", record.key.clone(), record.instance_id.clone())
                }
            }
        } else {
            // No signed license.json — check for legacy migration.
            let legacy_path = legacy_key_path(&data_dir);
            if legacy_path.exists() && any_product_configured() {
                let key = match std::fs::read_to_string(&legacy_path) {
                    Ok(k) => k.trim().to_string(),
                    Err(_) => return,
                };
                if key.is_empty() {
                    return;
                }
                tracing::info!("background_refresh: attempting legacy key migration");
                ("migrate", key, None)
            } else {
                return; // No license, no legacy file, nothing to do.
            }
        };

        if !any_product_configured() {
            return;
        }

        // ── Step 2: call LS validate. ─────────────────────────────────────────
        let client = match build_http_client() {
            Some(c) => c,
            None => {
                tracing::warn!("background_refresh: cannot build HTTP client");
                return;
            }
        };

        let resp = match client
            .post(LS_VALIDATE_URL)
            .header("Accept", "application/json")
            .form(&[("license_key", key.as_str())])
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::info!("background_refresh: network error (offline grace applies): {e}");
                return;
            }
        };

        if !resp.status().is_success() {
            tracing::info!(
                "background_refresh: LS returned HTTP {} (offline grace applies)",
                resp.status()
            );
            return;
        }

        let v: LsValidateResp = match resp.json().await {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!("background_refresh: failed to parse LS response: {e}");
                return;
            }
        };

        let now = chrono::Utc::now().timestamp();

        if !v.valid || v.license_key.status != "active" {
            // Key revoked / refunded / deactivated — downgrade to Free.
            tracing::warn!(
                "background_refresh: license no longer active (valid={}, status={}) — downgrading to Free",
                v.valid, v.license_key.status
            );
            // Remove the signed file (do not re-sign a Free record — absence = Free).
            let _ = std::fs::remove_file(license_json_path(&data_dir));
            *CACHE.lock().unwrap() = None;
            let exports_used = get_exports_used(&data_dir);
            let status = LicenseStatus {
                exports_used,
                can_save: exports_used == 0,
                ..Default::default()
            };
            *CACHE.lock().unwrap() = Some(status.clone());
            let _ = app.emit("license:updated", &status);
            return;
        }

        let plan = match tier_for_product_id(v.meta.product_id) {
            Some(p) => p,
            None => {
                tracing::warn!(
                    "background_refresh: unknown product_id {} — leaving cache as-is",
                    v.meta.product_id
                );
                return;
            }
        };

        // ── Step 3: re-sign with updated last_validated_unix. ─────────────────
        // For migration, the record may not exist yet — create it from scratch.
        let existing = load_license(&data_dir);
        let record = StoredLicense {
            key: key.clone(),
            instance_id: existing
                .as_ref()
                .and_then(|r| r.instance_id.clone())
                .or(instance_id),
            plan,
            holder: v.meta.customer_email.or_else(|| {
                existing.as_ref().and_then(|r| r.holder.clone())
            }),
            activated_unix: existing
                .as_ref()
                .map(|r| r.activated_unix)
                .unwrap_or(now),
            last_validated_unix: now,
        };

        if let Err(e) = write_license(&data_dir, &record) {
            tracing::warn!("background_refresh: failed to write license.json: {e}");
            return;
        }

        // Remove legacy key file after successful migration.
        if action == "migrate" {
            let _ = std::fs::remove_file(legacy_key_path(&data_dir));
            tracing::info!("background_refresh: legacy license.key migrated to license.json");
        }

        let exports_used = get_exports_used(&data_dir);
        let status = LicenseStatus {
            plan,
            holder: record.holder.clone(),
            can_save: true,
            can_import_media: plan.can_import_media(),
            exports_used,
            needs_reconnect: false,
        };
        *CACHE.lock().unwrap() = Some(status.clone());
        let _ = app.emit("license:updated", &status);
        tracing::info!(
            "background_refresh: license refreshed — plan={:?}",
            plan
        );
    });
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

    // ── HMAC sign/verify ──────────────────────────────────────────────────────

    #[test]
    fn hmac_sign_verify_roundtrip() {
        let data = r#"{"key":"TEST-KEY-1234","plan":"archive"}"#;
        let sig = hmac_sign(data);
        assert!(hmac_verify(data, &sig), "fresh signature must verify");
    }

    #[test]
    fn hmac_verify_rejects_tampered_data() {
        let data = r#"{"key":"TEST-KEY-1234","plan":"archive"}"#;
        let sig = hmac_sign(data);
        // Flip first byte of data (change '{' to '[').
        let mut tampered = data.as_bytes().to_vec();
        tampered[0] ^= 0x01;
        let tampered_str = String::from_utf8_lossy(&tampered);
        assert!(!hmac_verify(&tampered_str, &sig), "tampered data must not verify");
    }

    #[test]
    fn hmac_verify_rejects_wrong_sig() {
        let data = r#"{"key":"TEST-KEY-1234","plan":"archive"}"#;
        let wrong_sig = "0000000000000000000000000000000000000000000000000000000000000000";
        assert!(!hmac_verify(data, wrong_sig));
    }

    #[test]
    fn hmac_verify_rejects_empty_sig() {
        let data = r#"{"key":"TEST-KEY-1234","plan":"archive"}"#;
        assert!(!hmac_verify(data, ""));
    }

    // ── Forged license.json is rejected ──────────────────────────────────────

    #[test]
    fn forged_license_json_returns_free() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        // Write a hand-forged envelope with a wrong sig.
        let forged = r#"{"data":"{\"key\":\"FAKE-KEY-1234\",\"instance_id\":null,\"plan\":\"family\",\"holder\":null,\"activated_unix\":0,\"last_validated_unix\":9999999999}","sig":"deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"}"#;
        std::fs::write(license_json_path(&dir), forged).unwrap();

        let status = current(&dir);
        assert_eq!(status.plan, Plan::Free, "forged sig must yield Free");
        assert!(!status.can_import_media);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn missing_sig_field_returns_free() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        // Write an envelope with a missing "sig" field.
        let bad = r#"{"data":"{\"key\":\"X-Y-1234\",\"instance_id\":null,\"plan\":\"archive\",\"holder\":null,\"activated_unix\":0,\"last_validated_unix\":9999999999}"}"#;
        std::fs::write(license_json_path(&dir), bad).unwrap();

        let status = current(&dir);
        assert_eq!(status.plan, Plan::Free);

        std::fs::remove_dir_all(&dir).ok();
    }

    // ── trust_decision boundaries ─────────────────────────────────────────────

    #[test]
    fn trust_decision_fresh_is_trusted() {
        let now = 1_000_000_000i64;
        let last = now - REVALIDATE_AFTER_SECS + 1; // 1 second before threshold
        assert_eq!(trust_decision(last, now), CacheTrust::Trusted);
    }

    #[test]
    fn trust_decision_at_revalidate_boundary_is_trusted() {
        let now = 1_000_000_000i64;
        let last = now - REVALIDATE_AFTER_SECS; // exactly at threshold
        assert_eq!(trust_decision(last, now), CacheTrust::Trusted);
    }

    #[test]
    fn trust_decision_just_past_revalidate_is_needs_revalidation() {
        let now = 1_000_000_000i64;
        let last = now - REVALIDATE_AFTER_SECS - 1;
        assert_eq!(trust_decision(last, now), CacheTrust::NeedsRevalidation);
    }

    #[test]
    fn trust_decision_at_grace_boundary_is_needs_revalidation() {
        let now = 1_000_000_000i64;
        let last = now - OFFLINE_GRACE_SECS; // exactly at grace boundary
        assert_eq!(trust_decision(last, now), CacheTrust::NeedsRevalidation);
    }

    #[test]
    fn trust_decision_past_grace_is_expired() {
        let now = 1_000_000_000i64;
        let last = now - OFFLINE_GRACE_SECS - 1;
        assert_eq!(trust_decision(last, now), CacheTrust::Expired);
    }

    // ── validate_key (dev stub) ───────────────────────────────────────────────

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
        let (plan, holder) = validate_key("HEIRVO-PRO-1234").expect("should accept dev key");
        assert_eq!(plan, Plan::Archive);
        assert_eq!(holder.as_deref(), Some("HEIRVO"));
    }

    #[test]
    fn recover_prefix_dev_key_grants_recover_only() {
        let (plan, _) = validate_key("RECOVER-DEV-1234").expect("should accept");
        assert_eq!(plan, Plan::Recover);
        assert!(!plan.can_import_media(), "Recover tier must not allow media import");
    }

    #[test]
    fn family_prefix_dev_key_grants_family() {
        let (plan, _) = validate_key("FAMILY-DEV-1234").expect("should accept");
        assert_eq!(plan, Plan::Family);
        assert!(plan.can_import_media());
    }

    #[test]
    fn free_plan_cannot_import() {
        assert!(!Plan::Free.can_import_media());
        assert!(!Plan::Recover.can_import_media());
        assert!(Plan::Archive.can_import_media());
        assert!(Plan::Family.can_import_media());
        assert!(Plan::Pro.can_import_media(), "legacy Pro alias must keep import");
    }

    // ── StoredLicense sign→write→read→verify→deserialize roundtrip ───────────

    #[test]
    fn stored_license_roundtrip() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        let record = StoredLicense {
            key: "HEIRVO-TEST-5678".to_string(),
            instance_id: Some("inst-abc-123".to_string()),
            plan: Plan::Archive,
            holder: Some("test@example.com".to_string()),
            activated_unix: 1_700_000_000,
            last_validated_unix: 1_700_000_000,
        };

        write_license(&dir, &record).expect("write should succeed");

        let loaded = load_license(&dir).expect("should load back");
        assert_eq!(loaded.key, record.key);
        assert_eq!(loaded.plan, Plan::Archive);
        assert_eq!(loaded.instance_id.as_deref(), Some("inst-abc-123"));
        assert_eq!(loaded.holder.as_deref(), Some("test@example.com"));
        assert_eq!(loaded.activated_unix, 1_700_000_000);
        assert_eq!(loaded.last_validated_unix, 1_700_000_000);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn stored_license_tampered_byte_rejected() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        let record = StoredLicense {
            key: "HEIRVO-TEST-9999".to_string(),
            instance_id: None,
            plan: Plan::Recover,
            holder: None,
            activated_unix: 1_700_000_000,
            last_validated_unix: 1_700_000_000,
        };
        write_license(&dir, &record).expect("write");

        // Read and tamper with the data field.
        let path = license_json_path(&dir);
        let raw = std::fs::read_to_string(&path).unwrap();
        let mut envelope: serde_json::Value = serde_json::from_str(&raw).unwrap();
        let data = envelope["data"].as_str().unwrap().to_string();
        // Replace "recover" with "archive" in the data.
        let tampered_data = data.replace("recover", "archive");
        envelope["data"] = serde_json::Value::String(tampered_data);
        std::fs::write(&path, serde_json::to_string_pretty(&envelope).unwrap()).unwrap();

        // Should be rejected.
        assert!(load_license(&dir).is_none(), "tampered record must not load");

        std::fs::remove_dir_all(&dir).ok();
    }

    // ── activate (dev path) + current roundtrip ───────────────────────────────

    #[tokio::test]
    async fn activate_persists_and_round_trips() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        let s = activate(&dir, "TEST-KEY-1234").await.expect("activate ok");
        assert!(s.can_save);
        assert!(!s.needs_reconnect);

        *CACHE.lock().unwrap() = None;
        let reloaded = current(&dir);
        assert!(reloaded.can_save);
        assert_eq!(reloaded.plan, Plan::Archive); // default dev tier

        // Verify license.json was written (not the old license.key).
        assert!(license_json_path(&dir).exists(), "license.json must exist");
        assert!(!legacy_key_path(&dir).exists(), "old license.key must NOT exist");

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn deactivate_clears_status() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(activate(&dir, "X-Y-Z-1234"))
            .ok();

        let s = deactivate(&dir);
        assert_eq!(s.plan, Plan::Free);
        assert!(!s.can_import_media, "Free tier must not allow media import after deactivate");
        assert!(!license_json_path(&dir).exists(), "license.json must be deleted on deactivate");

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn missing_license_returns_free() {
        let _g = lock();
        let dir = tmp_dir().join("never-existed");
        *CACHE.lock().unwrap() = None;

        let s = current(&dir);
        assert_eq!(s.plan, Plan::Free);
        assert!(!s.needs_reconnect);
    }

    // ── Legacy license.key is NOT trusted for paid tier ───────────────────────

    #[test]
    fn legacy_key_file_does_not_grant_paid_plan() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        // Write only the old plaintext file (no license.json).
        std::fs::create_dir_all(&dir).ok();
        std::fs::write(legacy_key_path(&dir), "HEIRVO-PRO-1234").unwrap();

        let s = current(&dir);
        // Must be Free — the unsigned legacy file is never trusted directly.
        assert_eq!(s.plan, Plan::Free, "legacy license.key must NOT grant a paid plan");

        std::fs::remove_dir_all(&dir).ok();
    }

    // ── Expired cache yields needs_reconnect ─────────────────────────────────

    #[test]
    fn expired_record_sets_needs_reconnect() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        // Write a signed record with a very old last_validated_unix.
        let old_ts = 1_000_000_000i64; // far in the past, definitely expired
        let record = StoredLicense {
            key: "TEST-EXPIRED-1234".to_string(),
            instance_id: None,
            plan: Plan::Archive,
            holder: None,
            activated_unix: old_ts,
            last_validated_unix: old_ts,
        };
        write_license(&dir, &record).expect("write");

        let status = current(&dir);
        assert_eq!(status.plan, Plan::Free, "expired cache must downgrade to Free");
        assert!(status.needs_reconnect, "expired cache must set needs_reconnect");

        std::fs::remove_dir_all(&dir).ok();
    }

    // ── Signed export counter ────────────────────────────────────────────────

    #[test]
    fn fresh_profile_has_zero_exports() {
        let _g = lock();
        let dir = tmp_dir();
        assert_eq!(get_exports_used(&dir), 0, "fresh profile = 0 exports");
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn record_export_persists_signed_count() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        record_export(&dir);
        assert_eq!(get_exports_used(&dir), 1, "first export → 1");
        assert!(exports_json_path(&dir).exists(), "signed exports.json must exist");
        assert!(
            !legacy_exports_path(&dir).exists(),
            "plaintext exports.count must not be created"
        );

        record_export(&dir);
        assert_eq!(get_exports_used(&dir), 2, "second export → 2");

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn tampered_export_counter_fails_closed() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        // Legitimately reach count 1.
        record_export(&dir);
        assert_eq!(get_exports_used(&dir), 1);

        // Power-user move: rewrite the signed count back to 0 (keeping the old sig).
        let path = exports_json_path(&dir);
        let raw = std::fs::read_to_string(&path).unwrap();
        let mut envelope: serde_json::Value = serde_json::from_str(&raw).unwrap();
        envelope["data"] = serde_json::Value::String(r#"{"count":0}"#.to_string());
        std::fs::write(&path, serde_json::to_string_pretty(&envelope).unwrap()).unwrap();

        // Must NOT grant a fresh free export — fail closed.
        assert_eq!(
            get_exports_used(&dir),
            1,
            "tampered counter must fail closed (treated as used)"
        );

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn legacy_plaintext_counter_is_migrated_and_retired() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        // Simulate a tester upgraded from the plaintext-counter build.
        std::fs::create_dir_all(&dir).ok();
        std::fs::write(legacy_exports_path(&dir), "1").unwrap();

        // Reading migrates it: count preserved, signed file written, plaintext gone.
        assert_eq!(get_exports_used(&dir), 1, "legacy count must be preserved");
        assert!(exports_json_path(&dir).exists(), "signed file must be written on migration");
        assert!(
            !legacy_exports_path(&dir).exists(),
            "legacy plaintext file must be retired so it can't reset the count"
        );

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn export_gate_blocks_second_free_export() {
        let _g = lock();
        let dir = tmp_dir();
        *CACHE.lock().unwrap() = None;

        assert!(export_allowed(&dir), "first free export is allowed");
        record_export(&dir);
        assert!(!export_allowed(&dir), "second free export is blocked");

        std::fs::remove_dir_all(&dir).ok();
    }
}
