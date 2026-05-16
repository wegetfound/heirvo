# Heirvo — Software Directory Submissions

---

## AlternativeTo

### Short Description (150 chars max)
Recover videos and photos from scratched DVDs, CDs, and Blu-ray. Free scan. Designed for families, not IT pros. Windows 10/11.

### Long Description (500 chars)
Heirvo recovers files from damaged, scratched, or unreadable DVDs, CDs, Blu-ray, and Kodak Photo CDs on Windows 10 and 11. Unlike tools aimed at IT professionals, Heirvo is built for people trying to save family memories — home videos, holiday photos, home recordings. Scan any disc free. Pay $39 once to save everything. A built-in Memory Vault lets you browse and voice-search all your recovered videos. No account required, no subscription, no recurring fee. Mail-in service available from $89 for discs too damaged for software.

### Tags / Categories to Select
- CD/DVD Tools
- Data Recovery
- File Recovery
- Disc Recovery
- Home Video
- Digital Preservation
- Photo Recovery
- Windows

### Competitors to List as Alternatives
- IsoBuster
- CDRoller
- Recuva
- Stellar Data Recovery

---

## SourceForge

### Project Name
Heirvo — DVD & CD Disc Recovery Software

### Short Description (under 75 chars)
Recover files from damaged DVDs, CDs, and Blu-ray. Free scan.

### Full Description

**Heirvo** is a Windows disc recovery tool built for families, not IT departments. If you have a scratched DVD with your child's first steps, a home-burned CD from the early 2000s, or a Kodak Photo CD that modern Windows won't open — Heirvo is built to get those files back.

**How it works**

Heirvo reads each sector of your disc multiple times, varying the read speed and direction across multiple passes. Where a standard file copy gives up after one read failure, Heirvo keeps going — using low-level SCSI techniques that dramatically reduce the time spent on bad sectors while maximising recovery depth. The result is a recovery rate that matches professional lab software, delivered through an interface anyone can use in three clicks.

**What Heirvo recovers**

- DVD Video (VOB, ISO), DVD-R, DVD+R, DVD-RW, DVD+RW
- Data CD, Audio CD, CD-R, CD-RW
- Blu-ray, BD-R
- Kodak Photo CD (.PCD) — converted to JPEG or TIFF automatically

**Three-step process**

1. Insert your disc and open Heirvo
2. Click Scan — completely free, no account required
3. Preview what was found, then pay $39 once to save your files

**Memory Vault**

Every recovered video and photo lands in Heirvo's Memory Vault — a browsable library with voice search. Find footage by describing what you remember: "birthday party", "beach 1998", "Dad's speech."

**Pricing**

- Free tier: full disc scan, file preview
- Pro: $39 one-time, unlimited saves, no subscription
- Mail-in service: from $89 per disc, no-recovery/no-charge guarantee

**Requirements:** Windows 10 or Windows 11 (64-bit), 200 MB disk space, any USB or internal disc drive.

### Categories
- CD/DVD Tools
- File & Disk Management
- Data Recovery

### License
Freeware (scan tier) / Commercial — $39 one-time (save tier)

### OS
Windows 10, Windows 11 (64-bit)

---

## Softpedia

### Program Name
Heirvo

### Short Description (max 250 chars)
Disc recovery software for Windows 10 and 11. Recovers videos, photos, and data from scratched or damaged DVDs, CDs, Blu-ray, and Kodak Photo CDs. Free to scan; one-time $39 fee to save recovered files. No subscription required.

### Full Description (600–1000 words, formal tone)

Heirvo is a disc recovery application for Microsoft Windows 10 and Windows 11, designed to retrieve files from optical media that standard file-copy operations and consumer disc players can no longer read. Supported formats include DVD Video, DVD-R, DVD+R, DVD-RW, DVD+RW, Data CD, Audio CD, CD-R, CD-RW, Blu-ray, BD-R, and Kodak Photo CD (.PCD). The application operates entirely on the local machine: no files are uploaded to external servers during a scan.

**Recovery Engine**

The recovery engine operates at the SCSI command layer, issuing direct read requests to the drive firmware rather than routing through the Windows file system. When a sector read fails, Heirvo reduces the retry count sent to the drive via MODE SELECT (page 01h), shortening the per-sector failure penalty from several seconds to under 100 milliseconds. A watchdog process monitors drive responsiveness throughout the session; should the drive become unresponsive, Heirvo resets the connection and resumes the scan from the last confirmed position rather than restarting from the beginning.

Multiple read passes are performed across each damaged region, alternating forward and reverse read directions and varying the commanded read speed. Data fragments collected across passes are assembled using a sector-level checksum verification step before the recovered content is written to disk.

Kodak Photo CD discs receive dedicated format handling. The .PCD image pyramid is read and the highest available resolution image is extracted and converted to JPEG or TIFF, as the .PCD format is not natively supported by current versions of Windows or Adobe Photoshop (support was removed in Photoshop 2023).

**User Interface**

The application presents a three-step workflow: disc insertion and automatic format detection; free scan with file-level preview; and an optional save step unlocked by a one-time licence payment. No user account is required at any stage. Disc type, format, and drive capabilities are detected automatically on insertion; no manual configuration is necessary.

**Memory Vault**

Recovered video and photo content is organised into a library environment called Memory Vault. The library displays recovered media as a browsable grid and supports voice-search queries, allowing users to locate footage by spoken description. Search operates locally and does not transmit audio or query text to external services.

**Mail-In Recovery Service**

For discs that are too severely damaged for software-based recovery, or for users who do not have access to a compatible disc drive, Heirvo offers a mail-in professional recovery service. Discs are processed using optical recovery hardware in a laboratory environment. If no files are recovered, no charge is applied. Recovered files are delivered to the customer via a time-limited secure download link within 10 to 14 business days.

**Pricing and Licensing**

The scan and preview functions are available at no cost. Saving recovered files requires a one-time payment of USD 39.00. There is no subscription, no annual renewal, and no per-disc fee beyond the initial licence. The mail-in service is priced from USD 89.00 per disc.

**System Requirements**

- Operating system: Windows 10 or Windows 11, 64-bit
- Processor: x64-compatible (Intel or AMD)
- RAM: 4 GB minimum
- Disk space: 200 MB for application installation; additional space required for recovered files
- Drive: any USB external or internal SATA optical disc drive capable of reading the target format

**Compatibility Notes**

On first launch, Windows SmartScreen may display a warning because Heirvo is newly released software without an extensive install history in Microsoft's telemetry. This warning does not indicate the presence of malware. Users may proceed by selecting "More info" followed by "Run anyway." Heirvo contains no adware, bundled third-party software, or background telemetry services.

### Requirements
- Windows 10 or Windows 11 (64-bit)
- 200 MB available disk space
- x64-compatible processor
- Any USB or internal optical disc drive

### Category
CD/DVD Tools

---

## Reddit: r/DataHoarder Post

**Title:** I built a disc recovery app for my mom — and then made it public (heirvo.com)

---

A few years ago my dad's wedding video was on a DVD that wouldn't read. Tried it on three different computers. Tried IsoBuster — stalled for hours on bad sectors, eventually gave up. My mum was devastated because there were no other copies.

That frustration is why I built Heirvo.

It's a Windows app that recovers files from damaged DVDs, CDs, Blu-ray, and Kodak Photo CDs. I spent a long time on the engine — it talks directly to the drive over SCSI instead of going through the Windows file system, so it can cut the time spent on bad sectors from 5 seconds down to roughly 50ms by adjusting the retry count the drive firmware uses. Multiple passes, forward and reverse reads, speed variation. Recovery depth that matches what you'd get from lab tools, wrapped in something a non-technical person can actually use.

**What makes it different from IsoBuster / CDRoller**

Those are excellent tools for people who know what they're doing. Heirvo is for the person whose dad's funeral video is on a scratched disc and who has never heard the word "sector." Three clicks: insert disc, scan (free), save ($39 one-time). That's it.

There's also a Memory Vault — a browsable library for all your recovered videos with voice search, so you can find footage by describing it rather than scrolling through filenames like `VTS_01_1.VOB`.

For discs too far gone for software, there's a mail-in service (from $89, no-recovery/no-charge).

If you're digitising your own archive or helping someone else with theirs, I'd love for you to try it: **heirvo.com**

Happy to answer questions about the recovery engine, format support, or anything else.

---

## Reddit: r/datarecovery Post

**Title:** Built a disc recovery tool using MODE SELECT page 01h to cut bad sector penalty to ~50ms — looking for feedback from people who've done SCSI-level optical recovery

---

Background: I've been working on a consumer disc recovery app (heirvo.com) and wanted to share the core technique for anyone doing similar work, and get input from people who've gone deeper on optical SCSI than I have.

**The core problem with optical recovery tools**

When a drive hits a bad sector it internally retries the read — typically 8 to 16 times before returning an error to the host. At a damaged area this can mean 5+ seconds per sector. Multiply that by a few thousand bad sectors on a heavily scratched disc and you're looking at hours of wall time, most of it spent waiting for the drive to exhaust its internal retry budget.

**The fix: MODE SELECT page 01h**

Sending a MODE SELECT command with the Read-Write Error Recovery page (page 01h) lets you set the retry count (RC) directly in the drive firmware. Setting RC to 1 — one retry instead of 16 — drops the per-sector failure penalty from ~5s to ~50ms on most drives. You then handle multi-pass retry logic at the host level instead: read the sector, if it fails move on, come back to it from the opposite direction at a lower speed on the next pass. Over 5 passes you accumulate enough partial reads to reconstruct most sectors that a single-pass tool would skip entirely.

There's a watchdog process that monitors drive responsiveness — some drives (the GT80N in particular) reject MODE SELECT entirely and need to be handled separately. If the drive stops responding mid-scan the watchdog resets the connection and resumes rather than restarting.

On top of this engine there's a consumer-friendly UI: insert disc, scan free, pay $39 to save. The goal is to give someone recovering their family's home videos the same depth of recovery as a lab tool, without requiring them to understand what a sector is.

Anyone else working at this level — curious what behaviour you've seen from drives that reject page 01h, and whether you've found speed variation strategies that outperform what I'm doing. Link: **heirvo.com**
