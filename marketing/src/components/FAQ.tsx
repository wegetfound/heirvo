import { useState } from "react";

interface QA { q: string; a: string; category: string; }

interface Category {
  id: string;
  label: string;
  description: string;
}

const CATEGORIES: Category[] = [
  { id: "disc-compatibility", label: "Disc Compatibility", description: "Works with DVDs, CDs, and more" },
  { id: "damage-recovery", label: "Damage & Recovery", description: "What Heirvo can recover" },
  { id: "privacy-security", label: "Privacy & Security", description: "Your data stays on your computer" },
  { id: "system-requirements", label: "System Requirements", description: "Windows, specs, and drivers" },
  { id: "features", label: "Features & Output", description: "Export formats and capabilities" },
  { id: "pricing-licensing", label: "Pricing & Licensing", description: "Tiers and what they unlock" },
  { id: "performance", label: "Performance & Speed", description: "Recovery times and processing" },
  { id: "support-troubleshooting", label: "Support & Troubleshooting", description: "Help and known issues" },
];

const ITEMS: QA[] = [
  // Disc Compatibility
  {
    category: "disc-compatibility",
    q: "Will this work on my disc?",
    a: "Yes for almost everything you'd burn at home — wedding videos, vacation DVDs, photo CDs, document archives, and audio CDs. The only thing Heirvo can't help with is commercial copy-protected discs (store-bought movies). If your disc plays partially, skips, or shows errors, Heirvo can usually save what's still readable.",
  },
  {
    category: "disc-compatibility",
    q: "Can Heirvo recover from Blu-ray discs?",
    a: "Not yet. Heirvo currently supports DVDs and CDs (including audio CDs, photo CDs, and burned data discs). Blu-ray support is on our roadmap for a future version.",
  },
  {
    category: "disc-compatibility",
    q: "What about old VHS or film tapes?",
    a: "Heirvo only works with optical media — CDs and DVDs. For VHS tapes, you'll need a video digitizer or a service like LegacyBox. For old film, you'll need professional film scanning equipment.",
  },
  {
    category: "disc-compatibility",
    q: "Will it work on a disc that won't play in my DVD player?",
    a: "Usually yes. A disc that won't read in your player often has minor scratches or surface damage. Heirvo's multi-pass reading bypasses many of these issues by reading at the sector level, not the media layer level. Even if your player gives up, Heirvo often recovers most or all of your data.",
  },
  {
    category: "disc-compatibility",
    q: "Can Heirvo recover from discs with mold or fungal growth?",
    a: "Not from severe cases. If you see visible mold or white spots inside the disc, it's likely too far gone — mold degrades the polycarbonate layer itself. For minor surface contamination, clean the disc gently with a microfiber cloth and try again.",
  },

  // Damage & Recovery
  {
    category: "damage-recovery",
    q: "What if my disc is too damaged?",
    a: "Try Patient mode. Heirvo reads gently, sector-by-sector, and is designed to run overnight without your USB drive disconnecting. Combined with a powered USB drive (not bus-powered), Patient mode often recovers discs that other software gives up on within minutes.",
  },
  {
    category: "damage-recovery",
    q: "How much of a damaged disc can Heirvo recover?",
    a: "That depends on the damage. Heirvo recovers whatever is still readable at the sector level. For a scratched disc, that might be 95%. For a delaminated disc, it might be 40%. Heirvo tells you exactly what's readable before you commit to recovery, and you get a preview in the app.",
  },
  {
    category: "damage-recovery",
    q: "What does 'Patient mode' actually do?",
    a: "Patient mode reads the disc much more slowly and gently than normal. It's designed for discs that have unstable sectors or that skip during playback. Each sector is read multiple times — if reading fails, it waits and retries instead of skipping ahead. This is why Patient mode can take hours or overnight.",
  },
  {
    category: "damage-recovery",
    q: "Can Heirvo recover a disc that's physically warped or cracked?",
    a: "A warped disc might work — it depends on how bad the warp is. Heirvo's multi-pass reading is very forgiving. A cracked disc is usually a no-go, because cracks prevent the laser from reading cleanly. If your disc is cracked, recovery is unlikely to work.",
  },
  {
    category: "damage-recovery",
    q: "What's the difference between error correction and recovery?",
    a: "Error correction is built into the disc format — if a few bytes are damaged, the disc can reconstruct them. Heirvo uses this. Recovery is reading sectors that have errors so severe that error correction gives up. Patient mode focuses on recovery: re-reading bad sectors many times to get through.",
  },
  {
    category: "damage-recovery",
    q: "If recovery fails, can I try again?",
    a: "Yes. You can run recovery multiple times on the same disc. Try Normal mode first (faster), then Patient mode if Normal gets stuck. You can also try inserting and removing the disc, cleaning it gently, or swapping USB drives.",
  },

  // Privacy & Security
  {
    category: "privacy-security",
    q: "Is my data uploaded anywhere?",
    a: "No. Everything runs on your computer. Your videos, photos, and files never leave your machine. We never see your memories. AI restoration runs locally — no cloud, no account required to recover.",
  },
  {
    category: "privacy-security",
    q: "Does Heirvo require an internet connection?",
    a: "Not after activation. Heirvo works completely offline. You need internet to download the app and activate your license, but after that, you can use it anywhere — even without WiFi.",
  },
  {
    category: "privacy-security",
    q: "What if I'm offline when my license expires?",
    a: "Heirvo has a 30-day offline grace period. Your license cache is saved locally and verified with cryptographic signing. If you're offline when your license expires (for recurring subscriptions), you get a 30-day grace period to restore internet and renew. One-time purchases don't expire.",
  },
  {
    category: "privacy-security",
    q: "Does Heirvo collect any data about what I recover?",
    a: "No. We don't collect telemetry, crash reports, or information about your discs. The only thing Heirvo sends to us is your license activation (one-time), which is completely anonymous.",
  },
  {
    category: "privacy-security",
    q: "Is my data safe if the app crashes during recovery?",
    a: "Yes. Heirvo writes recovered files to disk in real-time. If the app crashes, your files are already saved. Heirvo also saves its progress (which sectors have been read) so it can pick up where it left off.",
  },
  {
    category: "privacy-security",
    q: "What about antivirus warnings?",
    a: "Heirvo is built with Rust, which is more resistant to traditional malware patterns. Some antivirus tools may flag the installer because it's unsigned and relatively new. We're working on code signing. In the meantime, you can verify the download with the SHA-256 hash on our website.",
  },

  // System Requirements
  {
    category: "system-requirements",
    q: "Mac or Linux?",
    a: "Windows only at v1. We picked Windows first because that's where most damaged DVDs and old USB drives live. macOS is on the roadmap.",
  },
  {
    category: "system-requirements",
    q: "Can I use this on my mom's old computer?",
    a: "Yes. Heirvo runs on Windows 10 and 11 with modest specs — 4 GB of RAM and a USB disc drive (CD or DVD) is enough for recovery. AI restoration is faster on newer machines but works on older ones too.",
  },
  {
    category: "system-requirements",
    q: "What are the minimum specs?",
    a: "Windows 10 or 11, 4 GB RAM, at least 50 GB free disk space (for recovered files), and a USB DVD or CD drive. A powered (not bus-powered) USB drive is recommended for Patient mode recovery, which can run overnight.",
  },
  {
    category: "system-requirements",
    q: "Do I need admin rights to install or run Heirvo?",
    a: "No. Heirvo runs as a regular user. You do not need to be an administrator to install it or use it. This makes it safe to run on shared computers.",
  },
  {
    category: "system-requirements",
    q: "Does Heirvo work on a laptop?",
    a: "Yes, but external USB disc drives work better than laptop built-in drives. Laptop drives can be flakier, especially if they're old. If you have an external USB disc drive, even a cheap one, you'll get better results.",
  },

  // Features & Output
  {
    category: "features",
    q: "What's the file output?",
    a: "Whatever you need. MP4 plays everywhere (TVs, phones, YouTube). ISO is a perfect digital copy you can burn to a fresh disc. Or save individual files (great for photo CDs and documents). Pro unlocks all formats plus AI restoration.",
  },
  {
    category: "features",
    q: "Can I search the transcript of a recovered video?",
    a: "Yes, with Archive tier and above. Heirvo uses Whisper AI to transcribe every word spoken in your video, and you can search it right in the app. If your video is 3 hours long, you can search for 'birthday cake' and jump to that moment instantly.",
  },
  {
    category: "features",
    q: "What video formats can Heirvo export to?",
    a: "Recover tier exports to MP4 (H.264). Archive and above unlock additional formats: WebM, ProRes (for video editing), and original files. ISO export is available on all tiers.",
  },
  {
    category: "features",
    q: "Can I burn the recovered data back to a new disc?",
    a: "Yes. Export as ISO, then use free software like ImgBurn or Windows' built-in burn tool to write the ISO to a new DVD or CD. This creates an exact copy of the original disc.",
  },
  {
    category: "features",
    q: "How long is the recovered video?",
    a: "As long as the original. If your DVD had 2 hours of video, Heirvo extracts all 2 hours — or as much as the disc could hold and Heirvo could recover.",
  },

  // Pricing & Licensing
  {
    category: "pricing-licensing",
    q: "What's the difference between Recover, Archive, and Family tiers?",
    a: "Recover ($59): Basic recovery and export to MP4, ISO, or files. Archive ($99): Everything in Recover plus personal media vault, AI transcription, and search. Family ($149): Everything in Archive plus activate on up to 5 family devices.",
  },
  {
    category: "pricing-licensing",
    q: "Is it a subscription or a one-time purchase?",
    a: "One-time purchase. You buy once, you own it forever. No recurring fees, no subscriptions, no 'premium tier coming soon.' You get unlimited disc recovery for life.",
  },
  {
    category: "pricing-licensing",
    q: "Can I try Heirvo before buying?",
    a: "Yes. Download the free version and recover your disc completely. You can watch the recovered video in the app for free. You only need to buy a license if you want to export it.",
  },
  {
    category: "pricing-licensing",
    q: "Can I upgrade from Recover to Archive later?",
    a: "We'll offer upgrade pricing. Right now, you'd need to purchase Archive separately. We're working on a seamless upgrade path.",
  },
  {
    category: "pricing-licensing",
    q: "Is there a refund policy?",
    a: "Yes. 30-day money-back guarantee. If you buy a license and it doesn't work for you, email us and we'll refund it, no questions asked.",
  },

  // Performance & Speed
  {
    category: "performance",
    q: "How long does recovery take?",
    a: "Normal mode: 20-60 minutes for a typical DVD, depending on how damaged it is and your USB drive speed. Patient mode: 4-12 hours. Patient mode is slower but more thorough — it's designed for overnight recovery.",
  },
  {
    category: "performance",
    q: "Why is Patient mode so slow?",
    a: "Patient mode reads each sector multiple times and waits longer between retries. This is intentional — it gives problematic sectors more chances to read cleanly. Speed doesn't matter if you're recovering 20-year-old family videos.",
  },
  {
    category: "performance",
    q: "Will recovery slow down my computer?",
    a: "No. Heirvo runs in the background and doesn't use much CPU. You can use your computer normally while Heirvo is recovering. The main constraint is the USB drive speed and disc readability.",
  },
  {
    category: "performance",
    q: "Does AI transcription take a long time?",
    a: "Transcription is fast — about 20-30 seconds per minute of video on a modern machine. On older machines it's slower but still reasonable. The time depends on your CPU, not the video quality.",
  },

  // Support & Troubleshooting
  {
    category: "support-troubleshooting",
    q: "What if Heirvo shows an error?",
    a: "Heirvo gives you clear, non-technical error messages. Common ones: 'No disc detected' (wrong drive or disc not inserted), 'Disc is unreadable' (try cleaning it), 'Recovery stalled' (try Patient mode). Every error message in Heirvo was tested with real users.",
  },
  {
    category: "support-troubleshooting",
    q: "My disc drive isn't showing up in Heirvo. What do I do?",
    a: "First, make sure your USB drive is connected and has power (if it's external). Try a different USB port. If you have drivers for the drive, make sure they're up to date. If that doesn't help, contact support.",
  },
  {
    category: "support-troubleshooting",
    q: "Heirvo says the disc is unreadable. Is it really dead?",
    a: "Not necessarily. Try: 1) Cleaning the disc gently with a soft microfiber cloth, 2) Removing and reinserting it, 3) Trying a different USB disc drive if you have one, 4) Running Patient mode, which is more forgiving. If all of that fails, the disc is likely too damaged.",
  },
  {
    category: "support-troubleshooting",
    q: "Can I recover multiple discs with one license?",
    a: "Yes. Recover, Archive, and Family all cover unlimited disc recovery. You're only limited by the number of devices you can activate on (Recover = 2, Archive = 3, Family = 5).",
  },
  {
    category: "support-troubleshooting",
    q: "I lost my license key. Can you resend it?",
    a: "Yes. Email us at support@heirvo.com with the email address you used to purchase, and we'll resend your license key.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>("disc-compatibility");

  const filteredItems = ITEMS.filter(item => item.category === activeCategory);

  return (
    <div className="space-y-8">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => {
              setActiveCategory(category.id);
              setOpen(0);
            }}
            className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
              activeCategory === category.id
                ? "bg-brand-gradient text-white"
                : "bg-ink-50 text-ink-600 hover:bg-ink-100"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Category description */}
      <div className="text-sm text-ink-600">
        {CATEGORIES.find(c => c.id === activeCategory)?.description}
      </div>

      {/* Q&A items */}
      <div className="space-y-3">
        {filteredItems.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className="card-solid overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-6 text-left px-6 py-5 hover:bg-ink-50/40 transition"
                aria-expanded={isOpen}
              >
                <span className="font-display font-semibold text-[16px] text-ink-900">
                  {item.q}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all ${
                    isOpen
                      ? "bg-brand-gradient border-transparent text-white rotate-45"
                      : "border-ink-200 text-ink-500"
                  }`}
                  aria-hidden
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
              <div
                className="grid transition-all duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 text-[15px] leading-relaxed text-ink-500">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
