# Heirvo — Design Competition Brief

**Audience:** Design agents implementing the Heirvo landing page
**Product:** Disc recovery software for Windows — recovers family photos and videos from damaged DVDs, CDs, and Kodak Photo CDs
**Primary buyer persona:** Adult children (35–55) doing this task for aging parents; the disc belongs to Mom or Dad, the buyer is the adult child, and the emotional weight of failure is "losing irreplaceable family history forever"

---

## 1. Five Visual Techniques Winning Awards Right Now

### 1.1 Dark Canvas + Noise Grain + Radial Spotlight ("The Linear Look")

The defining aesthetic of premium software sites in 2024–2025. A near-black background (never pure #000 — use #0a0a0f or #0c0c10) gets a fine-grained SVG noise texture at ~8–12% opacity, using `feTurbulence` + `feColorMatrix` blended at `overlay` or `soft-light`. Over this sits a radial gradient "spotlight" that appears to emanate from the hero product image or headline — `radial-gradient(ellipse 60% 40% at 50% 0%, rgba(120,80,255,0.18), transparent 70%)`. Hairline 1px borders on cards use `border: 1px solid rgba(255,255,255,0.08)`.

**Who uses it:** Linear.app, Raycast.com, Resend.com, Turso.tech, Clerk.dev — virtually every developer-tooling site that has won a Hoverable/Awwwards honorable mention since mid-2023.

**Why it wins:** Noise breaks the "void" flatness of pure dark backgrounds. It reads as tactile and premium without adding visual weight. Judges flag it as "confident restraint."

**For Heirvo:** Use a warmer spotlight tint — amber-sepia `rgba(200,150,80,0.12)` instead of purple-blue — to evoke the warmth of analog memory. Keep the disc label art as the focal radiant source.

### 1.2 Bento Grid Feature Section

Apple popularised this at WWDC 2023 and every major SaaS award winner followed in 2024. Features are presented as asymmetric cards on a grid: one 2×2 hero card (the product's signature capability), flanked by 1×1 and 1×2 supporting tiles. Each card contains a small animated UI fragment, not a full screenshot. Cards have `border-radius: 16px`, subtle drop shadow, and `backdrop-filter: blur(12px)` glass backgrounds when layered over gradient sections.

**Who uses it:** Linear (feature grid below hero), Vercel, Supabase, Raycast. CSS Design Awards 2024 gave WOTDs to at least three sites using this pattern.

**Why it wins:** It reduces a long feature list into a single scannable spread. Judges reward information density done tastefully.

**For Heirvo:** One 2×2 card showing the recovery progress screen with a damaged disc thumbnail resolving to a photo. Supporting tiles: format support icons (DVD, CD, Kodak Photo CD), estimated recovery time meter, "Safe read-only — original disc untouched" trust badge.

### 1.3 Horizontal Pinned Scroll ("Cinematic Scroll")

A page section where vertical scrolling drives horizontal movement inside a pinned container. Used as a before/after storytelling device or a product walkthrough. The inner container is typically 300–400vw wide; `ScrollTrigger` pins the outer wrapper while a GSAP tween moves `x` from `0` to `-300vw`. At each 100vw breakpoint a new narrative beat appears with a clip-path or opacity reveal.

**Who uses it:** basement.studio's own site (they built the `scrollytelling` React/GSAP library to componentise this pattern). Widely cloned across Awwwards nominees throughout 2024.

**Why it wins:** It converts a flat page into a "ride" — the user feels like they're being taken through a story. Awwwards jury notes cite "spatial narrative" as a specific quality they reward.

**For Heirvo:** Three pinned beats: (1) "The disc is damaged" — close-up of scratched disc under a warm light; (2) "Heirvo reads every readable sector" — animated sector map of the disc; (3) "92 photos recovered" — family photos materialising from noise.

### 1.4 Typography-First Hero with Variable Font Animation

Award-winning hero sections in 2024–2025 lead with one large headline that moves rather than a product screenshot. The font weight, tracking, or optical size interpolates on scroll or on load — requires a variable font (e.g. Geist, Inter Variable, or GT Alpina). Combined with `SplitText` char-level stagger: each letter fades up with `y: 20, opacity: 0` stagger `0.03s`, `ease: power3.out`.

**Who uses it:** Resend.com ("Email for developers" headline enters on load with weight morph), Loom's redesigned homepage, basement.studio, Vercel.

**Why it wins:** Judges at Awwwards explicitly score "typography" as a separate criterion. A headline that breathes on load signals intentionality. Most competitors skip this.

**For Heirvo:** Headline: "Recover the moments\nyou thought were gone." — two-line, 72–96px, medium weight resolving to bold over 0.8s on page load. Subheadline fades in 200ms after the last character lands.

### 1.5 Ambient Product Video Loop (No Controls, No Sound)

Not a demo video — a 10–15 second seamless loop that shows the product doing something beautiful. Typically 1080p, `autoplay muted loop playsInline`, with a `poster` frame for the LCP. Placed inside the hero below the headline, either full-bleed or inside a device mockup frame. The video loop becomes the "living proof" that the product works, avoiding the need for "See how it works" CTAs in the above-the-fold zone.

**Who uses it:** Linear's app walkthrough loop, Loom's recording demo loop, Figma collaboration loop. CSS Design Awards judges repeatedly cite "product motion" as a differentiator for software sites.

**For Heirvo:** A 10s loop: damaged disc inserted → Heirvo scanning bar sweeps → thumbnails of old family photos populating a grid, the last one a holiday photo that fills the screen and holds for 1.5s before looping. Warm grade, slight film grain overlay.

---

## 2. Three GSAP Animation Techniques for Award-Winning Sites

### 2.1 ScrollTrigger + Pinned Section with Scrub

The foundational technique. A section is pinned (`pin: true`) while a timeline plays at `scrub: 0.5` (half-second lag creates the fluid, "thick" feel rather than the jerky real-time of `scrub: true`). The timeline controls: clip-path expansion, opacity cascades, and `x`/`y` movements. Critical detail: always set `anticipatePin: 1` to prevent the half-frame jump when pinning engages.

```js
ScrollTrigger.create({
  trigger: "#recovery-section",
  start: "top top",
  end: "+=300%",
  pin: true,
  anticipatePin: 1,
  scrub: 0.5,
  animation: recoveryTimeline
});
```

**For Heirvo:** Pin the "sector scan" beat — disc rotates slowly while the read-head sweeps, synced to scroll. Each 33% of scroll distance = one recovery phase (read → analyse → export).

### 2.2 SplitText Staggered Char/Word Reveals

GSAP's `SplitText` plugin (now free after Webflow acquired GreenSock) splits headlines into individual characters or words, each becoming an independently animatable element. Paired with a `fromTo` tween and `stagger` on a `ScrollTrigger` `onEnter`, it produces the "letters assembling" reveal seen across virtually every award-winning SaaS page since 2023.

```js
const split = SplitText.create(".section-headline", { type: "chars,words" });
gsap.from(split.chars, {
  scrollTrigger: { trigger: ".section-headline", start: "top 85%" },
  opacity: 0,
  y: 30,
  rotateX: -40,
  stagger: 0.025,
  duration: 0.7,
  ease: "power3.out"
});
```

**For Heirvo:** Apply to every section headline. The hero headline uses a load-triggered version (no ScrollTrigger, fires on `DOMContentLoaded` after 300ms delay). Section headers use the ScrollTrigger version.

### 2.3 Clip-Path Wipe Reveals for Images and Cards

`clip-path: inset(100% 0 0 0)` (fully hidden from bottom) animating to `inset(0% 0 0 0)` (fully revealed) with `ease: power2.inOut` creates the "curtain lifts to reveal" effect used by basement.studio, Saisei, and numerous Awwwards SOTD winners. Far more editorial than a simple `opacity` fade. Works with `will-change: clip-path` for GPU compositing.

```js
gsap.fromTo(".photo-card", 
  { clipPath: "inset(100% 0 0 0)" },
  {
    clipPath: "inset(0% 0 0 0)",
    duration: 0.9,
    ease: "power2.inOut",
    stagger: 0.12,
    scrollTrigger: { trigger: ".photo-grid", start: "top 75%" }
  }
);
```

**For Heirvo:** Use wipe reveals for the "recovered photos" grid — each family photo wipes up from the bottom, as if printing from a photo developer. 0.12s stagger across a 3×3 grid = 1.08s total reveal. Deeply satisfying.

---

## 3. Emotional Design Angle for "Family Memories"

### The Core Psychological Frame

The user is not buying software. They are buying the last chance to not fail their parent. The disc contains evidence that the parent existed as a young person — wedding photos, childhood footage, holiday Super 8 transfers — and it is deteriorating. The adult child knows this and has been putting the recovery off because it feels too important to risk.

**This is anticipated regret, not FOMO.** It is different from urgency in the traditional conversion sense. The buyer is already motivated; they are hesitating because of perceived technical complexity and fear of making the disc worse. Good emotional design must resolve that hesitation, not amplify the dread.

### What Winning Emotional Sites Do (Artifact Uprising, 23andMe, Journi)

- **Identity before product.** Lead with "You're someone who doesn't let things slip away." Frame the purchase as consistent with who the buyer already believes themselves to be — the responsible sibling, the one who keeps the family history. Artifact Uprising does this by showing the physical object (a photo book) in beautiful hands, not on a white table — the product exists in relation to a person.

- **Specificity over abstraction.** "Your parents' wedding day" beats "precious memories." "The Super 8 footage your dad transferred to DVD in 1998" beats "important files." Specificity triggers episodic memory and increases perceived relevance. 23andMe uses "discover 1,500+ geographic regions" rather than "learn about your ancestry."

- **Completeness as the emotional payoff.** The conversion moment is framed not as "buy the software" but as "finish the job." The CTA language that works for this persona: "Recover my family's photos" rather than "Download free trial." The action is the emotional resolution — the buyer imagines the moment they hand the recovered photos to their parent.

### Tone: Warm Technical Confidence

Do not wallow. Do not use stock imagery of sad people holding old photographs. The emotional note should be quiet and assured — like a craftsman who has done this a thousand times handing you back something you thought was lost. Copy tone: competent, warm, unhurried. Visual tone: warm amber and sepia accents on a controlled dark background. Avoid grief aesthetics; choose recovery aesthetics.

---

## 4. Three Monetization UX Patterns for Emotional Purchases

### 4.1 The Gift Flow with Recipient Framing

Present a prominent secondary CTA alongside "Get Heirvo" that reads: "Buy for a parent" or "Give as a gift." This flow changes the recipient's name field (shown on the licence confirmation screen), adds a brief optional message, and frames the confirmation email differently — "You just gave someone their memories back."

This pattern is used by Artifact Uprising (every product page has a "Give as a gift" option), Framebridge, and Ancestry.com's kit gifting. It converts a hesitating buyer who thinks "I should do this for my parents but haven't set aside time" into an immediate purchase because the decision frame shifts from "project I'll do later" to "gift I'm giving now." The buyer doesn't have to commit to doing the recovery themselves — they've discharged the obligation by purchasing.

**Implementation:** On the pricing page, show two cards side by side: "For me" / "Gift for a parent." The "Gift" card is visually softer (warm sepia tint, slightly smaller). Selecting it opens a two-field form (recipient name + optional message). The checkout total and feature set are identical.

### 4.2 Seasonal Urgency Trigger (Real Deadline, Not Fake Timer)

Target Mother's Day and Father's Day with a landing page variant that leads with: "Father's Day is June 15. Recover his photos before then." The urgency is genuine — it is a real calendar date the buyer was already thinking about — and the product is a perfect fit for a last-minute meaningful gift. This is the seasonal trigger pattern used by Mixbook, Chatbooks, and Shutterfly, all of which run dedicated landing pages per holiday.

**Implementation:** A thin persistent banner above the nav (dismissible) that appears from May 25–June 14 reading: "Father's Day: June 15 — give back his old photos." Banner links to a `/gift` landing page variant. The banner itself converts cold visitors who arrived via SEO and hadn't considered the gifting angle.

### 4.3 Identity-Based Tier Upsell ("The Archivist")

Name the premium tier something that flatters the buyer's self-concept. "Archivist" or "Family Historian" tier (vs. standard "Essential" tier) signals that the buyer is the kind of person who takes care of these things properly. Include one premium-tier feature that is easy to explain and emotionally resonant: "Kodak Photo CD support" (a format their parents definitely used) or "Automatic AI filename tagging — photos named by date and faces detected." Mention that the Archivist tier comes with a printed recovery certificate they can give to their parent.

This is the pattern Ancestry.com uses with its "All Access" tier (framing you as a serious genealogist, not a casual browser), and that 23andMe uses with its Health + Ancestry bundle (you're the responsible type who gets the full picture). The mechanism: buyers already motivated by identity will self-select into the tier that validates the identity they want to inhabit.

**Pricing signal:** The Archivist tier should be positioned at 1.6–1.8× the Essential price — close enough that the extra cost feels trivial given the emotional stakes, but visually distinct enough to feel like a choice.

---

## Quick Reference: Implementation Priorities

| Priority | Technique | Effort | Emotional Payoff |
|----------|-----------|--------|-----------------|
| 1 | SplitText hero headline reveal | Low | High — sets the tone immediately |
| 2 | Dark canvas + noise + warm spotlight | Low | High — premium signal, trust |
| 3 | Clip-path wipe for photo grid | Medium | Very high — mirrors the recovery metaphor |
| 4 | Bento grid feature section | Medium | Medium — reduces cognitive load |
| 5 | Gift flow CTA on pricing page | Low | Very high — largest conversion lift |
| 6 | Pinned horizontal scroll narrative | High | High — but skip if timeline is tight |
| 7 | Ambient product video loop | High | Medium — nice-to-have, not blocking |

---

*Brief prepared: 2026-05-21. Sources: Awwwards, CSS Design Awards analysis; frontend.horse "The Linear Look"; GSAP official docs; basement.studio Scrollytelling library; Artifact Uprising, 23andMe, Mixbook conversion patterns.*
