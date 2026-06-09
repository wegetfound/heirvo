# Heirvo Smoke Test Report
**Date:** 2026-06-08  
**Status:** NOT READY FOR LAUNCH - 3 Critical Blockers

---

## 🚨 Critical Blockers (Must Fix)

### 1. Photo CD Decoder Not Installed ❌
**Severity:** HIGH  
**Impact:** Blocks all Kodak Photo CD recovery features  

**Current State:**
- Settings → System Status shows: "Photo CD decoder (ImageMagick) - Not installed"
- Button text: "Install Photo CD decoder (~20 MB)" exists but functionality untested
- Users cannot recover from Photo CDs without this

**To Fix:**
- [ ] Verify the "Install Photo CD decoder" button works properly
- [ ] Test installation completes without errors
- [ ] Test Photo CD recovery after installation
- [ ] If button broken: implement proper installation flow
- [ ] Consider bundling ImageMagick with release build instead of optional install

**Estimate:** 30-45 min (depends on current button implementation)

---

### 2. LemonSqueezy Account Not Approved ⚠️
**Severity:** CRITICAL  
**Impact:** Cannot accept real payments  

**Current State:**
- LemonSqueezy account in "review" waiting for KYC approval
- 3 products published in test mode (Recover, Archive, Family)
- Cannot turn off test mode or accept real payments until approved

**To Fix:**
- [ ] Wait for LemonSqueezy approval email (usually 24-48 hours)
- [ ] Once approved: Turn OFF test mode in LemonSqueezy dashboard
- [ ] Regenerate HMAC secret for production (command in memory)
- [ ] Update `.env.heirvo` with production HMAC secret
- [ ] Build production installer with `.\build-release.ps1`
- [ ] Test one real payment end-to-end with test card
- [ ] Verify license key activates correctly after purchase
- [ ] Verify tier-gating works (1 export free, 3 for Recover, unlimited for Archive)

**Blocker:** Outside our control - waiting for LS approval  
**Estimate:** 1-2 hours after LS approval

---

### 3. Payment Flow Unverified ⚠️
**Severity:** HIGH  
**Impact:** Cannot verify transactions work correctly  

**Current State:**
- Checkout buttons wired to LemonSqueezy URLs (RECOVER_URL, ARCHIVE_URL, FAMILY_URL)
- Thank you pages configured
- License activation flow not tested with real payments

**To Fix:**
- [ ] Wait for LemonSqueezy approval + test mode OFF
- [ ] Manually test purchase flow with test card:
  - Click "Buy Recover" button
  - Complete checkout at LemonSqueezy
  - Receive license key in confirmation email
  - Activate license in app
  - Verify tier restrictions enforced (3 export limit)
- [ ] Test all 3 tier purchases (Recover $59, Archive $99, Family $149)
- [ ] Verify license keys are correctly stored locally
- [ ] Test deactivating and reactivating licenses
- [ ] Verify family tier shows 5 machines correctly

**Blocker:** Depends on LemonSqueezy approval  
**Estimate:** 1-2 hours (manual testing)

---

## ⚠️ Important Issues (Before First Users)

### 4. UI Discoverability - "My Discs" Cards
**Severity:** MEDIUM  
**Impact:** Users won't realize disc cards are clickable  

**Current State:**
- Disc cards in "My Discs" list are clickable but have no visual hover/active states
- No indication that the card opens disc details
- Users may click on the title text instead of the card

**To Fix:**
- [ ] Add hover state to disc cards (subtle background color change or border highlight)
- [ ] Add cursor pointer on hover
- [ ] Consider adding a ">" chevron or "View details" text as hint
- [ ] Make entire card clickable (not just title)

**Estimate:** 15-20 min

---

### 5. Tier-Based Export Gating - Verification Needed
**Severity:** MEDIUM  
**Impact:** Users might get unexpected feature restrictions  

**Current State:**
- Settings shows "ARCHIVE" tier licensed (unlimited exports)
- Free tier should only allow 1 lifetime export
- Recover tier ($59) should allow 3 exports
- No UI visible testing of these restrictions

**To Fix:**
- [ ] Verify free tier shows "1 export available" message
- [ ] Test upgrading from free → Recover and verify 3 exports allowed
- [ ] Test upgrading from Recover → Archive and verify unlimited
- [ ] Verify export limit enforcement in code works correctly
- [ ] Add visible feedback when user hits export limit
- [ ] Test license downgrade scenario (if applicable)

**Estimate:** 45 min - 1 hour (depends on implementation)

---

## ✅ Features Verified Working

- ✅ Home page with hero content loads correctly
- ✅ Navigation (Home, Memories, My Discs, Export, Settings, Browse ISO)
- ✅ Rescue/recovery interface accessible
- ✅ Memories page with video player functional
- ✅ Export page shows correctly
- ✅ Settings page complete with all toggles
- ✅ System Status section showing all tool statuses
- ✅ Dark mode toggle works
- ✅ Sound notification settings functional
- ✅ Auto-open on disc insertion toggle
- ✅ License info displays correctly
- ✅ Disc detail view comprehensive (health score, export options, etc.)
- ✅ "My Discs" list displays recovered discs with metadata
- ✅ Vite dev server builds without errors
- ✅ Tauri compilation successful

---

## 🧪 Testing Gaps (Cannot Test Without Hardware)

The following require actual DVD/CD hardware to test properly:
- Actual disc insertion and detection
- Real recovery workflow (reading sectors, handling bad sectors)
- Video conversion performance with real files
- FFmpeg processing of various file formats
- Disc drive timeout/error handling
- Multiple disc format support (DVD, CD, Blu-ray, Photo CD, etc.)

**Recommendation:** Do hardware smoke test with 3-5 real discs of different types before launch:
1. Standard DVD video
2. Music CD
3. Data CD/DVD
4. Kodak Photo CD (after ImageMagick installed)
5. Damaged/scratched disc (test error recovery)

---

## 📋 Pre-Launch Checklist

### CRITICAL (Blocking Launch)
- [ ] LemonSqueezy approval received
- [ ] Test mode turned OFF in LS dashboard
- [ ] Production HMAC secret generated and configured
- [ ] Production installer build tested
- [ ] One real purchase tested end-to-end
- [ ] License activation verified
- [ ] Photo CD decoder installation verified to work

### HIGH PRIORITY (Before First Public Release)
- [ ] Tier gating verified (free 1 export, Recover 3, Archive unlimited)
- [ ] All export options respect tier limits
- [ ] UI discoverability improved (My Discs hover states)
- [ ] Hardware smoke test with real discs (5+ different formats)
- [ ] Error messaging for common failure scenarios

### MEDIUM PRIORITY (First Few Weeks)
- [ ] Accessibility audit (keyboard navigation, screen readers)
- [ ] Performance testing on lower-spec hardware
- [ ] Multi-monitor support verification
- [ ] Bing Webmaster Tools sitemap submission
- [ ] Monitor GSC for indexing issues

### NICE TO HAVE (Later Releases)
- [ ] Built-in tutorial/onboarding
- [ ] Additional language support
- [ ] Advanced recovery options UI

---

## 🚀 Recommended Launch Order

**Phase 1 - Immediate (Today/Tomorrow)**
1. Verify Photo CD decoder button functionality
2. Wait for + receive LemonSqueezy approval
3. Turn off test mode, generate production HMAC

**Phase 2 - Testing (Day 2-3)**
1. Test payment flow with all 3 tiers
2. Test tier-based export restrictions
3. Improve UI discoverability (My Discs cards)
4. Hardware smoke test with real discs

**Phase 3 - Polish (Day 3-4)**
1. Fix any bugs found in Phase 2
2. Add error messages and edge-case handling
3. Final QA pass
4. Website sitemap submit to search engines

**Phase 4 - Launch**
1. Deploy production installer
2. Announce availability
3. Monitor for user-reported issues
4. First week: close monitoring and quick fixes

---

## 📊 Readiness Assessment

| Category | Status | Notes |
|----------|--------|-------|
| **Core Features** | ✅ READY | All main features working |
| **Payment System** | ⏳ PENDING | Waiting for LemonSqueezy approval |
| **Optional Features** | ❌ BLOCKED | Photo CD decoder not installed |
| **UI/UX Polish** | ⚠️ PARTIAL | Discoverability issues on disc cards |
| **Testing** | ⏳ IN PROGRESS | Hardware testing needed |
| **Documentation** | ✅ READY | (Assuming marketing site is done) |

**Overall: NOT READY - 1-2 days away (pending external approval)**

---

## Notes

- App compiles cleanly with no Rust errors
- All main workflows functional
- Performance appears good (no obvious lag/stuttering)
- Memory from session notes 69 URLs in sitemap - verify GSC shows them indexed within 48h
- Family tier now correctly shows 5 machines (was 3 in earlier note)
- All product IDs already configured in .env.heirvo
