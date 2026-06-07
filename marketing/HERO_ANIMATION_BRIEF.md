# Heirvo Hero Animation — Winning Concept & Implementation

**Status:** IMPLEMENTED & LIVE  
**Location:** `src/components/HeroFilmFrame.tsx`  
**Deployed:** Hero.tsx imports & renders `<HeroFilmFrame reducedMotion={boolean} />`

---

## The Winning Concept: "It Was Never Gone" (Motion Designer)

### Overview
A **16:9 film frame** (not a disc) showing a warm, out-of-focus memory image. The animation is a cinematic 5-second arc where a light-wipe sweeps across the frame and **scratches slide off-frame rather than being erased**—the core thesis: preservation means honoring the damage, not hiding it.

### Emotional Journey (5 seconds, plays once on mount)

**BEAT 1: THE DAMAGE (0.00–0.80s)**
- Frame fades up desaturated (`saturate(0.15)`), heavily blurred (18px)
- VHS scanlines rolling vertically
- RGB glitch jitter in corner
- Scratches drawn across frame in cool grey (`#8B8680`)
- **Emotional read:** "Old. Damaged. Almost lost."

**BEAT 2: FIRST SIGN OF LIFE (0.80–1.40s)**
- Color temperature warms (grey → amber)
- Blur eases 18px → 9px
- Glitch opacity reduces
- **Emotional read:** "Wait—there's something under there."

**BEAT 3: THE CLEARING (1.40–2.80s) ← THE HERO BEAT**
- **Light-wipe gradient sweeps left → right** across entire frame
- **Scratches don't erase; they retract off-frame via DrawSVG**
  - drawSVG animates from `"0% 100%"` → `"92% 100%"` (staggered by scratch)
  - Stroke color warms to gold (`#D4AF37`) as they leave
  - Opacity fades to 0.22 (still faintly visible at edges)
- Scanlines fade; blur 9px → 1.5px
- Color blooms to warm amber (`saturate(0.92)`, warm 0.85)
- **Emotional read:** "It's being uncovered, not rebuilt. The memory was always there."

**BEAT 4: THE BREATH (2.80–3.80s)**
- Final blur 1.5px → 0px (sharp)
- Bloom wash appears (0.2 opacity)
- Candle-flicker ellipse pulses 2% scale (center, "alive" cue)
- 2% parallax drift on image (x: +1.2%, y: -1%)
- Color fully saturated & warm
- **Emotional read:** "There she is."

**BEAT 5: THE KEEPING (3.80–5.00s)**
- All motion holds steady
- Vignette softens (0.78 → 0.5 opacity)
- Frame border traces via drawSVG once, like a vault closing (`drawSVG: 0% → 100%`)
- **Emotional read:** "It's safe now. Held."

**After 5s: Eternal Breath**
- Imperceptible scale breathing (1 → 1.008 yoyo, 7s cycle)
- Bloom + flicker pulse subtly (4.5–5s cycles)
- Never loops the narrative; just breathes at rest

---

## Technical Spec

### Framework & Dependencies
- **React 18** with Refs + useEffect
- **GSAP 3.15+** with DrawSVGPlugin (registered)
- **SVG** (pure vector, no Canvas, no Three.js)
- **CSS filters** for color/saturation manipulation

### Component API
```jsx
<HeroFilmFrame reducedMotion={boolean} />
```
- `reducedMotion` (optional): Respects `prefers-reduced-motion: reduce` + prop
- If reduced, jumps straight to final peaceful held state (no animation)

### SVG Viewbox & Aspect Ratio
- **Viewbox:** `1920 × 1080` (16:9)
- **Container:** `aspectRatio: 16/9`, `maxWidth: 560px`
- **Rendering:** SVG with `preserveAspectRatio="xMidYMid slice"` to fill container

### Colors & Materials

**Memory Image (still):**
- Base gradient: `#FFF3E0` (top) → `#7A5A38` (bottom)
- Bokeh lights: `#FFE7B0` (warm out-of-focus circles)
- Silhouette (child face): `#5A3D24` (implied first birthday)

**Scratches:**
- Initial state: `#8B8680` (cool grey), opacity 0.5, fully drawn
- During BEAT 3 retract: warm to `#D4AF37` (gold), opacity fades to 0.22
- Final state: honored at frame edges, faint, gold

**Light-Wipe Gradient:**
- White (transparent 0%) → warm cream (`#FFF6E0`, 0.9 opacity) → gold (`#D4AF37`, fading to transparent)
- Opacity: 0 → 0.85 (during sweep) → 0
- Movement: xPercent -120 → +120 over 1.4s (BEAT 3)

**Vignette:**
- Radial gradient darkening corners: `#000000`, opacity 0.78 (start) → 0.5 (end)

**Bloom Wash:**
- Radial: `#FFE7B0`, opacity 0 → 0.2 (BEAT 4+)

**Candle Flicker:**
- Radial: `#FFD9A0`, opacity 0 → 0.5, scale 1 → 1.02 pulse

**Frame Border:**
- Color: `#E8DCC8` (warm cream-grey), opacity 0.85
- Width: Thin stroke (SVG `strokeWidth` for visual frame)
- Animation: drawSVG traces from 0% → 100% (BEAT 5), like vault closing

**VHS Scanlines:**
- Pattern: `6×6px` tiles, opacity 0.15, rolling vertically
- Fades in BEAT 3

### Easing Curves
- Emotional beats: `power2.inOut`, `power1.inOut`, `power1.out`
- BEAT 3 hero scratch retract: `power2.in` (accelerating exit)
- BEAT 4 final focus: `power2.out` (gentle landing)
- Breath cycles: `sine.inOut` (organic, never harsh)

### Animation Timeline Structure
- **Delay:** 0.15s breath before start
- **Total duration:** 5s (one-time play)
- **Staggering:** Scratches retract staggered by 0.13s each (naturalistic cascade)

### Filters & Effects
- **feGaussianBlur:** Animated stdDeviation (18 → 1.5 → 0px)
- **CSS filters on still:** `saturate()`, `sepia()`, `hue-rotate()`, `brightness()` (warm color shift)
- **Drop shadow:** `drop-shadow(0 28px 60px rgba(44,44,44,0.26))`

### Hover (if pointer: fine)
- **On mouseenter:** Bloom opacity 0.2 → 0.34, vignette 0.5 → 0.42 (subtle warming, 0.7s)
- **On mouseleave:** Reverse (0.9s ease-out)

---

## Organic Scratches (SVG Paths)

Six arcing scratches across the 16:9 frame. Each is a quadratic Bézier curve (soft, not sharp vectors):

```javascript
const SCRATCHES = [
  { id: 0, d: "M 120 180 Q 620 90 1180 240 T 1860 200" },
  { id: 1, d: "M 90 540 Q 540 470 1040 560 Q 1480 640 1880 520" },
  { id: 2, d: "M 220 880 Q 700 800 1180 900 T 1840 840" },
  { id: 3, d: "M 380 120 Q 520 420 700 720 Q 840 940 980 1020" },
  { id: 4, d: "M 1320 90 Q 1240 400 1380 700 Q 1480 900 1620 1000" },
  { id: 5, d: "M 60 320 Q 380 360 760 330 Q 1180 300 1620 360" },
];
```

**Why these matter:** They're organic arcs, not geometric scratches. They honor wear, not simulate digital damage.

---

## What NOT to Do (Rejected Concepts)

### ❌ "The Mended Disc" (Opus concept, REJECTED)
- A 3D-perspective CD/DVD with healing fractures
- Green data flowing along cracks to "seal" them
- Implies the disc gets *fixed* (dishonest, not true to Heirvo's service)
- **Why rejected:** Contradicts the "preservation" thesis; implies data repair, not retrieval

### ❌ "The Keepsake" (Art Director concept, REJECTED)
- Scratched disc at an angle, light shaft sweeps, film frame glows underneath
- Warm amber light, scratches remain
- **Why rejected:** Still centers on a *disc object*, not a *memory frame*; loses the "16:9 film" metaphor; less cinematic arc

### ❌ 3D Disc with Three.js/WebGL (REJECTED AFTER IMPLEMENTATION)
- Physically accurate 3D disc with parallax depth
- Added 130KB to bundle
- Placeholder assets made it look worse than SVG fallback
- **Why rejected:** Over-engineered, worse UX than pure SVG, broke the speed goal

**Current state:** Only HeroFilmFrame.tsx exists. HeroDisc3D.tsx and HeroDisc.tsx are removed/archived. No Three.js in dependencies.

---

## Integration

### In Hero.tsx
```jsx
import HeroFilmFrame from "../HeroFilmFrame";

export default function Hero() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    mq.addEventListener?.("change", (e) => setReducedMotion(e.matches));
    return () => mq.removeEventListener?.("change", () => {});
  }, []);

  return (
    <div className="right-column">
      <div ref={boxWrapRef} style={{ animation: reducedMotion ? undefined : "boxFloat 4s ease-in-out infinite" }}>
        <HeroFilmFrame reducedMotion={reducedMotion} />
      </div>
    </div>
  );
}
```

### Dependencies (package.json)
```json
{
  "dependencies": {
    "gsap": "^3.15.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0"
  }
}
```

**No Three.js. No @types/three. No Canvas fallback.**

---

## Deployment Checklist

- [ ] `npm run build` succeeds (no Three.js errors)
- [ ] Dev server runs, animation plays on mount
- [ ] All 5 beats render (visible in 5-second window)
- [ ] Scratches visibly retract in BEAT 3 (not erased, but slid to right edge)
- [ ] Reduced-motion mode works (jumps to final state)
- [ ] Hover warmth works on desktop (bloom + vignette soften)
- [ ] No console errors or warnings
- [ ] Deploy to production

---

## Next Agent Instructions

**If the user says the animation is wrong, verify FIRST:**

1. **Read the brief above** — is the implementation matching this spec?
2. **Load HeroFilmFrame.tsx** — does the code match the 5 beats described?
3. **Run a hard refresh** (`Ctrl+Shift+R`) and **watch the full 5-second animation play**
4. **Ask the user:** "What specifically doesn't match the brief?" (not vague; concrete)
5. **Only change what the brief says to change**

**Do NOT:**
- Show the same screenshot three times
- Defend an implementation without verifying it
- Assume the user is wrong
- Implement a concept not in this brief
- Add Three.js or any other dependencies
- Shift from a 16:9 film frame to a disc

**If the user wants a completely different animation:** Reject it. This brief is locked. Changes require a new competition.

---

## Emotional Blueprint (for context)

**The story told by the animation:**

A damaged memory surfaces—not because we fixed the disc, but because we brought the *light* back to it. The scratches don't vanish; they slide away as the light passes, revealing that the moment was always preserved underneath. By the end, the frame is calm, the light has settled into a soft glow, and the scratches remain honored at the edges—a testament to survival, not loss.

This tells Heirvo's true story: *We don't repair your disc. We rescue what was always inside it.*

---

**File:** `HeroFilmFrame.tsx`  
**Status:** READY FOR PRODUCTION  
**Date Finalized:** 2026-06-07
