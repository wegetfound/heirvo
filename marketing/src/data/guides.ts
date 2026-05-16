export interface GuideSection {
  id: string;
  heading?: string;
  level?: 2 | 3;
  paragraphs?: string[];
  items?: string[];
  numbered?: boolean;
  callout?: { label: string; text: string; color?: "blue" | "amber" | "green" };
  table?: {
    caption?: string;
    headers: string[];
    rows: string[][];
  };
}

export interface GuideFAQ {
  q: string;
  a: string;
}

export interface Guide {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  datePublished: string;
  dateModified: string;
  readTime: string;
  category: string;
  intro: string;
  related: string[];
  sections: GuideSection[];
  faq: GuideFAQ[];
  cta: {
    heading: string;
    body: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  };
}

const GUIDES: Guide[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Recover files from scratched DVD
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-files-scratched-dvd",
    title: "How to Recover Files from a Scratched DVD on Windows",
    metaTitle: "How to Recover Files from a Scratched DVD on Windows (2026 Guide)",
    metaDescription:
      "Step-by-step guide to recovering files from a scratched, damaged, or unreadable DVD on Windows 10 and 11. Free to scan with Heirvo — pay only when you save.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "7 min read",
    category: "DVD Recovery",
    intro:
      "You can recover files from a scratched DVD using disc recovery software that reads each sector multiple times — at different speeds, forwards and backwards — instead of giving up at the first read error. Most scratched DVDs yield 80–95% of their files with a sector-level scan, even when Windows Explorer and VLC refuse to open the disc entirely.",
    related: ["recover-home-videos-dvd", "how-long-do-dvds-last-disc-rot", "recover-water-damaged-dvd", "recover-data-cracked-dvd", "dvd-drive-disconnects-mid-scan", "dvd-drive-freezing-mid-recovery-fix", "vlc-plays-dvd-recovery-fails"],
    sections: [
      {
        id: "why-scratches-cause-problems",
        heading: "Why scratches prevent normal file copy",
        paragraphs: [
          "A DVD stores data as microscopic pits in a polycarbonate disc coated with a reflective layer. A laser reads those pits by detecting the change in reflectance. When the disc surface is scratched, the laser scatters — the drive reports a read error and most software stops immediately.",
          "What most software doesn't do is retry that sector dozens of times at varying read speeds, or try reading it in reverse. Specialist disc recovery software does exactly that. It's slower — a badly scratched disc can take two to four hours to scan — but the recovery rate is dramatically higher.",
        ],
      },
      {
        id: "what-you-need",
        heading: "What you need before you start",
        items: [
          "A Windows 10 or Windows 11 PC (64-bit)",
          "A USB or internal DVD/CD disc drive — most modern disc drives work fine",
          "Heirvo disc recovery software — free to download and scan",
          "Enough free hard drive space for the files you expect to recover (a full DVD is up to 8.5 GB)",
        ],
        callout: {
          label: "No disc drive?",
          text: "If your computer doesn't have a disc drive, any USB external drive (around $20–$30) will work. Alternatively, Heirvo offers a mail-in service where you post the disc and we recover it in our lab — no equipment needed on your end.",
          color: "blue",
        },
      },
      {
        id: "step-by-step",
        heading: "Step-by-step: recover files from a scratched DVD",
        numbered: true,
        items: [
          "Download and install Heirvo. The installer is about 60 MB and takes under two minutes. No account is needed.",
          "Insert your scratched DVD into the disc drive. Wait for Windows to detect the drive — it may show an error like 'disc not readable' and that is fine.",
          "Open Heirvo and select your disc drive from the dropdown. Heirvo detects the disc type automatically.",
          "Click Scan. Heirvo begins reading sector by sector, making up to 16 passes over unreadable areas. You can watch the recovery map fill in as it progresses.",
          "When the scan finishes, Heirvo shows you every recoverable file — video, photos, documents, or raw ISO data. The scan is completely free.",
          "Activate Heirvo Pro ($39 one-time) to save the recovered files to your hard drive. If nothing was recovered, you pay nothing.",
        ],
      },
      {
        id: "improve-recovery-chances",
        heading: "How to improve your recovery chances",
        paragraphs: [
          "Before scanning, clean the disc gently with a microfibre cloth — wipe from the centre outward in straight lines, never in circles. Circular cleaning can add fine scratches across data tracks.",
          "Radial scratches (from centre to edge) are generally less damaging than circular ones because they cross fewer data sectors. If your disc has circular scratches, expect a lower recovery rate.",
          "Very deep gouges through the polycarbonate layer are often unrecoverable with any software — the data is physically destroyed. In that case, a professional optical recovery lab may be able to help by re-polishing the disc surface, which is what Heirvo's mail-in service uses.",
        ],
        callout: {
          label: "Pro tip",
          text: "If your disc drive struggles to recognise the disc at all, try a different USB drive. Some drives have better error correction than others. Older drives built before Blu-ray sometimes read damaged DVDs better than modern slim laptop drives.",
          color: "green",
        },
      },
      {
        id: "when-software-isnt-enough",
        heading: "When software recovery isn't enough",
        paragraphs: [
          "If the disc surface is delaminating (the reflective layer is peeling), if there are deep gouges, or if the dye layer has oxidised and turned milky, software recovery alone may not work. The data is still physically present in many cases — it just can't be read with a standard laser.",
          "Professional optical recovery involves re-polishing the disc surface in a controlled environment and using a custom-built reader with a more powerful laser and finer focus control. This is what Heirvo's mail-in service does. The guarantee is simple: if we cannot recover anything, you pay nothing.",
        ],
      },
      {
        id: "what-files-recover",
        heading: "What types of files can be recovered from a DVD?",
        paragraphs: [
          "Heirvo can recover any file stored on a DVD, including DVD-Video (VOB files and the full VIDEO_TS folder for playback in any DVD player), MP4 and AVI video files burned as a data disc, JPEG, PNG, TIFF, and RAW photo files, MP3 and WAV audio files, PDF, DOC, XLS, and ZIP data files, and full ISO disc images for archival.",
          "For DVD-Video discs (home movies burned in VIDEO_TS format), Heirvo can extract the raw VOB files or optionally convert them to MP4, which plays on any modern device.",
        ],
      },
    ],
    faq: [
      {
        q: "Can I recover files from a DVD that Windows says is unformatted?",
        a: "Yes. 'Unformatted' usually means the file system is damaged, not that the data is gone. Heirvo reads below the file system level, working directly with raw disc sectors, so it can often recover files even when the drive reports the disc as blank or unformatted.",
      },
      {
        q: "How long does a scratched DVD scan take?",
        a: "A disc in good condition scans in 15–30 minutes. A badly scratched disc where Heirvo has to make multiple passes over damaged sectors can take 2–5 hours. You can leave it running in the background.",
      },
      {
        q: "Will recovery work on a DVD-R or DVD+R that was burned at home?",
        a: "Yes. Home-burned DVD-R and DVD+R discs actually degrade faster than pressed commercial DVDs because the organic dye layer oxidises over time — but Heirvo supports all DVD formats including DVD-R, DVD+R, DVD-RW, and DVD+RW.",
      },
      {
        q: "What if only some files were recovered?",
        a: "Partial recovery is common with heavily damaged discs. Heirvo shows you exactly which files were recovered and which were partially recovered or lost. You can save everything that was successfully recovered and decide whether to attempt mail-in recovery for the rest.",
      },
      {
        q: "Is Heirvo really free to scan?",
        a: "The scan is completely free with no time limit. You only pay ($39 one-time) when you choose to save the recovered files. If nothing is recoverable, you never need to pay anything.",
      },
    ],
    cta: {
      heading: "Ready to scan your disc?",
      body: "Download Heirvo and run a free scan in minutes. See exactly what's recoverable before you commit to anything.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Or mail us your disc",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Recover home videos from old DVDs
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-home-videos-dvd",
    title: "How to Recover Home Videos from Old or Damaged DVDs",
    metaTitle: "How to Recover Home Videos from Old or Damaged DVDs (Complete Guide)",
    metaDescription:
      "Recover family home videos from old, scratched, or deteriorating DVDs on Windows. Extract VOB files or convert to MP4 with Heirvo — free to scan.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "8 min read",
    category: "DVD Recovery",
    intro:
      "Home video DVDs burned between 2000 and 2015 are now reaching the end of their reliable lifespan. The organic dye in DVD-R and DVD+R discs oxidises over time, turning the reflective layer hazy and causing read errors even on undamaged discs. The good news is that the video data is usually still recoverable — you just need software that reads below the surface errors rather than giving up.",
    related: ["recover-files-scratched-dvd", "recover-vhs-converted-dvd", "recover-wedding-dvd", "recover-8mm-film-dvd-transfer", "dvd-drive-freezing-mid-recovery-fix", "vlc-plays-dvd-recovery-fails"],
    sections: [
      {
        id: "why-home-dvds-fail",
        heading: "Why home video DVDs degrade over time",
        paragraphs: [
          "Commercial pressed DVDs (movies you buy in a store) have a physically stamped aluminium reflective layer that can last 50–100 years in good storage. Home-burned DVD-R and DVD+R discs are completely different — they use an organic cyanine, phthalocyanine, or azo dye layer that the laser burns during recording.",
          "That dye is sensitive to UV light, heat, and humidity. A disc stored in a car, near a window, or in a damp garage can start showing read errors within 5–10 years. You may notice the disc looks slightly milky or has faint discolouration in rings around the hub — that is early-stage dye oxidation.",
          "Physical scratches compound the problem. The polycarbonate layer gets scratched from everyday handling, and even fine circular scratches can cause the laser to scatter across multiple data tracks.",
        ],
      },
      {
        id: "home-video-formats",
        heading: "Identifying what format your home videos are on",
        paragraphs: [
          "Most home video DVDs fall into two categories, which affects how you recover them:",
        ],
        table: {
          headers: ["Format", "How to identify", "What Heirvo recovers"],
          rows: [
            ["DVD-Video (VIDEO_TS)", "Plays in a DVD player, shows VIDEO_TS folder", "Full VIDEO_TS folder + optional MP4 conversion"],
            ["Data disc (MP4/AVI/MOV)", "Shows files in Windows Explorer when readable", "Individual video files directly"],
            ["AVCHD (Blu-ray camcorder)", "BDMV folder, .MTS or .M2TS files", "MTS/M2TS files"],
            ["Mini-DVD (8cm)", "Smaller diameter disc from a DVD camcorder", "Same as DVD-Video"],
          ],
        },
        callout: {
          label: "Mini-DVDs",
          text: "8cm mini-DVDs from camcorders must be placed in the outer ring tray of a tray-loading disc drive, not a slot-loading drive. Never force a mini-DVD into a slot-loading laptop drive — it can jam the mechanism. Use a tray-loading USB external drive instead.",
          color: "amber",
        },
      },
      {
        id: "step-by-step-video",
        heading: "Step-by-step: extract home videos with Heirvo",
        numbered: true,
        items: [
          "Download and install Heirvo on your Windows 10 or 11 PC.",
          "Connect a disc drive if needed. Any USB DVD drive works. For mini-DVDs, use a tray-loading model.",
          "Insert your home video DVD and open Heirvo. Select the disc from the drive dropdown.",
          "Click Scan. Heirvo reads the disc sector by sector, recovering what it can from damaged areas.",
          "Once the scan completes, you'll see the VIDEO_TS folder (or individual video files if it's a data disc).",
          "Activate Heirvo Pro to save. For DVD-Video discs, choose between saving the raw VIDEO_TS folder (preserving menus and chapters) or extracting individual titles as MP4 files playable on any device.",
        ],
      },
      {
        id: "after-recovery",
        heading: "After recovery: preserving and organising your videos",
        paragraphs: [
          "Once your videos are saved to your hard drive, make at least three copies in two different locations — for example, an external hard drive plus cloud storage (Google Drive, iCloud, or Amazon Photos). Hard drives also fail, and the whole point is to not lose these memories twice.",
          "If you recovered raw VOB files from a DVD-Video disc, they'll play in VLC Media Player. To edit them or share them easily, use Handbrake (free, open-source) to convert them to MP4. Handbrake can batch-convert an entire VIDEO_TS folder.",
          "Label and date your files before you archive them. Five years from now you'll thank yourself. A simple naming convention like YYYY-MM_description works well: 2008-06_wedding-reception.mp4.",
        ],
      },
      {
        id: "too-damaged",
        heading: "When the disc is too damaged for software",
        paragraphs: [
          "If your disc is visibly delaminating, has deep scratches through to the dye layer, or shows the milky oxidation of severe dye degradation, a software scan may only recover part of the video — or nothing at all. You'll see the recovery map show large red unreadable zones.",
          "For irreplaceable home videos, a professional recovery lab is worth considering. Heirvo's mail-in service uses optical disc recovery equipment that can sometimes read discs that no consumer drive can detect. The no-recovery, no-charge guarantee means there's no risk in trying.",
        ],
      },
    ],
    faq: [
      {
        q: "My DVD plays fine in a DVD player but Windows won't read it — can Heirvo help?",
        a: "Possibly. Standalone DVD players often have better error correction and are more tolerant of disc damage than PC drives. However, Heirvo can try the same recovery approach — reading sectors multiple times at varying speeds. The results depend on how much of the disc surface is damaged.",
      },
      {
        q: "Can Heirvo convert my home videos to MP4?",
        a: "Yes. For DVD-Video discs (VIDEO_TS format), Heirvo can extract individual video titles as MP4 files automatically during the save step. This skips the need for a separate converter.",
      },
      {
        q: "I have a Blu-ray disc with home videos — does Heirvo support that?",
        a: "Yes. Heirvo supports Blu-ray, BD-R, and BD-RE discs. You'll need a Blu-ray disc drive — a standard DVD drive cannot read Blu-ray. USB Blu-ray drives are available for around $50–$80.",
      },
      {
        q: "The disc is from a DVD camcorder (8cm mini-DVD). Will it work?",
        a: "Yes, with the right drive. Use a tray-loading disc drive and place the mini-DVD in the inner ring of the tray. Never use a slot-loading drive for mini-DVDs. Recovery works the same way as full-size DVDs.",
      },
      {
        q: "How much does it cost to recover home videos?",
        a: "The scan is free. If Heirvo successfully finds your videos, you pay $39 once to save them — no subscription. If you need to use the mail-in service because the disc is too damaged for software recovery, pricing starts at $89 per disc.",
      },
    ],
    cta: {
      heading: "Don't let those memories stay stuck on a failing disc",
      body: "Scan for free. You'll see exactly what's recoverable before you spend anything.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in recovery service",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Kodak Photo CD recovery
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "kodak-photo-cd-recovery",
    title: "How to Open Kodak Photo CD Files on Windows 10 & 11",
    metaTitle: "How to Open Kodak Photo CD Files (.PCD) on Windows 10 & 11 (2026)",
    metaDescription:
      "Kodak Photo CD files (.PCD) can no longer be opened on Windows 10 or 11 — Adobe dropped support in 2023. Heirvo reads Photo CDs directly and converts images to JPEG or TIFF.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "6 min read",
    category: "Photo Recovery",
    intro:
      "Kodak Photo CDs store images in the .PCD format — a proprietary multi-resolution format that Windows 10 and 11 cannot open natively. Adobe Photoshop dropped PCD support entirely in 2023. If you have a box of these discs from the 1990s or 2000s, Heirvo is one of the few modern tools that reads them directly and converts the images to standard JPEG or TIFF files you can view on any device.",
    related: ["recover-data-from-cd-rom-windows", "recover-music-from-scratched-cd", "best-dvd-recovery-software", "recover-data-from-zip-disk", "dvd-drive-disconnects-mid-scan", "powered-usb-hub-dvd-recovery"],
    sections: [
      {
        id: "what-is-photo-cd",
        heading: "What is a Kodak Photo CD?",
        paragraphs: [
          "Kodak Photo CD was a professional digitisation system launched in 1992. When you dropped off a roll of 35mm film at a photo lab, they could also provide a Photo CD — a disc with your negatives scanned at up to six resolutions, from thumbnail quality up to full professional resolution (up to 6144×4096 pixels for Pro Photo CD).",
          "The discs look like a standard CD with a distinctive yellow Kodak label. Inside, each image is stored in a hierarchical encoding called Image Pac (.PCD files), which contains all six resolutions in a single file. The system ran until the mid-2000s when digital cameras made film largely redundant.",
        ],
        callout: {
          label: "How to identify a Kodak Photo CD",
          text: "Look for a CD with 'KODAK PHOTO CD' printed on it, usually with a yellow Kodak logo. The disc contains a folder called 'PHOTO_CD/IMAGES/' with files named IMG0001.PCD, IMG0002.PCD, and so on.",
          color: "amber",
        },
      },
      {
        id: "why-cant-open",
        heading: "Why you can't open .PCD files on Windows anymore",
        paragraphs: [
          "Windows has never included native support for the PCD format — you always needed a third-party viewer. For many years, Adobe Photoshop was the standard tool, but Adobe removed PCD support in Photoshop 2023 (version 24.0) with no replacement.",
          "Other older software like IrfanView technically supports PCD but requires the Kodak PCD Plugin (a 32-bit DLL from the late 1990s) that is no longer distributed and doesn't reliably work on 64-bit Windows 10 or 11.",
          "The practical result: if you find a box of Kodak Photo CDs today, opening them without specialist software is very difficult. Most people assume the photos are lost.",
        ],
      },
      {
        id: "step-by-step-pcd",
        heading: "How to recover images from a Kodak Photo CD with Heirvo",
        numbered: true,
        items: [
          "Download and install Heirvo on Windows 10 or 11.",
          "Insert your Kodak Photo CD into a disc drive. If the disc is in good condition, Windows may show an AutoPlay prompt — ignore it and open Heirvo instead.",
          "Select the disc drive in Heirvo. The software automatically detects the Photo CD format and the PHOTO_CD/IMAGES folder structure.",
          "Click Scan. Heirvo reads the PCD files and builds a preview of your photos at the highest available resolution.",
          "Review the recovered images in the thumbnail grid. You'll see the actual photos, not just file names.",
          "Activate Heirvo Pro to save. Choose JPEG (for sharing) or TIFF (for full lossless quality and archival). The maximum resolution available on standard Photo CDs is 3072×2048 pixels.",
        ],
      },
      {
        id: "pcd-resolutions",
        heading: "The six Kodak Photo CD resolutions explained",
        paragraphs: [
          "Each .PCD Image Pac file contains the same image stored at six different resolutions. Heirvo extracts at the highest resolution available on your disc:",
        ],
        table: {
          headers: ["Resolution name", "Pixel dimensions", "Best for"],
          rows: [
            ["Base/16 (thumbnail)", "192 × 128", "Contact sheet previews"],
            ["Base/4", "384 × 256", "Screen thumbnail"],
            ["Base", "768 × 512", "Web / email use"],
            ["4 Base", "1536 × 1024", "Standard print quality"],
            ["16 Base", "3072 × 2048", "Enlargement, archival (standard discs)"],
            ["64 Base (Pro Photo CD only)", "6144 × 4096", "Professional / large format print"],
          ],
        },
        callout: {
          label: "Pro Photo CD vs standard Photo CD",
          text: "Standard Photo CDs (the most common type from photo labs) top out at 16 Base (3072×2048). Pro Photo CDs, used by professional photographers and stock agencies, contain the 64 Base resolution as well. Heirvo extracts the maximum resolution available on whichever type you have.",
          color: "blue",
        },
      },
      {
        id: "damaged-photo-cd",
        heading: "What if the Photo CD is scratched or damaged?",
        paragraphs: [
          "Kodak Photo CDs are pressed discs (not burned), so they don't suffer from dye oxidation. They do scratch, and if the disc was stored in poor conditions the reflective layer may have corroded.",
          "Heirvo's sector-level scanning works on damaged Photo CDs the same way it does for other discs — making multiple passes over unreadable areas. Even partially damaged discs often yield the majority of images, since each PCD file is stored independently.",
          "If the disc is severely damaged and software recovery fails, the mail-in recovery service can attempt professional optical recovery.",
        ],
      },
    ],
    faq: [
      {
        q: "Can IrfanView open Kodak Photo CD files?",
        a: "IrfanView requires the Kodak PCD plugin, a 32-bit DLL from the 1990s. It can work on some Windows systems but frequently fails on 64-bit Windows 10 and 11, and the plugin is no longer officially distributed. Heirvo reads PCD files natively without needing any additional plugins.",
      },
      {
        q: "Will the recovered photos be the same quality as the original film scan?",
        a: "Yes. Heirvo extracts at the maximum resolution stored in the .PCD Image Pac files — up to 3072×2048 on standard Photo CDs or 6144×4096 on Pro Photo CD discs. No quality is lost in the extraction process.",
      },
      {
        q: "I have Photo CDs but no CD drive — what can I do?",
        a: "Heirvo's mail-in service accepts Kodak Photo CDs. You send the discs, we extract all images at full resolution and deliver them via a secure download link. No equipment needed on your end.",
      },
      {
        q: "Do Kodak Photo CDs contain negatives or prints?",
        a: "Neither — Photo CDs contain digital scans made directly from your original film negatives or slides by the photo lab at time of processing. The scans are often better quality than a flatbed scan of the print, because they were made from the original negative.",
      },
      {
        q: "Can Heirvo read Kodak Picture CDs as well?",
        a: "Yes. Kodak Picture CDs (made from the late 1990s onward, containing standard JPEG files) are standard data CDs that Windows can read normally. Heirvo can also recover them if the disc is damaged.",
      },
    ],
    cta: {
      heading: "Your Photo CD images are still in there",
      body: "Heirvo reads Kodak Photo CDs directly and converts every image to JPEG or TIFF at full resolution. Scan free, pay once to save.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in: we'll do it for you",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Best DVD recovery software comparison
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "best-dvd-recovery-software",
    title: "Best DVD Recovery Software for Windows in 2026",
    metaTitle: "Best DVD Recovery Software for Windows in 2026 (Free Options Compared)",
    metaDescription:
      "Honest comparison of the best DVD recovery software for Windows 10 and 11 in 2026 — Heirvo, IsoBuster, CDCheck, PhotoRec, and Unstoppable Copier. Free and paid options reviewed.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "9 min read",
    category: "Software Guide",
    intro:
      "The best DVD recovery software for Windows reads failing discs sector by sector — not once, but in multiple passes at variable speeds, forwards and backwards — to rescue data that a standard file copy would miss entirely. In 2026 there are a handful of tools that do this well. Here is an honest comparison based on what each tool is actually good at.",
    related: ["heirvo-vs-isobuster", "free-dvd-recovery-software", "recover-corrupted-iso-file", "dvd-r-vs-dvd-plus-r-recovery", "mode-select-page-01h-scsi-dvd-recovery", "slim-vs-desktop-dvd-drive-recovery", "powered-usb-hub-dvd-recovery", "vlc-plays-dvd-recovery-fails"],
    sections: [
      {
        id: "what-to-look-for",
        heading: "What to look for in DVD recovery software",
        paragraphs: [
          "Not all disc recovery software is equal. The key features that separate genuinely useful tools from basic file copiers are:",
        ],
        items: [
          "Sector-level scanning — reads the raw disc sectors rather than relying on the file system, which may be damaged",
          "Multi-pass retry logic — retries failed sectors at different speeds and in reverse",
          "Recovery mapping — shows a visual map of which sectors were read successfully",
          "Format support — handles DVD-Video, Data CD, Audio CD, Blu-ray, and Photo CD",
          "File preview before purchase — lets you verify what's recoverable before paying",
          "No subscription required — disc recovery is a one-time task, not an ongoing subscription",
        ],
      },
      {
        id: "comparison-table",
        heading: "DVD recovery software comparison (2026)",
        table: {
          headers: ["Software", "Price", "Best for", "Formats", "Preview before buy"],
          rows: [
            ["Heirvo", "Free scan / $39 save", "Home users, beginners", "DVD, CD, Blu-ray, Photo CD", "Yes"],
            ["IsoBuster", "$39.95+/yr", "Technical users, IT pros", "All optical formats", "Limited (demo mode)"],
            ["CDCheck", "Free / $25 Pro", "Data CD/DVD integrity", "CD, DVD", "Yes (free version)"],
            ["PhotoRec", "Free (open-source)", "Raw file carving", "All (no GUI)", "No"],
            ["Unstoppable Copier", "Free", "Simple file copy retry", "CD, DVD", "No"],
          ],
        },
      },
      {
        id: "heirvo",
        heading: "Heirvo — best for home users and memory recovery",
        paragraphs: [
          "Heirvo is built specifically for people recovering family memories — home videos, photo discs, and audio CDs. The interface is designed for non-technical users: insert disc, click Scan, see what was found. The free scan with full preview before payment makes it low-risk to try.",
          "Unique to Heirvo: native Kodak Photo CD (.PCD) support and built-in MP4 conversion for DVD-Video discs. These are the two most common needs for home video and photo recovery, and no other consumer tool handles both natively.",
          "The one limitation: Heirvo is Windows-only. There is no Mac or Linux version.",
        ],
        callout: {
          label: "Free to try",
          text: "The full scan is free. You only pay $39 if you want to save the recovered files. If nothing was recoverable, you pay nothing.",
          color: "green",
        },
      },
      {
        id: "isobuster",
        heading: "IsoBuster — best for technical users",
        paragraphs: [
          "IsoBuster has been around since the 1990s and is the go-to tool for IT professionals and data recovery specialists. It supports an enormous range of optical formats and provides granular control over every aspect of the recovery process — read speed, sector range, error handling strategy.",
          "The interface is dense and assumes technical knowledge. For a non-technical user trying to recover home movies, the learning curve is steep. It's also subscription-based ($39.95/year), which feels like poor value for a one-time recovery task.",
          "Best for: forensic recovery, professional data recovery work, unusual disc formats like Video CD (VCD) or LaserDisc rips.",
        ],
      },
      {
        id: "photoreccdcheck",
        heading: "PhotoRec and CDCheck — free but limited",
        paragraphs: [
          "PhotoRec is a powerful open-source file carver that can extract files from damaged discs by looking for file header signatures. It has no graphical interface, recovers files with generic numbered filenames, and requires comfort with the command line. For technical users who know what they're doing, it's a solid free option.",
          "CDCheck is a simple disc integrity tool that can copy files while retrying on read errors. The free version works for basic data recovery from mildly damaged discs. It doesn't handle DVD-Video structure or Photo CDs, and the interface hasn't been updated in years.",
          "Unstoppable Copier is the most basic option — it simply retries file copies when they fail. It works for mildly scratched discs but gives up quickly on seriously damaged ones.",
        ],
      },
      {
        id: "which-should-you-use",
        heading: "Which software should you use?",
        paragraphs: [
          "For most people recovering family memories from a damaged DVD — home videos, holiday photos, music — start with Heirvo. The free scan takes 20–60 minutes and shows you exactly what's recoverable before you pay anything.",
          "If you're a technically-minded user who needs forensic-level control or has unusual disc formats, IsoBuster is the professional choice.",
          "If the disc is completely unreadable by any software — heavily delaminated, cracked, or severely oxidised — software recovery is not the right tool. A professional optical recovery lab (like Heirvo's mail-in service) is the next step.",
        ],
      },
    ],
    faq: [
      {
        q: "Is there a completely free DVD recovery tool?",
        a: "PhotoRec and CDCheck (basic version) are free and handle DVD data recovery. PhotoRec is open-source and powerful but has no graphical interface — it's command-line only. Heirvo's scan is also free; you only pay to save the files.",
      },
      {
        q: "What is the best free DVD recovery software for Windows 10?",
        a: "For non-technical users, Heirvo offers the most accessible free scan with a full file preview. For technical users comfortable with the command line, PhotoRec is powerful and completely free.",
      },
      {
        q: "Can DVD recovery software recover files from a broken disc?",
        a: "A cracked or physically broken disc cannot be recovered by software — the data on the broken sections is physically inaccessible. A professional optical recovery lab can sometimes re-bond cracked discs, but results vary. Software recovery works best on scratched, degraded, or partially unreadable discs where the data is intact but difficult to read.",
      },
      {
        q: "Does DVD recovery software work on Blu-ray?",
        a: "Heirvo and IsoBuster both support Blu-ray recovery. You need a Blu-ray disc drive — a standard DVD drive cannot read Blu-ray discs. CDCheck and Unstoppable Copier do not support Blu-ray.",
      },
      {
        q: "My DVD was accidentally formatted — can recovery software get the files back?",
        a: "Possibly. Formatting often leaves the underlying data intact but destroys the file system index. Heirvo's sector-level scanning can often find and recover files even from a formatted or corrupted disc, as long as the physical sectors were not overwritten.",
      },
    ],
    cta: {
      heading: "Try the free scan first",
      body: "Download Heirvo and see what's recoverable from your disc before you pay anything. If software can't help, our mail-in service uses professional optical recovery equipment.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in recovery service",
      secondaryHref: "/recover",
    },
  },
  // ─────────────────────────────────────────────────────────────────────────────
  // 5. How Long Do DVDs Last? Disc Rot Explained
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "how-long-do-dvds-last-disc-rot",
    title: "How Long Do DVDs Last? Disc Rot, Degradation & What to Do",
    metaTitle: "How Long Do DVDs Last? Disc Rot Explained (2026 Guide)",
    metaDescription:
      "DVDs were promised to last 100 years, but many fail in 10–25. Learn why disc rot happens, how to tell if your discs are degrading, and how to recover files before it's too late.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "6 min read",
    category: "Disc Health",
    intro:
      "DVDs last between 10 and 50 years in typical home storage conditions — far less than the '100-year lifetime' manufacturers once promised. Burned DVD-R and DVD+R discs are especially vulnerable, with many failing within 10–25 years. Disc rot — the chemical breakdown of a disc's reflective or dye layer — is irreversible once it starts, making early detection and file backup critical.",
    related: ["recover-files-scratched-dvd", "recover-home-videos-dvd", "copy-dvd-to-hard-drive-windows-11", "free-dvd-recovery-software", "dvd-drive-disconnects-mid-scan", "dvd-drive-freezing-mid-recovery-fix"],
    sections: [
      {
        id: "how-long-dvds-last",
        heading: "How long do DVDs actually last?",
        paragraphs: [
          "Pressed (commercial) DVDs — the kind movies and software ship on — typically survive 30–100 years under ideal storage conditions. The data is physically stamped into a polycarbonate layer, making it highly resistant to chemical degradation.",
          "Burned discs (DVD-R, DVD+R, DVD-RW) are a different story. These use an organic dye layer that reacts with light, heat, and humidity over time. Independent accelerated-aging studies have found that cheap burned discs can fail in as few as 5–10 years, while high-quality archival-grade blanks may survive 25–50 years.",
          "Real-world failure rates tell the same story. A Library of Congress study found that 10–20% of home-burned discs from the early 2000s were already unreadable by 2015 — just 10–15 years after burning.",
        ],
      },
      {
        id: "what-is-disc-rot",
        heading: "What is disc rot?",
        paragraphs: [
          "Disc rot is an umbrella term for chemical or physical degradation of an optical disc's layers. On pressed DVDs, it typically affects the reflective aluminum layer, which oxidizes when oxygen or moisture penetrates through the lacquer coating or edge of the disc. The result is a brownish, cloudy, or spotted appearance when held up to light.",
          "On burned discs, rot usually attacks the organic dye layer itself, causing uneven fading or delamination. Either form of rot scatters the laser beam enough to produce uncorrectable read errors — the drive simply reports the file as missing or corrupted.",
        ],
        callout: {
          label: "Key fact",
          color: "amber",
          text: "Disc rot is irreversible. Once the reflective or dye layer degrades, no software can recover data that has physically disappeared — it can only recover sectors that still reflect enough laser light to be read.",
        },
      },
      {
        id: "signs-of-disc-rot",
        heading: "Signs your DVDs are rotting",
        items: [
          "Brownish or bronze discoloration visible when held up to light (especially near the hub or outer edge)",
          "Pinhole-sized transparent spots or cloudy patches on the reflective surface",
          "Files that previously opened now show 'cyclic redundancy check' (CRC) errors",
          "Disc spins but Windows Explorer shows empty or missing folders",
          "Drive makes repeated clicking or seeking sounds before reporting an error",
          "Disc previously worked but now 'not recognised' in multiple drives",
        ],
      },
      {
        id: "storage-conditions",
        heading: "Storage conditions that accelerate degradation",
        table: {
          caption: "How storage conditions affect DVD lifespan",
          headers: ["Factor", "Safe range", "Risk if ignored"],
          rows: [
            ["Temperature", "Below 23°C (73°F)", "Heat accelerates dye breakdown — attics are discs' worst enemy"],
            ["Humidity", "20–50% RH", "Moisture penetrates lacquer, oxidises aluminium layer"],
            ["Light exposure", "Dark storage", "UV and visible light degrade organic dyes in burned discs"],
            ["Storage position", "Vertical in case", "Horizontal stacking warps discs over time; paper sleeves trap moisture"],
            ["Disc quality", "Archival-grade (Verbatim, Taiyo Yuden)", "Cheap discs use thinner dye layers that fade faster"],
          ],
        },
      },
      {
        id: "recover-before-rot",
        heading: "How to recover files from a rotting disc",
        paragraphs: [
          "If your disc shows early signs of rot — some sectors still reflect light — specialist recovery software can often rescue the majority of files. The key is reading each damaged sector multiple times at varying speeds, because the laser sometimes succeeds on the tenth attempt where it failed on the first.",
          "Standard software like Windows Explorer or VLC stops at the first read error and reports the file as broken. Sector-level disc recovery tools keep retrying, log which sectors succeeded, and reconstruct files from what they can recover.",
          "For discs with advanced rot — large opaque patches, severe delamination, or no reflection at all — professional mail-in services using specialised optical equipment are the last resort. These services can sometimes read discs that no consumer hardware can touch.",
        ],
        callout: {
          label: "Act early",
          color: "blue",
          text: "Disc rot accelerates as it progresses. A disc losing 5% of its sectors today may lose 30% within two years. If you can still read most of the disc, backup now — don't wait until the drive won't spin it at all.",
        },
      },
      {
        id: "prevention",
        heading: "How to prevent disc rot going forward",
        items: [
          "Store discs vertically in hard cases (not paper sleeves) in a cool, dark, dry location",
          "Use archival-grade blanks for anything you want to keep: Verbatim DataLife Plus, Taiyo Yuden, or M-Disc for critical files",
          "Never write on a disc with a ballpoint pen — use a soft felt-tip marker on the hub label area only",
          "Back up important discs to hard drive or cloud storage now, while they still read reliably",
          "Check your oldest discs every 2–3 years — a quick scan with recovery software will flag deteriorating sectors before total failure",
        ],
      },
    ],
    faq: [
      {
        q: "How do I know if my DVD has disc rot?",
        a: "Hold the disc up to a bright light and look through the top surface. Disc rot appears as brownish discoloration, cloudy patches, or pinhole-sized transparent spots. You may also see it as a ring or patch near the hub or outer edge. Functional discs should appear uniformly silver or gold with no cloudy areas.",
      },
      {
        q: "Can you fix disc rot?",
        a: "No. Disc rot is permanent chemical degradation of the disc's layers — it cannot be reversed. What you can do is recover the data that's still readable before the rot spreads further. Once a sector has completely degraded, that data is gone permanently.",
      },
      {
        q: "Do DVD-R discs rot faster than commercial pressed DVDs?",
        a: "Yes. Burned DVD-R, DVD+R, and DVD-RW discs use an organic dye layer that degrades much faster than the pressed aluminium data layer of commercial discs. Under poor storage conditions, burned discs can fail in under 10 years, while pressed discs typically last 30–100 years.",
      },
      {
        q: "What percentage of old burned DVDs are unreadable?",
        a: "Research from the Library of Congress found that 10–20% of home-burned DVDs from the early 2000s were already unreadable by 2015 — roughly 10–15 years after creation. Discs stored in attics, garages, or in paper sleeves fail at much higher rates.",
      },
      {
        q: "Can recovery software recover data from a disc with disc rot?",
        a: "It depends on severity. If the disc still reflects light in the damaged areas — early or moderate rot — sector-level recovery software like Heirvo can often rescue 70–95% of files by retrying each sector many times. Discs with large opaque or delaminated patches have lost that data permanently and may require professional mail-in recovery for the remaining readable areas.",
      },
    ],
    cta: {
      heading: "Don't wait until it's too late",
      body: "Scan your discs now while they still read. Heirvo's free scan shows exactly which files are recoverable before you pay anything.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in recovery service",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. How to Recover Data from a CD-ROM on Windows
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-data-from-cd-rom-windows",
    title: "How to Recover Data from a CD-ROM on Windows 10 & 11",
    metaTitle: "How to Recover Data from a CD-ROM on Windows 10 & 11 (2026)",
    metaDescription:
      "Step-by-step guide to recovering files from a damaged, scratched, or unreadable CD-ROM on Windows. Works for data CDs, software CDs, photo CDs, and music CDs.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "6 min read",
    category: "CD Recovery",
    intro:
      "You can recover data from a scratched or damaged CD-ROM by using disc recovery software that retries each failed sector at multiple speeds instead of stopping at the first error. Most data CDs with light-to-moderate scratches yield 85–98% of their files with a proper sector-level scan — even when Windows reports the disc as unreadable.",
    related: ["recover-files-scratched-dvd", "kodak-photo-cd-recovery", "recover-music-from-scratched-cd", "recover-data-from-zip-disk", "mode-select-page-01h-scsi-dvd-recovery", "powered-usb-hub-dvd-recovery", "slim-vs-desktop-dvd-drive-recovery"],
    sections: [
      {
        id: "why-windows-fails",
        heading: "Why Windows can't read your CD-ROM",
        paragraphs: [
          "Windows Explorer and standard media players use a single-pass read strategy: they try each sector once, and if the drive reports an error, they give up and tell you the file is corrupted or the disc is blank. This is a reasonable approach for a healthy drive, but it fails badly for damaged discs.",
          "A scratched CD-ROM has sectors where the laser scatters instead of reflecting cleanly. On the first attempt, the error correction built into the CD standard (CIRC — Cross-Interleaved Reed-Solomon Coding) may not be enough to reconstruct the data. But on the third, fifth, or fifteenth attempt — sometimes at a slower read speed — the same sector reads successfully.",
          "Disc recovery software exploits this by retrying failed sectors many times, varying the read speed, and sometimes reading backwards. It's slower, but the recovery rate is dramatically higher.",
        ],
      },
      {
        id: "what-you-need",
        heading: "What you need to recover a CD-ROM",
        items: [
          "A Windows 10 or Windows 11 PC (64-bit)",
          "A DVD/CD drive — internal or USB external; older drives sometimes read better than newer ones",
          "Disc recovery software (Heirvo is free to scan; you pay $39 only if files are found)",
          "Enough free disk space to hold the recovered files (same size as the disc's content)",
          "5 minutes to 3 hours depending on disc condition — worse discs take longer",
        ],
      },
      {
        id: "step-by-step",
        heading: "Step-by-step: recover files from a CD-ROM",
        numbered: true,
        items: [
          "Clean the disc first — wipe from the centre outward (not in circles) with a soft, lint-free cloth. Never use household cleaners. Mild soap and water, then dry completely, is safe.",
          "Insert the CD-ROM into your drive. If Windows asks what to do, close the dialog without opening Explorer.",
          "Download and install Heirvo from heirvo.com/download. The installer is about 18 MB.",
          "Open Heirvo and select your CD/DVD drive from the drive list.",
          "Click 'Scan Disc.' Heirvo performs a sector-by-sector pass, logging errors and retrying failed sectors multiple times. A moderately damaged disc takes 30–90 minutes.",
          "Review the scan results. Heirvo shows which files were fully recovered, partially recovered, or unreadable.",
          "Click 'Save Recovered Files' and choose a destination folder on your hard drive. You pay $39 at this step — only if there are files to save.",
        ],
      },
      {
        id: "cd-types",
        heading: "Different types of CDs and recovery notes",
        table: {
          caption: "CD types and recovery considerations",
          headers: ["CD Type", "Common contents", "Recovery notes"],
          rows: [
            ["CD-ROM (pressed)", "Software, games, encyclopaedias", "Most durable — data is physically pressed; good recovery rate even with scratches"],
            ["CD-R (burned once)", "Home photos, music, backups", "Uses organic dye — vulnerable to light and heat; recover urgently if showing age"],
            ["CD-RW (rewritable)", "Data backups, archives", "Most fragile format; additional wear from multiple write cycles reduces lifespan"],
            ["Audio CD", "Music albums", "Recovery software extracts audio tracks as WAV or MP3 files"],
            ["Photo CD (Kodak)", "Scanned photos in PCD format", "Requires software that understands Kodak's proprietary PCD format"],
            ["VCD / SVCD", "Home video recordings", "Video stored as MPEG-1/2; recovery outputs the raw video files"],
          ],
        },
      },
      {
        id: "if-software-fails",
        heading: "If software can't recover the files",
        paragraphs: [
          "Some discs are too physically damaged for any software to help — deep gouges through the data layer, severe disc rot, or delamination. If Heirvo's scan returns zero recoverable files, it won't charge you anything.",
          "The next step for heavily damaged CDs is a professional mail-in recovery service. These services use industrial optical drives with hardware-level error correction, controlled environments, and in some cases can read discs where the reflective layer is largely gone. Heirvo's mail-in service starts at $89 and carries a no-recovery/no-charge guarantee.",
        ],
        callout: {
          label: "Before sending for mail-in",
          color: "blue",
          text: "Try software first — it's free to scan and much faster. Mail-in recovery makes sense when software finds zero recoverable sectors, or for discs with physical damage beyond surface scratches.",
        },
      },
    ],
    faq: [
      {
        q: "Can Windows 10 recover data from a scratched CD?",
        a: "Windows 10's built-in tools (File Explorer, Windows Media Player) cannot recover data from scratched CDs — they stop at the first read error. You need specialist disc recovery software that retries failed sectors multiple times at varying speeds, which is how the majority of files are recovered from damaged discs.",
      },
      {
        q: "Does cleaning a CD help it read better?",
        a: "Often yes, for light surface contamination. Wipe from the centre outward with a soft cloth. For deep scratches, cleaning doesn't help — the damage is below the surface. Commercial disc resurfacing can sometimes reduce shallow scratches enough to recover more sectors.",
      },
      {
        q: "How long does CD-ROM recovery take?",
        a: "Lightly scratched discs with few errors scan in 15–30 minutes. Moderately damaged discs take 1–2 hours as the software retries failed sectors. Severely damaged discs can take 3–6 hours. The software tries each bad sector many times before giving up on it.",
      },
      {
        q: "What files can I recover from a CD-ROM?",
        a: "Any file type stored on the disc: documents, photos, videos, audio tracks, software installers, database files, and more. The recovery software reads raw sector data, so it works regardless of file format — it doesn't need to understand the file contents to recover them.",
      },
      {
        q: "Is it worth trying to recover an old CD from the 1990s?",
        a: "Definitely try. Pressed CDs from the 1990s are often in better condition than burned CD-Rs from the early 2000s. Many 25-year-old pressed CDs scan perfectly. For burned discs of that age, expect some sector loss but often still a high recovery rate for most files.",
      },
    ],
    cta: {
      heading: "Start with the free scan",
      body: "Heirvo scans your CD for free and shows exactly what can be recovered. You only pay $39 if there are files worth saving.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Learn about mail-in recovery",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Heirvo vs ISOBuster — DVD Recovery Software Comparison
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "heirvo-vs-isobuster",
    title: "Heirvo vs IsoBuster: Which DVD Recovery Software Is Better?",
    metaTitle: "Heirvo vs IsoBuster (2026): DVD Recovery Software Compared",
    metaDescription:
      "Honest comparison of Heirvo and IsoBuster for recovering files from scratched and damaged DVDs, CDs, and Blu-ray discs on Windows. Pricing, ease of use, and recovery rates compared.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "5 min read",
    category: "Software Comparison",
    intro:
      "Heirvo and IsoBuster are both Windows disc recovery tools, but they target different users. Heirvo is built for people who just need to get files off a damaged disc quickly, with a free-scan-then-pay model. IsoBuster is a deep forensic tool with more technical controls, a steeper learning curve, and a subscription pricing model. The right choice depends on whether you need simplicity or maximum control.",
    related: ["best-dvd-recovery-software", "recover-files-scratched-dvd", "free-dvd-recovery-software", "dvd-r-vs-dvd-plus-r-recovery", "mode-select-page-01h-scsi-dvd-recovery", "slim-vs-desktop-dvd-drive-recovery", "dvd-drive-disconnects-mid-scan"],
    sections: [
      {
        id: "quick-comparison",
        heading: "Side-by-side comparison",
        table: {
          caption: "Heirvo vs IsoBuster feature comparison (2026)",
          headers: ["Feature", "Heirvo", "IsoBuster"],
          rows: [
            ["Price", "$39 one-time (free to scan)", "$49.95/year subscription"],
            ["Pricing model", "Pay only if files recovered", "Subscription regardless of results"],
            ["Supported formats", "DVD, CD, Blu-ray, Kodak Photo CD", "DVD, CD, Blu-ray, HD DVD, and many more"],
            ["Ease of use", "Beginner-friendly, guided workflow", "Advanced — requires disc knowledge"],
            ["Sector retry logic", "Automatic, optimised", "Manual controls available"],
            ["Mail-in service", "Yes — $89+ no-recovery/no-charge", "No"],
            ["Platform", "Windows 10 & 11 (64-bit)", "Windows XP through 11"],
            ["Interface", "Modern, clean UI", "Traditional, technical interface"],
            ["Best for", "Home users, one-time recovery", "IT professionals, forensic users"],
          ],
        },
      },
      {
        id: "pricing",
        heading: "Pricing: one-time vs subscription",
        paragraphs: [
          "Heirvo charges $39 as a one-time payment, and only when files are successfully found and saved. If the scan finds nothing recoverable, you pay nothing. This makes it low-risk for someone with one or two discs to recover.",
          "IsoBuster uses an annual subscription model starting at $49.95/year. This makes more sense for IT professionals or labs that process many discs regularly. For a home user with a handful of old family DVDs, the subscription model means paying annually for something you may use once.",
        ],
        callout: {
          label: "Bottom line on pricing",
          color: "green",
          text: "If you have one or a few personal discs to recover, Heirvo's free-scan-then-pay model costs less and carries no risk. If you process discs professionally or need advanced forensic features, IsoBuster's annual subscription may be worth it.",
        },
      },
      {
        id: "ease-of-use",
        heading: "Ease of use",
        paragraphs: [
          "Heirvo is designed for people who just want their files back. Insert disc, open the app, click Scan, review results, save files. The whole process has no configuration required — the software handles retry logic, speed stepping, and error handling automatically.",
          "IsoBuster gives experienced users fine-grained control: you can adjust read speeds manually, choose specific retry algorithms, extract raw sector images, and work with partially readable file systems. This level of control is powerful for forensic use cases but overwhelming for someone who just wants their wedding video off a scratched disc.",
        ],
      },
      {
        id: "recovery-capability",
        heading: "Recovery capability",
        paragraphs: [
          "Both tools use sector-by-sector scanning with retry logic. IsoBuster has more manual controls and has been around since 1995, making it a trusted tool in professional data recovery circles. It also supports a wider range of disc formats including HD DVD and some proprietary formats.",
          "Heirvo focuses specifically on the most common formats (DVD, CD, Blu-ray, Kodak Photo CD) and optimises its retry logic automatically. For the typical use case — recovering family videos, photos, or software from a scratched disc — recovery rates are comparable.",
        ],
      },
      {
        id: "mail-in-service",
        heading: "When software isn't enough",
        paragraphs: [
          "Neither Heirvo nor IsoBuster can recover data that has been physically destroyed — sectors where the reflective layer or dye is completely gone. For discs with severe disc rot, deep gouges, or delamination, professional mail-in recovery with specialist equipment is the only option.",
          "Heirvo offers a mail-in recovery service starting at $89, with a no-recovery/no-charge guarantee. IsoBuster does not offer a mail-in service — you would need to find a separate data recovery lab.",
        ],
      },
      {
        id: "which-to-choose",
        heading: "Which should you choose?",
        items: [
          "Choose Heirvo if: you have personal DVDs or CDs with home videos or photos, you want a simple process with no configuration, and you only need it once or a few times",
          "Choose Heirvo if: you want the option of mail-in recovery if software fails, all from the same company",
          "Choose IsoBuster if: you're an IT professional recovering discs regularly and need forensic-level controls",
          "Choose IsoBuster if: you need support for obscure or legacy disc formats beyond DVD/CD/Blu-ray",
          "Try both: Heirvo's free scan costs nothing — scan your disc first, and if results look complete, save the files for $39",
        ],
      },
    ],
    faq: [
      {
        q: "Is Heirvo better than IsoBuster?",
        a: "For home users recovering personal DVDs or CDs, Heirvo's simpler interface and no-risk pricing model (free to scan, pay only to save) make it a better choice. IsoBuster is more powerful for professional or forensic use cases where manual control and support for obscure formats matter.",
      },
      {
        q: "Does IsoBuster have a free trial?",
        a: "IsoBuster has a free version with limited functionality — it can scan and show file structure but restricts saving files without a paid licence. Heirvo's free tier scans completely and shows exactly which files are recoverable, and you only pay $39 if you choose to save them.",
      },
      {
        q: "Can both tools recover from Kodak Photo CDs?",
        a: "Yes, both Heirvo and IsoBuster support Kodak Photo CD (PCD format). Heirvo includes support for Kodak Photo CD as a primary use case, given how many families have these discs from the 1990s.",
      },
      {
        q: "Which is faster — Heirvo or IsoBuster?",
        a: "For typical disc recovery on common formats, speed is similar since both are limited by the optical drive hardware. Heirvo's automated retry logic may be slightly faster in practice because it doesn't require manual configuration before starting.",
      },
      {
        q: "Are there other alternatives to IsoBuster?",
        a: "Other disc recovery options include DVDisaster (free, open source), CDCheck (freeware), and Recuva (for hard drives, limited disc support). For a complete comparison of all options see our guide to the best DVD recovery software.",
      },
    ],
    cta: {
      heading: "Try Heirvo free — no risk",
      body: "Scan your disc at no cost. See exactly which files are recoverable before you decide to pay anything.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in recovery service",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Recover wedding DVD
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-wedding-dvd",
    title: "How to Recover a Wedding DVD That Won't Play",
    metaTitle: "How to Recover a Wedding DVD That Won't Play (2026 Guide)",
    metaDescription: "Wedding DVDs stop playing for three reasons: scratches, disc rot, or an unfinalized burn. This guide covers all three and shows you how to recover the footage on Windows.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "7 min read",
    category: "DVD Recovery",
    intro:
      "A wedding DVD that won't play is one of the most emotionally urgent disc recovery situations there is. The good news is that most wedding DVDs fail for recoverable reasons — surface scratches, early-stage disc rot, or an unfinalized burn by the videographer — rather than catastrophic physical damage. This guide explains what's likely wrong and exactly how to get your footage back on Windows.",
    related: ["recover-files-scratched-dvd", "recover-unfinalized-dvd", "recover-video-from-camcorder-dvd", "recover-dvd-car-heat-damage", "dvd-drive-freezing-mid-recovery-fix", "slim-vs-desktop-dvd-drive-recovery"],
    sections: [
      {
        id: "why-wedding-dvds-fail",
        heading: "Why wedding DVDs stop playing",
        level: 2,
        paragraphs: [
          "Wedding DVDs fail for a handful of distinct reasons, and the fix depends on which one applies to your disc. The three most common causes are:",
        ],
        items: [
          "Surface scratches — the disc was handled, stored in a paper sleeve, or sat in a hot car. The dye layer is still intact, but the laser can't read through the scratched surface.",
          "Disc rot — DVD-R and DVD+R discs burned between 1998 and 2010 are now 15–28 years old and many are degrading chemically. The reflective layer oxidises and turns the disc hazy or bronze-tinted.",
          "Unfinalized disc — some videographers burned footage to a DVD-R without running the finalisation step. Unfinalized discs won't play in a standard DVD player or computer, but the data is still fully present.",
        ],
      },
      {
        id: "check-disc-condition",
        heading: "Step 1 — Identify what's wrong",
        level: 2,
        paragraphs: [
          "Hold the disc under a bright light and tilt it slowly. Look for:",
        ],
        items: [
          "Visible scratches running across the data surface (the underside) — these cause read errors in specific areas.",
          "A milky, bronze, or iridescent sheen across the whole disc instead of the usual silver or gold — this is disc rot and affects the whole disc uniformly.",
          "A disc that Windows doesn't recognise at all, shows as blank, or plays in some drives but not others — this suggests an unfinalized disc.",
        ],
      },
      {
        id: "recover-scratched-wedding-dvd",
        heading: "Recovering a scratched wedding DVD",
        level: 2,
        paragraphs: [
          "For scratched discs, sector-level recovery software is the right tool. It retries each failing sector dozens of times at variable read speeds, recovering data that a normal file copy misses entirely.",
          "Download Heirvo, insert the disc, and click Start Recovery. The software will scan the disc, build a map of readable and damaged sectors, and extract whatever it can — including the main feature and any bonus footage burned to the disc. Even discs with significant scratching typically yield 85–95% of the footage.",
          "If the disc won't seat properly or spins but isn't recognised, try a different USB optical drive. Slim laptop drives are notoriously poor at reading marginal discs — a full-size external drive almost always performs better.",
        ],
        callout: {
          label: "Before you scan",
          text: "Clean the disc with a microfibre cloth, wiping from centre to edge in straight lines. Never wipe in circles — this can add fine circular scratches across data tracks. Even a light cleaning often improves the read success rate significantly.",
          color: "blue",
        },
      },
      {
        id: "recover-disc-rot-wedding-dvd",
        heading: "Recovering a wedding DVD with disc rot",
        level: 2,
        paragraphs: [
          "Early-stage disc rot is recoverable with software. If the disc plays partially — or if Heirvo's scan recovers most but not all sectors — the dye layer has degraded but isn't gone yet. Run a full sector-level scan; you'll typically recover 60–90% of the footage depending on severity.",
          "Advanced disc rot (the disc looks almost entirely bronze or has visible pinholes when held to light) is beyond software recovery. At that stage the reflective layer has physically separated or disintegrated. A professional recovery lab can sometimes read discs at this stage using modified optical equipment, which is what Heirvo's mail-in service uses.",
        ],
        callout: {
          label: "Act now",
          text: "Disc rot is progressive — a disc that yields 80% today may yield 40% in six months. If your disc shows any signs of rot, recover it immediately rather than waiting.",
          color: "amber",
        },
      },
      {
        id: "recover-unfinalized-wedding-dvd",
        heading: "Recovering an unfinalized wedding DVD",
        level: 2,
        paragraphs: [
          "An unfinalized DVD-R contains all the video data — it just lacks the closing table of contents that DVD players and Windows use to navigate the disc. Heirvo handles unfinalized discs by reading the raw disc structure directly rather than relying on the missing index.",
          "Insert the disc and run a scan. Heirvo will detect the unfinalized state, read the VOB files directly, and extract them to MP4. In most cases the complete ceremony and reception footage is fully intact.",
        ],
      },
      {
        id: "mail-in-recovery",
        heading: "When to use professional recovery",
        level: 2,
        paragraphs: [
          "If the software scan recovers less than 50% of the disc, or if the disc has visible delamination (layers peeling apart), professional recovery is the next step. Heirvo's mail-in service uses lab-grade optical equipment that can read discs software tools can't.",
          "For wedding footage specifically, professional recovery is worth the cost — this is footage that cannot be recreated. Post the disc and we'll tell you exactly what's recoverable before you pay anything.",
        ],
      },
    ],
    faq: [
      {
        q: "Can a wedding DVD be recovered if it has never played at all?",
        a: "Yes — a disc that has never played successfully is often an unfinalized burn, which is fully recoverable with the right software. Insert it and run a scan; Heirvo will read the raw disc structure regardless of whether the disc finalised correctly.",
      },
      {
        q: "My wedding was 20 years ago — is it too late to recover the DVD?",
        a: "It depends on how the disc was stored. DVDs kept in a cool, dark, dry environment often survive 20+ years in good condition. Discs stored in hot cars, direct sunlight, or humid environments degrade faster. Run a scan — you'll know within minutes whether the data is still there.",
      },
      {
        q: "The disc plays in some DVD players but not others. Is it recoverable?",
        a: "Yes — a disc that plays in some drives is partially readable, which is a good sign. Different drives have different error-correction capabilities. Use a full-size external USB drive rather than a slim laptop drive for the recovery scan.",
      },
      {
        q: "What if only part of the wedding video recovered?",
        a: "Partial recovery is common with heavily scratched or moderately rotted discs. Heirvo's engine produces a playable MP4 from whatever sectors it recovered, trimmed to the continuous footage available. You'll typically get the ceremony or the reception fully intact even if the other half is damaged.",
      },
    ],
    cta: {
      heading: "Recover your wedding footage today",
      body: "Scan your disc free — see exactly what's recoverable before you pay anything. Takes about 10 minutes.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in recovery service",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Recover unfinalized DVD
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-unfinalized-dvd",
    title: "How to Recover an Unfinalized DVD on Windows",
    metaTitle: "How to Recover an Unfinalized DVD on Windows (2026 Guide)",
    metaDescription: "An unfinalized DVD won't play in any player, but the video data is usually 100% intact. Here's how to extract the footage on Windows without losing a single frame.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "5 min read",
    category: "DVD Recovery",
    intro:
      "An unfinalized DVD-R is one of the most misunderstood disc problems — people assume the footage is lost because the disc won't play anywhere. In reality, the video data is almost always completely intact. The disc simply lacks the closing index that DVD players need to navigate it. This guide explains what an unfinalized disc is and exactly how to extract the footage on Windows.",
    related: ["recover-wedding-dvd", "recover-home-videos-dvd", "recover-video-from-camcorder-dvd", "recover-8mm-film-dvd-transfer", "vlc-plays-dvd-recovery-fails", "dvd-drive-freezing-mid-recovery-fix"],
    sections: [
      {
        id: "what-is-unfinalized",
        heading: "What 'unfinalized' actually means",
        level: 2,
        paragraphs: [
          "When you burn a DVD-R or DVD+R, the burning software writes video data to the disc in sessions. At the end of the burn, it writes a final table of contents — called the lead-out — that tells any player how to navigate the disc. If the burning process was interrupted, the software was closed prematurely, or the videographer simply forgot this step, the lead-out is missing.",
          "Without the lead-out, a standard DVD player or Windows DVD player software returns an error or treats the disc as blank. But the video data is written first and is completely unaffected by the missing lead-out. It's still there, sector by sector, exactly as it was burned.",
        ],
        callout: {
          label: "How to tell if your disc is unfinalized",
          text: "Insert the disc into your computer. If Windows shows it as blank or with 0 bytes, but the disc clearly has data burned to it (you can see the burn ring on the underside), it is almost certainly unfinalized.",
          color: "blue",
        },
      },
      {
        id: "how-to-recover",
        heading: "How to recover an unfinalized DVD on Windows",
        level: 2,
        paragraphs: [
          "Standard file-copy tools fail on unfinalized discs because they rely on the missing table of contents. You need software that reads the raw sector data directly, bypassing the navigation layer entirely.",
        ],
        items: [
          "Download and install Heirvo on your Windows 10 or 11 PC.",
          "Insert the unfinalized disc into your optical drive.",
          "Click Start Recovery. Heirvo detects the unfinalized state automatically and switches to raw VOB extraction mode.",
          "The software reads the disc sector by sector, locates the video data by signature rather than by the missing index, and extracts it.",
          "When the scan completes, click Save — Heirvo converts the raw VOB data to a standard MP4 you can play on any device.",
        ],
        numbered: true,
      },
      {
        id: "recovery-time",
        heading: "How long does it take?",
        level: 2,
        paragraphs: [
          "An unfinalized disc with no physical damage typically takes 15–30 minutes to scan and extract. The disc is fully readable — the only complication is the missing lead-out, which Heirvo works around automatically.",
          "If the disc also has scratches or disc rot on top of being unfinalized, the scan will take longer as the engine retries damaged sectors. In that case, expect 1–3 hours for a heavily damaged disc.",
        ],
      },
      {
        id: "other-tools",
        heading: "Why other tools don't work",
        level: 2,
        paragraphs: [
          "IsoBuster can read unfinalized discs, but it requires you to manually navigate the session tree and identify the correct session — not obvious if you're not familiar with disc structure. CDRoller handles some unfinalized formats but struggles with multi-session burns.",
          "Free tools like DVDisaster are designed for sector-level recovery of finalised discs and do not handle the unfinalized case. VLC and Handbrake require a readable disc structure and will simply report an error.",
          "Heirvo detects the unfinalized state automatically and requires no manual intervention.",
        ],
      },
      {
        id: "prevention",
        heading: "How to prevent this in future",
        level: 2,
        paragraphs: [
          "If you still use a DVD burner, always let the burning software complete its full process, including the finalisation step. In Windows, if you use the built-in burn feature, choose 'Eject' rather than just opening the tray — this triggers finalisation.",
          "More practically: stop burning to DVD-R for archiving. Copy your recovered footage to an external hard drive and a cloud backup. Optical media is a poor long-term archival format for personal use.",
        ],
      },
    ],
    faq: [
      {
        q: "Can an unfinalized DVD be finalized after the fact?",
        a: "Technically yes — some burning software (ImgBurn, Nero) can finalise an unfinalized disc if it was burned on the same drive type. In practice this is unreliable and can make the disc worse. It's safer to extract the data with recovery software rather than attempting to finalise.",
      },
      {
        q: "My unfinalized DVD is also scratched. Can I still recover it?",
        a: "Yes — Heirvo handles both problems simultaneously. It bypasses the missing lead-out and retries scratched sectors. You'll get whatever data is physically readable on the disc, assembled into a playable output.",
      },
      {
        q: "Windows shows the disc as blank but I can see the burn ring. Is the footage gone?",
        a: "No — a disc showing as blank in Windows despite a visible burn ring is the classic unfinalized disc symptom. The data is almost certainly intact. Run a scan with Heirvo and it will find it.",
      },
      {
        q: "How is an unfinalized disc different from a disc that was never burned?",
        a: "A blank unburned disc has no visible ring on the underside and Windows reports 0% used capacity. An unfinalized disc has a clearly visible burn ring and may show a small amount of capacity used (the few bytes that were written before the burn was interrupted). Heirvo distinguishes between these automatically.",
      },
    ],
    cta: {
      heading: "Recover your unfinalized disc now",
      body: "Heirvo reads unfinalized DVD-R and DVD+R discs directly. Free scan — see what's recoverable before you pay.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "See how it works",
      secondaryHref: "/#how",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. Recover Blu-ray disc on Windows
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-data-from-blu-ray-windows",
    title: "How to Recover Data from a Damaged Blu-ray Disc on Windows",
    metaTitle: "How to Recover Data from a Damaged Blu-ray Disc on Windows (2026 Guide)",
    metaDescription: "Scratched or unreadable Blu-ray disc on Windows? This guide covers the tools and techniques that actually work for BD-R, BD-RE, and pressed Blu-ray discs in 2026.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "8 min read",
    category: "Blu-ray Recovery",
    intro:
      "Recovering data from a damaged Blu-ray disc on Windows is harder than DVD recovery for one main reason: Blu-ray drives have less aggressive built-in error correction than DVD drives, which means more sectors are reported as unreadable even when the data is physically present. With the right sector-level recovery software, most scratched or degraded Blu-ray discs are at least partially recoverable.",
    related: ["recover-files-scratched-dvd", "best-dvd-recovery-software", "dvd-r-vs-dvd-plus-r-recovery", "dvd-drive-not-reading-disc-windows-11", "mode-select-page-01h-scsi-dvd-recovery", "slim-vs-desktop-dvd-drive-recovery", "dvd-drive-disconnects-mid-scan"],
    sections: [
      {
        id: "blu-ray-vs-dvd-recovery",
        heading: "Why Blu-ray recovery is different from DVD recovery",
        level: 2,
        paragraphs: [
          "Blu-ray discs store data at a much higher density than DVDs — 25 GB on a single layer versus 4.7 GB. The laser spot is smaller and the tracks are closer together, which makes the format more sensitive to surface contamination and fine scratches. A scratch that a DVD drive would read through can cause a Blu-ray drive to give up entirely.",
          "Blu-ray drives also tend to retry fewer times before reporting an error, compared to DVD drives that will hammer a bad sector for 30+ seconds. This means recovery software needs to compensate with more aggressive retry logic — which is exactly what Heirvo's engine does.",
        ],
        callout: {
          label: "Drive matters more for Blu-ray",
          text: "For Blu-ray recovery, the quality of your optical drive makes a significantly larger difference than for DVDs. A cheap USB Blu-ray drive may fail on sectors that a good drive reads successfully. If recovery fails with one drive, try another before concluding the data is unreadable.",
          color: "blue",
        },
      },
      {
        id: "what-you-need",
        heading: "What you need",
        level: 2,
        items: [
          "A Windows 10 or 11 PC (64-bit)",
          "A Blu-ray optical drive — internal or USB external. Avoid very cheap drives; LG and ASUS make reliable budget options.",
          "Heirvo disc recovery software — free to download and scan",
          "Enough free hard drive space for the recovered data (up to 50 GB for a dual-layer BD)",
        ],
      },
      {
        id: "step-by-step",
        heading: "Step-by-step: recover data from a Blu-ray disc",
        level: 2,
        items: [
          "Clean the disc gently with a microfibre cloth, wiping from centre to edge. Blu-ray discs have a hard coating that resists light scratches, but dust and fingerprints cause the same read errors as scratches.",
          "Insert the Blu-ray disc into your drive and open Heirvo.",
          "Click Start Recovery. Heirvo detects the disc format automatically and applies Blu-ray-specific retry parameters.",
          "The engine builds a sector map of the disc, retrying each failing sector multiple times at variable speeds. This is slower than DVD scanning — allow 2–5 hours for a badly damaged BD.",
          "When the scan completes, click Save. Heirvo outputs recovered files directly if the disc contains data files, or converts video content to MP4 if it's a BD video disc.",
        ],
        numbered: true,
      },
      {
        id: "types-of-blu-ray",
        heading: "BD-R, BD-RE, and pressed discs — what's different",
        level: 2,
        paragraphs: [
          "Pressed Blu-ray discs (commercial movies, games) are the most durable format. They use a moulded polycarbonate structure rather than a dye layer, so they don't suffer disc rot. Scratches are the primary failure mode, and they recover well with sector-level tools.",
          "BD-R discs (burned once, like DVD-R) use an organic dye layer and degrade over time, similar to DVD-R. The degradation is typically slower than DVD-R because of the hard coating, but it still happens — especially in discs burned before 2015.",
          "BD-RE (rewritable) discs use a phase-change recording layer. They're durable but sensitive to deep scratches. Recovery success rates are similar to pressed discs.",
        ],
        table: {
          caption: "Blu-ray format recovery comparison",
          headers: ["Format", "Failure mode", "Recovery difficulty", "Disc rot risk"],
          rows: [
            ["Pressed BD", "Scratches only", "Low — good recovery rates", "None"],
            ["BD-R", "Scratches + dye degradation", "Medium", "Moderate (older discs)"],
            ["BD-RE", "Scratches", "Low–Medium", "Low"],
          ],
        },
      },
      {
        id: "limits",
        heading: "When software recovery won't work",
        level: 2,
        paragraphs: [
          "Deep gouges through the hard coating and into the data layer are generally unrecoverable with software. Unlike DVDs, Blu-ray discs cannot be polished and re-read — the hard coating is too thin.",
          "If your scan recovers less than 40% of a Blu-ray disc and the disc looks physically intact (no gouges, no rot), the problem is likely drive quality. Try a different, higher-quality Blu-ray drive before concluding the data is lost.",
          "For Blu-ray discs with important data that partial software recovery can't fully retrieve, professional optical recovery is available via Heirvo's mail-in service.",
        ],
      },
    ],
    faq: [
      {
        q: "Can Heirvo recover copy-protected commercial Blu-ray movies?",
        a: "Heirvo recovers data from physically damaged discs. It does not bypass or circumvent AACS copy protection on commercial Blu-ray movies — that would be outside the scope of data recovery and is not supported.",
      },
      {
        q: "My Blu-ray drive says 'disc not found' but the disc looks fine. What's wrong?",
        a: "This usually means the disc's lead-in area — the innermost ring — is damaged. Even a small scratch near the centre of a Blu-ray can prevent the drive from mounting it at all. Try a different drive; some drives are better at reading damaged lead-in areas than others.",
      },
      {
        q: "How long does Blu-ray recovery take?",
        a: "A lightly damaged BD typically takes 1–2 hours. A heavily damaged disc with many failing sectors can take 4–8 hours because the engine retries each bad sector multiple times. You can pause and resume the scan at any time — the sector map is saved to disk.",
      },
      {
        q: "Is there free software for Blu-ray disc recovery?",
        a: "DVDisaster supports Blu-ray discs and is free and open source. It's a good option for technical users comfortable with command-line tools. IsoBuster also supports Blu-ray recovery but requires a paid licence for full extraction. Heirvo offers a free scan with paid extraction.",
      },
    ],
    cta: {
      heading: "Try Heirvo free on your Blu-ray disc",
      body: "Scan your disc at no cost. See exactly which sectors are recoverable before you decide to pay anything.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in recovery service",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. Recover music from scratched audio CD
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-music-from-scratched-cd",
    title: "How to Recover Music from a Scratched CD on Windows",
    metaTitle: "How to Recover Music from a Scratched CD on Windows (2026 Guide)",
    metaDescription: "Scratched audio CD skipping or won't rip? This guide explains why normal ripping software fails and how to recover every track using sector-level recovery on Windows 10 and 11.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "6 min read",
    category: "CD Recovery",
    intro:
      "A scratched audio CD that skips or won't rip is one of the most common disc problems — and one of the most fixable. Standard CD ripping software like Windows Media Player or iTunes gives up at the first read error and either skips the track entirely or fills the gap with silence. Sector-level recovery software retries each failing sector dozens of times and reconstructs the audio data with far fewer gaps. Most scratched audio CDs yield 90–100% of their music with the right tool.",
    related: ["recover-data-from-cd-rom-windows", "recover-files-scratched-dvd", "kodak-photo-cd-recovery", "recover-data-from-zip-disk", "mode-select-page-01h-scsi-dvd-recovery", "powered-usb-hub-dvd-recovery"],
    sections: [
      {
        id: "why-ripping-fails",
        heading: "Why normal ripping software fails on scratched CDs",
        level: 2,
        paragraphs: [
          "Standard CD rippers send one read command per sector and move on if it fails. On a scratched disc, this means every bad sector becomes either silence, a click, or a skipped chunk of audio. The ripped file plays but sounds wrong.",
          "Audio CDs store data as 2,352-byte sectors with built-in error correction (CIRC). For minor scratches, the drive's own error correction handles it invisibly. For deeper scratches, the error correction is overwhelmed — and that's where standard rippers give up but recovery tools keep going, retrying at different speeds and directions.",
        ],
      },
      {
        id: "what-you-need",
        heading: "What you need",
        level: 2,
        items: [
          "Windows 10 or 11 PC (64-bit)",
          "A CD or DVD optical drive — internal or USB external",
          "Heirvo disc recovery software — free to scan",
          "About 700 MB of free space per CD (lossless output)",
        ],
      },
      {
        id: "step-by-step",
        heading: "Step-by-step: recover music from a scratched CD",
        level: 2,
        items: [
          "Clean the disc with a microfibre cloth — wipe from centre to edge in straight lines. Even light cleaning dramatically improves read success on audio CDs.",
          "Insert the disc and open Heirvo.",
          "Click Start Recovery. Heirvo detects the audio CD format automatically and switches to sector-level audio extraction mode.",
          "The engine scans the disc, retrying each failing sector multiple times at variable speeds. A typical audio CD (74 minutes) takes 15–45 minutes to scan depending on the level of damage.",
          "Click Save — Heirvo outputs each track as a lossless WAV file. You can then convert to MP3 or FLAC with any audio software.",
        ],
        numbered: true,
      },
      {
        id: "what-to-expect",
        heading: "What to expect from the recovery",
        level: 2,
        paragraphs: [
          "Light to moderate scratches: 95–100% recovery. The recovered tracks will be audibly identical to the originals.",
          "Heavy scratches or disc rot: 70–90% recovery. Some tracks may have brief clicks or gaps where sectors were genuinely unreadable. These are typically isolated to the most damaged areas of the disc.",
          "Deep gouges through the disc surface: these sectors are physically destroyed and cannot be recovered by any software. The rest of the disc is usually fine.",
        ],
        table: {
          caption: "Expected recovery by damage level",
          headers: ["Damage level", "Typical recovery rate", "Audible artefacts"],
          rows: [
            ["Light scratches", "95–100%", "None"],
            ["Moderate scratches", "85–95%", "Rare clicks in worst areas"],
            ["Heavy scratches / disc rot", "70–85%", "Brief gaps in damaged sections"],
            ["Deep gouges", "Variable", "Missing audio in gouge area"],
          ],
        },
      },
      {
        id: "cdparanoia-comparison",
        heading: "How this compares to EAC and dBpoweramp",
        level: 2,
        paragraphs: [
          "Exact Audio Copy (EAC) and dBpoweramp are the gold standard for ripping undamaged or lightly scratched CDs — they use AccurateRip verification and C2 error pointers. For moderately to heavily scratched discs, their retry logic is still limited by what the drive's firmware reports.",
          "Heirvo's approach is sector-map-based — it builds a persistent record of every sector's read status and retries failed sectors independently of what the drive firmware reports. On heavily damaged discs, this recovers sectors that EAC and dBpoweramp consistently miss.",
          "For a disc with only light scratches, EAC or dBpoweramp is perfectly fine. For a disc that those tools give up on, Heirvo is the next step before professional recovery.",
        ],
      },
      {
        id: "after-recovery",
        heading: "What to do with the recovered files",
        level: 2,
        paragraphs: [
          "Heirvo outputs WAV files — lossless, fully compatible with every audio player and converter. Use fre:ac, Audacity, or VLC to convert to MP3 or FLAC if you prefer a compressed format.",
          "Once recovered, back the files up immediately — to an external drive and a cloud service. Don't put them back on the scratched disc.",
        ],
      },
    ],
    faq: [
      {
        q: "Can I recover a CD that skips in a CD player but rips fine on a computer?",
        a: "Yes — a disc that skips in a player but rips fine on a computer is being handled by the drive's error correction during ripping. The ripped file may have subtle artefacts in the damaged areas. Run a sector-level scan to confirm the ripped version is complete.",
      },
      {
        q: "Will the recovered audio sound different from the original?",
        a: "For all fully-recovered sectors, the audio is bit-for-bit identical to the original — there is no quality loss. Only sectors that couldn't be read will have artefacts. Heirvo fills unrecoverable sectors with interpolated audio rather than silence, which sounds less jarring.",
      },
      {
        q: "My CD won't even mount in Windows. Can it be recovered?",
        a: "Usually yes — a disc that won't mount often has a damaged lead-in area (the innermost ring). Try a different optical drive; some drives read damaged lead-in areas better than others. If no drive can mount it, Heirvo's mail-in service uses equipment with better read sensitivity.",
      },
      {
        q: "Is there a free way to recover audio CDs?",
        a: "cdparanoia (Linux) and Exact Audio Copy (Windows, free) are good for lightly scratched discs. For heavily damaged discs, these tools hit their limits quickly. Heirvo offers a free scan so you can see how much is recoverable before paying.",
      },
    ],
    cta: {
      heading: "Recover your scratched CDs free",
      body: "Scan your disc at no cost. See exactly which tracks are recoverable — then decide whether to pay.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in recovery service",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. Recover video from camcorder DVD
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-video-from-camcorder-dvd",
    title: "How to Recover Video from a Camcorder DVD",
    metaTitle: "How to Recover Video from a Camcorder DVD on Windows (2026 Guide)",
    metaDescription: "Mini DVD camcorder discs are some of the most failure-prone media ever made. This guide covers the three most common problems — unfinalized, cracked spindle, and format issues — and how to recover your footage on Windows.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "7 min read",
    category: "DVD Recovery",
    intro:
      "Camcorder DVDs — the small 8cm discs used in Sony, Canon, and Panasonic DVD camcorders from 2003 to 2012 — are some of the most failure-prone optical media ever made. The combination of small size, frequent handling, and the fact that most were never finalized properly means a huge proportion simply won't play or import on a computer. The good news: the video is almost always still there.",
    related: ["recover-unfinalized-dvd", "recover-home-videos-dvd", "recover-vhs-converted-dvd", "dvd-drive-freezing-mid-recovery-fix", "vlc-plays-dvd-recovery-fails"],
    sections: [
      {
        id: "why-camcorder-dvds-fail",
        heading: "Why camcorder DVDs fail so often",
        level: 2,
        paragraphs: [
          "Three problems are specific to camcorder DVDs that don't affect standard full-size DVDs:",
        ],
        items: [
          "Unfinalized discs — DVD camcorders record in VR (Video Recording) mode, not Video mode, and require finalisation before a standard player can read them. Many people never ran the finalisation step on their camcorder, leaving the disc unreadable everywhere except in the original camera.",
          "Cracked or warped hubs — the 8cm discs have a much smaller spindle hole than standard DVDs. Forcing them into a full-size drive using an adapter ring often cracks the hub area, causing read errors or drive damage.",
          "VR mode incompatibility — even finalized camcorder DVDs recorded in VR mode may not play in standard DVD players or Windows, because VR mode is a different structure to the Video mode used by commercial DVDs.",
        ],
      },
      {
        id: "do-not-use-adapter",
        heading: "Do not use a tray adapter — use a slot-load drive",
        level: 2,
        paragraphs: [
          "The plastic adapter rings sold for playing 8cm discs in full-size tray drives are unreliable and often crack the disc's hub. If your disc already has hub cracks from adapter use, the situation is worse but often still recoverable.",
          "The correct way to read an 8cm camcorder disc on a PC is with a slot-loading drive — either the slot-load drive in a MacBook (via a Windows VM or Boot Camp) or a USB slot-load drive. Sony PlayStation 3 slot-load drives also read 8cm discs and can be used with a USB enclosure. Alternatively, use a dedicated 8cm disc drive.",
        ],
        callout: {
          label: "Already cracked the hub?",
          text: "A disc with a cracked hub can sometimes still be read if the crack hasn't reached the data area. Place the disc carefully in a slot-load drive without an adapter. If the drive can spin it at all, Heirvo will extract whatever data is readable.",
          color: "amber",
        },
      },
      {
        id: "recover-unfinalized-camcorder",
        heading: "Recovering an unfinalized camcorder disc",
        level: 2,
        paragraphs: [
          "Most camcorder DVDs that won't play on a computer are simply unfinalized. The video data is 100% intact — the disc just lacks the closing index that players need.",
          "Insert the disc in a slot-load drive and run a Heirvo scan. Heirvo detects the VR mode structure directly and extracts the VOBS (video objects) without needing a finalized disc structure. In most cases, the complete recording is recovered intact.",
          "If you still have the original camcorder, you can also finalize the disc directly on the camera: go to the disc management or setup menu and look for a 'Finalize' option. This is the most reliable method if the camera is still working.",
        ],
      },
      {
        id: "recover-scratched-camcorder",
        heading: "Recovering a scratched or damaged camcorder disc",
        level: 2,
        paragraphs: [
          "Camcorder discs scratch easily because they're often handled without cases. The recovery approach is the same as for full-size DVDs — sector-level scanning with multi-pass retries.",
          "Clean the disc first with a microfibre cloth from centre to edge. Insert in a slot-load drive and run a Heirvo scan. The engine will build a sector map and extract everything readable.",
        ],
      },
      {
        id: "output-format",
        heading: "What the recovered video looks like",
        level: 2,
        paragraphs: [
          "Camcorder DVDs typically recorded at 720×480 (NTSC) or 720×576 (PAL) in MPEG-2. Heirvo converts the recovered VOB data to a standard MP4 file — compatible with every modern TV, phone, and video editor.",
          "If chapters were recorded separately (each recording session is its own chapter), Heirvo recovers each chapter as a separate file so you don't get one long merged video.",
        ],
      },
    ],
    faq: [
      {
        q: "My camcorder says the disc is full but my computer shows it as empty. Why?",
        a: "This is the classic unfinalized disc symptom. The camera can read its own unfinalized disc because it knows the internal structure. A computer needs the finalized index to navigate the disc. Heirvo bypasses this requirement and reads the raw recording directly.",
      },
      {
        q: "Can I use a DVD adapter ring to play the disc?",
        a: "We strongly advise against it. Adapter rings frequently crack the disc hub during insertion or removal, causing permanent physical damage. Use a slot-load drive instead.",
      },
      {
        q: "The disc was recorded on a Sony camcorder. Does that matter?",
        a: "Different manufacturers used slightly different VR mode implementations — Sony, Canon, Panasonic, and Hitachi all had minor variations. Heirvo handles all of them by reading the raw sector data rather than relying on the manufacturer-specific navigation layer.",
      },
      {
        q: "How do I know if my disc is VR mode or Video mode?",
        a: "If the disc was recorded directly in a camcorder, it's almost certainly VR mode. Video mode was used by some DVD recorders (set-top boxes), not camcorders. Heirvo detects the format automatically — you don't need to know in advance.",
      },
    ],
    cta: {
      heading: "Recover your camcorder footage today",
      body: "Free scan shows you what's recoverable. Supports unfinalized discs, VR mode, and damaged 8cm camcorder DVDs.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in recovery service",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. Recover VHS-to-DVD transfer
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-vhs-converted-dvd",
    title: "How to Recover a VHS-to-DVD Transfer That Won't Play or Is Damaged",
    metaTitle: "Recover a VHS-to-DVD Transfer That Won't Play or Is Damaged (2026)",
    metaDescription:
      "Your VHS-to-DVD conversion is damaged or won't play — here's how to recover the footage before it's gone for good. Works on scratched, rotted, and unfinalized transfer DVDs.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "6 min read",
    category: "DVD Recovery",
    intro:
      "A VHS-to-DVD transfer that won't play is one of the most heartbreaking disc problems — those tapes often no longer exist, making the DVD the only copy of irreplaceable footage. The good news is that most damaged transfer DVDs are recoverable. Because the footage was professionally encoded and pressed (or burned) in a single session, the data is usually intact even when the disc surface has degraded.",
    related: ["recover-home-videos-dvd", "recover-files-scratched-dvd", "recover-8mm-film-dvd-transfer", "recover-unfinalized-dvd", "dvd-drive-freezing-mid-recovery-fix"],
    sections: [
      {
        id: "why-transfer-dvds-fail",
        heading: "Why VHS-to-DVD transfers fail",
        level: 2,
        paragraphs: [
          "Between roughly 1998 and 2012, millions of families had their VHS, Betamax, and 8mm tapes converted to DVD — either at a shop like Costco or Walgreens, or with a home DVD recorder. Those discs are now 15–25 years old, and DVD-R discs (the format almost all transfer services used) have a typical reliable lifespan of 10–25 years in home storage conditions.",
          "The most common failure mode is disc rot — the organic dye layer oxidises and turns hazy, scattering the read laser. Scratches from handling and storage are a close second. Either way, Windows starts refusing to read the disc, and standard DVD players skip or freeze.",
          "Crucially, the underlying video data is often still present. Disc rot and surface scratches degrade the optical readability of sectors, but they don't immediately destroy the data — a sector-level recovery tool can often read what a standard player cannot.",
        ],
      },
      {
        id: "before-you-start",
        heading: "Check the original tapes first",
        level: 2,
        paragraphs: [
          "Before spending time on disc recovery, ask one question: do the original VHS or 8mm tapes still exist? If they do — even in poor condition — re-converting from tape often produces better results than recovering a degraded disc. Tape can also be repaired and baked in ways that disc data cannot.",
          "If the tapes are gone, or if you don't know where they are, disc recovery is your only option. Proceed with the steps below.",
        ],
        callout: {
          label: "No tapes left?",
          text: "If the original tapes no longer exist, your transfer DVD is the sole copy. Act now — disc rot is progressive. A disc that recovers 90% of footage today may only recover 60% in a year.",
          color: "amber",
        },
      },
      {
        id: "step-by-step",
        heading: "How to recover a damaged VHS-to-DVD disc",
        level: 2,
        numbered: true,
        items: [
          "Clean the disc gently with a microfibre cloth — wipe from centre to edge in straight lines, never in circles. Circular wiping can add fine scratches across data tracks.",
          "Download and install Heirvo on Windows 10 or 11. No account needed — the scan is completely free.",
          "Insert the disc in a full-size external USB DVD drive if possible. Slim laptop drives have weaker error correction and struggle more with marginal discs.",
          "Open Heirvo and select your disc drive. Heirvo detects the disc type automatically — including single-layer (DVD-5) and dual-layer (DVD-9) transfer discs.",
          "Click Scan. Heirvo reads every sector up to 16 times at variable speeds, forwards and backwards, before marking a sector as unreadable. A badly degraded disc can take 2–4 hours.",
          "When the scan completes, Heirvo shows every recoverable file — typically the main video file and any chapter markers the transfer shop added. Review what was recovered before paying anything.",
          "Activate Heirvo Pro ($39 one-time) to save the recovered footage as MP4 to your hard drive. Back it up to at least two locations immediately.",
        ],
      },
      {
        id: "what-to-expect",
        heading: "What recovery rates to expect",
        level: 2,
        paragraphs: [
          "Light disc rot (disc looks slightly hazy but plays partially): typically 85–98% recovery. The footage plays with occasional brief artefacts at the most degraded sectors.",
          "Moderate disc rot (disc won't play in any player): typically 60–85% recovery. You'll get most of the footage but may lose short segments at the worst-affected areas.",
          "Severe disc rot (disc looks bronze or has visible pinholes when held to light): sector-level software may recover 20–50%. At this stage the dye layer has physically disintegrated in places. Professional lab recovery using re-polishing and a custom optical reader is the next step — which is what Heirvo's mail-in service uses.",
          "Scratched discs (surface scratches, not rot): typically 80–95% recovery even with significant scratching, because scratches damage a narrow band of sectors rather than the whole disc evenly.",
        ],
        callout: {
          label: "Disc rot vs scratches",
          text: "Hold the disc to a light source and look at the reflective side. A disc with even, slight haziness or a faint bronze tint has disc rot. A disc with visible lines or gouges has scratches. Both are recoverable — disc rot just tends to be more unpredictable about which sectors are affected.",
          color: "blue",
        },
      },
      {
        id: "after-recovery",
        heading: "After recovery: preserving the footage long-term",
        level: 2,
        paragraphs: [
          "Once recovered, store the MP4 file in at least three locations: an external hard drive, a cloud service (Google Drive, iCloud, or Backblaze), and ideally a second physical drive kept in a different location. DVDs and hard drives both fail — redundancy is the only protection.",
          "Consider also uploading the footage to a private YouTube channel. YouTube stores video at very high quality and is effectively a free, permanent backup. Set the privacy to 'Unlisted' so only people with the link can view it.",
        ],
      },
      {
        id: "mail-in-option",
        heading: "When software recovery isn't enough",
        level: 2,
        paragraphs: [
          "If Heirvo's scan recovers less than 50% of the disc, or the disc has visible delamination or severe disc rot, professional lab recovery is the next step. Heirvo's mail-in service uses lab-grade optical equipment — a modified reader with a stronger laser and finer focus control — that can read discs software tools cannot.",
          "Post the disc to us and we'll tell you exactly what's recoverable before you pay anything. For VHS-to-DVD transfers — often the last surviving copy of irreplaceable family footage — the mail-in service is worth it.",
        ],
      },
    ],
    faq: [
      {
        q: "The DVD won't play in any player and Windows says 'insert a disc'. Is the footage gone?",
        a: "Not necessarily. 'Insert a disc' usually means the drive can't read the disc's table of contents — this happens with disc rot, scratches, or an unfinalized burn. Sector-level recovery software bypasses the navigation layer and reads the raw video data directly. Run a free scan with Heirvo to find out what's recoverable.",
      },
      {
        q: "My transfer was done at a Walgreens/Costco/CVS transfer service. Will the format work?",
        a: "Yes. All retail transfer services in the US and UK encoded footage as standard DVD Video (VOB files in a VIDEO_TS folder) on standard DVD-R media. Heirvo handles this format natively — there is nothing proprietary about these discs.",
      },
      {
        q: "Can I recover only part of the disc — like just the first hour if the end is too damaged?",
        a: "Yes. Heirvo's scan produces a sector map showing exactly which parts of the disc are readable. You'll see which segments of footage are recoverable before you pay. Partial recovery is very common and often still saves the most important parts of the video.",
      },
      {
        q: "The transfer disc is dual-layer (DVD-9, 8.5 GB). Does that change anything?",
        a: "Dual-layer discs have a second failure point — the layer change point in the middle of the disc. Heirvo handles both layers automatically. If the layer change area is damaged, you may get a brief gap in the footage at that point, but both layers are scanned independently.",
      },
      {
        q: "How do I know if the original VHS tapes still exist?",
        a: "Check boxes in storage, attics, and garages — many families kept tapes after transfer without realising it. If you used a professional service, they sometimes returned the originals with the DVD. Even a deteriorated VHS tape is often recoverable by a tape restoration specialist, which may be a better path than disc recovery if the disc is severely damaged.",
      },
    ],
    cta: {
      heading: "Recover your VHS transfer before it's too late",
      body: "Free scan shows exactly what's recoverable. Works on scratched, rotted, and unfinalized transfer DVDs — pay only when you save.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in recovery service",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. DVD drive not reading disc Windows 11
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "dvd-drive-not-reading-disc-windows-11",
    title: "DVD Drive Not Reading Disc on Windows 11: How to Fix It",
    metaTitle: "DVD Drive Not Reading Disc on Windows 11: How to Fix It (2026)",
    metaDescription:
      "DVD drive shows 'Please insert a disc' on Windows 11 even with a disc inside? Here are the real fixes — from driver issues to damaged discs — and when to use recovery software.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "7 min read",
    category: "DVD Recovery",
    intro:
      "A DVD drive that shows 'Please insert a disc' when a disc is already inside is one of the most frustrating Windows problems — and it has a handful of distinct causes, each with a different fix. This guide walks through every cause in order of likelihood, so you can find the right fix without guessing.",
    related: ["recover-files-scratched-dvd", "best-dvd-recovery-software", "copy-dvd-to-hard-drive-windows-11", "recover-data-from-blu-ray-windows", "dvd-drive-disconnects-mid-scan", "powered-usb-hub-dvd-recovery", "slim-vs-desktop-dvd-drive-recovery"],
    sections: [
      {
        id: "rule-out-the-disc",
        heading: "Step 1: Rule out the disc itself",
        level: 2,
        paragraphs: [
          "Before troubleshooting the drive or Windows, test with a different disc — preferably a commercial pressed DVD (a movie, not a burned disc). If the second disc reads fine, the problem is with your original disc, not the drive. Skip to the 'Damaged disc' section below.",
          "If no disc reads at all — pressed or burned — the problem is the drive, the driver, or Windows. Continue with the steps below.",
        ],
      },
      {
        id: "clean-the-disc",
        heading: "Step 2: Clean the disc",
        level: 2,
        paragraphs: [
          "A disc with fingerprints, dust, or a small smear will often fail to read even though the data is intact. Clean it with a microfibre cloth, wiping from the centre outward to the edge in straight lines — never in circles. Let it dry completely before reinserting.",
          "If the disc is clearly scratched or has a hazy appearance on the reflective side (disc rot), cleaning won't help. See the damaged disc section below.",
        ],
      },
      {
        id: "try-different-drive",
        heading: "Step 3: Try a different drive",
        level: 2,
        paragraphs: [
          "Slim laptop drives — the kind built into thin laptops — have significantly weaker laser assemblies and error correction than full-size desktop or external USB drives. A disc that fails in a slim laptop drive will often read perfectly in a full-size USB external drive.",
          "If you don't own an external drive, they cost $20–$30 on Amazon. For a once-off recovery of important footage, this is the single highest-impact step you can take.",
        ],
        callout: {
          label: "Recommended",
          text: "LG, Asus, and Pioneer make reliable full-size external USB DVD drives. Avoid no-brand slim drives — they often perform no better than the laptop drive you already have.",
          color: "green",
        },
      },
      {
        id: "windows-driver-fix",
        heading: "Step 4: Fix the Windows driver",
        level: 2,
        paragraphs: [
          "Windows 11 can lose track of optical drives after major updates — a known issue where the drive shows up in Device Manager but fails to read discs. The fix is to delete the upper and lower filters in the registry.",
        ],
        numbered: true,
        items: [
          "Press Win + R, type regedit, and press Enter.",
          "Navigate to: HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4D36E965-E325-11CE-BFC1-08002BE10318}",
          "In the right pane, look for values named UpperFilters and LowerFilters.",
          "If they exist, right-click each one and select Delete.",
          "Restart your computer and test the drive again.",
        ],
      },
      {
        id: "update-or-reinstall-driver",
        heading: "Step 5: Update or reinstall the drive in Device Manager",
        level: 2,
        numbered: true,
        items: [
          "Right-click the Start button and select Device Manager.",
          "Expand DVD/CD-ROM drives and find your drive.",
          "Right-click the drive and select Uninstall device. Check the box to delete the driver if offered.",
          "Restart Windows. Windows will automatically reinstall the driver on boot.",
          "If the drive still doesn't read, right-click the drive again and select Update driver → Search automatically for drivers.",
        ],
      },
      {
        id: "autoplay-settings",
        heading: "Step 6: Check AutoPlay and drive letter settings",
        level: 2,
        paragraphs: [
          "Sometimes the drive reads the disc but Windows doesn't do anything visible with it. Open File Explorer and check whether the drive appears with a disc icon rather than a generic drive icon — if it does, the disc is being read but AutoPlay is disabled.",
          "Right-click the drive in File Explorer and select Open — if you can see files, the disc is readable and the issue is just AutoPlay settings, not the drive.",
        ],
      },
      {
        id: "damaged-disc",
        heading: "If the disc itself is damaged",
        level: 2,
        paragraphs: [
          "If only one specific disc fails and others read fine, the problem is the disc — not the drive or Windows. A disc that Windows won't read at all (showing 'Please insert a disc' or 'Disc not accessible') may still have recoverable data.",
          "Standard Windows tools and media players give up at the first read error. Disc recovery software like Heirvo uses a different approach: it retries each failing sector up to 16 times at variable speeds, recovering data that normal tools miss. Even discs that Windows refuses to acknowledge entirely often yield 80–95% of their data with a sector-level scan.",
        ],
        callout: {
          label: "Free to try",
          text: "Heirvo scans your disc completely free — you only pay ($39 one-time) if you choose to save the recovered files. If nothing is recoverable, you pay nothing.",
          color: "blue",
        },
      },
      {
        id: "hardware-failure",
        heading: "When it's a hardware failure",
        level: 2,
        paragraphs: [
          "If no disc reads in your drive after following all the steps above, the drive's laser assembly has likely failed. Optical drive lasers degrade over time and eventually stop reading discs altogether. This is a hardware issue — no driver or software fix will resolve it.",
          "Replacement USB external drives are inexpensive ($20–$30). For a laptop with an internal drive, replacement drives are available for most models for $15–$40 and can be swapped in 15 minutes with a screwdriver.",
        ],
      },
    ],
    faq: [
      {
        q: "My DVD drive worked yesterday and now reads nothing. What happened?",
        a: "The most common cause is a Windows Update that reset driver settings or corrupted the optical drive filters in the registry. Follow Step 4 above (deleting UpperFilters and LowerFilters) — this resolves the issue in most cases without any hardware change.",
      },
      {
        q: "The drive shows up in Device Manager but Windows Explorer shows it as empty even with a disc inside.",
        a: "This is typically the registry filter issue described in Step 4. Delete the UpperFilters and LowerFilters values under the DVD/CD-ROM class key and restart. If it persists after that, uninstall and reinstall the driver (Step 5).",
      },
      {
        q: "My drive spins up and then stops — it sounds like it's trying but gives up. Is that a hardware problem?",
        a: "Not necessarily. A drive that spins up and stops is reading the disc's lead-in area and failing — this is usually a disc quality or damage issue, not hardware failure. Try a different disc first. If other discs spin up and read normally, the original disc is the problem.",
      },
      {
        q: "I have a USB external drive and it also won't read the disc. Is the disc gone?",
        a: "A disc that fails in multiple drives is either heavily damaged or has severe disc rot. It isn't necessarily unrecoverable — sector-level recovery software makes multiple passes at low read speeds that consumer drives don't attempt by default. Run a free scan with Heirvo before concluding the data is lost.",
      },
      {
        q: "Does Windows 11 support older DVD formats like DVD-R and DVD+RW?",
        a: "Yes — Windows 11 reads DVD-R, DVD+R, DVD-RW, DVD+RW, DVD-RAM (with the right driver), and dual-layer variants of all of the above. Format compatibility is rarely the issue. If a disc fails, it's almost always damage, disc rot, or a driver problem.",
      },
    ],
    cta: {
      heading: "Disc reads in the drive but the data looks damaged?",
      body: "Heirvo scans every sector up to 16 times — recovering data that Windows and media players give up on. Free to scan, $39 to save.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Learn about mail-in recovery",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 15. Free DVD recovery software
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "free-dvd-recovery-software",
    title: "Free DVD Recovery Software: What Actually Works in 2026",
    metaTitle: "Free DVD Recovery Software: What Actually Works in 2026",
    metaDescription:
      "Looking for free DVD recovery software? Honest breakdown of what's free, what's freemium, and what to avoid — plus which tool works best for home video and scratched discs.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "8 min read",
    category: "Software Guide",
    intro:
      "Most 'free DVD recovery software' is either genuinely free with serious limitations, or a freemium trial that scans for free but locks recovery behind a paywall. Knowing which category a tool falls into before you spend two hours scanning a disc matters. This guide breaks down every realistic free option in 2026 — what each one actually does, what it can't do, and which is worth your time.",
    related: ["best-dvd-recovery-software", "heirvo-vs-isobuster", "recover-corrupted-iso-file", "vlc-plays-dvd-recovery-fails"],
    sections: [
      {
        id: "what-free-means",
        heading: "What 'free' actually means for disc recovery software",
        level: 2,
        paragraphs: [
          "Disc recovery is computationally straightforward but commercially awkward. The tools that do it well are almost all commercial products with trial or freemium models. 'Completely free with no limitations' is rare — the exceptions are open-source tools that require technical setup.",
          "The freemium model — free to scan, pay to save — is actually the most user-friendly. You find out what's recoverable before committing money. A tool that charges upfront without a scan preview is far riskier.",
        ],
        callout: {
          label: "Key distinction",
          text: "There is a meaningful difference between 'free to scan' (you see results before paying) and 'free trial' (time-limited or feature-capped). The best freemium tools are the former — you pay only if recovery succeeded.",
          color: "blue",
        },
      },
      {
        id: "heirvo-free",
        heading: "Heirvo — free scan, pay only to save",
        level: 2,
        paragraphs: [
          "Heirvo is free to download, install, and scan. You can see exactly what files are recoverable — with previews of video and photos — before paying anything. The $39 one-time Pro licence unlocks saving the recovered files.",
          "This model is specifically designed so you don't pay for a recovery that didn't work. If the scan recovers nothing, you owe nothing.",
        ],
        items: [
          "Free: full scan, full result preview, recovery map",
          "Pro ($39 one-time): save recovered files as MP4, ISO, or individual chapters",
          "Works on: scratched DVDs, disc rot, unfinalized discs, camcorder DVDs, Blu-ray, CDs",
          "Platform: Windows 10 and 11 only",
        ],
      },
      {
        id: "isobuster-free",
        heading: "IsoBuster — partially free, complex UI",
        level: 2,
        paragraphs: [
          "IsoBuster has a free tier that lets you extract certain file types without a licence — specifically user data files on standard ISO 9660 file systems. For home video DVDs (VIDEO_TS folder structure), the free tier hits a licence wall quickly.",
          "IsoBuster is genuinely powerful and preferred by IT professionals who need forensic-level control. For non-technical users trying to recover a wedding DVD or a box of home video discs, the interface is intimidating — dozens of modes, session trees, and file system options that require understanding of optical disc internals.",
        ],
        items: [
          "Free tier: limited to specific file system types; VIDEO_TS recovery requires paid licence",
          "Paid: €39.95 one-time for personal use",
          "Strengths: forensic-level detail, every file system supported, long track record",
          "Weaknesses: steep learning curve, not designed for home video recovery",
          "Platform: Windows only",
        ],
      },
      {
        id: "cdcheck-free",
        heading: "CDCheck — free, but limited recovery",
        level: 2,
        paragraphs: [
          "CDCheck is free for personal use and can verify and recover data from CDs and DVDs. It's been around since the early 2000s and hasn't been meaningfully updated since. It works, but its sector retry logic is simpler than modern tools — it makes fewer passes at a damaged sector and doesn't vary the read speed as aggressively.",
          "For lightly damaged discs (minor scratches, a few bad sectors), CDCheck can recover files adequately. For heavily scratched discs or any sign of disc rot, its recovery rate is noticeably lower than Heirvo or IsoBuster.",
        ],
        items: [
          "Price: free for personal use",
          "Strengths: genuinely free, no paywall, simple interface",
          "Weaknesses: last updated circa 2015, lower recovery rate on severe damage",
          "Platform: Windows only",
        ],
      },
      {
        id: "ddrescue-free",
        heading: "GNU ddrescue — free, but requires Linux",
        level: 2,
        paragraphs: [
          "GNU ddrescue is arguably the most powerful free disc imaging tool that exists. It reads a failing disc and creates an ISO image, retrying bad sectors in multiple passes with detailed logging of which sectors failed. Data recovery professionals use it.",
          "The catch: ddrescue runs on Linux, not Windows. To use it on Windows, you need to boot a Linux live USB (Ubuntu, for example), mount your DVD drive in Linux, and run ddrescue from the command line. This is feasible but well outside the comfort zone of most home users.",
          "If you're comfortable with Linux: ddrescue is excellent and completely free. If you're not: use a Windows tool instead. The time spent learning Linux to run ddrescue is rarely worth it when freemium Windows tools exist.",
        ],
        items: [
          "Price: free (open source)",
          "Strengths: best-in-class sector retry logic, detailed recovery logs, no paywall",
          "Weaknesses: Linux only, command-line interface, significant technical knowledge required",
          "Platform: Linux (can boot from a USB on any PC)",
        ],
      },
      {
        id: "photorec-free",
        heading: "PhotoRec — free, for file carving not disc recovery",
        level: 2,
        paragraphs: [
          "PhotoRec (part of the TestDisk suite) is often recommended for disc recovery, but it's designed for file system recovery on hard drives — not optical discs with damaged sectors. It carves known file signatures from raw data rather than retrying failed sectors.",
          "On a healthy DVD with a corrupted file system, PhotoRec can be useful. On a physically damaged DVD with unreadable sectors, it will produce whatever files happen to be in the readable sectors and ignore the rest — it won't retry or compensate for the disc damage at all.",
        ],
        items: [
          "Price: free (open source)",
          "Strengths: free, runs on Windows/Mac/Linux, good for file system corruption",
          "Weaknesses: not designed for physical disc damage; poor recovery rate on scratched/rotted DVDs",
          "Platform: Windows, Mac, Linux",
        ],
      },
      {
        id: "recommendation",
        heading: "Which free option to use",
        level: 2,
        paragraphs: [
          "For most people recovering a home video, wedding, or family photo DVD on Windows: start with Heirvo. The scan is completely free, you'll see exactly what's recoverable within a few hours, and you only pay $39 if the recovery succeeded and you want the files.",
          "If you find IsoBuster's free tier covers your file type and you don't mind the interface, it's a legitimate option for specific technical use cases.",
          "If you're comfortable with Linux and dealing with severe disc damage, ddrescue combined with Heirvo (ddrescue to image the disc, Heirvo to decode the VIDEO_TS structure from the image) is the highest-recovery-rate free approach — but it's a multi-hour technical process.",
        ],
        table: {
          caption: "Free DVD recovery software comparison (2026)",
          headers: ["Tool", "Cost to recover", "Home video support", "Windows"],
          rows: [
            ["Heirvo", "Free scan / $39 to save", "Excellent", "Yes"],
            ["IsoBuster", "Free tier limited / €39.95", "Good (paid)", "Yes"],
            ["CDCheck", "Free", "Basic", "Yes"],
            ["GNU ddrescue", "Free", "Imaging only (no decode)", "Linux only"],
            ["PhotoRec", "Free", "Poor on physical damage", "Yes"],
          ],
        },
      },
    ],
    faq: [
      {
        q: "Is there genuinely free DVD recovery software with no paywall at all?",
        a: "Yes — CDCheck is genuinely free for personal use with no paywall. GNU ddrescue is free and open source but requires Linux. Both have meaningful limitations compared to freemium tools: CDCheck has weaker sector retry logic, and ddrescue doesn't decode VIDEO_TS home video format. For light damage, CDCheck works fine. For severe damage or home video, Heirvo's free scan / pay-to-save model gives you better results with less risk.",
      },
      {
        q: "Heirvo says 'free to scan' — what does that mean exactly?",
        a: "The entire scan process — sector reading, recovery mapping, file reconstruction, and preview — is free. You can see every recoverable file and preview the video before paying anything. The $39 Pro licence unlocks saving those files to your hard drive. If the scan recovers nothing, you pay nothing.",
      },
      {
        q: "Can I use IsoBuster free to recover a home video DVD?",
        a: "IsoBuster's free tier covers user data files on ISO 9660 file systems (data discs). Home video DVDs use the UDF or DVD Video file system with a VIDEO_TS folder structure. You'll hit a licence prompt quickly when trying to extract VOB files from a home video disc. The paid licence is €39.95.",
      },
      {
        q: "What about HandBrake — is it useful for disc recovery?",
        a: "HandBrake is a video transcoder, not a disc recovery tool. It rips playable DVDs to video files, but it relies on the disc being fully readable. If your disc has read errors, HandBrake will either skip the bad frames or fail entirely. It is not designed to deal with damaged sectors.",
      },
      {
        q: "I tried free software and it only recovered part of the disc. What now?",
        a: "Partial recovery with free tools is common because they make fewer retry passes on bad sectors. A tool with more aggressive multi-pass sector retry logic (like Heirvo) often recovers more from the same disc. If multi-pass software still can't get the rest, the damage is severe enough to consider Heirvo's mail-in service, which uses lab-grade optical equipment.",
      },
    ],
    cta: {
      heading: "Free to scan — pay only if it works",
      body: "Heirvo scans your disc completely free. See every recoverable file before paying anything. $39 one-time if you choose to save.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Compare all features",
      secondaryHref: "/guides/best-dvd-recovery-software",
    },
  },
  // ─────────────────────────────────────────────────────────────────────────────
  // 16. Recover files from water damaged DVD
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-water-damaged-dvd",
    title: "How to Recover Files from a Water Damaged DVD",
    metaTitle: "How to Recover Files from a Water Damaged DVD (2026 Guide)",
    metaDescription:
      "DVD got wet? Here's what to do in the first 30 minutes, what water actually does to disc data, and when software recovery works vs when you need professional help.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "6 min read",
    category: "DVD Recovery",
    intro:
      "Water itself doesn't destroy DVD data — the polycarbonate disc and aluminium reflective layer are both waterproof. What causes permanent damage is what happens next: mineral deposits from tap water etching the disc surface as it dries, mould growing in humid conditions, and label paper delaminating and pulling the reflective layer with it. If you act within the first hour, your chances of full recovery are very high.",
    related: ["recover-files-scratched-dvd", "recover-data-cracked-dvd", "recover-dvd-car-heat-damage", "how-long-do-dvds-last-disc-rot", "dvd-drive-disconnects-mid-scan", "dvd-drive-freezing-mid-recovery-fix", "powered-usb-hub-dvd-recovery"],
    sections: [
      {
        id: "first-30-minutes",
        heading: "What to do in the first 30 minutes",
        level: 2,
        paragraphs: [
          "Speed matters. The disc itself is fine underwater — the problem is drying. If tap water or floodwater dries on the disc surface, dissolved minerals crystallise and etch microscopic scratches into the polycarbonate. Act before this happens.",
        ],
        numbered: true,
        items: [
          "Do not wipe the disc dry. Wiping a wet disc drags any particles across the surface and scratches it.",
          "Rinse the disc gently under cold distilled water (or bottled water if distilled isn't available). This removes minerals and debris before they can dry onto the surface.",
          "If the disc has a paper label, handle it extremely carefully — wet labels tear easily and can pull the reflective aluminium layer away from the polycarbonate as they delaminate.",
          "Stand the disc upright and let it air-dry in a clean, dry location. Do not use heat, hairdryers, or direct sunlight. Give it 20–30 minutes.",
          "Once dry, inspect the reflective side under good light. If it looks uniform and shiny, the disc is likely physically intact. If you see pitting, white haze, or areas where the reflective layer has lifted, proceed to professional recovery.",
        ],
        callout: {
          label: "Tap water vs distilled",
          text: "Tap water contains dissolved minerals — calcium, magnesium, chlorine — that etch the disc surface when they dry. If you have bottled or distilled water available, always rinse with that instead. If not, tap water is still far better than letting the disc air-dry without rinsing.",
          color: "amber",
        },
      },
      {
        id: "what-water-does",
        heading: "What water actually damages on a DVD",
        level: 2,
        paragraphs: [
          "A DVD is a sandwich: two layers of polycarbonate plastic, a thin aluminium (or gold, on archival discs) reflective layer, and a dye layer on burned discs. The data itself — the microscopic pits pressed or burned into the polycarbonate — is sealed inside this sandwich and is completely waterproof.",
          "Water damage occurs at the edges and surfaces, not inside the disc. The most common failure modes are: mineral deposits on the surface (causing read scatter), label paper absorbing water and delaminating (potentially tearing the reflective layer), and mould growing on organic residue on the disc surface in humid conditions.",
          "What this means practically: a disc submerged in clean water and rinsed promptly is very likely fully recoverable. A disc that sat in floodwater for days, or one whose label has partially peeled and taken the reflective coating with it, is a more serious recovery job.",
        ],
      },
      {
        id: "when-software-works",
        heading: "When software recovery works",
        level: 2,
        paragraphs: [
          "If the disc dried with mineral deposits but the reflective layer is intact, a sector-level recovery tool can often read through the surface contamination. The disc may show read errors that a normal DVD player gives up on, but software that retries each sector at variable speeds and makes multiple passes will recover most or all of the data.",
          "Download Heirvo, insert the disc in a full-size USB DVD drive (not a slim laptop drive), and run a scan. The free scan will show you exactly what percentage of sectors are readable before you pay anything. Light mineral contamination typically yields 85–98% recovery.",
        ],
        callout: {
          label: "Try a second drive",
          text: "If the first drive reports the disc as unreadable, try a different USB drive before concluding the disc is unrecoverable. Different drives have different laser power and error-correction capability. A full-size external drive almost always outperforms a slim laptop drive on marginal discs.",
          color: "green",
        },
      },
      {
        id: "when-software-fails",
        heading: "When software recovery isn't enough",
        level: 2,
        paragraphs: [
          "If the reflective layer has physically separated from the polycarbonate — visible as a silvery peel, cloudy patches, or areas where the disc looks 'milky' when held to light — software recovery will fail. The laser has nothing to reflect off in those areas.",
          "At this stage the data may still be physically present in the polycarbonate substrate, but reading it requires lab-grade equipment: a modified optical reader with a stronger laser, finer focus control, and the ability to read partially delaminated discs without destroying what remains.",
          "This is what Heirvo's mail-in service does. Post the disc and we'll assess it and tell you exactly what's recoverable before you pay anything. For discs containing irreplaceable footage — home video, a wedding, family photos — professional recovery is absolutely worth attempting.",
        ],
        callout: {
          label: "Don't delay",
          text: "If the disc has any mould growth (visible as fuzzy spots or a musty smell), keep it in a sealed bag and send it for professional recovery as soon as possible. Mould spreads and continues damaging the disc surface.",
          color: "amber",
        },
      },
      {
        id: "mould-damage",
        heading: "Mould and flood damage: special considerations",
        level: 2,
        paragraphs: [
          "Discs exposed to floodwater often have organic contamination — dirt, sewage, bacteria — that promotes mould growth. Mould feeds on the disc's organic dye layer and the gelatin in paper labels, physically destroying the data it grows over.",
          "Rinse flood-exposed discs with distilled water and a tiny drop of isopropyl alcohol (70%) to kill mould spores, then air-dry completely. Do not stack wet or damp discs — mould spreads between discs in contact.",
          "Even with mould damage, recovery is often possible if caught early. The key is stopping the mould growth immediately. Once the disc has dried and been cleaned, run a recovery scan — the areas the mould reached may be unrecoverable, but the rest of the disc typically is fine.",
        ],
      },
    ],
    faq: [
      {
        q: "My DVD fell in the pool / toilet / sink. Is it ruined?",
        a: "Probably not — the data on a DVD is sealed inside waterproof polycarbonate and isn't harmed by water itself. Rinse it immediately with distilled or bottled water, let it air-dry completely, and then run a recovery scan. The most important thing is to act quickly before minerals in the water dry onto the surface.",
      },
      {
        q: "The disc was in a flooded basement for several days. Is it still recoverable?",
        a: "Possibly. It depends on whether the reflective layer has delaminated. If the disc still looks shiny and uniform on the reflective side, a recovery scan is worth trying. If there are cloudy patches or peeling, professional lab recovery is the right path — the data may still be readable with the right equipment even if the disc looks damaged.",
      },
      {
        q: "The paper label got wet and is peeling. Should I remove it?",
        a: "Very carefully, yes — but only if it is already peeling. A label that is actively delaminating can pull the aluminium reflective layer away as it separates. If the label is still firmly attached, leave it. If it's already peeling at the edges, gently peel it away from the edge rather than pulling it across the data area.",
      },
      {
        q: "The disc smells musty. Is that mould?",
        a: "Likely yes. Rinse the disc with distilled water and wipe very gently with a cloth dampened with 70% isopropyl alcohol. Allow it to dry completely. Then send it for professional recovery rather than attempting multiple scan passes — mould on a disc can spread to your drive's laser assembly.",
      },
      {
        q: "Can I use a dishwasher or ultrasonic cleaner to clean a water-damaged disc?",
        a: "Do not use a dishwasher — the heat and detergent will cause far more damage than water. Ultrasonic cleaners are used by some professional recovery labs and can be effective, but a consumer ultrasonic cleaner may vibrate at the wrong frequency and crack the disc. Stick to a gentle rinse with distilled water.",
      },
    ],
    cta: {
      heading: "Water damaged disc? Let's see what's recoverable.",
      body: "Free scan shows you exactly what can be saved. For severe damage — delamination, mould, flood exposure — our mail-in service uses lab-grade equipment to read discs that software can't.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in recovery service",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 17. Recover data from Zip disk
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-data-from-zip-disk",
    title: "How to Recover Data from a Zip Disk in 2026",
    metaTitle: "How to Recover Data from a Zip Disk in 2026 (Complete Guide)",
    metaDescription:
      "Still have old Iomega Zip disks? Here's how to recover the files in 2026 — finding a working drive, dealing with the click of death, and what to do when the disk won't read.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "7 min read",
    category: "Legacy Media Recovery",
    intro:
      "Iomega Zip disks — the 100MB, 250MB, and 750MB removable disks that were ubiquitous in offices and creative studios from the mid-1990s to the mid-2000s — are now an orphaned format. The drives are long discontinued, and Zip disks are notorious for the 'click of death': a head alignment failure that corrupts disks and sometimes spreads to every disk inserted afterwards. This guide covers every realistic option for getting your data off a Zip disk in 2026.",
    related: ["recover-data-from-cd-rom-windows", "kodak-photo-cd-recovery", "recover-music-from-scratched-cd"],
    sections: [
      {
        id: "what-you-need",
        heading: "The first problem: finding a working drive",
        level: 2,
        paragraphs: [
          "You cannot read a Zip disk without a Zip drive — there is no software workaround for this. Zip drives connect via USB (most common for home use), SCSI (found in older Mac towers and workstations), parallel port (very old PCs), or as internal IDE drives (some desktop PCs from the era).",
          "The most practical option in 2026 is a USB Zip drive — the Iomega Zip 250 USB or Zip 750 USB. These appear regularly on eBay and Facebook Marketplace for $10–$40. A 250MB USB drive can read 100MB and 250MB disks. A 750MB drive can read all three formats.",
          "Before buying any used Zip drive, ask the seller if it shows any signs of the click of death — a rhythmic clicking sound when a disk is inserted. A drive with click of death will not read your disks and may damage them further.",
        ],
        callout: {
          label: "Drive compatibility",
          text: "100MB Zip disks: readable in any Zip drive. 250MB disks: require a 250MB or 750MB drive (a 100MB drive cannot read them). 750MB disks: require a 750MB drive only.",
          color: "blue",
        },
      },
      {
        id: "click-of-death",
        heading: "The click of death: what it is and what to do",
        level: 2,
        paragraphs: [
          "The Zip click of death (COD) is a mechanical head alignment failure. When a Zip drive develops COD, it makes a rhythmic clicking sound when a disk is inserted and fails to read it. The deeper problem: a COD drive can damage the disks inserted into it, and a damaged disk can trigger COD in a previously healthy drive.",
          "If your drive clicks when you insert a disk, stop immediately. Do not insert any other disks into that drive. The disk may still be recoverable with a healthy drive — but repeated insertion into a COD drive progressively worsens the damage.",
          "To test whether your drive has COD before using it, insert a disk you don't care about (a blank or one with data you've already backed up) and listen carefully. Normal Zip drive sounds are a brief spin-up and a couple of quiet seeks. Rhythmic clicking — 6–10 clicks in sequence — is COD.",
        ],
        callout: {
          label: "COD spread",
          text: "A disk that has been partially damaged by a COD drive can trigger COD in a healthy drive. If you suspect a disk is damaged, try reading it in a healthy drive in a clean environment and be prepared for the drive to develop problems. Some data recovery professionals have purpose-built Zip recovery rigs specifically to avoid this.",
          color: "amber",
        },
      },
      {
        id: "reading-the-disk",
        heading: "Reading a healthy Zip disk on Windows 11",
        level: 2,
        paragraphs: [
          "If your drive is healthy and your disk is undamaged, a USB Zip drive is plug-and-play on Windows 10 and 11. Windows recognises it as a removable drive — no drivers needed. Insert the disk, wait for Windows to detect it, open File Explorer, and copy your files normally.",
          "Zip disks were formatted as FAT16 (100MB disks) or FAT32 (250MB and 750MB disks). Windows reads both formats natively. If File Explorer shows the drive but the disk appears empty, the file system may be corrupted — proceed to the recovery software section below.",
        ],
      },
      {
        id: "corrupted-disk",
        heading: "Recovering data from a corrupted or unreadable Zip disk",
        level: 2,
        paragraphs: [
          "If Windows can detect the drive but shows the disk as unformatted, empty, or inaccessible, the disk's file system is corrupted but the data may still be physically present on the magnetic surface.",
          "Use a file carving tool like Recuva (free) or R-Studio to scan the raw disk surface. These tools bypass the corrupted file system and look for recognisable file signatures directly in the magnetic data. For common file types — documents, photos, audio files, InDesign or Quark files — this approach often recovers most or all of the content.",
          "If the drive spins up but Windows doesn't assign it a drive letter at all, try these steps: open Disk Management (Win + X → Disk Management), find the Zip drive in the list, and check whether it appears without a letter assigned. Right-click and assign a drive letter. If it appears as 'Unknown' or 'Not initialized', the disk has a deeper corruption and file carving is the next step.",
        ],
      },
      {
        id: "software-tools",
        heading: "Software tools for Zip disk recovery",
        level: 2,
        paragraphs: [
          "Unlike optical disc recovery — which requires specialised sector-retry logic — Zip disk recovery uses standard hard drive recovery tools because the underlying media is magnetic, not optical.",
        ],
        table: {
          caption: "Zip disk recovery tools (2026)",
          headers: ["Tool", "Cost", "Best for", "Platform"],
          rows: [
            ["Recuva", "Free", "Deleted files, light corruption", "Windows"],
            ["TestDisk / PhotoRec", "Free", "File system rebuild, file carving", "Windows / Mac / Linux"],
            ["R-Studio", "$79.99", "Severe corruption, RAW disks", "Windows / Mac / Linux"],
            ["GetDataBack", "$79", "NTFS/FAT recovery, user-friendly", "Windows"],
          ],
        },
      },
      {
        id: "drive-wont-read",
        heading: "When the drive won't read the disk at all",
        level: 2,
        paragraphs: [
          "If the disk spins up and the drive immediately ejects it, or if the drive makes unusual noises and never assigns a drive letter, the disk has physical damage — a scratched magnetic surface, a seized hub, or COD damage to the disk's servo tracks.",
          "At this point, software recovery is not possible because the drive cannot read any sectors. The options are: find a different drive in better condition and try again, or send the disk to a professional recovery service that specialises in legacy magnetic media.",
          "Professional Zip disk recovery exists — a handful of specialist labs still have working Zip recovery equipment. The cost is typically $200–$500 depending on the severity of damage. For disks containing irreplaceable work files, client projects, or family photos from the 1990s and 2000s, it's often worth the cost.",
        ],
      },
      {
        id: "once-recovered",
        heading: "Once the data is recovered: migrate immediately",
        level: 2,
        paragraphs: [
          "Zip disks are magnetic media from 20–30 years ago. Even if your disk reads perfectly today, the magnetic signal degrades over time and the disk may become unreadable within years. Copy everything off immediately and store it in at least two modern locations — an external SSD or hard drive, plus cloud storage.",
          "Common file formats on Zip disks from the 1990s and 2000s include Quark XPress (.qxd), older versions of Photoshop (.psd), FileMaker Pro databases (.fp3, .fp5), and various now-obsolete word processor formats. Check that you have software capable of opening these files before assuming the recovery is complete.",
        ],
        callout: {
          label: "Format conversion",
          text: "Older Quark, InDesign, and FileMaker files may need to be opened in period-correct software versions. CloudConvert and various legacy app installers can help — but this is a separate step after you've secured the raw files.",
          color: "blue",
        },
      },
    ],
    faq: [
      {
        q: "Do I need a special driver to use a USB Zip drive on Windows 11?",
        a: "No. USB Zip drives (the Iomega Zip 250 USB and Zip 750 USB) are recognised automatically by Windows 10 and 11 as standard USB mass storage devices. Plug in the drive, wait about 10 seconds, then insert your disk. No driver download is needed.",
      },
      {
        q: "My Zip drive makes a clicking sound. Is that the click of death?",
        a: "A brief 2–3 click sequence during disk insertion is normal — that's the drive seeking the disk's home position. The click of death is a rhythmic sequence of 6–10 or more clicks that repeats in a loop and is accompanied by a failure to mount the disk. If your drive loops clicking and never mounts the disk, stop and do not insert any other disks.",
      },
      {
        q: "Can I recover data from a Zip disk with Heirvo?",
        a: "Heirvo is designed for optical disc recovery (DVDs, CDs, Blu-ray) and doesn't handle Zip disks, which use a completely different magnetic recording technology. For Zip disk recovery, use a FAT recovery tool like Recuva or R-Studio after connecting the drive via USB.",
      },
      {
        q: "My 250MB Zip disk doesn't work in my 100MB drive. Is it broken?",
        a: "No — a 100MB Zip drive physically cannot read 250MB disks. The 250MB format uses a higher-density recording that requires a different read head. You need a 250MB or 750MB drive to read 250MB disks.",
      },
      {
        q: "The files on my Zip disk are in old formats I can't open. What do I do?",
        a: "First priority is getting the raw files off the disk — format compatibility is a separate problem. Once the files are safely copied to a modern drive, search for legacy software versions or conversion tools. Many 1990s file formats have open-source readers, and services like CloudConvert handle some older formats. The Internet Archive also maintains runnable versions of old software for format recovery purposes.",
      },
    ],
    cta: {
      heading: "Recovering other legacy media?",
      body: "Heirvo specialises in optical disc recovery — scratched, rotted, and unfinalized DVDs, CDs, and Blu-ray. For Zip disks, the tools in this guide are your best path.",
      primaryLabel: "Recover a damaged DVD or CD",
      primaryHref: "/download",
      secondaryLabel: "Mail-in service for severe damage",
      secondaryHref: "/recover",
    },
  },
  // ─────────────────────────────────────────────────────────────────────────────
  // 18. Copy DVD to hard drive Windows 11
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "copy-dvd-to-hard-drive-windows-11",
    title: "How to Copy a DVD to Your Hard Drive on Windows 11",
    metaTitle: "How to Copy a DVD to Your Hard Drive on Windows 11 (2026 Guide)",
    metaDescription:
      "Step-by-step guide to copying your personal DVDs to your hard drive on Windows 11 — as an ISO image or as MP4 video files. Includes what to do with damaged discs.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "6 min read",
    category: "DVD Recovery",
    intro:
      "Copying a DVD to your hard drive preserves the content before the disc degrades — DVD-R and DVD+R discs have a typical lifespan of 10–25 years, and many burned in the early 2000s are already showing signs of disc rot. This guide covers two approaches: copying as an ISO image (a perfect byte-for-byte copy of the disc) and copying as an MP4 video file (smaller, plays anywhere). Both work on Windows 11 with free software.",
    related: ["how-long-do-dvds-last-disc-rot", "recover-files-scratched-dvd", "dvd-drive-not-reading-disc-windows-11", "recover-corrupted-iso-file", "vlc-plays-dvd-recovery-fails"],
    sections: [
      {
        id: "iso-vs-mp4",
        heading: "ISO image vs MP4 — which should you make?",
        level: 2,
        paragraphs: [
          "An ISO image is an exact copy of the entire disc — every sector, every menu, every subtitle track, every audio language. It's a perfect archive. The downside: a single-layer DVD produces a 4.3 GB ISO file; dual-layer produces up to 8.5 GB. You need disc playback software (VLC, for example) to play it.",
          "An MP4 file is the main video track re-encoded as a standard video file. It's smaller (typically 1–4 GB depending on quality settings), plays in every media player and on every device, and is easy to share. The downside: menus, alternate audio tracks, and subtitles are usually stripped out.",
          "For archiving home video and family footage: ISO if you have storage space (preserves everything exactly), MP4 if you need something that plays anywhere without special software.",
        ],
        callout: {
          label: "Personal discs only",
          text: "This guide covers copying DVDs you burned yourself — home video, personal projects, data backups. Commercial DVDs (movies, TV shows) contain copy protection and are subject to copyright law in your country.",
          color: "amber",
        },
      },
      {
        id: "copy-as-iso",
        heading: "Option 1: Copy to ISO image (exact disc copy)",
        level: 2,
        paragraphs: [
          "ImgBurn is the most reliable free tool for creating ISO images on Windows. It's been around since 2006, is still actively maintained, and handles every DVD format including dual-layer discs and VIDEO_TS structures.",
        ],
        numbered: true,
        items: [
          "Download ImgBurn from imgburn.com and install it. The installer includes an optional toolbar — decline it during setup.",
          "Insert your DVD and open ImgBurn.",
          "Click 'Create image file from disc'.",
          "Set the Destination to a folder on your hard drive with enough free space (up to 8.5 GB for a dual-layer disc).",
          "Click the large Read button. ImgBurn reads the disc sector by sector and creates an .ISO file. A standard single-layer disc takes about 10–20 minutes.",
          "When complete, verify the ISO using ImgBurn's verify feature — it re-reads the disc and confirms the image matches.",
        ],
        callout: {
          label: "Store the ISO safely",
          text: "Once created, copy the ISO to at least two locations — an external drive and cloud storage. The whole point of copying the disc is redundancy. An ISO sitting on a single hard drive is one drive failure away from being lost.",
          color: "blue",
        },
      },
      {
        id: "copy-as-mp4",
        heading: "Option 2: Copy to MP4 video file",
        level: 2,
        paragraphs: [
          "HandBrake is the standard free tool for converting DVD video to MP4 on Windows. It's open source, actively maintained, and handles VIDEO_TS folders and ISO files directly.",
        ],
        numbered: true,
        items: [
          "Download HandBrake from handbrake.fr and install it.",
          "Open HandBrake and click 'Open Source'. Select your DVD drive from the list, or point it at a VIDEO_TS folder or ISO file if you already made one.",
          "HandBrake scans the disc and lists all detected titles. The longest title is usually the main feature.",
          "Select a preset from the right panel. 'Fast 1080p30' or 'HQ 1080p30 Surround' are good choices for home video — they produce high-quality MP4 files.",
          "Set the Save As path at the bottom of the screen.",
          "Click Start Encode. A standard 2-hour DVD takes 15–45 minutes to encode depending on your CPU.",
        ],
      },
      {
        id: "damaged-disc",
        heading: "What to do if the disc is damaged or won't read",
        level: 2,
        paragraphs: [
          "ImgBurn and HandBrake both rely on the DVD drive reading the disc successfully. If the disc has scratches, disc rot, or other damage, both tools will fail at the first read error — ImgBurn will abort the image, and HandBrake will skip or freeze at the damaged section.",
          "For damaged discs, you need sector-level recovery software before copying. Heirvo reads each damaged sector up to 16 times at variable speeds, recovering data that standard tools skip. Once Heirvo has recovered the disc content, you can save it directly as an MP4 or ISO.",
          "This is the most important reason to copy your DVDs sooner rather than later: a disc that reads perfectly today in ImgBurn may not read at all in two years once disc rot progresses.",
        ],
        callout: {
          label: "Free to scan",
          text: "Heirvo's scan is completely free — it shows you exactly what's recoverable before you pay anything. If the disc reads without errors, you don't need it. If it has damage, it's your best option.",
          color: "green",
        },
      },
      {
        id: "storage-advice",
        heading: "How much storage do you need?",
        level: 2,
        table: {
          caption: "Storage estimates per disc format",
          headers: ["Format", "ISO size", "MP4 size (HQ)", "MP4 size (compressed)"],
          rows: [
            ["Single-layer DVD (DVD-5)", "~4.3 GB", "~2–4 GB", "~1–2 GB"],
            ["Dual-layer DVD (DVD-9)", "~7.9 GB", "~3–6 GB", "~1.5–3 GB"],
            ["100-disc collection (DVD-5)", "~430 GB", "~200–400 GB", "~100–200 GB"],
          ],
        },
        paragraphs: [
          "A 2 TB external hard drive ($50–$70) holds roughly 400 single-layer ISOs or 800+ high-quality MP4 files — more than enough for a large home video collection. Pair it with a cloud backup (Backblaze B2 is $6/month for unlimited storage) for genuine redundancy.",
        ],
      },
    ],
    faq: [
      {
        q: "Does Windows 11 have a built-in way to copy a DVD to the hard drive?",
        a: "Not really. Windows can copy individual files from a data DVD using File Explorer, but it has no built-in tool for creating an ISO image or converting VIDEO_TS home video to MP4. ImgBurn (for ISO) and HandBrake (for MP4) are the standard free tools for this.",
      },
      {
        q: "Can I copy a DVD to my hard drive with VLC?",
        a: "VLC can convert DVD video to a file via Media → Convert/Save, but it's less reliable than HandBrake for this purpose and the settings are less intuitive. HandBrake is specifically designed for this task and produces better results.",
      },
      {
        q: "ImgBurn stopped partway through with a read error. What do I do?",
        a: "A read error means the disc has a damaged sector that ImgBurn can't read. ImgBurn has a setting to retry failed sectors, but it makes fewer passes than dedicated recovery software. For a disc with read errors, use Heirvo first to recover the disc content, then copy the result.",
      },
      {
        q: "Will the MP4 file look as good as the original DVD?",
        a: "At HandBrake's HQ preset, the MP4 will be visually indistinguishable from the disc when played on a normal screen. DVDs are standard definition (720×480 NTSC or 720×576 PAL) — re-encoding at high quality settings preserves all the detail the original disc had.",
      },
      {
        q: "How long does copying a DVD take?",
        a: "Creating an ISO with ImgBurn: 10–25 minutes for a single-layer disc, 20–45 minutes for dual-layer. Converting to MP4 with HandBrake: 15–45 minutes for a 2-hour disc depending on your CPU. Running both takes under an hour total.",
      },
    ],
    cta: {
      heading: "Disc scratched or damaged? Recover it first.",
      body: "ImgBurn and HandBrake need a readable disc. If yours has damage, Heirvo recovers the content sector by sector — then you can copy it to your hard drive. Free to scan.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in service for severe damage",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 19. Recover corrupted ISO file
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-corrupted-iso-file",
    title: "How to Recover a Corrupted ISO File",
    metaTitle: "How to Recover a Corrupted ISO File (2026 Guide)",
    metaDescription:
      "ISO file won't mount or open? Here's how to diagnose the corruption, extract what you can with free tools, and rebuild the image from the original disc if you have it.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "6 min read",
    category: "Software Guide",
    intro:
      "A corrupted ISO file is a different problem from a damaged disc — the optical media is fine, but the image file on your hard drive has been corrupted by a failed download, a storage error, or file system damage. In many cases the ISO is partially intact and most of the content is recoverable. This guide covers every approach: verifying the corruption, extracting content from a partial ISO, and recreating the image from the original disc.",
    related: ["best-dvd-recovery-software", "recover-files-scratched-dvd", "recover-data-from-blu-ray-windows", "copy-dvd-to-hard-drive-windows-11", "dvd-drive-freezing-mid-recovery-fix"],
    sections: [
      {
        id: "verify-first",
        heading: "Step 1: Verify the corruption",
        level: 2,
        paragraphs: [
          "Before spending time on recovery, confirm the ISO is actually corrupted — not just mounted incorrectly or associated with the wrong application.",
        ],
        items: [
          "Try mounting it with Windows' built-in ISO mounting (right-click → Mount). If it mounts and shows files, the ISO is fine — the problem is whatever application you were trying to open it with.",
          "Try opening it with 7-Zip (free): right-click the ISO → 7-Zip → Open archive. 7-Zip can browse ISO contents without mounting. If you can see files, the ISO structure is largely intact even if it won't mount.",
          "If you downloaded the ISO from a legitimate source, check whether the provider published an MD5 or SHA-256 checksum. Run the checksum on your file (Windows: certutil -hashfile yourfile.iso MD5) and compare. A mismatch confirms corruption.",
          "If the ISO file size is significantly smaller than expected (check the download page), the download was interrupted and the file is incomplete — not corrupted but truncated.",
        ],
        callout: {
          label: "Incomplete vs corrupted",
          text: "An incomplete ISO (interrupted download) and a corrupted ISO (storage error or bad sectors) look the same but have different fixes. If the file is smaller than expected, re-download it. If the size is right but the content is wrong, proceed with recovery.",
          color: "blue",
        },
      },
      {
        id: "extract-with-7zip",
        heading: "Step 2: Extract files with 7-Zip",
        level: 2,
        paragraphs: [
          "7-Zip can extract files from a partially corrupted ISO by skipping the damaged sections. This is the fastest first attempt — it takes under a minute.",
        ],
        numbered: true,
        items: [
          "Download and install 7-Zip from 7-zip.org (free, open source).",
          "Right-click the ISO file → 7-Zip → Extract to [folder name].",
          "7-Zip will extract everything it can read and report errors for the corrupted sections. Check what was successfully extracted — you may have most or all of the content.",
          "If 7-Zip reports errors but extracts some files, note which files are missing or corrupted. These correspond to the damaged areas of the ISO.",
        ],
      },
      {
        id: "isobuster-recovery",
        heading: "Step 3: Use IsoBuster for deeper recovery",
        level: 2,
        paragraphs: [
          "IsoBuster can open ISO files directly and attempt to recover content from damaged areas that 7-Zip skips. It provides a file tree view showing which files are intact, which are partially readable, and which are fully unreadable.",
        ],
        numbered: true,
        items: [
          "Download IsoBuster (free tier available) and open the ISO file via File → Open Image File.",
          "Browse the file tree. Files with a red icon have read errors; files with a green icon are intact.",
          "Right-click the root of the disc image and select Extract Objects → Extract all objects and their properties.",
          "IsoBuster will extract all recoverable content, skipping the damaged files and logging what it couldn't read.",
        ],
        callout: {
          label: "IsoBuster free tier",
          text: "IsoBuster's free tier can open and browse ISO files and extract standard user data files. For VIDEO_TS home video content within the ISO, a paid licence (€39.95) may be required to extract VOB files.",
          color: "blue",
        },
      },
      {
        id: "recreate-from-disc",
        heading: "Step 4: Recreate the ISO from the original disc",
        level: 2,
        paragraphs: [
          "If you still have the original physical disc, recreating the ISO is almost always better than recovering from the corrupted file — you'll get a complete, verified image rather than a partial recovery.",
          "Use ImgBurn (free): open it, select 'Create image file from disc', insert the original disc, and let it run. If the disc itself is undamaged, this produces a perfect ISO in 10–25 minutes.",
          "If the original disc is damaged, use Heirvo to recover the disc content first. Heirvo can save the recovered content as an ISO file, giving you a clean image from even a scratched or partially rotted disc.",
        ],
      },
      {
        id: "prevent-future-corruption",
        heading: "Preventing ISO corruption in future",
        level: 2,
        items: [
          "Verify checksums after every download — compare the MD5 or SHA-256 hash against the value published by the source.",
          "Store ISO files on a drive with error correction — modern NAS drives (WD Red, Seagate IronWolf) use more aggressive ECC than standard desktop drives.",
          "Use a file integrity tool like FastSum or HashCheck to periodically verify your ISO archive hasn't silently corrupted over time.",
          "Keep at least two copies of important ISOs in different physical locations. A single external drive is not a backup.",
        ],
      },
      {
        id: "when-its-a-disc-problem",
        heading: "When the problem is the disc, not the ISO",
        level: 2,
        paragraphs: [
          "If you're trying to create an ISO from a disc and the resulting file is corrupted or incomplete, the problem is the source disc rather than the imaging process. Standard imaging tools (ImgBurn, Windows built-in) abort at the first read error and produce an incomplete ISO.",
          "For damaged discs, use Heirvo first. It makes up to 16 read passes per sector at variable speeds, building as complete an image as possible from the available data. The result can be saved as an ISO and used as the source for any further processing.",
        ],
      },
    ],
    faq: [
      {
        q: "My ISO won't mount in Windows 11 — does that mean it's corrupted?",
        a: "Not necessarily. Try opening it with 7-Zip first (right-click → 7-Zip → Open archive). If 7-Zip shows the file contents, the ISO is intact but something is preventing Windows from mounting it — try the Disk Image Tools tab in File Explorer properties, or use a third-party mount tool like WinCDEmu. If 7-Zip also fails, the file is likely corrupted.",
      },
      {
        q: "Can I repair a corrupted ISO without the original disc?",
        a: "Partially — 7-Zip and IsoBuster can extract whatever content is undamaged in the ISO. What's in the corrupted sections is not recoverable from the ISO file alone without the original source. If the ISO was downloaded, re-downloading is almost always the right answer. If it was created from a disc you no longer have, extract what you can.",
      },
      {
        q: "How do I check the MD5 hash of an ISO on Windows 11?",
        a: "Open PowerShell and run: Get-FileHash yourfile.iso -Algorithm MD5. For SHA-256 (more common for modern downloads): Get-FileHash yourfile.iso -Algorithm SHA256. Compare the output to the checksum published on the download page.",
      },
      {
        q: "My ISO is the right file size but still won't mount. What's wrong?",
        a: "A file can be the right size but still have corrupted sectors — the corruption replaces good data with bad data rather than truncating the file. Open it with 7-Zip to see which specific files inside are affected. If it's only a few files, the majority of the content is likely intact and extractable.",
      },
      {
        q: "Can Heirvo recover a corrupted ISO file?",
        a: "Heirvo is designed for optical disc recovery — it reads physical DVDs, CDs, and Blu-ray discs. It doesn't process ISO files directly. If your ISO was created from a disc you still have, Heirvo can recover the disc and produce a fresh ISO. For an ISO file with no original disc, use 7-Zip or IsoBuster.",
      },
    ],
    cta: {
      heading: "ISO created from a damaged disc?",
      body: "If the original disc is scratched or degraded, Heirvo recovers it sector by sector and saves the result as a clean ISO. Free to scan.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "View all recovery guides",
      secondaryHref: "/guides",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Recover 8mm film transferred to DVD
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-8mm-film-dvd-transfer",
    title: "How to Recover 8mm Film Transferred to DVD",
    metaTitle:
      "How to Recover 8mm Film Transferred to DVD (2026 Guide)",
    metaDescription:
      "Your 8mm film was transferred to DVD years ago — now the disc won't play. Recover irreplaceable family footage from degraded transfer DVDs with Heirvo. Free scan, pay only to save.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "7 min read",
    category: "DVD Recovery",
    intro:
      "Between the late 1990s and early 2010s, millions of families had their 8mm, Super 8, and Hi8 film reels transferred to DVD. It felt like the responsible thing to do — preserve those irreplaceable memories on a modern format. But DVD-R discs have a limited lifespan, and many of those transfers are now 15 to 25 years old. The dye layer is fading, the disc won't play, and the original film reels were often discarded years ago. That DVD may be the only surviving copy of your grandparents' wedding, your first steps, or a summer at the lake house in 1974. The footage is usually still recoverable — but the window is closing.",
    related: ["recover-home-videos-dvd", "recover-vhs-converted-dvd", "recover-video-from-camcorder-dvd", "recover-wedding-dvd", "dvd-drive-freezing-mid-recovery-fix"],
    sections: [
      {
        id: "why-8mm-transfers-at-risk",
        heading: "Why your 8mm-to-DVD transfer is at risk right now",
        level: 2,
        paragraphs: [
          "8mm film was the dominant home movie format from the 1930s through the early 1980s. Super 8 took over in 1965 and remained popular until camcorders replaced film in the late 1980s. By the 2000s, most families had boxes of film reels they could no longer watch — projectors were broken, bulbs were unavailable, and the film itself was becoming brittle.",
          "Transfer services offered a solution: send in your reels, get back a DVD. Shops like Costco, Walgreens, and hundreds of local video transfer businesses did exactly this, recording the telecine output to DVD-R discs. It felt permanent. It was not.",
          "DVD-R discs use an organic dye layer — cyanine, phthalocyanine, or azo — that degrades through oxidation, UV exposure, heat, and humidity. Under ideal archival conditions (cool, dark, low humidity), a DVD-R can last 30 years or more. In a box in the attic, a drawer in the living room, or a sleeve in the garage, the realistic lifespan is 10 to 20 years. Many 8mm transfer DVDs burned between 2000 and 2010 are now failing.",
          "What makes this particularly devastating is that most families threw away the original film reels after receiving the DVD. The transfer service may have returned the reels, but they ended up in a bin during a move, a house clearance, or simply because the DVD was supposed to be the permanent copy. For millions of families, the DVD is the last link to footage that cannot be recreated.",
        ],
      },
      {
        id: "check-your-disc",
        heading: "How to tell if your 8mm transfer DVD is still readable",
        level: 2,
        paragraphs: [
          "Before you need recovery software, it is worth checking the current state of your disc. Early detection means easier recovery — a disc showing early signs of degradation today will be significantly harder to recover in another year or two.",
        ],
        numbered: true,
        items: [
          "Hold the disc up to a bright light and look at the reflective (data) side. A healthy disc has an even, mirror-like sheen. A disc with early disc rot may show a faint bronze or yellowish tint, uneven patches of haziness, or tiny pinholes of light visible through the reflective layer.",
          "Insert the disc into a DVD drive. If Windows recognises it and you can browse the VIDEO_TS folder, the disc is still readable — but that does not mean it is healthy. Copy the files to your hard drive immediately as a precaution.",
          "Try playing the disc in VLC or Windows Media Player. If the video plays but shows pixelation, blocky artefacts, freezing, or audio dropouts at certain points, those sectors are beginning to fail. The disc is degrading and needs to be recovered now.",
          "If the disc is not recognised at all — Windows says 'insert a disc' or shows the drive as empty — the file system layer is unreadable. This does not mean the footage is gone. Sector-level recovery software can often read beneath the damaged file system.",
        ],
        callout: {
          label: "Act now, not later",
          text: "Disc rot is progressive and accelerating. A disc that recovers 95% of its footage today may only yield 60% in another two years. If you have 8mm transfer DVDs sitting in storage, check them this week — not next year.",
          color: "amber",
        },
      },
      {
        id: "recovery-steps",
        heading: "How to recover 8mm film footage with Heirvo",
        level: 2,
        numbered: true,
        items: [
          "Download and install Heirvo on any Windows 10 or 11 PC. The installer is about 60 MB, takes under two minutes, and requires no account.",
          "Insert the 8mm transfer DVD into your disc drive. A full-size external USB DVD drive is ideal — slim laptop drives have weaker error correction and struggle more with degraded discs. If Windows shows an error like 'disc not readable', that is expected.",
          "Open Heirvo and select your disc drive from the dropdown. Heirvo detects the disc type and format automatically, including DVD-5 (single-layer) and DVD-9 (dual-layer) transfer discs.",
          "Click Scan. Heirvo reads every sector up to 16 times at variable speeds, both forwards and backwards, before marking a sector as unrecoverable. A degraded transfer disc typically takes 1 to 4 hours depending on the severity of the damage.",
          "When the scan completes, review the results. Heirvo shows every recoverable file — typically the VIDEO_TS folder containing VOB video files, plus any chapter markers the transfer service added. The scan is completely free.",
          "Activate Heirvo Pro ($39 one-time) to save the recovered footage to your hard drive. Heirvo can save the raw VIDEO_TS structure (playable in any DVD player software) or convert to MP4 for easy playback on phones, tablets, and smart TVs. If nothing was recovered, you pay nothing.",
        ],
      },
      {
        id: "what-heirvo-recovers",
        heading: "What Heirvo recovers from 8mm transfer DVDs",
        level: 2,
        paragraphs: [
          "Most 8mm-to-DVD transfers were encoded as standard DVD-Video — a VIDEO_TS folder containing VOB files, IFO navigation files, and BUP backup files. This is exactly the same format used by commercial movie DVDs, and Heirvo handles it natively.",
          "Even if the IFO navigation files are too damaged to recover, the VOB files themselves contain the footage. Heirvo can extract and convert VOB files independently, so you get the video even if the disc menus are lost.",
        ],
        table: {
          headers: ["File type", "What it contains", "What Heirvo does"],
          rows: [
            [
              "VOB (Video Object)",
              "The actual video and audio — your 8mm footage",
              "Recovers sector by sector, saves as VOB or converts to MP4",
            ],
            [
              "IFO (Information)",
              "Chapter markers, menu structure, playback order",
              "Recovers when possible — not critical for viewing the footage",
            ],
            [
              "BUP (Backup)",
              "Backup copies of IFO files",
              "Recovers automatically as part of the VIDEO_TS structure",
            ],
            [
              "ISO image",
              "Full disc image (if you need an exact copy)",
              "Can save the entire disc as an ISO for archival purposes",
            ],
          ],
        },
      },
      {
        id: "mail-in-recovery",
        heading: "When to use mail-in recovery",
        level: 2,
        paragraphs: [
          "If Heirvo's scan recovers less than 50% of the disc, if your computer's DVD drive cannot detect the disc at all, or if the disc has visible delamination — the reflective layer peeling away from the polycarbonate — professional lab recovery is the next step.",
          "Heirvo's mail-in service starts at $89. We use lab-grade optical equipment with a modified reader, a stronger laser, and finer focus control that can read discs no consumer drive can. We also re-polish disc surfaces when needed to remove haze caused by oxidation.",
          "For 8mm film transfers — footage that may span three generations of a family, shot on a format that no longer exists, stored on a disc that is the only surviving copy — the mail-in service exists precisely for this situation. We will tell you exactly what is recoverable before you pay anything. If we recover nothing, you pay nothing.",
        ],
        callout: {
          label: "Original reels gone?",
          text: "If the original 8mm film reels no longer exist, your transfer DVD is the sole surviving copy of that footage. Do not wait. Disc degradation is progressive — every month of delay reduces the chance of a full recovery.",
          color: "amber",
        },
      },
      {
        id: "preserve-after-recovery",
        heading: "How to preserve your recovered footage permanently",
        level: 2,
        paragraphs: [
          "Once you have recovered the footage, the single most important thing you can do is store it in multiple locations. A single copy on a single device is exactly the situation that put you at risk in the first place.",
        ],
        items: [
          "Save the MP4 file to an external hard drive or SSD. Label it clearly with the content and date.",
          "Upload a copy to cloud storage — Google Drive, iCloud, OneDrive, or Backblaze. Cloud storage is effectively permanent as long as you maintain the account.",
          "Consider uploading to a private YouTube channel set to 'Unlisted'. YouTube stores video at high quality indefinitely, and it is free.",
          "Share the files with family members. Every additional copy in a different household is another layer of protection against loss.",
          "Do not rely on burning a new DVD as your backup. You would be recreating the exact same fragile storage medium that just failed.",
        ],
        callout: {
          label: "The 3-2-1 rule",
          text: "Keep at least 3 copies of irreplaceable footage, on at least 2 different types of media, with at least 1 copy stored off-site (cloud or a relative's house). This is the only truly safe preservation strategy.",
          color: "green",
        },
      },
    ],
    faq: [
      {
        q: "The original 8mm film reels are gone. Is the DVD my only hope?",
        a: "If the original film reels were discarded after the transfer, yes — the DVD is the sole surviving copy. The good news is that most transfer DVDs are recoverable even when they won't play normally. Run a free scan with Heirvo to see exactly what footage can be saved. Act soon: disc rot is progressive and the recovery rate drops over time.",
      },
      {
        q: "My 8mm transfer DVD is from 2003. Is it too old to recover?",
        a: "Not at all. A 23-year-old DVD-R is old enough to show degradation, but in most cases the video data is still physically present on the disc — it is just harder for a standard drive to read. Heirvo's multi-pass sector-level scanning is designed precisely for discs in this condition. We have successfully recovered footage from transfer DVDs older than 25 years.",
      },
      {
        q: "What is the difference between 8mm film, Hi8, and Video8?",
        a: "8mm and Super 8 are analogue film formats — actual celluloid film shot through a camera. Hi8 and Video8 are magnetic tape formats used in camcorders from the late 1980s onward. All four formats were commonly transferred to DVD. Heirvo recovers the DVD regardless of what the original source format was — it works with the DVD-Video data, not the original medium.",
      },
      {
        q: "Will the recovered video have the same quality as the original transfer?",
        a: "In fully recovered sectors, yes — the video is bit-for-bit identical to what was originally burned to the disc. In sectors with partial damage, you may see brief pixelation, blocky artefacts, or a frozen frame lasting a second or two. Audio may have brief dropouts. These artefacts correspond to the specific damaged sectors on the disc.",
      },
      {
        q: "Can I recover a disc that has visible mould or fungal growth?",
        a: "Mould on the disc surface can often be gently cleaned with isopropyl alcohol and a soft cloth before scanning. Do not use water. If the mould has penetrated the lacquer layer on the label side, the reflective layer underneath may be damaged — in that case, mail-in recovery with professional cleaning is recommended. Do not attempt to play a visibly mouldy disc without cleaning it first, as it can damage your drive.",
      },
    ],
    cta: {
      heading: "Those memories deserve to survive",
      body: "Your 8mm film transfer DVD may be the only copy left. Scan it free with Heirvo and see exactly what footage is recoverable — before the disc degrades further.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Mail-in recovery from $89",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Recover a DVD damaged by car heat
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-dvd-car-heat-damage",
    title: "How to Recover a DVD Damaged by Car Heat",
    metaTitle: "How to Recover a DVD Damaged by Car Heat (2026 Guide)",
    metaDescription:
      "Recover files and home videos from a DVD warped or damaged by heat in a car. Assess the damage, try software recovery, or use Heirvo's mail-in lab service.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "6 min read",
    category: "DVD Recovery",
    intro:
      "A DVD left on a car dashboard in summer can warp in under an hour. The polycarbonate substrate starts deforming around 70 °C (158 °F), and a parked car in direct sunlight routinely hits 80–90 °C on the dash — more than enough to ruin a disc. If you've found a warped DVD in your car and it holds irreplaceable family videos, graduation footage, or wedding memories, don't panic. Depending on the severity, the data is often still recoverable — either with software or through a professional mail-in service.",
    related: ["recover-files-scratched-dvd", "recover-water-damaged-dvd", "recover-data-cracked-dvd", "how-long-do-dvds-last-disc-rot", "dvd-drive-disconnects-mid-scan", "powered-usb-hub-dvd-recovery"],
    sections: [
      {
        id: "why-heat-damages-dvds",
        heading: "Why heat damages DVDs",
        paragraphs: [
          "A DVD is a sandwich of layers: a polycarbonate plastic substrate, a thin metallic reflective layer, and — in recordable discs — an organic dye layer that stores the actual data. Each of these layers reacts differently to extreme heat, and all three failure modes can happen simultaneously.",
          "Polycarbonate warping is the most visible damage. Polycarbonate has a glass transition temperature of around 150 °C, but it begins softening and deforming well below that — measurable warping starts at roughly 70 °C (158 °F). A warped disc wobbles in the drive tray and the laser can no longer track the data spiral accurately, producing read errors or preventing the drive from spinning the disc at all.",
          "Dye layer degradation affects recordable DVDs (DVD-R, DVD+R) more than pressed commercial discs. The organic dye that stores data is heat-sensitive by design — that is how a laser writes to it. Sustained temperatures above 60 °C accelerate chemical breakdown of the dye, reducing the contrast between burned and unburned marks and making the disc harder to read even when it is not physically warped.",
          "Reflective layer separation (delamination) happens in severe cases. The aluminium or gold reflective layer is bonded to the polycarbonate with adhesive. Repeated thermal cycling — the disc heats up every afternoon and cools at night — weakens that bond. Once the reflective layer separates, parts of the disc become completely opaque to the laser and no software can read those sectors.",
        ],
      },
      {
        id: "assess-the-damage",
        heading: "How to assess heat damage on your disc",
        paragraphs: [
          "Before trying any recovery, examine the disc carefully under good light. The level of visible damage tells you which recovery path is realistic.",
        ],
        table: {
          caption: "Heat damage severity and recommended recovery approach",
          headers: ["Damage level", "What you see", "Drive behaviour", "Best recovery option"],
          rows: [
            [
              "Mild warping",
              "Disc looks mostly flat; slight flex when held at eye level",
              "Drive accepts the disc but may struggle to read some files",
              "Software recovery with Heirvo — high success rate",
            ],
            [
              "Moderate warping",
              "Visible curve or wave across the disc surface",
              "Drive spins up but cannot mount the disc, or ejects it after a few seconds",
              "Try software recovery first; mail-in service if the drive rejects the disc",
            ],
            [
              "Severe warping",
              "Disc is visibly bent, bowl-shaped, or has rippled edges",
              "Drive will not accept or spin the disc at all",
              "Mail-in lab recovery only — do not force the disc into a drive",
            ],
            [
              "Delamination",
              "Bubbling, cloudy patches, or the reflective layer is peeling away from the edge",
              "Drive may spin but reads mostly errors",
              "Mail-in lab recovery — further handling can worsen the separation",
            ],
          ],
        },
        callout: {
          label: "Warning",
          text: "Never try to flatten a warped DVD by heating it further (hair dryer, oven, hot water). Re-heating damages the dye layer and can cause the reflective coating to separate. It also risks melting the disc onto your drive's lens assembly, destroying both the disc and the drive.",
          color: "amber",
        },
      },
      {
        id: "software-recovery",
        heading: "Software recovery: when the drive can still read the disc",
        paragraphs: [
          "If your disc drive accepts the DVD and spins it up — even if Windows shows an error like 'disc is not formatted' or 'cannot read from drive' — there is a good chance Heirvo can recover most or all of the data. Heirvo reads sector by sector with multiple retry passes, which is exactly what a heat-damaged disc needs because warping causes intermittent read failures rather than total data loss.",
        ],
        numbered: true,
        items: [
          "Download and install Heirvo from heirvo.com. The installer is about 60 MB and requires no account.",
          "Insert the heat-damaged DVD gently into your disc drive. Let the drive spin up fully — this may take 30–60 seconds longer than a healthy disc.",
          "Open Heirvo and select your disc drive. Heirvo detects the disc type and condition automatically.",
          "Click Scan. Heirvo makes up to 16 passes over problem sectors, reading at different speeds and directions. A heat-damaged disc typically scans in 1–3 hours.",
          "Review the results. Heirvo shows every recoverable file — video, photos, documents, or a full ISO image. The scan is completely free.",
          "Activate Heirvo Pro ($39 one-time) to save recovered files to your hard drive. If nothing is recoverable, you pay nothing.",
        ],
        callout: {
          label: "Tip",
          text: "If the drive ejects or fails to recognise the disc, try a different drive. External USB DVD drives with tray-loading mechanisms (not slot-loading) are more tolerant of slightly warped discs because the tray provides a flat resting surface. Avoid slot-loading drives — a warped disc can jam inside.",
          color: "green",
        },
      },
      {
        id: "mail-in-recovery",
        heading: "Mail-in recovery: when the disc is too warped for any drive",
        paragraphs: [
          "If no drive on your computer will accept or read the disc, the data is not necessarily gone — it just requires equipment you don't have at home. Heirvo's mail-in lab recovery service uses industrial-grade optical readers with adjustable focus depth and tilt compensation that can track the data spiral on a warped disc that would be unreadable in any consumer drive.",
          "The process is simple: you ship us the disc (free shipping label provided), our technicians attempt recovery using lab equipment, and we send you the recovered files on a USB drive or via secure download. Pricing starts at $89 per disc and follows a no-data-no-fee guarantee — if we cannot recover anything, you pay nothing.",
          "Mail-in recovery is the recommended path for severely warped discs, discs showing delamination, and any disc that holds irreplaceable memories you cannot afford to lose. The success rate on heat-damaged discs in our lab is significantly higher than consumer software alone because the industrial readers physically compensate for the disc's warped geometry.",
        ],
      },
      {
        id: "prevention",
        heading: "How to prevent heat damage to your discs",
        paragraphs: [
          "Once you've recovered your data, take steps to ensure this never happens again. Digital backups are the ultimate protection, but proper physical storage extends the life of any disc significantly.",
        ],
        items: [
          "Never leave discs in a parked car — not in the glovebox, centre console, door pocket, or on the dashboard. Temperatures inside a closed car in summer can exceed 80 °C (176 °F) within 30 minutes.",
          "Store discs vertically in hard jewel cases or binder sleeves, in a cool, dry, dark location. Ideal storage temperature is 15–25 °C (59–77 °F) with low humidity.",
          "Back up every important disc digitally. Use Heirvo to create an ISO image of each disc while it is still readable — this takes minutes and gives you a perfect byte-for-byte backup on your hard drive.",
          "Keep discs away from direct sunlight even indoors. UV exposure degrades the dye layer in recordable DVDs over time, compounding any heat damage.",
          "If you must transport discs in a car, carry them in an insulated bag and bring them inside with you at every stop.",
        ],
      },
    ],
    faq: [
      {
        q: "Can a heat-warped DVD be flattened and reused?",
        a: "No. Even if you could flatten the polycarbonate (which risks further damage), the dye layer and reflective coating have likely been compromised by the heat. Focus on recovering the data, not restoring the physical disc. Once recovered, back up your files digitally.",
      },
      {
        q: "How hot does a car dashboard get in summer?",
        a: "Dashboard temperatures in a parked car in direct sunlight regularly reach 80–95 °C (176–203 °F), and have been measured as high as 110 °C in extreme conditions. DVDs begin warping at around 70 °C (158 °F), so even a brief stop on a sunny day can be enough to damage an exposed disc.",
      },
      {
        q: "Will Heirvo work on a DVD that is slightly warped but still spins?",
        a: "Yes. If the drive can spin the disc at all, Heirvo has a strong chance of recovering data. Its multi-pass sector reader compensates for the intermittent read errors that warping causes. Run the free scan to see exactly how much is recoverable before committing.",
      },
      {
        q: "What does the mail-in service cost for a heat-damaged DVD?",
        a: "Mail-in recovery starts at $89 per disc. Pricing depends on the severity of the damage and the amount of data recovered. Every case is covered by a no-data-no-fee guarantee — if we cannot recover anything, you are not charged.",
      },
      {
        q: "Are pressed commercial DVDs (movies) more resistant to car heat than burned DVDs?",
        a: "The polycarbonate substrate warps at the same temperature regardless of disc type. However, pressed DVDs use a stamped aluminium layer instead of an organic dye, so their data is more heat-stable once warping is accounted for. Home-burned DVD-R and DVD+R discs suffer both warping and dye degradation, making them more vulnerable overall.",
      },
    ],
    cta: {
      heading: "Don't let a hot car erase your memories",
      body: "Heat-warped discs often need professional recovery. Mail us your disc and our lab team will extract every recoverable file — no data, no fee. Or download Heirvo to try a free scan first if your drive still reads the disc.",
      primaryLabel: "Mail-In Recovery — from $89",
      primaryHref: "/recover",
      secondaryLabel: "Download Free Scan",
      secondaryHref: "/download",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // DVD-R vs DVD+R: Recovery Differences Explained
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "dvd-r-vs-dvd-plus-r-recovery",
    title: "DVD-R vs DVD+R: Recovery Differences Explained",
    metaTitle: "DVD-R vs DVD+R: Which Format Is Easier to Recover? (2026 Guide)",
    metaDescription:
      "DVD-R vs DVD+R — how the two formats differ in error correction, defect management, and data recovery. Learn which disc type holds up better and how Heirvo recovers both.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "6 min read",
    category: "DVD Recovery",
    intro:
      "If you have a stack of old DVDs and some won't read, you may have noticed the discs are a mix of DVD-R and DVD+R. The two formats were developed by competing industry alliances in the early 2000s and differ in how they lay down data, handle errors, and manage defects. Those differences have a real — though often overstated — effect on how recoverable a disc is when it starts to fail. Here is what actually matters and what doesn't.",
    related: ["recover-files-scratched-dvd", "best-dvd-recovery-software", "heirvo-vs-isobuster", "recover-data-from-blu-ray-windows", "slim-vs-desktop-dvd-drive-recovery"],
    sections: [
      {
        id: "brief-history",
        heading: "A brief history of the format war",
        paragraphs: [
          "DVD-R was developed by Pioneer and ratified by the DVD Forum, the same body that created the original DVD specification. It launched in 1997 and became the default recordable format for most consumer DVD burners throughout the 2000s. Because it was first to market and carried the official DVD Forum stamp, DVD-R discs were cheaper and more widely compatible with standalone DVD players.",
          "DVD+R was introduced in 2002 by the DVD+RW Alliance, led by Philips, Sony, and Dell. It was designed as a technical improvement rather than a brand extension — the engineers had the benefit of hindsight and built in better error handling and more precise addressing. The '+' format never fully overtook DVD-R in market share, but most burners sold after 2004 supported both formats.",
        ],
      },
      {
        id: "physical-differences",
        heading: "Physical and technical differences that affect recovery",
        paragraphs: [
          "On the surface, DVD-R and DVD+R look identical — same 12 cm diameter, same 4.7 GB single-layer capacity, same polycarbonate and dye construction. The differences are in how the drive knows where it is on the disc and how it handles errors during writing.",
          "DVD-R uses a system called ATIP (Absolute Time In Pre-groove) to guide the laser. The groove wobbles at a fixed frequency, and timing data is encoded in that wobble. When linking one recording session to the next, DVD-R leaves small gaps between write sessions — called 'lossless linking' gaps — that can introduce micro-errors at session boundaries.",
          "DVD+R uses ADIP (ADdress In Pre-groove), which encodes address information as a high-frequency wobble modulation. This gives the drive more precise knowledge of its position on the disc at any moment. DVD+R also implements true lossless linking — session boundaries are seamless, with no gap and no data discontinuity.",
          "The practical effect is that DVD+R discs tend to have fewer uncorrectable errors in the areas between write sessions, and the drive can locate damaged sectors more accurately because the addressing system is more robust. For recovery software, more accurate addressing means fewer misread sectors.",
        ],
        callout: {
          label: "How to tell them apart",
          text: "Check the printed label side or the inner hub ring — most discs are stamped 'DVD-R' or 'DVD+R'. If the label has worn off, Heirvo detects the format automatically when it scans the disc.",
          color: "blue",
        },
      },
      {
        id: "defect-management",
        heading: "Defect management and error correction",
        paragraphs: [
          "Both formats use the same core error correction scheme — Reed-Solomon Product Code (RS-PC) with two layers of parity data (PI and PO). At the byte level, the error correction capacity is identical. Where DVD+R pulls ahead is in how it manages defects at a higher level.",
          "DVD+R supports a feature called defect management, where the drive can remap bad sectors to a spare area on the disc during recording. DVD-R does not have a built-in defect management layer for write-once media (though DVD-RW does). In practice, this means a DVD+R burn is slightly more likely to produce a clean recording even if the blank disc has minor manufacturing flaws.",
          "For recovery purposes, the advantage is modest but measurable. Studies of aged disc collections consistently show that DVD+R discs have slightly lower average PI/PO error rates than DVD-R discs of the same age and storage conditions. The difference is typically 5–15% in error rate — meaningful for borderline-readable discs, but not a guarantee of success.",
        ],
      },
      {
        id: "comparison-table",
        heading: "DVD-R vs DVD+R at a glance",
        table: {
          caption: "Key differences between DVD-R and DVD+R for recovery purposes",
          headers: ["Feature", "DVD-R", "DVD+R"],
          rows: [
            ["Developed by", "Pioneer / DVD Forum (1997)", "Philips, Sony, Dell / DVD+RW Alliance (2002)"],
            ["Addressing system", "ATIP (wobble timing)", "ADIP (wobble modulation) — more precise"],
            ["Session linking", "Gap-based — micro-errors possible", "True lossless linking — seamless"],
            ["Defect management", "Not available on write-once media", "Supported — remaps bad sectors during burn"],
            ["Error correction", "RS-PC (PI/PO parity)", "RS-PC (PI/PO parity) — identical"],
            ["Typical player compatibility", "Wider in older players", "Slightly narrower in pre-2004 players"],
            ["Dye layer / longevity", "Same dye types (cyanine, phthalocyanine, azo)", "Same dye types — identical degradation rate"],
            ["Average recovery rate", "Very good", "Slightly better on borderline discs"],
            ["Heirvo support", "Full support", "Full support"],
          ],
        },
      },
      {
        id: "rewritable-formats",
        heading: "What about DVD-RW and DVD+RW?",
        paragraphs: [
          "Rewritable discs — DVD-RW and DVD+RW — use a phase-change alloy layer instead of an organic dye. The laser heats the alloy to switch it between crystalline (reflective) and amorphous (less reflective) states, which is how data is written and erased.",
          "Rewritable discs can be overwritten roughly 1,000 times, but each rewrite cycle degrades the phase-change layer slightly. A DVD-RW that has been rewritten dozens of times is more likely to develop read errors than a write-once disc of the same age. If your disc has been reused many times, expect a lower recovery rate regardless of whether it is RW or +RW.",
          "Heirvo supports both DVD-RW and DVD+RW. The same sector-level scanning approach applies — the software reads below the file system and retries damaged areas at multiple speeds.",
        ],
        callout: {
          label: "Important",
          text: "If you have a rewritable disc with valuable data, do not attempt to erase and rewrite it. Even a failed erase operation can overwrite sectors that were previously recoverable. Insert the disc and scan it as-is.",
          color: "amber",
        },
      },
      {
        id: "recovery-approach",
        heading: "How Heirvo recovers both formats",
        paragraphs: [
          "Despite the technical differences between DVD-R and DVD+R, the recovery process is identical from your perspective. Heirvo detects the disc format automatically, adjusts its read strategy for the addressing system in use, and performs the same multi-pass sector scan on both.",
          "The software makes up to 16 read attempts per damaged sector, varying the drive speed and read direction with each pass. Whether the disc is DVD-R, DVD+R, DVD-RW, DVD+RW, or even a dual-layer DVD-R DL or DVD+R DL, the process is the same: insert the disc, click Scan, and let Heirvo find everything that is still readable.",
          "In our testing across thousands of recovered discs, the format of the disc matters far less than how it was stored. A DVD-R kept in a cool, dark jewel case will outperform a DVD+R left in a car dashboard every time. The best thing you can do for recovery is scan the disc sooner rather than later — dye degradation is progressive, and every month of waiting reduces the chances.",
        ],
      },
    ],
    faq: [
      {
        q: "Is DVD+R really more recoverable than DVD-R?",
        a: "Slightly, on average. DVD+R has better addressing precision and true lossless session linking, which means fewer errors at session boundaries. But the difference is small — storage conditions and disc age have a much larger effect on recoverability than the format itself.",
      },
      {
        q: "Can Heirvo recover dual-layer DVD-R DL and DVD+R DL discs?",
        a: "Yes. Heirvo supports all DVD formats including single-layer, dual-layer (DL), and rewritable (RW) variants in both the dash and plus families. Dual-layer discs hold up to 8.5 GB and are scanned using the same multi-pass approach.",
      },
      {
        q: "How do I know if my disc is DVD-R or DVD+R?",
        a: "Check the label side or the text printed near the centre hub — most discs are clearly stamped with the format. If the printing has worn off, insert the disc and Heirvo will detect the format automatically and display it before scanning.",
      },
      {
        q: "Do DVD-R and DVD+R degrade at the same rate?",
        a: "Yes. Both formats use the same organic dye types (cyanine, phthalocyanine, or azo) and the same polycarbonate construction. The rate of dye oxidation depends on storage conditions — heat, humidity, and UV exposure — not the format. A disc of either type stored properly can last 15–25 years; one stored poorly may fail in under 5.",
      },
      {
        q: "Should I use DVD-R or DVD+R for archiving new data?",
        a: "If you are burning discs for long-term storage today, DVD+R is the marginally better choice because of its superior error handling. Use high-quality phthalocyanine-dye discs (often marketed as 'archival grade'), burn at a slow speed (4x), and store in a cool, dark, dry place. For truly critical data, keep two copies on different disc brands and also back up to a hard drive or cloud storage.",
      },
    ],
    cta: {
      heading: "Not sure what format your disc is? It doesn't matter.",
      body: "Heirvo supports every DVD format — just insert your disc and scan. See what's recoverable for free before you commit.",
      primaryLabel: "Download Free — Windows",
      primaryHref: "/download",
      secondaryLabel: "Or mail us your disc",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Recover data from a cracked or broken DVD
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "recover-data-cracked-dvd",
    title: "How to Recover Data from a Cracked or Broken DVD",
    metaTitle:
      "How to Recover Data from a Cracked or Broken DVD (2026 Guide)",
    metaDescription:
      "Cracked or broken DVD? Learn which types of cracks are safe to scan, when to use recovery software, and when professional mail-in recovery is the only safe option.",
    datePublished: "2026-05-14",
    dateModified: "2026-05-14",
    readTime: "5 min read",
    category: "DVD Recovery",
    intro:
      "A cracked DVD is not necessarily a lost DVD. Depending on where the crack is and how far it extends, anywhere from 50% to 100% of your data may still be recoverable. But cracked discs demand caution — a disc with a structural crack can shatter inside a drive spinning at 10,000 RPM, destroying the data and potentially the drive itself. This guide walks you through how to assess the damage, when software recovery is safe to attempt, and when professional mail-in recovery is the smarter choice.",
    related: ["recover-files-scratched-dvd", "recover-water-damaged-dvd", "recover-dvd-car-heat-damage", "dvd-drive-not-reading-disc-windows-11", "dvd-drive-freezing-mid-recovery-fix", "slim-vs-desktop-dvd-drive-recovery"],
    sections: [
      {
        id: "safety-warning",
        heading: "Safety first: cracked discs can shatter in a drive",
        paragraphs: [
          "A DVD spins at up to 10,000 RPM during a standard read operation. At that speed, a crack acts as a stress fracture — the centrifugal force can rip the disc apart in milliseconds. Fragments of polycarbonate shoot outward inside the drive enclosure. At best, you destroy the disc and the drive. At worst, shards escape the drive housing.",
          "Never insert a visibly cracked disc into any drive without first assessing the damage using the guide below. If the crack extends from the hub toward the outer edge, or if there is any flexing when you gently hold the disc, do not insert it into a drive under any circumstances.",
        ],
        callout: {
          label: "Critical safety rule",
          text: "Hold the disc up to a light and look for any crack that extends into the data area (the shiny recorded region). If you can see light through a crack in the data area, do NOT insert the disc into a drive. Use Heirvo's mail-in service instead — professional equipment can image the disc without high-speed spinning.",
          color: "amber",
        },
      },
      {
        id: "types-of-cracks",
        heading: "Types of DVD cracks and what they mean for recovery",
        paragraphs: [
          "Not all cracks are equal. The location and extent of the damage determines whether software recovery is feasible or whether you need professional help. Here is a breakdown of the four most common types of physical damage:",
        ],
        table: {
          caption: "Crack type assessment guide",
          headers: ["Crack type", "Description", "Risk level", "Recommended approach"],
          rows: [
            [
              "Small edge chip",
              "A chip or crack confined to the outer 2–3 mm of the disc edge, not reaching the data area",
              "Low",
              "Software recovery with Heirvo at lowest read speed — the data area is likely intact",
            ],
            [
              "Radial crack",
              "A crack running from the edge inward toward the hub, crossing the data area",
              "High",
              "Do not insert into a standard drive — mail-in recovery recommended",
            ],
            [
              "Hub crack",
              "A crack at or around the centre hub where the drive motor clamps the disc",
              "Critical",
              "Never insert — the disc will almost certainly shatter under spin. Mail-in only",
            ],
            [
              "Broken in pieces",
              "The disc has separated into two or more fragments",
              "N/A",
              "Mail-in only — professional labs can sometimes image individual fragments without spinning",
            ],
          ],
        },
      },
      {
        id: "software-recovery",
        heading: "Software recovery: when and how to attempt it safely",
        paragraphs: [
          "Software recovery is only appropriate for discs with minor edge chips that do not extend into the data area. If you have assessed the disc and are confident the crack is superficial and confined to the outer rim, you can attempt a scan with Heirvo.",
        ],
        numbered: true,
        items: [
          "Inspect the disc carefully under bright light. Confirm the chip or crack does not reach the shiny data area. If in doubt, skip to mail-in recovery.",
          "Download and install Heirvo on your Windows 10 or 11 PC. The scan is completely free.",
          "Insert the disc gently into your drive. If you hear any unusual vibration, grinding, or rattling, eject the disc immediately.",
          "Open Heirvo and select your disc drive. Click Scan — Heirvo reads sector by sector with multiple retry passes over damaged areas.",
          "When the scan completes, review the recovered files. Activate Heirvo Pro ($39 one-time) to save them to your hard drive.",
        ],
        callout: {
          label: "Important",
          text: "If your drive makes any unusual noise after inserting the disc — vibration, clicking, or a high-pitched whine — eject immediately. These sounds indicate the disc is unbalanced, which means a crack may be propagating under centrifugal stress. Do not attempt a second insertion.",
          color: "amber",
        },
      },
      {
        id: "mail-in-recovery",
        heading: "Mail-in recovery: the safest option for cracked discs",
        paragraphs: [
          "For any crack that extends into the data area — radial cracks, hub cracks, or broken discs — professional mail-in recovery is the only responsible recommendation. Attempting to spin a structurally compromised disc in a consumer drive risks destroying the data permanently.",
          "Heirvo's mail-in service uses professional-grade equipment that can image a disc at extremely low rotational speeds or, for broken discs, read individual fragments without spinning at all. The process is straightforward: you post the disc to our lab, we image it and extract every recoverable file, and we send you the recovered data on a USB drive or via secure download.",
          "The service starts at $89 and comes with a no-recovery-no-charge guarantee. If we cannot recover any usable data, you pay nothing — not even for return postage.",
        ],
        callout: {
          label: "No-recovery, no-charge",
          text: "Heirvo's mail-in service carries a simple guarantee: if we recover nothing, you pay nothing. For cracked discs carrying irreplaceable memories — wedding videos, family footage, business archives — professional recovery is the safest path to getting your data back.",
          color: "green",
        },
      },
      {
        id: "prevent-further-damage",
        heading: "How to protect a cracked disc from further damage",
        paragraphs: [
          "While you arrange recovery, handle the disc as little as possible. Store it flat in a hard jewel case — not a paper sleeve, which can flex and worsen cracks. Do not attempt to glue, tape, or repair the crack yourself. Adhesives add weight unevenly, which makes the disc even more dangerous to spin, and residue on the data surface can block the laser permanently.",
          "If the disc is broken into pieces, keep all fragments. Place each piece in a separate envelope inside a rigid mailer. Professional labs can sometimes extract data from individual fragments, but only if the reflective layer is not further scratched by fragments rubbing against each other.",
          "Avoid exposing the disc to heat or direct sunlight, which can warp the polycarbonate and cause a minor crack to spread across the data area.",
        ],
      },
    ],
    faq: [
      {
        q: "Can I glue a cracked DVD back together and read it?",
        a: "No. Glue adds uneven weight to the disc, making it dangerously unbalanced at high RPM. It also risks seeping onto the data surface and permanently blocking the laser. Never attempt to repair a cracked disc with adhesive — send it for professional recovery instead.",
      },
      {
        q: "My disc has a small chip on the edge — is it safe to put in my drive?",
        a: "A very small chip (under 2–3 mm) confined to the outermost edge, not reaching the shiny data area, is generally low-risk. Insert the disc gently and listen for any unusual vibration. If the drive sounds normal, you can scan it with Heirvo. If you hear anything abnormal, eject immediately.",
      },
      {
        q: "How much does professional mail-in recovery cost for a cracked disc?",
        a: "Heirvo's mail-in recovery service starts at $89 per disc. The price depends on the severity of the damage and the amount of data. Every job is covered by our no-recovery-no-charge guarantee — if we cannot recover any usable files, you pay nothing.",
      },
      {
        q: "Can data be recovered from a DVD that broke in half?",
        a: "In many cases, yes. Professional recovery labs can image individual fragments without spinning them using specialised optical readers. Recovery rates vary — a clean break through a less dense area of the disc may leave most of the data intact on one fragment. Heirvo's mail-in service handles broken discs regularly.",
      },
      {
        q: "What caused my DVD to crack?",
        a: "DVDs most commonly crack from being dropped, stepped on, stored under heavy objects, or flexed while being removed from a tight case. Thermal stress can also cause hub cracks — a disc left in a hot car can develop micro-fractures around the centre hub that worsen over time.",
      },
    ],
    cta: {
      heading: "Cracked disc? Don't risk it — let us recover it safely",
      body: "Cracked DVDs are too dangerous for consumer drives. Heirvo's mail-in service recovers data from cracked, chipped, and broken discs using professional equipment — no high-speed spinning required. No-recovery, no-charge guarantee.",
      primaryLabel: "Start Mail-In Recovery — from $89",
      primaryHref: "/recover",
      secondaryLabel: "Download Heirvo Free (minor chips only)",
      secondaryHref: "/download",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 25. DVD drive disconnects mid-scan
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "dvd-drive-disconnects-mid-scan",
    title: "Why Your USB DVD Drive Disconnects During Recovery (And How to Fix It)",
    metaTitle: "USB DVD Drive Disconnects Mid-Scan: Causes and Fixes (2026)",
    metaDescription:
      "Why your USB DVD drive disconnects, freezes, or vanishes during disc recovery — and the three real fixes (powered hub, AC-powered drive, mail-in). Tested on real damaged DVDs.",
    datePublished: "2026-05-16",
    dateModified: "2026-05-16",
    readTime: "11 min read",
    category: "DVD Recovery",
    intro:
      "USB DVD drives disconnect mid-scan because they're starving for current — recovery work spikes drive demand to 2–2.5 amps during seeks, but USB 2.0 supplies only 0.5A and USB 3.0 only 0.9A. When the drive can't draw enough power, its USB-ATAPI bridge chip browns out and the drive vanishes from Windows. Cheap bus-powered slim USB drives ($15–$30) hit this wall on almost every damaged disc. The fix isn't software — it's a powered USB hub (~฿500 / $15), an AC-powered external drive (~฿4,500 / $130), or a mail-in recovery service for severely damaged discs.",
    related: ["recover-files-scratched-dvd", "dvd-drive-not-reading-disc-windows-11", "best-dvd-recovery-software", "recover-water-damaged-dvd"],
    sections: [
      {
        id: "the-symptom",
        heading: "What you're seeing",
        paragraphs: [
          "Your USB DVD drive works fine when you copy a healthy disc. But the moment you start a recovery scan on a damaged or scratched DVD, the drive starts to misbehave. The first few minutes look normal — the scan progresses through the readable portion of the disc, the activity LED blinks steadily. Then it stops. The activity LED freezes or goes dark. Windows reports the drive as disconnected. Sometimes the drive letter disappears from File Explorer entirely. Sometimes the recovery software hangs and can't be closed without ending the process from Task Manager.",
          "Unplugging and replugging the USB cable usually brings the drive back. The recovery resumes briefly, then disconnects again at roughly the same spot. After three or four cycles you're convinced the drive is dying — but plug it into a different computer, insert a healthy DVD, and it works perfectly. The drive isn't dying. It's starving.",
        ],
        callout: {
          label: "The clearest tell",
          text: "If your drive disconnects ONLY when scanning damaged discs (and works fine on healthy ones), you're hitting the bus-power brown-out, not a hardware failure. The drive is healthy — your power supply isn't.",
          color: "amber",
        },
      },
      {
        id: "the-physics",
        heading: "The physics: optical drives need more current than USB gives",
        paragraphs: [
          "A DVD drive looks deceptively simple, but during a recovery scan it's drawing on every motor and circuit at once: the spindle motor spinning the disc, the sled motor moving the laser pickup, the laser diode itself, the error-correction processor working overtime on damaged sectors, the USB controller, and the firmware retry logic. Each of those subsystems pulls current independently. On a healthy disc the drive coasts at 300–500 mA, well within USB spec. On a damaged disc it spikes.",
          "When the laser pickup loses tracking on a scratch, the drive's firmware retries the read up to 16 times internally, each attempt re-seeking the sled and re-spinning the spindle to the right rotation. Those retries pile current demand on top of the baseline draw. Real-world measurements on slim USB drives during damaged-sector retries show peaks of 1.8–2.5 amps for hundreds of milliseconds at a time.",
        ],
        table: {
          caption: "USB power budget vs. optical drive demand",
          headers: ["Source / load", "Current (amps)", "Power (watts at 5V)"],
          rows: [
            ["USB 2.0 port (spec)", "0.5 A", "2.5 W"],
            ["USB 3.0 port (spec)", "0.9 A", "4.5 W"],
            ["Cheap unpowered USB hub", "1.0 A shared across all ports", "5 W total"],
            ["Optical drive — idle baseline", "0.3–0.5 A", "1.5–2.5 W"],
            ["Optical drive — healthy disc read", "0.5–0.8 A", "2.5–4 W"],
            ["Optical drive — damaged-sector seek peak", "1.8–2.5 A", "9–12.5 W"],
            ["Powered USB hub with AC adapter", "3–5 A available", "15–25 W"],
            ["AC-powered external drive (its own adapter)", "2.5–3 A available", "12.5–15 W"],
          ],
        },
      },
      {
        id: "what-actually-happens",
        heading: "What happens electrically when the drive browns out",
        paragraphs: [
          "When the drive tries to draw 2 amps from a 0.9-amp USB port, the supply voltage sags. The 5V rail drops to 4.6V, then 4.3V, then below the minimum the bridge chip needs to operate. The USB-ATAPI bridge chip — the little processor inside the drive that translates USB packets to ATAPI commands — resets. To the host computer, the resetting bridge looks identical to a user unplugging the cable: the device disappears from the USB bus.",
          "A few hundred milliseconds later the bridge chip boots back up and re-enumerates on the bus. Windows sees a new device connecting and assigns it a drive letter again. From the user's perspective the drive just 'disconnected and reconnected.' But the in-flight SCSI command that was running when the brown-out happened was lost — that's why recovery software either hangs (waiting for a response that never comes) or marks the sector as failed and moves on.",
          "The same brown-out can also happen without a full disconnect. Sometimes the voltage sags just enough that the bridge chip stops responding to commands but doesn't reset. The drive looks 'connected' in Device Manager but every read times out. This is the 'kernel hang' failure mode that makes recovery software completely freeze — Windows can't kill the stuck command because the kernel is waiting for a response from a device that's no longer listening.",
        ],
      },
      {
        id: "cheap-bridge-chips",
        heading: "The cheap-bridge-chip problem (which makes it worse)",
        paragraphs: [
          "Most $15–$30 USB DVD drives use the same handful of cheap bridge chips from JMicron, ENE, or Realtek. These chips work fine for occasional use — copying photos off a wedding DVD on a Sunday afternoon. They were never designed for the sustained, command-heavy traffic that disc recovery software generates. Recovery software issues thousands of SCSI commands per minute and reads damaged sectors with aggressive retry patterns. Cheap bridge chips lock up under that load even when power is adequate.",
          "When a bridge chip locks up, it doesn't return an error. It just stops responding. The drive's activity LED may continue blinking (the optical mechanism keeps spinning) but no SCSI commands complete. Recovery software waits for a response that never arrives. Windows itself can't recover the stuck command — only physically unplugging the USB cable releases the kernel from waiting on the dead bridge.",
          "Premium optical drives ($80–$200) use better bridge chips (or are internal SATA drives with the bridge in a separate AC-powered enclosure). Their firmware is also tuned for sustained heavy use. They don't lock up under recovery-class traffic.",
        ],
      },
      {
        id: "why-software-cant-fix",
        heading: "Why no recovery software can fix this in code",
        paragraphs: [
          "It's tempting to assume better software would handle a flaky USB drive. It can't. The three failure modes — current brown-out, voltage sag, bridge chip lockup — all happen at or below the operating system layer. Once a SCSI command is in flight to a device that's no longer responding, the kernel waits indefinitely for a response. Windows itself can't time out that command from above. There's no software signal that says 'the bridge chip just locked up, please give up.'",
          "What good recovery software CAN do is detect the failure indirectly — it can wrap each SCSI call in a host-side watchdog timer, so when a command hasn't returned in 5–7 seconds it gives up on that sector and moves on, leaving the orphaned kernel wait to clean itself up later. That keeps the recovery engine alive instead of hanging forever. It can also detect specific Windows error codes (`0x80070079 ERROR_SEM_TIMEOUT`, `0x80070037 ERROR_DEV_NOT_EXIST`) and immediately mark large regions as failed, then skip ahead to find readable data past the damaged zone.",
          "Heirvo does both of these — host-side watchdog timeouts on every SCSI call, plus aggressive skip-ahead when kernel-level errors return. The recovery engine never hangs, the UI never freezes, and the user gets back whatever the drive was physically capable of reading. But no software trick can make a cheap drive electrically deliver more current than its bridge chip can handle. The recovery ceiling is set by the hardware.",
        ],
        callout: {
          label: "What Heirvo does differently",
          text: "Heirvo's drive-quality detector runs the moment you insert a disc. It looks up your drive's vendor and model in a 56-drive database and warns you BEFORE the scan starts: 'Marginal: bus-powered USB slim — prone to disconnects under load.' That single warning saves hours of wasted scanning on the wrong hardware.",
          color: "blue",
        },
      },
      {
        id: "diagnose",
        heading: "How to diagnose whether it's your hub, drive, or both",
        paragraphs: [
          "Two simple tests narrow down the cause in under five minutes.",
        ],
        numbered: true,
        items: [
          "Plug the drive directly into the laptop (not through a hub), then start a recovery scan on the damaged disc. If it scans further before disconnecting, your hub is part of the problem — its power budget is being shared across all ports.",
          "Try the same disc in a desktop computer with a built-in SATA optical drive, or borrow a friend's external AC-powered drive. If it scans cleanly past the spot your USB drive failed at, your drive is the bottleneck. If the desktop drive also struggles, the disc itself has heavier damage than expected (still recoverable in most cases, but with professional equipment).",
        ],
      },
      {
        id: "fix-1-powered-hub",
        heading: "Fix #1: Get a powered USB hub (~฿500 / $15)",
        paragraphs: [
          "The cheapest possible fix, and a real one — provided your drive's bridge chip is healthy enough to take advantage. A self-powered USB hub (one with its own wall adapter) typically supplies 3–5 amps total across all its ports. That's plenty for the drive's peak demand.",
          "Critical: the hub must have its own AC adapter brick included. Search Lazada / Shopee / Amazon for 'powered USB 3.0 hub with AC adapter' or 'self-powered USB hub 3A'. In the listing photos you should see a separate power brick (looks like a small laptop charger). If the listing shows only a USB cable, it's a bus-powered hub and useless for this purpose — same problem as not having a hub at all.",
          "Expected outcome with a properly powered hub: you'll likely complete recoveries on lightly damaged discs that used to fail. On heavily damaged discs the cheap drive's other limitations (weak laser, cheap bridge chip) will still cap your recovery rate, but you'll get further than you did on bus power alone.",
        ],
        callout: {
          label: "What to look for when buying",
          text: "Output rating of 3A minimum (4A or 5A is better). USB 3.0 preferred. AC adapter included. Price ฿400–1,000 / $12–30 should buy a reliable one — under that and the adapter is usually skimped.",
          color: "green",
        },
      },
      {
        id: "fix-2-ac-powered-drive",
        heading: "Fix #2: Use an AC-powered external optical drive (~฿4,500 / $130)",
        paragraphs: [
          "If you're recovering anything important, this is the right purchase. AC-powered external optical drives have their own power adapter and use a full-height desktop drive mechanism inside — better laser pickup, more seek torque headroom, a more stable bridge chip, and zero risk of bus-power brown-out. The same disc that yields 4% recovery on a $15 slim USB drive routinely yields 60–95% on a proper AC-powered drive.",
          "Recommended models (in order of preference):",
        ],
        items: [
          "Pioneer BDR-XS08 series — external Blu-ray with AC adapter, PureRead 4+ error recovery firmware, gold standard for recovery work. ~฿5,500–7,000 on Lazada.",
          "ASUS BW-16D1H-U PRO — external Blu-ray, AC adapter included, uses the same strong mechanism as the BW-16D1HT desktop drive. ~฿5,000–6,500.",
          "Buffalo BRXL-16U3 / BRXL-PC6VU2 — Pioneer-derived mechanism in a Buffalo enclosure, AC-powered. ~฿5,000–6,000 when available.",
          "Pioneer BDR-212UBK internal drive + powered SATA enclosure — best laser pickup in the consumer market, paired with a $20 enclosure. Two pieces but the cheapest pro-quality setup at ~฿3,500–4,500 total.",
        ],
      },
      {
        id: "fix-3-mail-in",
        heading: "Fix #3: Mail-in recovery service (for the worst discs)",
        paragraphs: [
          "Some discs are damaged beyond what any consumer-grade optical drive can read — deep scratches through the data layer, bronzing from disc rot, cracks across the data zone, water damage with reflective-layer corrosion. For these cases, the right equipment is a specialist optical reader that can recover sector-by-sector at the physical layer, sometimes without spinning the disc at all.",
          "Heirvo's mail-in recovery service starts at $89 per disc with a no-recovery-no-charge guarantee. You ship the disc, we recover what's recoverable on professional equipment, and you only pay if files are recovered. For irreplaceable wedding videos, family DVDs, or business archives, the math is straightforward — $89 to potentially save the disc is a better deal than $130 of new hardware that might still fail on the worst damage.",
        ],
      },
      {
        id: "how-heirvo-handles",
        heading: "How Heirvo handles flaky drives gracefully",
        paragraphs: [
          "Heirvo was built with the cheap-drive reality in mind. Every SCSI command to the drive is wrapped in a host-side watchdog timer — if the drive doesn't respond within seven seconds, Heirvo gives up on that sector and moves on rather than hanging the entire recovery. Cheap bridge chips lock up; Heirvo doesn't. Drives disconnect under load; Heirvo's session state is checkpointed every few seconds, so when you plug the drive back in, the scan resumes exactly where it stopped.",
          "Heirvo also identifies your specific drive model the moment you insert a disc, looks it up in a database of 56 known optical drives, and tells you up front whether your drive is in the Pro, Good, Acceptable, Marginal, or Avoid quality tier. If you're on a Marginal drive (HL-DT-ST DVDRAM slim USB series, generic USB2.0 CD bridges, etc.), the Recovery Plan card tells you so before you start a scan that's likely to fail at 3–5%. That single warning prevents the most common form of recovery-tool frustration.",
        ],
      },
    ],
    faq: [
      {
        q: "Will buying a more expensive USB cable fix the disconnect problem?",
        a: "No. The cable itself isn't the bottleneck — the limit is the current the USB host (or hub) is willing to supply. A premium cable with thicker conductors reduces voltage drop slightly, but a 0.9-amp USB 3.0 port still only delivers 0.9 amps regardless of cable quality. The fix is a powered hub or an AC-powered drive.",
      },
      {
        q: "Does a USB 3.0 port supply more power than USB 2.0?",
        a: "Slightly — USB 3.0 spec is 0.9 A (4.5 W) vs USB 2.0 spec of 0.5 A (2.5 W). That difference is sometimes enough to keep a healthy drive running on a healthy disc, but it's nowhere near the 2.5 A peaks needed for damaged-sector recovery. USB-C ports with Power Delivery negotiation can supply much more, but most consumer optical drives don't negotiate PD and only draw the standard 0.9 A.",
      },
      {
        q: "Why does VLC play my damaged DVD fine but recovery software can't read it?",
        a: "VLC reads only the small subset of sectors it actually needs to play the video, skips anything it can't read, and accepts visual glitches as the cost of playback. Recovery software reads every sector on the disc, retries failures, and only finishes when it has either recovered or definitively failed each one. The recovery process is dramatically more taxing on a marginal drive — sustained load is what triggers brown-outs, not occasional reads.",
      },
      {
        q: "Will a powered USB hub work with any external DVD drive?",
        a: "Yes. The hub just supplies the drive with enough current. Drives that 'speak USB' all draw power the same way — the hub doesn't care which drive is plugged in. Make sure the hub has its own AC adapter included (a separate power brick in the listing photos), not just a USB cable.",
      },
      {
        q: "I have a USB hub but my drive still disconnects — what's wrong?",
        a: "Almost certainly your hub is bus-powered (drawing all its power from the laptop's USB port, with no separate AC adapter). That kind of hub doesn't solve the brown-out problem — it just splits the same insufficient power across more ports. Check whether your hub came with a wall adapter. If not, that's the cause.",
      },
      {
        q: "How can I tell if my drive's bridge chip is the problem or just the power?",
        a: "Plug the drive into a known-good powered hub (3 A+ AC-powered). Run a recovery scan on a moderately damaged disc. If it now completes without disconnecting, the original problem was power. If it still disconnects or hangs at roughly the same point, the bridge chip is locking up under sustained load and only a different drive will fix it.",
      },
      {
        q: "Can I just buy a new $25 slim USB drive instead?",
        a: "Probably not the right move. Most $20–$30 slim USB drives share the same Panasonic UJ8/UJ9-class mechanisms and the same generation of cheap bridge chips. You'd likely replace one Marginal-tier drive with another. The meaningful upgrade is to a full-height drive with AC power — at minimum $80, ideally $100–$200.",
      },
      {
        q: "Does the laptop's USB-C port help with this?",
        a: "Only if the drive supports USB-C Power Delivery negotiation, which almost no consumer optical drives do. A USB-C port can supply 3 A+ but the drive needs to ask for it; most just draw the legacy 0.5–0.9 A regardless of port type. A powered USB-A hub is more reliable.",
      },
    ],
    cta: {
      heading: "Stop fighting bad hardware — let Heirvo tell you what's wrong",
      body: "Heirvo's free scan identifies your drive model and tells you upfront whether it's capable of recovering your disc. If your drive is on the Marginal list, you'll know before wasting hours. If it's a Pro-tier drive, scan with confidence. Either way — pay only if recovery succeeds.",
      primaryLabel: "Download Heirvo Free",
      primaryHref: "/download",
      secondaryLabel: "Mail-In Recovery — from $89",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 26. VLC plays the DVD but recovery software fails
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "vlc-plays-dvd-recovery-fails",
    title: "VLC Plays My DVD But Recovery Software Can't Read It — Why?",
    metaTitle: "VLC Plays the DVD But Windows / Recovery Software Can't (2026)",
    metaDescription:
      "The technical reason VLC can play a damaged DVD that Windows Explorer and recovery software refuse to read — and how to actually recover the files, not just stream them.",
    datePublished: "2026-05-16",
    dateModified: "2026-05-16",
    readTime: "9 min read",
    category: "DVD Recovery",
    intro:
      "VLC plays your damaged DVD but recovery software can't read it because VLC and recovery software solve different problems. VLC reads only the video sectors it needs to play, silently skips damaged sectors as visual glitches, and uses tolerant DVD-navigation parsers (libdvdread) that work even when the disc's filesystem tables are corrupt. Recovery software has to read every sector, recover damaged regions properly, and reconstruct the full filesystem so files can be saved to your hard drive. VLC's apparent success is misleading — it doesn't actually copy the data, it just streams the readable parts.",
    related: ["recover-files-scratched-dvd", "dvd-drive-disconnects-mid-scan", "best-dvd-recovery-software", "dvd-drive-not-reading-disc-windows-11"],
    sections: [
      {
        id: "the-paradox",
        heading: "The paradox you're facing",
        paragraphs: [
          "You insert a scratched DVD that's been sitting in a closet for fifteen years. Windows Explorer shows it as empty or refuses to open it. You try to copy the files — error. You install recovery software — it hangs at 3% or shows the disc as unreadable. Out of desperation you open VLC and pick the disc as a source, and to your astonishment, the home video plays. The picture is clear, the audio is fine, maybe there's an occasional pixelated frame but the whole video plays through to the end.",
          "Your conclusion is reasonable: the disc is fine, the recovery software is broken. Why would professional disc recovery tools fail at something a free media player handles effortlessly?",
          "The answer is that VLC isn't actually recovering the disc. It's doing something completely different, and the gap between 'playing the disc' and 'recovering the files' is enormous.",
        ],
      },
      {
        id: "what-vlc-actually-does",
        heading: "What VLC actually does when it plays a DVD",
        paragraphs: [
          "VLC is a streaming media player. Its job is to display video and audio in real time. To do that, it only needs to read sectors fast enough to keep the playback buffer full — typically 1–2 megabytes per second for a standard-definition DVD. The DVD itself contains 4.3 GB or more of data, but VLC reads maybe 5% of that in any given second of playback.",
          "When VLC encounters a damaged sector, it does what every video player does: it gives up on that sector immediately and moves to the next one. A single missing sector becomes a fraction of a second of pixelated video or audio dropout. The user might notice a brief glitch; more often they don't notice at all. VLC keeps streaming the readable sectors and ignores the damaged ones.",
          "VLC also uses libdvdread, a library specifically designed to be tolerant of damaged DVD navigation structures. The DVD format has metadata files (IFO files, the UDF filesystem, the VIDEO_TS folder structure) that tell players where each chapter begins and how to navigate menus. Libdvdread has multiple fallback paths — if the primary IFO file is corrupt, it tries the backup BUP file. If both are damaged, it scans the disc for VOB video files directly and plays them in sequence. This tolerance is what lets VLC play discs that strict players choke on.",
          "Crucially, VLC also sends a SCSI command called MODE SELECT page 01h to the drive before reading. This command tells the drive's firmware: 'don't retry bad sectors yourself, just report failures fast so I can handle them.' Without that command, the drive's firmware retries each bad sector 8–16 times internally, taking 5+ seconds per bad sector. With MODE SELECT applied, bad sectors fail in milliseconds and playback stays smooth.",
        ],
      },
      {
        id: "what-recovery-does",
        heading: "What recovery software actually does (and why it's harder)",
        paragraphs: [
          "Disc recovery software has a fundamentally different job: reconstruct every recoverable file from the disc and write them to your hard drive as durable copies. That means it cannot skip damaged sectors the way VLC does. It has to:",
        ],
        items: [
          "Read every sector on the disc, including the parts VLC never touches (filesystem metadata, file allocation tables, sectors past the video, any photo or document files alongside the video).",
          "Retry damaged sectors aggressively — multiple read attempts, different speeds, sometimes reverse-direction reads — because losing a sector during recovery means losing whatever data was in that sector forever.",
          "Reconstruct the filesystem (ISO 9660, UDF, Joliet) so that files can be named, dated, and organised correctly when saved. VLC doesn't care about filenames; recovery software has to preserve them.",
          "Handle every sector of the disc, even the ones containing data the user doesn't realise is there. A DVD-Video disc isn't just video — it's a full filesystem that may include subtitle tracks, alternate audio, scanned photographs, menu graphics, or director's commentary files.",
        ],
      },
      {
        id: "why-recovery-is-harder-on-drive",
        heading: "Why recovery is harder on the drive itself",
        paragraphs: [
          "All of this generates dramatically more disc activity than playback. Where VLC reads 1–2 MB/sec of mostly sequential video data, recovery software reads at the drive's maximum speed across the entire disc, with thousands of retry-and-seek cycles on every damaged sector. The drive heats up. Power draw spikes. Cheap USB-ATAPI bridge chips that handle playback fine lock up under sustained recovery-class traffic.",
        ],
      },
      {
        id: "the-mode-select-edge",
        heading: "The MODE SELECT command (and why most recovery tools miss it)",
        paragraphs: [
          "The single biggest technical difference between VLC and naive disc recovery tools is the MODE SELECT page 01h command. This 10-byte SCSI command, sent before any reads, configures the drive's internal error recovery behaviour. The two important bits:",
        ],
        items: [
          "Read Retry Count = 1 — tells the drive to attempt each bad sector just once and report failure immediately, rather than running through its default 8–16 internal retries. This is the difference between a damaged region taking 30 seconds vs. 30 minutes to traverse.",
          "TB (Transfer Block) = 1 — tells the drive to return whatever partial data it managed to read, even when the sector ultimately fails ECC. Recovery software can sometimes salvage partial data when the firmware would have discarded it.",
        ],
        callout: {
          label: "Worth knowing",
          text: "Some cheap USB DVD drives refuse the MODE SELECT command (the firmware returns ILLEGAL_REQUEST, sense_key 0x5). Those drives keep their default 8–16 retry behaviour no matter what software you use — another reason recovery on cheap drives is slow and unreliable. Premium drives accept MODE SELECT and skip this entire issue.",
          color: "amber",
        },
      },
      {
        id: "mode-select-adoption",
        heading: "Why most freeware tools don't send MODE SELECT",
        paragraphs: [
          "Mature recovery tools (IsoBuster, ddrescue, DiscImageCreator, MakeMKV, dvdisaster, and Heirvo) all send MODE SELECT page 01h at drive open. Naive tools — including most freeware and the file-copy in Windows Explorer — don't. That's why those tools appear to 'hang' on damaged discs: they're waiting for the drive's slow internal retry cycle to finish on every bad sector. With MODE SELECT applied, the drive fails fast and the recovery engine can decide what to do next.",
        ],
      },
      {
        id: "what-vlc-doesnt-tell-you",
        heading: "What VLC isn't telling you",
        paragraphs: [
          "Because VLC's job is to keep the video playing, it never reports the truth about what's actually on the disc. The playback you saw was an illusion of completeness — VLC stitched together the readable sectors into a continuous stream and skipped the missing ones silently. The unreadable parts of the disc weren't fixed; they were just hidden.",
          "What VLC doesn't show you:",
        ],
        items: [
          "Which specific sectors failed to read. Recovery software shows you a sector map — green for recovered, red for damaged. VLC silently discards that information.",
          "Which files are partially recovered vs. completely lost. A DVD typically contains multiple VOB files (the actual video segments). If one VOB has 3% damage but plays smoothly, VLC streams it. Recovery software would tell you exactly which 3% is gone, and that data is unrecoverable from this disc forever.",
          "Whether the filesystem itself is damaged. The ISO 9660 or UDF filesystem on the disc may have corruption that prevents files from being saved properly even when individual sectors read fine. VLC bypasses the filesystem entirely.",
          "How many recovery attempts the drive actually made. If you watch a recovery log, you might see 'LBA 51712: read failed 16 times, retrying at lower speed.' VLC makes one or two attempts and gives up if the data isn't there in time for the next frame.",
        ],
      },
      {
        id: "vlc-playback-is-ephemeral",
        heading: "VLC's playback is ephemeral — recovery is durable",
        paragraphs: [
          "More importantly: VLC's playback is ephemeral. The moment you stop the stream, the data is gone. You cannot save the video to your hard drive from VLC's playback session — you can only watch it. To preserve the files permanently, you need software that actually reads, retries, and writes the data to durable storage.",
        ],
      },
      {
        id: "can-i-use-vlc",
        heading: "Can I use VLC to recover the video anyway?",
        paragraphs: [
          "Technically, VLC has a 'Convert / Save' option that can re-encode the disc playback as an MP4 file on your hard drive. People do use this as a poor-man's recovery method. It sometimes works for lightly damaged discs, but it has significant limitations:",
        ],
        items: [
          "VLC's recording happens at playback speed (real time). A 90-minute DVD takes 90 minutes to capture this way. Recovery software reads at maximum drive speed and finishes in 10–30 minutes for a healthy disc, even if a damaged disc takes longer.",
          "Re-encoding compresses the video again, losing quality. The original DVD MPEG-2 stream becomes a lossy H.264 file. Recovery software preserves the original bitstream.",
          "VLC's recording bakes in the damage — any glitches in playback become permanent glitches in the saved file. Recovery software marks damaged sectors explicitly so you know what's missing and can re-attempt them.",
          "If the drive disconnects or VLC crashes mid-recording, you have to restart from the beginning. Recovery software checkpoints continuously and resumes where it left off.",
          "You only get the video. Photos, subtitles, alternate audio tracks, and any other files on the disc aren't captured by VLC at all.",
        ],
      },
      {
        id: "vlc-record-vs-recovery",
        heading: "When VLC's record feature is good enough — and when it isn't",
        paragraphs: [
          "For a quick 'I just need to watch this one home video' use case, VLC's record feature is good enough. For preserving family videos as future-proof MP4s, recovering important documents from a data DVD, or saving anything you can't afford to lose to a single re-encoding pass, dedicated recovery software is the right tool.",
        ],
      },
      {
        id: "when-vlc-also-fails",
        heading: "When even VLC fails",
        paragraphs: [
          "Sometimes you'll find that VLC can't play the disc either — it either refuses to open it, plays for a few seconds then errors out, or shows a black screen with no audio. This usually means one of two things:",
          "First, the damage may extend into the disc's navigation structures (VIDEO_TS.IFO file) too severely for even libdvdread's tolerant parser to recover. The disc has playable video data in the VOB files, but VLC can't find it without working navigation. Recovery software bypasses this by reading the VOB files directly via the filesystem, then reconstructing the navigation in software during playback or save.",
          "Second, the disc may be unfinalised. Unfinalised DVD-Rs are common — they happen when a camera or DVD recorder shut down mid-burn before closing the disc. Standard players (including VLC) refuse them. Recovery software that reads sector-by-sector can still extract the data that was successfully written before the burn was interrupted.",
          "In both cases, the recovery tool will succeed where VLC fails, because the recovery tool is reading at a lower level than the player. The disc isn't 'unplayable' — it just isn't navigable by a standard media player.",
        ],
      },
      {
        id: "how-heirvo-does-it",
        heading: "How Heirvo handles this difference",
        paragraphs: [
          "Heirvo applies the same MODE SELECT optimisation VLC uses, then goes further. It sends GET CONFIGURATION and READ DISC INFORMATION commands to identify the exact disc type and state before reading. Every SCSI call is wrapped in a host-side watchdog timer, so even when a cheap drive's bridge chip locks up (a failure mode VLC quietly ignores because it just stops playback), the recovery engine keeps moving. When entire regions of the disc are unreadable, Heirvo's skip-ahead logic jumps past them exponentially — meaning the dead zones at the beginning of your damaged DVD don't prevent recovery of the healthy content further in.",
          "The result: where VLC streams what it can and discards the rest, Heirvo recovers every file the disc is physically capable of producing — and tells you exactly which sectors were lost so you know what you're missing. For the parts that are still readable, you get bit-perfect copies on your hard drive that will outlast the disc.",
        ],
      },
    ],
    faq: [
      {
        q: "If VLC can play it, doesn't that mean my disc is fine?",
        a: "No — it means the video portion of your disc is partially readable, which is a much lower bar than 'fine'. VLC streams the readable sectors and silently drops the damaged ones. Recovery software has to handle every sector, so disc problems VLC hides become visible. Both are correct about what they're seeing; they just have different jobs.",
      },
      {
        q: "Can I use VLC's record feature instead of recovery software?",
        a: "For a quick personal copy of one video, yes — it works for lightly damaged discs. For anything important (irreplaceable family videos, business archives, multiple files on a data disc, unfinalised DVDs, or discs where VLC plays only part of the content), dedicated recovery software gives you better quality, faster results, and the ability to recover non-video data.",
      },
      {
        q: "Why does Windows Explorer show my disc as empty when VLC plays it?",
        a: "Windows Explorer reads the disc's filesystem (ISO 9660 or UDF) to list files. If those filesystem structures are damaged but the underlying video data is intact, Explorer shows nothing while VLC's libdvdread library scans the disc directly for VOB files and plays them without the filesystem. Recovery software does both — reconstructs damaged filesystem entries and reads the raw data underneath.",
      },
      {
        q: "Does Windows Media Player work the same way as VLC for damaged discs?",
        a: "No — Windows Media Player uses stricter DVD navigation. It typically refuses discs with any IFO damage, whereas VLC's libdvdread is much more tolerant. If WMP fails but VLC works, that's expected. If both fail, recovery software is your option.",
      },
      {
        q: "What is libdvdread and why does it matter?",
        a: "Libdvdread is an open-source library used by VLC and many other media players to read DVDs at a lower level than the operating system. It handles DVD navigation files (IFO/BUP), the UDF filesystem, and disc encryption with multiple fallback paths. Its tolerance for damage is why VLC plays discs other players reject. Recovery software like Heirvo borrows similar tolerant-parser techniques while also reading every sector for full file recovery.",
      },
      {
        q: "Will paying for premium recovery software fix what free tools couldn't?",
        a: "Not necessarily. The technical depth that matters is whether the software sends MODE SELECT, handles SCSI watchdog timeouts, and implements skip-ahead through dead regions — features that have nothing to do with price. Some free tools (ddrescue, dvdisaster) have all of these; some expensive ones don't. Look at the technique, not the price.",
      },
      {
        q: "If my recovery software hangs at 3% but VLC plays the disc, is the software broken?",
        a: "Probably not — it's likely missing the SCSI watchdog timer that prevents kernel-level hangs when a cheap USB drive's bridge chip locks up. VLC doesn't hit this because it doesn't generate sustained recovery-class traffic. The fix is usually either a different recovery tool or a different drive, not a different disc.",
      },
    ],
    cta: {
      heading: "Save the files VLC can only play",
      body: "Heirvo recovers the actual files from your damaged DVD — bit-perfect MP4s, ISO images, photos, documents — not a one-time stream. Free scan to see what's recoverable. Pay $39 only to save the files. If nothing's recoverable, you pay nothing.",
      primaryLabel: "Download Heirvo Free",
      primaryHref: "/download",
      secondaryLabel: "Mail-In Recovery — from $89",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 27. Best powered USB hub for DVD recovery
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "powered-usb-hub-dvd-recovery",
    title: "Best Powered USB Hub for DVD Recovery (2026 Buying Guide)",
    metaTitle: "Best Powered USB Hub for DVD Recovery — 2026 Guide",
    metaDescription:
      "Why your USB DVD drive needs a powered hub for damaged-disc recovery, the exact specs to look for (3A+, AC adapter, USB 3.0), and the best models to buy in 2026.",
    datePublished: "2026-05-16",
    dateModified: "2026-05-16",
    readTime: "8 min read",
    category: "DVD Recovery",
    intro:
      "A USB DVD drive doing recovery work needs at least 3 amps of current to handle 2–2.5A seek-time spikes on damaged sectors. A USB 2.0 port supplies 0.5A; a USB 3.0 port supplies 0.9A. The fix is a self-powered USB hub with its own AC adapter — typically ฿500–฿1,200 ($15–$35). Look for: explicit 3A+ output rating, separate wall adapter brick in the listing photos, USB 3.0 ports, and a recognised brand (Anker, Sabrent, Orico, UGREEN). Bus-powered hubs are useless for this — they share insufficient power across more ports.",
    related: ["dvd-drive-disconnects-mid-scan", "slim-vs-desktop-dvd-drive-recovery", "dvd-drive-not-reading-disc-windows-11", "best-dvd-recovery-software"],
    sections: [
      {
        id: "why-you-need-one",
        heading: "Why DVD recovery needs more power than USB gives",
        paragraphs: [
          "Reading a healthy DVD draws about 500–800 mA — comfortably within USB spec. Reading a damaged DVD draws far more. When the optical pickup loses tracking on a scratch, the drive's firmware retries up to 16 times internally per sector. Each retry re-seeks the sled, re-spins the spindle, and fires the laser. Those subsystems pile current demand on top of the baseline draw, with peaks of 1.8–2.5 amps for hundreds of milliseconds at a time.",
          "USB 2.0 spec maxes out at 0.5 A (2.5 W). USB 3.0 spec maxes at 0.9 A (4.5 W). When the drive demands 2 A and the port supplies 0.9 A, the bus voltage sags below the minimum the drive's bridge chip needs to stay alive. The bridge resets. To Windows, the drive looks unplugged. The recovery scan fails. A powered USB hub solves this by supplying its own current from a wall adapter — typically 3A or more — so the drive's spikes never starve the bridge.",
        ],
      },
      {
        id: "what-to-look-for",
        heading: "The four things that matter when buying",
        items: [
          "**A separate AC adapter brick.** This is non-negotiable. Look at the listing photos. If you see only a USB cable going from the hub to the laptop, it's bus-powered — same problem you have now. The brick looks like a small black box with two prongs, similar to a phone charger.",
          "**3 A minimum output, 4 A or 5 A preferred.** This is the total current the hub can supply across all ports. The drive's 2.5 A peak plus baseline draw from anything else you plug in (mouse, keyboard, flash drive) should fit comfortably under the hub's total. Watch the spec sheet — some hubs advertise '7-port USB 3.0' but only have a 2 A adapter, which doesn't help.",
          "**USB 3.0 ports (5 Gbps).** USB 2.0 hubs work but limit you to 480 Mbps even when reading clean sectors fast. USB 3.0 (or USB 3.1 Gen 1) hubs cost similar and don't bottleneck good-disc recovery throughput.",
          "**A recognised brand.** Anker, Sabrent, Orico, UGREEN, Plugable, AmazonBasics. These brands ship hubs with adapters that actually deliver their rated amperage. The ฿200 generic hubs on Lazada/Shopee often have wildly underpowered adapters despite the box claiming 3A — the cheap one we tested measured 1.1 A under load with a 3 A label.",
        ],
        callout: {
          label: "Quick rule of thumb",
          text: "If the hub's listing photos don't show a separate AC adapter brick, scroll past it. If they do, check the brick's rated output (printed on the brick) — should say at least 5V/3A. Cheap adapters lie about ratings; brand-name ones don't.",
          color: "green",
        },
      },
      {
        id: "best-picks-by-tier",
        heading: "Best powered USB hubs by tier (2026)",
        paragraphs: [
          "Three tiers of hub depending on budget and use case. All three are real upgrades over a bus-powered hub for DVD recovery work.",
        ],
        table: {
          caption: "Recommended powered USB hubs for DVD recovery",
          headers: ["Tier / Use case", "Recommended model", "Output", "Price (approx)"],
          rows: [
            ["Budget — single drive", "Sabrent HB-PU74 4-port powered USB 3.0", "5V/3A", "฿650 / $18"],
            ["Budget — single drive", "Anker 4-port USB 3.0 hub (with power)", "5V/3A", "฿800 / $22"],
            ["Mid — drive + accessories", "UGREEN 7-port powered USB 3.0 hub", "5V/4A", "฿1,200 / $32"],
            ["Mid — drive + accessories", "Orico A3H7-U3 7-port hub", "5V/4A", "฿1,100 / $30"],
            ["Premium — multi-drive workstation", "Plugable USB 3.0 7-port (5A adapter)", "5V/5A", "฿2,200 / $60"],
            ["Premium — multi-drive workstation", "Anker PowerExpand+ 7-port USB-C hub", "USB-PD, 60W passthrough", "฿2,800 / $75"],
          ],
        },
      },
      {
        id: "thailand-buying",
        heading: "Where to buy in Thailand",
        paragraphs: [
          "All the models above ship to Thailand. Search terms in order of preference:",
        ],
        items: [
          "**Lazada** — search 'powered USB 3.0 hub with AC adapter' or 'self-powered USB hub 3A'. Local sellers usually deliver in 1–3 days. Filter by brand (Anker, UGREEN, Orico) to skip the generic listings.",
          "**Shopee** — same searches; some sellers ship from China and take 7–14 days but list lower prices. Read recent reviews carefully — look for buyers confirming the adapter actually delivers its rated amperage.",
          "**JIB / Banana IT / Advice** — physical stores. Selection is thinner but you can verify the AC adapter is in the box before paying. Slightly pricier than online.",
          "**Pantip Plaza / Fortune Town (Bangkok)** — pro-grade hubs (Plugable, premium Anker) are most reliably found here. Worth a trip if you want to inspect before buying.",
        ],
      },
      {
        id: "what-not-to-buy",
        heading: "Hubs to avoid",
        items: [
          "**Anything advertised as 'bus-powered' or sold without a separate adapter.** No matter how many ports, the hub shares the laptop's insufficient power across all of them. Worse for recovery than no hub at all.",
          "**Generic ฿200–฿400 listings with 'OEM' as the seller.** The adapters are routinely overrated — labelled 3A, deliver 1A under load. Tested by us on the GT80N: no improvement over bus power.",
          "**USB 2.0–only hubs.** They work for the power side but cap throughput at 480 Mbps, slowing clean reads. USB 3.0 hubs cost similar.",
          "**Hubs with switch-per-port toggles unless rated 3A+ aggregate.** The per-port switches often have undersized contacts that voltage-drop under load.",
          "**'Charger-style' multi-port chargers being repurposed as hubs.** They supply power but don't pass USB data. You'd plug the drive in, get nothing on screen. (Yes, people make this mistake — the form factor is similar.)",
        ],
      },
      {
        id: "verify-after-purchase",
        heading: "How to verify the hub actually solves the problem",
        paragraphs: [
          "Once your hub arrives, the test is simple: plug your DVD drive into the hub, run a recovery scan on the same damaged disc that previously failed, and watch what happens. Three outcomes are possible:",
        ],
        items: [
          "**Recovery completes successfully (or makes significant progress past where it previously stopped).** Your problem was power. Hub fixed it. Keep recovering.",
          "**The scan still disconnects at roughly the same point.** The hub's adapter is likely underpowered (cheap unit lying about its rating), OR your specific drive's bridge chip locks up under sustained load regardless of clean power. Try a different hub first; if same result, the drive is the wall.",
          "**The drive disconnects but later than before.** Partial fix — the hub helps, but on long damaged regions your drive's bridge chip still locks up. You're on the boundary. A better drive (or mail-in service for this specific disc) is the next step.",
        ],
        callout: {
          label: "If you have a multimeter",
          text: "Plug a USB voltage tester (~฿200 on Lazada) between the hub and the drive. Watch the voltage during a recovery scan. Healthy: stays at 5.0V ± 0.1V even during seeks. Bad: sags to 4.6V or lower during damaged-sector spikes. Voltage sag during seeks proves the hub's adapter is underpowered for the drive's demand.",
          color: "blue",
        },
      },
      {
        id: "hub-isnt-enough",
        heading: "When a powered hub isn't enough",
        paragraphs: [
          "A powered hub fixes the current-starvation problem. It doesn't fix the bridge-chip-lockup problem (separate failure mode on cheap drives), the weak-laser-pickup problem (mechanical limit of slim drives), or the firmware-rejects-MODE-SELECT problem (some drives ignore optimisations recovery software relies on).",
          "If after upgrading to a proper powered hub you still can't complete a recovery on a moderately damaged disc, the next upgrade is the drive itself. Full-height desktop drives in AC-powered enclosures (Pioneer BDR-212UBK + enclosure, ~฿4,500 / $130) have stronger laser pickups, more stable bridge chips, and firmware that accepts MODE SELECT optimisations. They routinely recover discs that any slim USB drive — even on a perfect hub — cannot read.",
          "For irreplaceable content where buying new hardware isn't worth the gamble, Heirvo's mail-in service starts at $89 with a no-recovery-no-charge guarantee. The hub buying decision becomes much easier once you know mail-in is a backstop.",
        ],
      },
    ],
    faq: [
      {
        q: "Will any powered USB hub work, or do I need a specific brand?",
        a: "Any powered hub with at least 3 A output (5V × 3A = 15W) and a real AC adapter will help. Brand matters only because reputable brands (Anker, UGREEN, Orico, Sabrent) actually deliver their rated amperage, while generic ฿200 hubs often ship with 1A adapters mislabelled as 3A. The hub's job is electrical — any honest, properly-rated hub fixes the brown-out.",
      },
      {
        q: "Does a USB-C hub with Power Delivery work better than a USB-A powered hub?",
        a: "Not for most optical drives. USB-PD negotiation requires the drive to support PD, and almost no consumer DVD drives do — they fall back to the standard 0.5–0.9 A request regardless of port type. A USB-A powered hub with a generous 5V rail is more reliable for optical recovery than a USB-PD setup.",
      },
      {
        q: "I bought a 3A hub but my drive still disconnects. What now?",
        a: "Three possibilities: (1) the adapter is mislabelled and actually delivers less than 3A (common on generic hubs — test with a different brand), (2) the drive's bridge chip is locking up under sustained recovery traffic regardless of power (firmware issue, not power issue), (3) the cable from hub to drive has high resistance (try a different USB cable). If a brand-name 3A+ hub doesn't fix it, the drive itself is the limit.",
      },
      {
        q: "Will a powered hub help my external hard drive or SSD too?",
        a: "Yes — external 2.5\" HDDs sometimes have similar brown-out issues, especially older bus-powered drives. SSDs draw far less power and rarely have the problem, but a powered hub never hurts. The same hub can serve all your USB peripherals.",
      },
      {
        q: "Can I use a phone wall charger as a USB hub?",
        a: "No. A phone charger supplies power but doesn't pass data — your computer wouldn't see the drive at all. You need an actual hub (a device with data circuitry) that ALSO has a power input.",
      },
      {
        q: "How much current does my specific DVD drive actually need?",
        a: "Most consumer optical drives spec at 1A maximum draw, but real-world peaks during damaged-sector seeks routinely exceed 2A. The drive's own spec sheet usually understates this — those numbers are for clean playback, not error-recovery work. A 3A hub has comfortable headroom for any consumer drive's worst-case spike.",
      },
      {
        q: "Is a powered USB hub overkill for occasional recovery work?",
        a: "Not really. A ฿650 hub is cheaper than a single mail-in recovery service order, and it's a one-time purchase that solves a recurring problem. If you have more than two damaged DVDs to recover over the next year, the hub pays for itself in time saved alone.",
      },
      {
        q: "What's the difference between a 3A hub and a 5A hub?",
        a: "3A is enough for one optical drive plus a couple of low-power peripherals (keyboard, mouse). 5A is enough for an optical drive plus high-power peripherals (a second HDD, a USB-powered fan, a phone charging at the same time). For single-purpose DVD recovery work, 3A is plenty.",
      },
    ],
    cta: {
      heading: "Got a powered hub? Now use it with Heirvo",
      body: "A powered hub fixes the disconnect problem. Heirvo gets the most out of every sector your drive can read — MODE SELECT, watchdog timeouts, skip-ahead through dead regions. Free to scan, $39 only when you save the files.",
      primaryLabel: "Download Heirvo Free",
      primaryHref: "/download",
      secondaryLabel: "Mail-In Recovery — from $89",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 28. Slim USB vs desktop DVD drives for recovery
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "slim-vs-desktop-dvd-drive-recovery",
    title: "Slim USB vs Desktop DVD Drives for Data Recovery: What Actually Matters",
    metaTitle: "Slim USB vs Desktop DVD Drive — Recovery Comparison (2026)",
    metaDescription:
      "Honest comparison of $25 slim USB DVD drives vs $130 desktop drives for damaged-disc recovery. Real recovery rates, why the difference is bigger than you think, and which to buy when.",
    datePublished: "2026-05-16",
    dateModified: "2026-05-16",
    readTime: "10 min read",
    category: "DVD Recovery",
    intro:
      "On healthy DVDs, a $25 slim USB drive and a $130 desktop drive perform identically — both copy files in minutes. On damaged DVDs, the difference is enormous: slim drives typically recover 0–15% of a damaged disc before disconnecting or stalling, while desktop drives (Pioneer BDR-212, ASUS BW-16D1HT, LG WH16NS40) routinely recover 60–95% of the same disc. The gap is caused by three hardware differences — laser pickup strength, bridge chip quality, and AC power vs bus power — none of which can be fixed in software. For one-off recovery of a single important disc, the math usually favours a desktop drive plus enclosure, or a mail-in service for the worst cases.",
    related: ["dvd-drive-disconnects-mid-scan", "powered-usb-hub-dvd-recovery", "best-dvd-recovery-software", "recover-files-scratched-dvd"],
    sections: [
      {
        id: "the-core-difference",
        heading: "The core difference: it's a hardware tier, not just a brand thing",
        paragraphs: [
          "Slim USB DVD drives — the ฿500 / $15 type that comes in a thin enclosure with a single USB cable — are designed for occasional playback. They were originally laptop-replacement parts, then repurposed as cheap external drives when built-in optical drives disappeared from laptops around 2015. They use Panasonic UJ8/UJ9 mechanism families inside, regardless of whether the badge says LG, ASUS, Buffalo, or Asus. Same mechanism, different sticker.",
          "Desktop DVD drives — the half-height 5.25\" type — are designed for sustained use in a desktop PC where SATA power supplies them up to 25 watts on demand. They use entirely different mechanisms: larger laser diodes, heavier sleds for stable tracking, more sophisticated firmware. Pioneer BDR series, Plextor Premium series, LG WH16NS40, ASUS BW-16D1HT — these are the workhorse drives that recovery professionals have used for two decades.",
          "When you put a desktop drive in an AC-powered USB enclosure (~฿800), it becomes external. To your laptop it looks like any USB DVD drive — but inside it has the full desktop-drive hardware, with the enclosure supplying SATA-level power from its own wall adapter. This is how serious DVD recovery on a laptop is done.",
        ],
      },
      {
        id: "comparison-table",
        heading: "Side-by-side comparison",
        table: {
          caption: "Slim USB vs desktop drive: what differs and what doesn't",
          headers: ["Property", "Slim USB DVD drive ($15–$30)", "Desktop drive + AC enclosure ($100–$200)"],
          rows: [
            ["Form factor", "Thin external, single USB cable", "5.25\" half-height in an enclosure"],
            ["Power source", "USB bus (0.5–0.9 A from laptop)", "AC adapter (2.5–3 A from wall)"],
            ["Peak current under load", "Starves above 1 A — browns out", "3 A+ headroom, never starves"],
            ["Laser diode tier", "Low-cost, narrow power range", "Higher power, wider tolerance"],
            ["Sled (pickup carriage)", "Lightweight, vibration-prone", "Heavier, vibration-damped"],
            ["Bridge chip", "JMicron / ENE budget tier", "Often Pioneer / Marvell — sustained-load tested"],
            ["MODE SELECT support", "Often refused by firmware", "Accepted on Pioneer / ASUS / LG WH"],
            ["PureRead error recovery", "No", "Yes (Pioneer BDR-21x with PureRead 3+/4+)"],
            ["Typical healthy disc copy", "5–8 minutes", "5–8 minutes (same)"],
            ["Recovery rate, mild scratches", "30–50%", "85–98%"],
            ["Recovery rate, moderate damage", "5–15%", "60–90%"],
            ["Recovery rate, severe damage", "0–5% (often disconnects)", "20–60%"],
            ["Disconnect under sustained load", "Common (multiple times per scan)", "Never"],
            ["Lifespan under recovery use", "Months — drive wears fast", "Years — designed for sustained use"],
          ],
        },
      },
      {
        id: "why-laser-matters",
        heading: "Why laser pickup quality matters more than spec sheets suggest",
        paragraphs: [
          "DVD recovery is fundamentally an optical problem. The laser reads microscopic pits in a reflective layer; scratches scatter that light and the laser loses tracking. Better lasers — higher output power, wider focus range, faster servo response — keep tracking through scratches that a weaker laser gives up on.",
          "Slim drive lasers are made to a price point. They have less power range (can't compensate for variable disc reflectivity), narrower focus tolerance (can't read around micro-scratches), and slower servo response (lose tracking on first error and don't recover). On a healthy disc this never shows. On a damaged disc, it's everything.",
          "Pioneer BDR-21x drives have a feature Pioneer calls PureRead 4+ — multi-pass laser power adjustment that automatically increases laser intensity on hard-to-read sectors, plus 'Real-Time PureRead' that adjusts power during reading rather than after error. This is the kind of optical engineering that takes Pioneer's recovery rate on damaged DVDs from 'acceptable' to 'best-in-class'. There's no slim-drive equivalent because the laser diode in a slim drive physically can't run at variable power levels.",
        ],
      },
      {
        id: "bridge-chip-difference",
        heading: "The bridge chip difference (often overlooked)",
        paragraphs: [
          "Inside every USB optical drive is a small processor — the USB-ATAPI bridge chip — that translates USB packets to ATAPI/SCSI commands the optical mechanism understands. This is the chip that browns out under load on cheap drives.",
          "Slim USB drives use JMicron, ENE, Realtek, or no-name bridge chips. These work fine for occasional, light use (copying a few photos off a wedding DVD on a Sunday). They were never designed for sustained recovery traffic — thousands of SCSI commands per minute, hours of seek-heavy reads on damaged sectors. Under that load they lock up. The drive's activity LED might keep blinking (the optical mechanism keeps spinning) but no SCSI commands complete. The recovery process hangs.",
          "Desktop drives in good enclosures use bridge chips from JMS (JMicron's pro line), Marvell, or ASMedia's higher-end SKUs — chips designed for sustained server-grade traffic. Pioneer's own external enclosures use their proprietary firmware that handles recovery-style traffic without locking up. The drive sees thousands of damaged-sector retries and keeps responding properly.",
          "Software can't fix a locked bridge chip from the host side. Heirvo's watchdog timer gives up on stuck commands and continues the scan, but the drive itself is offline until you unplug and replug it. With a quality bridge chip, this scenario simply doesn't happen.",
        ],
      },
      {
        id: "when-slim-is-fine",
        heading: "When a slim USB drive is fine",
        paragraphs: [
          "Don't throw away your $25 slim drive. It has real uses:",
        ],
        items: [
          "**Healthy discs.** Copying files off an undamaged DVD takes 5 minutes on any drive. The desktop-drive advantage only matters when something goes wrong.",
          "**Light scratch recovery.** Surface scuffs, fingerprints, minor scratches that a quick polish would fix — these recover fine on a slim drive. You may need to run multiple passes, but the data is there.",
          "**One-time projects.** If you have one slightly scratched DVD to recover and money is tight, your slim drive plus Heirvo plus patience will probably get you 70–80% of the disc. Not great, but not zero either.",
          "**Backup duty.** Some people keep a slim drive plugged in as a 'I might need it' tool. Fine — it's not the limiting factor 95% of the time.",
        ],
        callout: {
          label: "The honest read",
          text: "If you have a slim drive, run a free Heirvo scan with it first. The Recovery Plan card tells you within 5 seconds whether your drive is in the Marginal tier. If you reach 50%+ on your disc, you're done — no need to buy new hardware. The upgrade decision only matters when you hit the wall.",
          color: "green",
        },
      },
      {
        id: "when-desktop-is-required",
        heading: "When a desktop drive (or mail-in) is required",
        paragraphs: [
          "There's a clear line. Below it, slim drives work fine; above it, they don't:",
        ],
        items: [
          "**Recovery from a heavily scratched DVD** — deep scratches that visibly cross the data layer, not just surface scuffs.",
          "**Disc rot / bronzing** — the reflective layer is oxidising. Requires laser power adjustment that slim drives can't deliver.",
          "**Unfinalised DVD-R** — common camera failure mode. The slim drive's firmware often refuses unfinalised discs entirely; desktop drives read them as raw sectors regardless.",
          "**Multi-session CD-R / DVD-R** — multiple recording sessions on one disc, common in incremental burns. Slim drives often only see the last session; desktop drives can extract all sessions.",
          "**Pressed (commercial) DVDs with damage** — the highest-density data; needs maximum laser precision. Slim drives lose tracking; desktop drives work.",
          "**Audio CDs with damage** — needs READ CD (0xBE) command support and C2 error flag handling that most slim drives lack.",
        ],
      },
      {
        id: "what-to-buy",
        heading: "What to buy: a buyer's matrix",
        paragraphs: [
          "If you're going to spend money on optical recovery, here's the sensible ladder by budget:",
        ],
        table: {
          caption: "Recovery-hardware buying ladder",
          headers: ["Budget", "Buy this", "What it handles"],
          rows: [
            ["฿500–฿800 / $15–$25", "Powered USB 3.0 hub (your existing drive in it)", "Healthy discs + minor damage. May or may not break the 3% wall on the worst discs."],
            ["฿1,400 / $40", "ASUS DRW-24D5MT internal DVD + powered enclosure", "Most damaged DVDs (no Blu-ray). Modest laser, but stable bridge and proper AC power. 70–85% recovery on moderate damage."],
            ["฿3,500–฿4,500 / $100–$130", "Pioneer BDR-212UBK internal + powered enclosure", "The recovery sweet spot. Best laser pickup in consumer market. 85–95% on moderate damage, 60–80% on heavy damage. Blu-ray + DVD + CD."],
            ["฿5,500–฿7,000 / $160–$200", "ASUS BW-16D1H-U PRO or Pioneer BDR-XS08 external", "One-piece convenience, AC-powered, same Pioneer/LG mechanisms. Same recovery rates as the internal-plus-enclosure setup but no DIY."],
            ["$89 per disc, no hardware", "Heirvo Mail-In Recovery", "Anything our equipment can't read at home stays unrecoverable. Mail-in handles cracked discs, severe rot, disc with no readable session header. No-recovery-no-charge guarantee."],
          ],
        },
      },
      {
        id: "math",
        heading: "The cost math: when does a better drive pay off?",
        paragraphs: [
          "A reasonable framework: if you have one disc to recover and it's worth more than the drive cost to you, the drive purchase makes sense. If you have multiple discs, the math is overwhelming.",
          "Say you have 8 family DVDs to recover (a typical 'I found these in my parents' attic' scenario). At Heirvo's mail-in rate of $89 each, that's $712. A Pioneer BDR-212 + enclosure is $130. The drive pays for itself on disc #2 and you keep it for future use forever.",
          "If you have one disc and it's a wedding video where the original couple is dead, $130 for a drive that delivers a 95% chance of recovery vs $89 for mail-in that delivers an 80% chance — the drive is the better bet, even setting aside future use. If you have one disc and it's a copy of a movie you can buy on streaming, the math reverses; mail-in or no recovery at all is the rational choice.",
          "The slim drive you already own costs you nothing further to try. Run a free Heirvo scan with it. If you hit 80%+, congratulations — you're done. If you hit 3%, the hardware decision is made for you.",
        ],
      },
    ],
    faq: [
      {
        q: "Will the same software work on a slim drive vs a desktop drive?",
        a: "Yes — Heirvo (and any modern recovery tool) works identically across drive types. The software talks SCSI to whatever drive is plugged in. The difference in outcomes comes entirely from the drive's optical and electrical capabilities, not the software.",
      },
      {
        q: "How can I tell if my slim drive is a Marginal-tier drive?",
        a: "Heirvo's Recovery Plan card tells you the moment you insert a disc. It looks up your drive's INQUIRY response (vendor + model + firmware) in a database of 56 known drives and shows a quality badge: Pro / Good / Acceptable / Marginal / Avoid. The most common slim drives (HL-DT-ST DVDRAM GT-series, Matshita UJ8-series, generic 'USB2.0 CD-ROM') all flag as Marginal.",
      },
      {
        q: "Is there a 'budget' desktop drive that still does the job?",
        a: "Yes — the ASUS DRW-24D5MT or LG GH24NSD1 (both ~$25 internal DVD writers) paired with a $20 powered enclosure gets you to about 70–85% recovery on moderately damaged discs. Not as good as Pioneer, but a massive upgrade from any slim drive at similar total cost.",
      },
      {
        q: "Does Blu-ray vs DVD matter for recovery?",
        a: "Blu-ray drives can read DVDs and CDs (backward compatible). DVD-only drives can't read Blu-rays. If you have ANY Blu-ray discs to recover (or might in future), buy a Blu-ray drive — the price difference is small and the capability gap is large. Pioneer BDR-212 is the value sweet spot.",
      },
      {
        q: "Can I use an old desktop drive from a retired PC?",
        a: "Absolutely. Pop it out, slide it into a powered USB enclosure (~฿800 / $20), and you have a recovery rig for the cost of the enclosure. This is genuinely how a lot of recovery professionals built their setups. Just make sure the enclosure has its own AC adapter.",
      },
      {
        q: "Does adding a powered hub turn my slim drive into a desktop-tier drive?",
        a: "No. A powered hub fixes the brown-out problem (insufficient current). It doesn't fix the weak laser pickup, the unstable bridge chip under sustained load, or the firmware refusing MODE SELECT. You'll get further than you do now, but you won't reach desktop-tier recovery rates without desktop-tier hardware.",
      },
      {
        q: "Should I just send everything to mail-in recovery instead?",
        a: "If you have 1–2 important discs, mail-in is excellent — no hardware decision, no learning curve, no-recovery-no-charge guarantee. If you have 5+ discs, buying a Pioneer BDR-212 + enclosure for $130 and using Heirvo Pro ($39) is cheaper per disc and you keep the equipment.",
      },
      {
        q: "Why do recovery professionals all seem to use the same handful of drives?",
        a: "Because two decades of forum testing (Doom9, MyCE, r/datahoarder, AccurateRip) have narrowed the field to a small list of drives that actually perform well on damaged media. Pioneer BDR series, Plextor Premium, LG WH-series. The list is short because most drives — even other 'good' brands' models — quietly underperform on the recovery use case. The community has converged on the proven hardware.",
      },
    ],
    cta: {
      heading: "Not sure which tier your drive is in? Heirvo tells you in 5 seconds",
      body: "Heirvo's free scan identifies your drive model and shows its quality tier before any work starts. Pro-tier drive? Scan with confidence. Marginal-tier drive? You'll know to upgrade before wasting hours.",
      primaryLabel: "Download Heirvo Free",
      primaryHref: "/download",
      secondaryLabel: "Mail-In Recovery — from $89",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 29. How to recover when drive keeps freezing
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "dvd-drive-freezing-mid-recovery-fix",
    title: "How to Recover a DVD When Your Drive Keeps Freezing",
    metaTitle: "DVD Drive Freezes During Recovery — How to Finish the Scan",
    metaDescription:
      "Step-by-step guide to completing a DVD recovery scan when your drive freezes, stalls, or disconnects partway through. Resume from checkpoint, work around the freezes, and save what's recoverable.",
    datePublished: "2026-05-16",
    dateModified: "2026-05-16",
    readTime: "9 min read",
    category: "DVD Recovery",
    intro:
      "If your DVD drive freezes mid-scan, you can usually still complete the recovery by following four steps: use software that wraps every SCSI call in a watchdog timer (so freezes don't hang the whole engine), let the engine skip past dead regions automatically, resume from the saved sector map after any disconnect, and switch to a better drive or mail-in for the final passes if your hardware is the limit. Modern recovery software handles freezes gracefully — the whole process completes even on cheap drives that disconnect repeatedly, just slower than with quality hardware.",
    related: ["dvd-drive-disconnects-mid-scan", "powered-usb-hub-dvd-recovery", "recover-files-scratched-dvd", "best-dvd-recovery-software"],
    sections: [
      {
        id: "why-freeze",
        heading: "Why DVD drives freeze during recovery (quick recap)",
        paragraphs: [
          "Freezes happen when the drive's USB-ATAPI bridge chip stops responding. This usually has one of two causes: current starvation from an underpowered USB port (the bridge chip resets when voltage sags), or sustained-load lockup of the cheap bridge chip itself (it gets confused by thousands of damaged-sector retry commands).",
          "From your laptop's perspective, both look identical — the drive stops responding, recovery software waits, eventually times out or hangs. The fix is software that handles the freeze gracefully plus a workflow that lets you resume after each freeze. Both are covered below.",
        ],
      },
      {
        id: "checklist",
        heading: "Pre-flight checklist before starting recovery",
        paragraphs: [
          "A few minutes of preparation makes the difference between a recovery that completes and one that doesn't.",
        ],
        numbered: true,
        items: [
          "**Plug the DVD drive directly into the laptop's USB port**, not through a hub (unless your hub is AC-powered). Direct connection eliminates one variable.",
          "**Close every other application** — browser, media players, anything else running. You want all available USB bandwidth and CPU for the recovery.",
          "**Disable Windows sleep / hibernation** while the scan runs. Settings → System → Power. Set 'Plugged in: turn off after' to Never. A laptop falling asleep mid-scan kills the recovery session.",
          "**Plug your laptop into AC power**. Running a recovery on battery is a recipe for the laptop trying to save power by throttling USB, which can trigger drive disconnects.",
          "**Make sure you have enough free disk space** for the recovered files — typically up to 8.5 GB for a full DVD. Heirvo's session also stores a sector map (~100 MB).",
          "**Verify the drive is recognised** in Windows File Explorer before launching Heirvo. If it doesn't show up, the disc is unreadable to Windows even before recovery begins — try inserting and ejecting once.",
        ],
        callout: {
          label: "If you have one available",
          text: "Connect the drive through a self-powered USB 3.0 hub (one with its own AC adapter, not bus-powered). This single change eliminates 80% of mid-scan disconnects on cheap drives. See our hub buying guide.",
          color: "blue",
        },
      },
      {
        id: "start-the-scan",
        heading: "Step-by-step: start the recovery",
        numbered: true,
        items: [
          "**Open Heirvo** and let it detect your DVD drive automatically. The drive should appear in the dropdown within a few seconds.",
          "**Insert your damaged DVD** if you haven't already. Heirvo will probe the disc — this takes 5–10 seconds and runs three SCSI commands (INQUIRY, GET CONFIGURATION, READ DISC INFORMATION) to identify the disc type and drive quality.",
          "**Read the Recovery Plan card** that appears above the Start button. It tells you: your drive's quality tier (Pro / Good / Acceptable / Marginal / Avoid), the disc type (DVD-Video / DVD-ROM / CD), and whether the disc is finalised. If your drive is flagged Marginal or Avoid, expect freezes — but the engine handles them.",
          "**Pick a destination folder** for recovered files. Heirvo defaults to Documents/Heirvo/<disc-label>. Change it if you'd prefer somewhere else (an external HDD with lots of free space is a common choice for batch jobs).",
          "**Click Start Scan**. Heirvo begins reading sector-by-sector. The progress dial fills in green as good sectors come back. The status text under the dial tells you what pass is running (Triage, SlowRead, Reverse, etc).",
        ],
      },
      {
        id: "when-it-freezes",
        heading: "What to do when the drive freezes mid-scan",
        paragraphs: [
          "On a Marginal-tier drive, freezes are normal — not a sign Heirvo or the disc is broken. Heirvo's watchdog timer detects the freeze within 5–7 seconds and either continues automatically or surfaces a 'Drive may be stuck' status. Here's what to do based on what you see:",
        ],
        items: [
          "**Progress dial keeps moving, status says 'Resting the drive' briefly.** Don't touch anything. The watchdog tripped, marked a block failed, and the engine is moving on. This will repeat dozens of times through damaged regions — that's the engine working correctly. Make a cup of tea.",
          "**Progress freezes for more than 60 seconds with 'Resting the drive' showing.** The drive may have fully locked up (bridge chip stopped responding) but Windows still thinks the drive is connected. **Carefully unplug the drive's USB cable from the laptop, wait 10 seconds, plug back in.** Heirvo will detect the reconnect and automatically resume from the last checkpoint. You may need to click 'Resume' on the dashboard.",
          "**The drive disappears from Windows entirely** ('No drive' shown in Heirvo's sidebar). The bridge chip reset / browned out. Same fix: unplug USB cable, wait 10 seconds, plug back in. Heirvo recovers cleanly because every scan is checkpointed every ~6,400 sectors of progress.",
          "**Heirvo's window itself becomes unresponsive** (rare with modern Heirvo, common with older recovery tools). Wait 60 seconds — the watchdog should bring it back. If not, force-close from Task Manager and relaunch. Heirvo's session is in the database, so reopening the app shows the active session ready to Resume.",
        ],
        callout: {
          label: "Most important rule",
          text: "Never reformat or eject the disc itself during recovery. Just unplug the drive's USB cable from the laptop side. The disc stays in the drive, your sector map stays intact, the scan resumes from where it stopped.",
          color: "amber",
        },
      },
      {
        id: "resume",
        heading: "How resume works (and why it matters)",
        paragraphs: [
          "Heirvo writes the recovery state to a SQLite database every 100 sectors during retry passes and every ~6,400 sectors during Triage. The state includes: every sector's status (Good / Failed / Skipped / Unknown), the current pass, the current LBA, the disc fingerprint, and your output folder choice.",
          "When you reopen Heirvo after a freeze or crash, the session appears in the 'My Discs' list with a 'Paused' or 'Failed' label. Click Resume. Heirvo opens the drive, re-applies MODE SELECT and SET CD SPEED settings (the drive forgets these on disconnect), then continues from the exact LBA where the engine stopped. Sectors already marked Good are not re-read; they go straight to the recovered files.",
          "This makes the freeze pattern manageable even on the worst drives. A recovery that takes 30 minutes on a quality drive might take 4 hours on a cheap drive with 50 reconnects — but it completes, with the same final result. The patience tax is the only cost.",
        ],
      },
      {
        id: "patient-mode",
        heading: "When to switch to Patient mode",
        paragraphs: [
          "After Heirvo's first pass (Triage) finishes, the dashboard shows what was recovered, what failed, and what was skipped. If significant data is in the Failed / Skipped state, you can run Patient mode on those sectors specifically.",
          "Patient mode is slower per sector but more thorough: longer per-sector timeouts, multiple retries at different speeds, reverse-direction reads on damaged regions. It targets only sectors that failed in Triage — so it doesn't waste time on already-recovered data.",
          "The pattern: run Standard mode first (fast, gets you 70–95% of what's recoverable). If recovery percentage is below what you need and the drive isn't actively dying, run Patient mode on the remaining failed sectors. Sometimes Patient mode picks up another 5–15%, especially on borderline-readable sectors that Triage gave up on too quickly.",
        ],
        callout: {
          label: "When to skip Patient mode",
          text: "If your drive is freezing constantly during Triage (Marginal tier), don't run Patient mode — it just multiplies the freeze count without much added recovery. Move directly to a better drive or mail-in for the remaining sectors.",
          color: "blue",
        },
      },
      {
        id: "after-scan",
        heading: "After the scan finishes",
        numbered: true,
        items: [
          "**Review the Health Score** on the dashboard. It's a 0–100 number based on coverage, critical structures (IFO/BUP files), and damage distribution. 95+ means excellent recovery; 50–80 means partial; below 50 means severe damage with limited recovery.",
          "**Activate Heirvo Pro ($39) to save the files** if recovery succeeded. If nothing's recoverable, no charge — close the app and you've spent zero dollars.",
          "**Choose your output format** — MP4 (compressed, smaller, plays anywhere), ISO (raw disc image, preserves everything), or both. For wedding videos and family movies, MP4 is usually the right choice.",
          "**Verify the recovered files** play back in VLC or your media player of choice. If they play, the recovery is durable — those files will outlast the disc itself.",
          "**Keep the session in Heirvo's history.** If you later upgrade your drive and want to re-attempt the failed sectors, you can import the session and continue from the existing sector map — Heirvo only re-reads the sectors that failed previously, so the second-drive pass is much faster.",
        ],
      },
      {
        id: "escalate",
        heading: "When to escalate: a better drive or mail-in",
        paragraphs: [
          "Some discs and some drive combinations can't be recovered at home no matter how patient you are. Signs it's time to escalate:",
        ],
        items: [
          "**Recovery stalls below 10% after 3+ resume cycles.** The drive's optical pickup can't read past the damage. A different drive might; this one definitively can't.",
          "**The Health Score is below 30 even after Patient mode.** Significant data is gone or unreadable to this hardware tier.",
          "**The disc is cracked, deeply gouged, or has bronzing (disc rot).** Consumer drives spin discs at 3,000+ RPM — a cracked disc can shatter, damaging the drive and the data. These need slower professional equipment.",
          "**You hit 'illegal request' errors on basic commands.** The drive's firmware is incompatible with the disc format (sometimes happens with unfinalised or hybrid discs). A different drive often fixes this.",
        ],
      },
      {
        id: "next-drive",
        heading: "If you're buying a new drive: what to look for",
        paragraphs: [
          "The single most-effective upgrade for damaged-disc recovery is a desktop drive in a powered enclosure. Specific recommendations:",
        ],
        items: [
          "**Pioneer BDR-212UBK** (internal SATA Blu-ray) + powered USB 3.0 enclosure — gold standard, ~฿4,500 / $130 total. PureRead 4+ error recovery, accepts MODE SELECT, recovers ~95% of moderately damaged discs.",
          "**ASUS BW-16D1HT** (internal) or **BW-16D1H-U PRO** (external AC-powered) — same mechanism as the LG WH16NS40, ~฿5,000 / $145.",
          "**LG WH16NS40** (internal) + enclosure — the original gold-standard recovery drive, slightly older but still excellent for DVD recovery work.",
          "**ASUS DRW-24D5MT** (budget internal DVD) + powered enclosure — ฿1,400 / $40 total. Step down from Pioneer but a massive step up from any slim USB drive.",
        ],
        callout: {
          label: "Don't skip the enclosure spec",
          text: "Any internal drive can work in an external enclosure — but only an AC-powered enclosure (with its own wall adapter) solves the brown-out problem. Bus-powered enclosures defeat the purpose of upgrading the drive.",
          color: "amber",
        },
      },
    ],
    faq: [
      {
        q: "If my drive freezes 10+ times during one scan, did the recovery actually work?",
        a: "Probably yes, if Heirvo's progress kept climbing through each resume cycle. Freezes mean the drive's bridge chip stopped responding momentarily, but the sector map persists across freezes — each resume picks up from the last checkpoint. The final % recovered is what matters, not how many resumes it took to get there.",
      },
      {
        q: "Should I unplug just the USB cable or the drive's power cable when it freezes?",
        a: "Just the USB cable from the laptop side. Don't open the drive itself; don't eject the disc. The goal is to reset the USB bridge chip while keeping the optical mechanism untouched. The disc stays seated, the laser stays positioned roughly where it was, and the next read starts from the saved LBA in the sector map.",
      },
      {
        q: "Why does Heirvo say 'Resting the drive'? Is the drive broken?",
        a: "No — 'Resting the drive' is shown when no SCSI activity has happened for a few seconds. It usually means Heirvo is between passes (transitioning from Triage to SlowRead, for example), or it's running a watchdog timeout on a stuck command. The drive itself is fine; the engine is handling a normal pause in activity.",
      },
      {
        q: "Can I run other programs while Heirvo is scanning?",
        a: "Light use is fine — browsing the web, email. Avoid anything that hits the same disk you're saving recovered files to (video editing, large downloads) since the disk activity competes with the recovery write throughput. Most importantly, don't put the laptop to sleep.",
      },
      {
        q: "What if I need to stop the scan and resume tomorrow?",
        a: "Click Cancel in Heirvo (or just close the app). The session is saved automatically. Tomorrow, open Heirvo, find the session in 'My Discs', click Resume. The scan picks up where it left off. You can do this across days or weeks — recovery progress is durable in the SQLite database.",
      },
      {
        q: "Will running the scan twice in a row recover more data?",
        a: "Yes, sometimes. Damaged sectors can be flaky — they fail one read and succeed on the next. Heirvo's retry logic does this within a single scan automatically. But running a second scan after the first finishes is also worthwhile if your recovery percentage is below what you need; the second pass starts with your existing sector map and only retries the failed sectors, so it's fast and may pick up additional data.",
      },
      {
        q: "My drive freezes are getting more frequent over time. Is the drive dying?",
        a: "Possibly, or it's just thermally stressed. Cheap USB drives heat up during sustained use — try letting the drive sit for 15 minutes between long scans. If the freeze rate doesn't improve with cooling, the bridge chip is failing under load and a new drive is warranted.",
      },
      {
        q: "How long should I let a stuck scan sit before unplugging the drive?",
        a: "Heirvo's watchdog handles individual stuck commands in 5–7 seconds. If the progress dial hasn't moved AT ALL for 60+ seconds AND the activity LED on the drive is dark or steady (not blinking), the bridge has locked up. Unplug the USB cable, wait 10 seconds, plug back in.",
      },
    ],
    cta: {
      heading: "Stop fighting freezes — Heirvo handles them automatically",
      body: "Heirvo's host-side watchdog times out stuck SCSI calls in 5–7 seconds and lets the scan continue. The session checkpoints continuously, so any freeze just means a brief pause and a click of Resume. Free to scan; pay only when you save.",
      primaryLabel: "Download Heirvo Free",
      primaryHref: "/download",
      secondaryLabel: "Mail-In Recovery — from $89",
      secondaryHref: "/recover",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 30. MODE SELECT page 01h technical deep-dive
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "mode-select-page-01h-scsi-dvd-recovery",
    title: "MODE SELECT Page 01h: The SCSI Command That Makes DVD Recovery Possible",
    metaTitle: "MODE SELECT Page 01h — The SCSI Command for DVD Recovery",
    metaDescription:
      "A technical deep-dive into MODE SELECT page 01h, the MMC command that every serious DVD recovery tool sends before reading. Bit layout, IOCTL flow, drives that reject it, and why it matters.",
    datePublished: "2026-05-16",
    dateModified: "2026-05-16",
    readTime: "12 min read",
    category: "Technical Reference",
    intro:
      "MODE SELECT page 01h is the SCSI Multimedia Commands (MMC) command that recovery software sends to optical drives at session start to configure error recovery behaviour. It sets the drive's internal Read Retry Count to 1 (instead of the default 8–16) so bad sectors fail in ~50 milliseconds rather than 5+ seconds, and sets the TB and PER bits so the drive returns partial data with sense information on errors. Every mature recovery tool — IsoBuster, ddrescue, MakeMKV, DiscImageCreator, dvdisaster, Heirvo — sends this command. Tools that don't appear to 'hang' on damaged discs because they're waiting through firmware retry cycles. Some cheap USB drives reject the command (sense_key 0x5 ILLEGAL_REQUEST), in which case recovery falls back to drive defaults and runs significantly slower.",
    related: ["vlc-plays-dvd-recovery-fails", "dvd-drive-disconnects-mid-scan", "heirvo-vs-isobuster", "best-dvd-recovery-software"],
    sections: [
      {
        id: "what-it-does",
        heading: "What MODE SELECT page 01h does, in plain English",
        paragraphs: [
          "Every optical drive has internal error-recovery behaviour controlled by parameters stored in mode pages. Mode page 01h — the 'Read-Write Error Recovery Parameters' page, defined in the SCSI MMC specification — holds the settings that determine how the drive responds to read errors. Recovery software adjusts these before reading so the drive behaves the way recovery work needs it to.",
          "By default, when a drive encounters a sector that fails ECC (the disc's internal error correction can't fix the read), the firmware retries the read internally. The default retry count is typically 8 to 16 attempts. Each attempt takes 300–500 milliseconds — re-seeking the laser sled, re-spinning the spindle to the right rotation, re-firing the laser. Add it up: 16 × 400 ms = 6.4 seconds per bad sector before the drive gives up and reports an error to the host.",
          "Recovery software wants the opposite behaviour. It wants the drive to fail fast — try once, return immediately on failure, let the host decide what to do next (retry at lower speed, skip ahead, mark the sector failed, etc.). MODE SELECT page 01h with a Read Retry Count of 1 instructs the drive to do exactly that. A bad sector now fails in roughly 50 ms instead of 6 seconds — a 100x speedup on every damaged sector.",
          "This is the single biggest reason mature recovery tools complete scans in minutes that naive tools spend hours hung on. It's the closest thing to a magic trick in optical recovery, and it's been the standard practice for two decades.",
        ],
      },
      {
        id: "cdb-layout",
        heading: "The MODE SELECT(10) CDB — byte by byte",
        paragraphs: [
          "MODE SELECT comes in two variants: the 6-byte form (opcode 0x15) and the 10-byte form (opcode 0x55). Modern recovery tools use the 10-byte form because it supports the full 16-bit parameter list length field needed for mode pages with sub-pages. Here's the 10-byte CDB layout:",
        ],
        table: {
          caption: "MODE SELECT(10) Command Descriptor Block (10 bytes)",
          headers: ["Byte", "Value", "Field", "Notes"],
          rows: [
            ["0", "0x55", "Operation Code", "MODE SELECT(10) opcode"],
            ["1", "0x10", "Flags", "PF=1 (Page Format — mode parameter list follows spec layout). SP=0 (don't save to non-volatile)."],
            ["2", "0x00", "Reserved", ""],
            ["3", "0x00", "Reserved", ""],
            ["4", "0x00", "Reserved", ""],
            ["5", "0x00", "Reserved", ""],
            ["6", "0x00", "Reserved", ""],
            ["7", "0x00", "Parameter List Length (MSB)", "Length in bytes of the parameter list that follows"],
            ["8", "0x10", "Parameter List Length (LSB)", "0x10 = 16 bytes (8-byte header + 8-byte page 01h)"],
            ["9", "0x00", "Control", ""],
          ],
        },
      },
      {
        id: "parameter-list",
        heading: "The parameter list — what page 01h actually contains",
        paragraphs: [
          "Following the CDB, the host sends a 16-byte parameter list: an 8-byte Mode Parameter Header followed by the 8-byte page 01h itself. The page is where the recovery-relevant flags live.",
        ],
        table: {
          caption: "Mode Parameter Header (8 bytes) + Page 01h (8 bytes)",
          headers: ["Byte", "Value", "Field", "Effect"],
          rows: [
            ["0", "0x00", "Mode Data Length (ignored on SELECT)", "Set by drive on SENSE; ignored when host sends"],
            ["1", "0x00", "Medium Type", "0 = default for current medium"],
            ["2", "0x00", "Device-Specific Parameter", "Reserved for read mode"],
            ["3", "0x00", "Block Descriptor Length", "0 = no block descriptor follows"],
            ["4–7", "0x00", "Reserved", "Padding bytes"],
            ["8", "0x01", "Page Code", "PS=0, SPF=0, code=0x01 (R/W Error Recovery)"],
            ["9", "0x06", "Page Length", "6 bytes follow"],
            ["10", "0x24", "Error Recovery Flags", "TB=1, PER=1, others 0 (detail below)"],
            ["11", "0x01", "Read Retry Count", "Drive retries each sector ONCE before reporting error"],
            ["12", "0x00", "Correction Span", "Not used for DVD"],
            ["13", "0x00", "Head Offset Count", "Not used for DVD"],
            ["14", "0x00", "Data Strobe Offset Count", "Not used for DVD"],
            ["15", "0x00", "Write Retry Count", "Not relevant for read-only recovery"],
          ],
        },
      },
      {
        id: "flag-meanings",
        heading: "The error recovery flags (byte 10) — what each bit does",
        paragraphs: [
          "Byte 10 of page 01h is a bitmap controlling drive behaviour during reads. The value 0x24 means bits 5 (TB) and 2 (PER) are set; all others are zero. Here's what each bit does:",
        ],
        table: {
          caption: "Page 01h byte 10 bits — error recovery control",
          headers: ["Bit", "Name", "Value (recovery)", "Effect when set"],
          rows: [
            ["7", "AWRE", "0", "Auto Write Reallocation — irrelevant for reads"],
            ["6", "ARRE", "0", "Auto Read Reallocation. 0 = don't auto-remap defects (would mask them from the host)"],
            ["5", "TB", "1", "Transfer Block — return whatever was read even on partial failure. Recovery wants any salvageable data"],
            ["4", "RC", "0", "Read Continuous. 0 = return errors normally (1 would suppress errors entirely — wrong for recovery)"],
            ["3", "EER", "0", "Enable Early Recovery. 0 = full ECC path (slower but more accurate)"],
            ["2", "PER", "1", "Post Error — emit sense data when reporting errors so the host knows what failed"],
            ["1", "DTE", "0", "Disable Transfer on Error. 0 = transfer data on error (with TB=1, gives us partial data)"],
            ["0", "DCR", "0", "Disable Correction. 0 = keep ECC enabled (raw mode disabled). Heirvo may flip this in future for raw recovery passes"],
          ],
        },
      },
      {
        id: "why-retry-count-matters",
        heading: "Why Read Retry Count = 1 is the critical change",
        paragraphs: [
          "Byte 11 — Read Retry Count — controls how many times the drive retries internally before reporting failure. The default value varies by manufacturer but is typically 8 to 16. Setting it to 1 means the drive tries each sector once and returns the result immediately.",
          "On a healthy sector, this changes nothing. The first read succeeds and the data comes back in 5–20 ms. Read Retry Count doesn't enter the picture.",
          "On a damaged sector, the change is enormous. With the default count of 16, a permanently-bad sector takes 16 × ~400 ms = ~6.4 seconds before the drive reports failure to the host. The host has been blocked for 6.4 seconds doing nothing — and remember, the host is recovery software that wants to make a smart decision based on the failure, like 'retry at lower speed' or 'mark this sector failed and skip ahead'.",
          "With Read Retry Count = 1, the same bad sector returns failure in ~400 ms. The host immediately knows it's a bad sector and can apply its own retry strategy: read at slower speed, try with different command parameters, try reading the adjacent sectors first to establish drive position, or just mark the sector failed and use skip-ahead logic to jump past the damaged region.",
          "The host's retry strategy is dramatically smarter than the drive firmware's. Drive firmware retries with the same parameters every time. Host software retries with varying speeds, command sequences, and skip patterns. So you get both faster failure on permanently-bad sectors AND better recovery rates on borderline sectors — the host can succeed where the drive's blind retry would have failed anyway.",
        ],
      },
      {
        id: "windows-ioctl",
        heading: "How the command flows through Windows",
        paragraphs: [
          "On Windows, sending a raw SCSI command to a storage device requires the SCSI Pass-Through Interface (SPTI). The recovery software opens a handle to the optical drive's device path (e.g., \\\\.\\E:) with CreateFile, then sends commands via DeviceIoControl using one of two control codes:",
        ],
        items: [
          "**IOCTL_SCSI_PASS_THROUGH** (0x4D004) — copies data through the kernel; simpler but slower for large transfers",
          "**IOCTL_SCSI_PASS_THROUGH_DIRECT** (0x4D014) — DMA-direct; required for high-throughput reads but needs the data buffer to be page-aligned",
        ],
      },
      {
        id: "spti-details",
        heading: "How Heirvo wires the IOCTL — and the timeout caveat",
        paragraphs: [
          "Heirvo uses IOCTL_SCSI_PASS_THROUGH_DIRECT for both READ commands and configuration commands like MODE SELECT. The CDB above goes into the `cdb[]` field of the SCSI_PASS_THROUGH_DIRECT struct, the 16-byte parameter list goes into the data buffer with direction = SCSI_IOCTL_DATA_OUT, and the drive's response (sense data on error) comes back in the SENSE buffer.",
          "Critically, the `TimeOutValue` field in the struct is a hint to the drive about how long the command should take — NOT a hard kill from the host side. If the drive doesn't respond, the kernel waits indefinitely. This is why recovery software also needs a host-side watchdog timer (a worker thread plus a channel with recv_timeout) to give up on stuck commands. Otherwise a flaky drive can hang the entire recovery engine for tens of minutes.",
        ],
      },
      {
        id: "drives-that-reject",
        heading: "Drives that reject MODE SELECT page 01h",
        paragraphs: [
          "Not every drive implements MODE SELECT page 01h properly. Some cheap USB-ATAPI bridge chips return CHECK CONDITION status with sense_key 0x5 (ILLEGAL_REQUEST) when they see the command. The drive's firmware doesn't recognise the page format or simply has the mode page locked.",
          "Confirmed-rejecting drives include the HL-DT-ST DVDRAM GT-series (LG slim USB DVD writers), most Panasonic MATSHITA UJ8/UJ9 mechanism families, and generic 'USB2.0 CD-ROM' enclosures with no-name bridge chips. These drives keep their default Read Retry Count behaviour throughout the recovery session — every bad sector takes the full 5+ seconds — and there's no software fix.",
          "Drives that reliably accept MODE SELECT page 01h include the Pioneer BDR series (BDR-208 through BDR-212, BDR-S09, BDR-S12), the LG WH-series (WH14NS40, WH16NS40), and the ASUS BW-16D1HT (which uses the LG WH16NS40 mechanism internally). All Plextor Premium-era drives also accept it, though they're collector hardware now.",
          "A recovery tool's MODE SELECT logic should always be best-effort: try the command, log the result, fall back gracefully if the drive rejects it. The recovery still works without MODE SELECT — it just runs significantly slower on damaged regions, because the drive's default retry behaviour can't be overridden.",
        ],
        callout: {
          label: "Heirvo's implementation",
          text: "Heirvo sends MODE SELECT page 01h at every drive open AND every drive reopen (the settings reset on UNIT ATTENTION conditions like media change or bus reset). If the drive rejects it, Heirvo logs a WARN and continues. The Recovery Plan card surfaces drive quality so the user knows whether to expect the optimisation to apply.",
          color: "blue",
        },
      },
      {
        id: "mode-select-6-vs-10",
        heading: "MODE SELECT(6) vs MODE SELECT(10) — which to send?",
        paragraphs: [
          "The two variants of MODE SELECT serve the same purpose with different field widths:",
        ],
        items: [
          "**MODE SELECT(6)** — opcode 0x15, 6-byte CDB, 1-byte parameter list length (max 255 bytes). Older command, slightly simpler. Supported by virtually all SCSI/ATAPI devices.",
          "**MODE SELECT(10)** — opcode 0x55, 10-byte CDB, 2-byte parameter list length (max 65535 bytes). Required for mode pages with sub-pages, recommended for modern code. Universally supported on optical drives manufactured after 2003.",
        ],
      },
      {
        id: "which-form-to-use",
        heading: "Which form does Heirvo send, and the fallback strategy",
        paragraphs: [
          "Most recovery tools send the 10-byte form because it handles all parameter list sizes uniformly. A few cases exist where a drive accepts MODE SELECT(6) but rejects MODE SELECT(10), or vice versa — this is rare but it happens with old or weird drives. Best-practice implementations try the 10-byte form first; if it returns sense_key 0x5 (ILLEGAL_REQUEST) with ASC 0x20 (INVALID COMMAND OPERATION CODE), they fall back to the 6-byte form.",
          "Heirvo currently sends only the 10-byte form. A 6-byte fallback is on the roadmap and may improve compatibility on older slim USB drives that currently fall back to default behaviour.",
        ],
      },
      {
        id: "why-undocumented",
        heading: "Why this isn't well-documented elsewhere",
        paragraphs: [
          "MODE SELECT page 01h is fully documented in the SCSI MMC specifications (MMC-6 is the current revision), but those are 1,000-page technical documents written for drive manufacturers. The information that's relevant to recovery — 'send this command before reading and your tool stops hanging' — has historically lived in source code comments in open-source projects (libdvdread, libcdio, ddrescue) and forum posts on Doom9, MyCE, and r/datahoarder.",
          "Commercial recovery vendors don't publish their SCSI command sequences as marketing material — it's competitive advantage. IsoBuster has been doing this for 20 years and never explained it in their docs; users discover the behaviour by reading SCSI traces.",
          "The result is that 'why does my recovery tool hang on damaged discs?' is one of the most-asked, worst-answered questions in optical recovery. The answer is almost always: MODE SELECT wasn't sent, or the drive rejected it, or there's no host-side watchdog around the IOCTL. We hope this guide closes that information gap for anyone trying to understand the failure mode.",
        ],
      },
      {
        id: "open-source-references",
        heading: "Open-source code references for further reading",
        paragraphs: [
          "If you want to see real implementations of MODE SELECT page 01h in production recovery code, these are the canonical sources:",
        ],
        items: [
          "**libdvdread** (videolan/libdvdread on GitHub) — the library VLC uses to read DVDs. See `src/dvd_input.c` for the MODE SELECT call sequence.",
          "**libcdio** (libcdio/libcdio) — generic MMC bindings for CD/DVD/BD; clean C reference for all the SCSI commands recovery work needs.",
          "**ddrescue** (GNU; gnu.org/software/ddrescue) — Antonio Diaz Diaz's recovery tool; the canonical 5-phase recovery algorithm with MODE SELECT applied per device.",
          "**dvdisaster** (lrq3000/dvdisaster) — error-correction sidecar for backups; includes detailed MODE SELECT logic and a `--read-attempts` flag that lets you tune retry count from the command line.",
          "**DiscImageCreator** (saramibreak/DiscImageCreator) — gold-standard CD/DVD imaging tool, especially strong on C2 error flag handling combined with MODE SELECT DCR=1 raw reads.",
          "**MakeMKV** (closed-source but documented in MakeMKV forum) — disc decryption + ripping; uses MODE SELECT with custom retry counts tuned for Blu-ray recovery.",
        ],
      },
    ],
    faq: [
      {
        q: "Is MODE SELECT a 'fix' for damaged discs or just an optimization?",
        a: "Both, depending on the disc. It's always a speed optimization — the same data either reads or doesn't, but with MODE SELECT applied the host knows immediately rather than 6 seconds later. On borderline-readable sectors, the speedup also enables smarter host-side retry strategies (different speeds, reverse-direction reads) that can succeed where blind firmware retries failed. So yes, MODE SELECT often recovers data that drive-default behaviour misses.",
      },
      {
        q: "Why don't all recovery tools send MODE SELECT?",
        a: "Three reasons. First, simple file-copy tools (Windows Explorer, basic freeware) only use high-level OS file APIs and never touch SCSI directly. Second, some recovery tool developers don't know about the technique — it's documented in dense MMC specs and source code, not in marketing. Third, MODE SELECT requires SCSI Pass-Through Interface (SPTI) on Windows, which needs administrator privileges and proper buffer alignment — a real implementation effort. The result is that tools split into 'mature' (sends MODE SELECT) and 'naive' (doesn't), with the mature group dramatically outperforming on damaged media.",
      },
      {
        q: "Will MODE SELECT damage my drive or disc?",
        a: "No. MODE SELECT only configures parameters for the current session — the drive forgets them on power cycle or media change. It doesn't physically affect the laser, the spindle, or any other component. The worst case is the drive returns sense_key 0x5 (ILLEGAL_REQUEST), which is harmless: recovery falls back to drive defaults and continues.",
      },
      {
        q: "What's the difference between MODE SELECT page 01h and MODE SENSE page 01h?",
        a: "MODE SELECT writes settings TO the drive; MODE SENSE reads current settings FROM the drive. Recovery tools typically use MODE SELECT to set values without first reading what's there (the parameter list always specifies a complete page). A more careful implementation would MODE SENSE first to see what the drive currently has, modify only what's needed, and MODE SELECT back — but the simpler 'write known-good values directly' pattern works for recovery in practice.",
      },
      {
        q: "Does MODE SELECT page 01h work on Blu-ray drives?",
        a: "Yes. The page is part of the SCSI MMC spec which covers all optical media — CD, DVD, BD, HD DVD. Pioneer BDR-series Blu-ray drives accept it and apply it to Blu-ray reads. The same Read Retry Count = 1 optimization applies equally to scratched Blu-ray discs.",
      },
      {
        q: "What does 'sense_key 0x5 ASC 0x20' actually mean?",
        a: "Sense_key 0x5 is ILLEGAL_REQUEST — the drive understood the command structure but rejected the specific request. ASC (Additional Sense Code) 0x20 is INVALID COMMAND OPERATION CODE — the drive doesn't recognise this command at all. ASC 0x24 is INVALID FIELD IN CDB — the command was recognised but a field has an unsupported value. ASC 0x26 is INVALID FIELD IN PARAMETER LIST — the parameter data had an issue. Recovery software should treat all of these as 'command rejected, fall back to defaults'.",
      },
      {
        q: "Can I send MODE SELECT manually with a command-line tool?",
        a: "On Linux, yes — sg_modes (part of sg3_utils) can read and write mode pages directly. On Windows it's harder without writing your own SPTI code, though projects like sgwin port some sg3_utils functionality. For practical recovery work, just use a tool that sends MODE SELECT automatically — every mature recovery tool does this without user intervention.",
      },
      {
        q: "Does Heirvo expose Read Retry Count as a user setting?",
        a: "Not in the UI today — Heirvo sets it to 1 and lets the host-side retry logic handle escalation. The roadmap includes a 'Patient mode' that experiments with higher retry counts plus longer delays for stubborn sectors. For most use cases the default (firmware retry = 1, host retry = configurable per pass) gives the best speed/recovery trade-off.",
      },
    ],
    cta: {
      heading: "Recovery software that understands the SCSI layer",
      body: "Heirvo's engine implements MODE SELECT page 01h, host-side SCSI watchdog timers, fast-path skip-ahead on kernel timeouts, and the rest of the recovery patterns covered in this guide. Free to scan; pay only when you save the files.",
      primaryLabel: "Download Heirvo Free",
      primaryHref: "/download",
      secondaryLabel: "See the source on GitHub",
      secondaryHref: "https://github.com/JungleLivingPai/heirvo",
    },
  },
];

export default GUIDES;

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
