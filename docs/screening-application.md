# Heirvo Lab Network — Screening Application (Stage 1)

> The intake form behind the `/labs` "Apply" CTA. This is **Stage 1** of the five-stage
> funnel (lab-network.md §4): application + self-selection. It is **not** the validated
> integrity instrument (Stage 2) or the paid trial (Stage 3) — its job is to filter for
> temperament, confirm the basics, and surface the few hard auto-rejects cheaply.
>
> **Status:** design spec. Feeds the `applications` table (lab-hq-backend-spec.md §4) and the
> recruit page (marketing/src/pages/Labs.tsx).

---

## Design principles

- **Screen for temperament and honesty, not résumé.** The standardized hardware + software
  flattens technical skill; the failure mode that matters is losing/damaging an irreplaceable
  original (lab-network.md §1). The behavioral questions carry the real signal.
- **Cheap to submit, cheap to grade.** Stage 1 should reject obvious non-fits and pass
  promising candidates to the (more expensive) integrity screen — not make the final call.
- **Self-selection is a feature.** The questions themselves should make a careless person
  bounce. Asking for a workspace photo and an "irreplaceable item" story quietly filters out
  people who treat this as casual gig work.
- **Tech-tinkerer aware.** The recruit page targets the r/DataHoarder / preservation crowd, so
  capture optical-drive experience — but as *context, not a gate* (we don't reject a careful
  person who's new to drives).

---

## Sections & fields

### A. Identity & territory
| Field | Type | Purpose / screen |
|---|---|---|
| Full name | text | identity |
| Email | email | contact; dedup |
| Phone | tel | contact |
| Metro / city | select (founding metros) + free text | **territory routing** — maps to an open/bench territory; "no open territory" is a soft hold, not a reject |
| ZIP | text | territory boundary + shipping distance |
| Over 18 / legally able to work in US | checkbox (required) | eligibility gate |

### B. Workspace (self-selection lever)
| Field | Type | Purpose / screen |
|---|---|---|
| Describe your dedicated work area | textarea | conscientiousness; is it real and single-purpose |
| Is it lockable / can you restrict access? | radio (Yes / No / Can make it so) | **acceptance-bar requirement** (lab-network.md §5) |
| Do others share this space? | radio + detail | unauthorized-access risk |
| **Photo of the intended workspace** | file upload (required) | the single biggest self-selection filter — careless applicants won't bother |

### C. Experience & setup (context, not gate)
| Field | Type | Purpose / screen |
|---|---|---|
| Optical-drive / recovery experience | textarea | tech context; depth |
| Have you used ddrescue, IsoBuster, or similar? | multiselect + "never" | tooling familiarity |
| Drives you currently own (if any) | textarea | how close to the Pioneer+LiteOn rig; secondhand-OK framing |
| Comfortable buying ~$140–200 of your own gear from third parties? | radio (Yes / Need to learn more / No) | skin-in-the-game fit; "No" is a likely soft-reject |
| Computer/OS you'd use | text | Windows requirement check |

### D. Temperament & integrity scenarios (the real signal — graded)
| Prompt | Type | What it reveals |
|---|---|---|
| **"Describe a time you were responsible for something irreplaceable that belonged to someone else."** | textarea (required) | the cornerstone question — care, ownership, stakes-awareness |
| **"Walk through exactly what you'd do if you realized you had just damaged a customer's only disc."** | textarea (required) | honesty under failure; do they hide it or escalate it? |
| "A disc you're working on seems hopeless after hours of effort. What do you do?" | textarea | persistence vs. quitting; matches the attempt-fee ethos |
| "How do you keep track of small, detailed, repetitive steps so nothing slips?" | textarea | conscientiousness; systems-mindedness |

### E. Reliability & motivation
| Field | Type | Purpose / screen |
|---|---|---|
| Hours/week you can commit | select | capacity for routing/SLA |
| How long are you looking to do this? | select | churn risk (front-load support; lab-network.md §4 churn note) |
| Why this work specifically? | textarea | mission/meaning vs. pure gig — meaning-driven operators handle care better |

### F. Consents & acknowledgments (gates)
| Field | Type | Purpose |
|---|---|---|
| Willing to complete a background check if advanced | checkbox (required) | acceptance-bar requirement |
| Understand this is independent-contractor work (your own hours, your own gear, your own taxes) | checkbox (required) | classification posture (lab-network.md §11) |
| Understand territory is **earned via a paid trial and granted, never purchased** | checkbox (required) | sets expectations; reinforces no-fee/no-franchise framing |
| How did you hear about us? | text (optional) | attribution |

---

## Scoring rubric (Stage-1 grade)

Grade the four Section-D scenarios + workspace on a simple 0–2 scale each; the application is a
**pass/hold/reject**, not a precise score.

- **Auto-reject (any one):**
  - Section D failure-handling answer that **hides or conceals** the damage rather than
    disclosing it (the integrity tell — lab-network.md §4).
  - No lockable/securable workspace **and** unwilling to create one.
  - Unwilling to do a background check, or not eligible to work.
  - Treats the items as commodities / dismissive tone toward the "irreplaceable" prompts.
- **Soft hold (advance later / waitlist):**
  - Promising temperament but **no open territory** in their metro → bench waitlist.
  - Unsure about buying gear → nurture, don't reject.
- **Advance to Stage 2 (integrity instrument):** real, securable workspace + thoughtful,
  honest scenario answers + willing on background check + a genuine motivation.

> The application **never** grants a territory or makes the hire. It gates entry to the
> validated integrity screen (Stage 2) and the paid trial disc (Stage 3), which carry the
> real predictive weight.

---

## Implementation notes

- **Frontend:** a form on the recruit page (or `/labs/apply`), same design system. Until the HQ
  backend exists, the CTA can post to the existing Formspree/email path (mirrors how Beta.tsx
  gates `DOWNLOAD_URL`); the workspace photo can be requested as a reply attachment in the
  interim.
- **Backend (Phase 2+):** `POST /v1/orders`-style `POST /v1/applications` writes an
  `applications` row (stage = `submitted`), stores the workspace photo to object storage
  (hash + key), and surfaces it in the admin screening queue.
- **Privacy:** this collects PII (name, contact, location, photo). Handle per
  lab-hq-backend-spec.md §8 — restricted access, retention limits, deletion on reject after a
  grace window.
- **Anti-spam:** rate-limit + a simple honeypot; this is a low-volume, high-intent funnel, so
  keep friction human, not captcha-heavy.
