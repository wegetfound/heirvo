# Heirvo HQ Backend — Spec

> The server-side hub the Lab Network runs on: order intake, routing, the job/chain-of-custody
> state machine, telemetry ingest + anti-cheat, the pay engine, QC, operator management, and
> file/photo delivery. Three of the four Lab Edition ideas depend on this existing.
>
> **Status:** design spec for review. Companion to [lab-network.md](lab-network.md) (the operating
> system), [lab-telemetry-spec.md](lab-telemetry-spec.md) (the signed log it ingests), and the
> Lab Edition desktop work.

---

## 1. Scope — one hub, three audiences

| Audience | Surface | Needs |
|---|---|---|
| **Customer** | web (heirvo.com) | place a mail-in order, track status, receive recovered files |
| **Operator** | Lab Edition desktop + operator web dashboard | receive jobs, log custody, upload signed telemetry, message HQ, see pay |
| **HQ admin** | admin dashboard | routing, QC review, operator lifecycle/scores/strikes/territory, pay runs, anti-cheat |

The backend is the **system of record** that ties these together. It absorbs what is currently
scattered across Formspree + ad-hoc Stripe intake into a real orders system.

---

## 2. The cloud boundary (a deliberate principle)

The consumer Heirvo app is **100% local, no cloud** — that's a stated selling point. **Lab
Edition explicitly opts into cloud sync**; that boundary must be loud and intentional, not
accidental. Only Lab Edition talks to HQ. A consumer build has no code path to it. State this
in the Lab Edition onboarding and licensing so the privacy promise to consumers stays intact.

---

## 3. Recommended stack

**API: Rust (axum) sharing a `heirvo-telemetry` crate with the desktop app.** The
security-critical pieces — the `RecoveryTelemetryLog` schema, canonical-JSON serialization,
and ed25519 verification — must be **byte-identical** on the producing (desktop) and verifying
(server) sides. Extracting them into one shared crate eliminates an entire class of "the JS
re-implementation of canonical JSON disagrees with Rust" bugs. You already have the Rust
expertise; reuse it for correctness where it matters.

**Admin + operator dashboards: React + the marketing design system.** Reuse the
`ink-`/`brand-` tokens, `.card`, `.btn` vocabulary already in `marketing/` so HQ tooling looks
like Heirvo and you don't maintain a second design language.

**System of record: Postgres** (managed — Neon / Supabase / RDS). Relational fits the
order→job→telemetry→payout chain and the audit requirements.

**Object storage: Cloudflare R2 or S3** for recovered files and custody photos (large blobs
never belong in Postgres). R2 has no egress fees — relevant when delivering multi-GB
recovered video.

**Hosting: Fly.io / Railway / a single VPS** to start. This is not a high-scale system (tens
of labs, thousands of discs/month) — resist over-architecting. One API instance + managed
Postgres + object storage is plenty for Phase 1–3.

> Pragmatic alternative if Rust server velocity is a problem: an all-TypeScript backend
> (Next.js + Postgres) is viable, but then port the canonical-JSON + ed25519 verification with
> a conformance test vector shared against the Rust producer. The shared-crate path is safer.

---

## 4. Domain model (core entities)

```
applications     screening-pipeline records (stage, scores, trial-disc result, bg-check status)
operators        identity, lifecycle status, territory, operator_score, payout account, status
operator_keys    registered ed25519 pubkeys (key_id, operator_id, active, revoked_at)
installs         per-install id bound to a key (app_version, last_seen)
territories      metro/CBSA, assigned operator, status (open|active|bench), waitlist
orders           customer, contact, intake payment, disc count, delivery pref, status
discs (jobs)     per-disc job: fingerprint(expected), assigned operator, tier, outcome, job_id
shipments        inbound + outbound legs: carrier, tracking#, insured_value, status, AirTag id
custody_events   timestamped state transitions w/ evidence refs (photo hashes, scan-in/out)
telemetry_logs   uploaded signed logs: payload_sha256, sig, key_id, receipts_root, verify_status
qc_reviews       sampling + blind-retest reviews: reviewer, result, notes
blind_retests    ground-truth registry: disc fingerprint, known receipts_root, expected outcome
payouts          per-operator statements: line items (tier pay, attempt fees, bonus), period, status
messages         operator <-> HQ threads, attachments
audit_log        every admin action + every state transition (immutable)
```

Notes:
- `discs.fingerprint_expected` is set when HQ ships a disc; the uploaded telemetry's
  `disc.fingerprint` must match it (substitution check, telemetry-spec §7).
- `operator_score` is the predictive composite (custody compliance %, re-verify pass rate, SLA
  hit rate, feedback) from lab-network.md §6 — **not** raw stars.
- Sensitive sub-records (background-check results, payout bank details) live in restricted
  tables with separate access control (§8).

---

## 5. The job lifecycle state machine (chain of custody, enforced)

Custody isn't a log you trust — it's a **state machine where each transition requires
evidence**, so the chain is structurally complete or the job can't advance.

```
order_placed → payment_confirmed → routed(operator)
   → label_sent → in_transit_inbound → received[REQ: arrival photos + scan-in]
   → in_lab → in_recovery → recovery_complete[REQ: signed telemetry log]
   → in_qc → qc_passed | qc_failed→rework
   → files_delivered → return_in_transit[REQ: outbound tracking#, insured]
   → returned → closed
```

- A transition into `received` is rejected without arrival-condition photos (hashes land in
  custody_events).
- `recovery_complete` is rejected without a verified telemetry log for that `job_id`.
- `return_in_transit` is rejected without an insured, tracked outbound shipment.
- **Operator goes dark mid-job:** a watchdog flags jobs stalled past SLA in `in_lab`/`in_qc`;
  triggers the recall/forward protocol (lab-network.md §12) — reassign or pull originals to a
  regional hub. New orders never route to a dark/non-responsive lab.

This state machine is the backbone the lab UI renders and HQ monitors.

---

## 6. API surface (by audience)

**Operator API** (Lab Edition desktop + operator dashboard; auth = install token + signed requests)
```
POST /v1/operator/installs/register        register install + ed25519 pubkey at onboarding
GET  /v1/operator/jobs                      assigned/queued jobs
POST /v1/operator/jobs/:id/custody          submit custody event + photo upload URLs
POST /v1/operator/jobs/:id/telemetry        upload signed RecoveryTelemetryLog (telemetry-spec §3)
POST /v1/operator/jobs/:id/status           advance lifecycle state (validated server-side)
GET  /v1/operator/jobs/:id/audit-challenge  Merkle spot-audit: prove N random LBAs
POST /v1/operator/files                     upload recovered files (presigned object-store PUT)
GET  /v1/operator/payouts                   pay statements
GET/POST /v1/operator/messages              HQ thread
```

**Admin API** (admin dashboard; role-based)
```
applications CRUD + stage transitions; operators CRUD + score/strike/territory grant-revoke
orders + routing override; qc queue + blind-retest seeding; pay runs (compute + approve + export)
anti-cheat flags review; audit_log read
```

**Customer/public API** (web; integrates existing Stripe intake)
```
POST /v1/orders                  create order (replaces Formspree path)
POST /v1/orders/:id/pay          intake payment (Stripe)
GET  /v1/orders/:id              status tracking (token-scoped link)
GET  /v1/orders/:id/files        secure, expiring download of delivered files
```

---

## 7. Subsystems

**Routing engine.** Order → home-metro lab; if `open|busy` capacity exceeded → silent overflow
to nearest lab with capacity; never to `dark`. Maintains the 2–3-deep regional bench so no city
is single-point-of-failure (lab-network.md §12). Capacity from each operator's live
open/busy/dark signal.

**Telemetry ingest + verification.** On upload: verify ed25519 signature against the operator's
registered pubkey (`key_id`); re-canonicalize and re-hash to confirm `payload_sha256`; store;
mark `verify_status`. Reject unsigned/edited logs. This is the shared-crate code path.

**Anti-cheat correlation** (the real net — telemetry-spec §7). Runs on every log:
fingerprint-vs-expected, blind-retest root equality, drive-serial consistency, physics
anomalies (recovery faster than drive read speed; retry_sum vs elapsed mismatch), tier-claim
vs telemetry shape, Merkle spot-audit challenges, and per-operator statistical drift. Anything
suspicious → an admin flag, not an automatic ban.

**Pay engine.** Derives tier (T1/T2/T3) and attempt-fee eligibility **from the verified
telemetry, not operator claims** (telemetry-spec §7 table). Aggregates monthly; applies the +8%
quality bonus when QC pass-rate ≥97% and on-time ≥95%; applies the 20+-disc volume step-down;
produces an approvable payout statement per operator per period.

**QC review queue.** Samples by trust tier (100% probation → 50% → 20% → trusted, permanent
5–10% floor). Injects blind re-test jobs disguised as real orders. Records results into
`operator_score`.

**File + photo storage.** Recovered files and custody photos to object storage; DB holds only
hashes + keys. Customer downloads are short-lived signed URLs. Photo hashes are signed inside
the telemetry log (telemetry-spec §5), making them tamper-evident.

---

## 8. Security, privacy, data retention (high-stakes)

This system holds **irreplaceable customer memories, customer PII, operator PII, and
background-check data.** Treat it accordingly:

- **Encryption at rest** for object storage + Postgres; TLS everywhere.
- **Least-privilege access:** background-check results and payout bank details in restricted
  tables, accessible only to specific admin roles; every access in `audit_log`.
- **Retention policy:** recovered files are deleted from HQ a fixed window after confirmed
  delivery (e.g., 30–60 days) — HQ is a transit point, not a permanent archive (that's the
  consumer vault's job). Document this to customers.
- **Operator key revocation = operator off-boarding** (ties to performance-lease revocation).
- **Immutable audit log** for every state transition and admin action — your liability defense.
- **The catastrophic-loss backstop** (lab-network.md §8): wherever feasible the disc is imaged
  before any recovery attempt, so a "lost" original is never the only copy.

---

## 9. Payments — two directions

- **Inbound (customers):** intake fee + per-disc recovery. Keep **Stripe** (already in use for
  mail-in). The backend owns the order; Stripe is the rail.
- **Outbound (operator payouts):** a new requirement. Recommend **Stripe Connect** (operators
  onboard as connected accounts; payouts run from the pay engine) — keeps one payments vendor.
  Alternatives: Wise / PayPal Payouts. 1099 reporting obligations attach here (lab-network.md
  §11 — manage classification carefully).
- **Lemon Squeezy** stays the consumer *licensing* rail and is unrelated to lab payments —
  don't conflate them.

---

## 10. Integration map

```
Lab Edition desktop ──(operator API, signed)──┐
operator dashboard  ──(operator API)──────────┤
                                              ├──►  HQ Backend (axum) ──► Postgres
heirvo.com order flow ─(customer API)─────────┤        │
admin dashboard ──────(admin API)─────────────┘        ├──► Object storage (R2/S3)
                                                        ├──► Stripe (in) + Stripe Connect (out)
                                                        └──► shared `heirvo-telemetry` crate
                                                              (also compiled into Lab Edition)
```

---

## 11. Phasing

- **Phase 1 — Trust spine.** Operator registry + `operator_keys` + telemetry ingest/verify
  (shared crate) + minimal admin to view verified logs. Lets real operators upload provable
  work before any customer-facing flow exists. Pairs with telemetry-spec Phase 3.
- **Phase 2 — Order + custody.** Order intake (absorb Stripe path), routing engine, the job
  lifecycle state machine, custody events + photo upload, shipments. The operational core.
- **Phase 3 — Pay + QC + anti-cheat.** Pay engine, QC sampling + blind re-tests, the
  correlation checks, Stripe Connect payouts.
- **Phase 4 — Customer + comms.** Customer status portal, secure file delivery, operator↔HQ
  messaging, operator dashboard polish.

Don't build Phase 2+ until Phase 1 proves the trust spine end-to-end with a real operator.

---

## 12. Decisions — resolved

**1. Server language → Rust/axum + shared crate.**
The correctness argument is decisive: canonical-JSON serialization and ed25519 verification
*must* be byte-identical on the producing (desktop) and verifying (server) sides. A TypeScript
re-implementation of that path is a subtle, hard-to-catch bug waiting to happen. Desktop app is
already Rust; shared crate costs almost nothing to extract. Dashboards (admin + operator web)
stay React — those are pure UI and have no cryptographic obligations.

**2. Hosting → Fly.io from day one; Neon for Postgres when Phase 2 needs it.**
Fly.io: single-region machine, simple deployment, good Rust support. SQLite (via sqlx) is
fine for Phase 1 (operator registry + telemetry ingest — minimal write volume, single instance).
When Phase 2 introduces orders + routing + concurrent writes, migrate to **Neon** (serverless
Postgres, generous free tier, branching for dev, connects from Fly). Avoid the Railway lock-in;
Fly.io pricing stays predictable at Phase 1–3 scale (tens of labs, thousands of discs/month).

**3. Operator payout rail → Stripe Connect Express.**
Already on Stripe for customer intake — one vendor. Connect Express: operators onboard in ~2
min, Heirvo controls pay calculation, Stripe handles 1099-NEC reporting and the payout rail.
No second vendor (Wise/PayPal) and no manual ACH orchestration. Lemon Squeezy remains the
consumer *licensing* rail — do not conflate.

**4. Absorb intake timing → run alongside Formspree+Stripe until Phase 2 is proven.**
Current intake is working and revenue-generating. Don't touch it until the HQ routing engine
can actually receive an order and assign it to an operator (Phase 2). Phase 1 builds the trust
spine (operator registry + telemetry verification) in isolation — no customer-facing surface
changes. Absorb intake at the start of Phase 2, replacing Formspree with `POST /v1/orders`.
