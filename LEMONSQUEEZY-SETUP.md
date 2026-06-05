# LemonSqueezy setup — Heirvo tiers

How to configure LemonSqueezy so the three Heirvo tiers activate correctly.
Grounded in how the app actually validates licenses — not generic advice.

---

## How a sale flows through Heirvo

1. Customer clicks **Buy** → opens the LS **checkout URL** for that tier.
2. LS charges them and **emails a license key**.
3. Customer pastes the key into Heirvo → the app calls LS `activate`, gets back
   the key's **`product_id`**, and maps it to a tier using IDs **compiled into
   the app** at build time.
4. Match → tier unlocks. No match → *"Unknown product id — this key is not for
   Heirvo."*

So three things MUST agree:
**the product behind the checkout link → its `product_id` → the ID baked into the build.**

The app does NOT need a LemonSqueezy API key. `activate` / `validate` /
`deactivate` authenticate with the license key itself.

---

## The tiers (what the code enforces)

| Tier | Price | Unlocks |
|---|---|---|
| **Free** | — | Full recovery + preview + **1 lifetime export** |
| **Recover** | $59 | Unlimited save/export (MP4, ISO, files, audio, burn) |
| **Archive** | $99 | Recover + import personal media + tamper-evident SHA-256 manifest |
| **Family** | $149 | Archive + **more device seats** (see activation limits) |

> Family's only differentiator today is **device seats**. "Multi-user / cloud
> sync" is NOT built — do not advertise it as included.

---

## Step 1 — Create 3 products

One product per tier (NOT variants of one product — each needs its own
`product_id`). One-time payment, **not** a subscription.

| Product | Price | Type |
|---|---|---|
| Heirvo Recover | $59 | One-time |
| Heirvo Archive | $99 | One-time |
| Heirvo Family | $149 | One-time |

## Step 2 — Enable License Keys per product

In each product → enable **"Generate license keys"**, then set:

| Setting | Recover | Archive | Family |
|---|---|---|---|
| **Activation limit** (= devices) | **1** | **2** | **5** |
| **License length** | Never expires | Never expires | Never expires |

- **Activation limit IS the Family differentiator.** It makes the in-app
  promise "use on up to 5 of your devices" true. Set exactly 1 / 2 / 5.
- **Never expires:** a one-time purchase must yield a perpetual key. If a key
  expires, Heirvo downgrades that user to Free.

## Step 3 — Match product IDs to the build (critical)

The app has these compiled in via `.env.heirvo` (gitignored, never committed):

```
HEIRVO_LS_RECOVER_PRODUCT_ID = 1047171
HEIRVO_LS_ARCHIVE_PRODUCT_ID = 1062653
HEIRVO_LS_FAMILY_PRODUCT_ID  = 1062663
```

Each product has a numeric `product_id` (LS dashboard → product → it's in the
URL / API). **These must equal the values above.** If you create new products
and they get new IDs, you must update `.env.heirvo` **and do a fresh production
build** — the IDs are baked into the binary at build time, not read at runtime.

## Step 4 — Point checkout links at the right products

The app's tier buttons link to (`src/screens/settings/Settings.tsx`):

```
Recover → https://heirvo.lemonsqueezy.com/checkout/buy/a98b575c-fe61-48ee-835f-984b590ec4e2
Archive → https://heirvo.lemonsqueezy.com/checkout/buy/61a31119-78f7-4612-ade8-d9897eaf7015
Family  → https://heirvo.lemonsqueezy.com/checkout/buy/b7b36e1f-e286-4508-b58b-2ec90ea4a75e
```

Confirm each UUID is the checkout link of the matching product above. Note: the
in-app paywall's main button (`src/screens/dashboard/ProPaywallModal.tsx`,
`BUY_URL`) currently goes to `https://heirvo.com/download` — decide whether that
should deep-link to a tier checkout or a pricing page instead.

Prices are mirrored in `src/lib/pricing.ts` ($59 / $99 / $149) — keep them in
sync with LS.

---

## ⚠️ Test mode vs Live mode — the #1 mistake

LemonSqueezy has **separate Test and Live modes**: different products, different
`product_id`s, different checkout links, different keys. A test key will NOT
work on a live build, and vice-versa.

- **Testing now:** use Test mode + test card `4242 4242 4242 4242`.
- **Before selling for real:** the product IDs in `.env.heirvo` AND the checkout
  URLs in `Settings.tsx` must ALL be **Live mode**, then do a fresh production
  build.

### How to check which mode you're in (30 seconds)
1. LS dashboard → top-left has a **Test / Live toggle**. Note which you're in.
2. Open each **product** — a test-mode product shows a "Test" badge.
3. Open a checkout URL **in your browser** — a test checkout shows a yellow
   **"Test Mode"** banner across the top. (Automated fetches get 403, so this
   must be done in a real browser.)
4. The current IDs (`1047171`, …) were created during earlier testing, so they
   are very likely **Test** IDs — assume you need Live products + a rebuild
   before launch unless you confirm otherwise.

---

## Test the full loop (in Test mode first)

1. Buy a test product with card `4242 4242 4242 4242` → receive a test key.
2. Paste into Heirvo → confirm the correct tier unlocks:
   - Recover → Save/export works
   - Archive → also import media + the Archive manifest button is active
   - Family → also activates on a 2nd (and up to 5th) machine
3. Click **Deactivate** in-app → confirm it frees a seat → re-activate.

---

## Ongoing: "activation limit reached" support case

Every install consumes a seat; reinstalls without deactivating burn them. When a
customer hits the limit (new PC, reinstall):
LS dashboard → product → **License keys** → find the key → delete an old
activation/instance. The app already tells users to email support for this.

Tip: tell customers to click **Deactivate** in-app before uninstalling — it
frees the seat automatically.

---

## Pre-sale checklist

- [ ] 3 products created (Recover / Archive / Family), one-time $59 / $99 / $149
- [ ] License keys enabled; activation limits **1 / 2 / 5**; never-expire
- [ ] Product IDs in `.env.heirvo` match the **Live** products
- [ ] Checkout URLs in `Settings.tsx` point to the **Live** products
- [ ] Everything in **Live mode**, then a fresh production build
      (`npm run tauri build` with `.env.heirvo` loaded)
- [ ] Test-mode dry run passed (buy → activate → correct tier → deactivate)
- [ ] Decide where the paywall `BUY_URL` should point
