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
    related: ["recover-home-videos-dvd", "how-long-do-dvds-last-disc-rot"],
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
    related: ["recover-files-scratched-dvd", "best-dvd-recovery-software"],
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
    related: ["recover-data-from-cd-rom-windows", "best-dvd-recovery-software"],
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
    related: ["heirvo-vs-isobuster", "recover-files-scratched-dvd"],
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
    related: ["recover-files-scratched-dvd", "recover-home-videos-dvd"],
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
    related: ["recover-files-scratched-dvd", "kodak-photo-cd-recovery"],
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
    related: ["best-dvd-recovery-software", "recover-files-scratched-dvd"],
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
];

export default GUIDES;

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
