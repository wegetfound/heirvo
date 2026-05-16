//! Windows SCSI pass-through implementation for raw DVD sector reads.
//!
//! Uses `DeviceIoControl` with `IOCTL_SCSI_PASS_THROUGH_DIRECT` to send
//! SCSI MMC commands directly to the optical drive:
//! - READ(10)        — opcode 0x28, used for raw sector reads
//! - READ CAPACITY   — opcode 0x25, returns total LBAs and sector size
//! - INQUIRY         — opcode 0x12, returns vendor/model/firmware
//!
//! Reference: SCSI Multimedia Commands (MMC-6) specification.
//!
//! ## Safety
//! All `DeviceIoControl` calls go through `unsafe` blocks; SENSE buffers and
//! status codes are validated before returning data to the caller.

use crate::disc::drive::{DriveCapabilities, DriveInfo};
use crate::disc::sector::{
    ReadOptions, SectorError, SectorReadResult, SectorReader, DVD_SECTOR_SIZE, MAX_BLOCK_SECTORS,
};
use std::io;
use std::os::windows::io::AsRawHandle;
use std::time::Instant;

/// Page-aligned heap buffer for SCSI DMA transfers.
///
/// Windows' `IOCTL_SCSI_PASS_THROUGH_DIRECT` requires the data buffer to satisfy
/// the host adapter's alignment mask (often page-sized). Plain `Vec<u8>` only
/// guarantees byte alignment, which can cause `ERROR_INVALID_PARAMETER` on
/// alignment-sensitive controllers — particularly with multi-sector transfers.
struct AlignedBuffer {
    ptr: *mut u8,
    layout: std::alloc::Layout,
    len: usize,
}

impl AlignedBuffer {
    fn new(len: usize, align: usize) -> Self {
        if len == 0 {
            // Zero-length case: don't allocate, store dummy layout. Drop is a no-op.
            return Self {
                ptr: std::ptr::null_mut(),
                layout: std::alloc::Layout::from_size_align(1, 1).unwrap(),
                len: 0,
            };
        }
        let layout = std::alloc::Layout::from_size_align(len, align)
            .expect("invalid layout for AlignedBuffer");
        // SAFETY: layout has size >= 1; we zero-init below.
        let ptr = unsafe { std::alloc::alloc_zeroed(layout) };
        if ptr.is_null() {
            std::alloc::handle_alloc_error(layout);
        }
        Self { ptr, layout, len }
    }

    fn as_mut_slice(&mut self) -> &mut [u8] {
        if self.len == 0 {
            return &mut [];
        }
        // SAFETY: ptr was allocated for `len` bytes and is non-null.
        unsafe { std::slice::from_raw_parts_mut(self.ptr, self.len) }
    }

    fn as_slice(&self) -> &[u8] {
        if self.len == 0 {
            return &[];
        }
        // SAFETY: ptr was allocated for `len` bytes and is non-null.
        unsafe { std::slice::from_raw_parts(self.ptr, self.len) }
    }
}

impl Drop for AlignedBuffer {
    fn drop(&mut self) {
        if self.len > 0 && !self.ptr.is_null() {
            // SAFETY: matched alloc/dealloc with the same layout.
            unsafe { std::alloc::dealloc(self.ptr, self.layout) };
        }
    }
}

unsafe impl Send for AlignedBuffer {}
unsafe impl Sync for AlignedBuffer {}

use windows::core::PCWSTR;
use windows::Win32::Foundation::{CloseHandle, GENERIC_READ, GENERIC_WRITE, HANDLE};
use windows::Win32::Storage::FileSystem::{
    CreateFileW, FILE_FLAG_NO_BUFFERING, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
};
use windows::Win32::System::IO::DeviceIoControl;

/// IOCTL_SCSI_PASS_THROUGH_DIRECT control code.
const IOCTL_SCSI_PASS_THROUGH_DIRECT: u32 = 0x4D014;
/// IOCTL_STORAGE_CHECK_VERIFY — returns success iff media is present.
/// Doesn't spin up the drive, so safe to poll repeatedly.
const IOCTL_STORAGE_CHECK_VERIFY: u32 = 0x2D4800;

/// SCSI READ(10) opcode — reads 10-byte LBA range.
const SCSI_OP_READ_10: u8 = 0x28;
/// SCSI READ CAPACITY(10) opcode.
const SCSI_OP_READ_CAPACITY: u8 = 0x25;
/// SCSI INQUIRY opcode.
const SCSI_OP_INQUIRY: u8 = 0x12;
/// SCSI MODE SELECT(10) — configures drive parameters via mode pages.
const SCSI_OP_MODE_SELECT_10: u8 = 0x55;
/// MMC SET CD SPEED — sets drive read/write speed in KB/s.
const SCSI_OP_SET_CD_SPEED: u8 = 0xBB;
/// MMC GET CONFIGURATION — returns supported features and current disc profile.
const SCSI_OP_GET_CONFIGURATION: u8 = 0x46;
/// MMC READ DISC INFORMATION — returns finalized state, session count, disc type.
const SCSI_OP_READ_DISC_INFORMATION: u8 = 0x51;

// MMC current-profile codes (subset). Returned in bytes [6..8] of GET CONFIGURATION.
const PROFILE_NO_DISC: u16 = 0x0000;
const PROFILE_CD_ROM: u16 = 0x0008;
const PROFILE_CD_R: u16 = 0x0009;
const PROFILE_CD_RW: u16 = 0x000A;
const PROFILE_DVD_ROM: u16 = 0x0010;
const PROFILE_DVD_R: u16 = 0x0011;
const PROFILE_DVD_RAM: u16 = 0x0012;
const PROFILE_DVD_RW_RESTRICTED: u16 = 0x0013;
const PROFILE_DVD_RW_SEQUENTIAL: u16 = 0x0014;
const PROFILE_DVD_R_DL_SEQUENTIAL: u16 = 0x0015;
const PROFILE_DVD_R_DL_JUMP: u16 = 0x0016;
const PROFILE_DVD_PLUS_RW: u16 = 0x001A;
const PROFILE_DVD_PLUS_R: u16 = 0x001B;
const PROFILE_DVD_PLUS_RW_DL: u16 = 0x002A;
const PROFILE_DVD_PLUS_R_DL: u16 = 0x002B;
const PROFILE_BD_ROM: u16 = 0x0040;
const PROFILE_BD_R_SRM: u16 = 0x0041;
const PROFILE_BD_R_RRM: u16 = 0x0042;
const PROFILE_BD_RE: u16 = 0x0043;
const PROFILE_HD_DVD_ROM: u16 = 0x0050;
const PROFILE_HD_DVD_R: u16 = 0x0051;
const PROFILE_HD_DVD_RAM: u16 = 0x0052;

/// MMC speed constant: 4× CD speed in KB/s.
///
/// On damaged or scratched discs, slow reads dramatically improve recovery
/// chances — less spindle vibration means the laser pickup stays on track
/// across micro-scratches. Most consumer drives accept this value verbatim
/// for CDs; for DVDs/BDs the firmware scales it to a comparable low speed.
/// IsoBuster, dvdisaster and DiscImageCreator all default to this range
/// for recovery work.
const CD_SPEED_RECOVERY_KBPS: u16 = 706;

const SCSI_IOCTL_DATA_IN: u8 = 1;
#[allow(dead_code)]
const SCSI_IOCTL_DATA_OUT: u8 = 0;

/// SCSI sense key extracted from the SENSE buffer (bytes [2] & 0x0F).
const SENSE_KEY_NO_SENSE: u8 = 0x00;
const SENSE_KEY_NOT_READY: u8 = 0x02;
const SENSE_KEY_MEDIUM_ERROR: u8 = 0x03;
const SENSE_KEY_HARDWARE_ERROR: u8 = 0x04;
const SENSE_KEY_ILLEGAL_REQUEST: u8 = 0x05;

#[repr(C)]
#[derive(Default)]
struct ScsiPassThroughDirect {
    length: u16,
    scsi_status: u8,
    path_id: u8,
    target_id: u8,
    lun: u8,
    cdb_length: u8,
    sense_info_length: u8,
    data_in: u8,
    data_transfer_length: u32,
    timeout_value: u32,
    data_buffer: *mut std::ffi::c_void,
    sense_info_offset: u32,
    cdb: [u8; 16],
}

#[repr(C)]
struct ScsiPassThroughDirectWithBuffer {
    sptd: ScsiPassThroughDirect,
    /// Padding so SENSE buffer is properly aligned after the struct.
    _padding: u32,
    sense_buffer: [u8; 32],
}

fn create_handle(path: &str) -> io::Result<HANDLE> {
    let wide: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe {
        CreateFileW(
            PCWSTR(wide.as_ptr()),
            (GENERIC_READ | GENERIC_WRITE).0,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            None,
            OPEN_EXISTING,
            FILE_FLAG_NO_BUFFERING,
            None,
        )
    }
    .map_err(|e| io::Error::other(format!("CreateFileW({path}): {e}")))
}

/// Open a raw handle to an optical drive. The path should be `\\.\X:` form.
pub fn open_drive(path: &str) -> io::Result<DriveHandle> {
    let handle = create_handle(path)?;
    Ok(DriveHandle {
        handle: parking_lot::Mutex::new(handle),
        path: path.to_string(),
    })
}

pub struct DriveHandle {
    /// Mutex-protected so we can transparently re-open the handle if Windows
    /// reports the device disconnected (common with bus-powered USB drives
    /// that brown out under load).
    handle: parking_lot::Mutex<HANDLE>,
    pub path: String,
}

impl DriveHandle {
    /// Close the current handle and open a fresh one. Used as a recovery
    /// step when the OS reports the drive vanished mid-IOCTL.
    pub fn reopen(&self) -> io::Result<()> {
        let mut guard = self.handle.lock();
        let old = *guard;
        if !old.is_invalid() {
            unsafe {
                let _ = CloseHandle(old);
            }
        }
        let new = create_handle(&self.path)?;
        *guard = new;
        drop(guard);
        // Recovery mode settings don't persist across handle reopens — the drive
        // resets MODE SELECT page 01h to defaults on UNIT ATTENTION. Reapply.
        apply_recovery_mode_settings(self);
        Ok(())
    }

    /// Get the current raw handle for an IOCTL call.
    pub fn current(&self) -> HANDLE {
        *self.handle.lock()
    }
}

impl AsRawHandle for DriveHandle {
    fn as_raw_handle(&self) -> std::os::windows::io::RawHandle {
        self.current().0 as _
    }
}

impl Drop for DriveHandle {
    fn drop(&mut self) {
        let h = *self.handle.lock();
        if !h.is_invalid() {
            unsafe {
                let _ = CloseHandle(h);
            }
        }
    }
}

unsafe impl Send for DriveHandle {}
unsafe impl Sync for DriveHandle {}

// Windows error codes that indicate the drive has likely become unresponsive
// or temporarily disconnected (typical on bus-powered USB DVD drives under
// power stress). When we see these, a re-open + brief pause often recovers:
//
// - 0x80070079 ERROR_SEM_TIMEOUT       — kernel I/O timeout
// - 0x80070037 ERROR_DEV_NOT_EXIST     — drive vanished mid-IOCTL
// - 0x8007001F ERROR_GEN_FAILURE       — drive in error state
// - 0x80070015 ERROR_NOT_READY         — drive spinning up / not ready

fn is_drive_disconnect_error(e: &io::Error) -> bool {
    let s = e.to_string();
    s.contains("0x80070079")  // ERROR_SEM_TIMEOUT
        || s.contains("0x80070037")  // ERROR_DEV_NOT_EXIST
        || s.contains("0x8007001F")  // ERROR_GEN_FAILURE
        || s.contains("0x80070015")  // ERROR_NOT_READY
}

/// Check whether the drive currently has readable media inserted.
/// Returns `true` for "media present", `false` otherwise. Never spins the drive.
pub fn has_media(drive: &DriveHandle) -> bool {
    let mut bytes_returned: u32 = 0;
    let result = unsafe {
        DeviceIoControl(
            drive.current(),
            IOCTL_STORAGE_CHECK_VERIFY,
            None,
            0,
            None,
            0,
            Some(&mut bytes_returned),
            None,
        )
    };
    result.is_ok()
}

/// Raw SCSI pass-through — issues `IOCTL_SCSI_PASS_THROUGH_DIRECT` and blocks
/// until the kernel returns (which on a hosed drive can be **forever**).
/// Callers should use `scsi_passthrough` (the watchdog-wrapped version) unless
/// they explicitly know the IOCTL is fast.
///
/// Takes a raw `HANDLE` (Copy) so it can be sent across thread boundaries —
/// the watchdog spawns a worker thread that owns the buffer and calls this.
fn scsi_passthrough_raw(
    handle: HANDLE,
    cdb: &[u8],
    data_buf: &mut [u8],
    direction: u8,
    timeout_secs: u32,
) -> io::Result<(u8, [u8; 32])> {
    let mut req = ScsiPassThroughDirectWithBuffer {
        sptd: ScsiPassThroughDirect {
            length: std::mem::size_of::<ScsiPassThroughDirect>() as u16,
            cdb_length: cdb.len() as u8,
            sense_info_length: 32,
            data_in: direction,
            data_transfer_length: data_buf.len() as u32,
            timeout_value: timeout_secs,
            data_buffer: data_buf.as_mut_ptr() as *mut _,
            sense_info_offset: (std::mem::size_of::<ScsiPassThroughDirect>() + 4) as u32,
            ..Default::default()
        },
        _padding: 0,
        sense_buffer: [0u8; 32],
    };
    req.sptd.cdb[..cdb.len()].copy_from_slice(cdb);

    let mut bytes_returned: u32 = 0;
    let result = unsafe {
        DeviceIoControl(
            handle,
            IOCTL_SCSI_PASS_THROUGH_DIRECT,
            Some(&req as *const _ as *const _),
            std::mem::size_of::<ScsiPassThroughDirectWithBuffer>() as u32,
            Some(&mut req as *mut _ as *mut _),
            std::mem::size_of::<ScsiPassThroughDirectWithBuffer>() as u32,
            Some(&mut bytes_returned),
            None,
        )
    };

    if let Err(e) = result {
        return Err(io::Error::other(format!("DeviceIoControl: {e}")));
    }

    Ok((req.sptd.scsi_status, req.sense_buffer))
}

/// Send a SCSI command via `IOCTL_SCSI_PASS_THROUGH_DIRECT`, **wrapped in a
/// host-side watchdog**. This is the function nearly every caller wants.
///
/// ## Why a watchdog is required
///
/// The `TimeOutValue` field in `SCSI_PASS_THROUGH_DIRECT` is a *hint to the
/// drive* about how long the command should take. It is **not** a hard kill
/// switch on the host side. When a USB-ATAPI bridge chip enters a hosed
/// state (common with cheap slim drives — every consumer recovery tool sees
/// this), the kernel I/O Request Packet keeps waiting for the device to
/// respond, and `DeviceIoControl` blocks the caller indefinitely. We've
/// observed real waits of tens of minutes on a single dead sector.
///
/// This wrapper spawns a worker thread to run the raw IOCTL, then waits at
/// most `watchdog_secs` (≈ drive timeout + 2s) for a result via a channel.
/// On timeout we return `ErrorKind::TimedOut`, the engine marks the block
/// failed, skip-ahead jumps past the damaged region, and the scan keeps
/// progressing. The orphaned worker thread eventually completes (or doesn't)
/// when the OS gives up on the IRP — we don't care, because we've already
/// moved on.
///
/// Trade-off: each call costs one thread spawn + one channel send/recv,
/// roughly 100–200 µs of overhead. Negligible compared to even a healthy
/// optical read (~10 ms minimum), and the alternative is infinite blocking.
fn scsi_passthrough(
    drive: &DriveHandle,
    cdb: &[u8],
    data_buf: &mut [u8],
    direction: u8,
    timeout_secs: u32,
) -> io::Result<(u8, [u8; 32])> {
    // Windows kernel handles are thread-agnostic, but `HANDLE` wraps a raw
    // pointer so it's not auto-`Send`. Round-trip through `usize` for the
    // ride across to the watchdog worker thread.
    let handle_raw: usize = drive.current().0 as usize;
    let cdb_owned: Vec<u8> = cdb.to_vec();
    let buf_len = data_buf.len();

    // Worker owns a page-aligned copy of the buffer for the duration of the
    // call. On success the data comes back via the channel; on watchdog timeout
    // the worker keeps the buffer until the kernel finally releases the IRP.
    let mut worker_buf = AlignedBuffer::new(buf_len, 4096);
    if direction == SCSI_IOCTL_DATA_OUT && buf_len > 0 {
        worker_buf.as_mut_slice().copy_from_slice(data_buf);
    }

    // Watchdog deadline: drive-side timeout + 2 s grace, clamped to a sane
    // range. 30 s upper bound prevents truly catastrophic stalls; 5 s lower
    // bound covers the small-IOCTL fast path (INQUIRY, MODE SELECT, etc.).
    let watchdog_secs = (timeout_secs as u64 + 2).clamp(5, 30);

    let (tx, rx) = std::sync::mpsc::sync_channel::<io::Result<(u8, [u8; 32], AlignedBuffer)>>(1);
    std::thread::spawn(move || {
        let handle = HANDLE(handle_raw as *mut std::ffi::c_void);
        let mut buf = worker_buf;
        let outcome = scsi_passthrough_raw(handle, &cdb_owned, buf.as_mut_slice(), direction, timeout_secs);
        let _ = tx.send(outcome.map(|(s, sense)| (s, sense, buf)));
    });

    match rx.recv_timeout(std::time::Duration::from_secs(watchdog_secs)) {
        Ok(Ok((status, sense, buf))) => {
            if direction == SCSI_IOCTL_DATA_IN && buf_len > 0 {
                data_buf.copy_from_slice(buf.as_slice());
            }
            Ok((status, sense))
        }
        Ok(Err(e)) => Err(e),
        Err(_) => {
            tracing::warn!(
                "SCSI watchdog tripped after {}s; declaring failure and orphaning worker thread (kernel IRP will finish on its own)",
                watchdog_secs
            );
            Err(io::Error::new(
                io::ErrorKind::TimedOut,
                format!("SCSI watchdog: drive did not respond within {watchdog_secs}s"),
            ))
        }
    }
}

/// Issue an IOCTL with auto-recover on device-disconnect. If the first try
/// returns an error indicating the drive vanished, we wait a beat, re-open
/// the handle, and try once more. Returns the result of the second attempt
/// (or the first if it succeeded or had a non-disconnect error).
fn scsi_passthrough_resilient(
    drive: &DriveHandle,
    cdb: &[u8],
    data_buf: &mut [u8],
    direction: u8,
    timeout_secs: u32,
) -> io::Result<(u8, [u8; 32])> {
    match scsi_passthrough(drive, cdb, data_buf, direction, timeout_secs) {
        Ok(v) => Ok(v),
        Err(e) if is_drive_disconnect_error(&e) => {
            tracing::warn!(
                "drive disconnect detected ({e}); pausing 3s and re-opening handle"
            );
            std::thread::sleep(std::time::Duration::from_secs(3));
            if let Err(re) = drive.reopen() {
                tracing::error!("drive reopen failed: {re}");
                return Err(e);
            }
            tracing::info!("drive re-opened, retrying IOCTL");
            scsi_passthrough(drive, cdb, data_buf, direction, timeout_secs)
        }
        Err(e) => Err(e),
    }
}

/// Map a SCSI sense buffer to our internal `SectorError`.
fn sense_to_error(sense: &[u8; 32]) -> SectorError {
    if sense[0] == 0 {
        return SectorError::Other;
    }
    let key = sense[2] & 0x0F;
    match key {
        SENSE_KEY_NO_SENSE => SectorError::Other,
        SENSE_KEY_NOT_READY => SectorError::HardwareError,
        SENSE_KEY_MEDIUM_ERROR => SectorError::MediumError,
        SENSE_KEY_HARDWARE_ERROR => SectorError::HardwareError,
        SENSE_KEY_ILLEGAL_REQUEST => SectorError::IllegalRequest,
        _ => SectorError::Other,
    }
}

/// Configure the drive for damaged-media recovery reads.
///
/// This is the single biggest reason IsoBuster, dvdisaster, and DiscImageCreator
/// can recover discs where naive SCSI pass-through code stalls indefinitely.
/// Without these commands, a DVD drive's firmware will retry each bad sector
/// 8–16 times internally — each retry costs ~300–500 ms — so a single
/// uncorrectable sector blocks the host for 5+ seconds with no progress.
/// On a damaged region of 100 sectors that's ~10 minutes of frozen UI.
///
/// We send two MMC commands at drive-open time (and again on every reopen):
///
/// 1. **MODE SELECT(10) Page 01h** — Read-Write Error Recovery Parameters.
///    Sets Read Retry Count to 1 and configures bits so the drive returns
///    fast on errors with full sense data, letting host-side logic decide
///    whether to retry, slow down, skip, or reverse-read.
///
/// 2. **SET CD SPEED** — drops the drive to ~4× CD speed (or the equivalent
///    slow speed for DVD/BD). Reduces vibration, which is the dominant cause
///    of failed reads on scratched media. AccurateRip / DiscImageCreator
///    consensus is "slower = more recovery".
///
/// Both commands are best-effort: if the drive rejects them (older drives,
/// USB bridges that don't pass through MMC commands), we log and continue
/// with default behavior. The recovery engine still works without them —
/// it's just much slower on damaged regions.
fn apply_recovery_mode_settings(drive: &DriveHandle) {
    // MODE SELECT(10) — 16-byte parameter list = 8-byte header + Page 01 (8 bytes)
    let param_list: [u8; 16] = [
        // Mode Parameter Header (8 bytes)
        0x00, // Mode Data Length (ignored on SELECT)
        0x00, // Medium Type
        0x00, // Device-specific (WP/DPOFUA — 0 for read mode)
        0x00, // Block Descriptor Length (0 = none)
        0x00, 0x00, 0x00, 0x00,
        // Page 01h — Read-Write Error Recovery Parameters (8 bytes)
        0x01, // PS=0, SPF=0, Page Code=0x01
        0x06, // Page Length = 6
        // Byte 2 of page: error recovery bits
        //   AWRE=0  bit7 — don't auto-reallocate writes (we don't write)
        //   ARRE=0  bit6 — don't auto-reallocate reads (would mask defects)
        //   TB=1    bit5 — Transfer Block despite error (we want partial data)
        //   RC=0    bit4 — don't suppress error reporting (we need sense)
        //   EER=0   bit3 — no Early Recovery (slower path; bad for damage)
        //   PER=1   bit2 — Post Error — emit sense data on retry exhaustion
        //   DTE=0   bit1 — don't Disable Transfer on Error
        //   DCR=0   bit0 — let drive correct via ECC (we lack software ECC for now)
        0b00100100, // = 0x24
        0x01,       // Read Retry Count = 1 (host retries; firmware fails fast)
        0x00,       // Correction Span
        0x00,       // Head Offset Count
        0x00,       // Data Strobe Offset Count
        0x00,       // Write Retry Count
    ];
    let mode_select_cdb: [u8; 10] = [
        SCSI_OP_MODE_SELECT_10,
        0x10, // PF=1 (page format), SP=0 (don't save)
        0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, param_list.len() as u8, // Parameter List Length MSB/LSB
        0x00,
    ];
    let mut param_buf = param_list;
    match scsi_passthrough(drive, &mode_select_cdb, &mut param_buf, SCSI_IOCTL_DATA_OUT, 5) {
        Ok((0, _)) => {
            tracing::info!("MODE SELECT page 01h applied: read_retries=1, fast-fail enabled");
        }
        Ok((status, sense)) => {
            tracing::warn!(
                "MODE SELECT page 01h refused: status={status:#x} sense_key={:#x} — falling back to drive defaults",
                sense[2] & 0x0F
            );
        }
        Err(e) => {
            tracing::warn!("MODE SELECT page 01h IO error: {e} — falling back to drive defaults");
        }
    }

    // SET CD SPEED — 12-byte CDB. Most consumer drives accept 706 KB/s and
    // translate it to the appropriate slow speed for the inserted media.
    let read_kbps = CD_SPEED_RECOVERY_KBPS;
    let write_kbps: u16 = 0xFFFF; // max — irrelevant for read-only
    let set_speed_cdb: [u8; 12] = [
        SCSI_OP_SET_CD_SPEED,
        0x00,
        ((read_kbps >> 8) & 0xFF) as u8, (read_kbps & 0xFF) as u8,
        ((write_kbps >> 8) & 0xFF) as u8, (write_kbps & 0xFF) as u8,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ];
    let mut empty: [u8; 0] = [];
    match scsi_passthrough(drive, &set_speed_cdb, &mut empty, SCSI_IOCTL_DATA_IN, 10) {
        Ok((0, _)) => {
            tracing::info!("SET CD SPEED applied: {read_kbps} KB/s (recovery-optimized)");
        }
        Ok((status, sense)) => {
            tracing::warn!(
                "SET CD SPEED refused: status={status:#x} sense_key={:#x} — drive may use full speed",
                sense[2] & 0x0F
            );
        }
        Err(e) => {
            tracing::warn!("SET CD SPEED IO error: {e} — drive may use full speed");
        }
    }
}

/// Issue GET CONFIGURATION (0x46) and return the **current** disc profile code.
///
/// The current-profile field at bytes [6..8] of the response identifies what
/// kind of disc (or none) is in the drive: 0x0010 = DVD-ROM, 0x0040 = BD-ROM,
/// 0x0008 = CD-ROM, etc. Returns `PROFILE_NO_DISC` (0x0000) if the drive has
/// no disc OR if the command is rejected (some old or budget drives don't
/// implement 0x46 at all — degrade gracefully).
fn read_current_profile(drive: &DriveHandle) -> u16 {
    // CDB: RT=0x01 (only current features), allocation = 8 bytes (header only).
    let cdb: [u8; 10] = [
        SCSI_OP_GET_CONFIGURATION,
        0x01,
        0x00, 0x00, // Starting Feature Number = 0
        0x00, 0x00, 0x00,
        0x00, 0x08, // Allocation Length MSB/LSB
        0x00,
    ];
    let mut buf = [0u8; 8];
    match scsi_passthrough(drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, 5) {
        Ok((0, _)) => ((buf[6] as u16) << 8) | (buf[7] as u16),
        _ => PROFILE_NO_DISC,
    }
}

/// Convert an MMC current-profile code to a human-readable name.
fn profile_to_name(code: u16) -> &'static str {
    match code {
        PROFILE_NO_DISC => "No disc",
        PROFILE_CD_ROM => "CD-ROM",
        PROFILE_CD_R => "CD-R",
        PROFILE_CD_RW => "CD-RW",
        PROFILE_DVD_ROM => "DVD-ROM",
        PROFILE_DVD_R => "DVD-R",
        PROFILE_DVD_RAM => "DVD-RAM",
        PROFILE_DVD_RW_RESTRICTED => "DVD-RW (restricted)",
        PROFILE_DVD_RW_SEQUENTIAL => "DVD-RW (sequential)",
        PROFILE_DVD_R_DL_SEQUENTIAL => "DVD-R DL (sequential)",
        PROFILE_DVD_R_DL_JUMP => "DVD-R DL (jump)",
        PROFILE_DVD_PLUS_RW => "DVD+RW",
        PROFILE_DVD_PLUS_R => "DVD+R",
        PROFILE_DVD_PLUS_RW_DL => "DVD+RW DL",
        PROFILE_DVD_PLUS_R_DL => "DVD+R DL",
        PROFILE_BD_ROM => "BD-ROM",
        PROFILE_BD_R_SRM => "BD-R (SRM)",
        PROFILE_BD_R_RRM => "BD-R (RRM)",
        PROFILE_BD_RE => "BD-RE",
        PROFILE_HD_DVD_ROM => "HD DVD-ROM",
        PROFILE_HD_DVD_R => "HD DVD-R",
        PROFILE_HD_DVD_RAM => "HD DVD-RAM",
        _ => "Unknown profile",
    }
}

/// Raw fields from READ DISC INFORMATION standard response.
#[allow(dead_code)] // disc_type / last_session_state reserved for upcoming features
#[derive(Debug, Default, Clone, Copy)]
pub(crate) struct DiscInformationRaw {
    /// 00=empty, 01=incomplete (appendable), 10=finalized, 11=other.
    pub disc_status: u8,
    /// 00=empty, 01=incomplete, 11=complete (last session).
    pub last_session_state: u8,
    /// True if the disc media itself is erasable (CD-RW, DVD-RW, BD-RE).
    pub erasable: bool,
    /// Number of recorded sessions on disc (combined MSB+LSB).
    pub num_sessions: u16,
    /// MMC disc type code (byte 8).
    pub disc_type: u8,
}

/// Issue READ DISC INFORMATION (0x51), Data Type 0 (Standard).
///
/// Returns the parsed disc-state fields, or `None` if the drive rejects the
/// command — older drives that only implement CD-ROM mode sometimes don't
/// support 0x51 with the expected layout.
fn read_disc_information(drive: &DriveHandle) -> Option<DiscInformationRaw> {
    let cdb: [u8; 10] = [
        SCSI_OP_READ_DISC_INFORMATION,
        0x00, // Data Type = 0 (Standard)
        0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x22, // Allocation = 34 bytes
        0x00,
    ];
    let mut buf = [0u8; 34];
    match scsi_passthrough(drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, 5) {
        Ok((0, _)) => {
            // Byte 2 packs: disc status (bits 0-1), last session state (2-3), erasable (4).
            let status_byte = buf[2];
            let num_sessions = ((buf[9] as u16) << 8) | (buf[4] as u16);
            Some(DiscInformationRaw {
                disc_status: status_byte & 0x03,
                last_session_state: (status_byte >> 2) & 0x03,
                erasable: (status_byte & 0x10) != 0,
                num_sessions,
                disc_type: buf[8],
            })
        }
        _ => None,
    }
}

/// Run the full pre-scan disc probe: INQUIRY + GET CONFIGURATION + READ DISC INFO.
///
/// This is the **Recovery Plan briefing** — everything Heirvo can learn about
/// the drive and disc before reading a single data sector. The result is fed
/// to the UI so the user knows what they're dealing with before committing
/// to a multi-hour scan. Best-effort: any individual probe failure falls back
/// to sensible defaults rather than aborting the whole briefing.
pub fn probe_disc_profile(path: &str) -> io::Result<crate::disc::drive::DiscProfile> {
    use crate::disc::drive::{DiscProfile, DiscStatus};
    let drive = open_drive(path)?;

    let (vendor, model, firmware) = inquiry(&drive).unwrap_or_default();
    let profile_code = read_current_profile(&drive);
    let profile_name = profile_to_name(profile_code).to_string();
    let info = read_disc_information(&drive);
    let media_present = has_media(&drive);

    let (status, num_sessions, erasable) = match info {
        Some(i) => {
            let s = match i.disc_status {
                0 => DiscStatus::Empty,
                1 => DiscStatus::Incomplete,
                2 => DiscStatus::Finalized,
                _ => DiscStatus::Other,
            };
            (s, i.num_sessions, i.erasable)
        }
        None => (DiscStatus::Other, 0, false),
    };

    Ok(DiscProfile {
        vendor,
        model,
        firmware,
        media_present,
        profile_code,
        profile_name,
        disc_status: status,
        num_sessions,
        erasable,
    })
}

/// Build a SCSI READ(10) CDB.
fn build_read10_cdb(lba: u32, blocks: u16) -> [u8; 10] {
    [
        SCSI_OP_READ_10,
        0,
        ((lba >> 24) & 0xFF) as u8,
        ((lba >> 16) & 0xFF) as u8,
        ((lba >> 8) & 0xFF) as u8,
        (lba & 0xFF) as u8,
        0,
        ((blocks >> 8) & 0xFF) as u8,
        (blocks & 0xFF) as u8,
        0,
    ]
}

/// Per-sector fallback used when a multi-sector block read fails.
///
/// Uses `scsi_passthrough` directly (not the resilient reconnect variant) with
/// a capped 2-second timeout. The resilient path adds 3-second sleep + handle
/// reopen per sector — on a 32-sector failing block that is ~13s × 32 = 7+
/// minutes frozen on a single bad region. Fast fallback bounds worst-case at
/// 2s × 32 = 64 seconds per block, letting the engine mark bad sectors quickly
/// and move on.
fn fast_sector_fallback(
    drive: &DriveHandle,
    start_lba: u64,
    count: u32,
    block_timeout_secs: u32,
) -> Vec<SectorReadResult> {
    // Cap at 2s per sector — enough for the drive to respond if it's going to,
    // short enough that a frozen drive doesn't block the engine for minutes.
    let timeout = block_timeout_secs.min(2).max(1);
    (0..count as u64)
        .map(|i| {
            let lba = start_lba + i;
            let cdb = build_read10_cdb(lba as u32, 1);
            let mut buf = vec![0u8; DVD_SECTOR_SIZE];
            let started = Instant::now();
            match scsi_passthrough(drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, timeout) {
                Ok((0, _)) => {
                    SectorReadResult::ok(lba, buf, started.elapsed().as_millis() as u32)
                }
                Ok((_, sense)) => {
                    SectorReadResult::err(lba, sense_to_error(&sense), 1, started.elapsed().as_millis() as u32)
                }
                Err(_) => {
                    SectorReadResult::err(lba, SectorError::Timeout, 1, started.elapsed().as_millis() as u32)
                }
            }
        })
        .collect()
}

pub struct ScsiSectorReader {
    drive: DriveHandle,
    capacity_lba: u64,
}

impl ScsiSectorReader {
    pub fn open(path: &str) -> io::Result<Self> {
        let drive = open_drive(path)?;
        // Configure for recovery BEFORE the first read. Order matters: the
        // first READ CAPACITY would otherwise trigger drive spin-up at full
        // speed and let firmware retry defaults bake in for the session.
        apply_recovery_mode_settings(&drive);
        let capacity_lba = read_capacity(&drive)?;
        Ok(Self { drive, capacity_lba })
    }
}

impl SectorReader for ScsiSectorReader {
    fn read_sector(&self, lba: u64, opts: ReadOptions) -> SectorReadResult {
        if lba >= self.capacity_lba {
            return SectorReadResult::err(lba, SectorError::IllegalRequest, 0, 0);
        }

        let timeout_secs = (opts.timeout_ms / 1000).max(5);
        let cdb = build_read10_cdb(lba as u32, 1);
        let mut buf = vec![0u8; DVD_SECTOR_SIZE];
        let mut last_err = SectorError::Other;
        let mut attempts: u8 = 0;
        let started = Instant::now();

        for attempt in 0..=opts.retries {
            attempts = attempt + 1;
            match scsi_passthrough_resilient(&self.drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, timeout_secs) {
                Ok((status, sense)) => {
                    if status == 0 {
                        let elapsed = started.elapsed().as_millis() as u32;
                        return SectorReadResult::ok(lba, buf, elapsed);
                    }
                    last_err = sense_to_error(&sense);
                    if matches!(last_err, SectorError::IllegalRequest) {
                        break;
                    }
                }
                Err(e) => {
                    tracing::debug!("SCSI passthrough I/O error at LBA {lba}: {e}");
                    last_err = if e.kind() == io::ErrorKind::TimedOut {
                        SectorError::Timeout
                    } else {
                        SectorError::Other
                    };
                }
            }
        }

        let elapsed = started.elapsed().as_millis() as u32;
        SectorReadResult::err(lba, last_err, attempts, elapsed)
    }

    fn read_block(&self, start_lba: u64, count: u32, opts: ReadOptions) -> Vec<SectorReadResult> {
        if count == 0 {
            return Vec::new();
        }
        if count == 1 || start_lba >= self.capacity_lba {
            return vec![self.read_sector(start_lba, opts)];
        }

        let remaining = self.capacity_lba - start_lba;
        let n = std::cmp::min(count, MAX_BLOCK_SECTORS) as u64;
        let n = std::cmp::min(n, remaining) as u32;

        let timeout_secs = (opts.timeout_ms / 1000).max(5);
        let cdb = build_read10_cdb(start_lba as u32, n as u16);
        // IOCTL_SCSI_PASS_THROUGH_DIRECT requires the data buffer to be aligned
        // to the host adapter's alignment mask — page alignment (4096) satisfies
        // every consumer driver. A bare Vec<u8> only guarantees u8 alignment,
        // which trips ERROR_INVALID_PARAMETER on some controllers.
        let mut buf = AlignedBuffer::new(n as usize * DVD_SECTOR_SIZE, 4096);
        let started = Instant::now();

        // Use the non-resilient passthrough at block level: the 3s sleep + handle
        // reopen on a transient error costs more than the per-sector fast fallback,
        // and the fallback IS the recovery path. Keep resilient reopens for the
        // sector-level reader (read_sector), where there's no other recovery option.
        let result = scsi_passthrough(&self.drive, &cdb, buf.as_mut_slice(), SCSI_IOCTL_DATA_IN, timeout_secs);
        let elapsed_ms = started.elapsed().as_millis() as u32;
        match result {
            Ok((0, _)) => {
                let per_sector_ms = elapsed_ms.checked_div(n).unwrap_or(0);
                // Log every 1024 sectors (rough heartbeat) or any unusually slow block.
                if start_lba % 1024 == 0 || elapsed_ms > 200 {
                    tracing::info!("read_block ok: lba={start_lba} n={n} took={elapsed_ms}ms");
                }
                let bytes = buf.as_slice();
                (0..n as usize)
                    .map(|i| {
                        let off = i * DVD_SECTOR_SIZE;
                        let sector = bytes[off..off + DVD_SECTOR_SIZE].to_vec();
                        SectorReadResult::ok(start_lba + i as u64, sector, per_sector_ms)
                    })
                    .collect()
            }
            Ok((status, sense)) => {
                tracing::warn!(
                    "Block read non-zero status {status:#x} sense={:#x} at LBA {start_lba} n={n} took={elapsed_ms}ms; falling back to per-sector",
                    sense[2] & 0x0F
                );
                fast_sector_fallback(&self.drive, start_lba, n, timeout_secs)
            }
            Err(e) => {
                // Drive-side timeout OR watchdog timeout OR device-disconnect:
                // every per-sector retry in this region will hit the same wall
                // (5s each × 32 sectors = 2.5 min per block). Short-circuit to
                // failure, let skip-ahead jump past. This is the fix that turns
                // a multi-hour grind through a dead zone into a few minutes.
                //
                // The kernel can return ERROR_SEM_TIMEOUT *before* our watchdog
                // fires, in which case `e.kind()` is `Other` (because the
                // windows crate doesn't map 0x80070079 → TimedOut for us).
                // `is_drive_disconnect_error` catches those exact HRESULTs.
                if e.kind() == io::ErrorKind::TimedOut || is_drive_disconnect_error(&e) {
                    tracing::warn!(
                        "Block timeout at LBA {start_lba} n={n} ({e}); skipping per-sector retry — drive is hosed in this region, skip-ahead will jump past"
                    );
                    return (0..n as u64)
                        .map(|i| SectorReadResult::err(start_lba + i, SectorError::Timeout, 1, elapsed_ms))
                        .collect();
                }
                tracing::warn!(
                    "Block read I/O error at LBA {start_lba} n={n} took={elapsed_ms}ms: {e}; falling back to per-sector"
                );
                fast_sector_fallback(&self.drive, start_lba, n, timeout_secs)
            }
        }
    }

    fn capacity(&self) -> u64 {
        self.capacity_lba
    }
}

/// Issue READ CAPACITY(10) and return total LBAs.
fn read_capacity(drive: &DriveHandle) -> io::Result<u64> {
    let cdb = [SCSI_OP_READ_CAPACITY, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let mut buf = [0u8; 8];
    let (status, sense) = scsi_passthrough(drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, 10)?;
    if status != 0 {
        return Err(io::Error::other(
            format!("READ CAPACITY failed, sense key {:#x}", sense[2] & 0x0F),
        ));
    }
    // First 4 bytes = last LBA (big-endian). Add 1 for total count.
    let last_lba = u32::from_be_bytes([buf[0], buf[1], buf[2], buf[3]]);
    Ok((last_lba as u64) + 1)
}

/// Issue INQUIRY and parse vendor/model/firmware.
fn inquiry(drive: &DriveHandle) -> io::Result<(String, String, String)> {
    let cdb = [SCSI_OP_INQUIRY, 0, 0, 0, 96, 0, 0, 0, 0, 0];
    let mut buf = [0u8; 96];
    let (status, _) = scsi_passthrough(drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, 10)?;
    if status != 0 {
        return Ok(("Unknown".into(), "Unknown".into(), "Unknown".into()));
    }
    let trim = |b: &[u8]| -> String {
        String::from_utf8_lossy(b).trim().to_string()
    };
    Ok((trim(&buf[8..16]), trim(&buf[16..32]), trim(&buf[32..36])))
}

/// Enumerate available optical drives by probing every drive letter A:..Z:
/// and checking which ones respond to INQUIRY.
pub fn enumerate_optical_drives() -> io::Result<Vec<DriveInfo>> {
    let mut drives = Vec::new();
    for letter in b'A'..=b'Z' {
        let letter_str = format!("{}:", letter as char);
        let path = format!("\\\\.\\{}", letter_str);
        let drive = match open_drive(&path) {
            Ok(d) => d,
            Err(_) => continue,
        };

        // Try INQUIRY — only optical drives will succeed with peripheral type 0x05.
        let cdb = [SCSI_OP_INQUIRY, 0, 0, 0, 96, 0, 0, 0, 0, 0];
        let mut buf = [0u8; 96];
        match scsi_passthrough(&drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, 5) {
            Ok((0, _)) => {
                // Peripheral device type is in low 5 bits of byte 0.
                // 0x05 = CD/DVD-ROM device.
                if (buf[0] & 0x1F) != 0x05 {
                    continue;
                }
                let (vendor, model, firmware) = inquiry(&drive).unwrap_or_default();
                let has_media_flag = has_media(&drive);
                drives.push(DriveInfo {
                    path,
                    letter: letter_str,
                    vendor,
                    model,
                    firmware,
                    capabilities: DriveCapabilities {
                        reads_dvd: true,
                        reads_cd: true,
                        reads_bluray: false,
                        supports_speed_control: true,
                    },
                    has_media: has_media_flag,
                });
            }
            _ => continue,
        }
    }
    Ok(drives)
}
