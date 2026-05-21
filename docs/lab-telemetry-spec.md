# Heirvo Lab Edition — Signed Recovery Telemetry Spec

> The tamper-evident log that the Lab Network's pay engine, QC, and chain-of-custody
> all hang off. Difficulty tiers, the attempt fee, and "proof a real attempt happened"
> are derived from this log — never from operator self-report.
>
> **Status:** design spec for review. Companion to [lab-network.md](lab-network.md) (§7 pay,
> §8 chain of custody) and the existing [recovery-engine.md](recovery-engine.md).

---

## 1. What this is and is not

**Goal:** every recovery job on a Lab Edition install emits a signed, append-only
`RecoveryTelemetryLog` that (a) proves a genuine multi-pass attempt occurred, (b) lets HQ
compute the pay tier deterministically, and (c) cryptographically binds the summary to the
*actual recovered bytes* so an operator can't claim work they didn't do.

**Honest threat model — read this before trusting it.** Client-side signing gives you
**integrity** (the log wasn't edited after the fact), **authenticity** (it came from a
provisioned Lab Edition install for a known operator), and **non-repudiation**. It does
**not**, on its own, stop a determined operator who extracts their private key and forges a
log, or who swaps in a pristine disc. Those are caught by the **server-side correlation
layer** (§7): immediate upload, blind re-test discs with known ground truth, the
unpredictable per-disc fingerprint, and statistical anomaly detection across the operator's
history. **Signing raises the cost of fraud; server correlation is what actually catches it.**
Build both; never sell signing alone as "cheat-proof."

---

## 2. What the engine already produces (reuse, don't rebuild)

| Data | Source struct / table | Path |
|---|---|---|
| Per-sector SHA-256 + timestamp | `sector_receipts` table | migrations/20260517000000_sector_receipts.sql |
| Human-readable receipt manifest | `export_receipt_manifest()` → `ReceiptManifestResult` | commands/recovery.rs:330 |
| Per-pass strategy + timings + good/failed/skipped | `recovery_passes` table, `RecoveryPass` | recovery/passes.rs:66 |
| Run-level counters, speed, drive-health hint | `RecoveryStats` | recovery/engine.rs:40 |
| Per-read retry count, read time, error class | `SectorReadResult.retry_count / read_time_ms / error` | disc/sector.rs:24 |
| Drive vendor / model / firmware + capabilities | `DriveInfo` | disc/drive.rs:6 |
| Disc identity (SHA-256 of PVD + sector count) | `disc_fingerprint` | session/manager.rs:72 |
| Disc profile (MMC code, status, sessions, TOC) | `DiscProfile` | disc/drive.rs:134 |
| Sector-map snapshot (zstd) + SHA-256 checksum | `sector_maps` table | session/manager.rs:211 |
| SHA-256, zstd, UUID, serde_json | Cargo.toml | src-tauri/Cargo.toml |

**Gaps to close (see §8):** no signing keypair; no drive **unit serial**; per-read
`retry_count`/`error` is not aggregated or persisted per pass; `sector_errors` table exists
but is **not populated**; no upload path.

---

## 3. The `RecoveryTelemetryLog` schema

One log per job. Serialized as **canonical JSON** (§6), the canonical bytes are hashed, and
the hash is signed. Example:

```jsonc
{
  "schema": "heirvo.lab.telemetry/v1",
  "job": {
    "job_id": "uuid",                       // HQ-assigned (new) — distinct from session_id
    "session_id": "uuid",                   // existing engine session
    "operator_id": "uuid",                  // provisioned at onboarding
    "install_id": "uuid",                   // per-install, bound to the keypair
    "edition": "lab",
    "app_version": "1.2.0",
    "created_at": 1716200000,
    "completed_at": 1716205400
  },
  "disc": {
    "fingerprint": "sha256-hex",            // session/manager.rs:72 — the unpredictable identity
    "disc_type": "DVD-Video",
    "profile_code": 16,                     // DiscProfile.profile_code
    "label": "WEDDING_2004",
    "total_sectors": 2298496,
    "sector_size": 2048,
    "inquiry": { "vendor": "PIONEER", "model": "BD-RW BDR-2213", "firmware": "1.01" }
  },
  "drives": [                               // every physical drive that contributed
    { "drive_ref": "d1", "vendor": "PIONEER", "model": "BDR-2213",
      "firmware": "1.01", "unit_serial": "ABCD1234", "pureread_mode": "Master" },
    { "drive_ref": "d2", "vendor": "LITE-ON", "model": "iHAS124",
      "firmware": "FL.01", "unit_serial": "EFGH5678" }
  ],
  "passes": [                               // from recovery_passes + new aggregation
    { "n": 1, "drive_ref": "d1", "strategy": "Triage",   "started_at": 1716200030,
      "completed_at": 1716200900, "sectors_good": 2290000, "sectors_failed": 8496,
      "sectors_skipped": 0, "reads_ok": 2290120, "reads_err": 9000,
      "retry_sum": 14210, "max_retry": 51, "errors": { "MediumError": 8800, "Timeout": 200 } },
    { "n": 2, "drive_ref": "d1", "strategy": "SlowRead", "started_at": 1716200905,
      "completed_at": 1716203100, "sectors_good": 7000, "sectors_failed": 1496,
      "retry_sum": 88000, "max_retry": 220, "errors": { "MediumError": 1496 } },
    { "n": 3, "drive_ref": "d2", "strategy": "SlowRead", "started_at": 1716203200,
      "completed_at": 1716205200, "sectors_good": 1390, "sectors_failed": 106,
      "retry_sum": 41000, "max_retry": 240, "errors": { "MediumError": 106 } }
  ],
  "outcome": {
    "sectors_total": 2298496,
    "sectors_recovered": 2298390,
    "recovered_pct": 99.9954,
    "second_drive_merge": true,             // d2 recovered sectors d1 could not
    "drive_health": "Marginal",             // RecoveryStats.drive_health
    "elapsed_secs": 5400,
    "outcome_class": "recovered"            // recovered | partial | no_recovery
  },
  "evidence": {
    "receipts_root": "sha256-hex",          // §4 — Merkle root over per-sector receipts
    "receipts_count": 2298390,
    "sector_map_checksum": "sha256-hex",    // existing sector_maps.checksum
    "custody_photos": [                     // §5 chain-of-custody, hashed not embedded
      { "kind": "arrival_front", "sha256": "hex", "captured_at": 1716199900 },
      { "kind": "arrival_back",  "sha256": "hex", "captured_at": 1716199910 }
    ]
  }
}
```

```jsonc
// Signature envelope — wraps the canonical log above
{
  "payload_b64": "<base64 of canonical-JSON log>",
  "payload_sha256": "sha256-hex",
  "alg": "ed25519",
  "key_id": "operator-pubkey-fingerprint",
  "signature_b64": "<base64 ed25519 signature over payload_sha256>"
}
```

---

## 4. Binding the summary to real bytes (the receipts root)

The summary numbers (`recovered_pct`, tier inputs) are only trustworthy if they're tied to
the actual recovered data. You already hash every recovered sector into `sector_receipts`
(SHA-256 of the 2048-byte payload). Compute a **Merkle root** over those per-sector hashes
(ordered by LBA) and put it in `evidence.receipts_root`.

Why a Merkle root rather than a flat hash: HQ (or an auditor) can later demand proof for a
random subset of LBAs and verify each against the signed root **without re-uploading the
whole image** — a cheap, powerful spot-audit. It also means the operator committed to the
exact bytes at job time; they can't quietly substitute content afterward.

For a blind re-test disc, HQ already holds the ground-truth receipts root, so verification is
a single equality check.

---

## 5. Chain-of-custody capture (feeds the lab UI / liability)

Custody photos (disc-on-arrival, etc. — lab-network.md §8) are **hashed into the log, stored
out of band.** The log carries `{kind, sha256, captured_at}`; the image bytes upload to HQ
object storage keyed by that hash. This keeps the signed payload small, makes the photo
tamper-evident (its hash is signed), and gives you the liability artifact ("here is the
arrival photo, and here is the signed proof it's the one taken at intake").

---

## 6. Canonicalization & signing

- **Canonical JSON.** `serde_json` does not guarantee key order, and a signature is only
  verifiable over deterministic bytes. Emit with **sorted object keys, no insignificant
  whitespace, fixed number formatting** (or adopt JCS / RFC 8785). Hash *those* bytes with
  SHA-256; sign the hash.
- **Algorithm: ed25519** (`ed25519-dalek`). Small, fast, deterministic, no curve-parameter
  foot-guns.
- **Keys.** At operator onboarding, Lab Edition generates a keypair: **private key stays on
  the operator's machine** in the OS keystore (Windows DPAPI / Credential Manager), **public
  key registers with HQ** against `operator_id`. HQ verifies every uploaded log against the
  registered pubkey (`key_id`). Rotating/revoking a key = revoking an operator (ties to the
  performance-lease model).
- **Reality check (per §1):** a local private key is extractable by a determined attacker.
  That's acceptable because the server-correlation layer is the real backstop. Do **not** add
  HSM/hardware attestation now — overkill for the threat.

---

## 7. Deriving pay & catching cheating

### Pay tier — computed by HQ from the signed log, not claimed

| Signal (from log) | T1 clean | T2 multi-pass | T3 heroic |
|---|---|---|---|
| `passes.length` | 1 | 2 | ≥3 |
| `retry_sum` / `max_retry` | low | moderate | high |
| cleaning/resurface flag | no | yes | yes |
| `elapsed_secs` | short | medium | long |
| `second_drive_merge` | no | sometimes | usually |
| recovery climb across passes | n/a | yes | yes (slow grind) |

**Attempt fee ($9)** fires when `outcome_class == "no_recovery"` **AND** the log shows a
genuine effort: `passes.length ≥ 2`, `reads_ok + reads_err` above a floor, `elapsed_secs`
above a floor, and a non-trivial `retry_sum`. A disc that was never inserted has no drive
session and earns nothing.

### Server-side correlation (the actual anti-cheat)

1. **Blind re-test discs** — HQ holds the ground-truth `receipts_root`; the operator doesn't
   know the disc is a test. Mismatch (or a suspiciously *better-than-truth* result) = flag.
2. **Fingerprint check** — `disc.fingerprint` must match the disc HQ shipped for that
   `job_id`. A different fingerprint = wrong/substituted disc.
3. **Drive consistency** — `unit_serial`s should be stable across an operator's jobs; a log
   claiming a Pioneer read with no Pioneer serial ever seen before is suspect.
4. **Physics anomalies** — recovery faster than the drive's read speed allows, `retry_sum`
   inconsistent with `elapsed_secs`, or T3-claimed effort with T1-shaped telemetry.
5. **Merkle spot-audit** — demand N random LBA proofs against the signed root (§4).
6. **History/statistics** — an operator whose no-recovery rate, tier mix, or timing
   distribution drifts off the network norm gets sampled harder (ties to the QC
   sampling-by-trust model in lab-network.md §8).

---

## 8. Engine changes required

Ordered by dependency:

1. **Capture drive unit serial.** INQUIRY (0x12) already gives vendor/model/firmware; add the
   **VPD page 0x80 (Unit Serial Number)** query in `disc/scsi_windows.rs` and surface it on
   `DriveInfo`.
2. **Aggregate per-pass read stats.** The per-read `retry_count`/`error` exist on
   `SectorReadResult` but aren't rolled up. Accumulate `retry_sum`, `max_retry`, and an
   error-class histogram per pass in `RecoveryEngine`; persist to `recovery_passes` (add
   columns) — and finally **populate the existing-but-empty `sector_errors` table** for the
   detailed audit trail.
3. **Tag each pass with the drive that ran it** (`drive_ref`) so multi-drive merges are
   provable. (Depends on Lab Edition's multi-drive orchestration — see lab-network roadmap.)
4. **Add `ed25519-dalek`** + a canonical-JSON step. Generate/store keypair via OS keystore.
5. **Build the telemetry assembler** — a `build_telemetry_log(session_id) -> SignedLog` that
   reads the existing session/pass/receipt rows, computes the Merkle root, fills the schema,
   canonicalizes, signs. Natural home: extend `export_receipt_manifest()` in
   commands/recovery.rs.
6. **Custody-photo capture + hashing** in the lab UI; hash into the log, upload bytes out of
   band.
7. **Upload path** — Lab Edition → HQ API (the new backend from lab-network roadmap #3). Logs
   upload immediately on job completion; never trust a log that only ever lived locally.

### DB migration (new)

- `recovery_passes`: add `retry_sum INTEGER`, `max_retry INTEGER`, `drive_ref TEXT`,
  `error_histogram TEXT` (JSON).
- New `telemetry_logs` table: `job_id, session_id, payload_sha256, signature_b64, key_id,
  receipts_root, outcome_class, created_at, uploaded_at`.
- Begin populating `sector_errors` (already defined).

---

## 9. Phasing

- **Phase 1 (local, unblocks pay model):** schema + assembler + ed25519 signing + receipts
  Merkle root, written to disk. No backend yet — proves the format end-to-end and lets you
  hand-verify logs.
- **Phase 2:** drive serial + per-pass retry/error aggregation + `drive_ref` (lands with
  multi-drive orchestration).
- **Phase 3:** HQ upload + pubkey registry + the server-side correlation checks (§7). This is
  where it becomes real anti-cheat, and it rides on the HQ backend.

The spine: **one log per job, signed at the edge, verified and correlated at HQ** — the same
artifact drives pay, QC, and liability.
