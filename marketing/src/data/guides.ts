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
    related: ["recover-files-scratched-dvd", "recover-vhs-converted-dvd"],
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
    related: ["heirvo-vs-isobuster", "free-dvd-recovery-software"],
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
    related: ["recover-files-scratched-dvd", "recover-unfinalized-dvd"],
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
    related: ["recover-wedding-dvd", "recover-home-videos-dvd"],
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
    related: ["recover-files-scratched-dvd", "best-dvd-recovery-software"],
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
    related: ["recover-data-from-cd-rom-windows", "recover-files-scratched-dvd"],
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
    related: ["recover-unfinalized-dvd", "recover-home-videos-dvd"],
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
    related: ["recover-home-videos-dvd", "recover-files-scratched-dvd"],
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
    related: ["recover-files-scratched-dvd", "best-dvd-recovery-software"],
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
    related: ["best-dvd-recovery-software", "heirvo-vs-isobuster"],
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
    related: ["recover-files-scratched-dvd", "recover-home-videos-dvd"],
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
    related: ["recover-data-from-cd-rom-windows", "best-dvd-recovery-software"],
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
];

export default GUIDES;

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
