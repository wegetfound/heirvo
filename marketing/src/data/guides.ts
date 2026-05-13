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
];

export default GUIDES;

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
