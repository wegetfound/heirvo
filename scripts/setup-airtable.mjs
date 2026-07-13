#!/usr/bin/env node
/**
 * setup-airtable.mjs — Run once to create the Heirvo Lab Network Airtable base.
 *
 * Prerequisites:
 *   Personal Access Token with scopes:
 *     schema.bases:write    (to create the base + tables)
 *     data.records:write    (needed by the /labs/apply form)
 *   Workspace ID — visible in your Airtable URL: airtable.com/wsXXXXXXXXX
 *
 * Usage:
 *   AIRTABLE_PAT=patXXX AIRTABLE_WORKSPACE_ID=wspXXX node scripts/setup-airtable.mjs
 *
 * Output:
 *   Prints your BASE_ID. Copy it to VITE_AIRTABLE_BASE_ID in marketing/.env + Cloudflare Pages.
 *   Then create a second PAT scoped to data.records:write on that base only for the form.
 */

const PAT          = process.env.AIRTABLE_PAT;
const WORKSPACE_ID = process.env.AIRTABLE_WORKSPACE_ID;

if (!PAT || !WORKSPACE_ID) {
  console.error("Set AIRTABLE_PAT and AIRTABLE_WORKSPACE_ID before running.");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" };

async function api(method, path, body) {
  const resp = await fetch(`https://api.airtable.com/v0/meta${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`${method} ${path} → ${resp.status}: ${JSON.stringify(err)}`);
  }
  return resp.json();
}

// ── Operators table ────────────────────────────────────────────────────────

const operatorsFields = [
  // ── Pipeline (you fill these) ──
  { name: "Status", type: "singleSelect", options: { choices: [
    { name: "Applied" }, { name: "Reviewing" }, { name: "Vetted" },
    { name: "Active"  }, { name: "Reserve"   }, { name: "Rejected" }, { name: "Paused" },
  ]}},
  { name: "Phase", type: "singleSelect", options: { choices: [
    { name: "A — Active" }, { name: "B — Reserve" },
  ]}},
  { name: "Source", type: "singleSelect", options: { choices: [
    { name: "/labs/apply" }, { name: "Referral" }, { name: "LinkedIn" }, { name: "Direct outreach" },
  ]}},
  { name: "Internal rating", type: "singleSelect", options: { choices: [
    { name: "Strong" }, { name: "Pass" }, { name: "Hold" }, { name: "Reject" },
  ]}},
  { name: "Screener notes",       type: "longText" },
  { name: "Applied date",         type: "date", options: { dateFormat: { name: "local" } } },
  { name: "Interview date",       type: "date", options: { dateFormat: { name: "local" } } },
  { name: "Vetted date",          type: "date", options: { dateFormat: { name: "local" } } },
  { name: "Activated date",       type: "date", options: { dateFormat: { name: "local" } } },
  { name: "Agreement sent",       type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "Agreement signed",     type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "Background check done",type: "checkbox", options: { icon: "check", color: "greenBright" } },

  // ── Form: A — Identity ──
  { name: "Full name", type: "singleLineText" },
  { name: "Email",     type: "email"          },
  { name: "Phone",     type: "phoneNumber"    },
  { name: "Metro", type: "singleSelect", options: { choices: [
    { name: "New York"          }, { name: "Los Angeles"   }, { name: "Chicago"        },
    { name: "Dallas–Fort Worth" }, { name: "Houston"       }, { name: "Atlanta"        },
    { name: "Phoenix"           }, { name: "Miami"         }, { name: "Washington DC"  },
    { name: "Seattle"           }, { name: "Other"         },
  ]}},
  { name: "ZIP",                        type: "singleLineText" },
  { name: "Over 18 / eligible to work", type: "checkbox", options: { icon: "check", color: "greenBright" } },

  // ── Form: B — Workspace ──
  { name: "Workspace description",  type: "longText" },
  { name: "Is workspace lockable?", type: "singleSelect", options: { choices: [
    { name: "Yes — it locks now" }, { name: "No — but I can make it so" }, { name: "No" },
  ]}},
  { name: "Others share the space?", type: "singleSelect", options: { choices: [
    { name: "No — it's mine alone" }, { name: "Sometimes (family, housemates)" }, { name: "Yes, regularly" },
  ]}},

  // ── Form: C — Experience ──
  { name: "Optical/recovery experience",      type: "longText" },
  { name: "Tools used", type: "multipleSelects", options: { choices: [
    { name: "ddrescue" }, { name: "IsoBuster" }, { name: "Exact Audio Copy" },
    { name: "VLC" }, { name: "HandBrake" }, { name: "CDCheck" },
    { name: "Never used these" }, { name: "Other" },
  ]}},
  { name: "Drives currently owned",           type: "singleLineText" },
  { name: "Willing to buy ~$140–200 own gear?", type: "singleSelect", options: { choices: [
    { name: "Yes" }, { name: "Need to learn more before deciding" }, { name: "No" },
  ]}},
  { name: "Computer & OS", type: "singleLineText" },

  // ── Form: D — Temperament ──
  { name: "Irreplaceable item scenario", type: "longText" },
  { name: "Damage scenario",             type: "longText" },
  { name: "Hopeless disc scenario",      type: "longText" },
  { name: "Detail/repetition scenario",  type: "longText" },

  // ── Form: E — Reliability ──
  { name: "Hours/week available", type: "singleSelect", options: { choices: [
    { name: "2–5 hrs/week" }, { name: "5–10 hrs/week" }, { name: "10–20 hrs/week" }, { name: "20+ hrs/week" },
  ]}},
  { name: "How long looking to do this?", type: "singleSelect", options: { choices: [
    { name: "Just trying it out" }, { name: "6 months+" }, { name: "1 year+" }, { name: "Long term" },
  ]}},
  { name: "Why this work specifically?", type: "longText"        },
  { name: "How did you hear?",           type: "singleLineText"  },

  // ── Form: F — Consents ──
  { name: "Willing to complete background check", type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "Understand IC work",                   type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "Understand territory model",           type: "checkbox", options: { icon: "check", color: "greenBright" } },
];

// ── Jobs table ─────────────────────────────────────────────────────────────

const jobsFields = [
  // Operator link added in a second pass after both tables exist
  { name: "Customer ref", type: "singleLineText" },
  { name: "Metro", type: "singleSelect", options: { choices: [
    { name: "New York" }, { name: "Los Angeles" }, { name: "Chicago" },
    { name: "Dallas–Fort Worth" }, { name: "Houston" }, { name: "Atlanta" },
    { name: "Phoenix" }, { name: "Miami" }, { name: "Washington DC" }, { name: "Seattle" },
  ]}},
  { name: "Disc type", type: "singleSelect", options: { choices: [
    { name: "DVD" }, { name: "CD-R" }, { name: "CD Audio" }, { name: "Blu-ray" },
    { name: "Photo CD" }, { name: "VHS" }, { name: "Other" },
  ]}},
  { name: "Status", type: "singleSelect", options: { choices: [
    { name: "Assigned" }, { name: "In Progress" }, { name: "Submitted" },
    { name: "QC Review" }, { name: "Complete" }, { name: "Failed" }, { name: "Cancelled" },
  ]}},
  { name: "Assigned date",  type: "date", options: { dateFormat: { name: "local" } } },
  { name: "Completed date", type: "date", options: { dateFormat: { name: "local" } } },
  { name: "Pay amount",     type: "currency", options: { precision: 2, symbol: "$" } },
  { name: "Invoice received", type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "Paid",             type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "Notes", type: "longText" },
];

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("Creating Heirvo Lab Network base…");

  const base = await api("POST", "/bases", {
    name: "Heirvo Lab Network",
    workspaceId: WORKSPACE_ID,
    tables: [
      { name: "Operators", fields: operatorsFields },
      { name: "Jobs",      fields: jobsFields      },
    ],
  });

  const operatorsTable = base.tables.find(t => t.name === "Operators");
  const jobsTable      = base.tables.find(t => t.name === "Jobs");

  console.log("Linking Jobs → Operators…");
  await api("POST", `/bases/${base.id}/tables/${jobsTable.id}/fields`, {
    name: "Operator",
    type: "multipleRecordLinks",
    options: { linkedTableId: operatorsTable.id },
  });

  console.log("\n✅ Base created.\n");
  console.log(`  Base ID:         ${base.id}`);
  console.log(`  Operators table: ${operatorsTable.id}`);
  console.log(`  Jobs table:      ${jobsTable.id}`);
  console.log(`
Next steps:
  1. Add to marketing/.env and Cloudflare Pages dashboard:
       VITE_AIRTABLE_BASE_ID=${base.id}
  2. Create a second PAT scoped ONLY to data.records:write on base ${base.id}
       (this is the one that goes in VITE_AIRTABLE_PAT — write-only keeps it safe in the bundle)
  3. Add views in Airtable:
       Operators → New applications (Status=Applied, newest first)
       Operators → Full pipeline (grouped by Status)
       Operators → Active bench (Status=Active or Reserve, grouped by Metro)
       Jobs      → Jobs tracker (grouped by Status)
       Jobs      → Unpaid (Status=Complete, Paid=false)
  4. Optionally add Rollup fields on Operators:
       "Jobs completed" = COUNT linked Jobs where Status=Complete
       "Total paid"     = SUM Pay amount where Paid=true
`);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
