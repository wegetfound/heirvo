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
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

/// Maximum consecutive reopen attempts before giving up and returning a read
/// error. At 3 s per pause this caps the disconnect/stall window at ~60 s,
/// after which the engine's normal failure handling (skip-ahead / mark Unknown)
/// proceeds instead of hanging indefinitely.
const MAX_REOPEN_ATTEMPTS: u32 = 20;

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

// SAFETY: AlignedBuffer owns heap memory via raw ptr; it is not aliased.
// Send is sound because we transfer ownership exclusively (pool model).
// Sync is intentionally NOT implemented — AlignedBuffer is single-owner.
unsafe impl Send for AlignedBuffer {}

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
/// MMC READ TOC/PMA/ATIP — multi-format TOC command.
const SCSI_OP_READ_TOC: u8 = 0x43;
/// MMC READ CD — raw CD sector extraction with optional C2 error pointer return.
const SCSI_OP_READ_CD: u8 = 0xBE;

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
const SENSE_KEY_UNIT_ATTENTION: u8 = 0x06;
const SENSE_KEY_ABORTED_COMMAND: u8 = 0x0B;

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

/// RAII wrapper around a raw Win32 HANDLE that calls `CloseHandle` on drop.
///
/// Wrapped in `Arc` so the underlying OS handle stays open as long as any
/// pool worker still holds a clone.  `reopen()` atomically swaps the Arc in
/// `DriveHandle::current_handle` — the old Arc (and thus the old OS handle)
/// lives until the last worker clone drops it.
struct OwnedHandle(HANDLE);

impl Drop for OwnedHandle {
    fn drop(&mut self) {
        if !self.0.is_invalid() {
            unsafe {
                let _ = CloseHandle(self.0);
            }
        }
    }
}

// SAFETY: Win32 HANDLE is a kernel object reference; it is safe to use from
// any thread, and the OS reference count prevents premature invalidation.
unsafe impl Send for OwnedHandle {}
unsafe impl Sync for OwnedHandle {}

/// Open a raw handle to an optical drive. The path should be `\\.\X:` form.
pub fn open_drive(path: &str) -> io::Result<DriveHandle> {
    let handle = create_handle(path)?;
    Ok(DriveHandle {
        current_handle: parking_lot::Mutex::new(Arc::new(OwnedHandle(handle))),
        path: path.to_string(),
    })
}

pub struct DriveHandle {
    /// `Arc<OwnedHandle>` behind a mutex.
    ///
    /// Workers clone the Arc *before* calling the blocking IOCTL; as long as
    /// a worker holds its clone the underlying OS HANDLE stays open (the Arc
    /// refcount is > 0).  `reopen()` swaps the `Arc` under the mutex, placing
    /// a fresh handle into `current_handle`.  The old Arc is then released by
    /// `reopen()` — if no worker holds a clone it drops (closing the old OS
    /// handle) immediately; if a worker is mid-IOCTL the old handle stays open
    /// until the worker finishes and drops its clone.  No use-after-close.
    current_handle: parking_lot::Mutex<Arc<OwnedHandle>>,
    pub path: String,
}

impl DriveHandle {
    /// Close the current handle and open a fresh one. Used as a recovery
    /// step when the OS reports the drive vanished mid-IOCTL.
    ///
    /// After this call any new `scsi_passthrough` call will use the new handle.
    /// In-flight workers that already cloned the old Arc continue safely against
    /// the old OS handle until they finish and drop their clone.
    pub fn reopen(&self) -> io::Result<()> {
        let new_raw = create_handle(&self.path)?;
        let new_arc = Arc::new(OwnedHandle(new_raw));
        let old_arc = {
            let mut guard = self.current_handle.lock();
            std::mem::replace(&mut *guard, new_arc)
        };
        // Drop `old_arc` here.  If no worker holds a clone → CloseHandle fires
        // now.  If a worker holds a clone → CloseHandle fires when that worker
        // drops its clone.  Either way: no UAF.
        drop(old_arc);
        // Recovery mode settings don't persist across handle reopens — the drive
        // resets MODE SELECT page 01h to defaults on UNIT ATTENTION. Reapply.
        apply_recovery_mode_settings(self);
        Ok(())
    }

    /// Snapshot the current Arc so a pool worker can hold it independently.
    fn snapshot_handle(&self) -> Arc<OwnedHandle> {
        Arc::clone(&*self.current_handle.lock())
    }

    /// Get the current raw HANDLE value (for one-shot non-pool callers such as
    /// `has_media` which use a direct DeviceIoControl — they run on the calling
    /// thread and complete synchronously before any reopen can occur).
    pub fn current(&self) -> HANDLE {
        self.current_handle.lock().0
    }
}

impl AsRawHandle for DriveHandle {
    fn as_raw_handle(&self) -> std::os::windows::io::RawHandle {
        self.current().0 as _
    }
}

impl Drop for DriveHandle {
    fn drop(&mut self) {
        // The Arc in `current_handle` will be dropped here; OwnedHandle::drop
        // calls CloseHandle when the refcount reaches zero.  If a worker still
        // holds a clone, the close is deferred until the worker finishes.
        // Nothing explicit needed — just let the Arc do its job.
    }
}

unsafe impl Send for DriveHandle {}
unsafe impl Sync for DriveHandle {}

// ── Bounded worker pool for SCSI IOCTLs ─────────────────────────────────────
//
// Problem: the raw `DeviceIoControl` call can block indefinitely when a USB-
// ATAPI bridge enters a hosed state.  The previous fix spawned an *unbounded*
// thread per call; on a damaged disc this leaks hundreds of threads until the
// process hits the OS thread limit.
//
// Fix: a module-level pool of exactly POOL_SIZE long-lived worker threads.
// Jobs are submitted via a bounded sync_channel; timed-out jobs stay *owned*
// by the pool (the worker eventually completes or doesn't, but no new thread
// is ever created after startup).  The caller receives a watchdog timeout
// error and moves on; the worker will eventually free the channel slot when
// the OS releases the IRP.
//
// Pool size: 8 matches the maximum concurrent optical drives Windows supports
// on typical consumer hardware (one per USB root hub port).  Each thread
// blocks at most one IRP, so 8 threads bound the worst-case leaked IRP count.

const POOL_SIZE: usize = 8;

type ScsiJob = Box<dyn FnOnce() + Send + 'static>;

struct ScsiWorkerPool {
    tx: std::sync::Mutex<std::sync::mpsc::SyncSender<ScsiJob>>,
}

impl ScsiWorkerPool {
    fn new() -> Self {
        // Capacity = POOL_SIZE: back-pressure so a flood of timed-out jobs
        // doesn't queue without bound.  When the channel is full, submit()
        // returns Err and the caller gets TimedOut immediately.
        let (tx, rx) = std::sync::mpsc::sync_channel::<ScsiJob>(POOL_SIZE);
        let rx = std::sync::Arc::new(std::sync::Mutex::new(rx));
        for _ in 0..POOL_SIZE {
            let rx2 = std::sync::Arc::clone(&rx);
            std::thread::spawn(move || {
                loop {
                    let job = {
                        let guard = rx2.lock().unwrap();
                        match guard.recv() {
                            Ok(j) => j,
                            Err(_) => break, // channel closed → pool shutdown
                        }
                    };
                    job();
                }
            });
        }
        Self { tx: std::sync::Mutex::new(tx) }
    }

    /// Submit a job.  Returns `Err` if the queue is full (all workers busy
    /// with hung IOCTLs).
    fn submit(&self, job: ScsiJob) -> Result<(), ()> {
        self.tx.lock().unwrap().try_send(job).map_err(|_| ())
    }
}

static SCSI_POOL: once_cell::sync::Lazy<ScsiWorkerPool> =
    once_cell::sync::Lazy::new(ScsiWorkerPool::new);

// Windows error codes that indicate the drive has likely become unresponsive
// or temporarily disconnected (typical on bus-powered USB DVD drives under
// power stress). When we see these, a re-open + brief pause often recovers:
//
// Win32 decimal / hex:
//   121  / 0x79  ERROR_SEM_TIMEOUT           — kernel I/O timeout
//    55  / 0x37  ERROR_DEV_NOT_EXIST         — drive vanished mid-IOCTL
//    31  / 0x1F  ERROR_GEN_FAILURE           — drive in error state
//    21  / 0x15  ERROR_NOT_READY             — drive spinning up / not ready
//  1112  / 0x458 ERROR_NO_MEDIA_IN_DRIVE     — media ejected under load
//  1167  / 0x48F ERROR_DEVICE_NOT_CONNECTED  — USB bus-power loss

fn is_drive_disconnect_error(e: &io::Error) -> bool {
    // Primary path: compare against the raw Win32 error code.
    // `raw_os_error()` returns the Win32 error (not the HRESULT), so
    // ERROR_SEM_TIMEOUT is 121 (not 0x80070079).  This works regardless of
    // Windows locale / error message formatting.
    if let Some(code) = e.raw_os_error() {
        return matches!(
            code,
            121    // ERROR_SEM_TIMEOUT
            | 55   // ERROR_DEV_NOT_EXIST
            | 31   // ERROR_GEN_FAILURE
            | 21   // ERROR_NOT_READY
            | 1112 // ERROR_NO_MEDIA_IN_DRIVE
            | 1167 // ERROR_DEVICE_NOT_CONNECTED
        );
    }
    // Fallback for errors constructed without a raw OS code (e.g. wrapped via
    // io::Error::other).  Match on the HRESULT hex strings the windows crate
    // previously embedded in the message.
    let s = e.to_string();
    s.contains("0x80070079")  // ERROR_SEM_TIMEOUT   (HRESULT form)
        || s.contains("0x80070037")  // ERROR_DEV_NOT_EXIST
        || s.contains("0x8007001F")  // ERROR_GEN_FAILURE
        || s.contains("0x80070015")  // ERROR_NOT_READY
}

/// Check whether the drive currently has readable media inserted.
/// Returns `true` for "media present", `false` otherwise. Never spins the drive.
pub fn has_media(drive: &DriveHandle) -> bool {
    // Fast path: CHECK_VERIFY through the Windows storage stack (no SCSI bridge,
    // never hangs). Success means a disc is present AND ready.
    let mut bytes_returned: u32 = 0;
    let ready = unsafe {
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
    }
    .is_ok();
    if ready {
        return true;
    }

    // CHECK_VERIFY failed. Crucially, this happens in TWO different situations:
    //   1. the disc is genuinely absent (ejected), and
    //   2. the drive spun DOWN while idle and is now spinning back up — it
    //      reports "NOT READY / becoming ready" for several seconds.
    // Treating case 2 as "no disc" made the UI tear down and re-identify the
    // disc on a ~60-90s loop (every idle/spin-up cycle). Ask the drive directly
    // with TEST UNIT READY and read the sense data, so we only report the disc
    // as gone on an explicit MEDIUM NOT PRESENT.
    let cdb = [0u8; 6]; // TEST UNIT READY (opcode 0x00)
    let mut empty: [u8; 0] = [];
    match scsi_passthrough(drive, &cdb, &mut empty, SCSI_IOCTL_DATA_IN, 2) {
        // GOOD status → ready, media present.
        Ok((0, _)) => true,
        // Check condition — NOT READY (0x02) + ASC 0x3A = MEDIUM NOT PRESENT
        // is the only "no disc" verdict; becoming-ready (0x04), unit attention,
        // etc. all mean the disc IS there, just not ready this instant.
        // parse_sense handles both fixed- and descriptor-format sense data.
        Ok((_, sense)) => {
            let (key, asc, _) = parse_sense(&sense);
            !(key == 0x02 && asc == 0x3A)
        }
        // Couldn't reach the drive (timeout / vanished). Report no media this
        // tick; the watcher's hysteresis absorbs a one-off blip.
        Err(_) => false,
    }
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
    // Guard: reject CDB longer than 16 bytes (the cdb array size).
    if cdb.len() > 16 {
        return Err(io::Error::other(format!("CDB too long: {}", cdb.len())));
    }

    // Guard: checked conversion for cdb_length (max 255).
    let cdb_length = u8::try_from(cdb.len())
        .map_err(|_| io::Error::other("CDB length overflow"))?;

    // Guard: checked conversion for data_transfer_length (max u32::MAX).
    let data_transfer_length = u32::try_from(data_buf.len())
        .map_err(|_| io::Error::other("transfer length overflow"))?;

    let mut req = ScsiPassThroughDirectWithBuffer {
        sptd: ScsiPassThroughDirect {
            length: std::mem::size_of::<ScsiPassThroughDirect>() as u16,
            cdb_length,
            sense_info_length: 32,
            data_in: direction,
            data_transfer_length,
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
/// ## Thread-pool design (P0 fix)
///
/// Jobs are dispatched to the module-level `SCSI_POOL` (8 fixed threads).
/// If all threads are occupied by hung IOCTLs the submit fails immediately
/// and the caller gets `TimedOut` — no new thread is ever leaked.
///
/// The `HANDLE` is shared via `Arc<Mutex<HANDLE>>` cloned from the
/// `DriveHandle`.  The worker holds its own Arc clone for the lifetime of the
/// IOCTL, so `reopen()` can swap the inner HANDLE without racing against an
/// in-flight IRP.
fn scsi_passthrough(
    drive: &DriveHandle,
    cdb: &[u8],
    data_buf: &mut [u8],
    direction: u8,
    timeout_secs: u32,
) -> io::Result<(u8, [u8; 32])> {
    // Clone the Arc *before* submitting to the pool.  The worker captures the
    // Arc — the underlying OS HANDLE stays open for the entire IOCTL duration,
    // even if `reopen()` swaps the DriveHandle's current handle in parallel.
    let handle_arc = drive.snapshot_handle();
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

    // Keep a caller-side clone of the SAME OS handle the worker will block on,
    // so the watchdog can CancelIoEx it on timeout (see below).
    let cancel_arc = std::sync::Arc::clone(&handle_arc);

    // Submit to the bounded pool.  The closure captures the Arc clone; if the
    // pool queue is full all workers are stuck on hung IOCTLs and we must not
    // add more work — return timeout immediately.
    let job: ScsiJob = Box::new(move || {
        // Read the HANDLE value from the Arc.  The Arc keeps the OS handle
        // alive for the entire blocking call below.
        let handle = handle_arc.0;
        let mut buf = worker_buf;
        let outcome = scsi_passthrough_raw(handle, &cdb_owned, buf.as_mut_slice(), direction, timeout_secs);
        let _ = tx.send(outcome.map(|(s, sense)| (s, sense, buf)));
        // `handle_arc` (Arc<OwnedHandle>) drops here; if this was the last
        // clone, CloseHandle fires now (but only if reopen already replaced it).
    });

    if SCSI_POOL.submit(job).is_err() {
        tracing::warn!(
            "SCSI pool queue full ({} workers); backing off before timeout",
            POOL_SIZE
        );
        // Brief back-off so a transiently-full pool doesn't make the engine
        // hot-loop on immediate timeouts (which burns a CPU core for nothing).
        // With CancelIoEx now freeing stuck workers, saturation is short-lived.
        std::thread::sleep(std::time::Duration::from_millis(200));
        return Err(io::Error::new(
            io::ErrorKind::TimedOut,
            "SCSI worker pool exhausted — all workers busy with hung IOCTLs",
        ));
    }

    match rx.recv_timeout(std::time::Duration::from_secs(watchdog_secs)) {
        Ok(Ok((status, sense, buf))) => {
            if direction == SCSI_IOCTL_DATA_IN && buf_len > 0 {
                data_buf.copy_from_slice(buf.as_slice());
            }
            Ok((status, sense))
        }
        Ok(Err(e)) => Err(e),
        Err(_) => {
            // Abort the worker's stuck kernel IRP. On a truly hung USB-ATAPI
            // bridge the IRP would otherwise NEVER complete, so the worker would
            // never return and its pool slot would be lost forever — after
            // POOL_SIZE such hangs the whole pool deadlocks. CancelIoEx tells the
            // kernel to abort outstanding I/O on this handle, so the worker's
            // DeviceIoControl returns (ERROR_OPERATION_ABORTED), it frees its slot,
            // and recovery keeps moving. NULL overlapped = cancel all I/O on the
            // handle (all stuck reads on this drive at once).
            unsafe {
                use windows::Win32::System::IO::CancelIoEx;
                let _ = CancelIoEx(cancel_arc.0, None);
            }
            tracing::warn!(
                "SCSI watchdog tripped after {}s; CancelIoEx issued to abort the stuck IRP and free the pool worker",
                watchdog_secs
            );
            Err(io::Error::new(
                io::ErrorKind::TimedOut,
                format!("SCSI watchdog: drive did not respond within {watchdog_secs}s"),
            ))
        }
    }
}

/// Issue an IOCTL with auto-recover on device-disconnect.
///
/// If the first attempt returns a disconnect error the loop:
///   1. Checks for cancellation — exits immediately if the engine has been cancelled.
///   2. Sleeps 3 s in 200 ms slices (interruptible by cancellation).
///   3. Attempts to reopen the drive handle.
///   4. On successful reopen, issues the IOCTL again through the watchdog.
///
/// The loop is bounded by `MAX_REOPEN_ATTEMPTS` (≈ 60 s total). After the cap
/// is reached the last disconnect error is returned so the engine's normal
/// failure handling (skip-ahead / mark Unknown) proceeds instead of hanging.
///
/// `cancel_flag` — shared `Arc<AtomicBool>` from the `RecoveryEngine`; may be
/// `None` for callers that don't participate in cancellation (e.g. internal
/// recovery-mode setup calls).
fn scsi_passthrough_resilient(
    drive: &DriveHandle,
    cdb: &[u8],
    data_buf: &mut [u8],
    direction: u8,
    timeout_secs: u32,
    cancel_flag: Option<&Arc<AtomicBool>>,
) -> io::Result<(u8, [u8; 32])> {
    let first = scsi_passthrough(drive, cdb, data_buf, direction, timeout_secs);
    let first_err = match first {
        Ok(v) => return Ok(v),
        Err(e) if !is_drive_disconnect_error(&e) => return Err(e),
        Err(e) => e,
    };

    // Drive disconnect detected. Enter bounded reconnect loop.
    for attempt in 1..=MAX_REOPEN_ATTEMPTS {
        // --- Goal B: honour cancellation ---
        if cancel_flag.map_or(false, |f| f.load(Ordering::SeqCst)) {
            tracing::info!(
                "drive reconnect loop: cancellation requested on attempt {attempt}; aborting"
            );
            return Err(io::Error::new(
                io::ErrorKind::Interrupted,
                "recovery cancelled during drive reconnect",
            ));
        }

        tracing::warn!(
            "drive disconnect detected ({first_err}); reconnect attempt {attempt}/{MAX_REOPEN_ATTEMPTS} — pausing 3s"
        );

        // Sleep 3 s in 200 ms slices so Cancel is responsive within ~200 ms.
        // --- Goal B: interruptible sleep ---
        let mut slept = std::time::Duration::ZERO;
        let slice = std::time::Duration::from_millis(200);
        let total_pause = std::time::Duration::from_secs(3);
        while slept < total_pause {
            std::thread::sleep(slice);
            slept += slice;
            if cancel_flag.map_or(false, |f| f.load(Ordering::SeqCst)) {
                tracing::info!("drive reconnect sleep: cancellation requested; aborting");
                return Err(io::Error::new(
                    io::ErrorKind::Interrupted,
                    "recovery cancelled during drive reconnect pause",
                ));
            }
        }

        match drive.reopen() {
            Err(re) => {
                tracing::error!("drive reopen failed (attempt {attempt}/{MAX_REOPEN_ATTEMPTS}): {re}");
                if attempt == MAX_REOPEN_ATTEMPTS {
                    // --- Goal A: cap reached — give up ---
                    tracing::warn!(
                        "drive reconnect: hit MAX_REOPEN_ATTEMPTS ({MAX_REOPEN_ATTEMPTS}); returning error so engine can skip/mark this block"
                    );
                    return Err(first_err);
                }
                // Continue loop to try again.
            }
            Ok(()) => {
                // --- Goal C: post-reopen read goes through the watchdog ---
                // `scsi_passthrough` (watchdog version) is called here, NOT the
                // raw blocking IOCTL, so a stuck read will be aborted by
                // CancelIoEx after the same ~7 s watchdog timeout.
                tracing::info!("drive re-opened on attempt {attempt}, retrying IOCTL");
                return scsi_passthrough(drive, cdb, data_buf, direction, timeout_secs);
            }
        }
    }

    // Unreachable (the loop always returns inside the last iteration), but the
    // compiler doesn't know that — return the original error as a fallback.
    Err(first_err)
}

/// Extract (sense key, ASC, ASCQ) from a sense buffer, handling BOTH formats.
/// Fixed format (response code 0x70/0x71) puts key/ASC/ASCQ at bytes 2/12/13;
/// descriptor format (0x72/0x73 — returned by some USB bridges and newer
/// drives) puts them at bytes 1/2/3. Reading descriptor sense with fixed
/// offsets yields garbage classification.
fn parse_sense(sense: &[u8; 32]) -> (u8, u8, u8) {
    match sense[0] & 0x7F {
        0x72 | 0x73 => (sense[1] & 0x0F, sense[2], sense[3]),
        _ => (sense[2] & 0x0F, sense[12], sense[13]),
    }
}

/// How a CHECK CONDITION should be handled — not every sense code is a verdict
/// about the disc. On cheap USB bridges the most common sense data after a
/// drop/reset is UNIT ATTENTION ("power on or reset occurred") and NOT READY
/// ("becoming ready") — recording those as sector failures paints phantom
/// damage across the map after every reconnect.
enum SenseClass {
    /// Drive-state transient (unit attention after reset, aborted command,
    /// spinning up). Retry the same command after a short wait — the sector
    /// was never actually tested against the medium.
    Transient,
    /// Medium/device absent (NOT READY + MEDIUM NOT PRESENT). Treated as
    /// device-gone: the engine holds and waits, never records damage.
    MediaAbsent,
    /// A real verdict to classify and (possibly) record.
    Final(SectorError),
}

fn classify_sense(sense: &[u8; 32]) -> SenseClass {
    if sense[0] == 0 {
        return SenseClass::Final(SectorError::Other);
    }
    let (key, asc, _ascq) = parse_sense(sense);
    match key {
        SENSE_KEY_NO_SENSE => SenseClass::Final(SectorError::Other),
        // NOT READY: 04/xx = becoming ready / spin-up (wait and retry);
        // 3A/xx = medium not present (ejected, or transient during USB
        // re-enumeration) — device-gone semantics either way. Other ASCs
        // are also drive-state, not disc damage: stay patient.
        SENSE_KEY_NOT_READY => match asc {
            0x3A => SenseClass::MediaAbsent,
            _ => SenseClass::Transient,
        },
        SENSE_KEY_MEDIUM_ERROR => SenseClass::Final(SectorError::MediumError),
        SENSE_KEY_HARDWARE_ERROR => SenseClass::Final(SectorError::HardwareError),
        SENSE_KEY_ILLEGAL_REQUEST => SenseClass::Final(SectorError::IllegalRequest),
        // The drive's first command after ANY reset/reconnect/media event
        // returns UNIT ATTENTION. It means "my state changed", never "this
        // sector is bad". Always retry.
        SENSE_KEY_UNIT_ATTENTION => SenseClass::Transient,
        // ABORTED COMMAND is the routine result of our own watchdog's
        // CancelIoEx, or a bus reset mid-command. The sector was not tested.
        SENSE_KEY_ABORTED_COMMAND => SenseClass::Transient,
        _ => SenseClass::Final(SectorError::Other),
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

/// Issue READ TOC Format=0x01 (Session Info) and parse per-session entries.
///
/// Per MMC-6 §6.27.3.3, Format=01h Session Info descriptors are **8 bytes**:
///
///   byte 0 — Session Number
///   byte 1 — ADR | Control
///   byte 2 — First Track Number (in this session)
///   byte 3 — Last Track Number (in this session)
///   bytes 4..8 — Lead-In Start Address (LBA, big-endian u32)
///
/// The response header is 4 bytes (Data Length MSB, LSB, First Session, Last Session).
/// Total allocation = 4 + (100 sessions × 8 bytes).
fn read_session_toc(drive: &DriveHandle) -> Option<Vec<crate::disc::drive::TocSession>> {
    // Format=0x01 → "Session Info". Allocation: 4-byte header + up to 100
    // sessions × 8 bytes each (MMC-6 §6.27.3.3). Practical discs have ≤ 5 sessions.
    let alloc: u16 = 4 + 100 * 8;
    let cdb: [u8; 10] = [
        SCSI_OP_READ_TOC,
        0x00,                          // MSF=0 → LBA addressing
        0x01,                          // Format = Session Info
        0x00, 0x00, 0x00,
        0x01,                          // Starting Session = 1
        ((alloc >> 8) & 0xFF) as u8,
        (alloc & 0xFF) as u8,
        0x00,
    ];
    let mut buf = vec![0u8; alloc as usize];
    match scsi_passthrough(drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, 10) {
        Ok((0, _)) => {}
        _ => return None,
    }
    if buf.len() < 4 {
        return None;
    }
    let data_len = u16::from_be_bytes([buf[0], buf[1]]) as usize;
    let total = data_len + 2;
    if total < 4 || total > buf.len() {
        return None;
    }
    // Session descriptors start at byte 4; each is 8 bytes (MMC-6 §6.27.3.3).
    let descriptors = &buf[4..total.min(buf.len())];
    let mut sessions = Vec::new();
    for chunk in descriptors.chunks_exact(8) {
        // byte 0 = Session Number
        let session_num = chunk[0];
        // byte 1 = ADR | Control (not needed for routing, discard)
        // byte 2 = First Track Number in this session
        let first_track = chunk[2];
        // byte 3 = Last Track Number in this session
        let last_track = chunk[3];
        // bytes 4..8 = Lead-In Start LBA (big-endian u32)
        let lead_in = u32::from_be_bytes([chunk[4], chunk[5], chunk[6], chunk[7]]);
        sessions.push(crate::disc::drive::TocSession {
            session_number: session_num,
            first_track,
            last_track,
            lead_in_lba: lead_in,
        });
    }
    if sessions.is_empty() { None } else { Some(sessions) }
}

/// Issue READ TOC Format=0x02 (Full TOC) and scan for hidden tracks and pre-gaps.
///
/// The Full TOC returns raw Q-subchannel lead-in data. Each 11-byte descriptor
/// can represent a track, session boundary, or a "point" entry. Point 0xA0/A1/A2
/// are session control; point 0x00 is the pre-gap (hidden track) entry; negative
/// pre-gap LBAs wrap around as large u32 values.
///
/// We return `(has_hidden_track, pre_gap_lbas)` from the raw descriptor scan.
fn read_full_toc(drive: &DriveHandle) -> (bool, Vec<u32>) {
    let alloc: u16 = 4 + 2048; // generous — full TOC is rarely >2 KB
    let cdb: [u8; 10] = [
        SCSI_OP_READ_TOC,
        0x00,
        0x02,                          // Format = Full TOC
        0x00, 0x00, 0x00,
        0x01,
        ((alloc >> 8) & 0xFF) as u8,
        (alloc & 0xFF) as u8,
        0x00,
    ];
    let mut buf = vec![0u8; alloc as usize];
    match scsi_passthrough(drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, 10) {
        Ok((0, _)) => {}
        _ => return (false, Vec::new()),
    }
    if buf.len() < 4 {
        return (false, Vec::new());
    }
    let data_len = u16::from_be_bytes([buf[0], buf[1]]) as usize;
    let total = (data_len + 2).min(buf.len());
    if total < 4 {
        return (false, Vec::new());
    }
    let descriptors = &buf[4..total];
    let mut has_hidden = false;
    let mut pre_gaps = Vec::new();

    for chunk in descriptors.chunks_exact(11) {
        let point = chunk[3];
        let lba = u32::from_be_bytes([chunk[7], chunk[8], chunk[9], chunk[10]]);

        // Point 0x00 is the pre-gap. A non-zero pre-gap LBA that is "large"
        // (> 0xFFFF_FF00) represents a negative start (the hidden track).
        if point == 0x00 {
            if lba > 0xFFFF_FF00 {
                has_hidden = true;
            }
            pre_gaps.push(lba);
        }
        // Track 1 starting from a non-standard LBA (< 150) also indicates
        // a hidden track used by some pressed CDs (e.g. Primus "Sailing the Seas of Cheese").
        if point == 0x01 && lba > 0 && lba < 150 {
            has_hidden = true;
        }
    }
    (has_hidden, pre_gaps)
}

/// Run the full pre-scan disc probe: INQUIRY + GET CONFIGURATION + READ DISC INFO.
///
/// This is the **Recovery Plan briefing** — everything Heirvo can learn about
/// the drive and disc before reading a single data sector. The result is fed
/// to the UI so the user knows what they're dealing with before committing
/// to a multi-hour scan. Best-effort: any individual probe failure falls back
/// to sensible defaults rather than aborting the whole briefing.
pub fn probe_disc_profile(path: &str) -> io::Result<crate::disc::drive::DiscProfile> {
    use crate::disc::drive::{DiscProfile, DiscStatus, DiscTocInfo};
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

    // READ TOC session info and full-TOC pre-gap scan. Only meaningful for CD
    // family — DVDs and BDs don't use multi-session CD-style TOC.
    let is_cd_profile = matches!(profile_code, 0x0008..=0x000A);
    let toc_info: Option<DiscTocInfo> = if media_present && is_cd_profile {
        let sessions = read_session_toc(&drive).unwrap_or_default();
        let (has_hidden, pre_gaps) = if !sessions.is_empty() {
            read_full_toc(&drive)
        } else {
            (false, Vec::new())
        };
        tracing::info!(
            "TOC: {} session(s), hidden_track={has_hidden}, pre_gaps={}",
            sessions.len(), pre_gaps.len()
        );
        if !sessions.is_empty() || has_hidden {
            Some(DiscTocInfo { sessions, has_hidden_track: has_hidden, pre_gap_lbas: pre_gaps })
        } else {
            None
        }
    } else {
        None
    };

    // Log the class so we can verify routing in dev.
    let disc = DiscProfile {
        vendor, model, firmware, media_present, profile_code, profile_name,
        disc_status: status, num_sessions, erasable, toc_info,
    };
    tracing::info!("probe_disc_profile: class={:?} profile={}", disc.disc_class(), disc.profile_name);
    Ok(disc)
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
    // 6s per-sector ceiling. The previous 2s cap was a bridge-killer: when an
    // SPTI TimeOutValue expires, storport resets the device to reclaim the
    // IRP, and cheap USB-ATAPI bridges fall off the bus when reset. A drive
    // working a marginal sector routinely needs 3-6s (more when the firmware
    // fast-fail MODE SELECT was refused, which is common on USB bridges) — so
    // the 2s cap was converting recoverable sectors into device drops. The
    // host watchdog still bounds true hangs.
    let timeout = block_timeout_secs.clamp(1, 6);
    let mut out: Vec<SectorReadResult> = Vec::with_capacity(count as usize);
    let mut i: u64 = 0;
    // Bounded patience for transient sense (UNIT ATTENTION after a reset,
    // spin-up) — these are drive states, not sector verdicts.
    let mut transient_waits: u8 = 0;
    const MAX_TRANSIENT_WAITS: u8 = 5;

    // Helper: the device is gone (or never settles) — report DeviceGone for
    // the current and ALL remaining sectors so the engine's wait-for-device
    // machinery takes over. These sectors were never tested; recording them
    // as Timeout/MediumError would paint phantom damage on every bridge drop.
    let abandon_as_device_gone = |out: &mut Vec<SectorReadResult>, from: u64, elapsed_ms: u32| {
        for j in from..count as u64 {
            out.push(SectorReadResult::err(start_lba + j, SectorError::DeviceGone, 1, elapsed_ms));
        }
    };

    while i < count as u64 {
        let lba = start_lba + i;
        let cdb = build_read10_cdb(lba as u32, 1);
        let mut buf = vec![0u8; DVD_SECTOR_SIZE];
        let started = Instant::now();
        match scsi_passthrough(drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, timeout) {
            Ok((0, _)) => {
                out.push(SectorReadResult::ok(lba, buf, started.elapsed().as_millis() as u32));
                transient_waits = 0;
                i += 1;
            }
            Ok((_, sense)) => match classify_sense(&sense) {
                SenseClass::Transient => {
                    transient_waits += 1;
                    if transient_waits > MAX_TRANSIENT_WAITS {
                        // Drive keeps resetting under fallback load — back off
                        // entirely and let the engine wait for it to settle.
                        abandon_as_device_gone(&mut out, i, started.elapsed().as_millis() as u32);
                        return out;
                    }
                    std::thread::sleep(std::time::Duration::from_secs(1));
                    // retry same sector (i not advanced)
                }
                SenseClass::MediaAbsent => {
                    abandon_as_device_gone(&mut out, i, started.elapsed().as_millis() as u32);
                    return out;
                }
                SenseClass::Final(e) => {
                    out.push(SectorReadResult::err(lba, e, 1, started.elapsed().as_millis() as u32));
                    transient_waits = 0;
                    i += 1;
                }
            },
            Err(e) => {
                if is_drive_disconnect_error(&e) {
                    abandon_as_device_gone(&mut out, i, started.elapsed().as_millis() as u32);
                    return out;
                }
                out.push(SectorReadResult::err(lba, SectorError::Timeout, 1, started.elapsed().as_millis() as u32));
                transient_waits = 0;
                i += 1;
            }
        }
    }
    out
}

pub struct ScsiSectorReader {
    drive: DriveHandle,
    capacity_lba: u64,
    /// Shared cancellation flag from the `RecoveryEngine`. Wrapped in a
    /// `parking_lot::Mutex` for interior mutability so `set_cancel_flag`
    /// (which takes `&self`) can swap in the engine's Arc after construction.
    /// Checked inside the disconnect/reopen retry loop so Cancel is responsive
    /// within ~200 ms even when the drive is off the bus.
    cancel_flag: parking_lot::Mutex<Arc<AtomicBool>>,
}

impl ScsiSectorReader {
    pub fn open(path: &str) -> io::Result<Self> {
        let drive = open_drive(path)?;
        // Configure for recovery BEFORE the first read. Order matters: the
        // first READ CAPACITY would otherwise trigger drive spin-up at full
        // speed and let firmware retry defaults bake in for the session.
        apply_recovery_mode_settings(&drive);
        let capacity_lba = read_capacity(&drive)?;
        Ok(Self {
            drive,
            capacity_lba,
            cancel_flag: parking_lot::Mutex::new(Arc::new(AtomicBool::new(false))),
        })
    }
}

impl SectorReader for ScsiSectorReader {
    fn set_cancel_flag(&self, flag: Arc<AtomicBool>) {
        *self.cancel_flag.lock() = flag;
    }

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
        // Snapshot the cancel Arc once per read_sector call (not per retry
        // attempt) — avoids repeated mutex acquisitions in the hot path.
        let cancel = Arc::clone(&*self.cancel_flag.lock());

        // Transient drive states (UNIT ATTENTION after reset, ABORTED COMMAND
        // from our own watchdog, NOT READY while spinning up) get their own
        // bounded retry budget SEPARATE from opts.retries. Triage runs with
        // retries: 0 — without this, the first read after every bridge
        // reconnect (always UNIT ATTENTION) would be recorded as a failed
        // sector, painting phantom damage across the map on flaky hardware.
        const MAX_TRANSIENT_RETRIES: u8 = 12; // ~12 s of spin-up patience
        let mut transient_attempts: u8 = 0;

        loop {
            if cancel.load(Ordering::SeqCst) {
                break;
            }
            match scsi_passthrough_resilient(&self.drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, timeout_secs, Some(&cancel)) {
                Ok((status, sense)) => {
                    if status == 0 {
                        let elapsed = started.elapsed().as_millis() as u32;
                        return SectorReadResult::ok(lba, buf, elapsed);
                    }
                    match classify_sense(&sense) {
                        SenseClass::Transient => {
                            transient_attempts += 1;
                            if transient_attempts > MAX_TRANSIENT_RETRIES {
                                // The drive never settled — that's drive
                                // trouble, not disc damage.
                                last_err = SectorError::HardwareError;
                                break;
                            }
                            let (key, asc, ascq) = parse_sense(&sense);
                            tracing::debug!(
                                "LBA {lba}: transient sense {key:#x}/{asc:#02x}/{ascq:#02x} — waiting 1s and retrying ({transient_attempts}/{MAX_TRANSIENT_RETRIES})"
                            );
                            std::thread::sleep(std::time::Duration::from_secs(1));
                            continue; // does NOT consume a media retry
                        }
                        SenseClass::MediaAbsent => {
                            // Ejected, or device re-enumerating after a drop.
                            // Engine-level wait_for_device takes over.
                            last_err = SectorError::DeviceGone;
                            break;
                        }
                        SenseClass::Final(e) => {
                            last_err = e;
                            attempts += 1;
                            if matches!(e, SectorError::IllegalRequest) || attempts > opts.retries {
                                break;
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::debug!("SCSI passthrough I/O error at LBA {lba}: {e}");
                    last_err = if is_drive_disconnect_error(&e) {
                        SectorError::DeviceGone
                    } else if e.kind() == io::ErrorKind::TimedOut {
                        SectorError::Timeout
                    } else {
                        SectorError::Other
                    };
                    if matches!(last_err, SectorError::DeviceGone) {
                        break; // engine waits for the device; never a retry here
                    }
                    attempts += 1;
                    if attempts > opts.retries {
                        break;
                    }
                }
            }
        }

        let elapsed = started.elapsed().as_millis() as u32;
        SectorReadResult::err(lba, last_err, attempts.max(1), elapsed)
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
                // Device-gone vs hosed-region are DIFFERENT failures and the
                // engine must treat them oppositely. A disconnect (bridge fell
                // off the bus, enclosure power-cycled, media ejected) means the
                // sector was never tested — report DeviceGone so the engine
                // waits and re-reads instead of skipping past and marking damage
                // that isn't real. A true drive-side timeout means this region
                // really is unreadable — report Timeout so skip-ahead escapes it.
                if is_drive_disconnect_error(&e) {
                    tracing::warn!(
                        "Block read at LBA {start_lba} n={n}: drive disconnected ({e}) — reporting DeviceGone so recovery waits for the drive instead of skipping"
                    );
                    return (0..n as u64)
                        .map(|i| SectorReadResult::err(start_lba + i, SectorError::DeviceGone, 1, elapsed_ms))
                        .collect();
                }
                if e.kind() == io::ErrorKind::TimedOut {
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

    /// Re-open the drive handle. Used by the engine as a drive-stress recovery
    /// step: on a long unbroken failure run, re-establishing the handle (and
    /// reapplying recovery-mode settings) gives a wobbling drive a chance to
    /// recover before its firmware resets it off the bus.
    fn reset(&self) -> io::Result<()> {
        self.drive.reopen()
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

/// Lightweight drive state: just the path, letter, and media-present flag.
/// No SCSI INQUIRY is issued — only `GetDriveTypeW` and
/// `IOCTL_STORAGE_CHECK_VERIFY` (which does not touch the SCSI bus).
/// Used by the drive watcher to do cheap per-tick polling.
pub struct OpticalDriveState {
    /// Win32 device path (`\\\\.\\D:`).
    pub path: String,
    /// Drive letter (`D:`).
    pub letter: String,
    /// True if media is currently inserted.
    pub has_media: bool,
}

/// Enumerate optical drives cheaply — no SCSI INQUIRY, no bus traffic.
///
/// For each drive letter identified as `DRIVE_CDROM` by `GetDriveTypeW` we
/// open a raw handle and call `IOCTL_STORAGE_CHECK_VERIFY` to test media
/// presence. That IOCTL goes through the Windows storage stack (not the SCSI
/// pass-through bridge), so it completes in microseconds and never stalls on
/// an idle USB-ATAPI chip.
///
/// Callers that need vendor/model/firmware should call `inquiry_single_drive`
/// on the returned paths (once, when the drive first appears).
pub fn enumerate_optical_drive_states() -> io::Result<Vec<OpticalDriveState>> {
    use windows::Win32::Storage::FileSystem::GetDriveTypeW;
    const DRIVE_CDROM: u32 = 5;

    let mut states = Vec::new();
    for letter in b'A'..=b'Z' {
        let letter_str = format!("{}:", letter as char);
        let root = format!("{}\\", letter_str);
        let wide: Vec<u16> = root.encode_utf16().chain(std::iter::once(0)).collect();
        let drive_type = unsafe { GetDriveTypeW(PCWSTR(wide.as_ptr())) };
        if drive_type != DRIVE_CDROM {
            continue;
        }
        let path = format!("\\\\.\\{}", letter_str);
        let media = match open_drive(&path) {
            Ok(d) => has_media(&d),
            Err(_) => false,
        };
        states.push(OpticalDriveState { path, letter: letter_str, has_media: media });
    }
    Ok(states)
}

/// Issue SCSI INQUIRY for a single drive and return `(vendor, model, firmware)`.
///
/// Uses a 3-second watchdog — same as the per-drive INQUIRY inside
/// `enumerate_optical_drives`. Returns stub strings on timeout or failure so
/// the drive is still usable.
pub fn inquiry_single_drive(path: &str) -> (String, String, String) {
    match open_drive(path) {
        Ok(drive) => {
            let cdb = [SCSI_OP_INQUIRY, 0, 0, 0, 96, 0, 0, 0, 0, 0];
            let mut buf = [0u8; 96];
            match scsi_passthrough(&drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, 3) {
                Ok((0, _)) if (buf[0] & 0x1F) == 0x05 => {
                    let trim = |b: &[u8]| String::from_utf8_lossy(b).trim().to_string();
                    (trim(&buf[8..16]), trim(&buf[16..32]), trim(&buf[32..36]))
                }
                _ => {
                    tracing::debug!(
                        "INQUIRY timed out or rejected for {path} — using stub strings"
                    );
                    ("Unknown".into(), "Unknown".into(), "Unknown".into())
                }
            }
        }
        Err(e) => {
            tracing::debug!("Could not open {path} for INQUIRY: {e}");
            ("Unknown".into(), "Unknown".into(), "Unknown".into())
        }
    }
}

/// Enumerate available optical drives by probing every drive letter A:..Z:.
///
/// Two-phase detection to avoid stalling on idle USB-ATAPI bridges:
///
/// 1. `GetDriveTypeW` — pure Win32 filesystem API, zero SCSI traffic.
///    Returns `DRIVE_CDROM` (5) only for optical drives. This never touches
///    the USB-ATAPI bridge at all, so it cannot hang even when the drive
///    is idle or the bridge chip is asleep.
///
/// 2. INQUIRY via SCSI pass-through — called only for confirmed optical drives,
///    with a short (3 s) watchdog. If INQUIRY times out or is rejected the
///    drive is still added to the list using stub vendor/model strings; the
///    user can see it and the next poll that succeeds will fill in the names.
///
/// The previous implementation called INQUIRY on every drive letter without a
/// pre-filter, causing the watcher to block for 7 s on every poll cycle when
/// the TSSTcorp SH-224DB bridge entered idle state with no disc inserted.
pub fn enumerate_optical_drives() -> io::Result<Vec<DriveInfo>> {
    use windows::Win32::Storage::FileSystem::GetDriveTypeW;
    // DRIVE_CDROM = 5
    const DRIVE_CDROM: u32 = 5;

    let mut drives = Vec::new();
    for letter in b'A'..=b'Z' {
        let letter_str = format!("{}:", letter as char);

        // ── Phase 1: cheap OS-level check — is this an optical drive?
        let root = format!("{}\\", letter_str);
        let wide: Vec<u16> = root.encode_utf16().chain(std::iter::once(0)).collect();
        let drive_type = unsafe { GetDriveTypeW(PCWSTR(wide.as_ptr())) };
        if drive_type != DRIVE_CDROM {
            continue;
        }

        // ── Phase 2: open a raw handle for SCSI commands.
        let path = format!("\\\\.\\{}", letter_str);
        let drive = match open_drive(&path) {
            Ok(d) => d,
            Err(_) => continue,
        };

        // ── Media presence check — goes through Windows storage stack, not SCSI bridge.
        let has_media_flag = has_media(&drive);

        // ── INQUIRY — best-effort, 3 s watchdog. If the bridge is idle this may
        // time out; we still add the drive so the user can see it.
        let (vendor, model, firmware) = {
            let cdb = [SCSI_OP_INQUIRY, 0, 0, 0, 96, 0, 0, 0, 0, 0];
            let mut buf = [0u8; 96];
            match scsi_passthrough(&drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, 3) {
                Ok((0, _)) if (buf[0] & 0x1F) == 0x05 => {
                    let trim = |b: &[u8]| String::from_utf8_lossy(b).trim().to_string();
                    (trim(&buf[8..16]), trim(&buf[16..32]), trim(&buf[32..36]))
                }
                _ => {
                    tracing::debug!(
                        "INQUIRY skipped or timed out for {letter_str} — using stub strings"
                    );
                    ("Unknown".into(), "Unknown".into(), "Unknown".into())
                }
            }
        };

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
    Ok(drives)
}

// ───────────────────────────────────────────────────────────────────────────
// CdSectorReader — data-CD recovery path using READ CD (0xBE)
//
// Advantages over ScsiSectorReader (which uses READ(10) / 0x28):
// • Correctly handles Mode 1, Mode 2 Form 1, and Mode 2 Form 2 sectors with a
//   single command — READ(10) only works reliably on Mode 1.
// • C2 Error Pointer support: per-byte error mask lets us count exactly how
//   many bytes the drive's firmware couldn't correct. A sector with 3 bad bytes
//   out of 2048 is recoverable; one with 512 bad bytes is not.
// • DCR=1 raw fallback: when C2 shows a small number of uncorrectable bytes,
//   we bypass firmware ECC entirely, read the raw 2352-byte sector, and extract
//   the user data. Even corrupted bytes are more useful than silence for video
//   decoders — a bad block causes a glitched frame, not a stall.
// ───────────────────────────────────────────────────────────────────────────

/// Raw sector size for a CD including sync + header + user data + ECC/EDC.
/// Mode 1: 12 sync + 4 header + 2048 user + 4 EDC + 8 zero + 276 ECC = 2352.
const CD_RAW_SECTOR_BYTES: usize = 2352;
/// C2 Error Block: one bit per raw byte = 2352/8 = 294 bytes.
const CD_C2_BLOCK_BYTES: usize = 294;
/// User data offset within a raw Mode 1 CD sector.
const CD_USER_DATA_OFFSET: usize = 16;
/// User data length (2048 bytes).
const CD_USER_DATA_LEN: usize = DVD_SECTOR_SIZE; // 2048

/// Build a READ CD (0xBE) CDB requesting user-data-only for `count` sectors.
/// byte 9 = 0x10 → User Data flag; returns `count × 2048` bytes.
/// Expected sector type = 0 (Any) for maximum compatibility.
fn build_read_cd_user_data_cdb(lba: u32, count: u32) -> [u8; 12] {
    [
        SCSI_OP_READ_CD,
        0x00,                          // Expected Sector Type = Any
        ((lba >> 24) & 0xFF) as u8,
        ((lba >> 16) & 0xFF) as u8,
        ((lba >> 8) & 0xFF) as u8,
        (lba & 0xFF) as u8,
        ((count >> 16) & 0xFF) as u8,
        ((count >> 8) & 0xFF) as u8,
        (count & 0xFF) as u8,
        0x10,                          // User Data only
        0x00,                          // No subchannel
        0x00,
    ]
}

/// Build a READ CD CDB requesting User Data + C2 Error Block.
/// byte 9 = 0x12 → User Data (0x10) | C2 Error Block (0x02).
/// Returns `count × (2048 + 294)` bytes per sector interleaved.
fn build_read_cd_c2_cdb(lba: u32, count: u32) -> [u8; 12] {
    [
        SCSI_OP_READ_CD,
        0x00,
        ((lba >> 24) & 0xFF) as u8,
        ((lba >> 16) & 0xFF) as u8,
        ((lba >> 8) & 0xFF) as u8,
        (lba & 0xFF) as u8,
        ((count >> 16) & 0xFF) as u8,
        ((count >> 8) & 0xFF) as u8,
        (count & 0xFF) as u8,
        0x12,                          // User Data | C2 Error Block
        0x00,
        0x00,
    ]
}

/// Build a READ CD CDB requesting the full raw 2352-byte sector (no C2).
/// byte 9 = 0b1111_1000 = 0xF8 → Sync | All Headers | User Data | EDC/ECC.
/// Used for the DCR (Disable Error Correction) raw-read fallback.
fn build_read_cd_raw_cdb(lba: u32, count: u32) -> [u8; 12] {
    [
        SCSI_OP_READ_CD,
        0x00,
        ((lba >> 24) & 0xFF) as u8,
        ((lba >> 16) & 0xFF) as u8,
        ((lba >> 8) & 0xFF) as u8,
        (lba & 0xFF) as u8,
        ((count >> 16) & 0xFF) as u8,
        ((count >> 8) & 0xFF) as u8,
        (count & 0xFF) as u8,
        0xF8,                          // Sync | All Headers | User Data | EDC/ECC
        0x00,
        0x00,
    ]
}

/// Count bits set in the C2 block that correspond to user data bytes.
///
/// For a Mode 1 CD sector the raw layout is:
///   Sync (12) + Header (4) + User Data (2048) + EDC (4) + Zeros (8) + ECC (276)
/// User data starts at raw byte 16, so its C2 bits are bits 128..16383,
/// which correspond to C2 bytes 16..272. We count set bits in that range.
/// Returns the count of user data bytes that the drive flagged as uncorrectable.
fn count_c2_user_data_errors(c2: &[u8]) -> u32 {
    if c2.len() < 272 {
        return 0;
    }
    c2[16..272].iter().map(|b| b.count_ones()).sum()
}

/// Apply MODE SELECT page 01h with DCR=1 (Disable Error Correction).
/// The drive will return raw bits without applying ECC. Always paired with
/// `apply_recovery_mode_settings()` to restore DCR=0 afterward.
fn set_dcr_mode(drive: &DriveHandle) {
    let param_list: [u8; 16] = [
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x06,
        0b00100101, // same as recovery mode but with DCR=1 (bit 0 set)
        0x00,       // Read Retry Count = 0 (no retries in DCR mode)
        0x00, 0x00, 0x00, 0x00,
    ];
    let cdb: [u8; 10] = [SCSI_OP_MODE_SELECT_10, 0x10, 0, 0, 0, 0, 0, 0, 16, 0];
    let mut buf = param_list;
    // Best-effort — if rejected, DCR read degrades to firmware-corrected data.
    let _ = scsi_passthrough(drive, &cdb, &mut buf, SCSI_IOCTL_DATA_OUT, 5);
}

/// CD data-disc sector reader using READ CD (0xBE).
///
/// Three-phase fallback per sector:
///   1. READ CD with User Data only → 2048 bytes. Fast path, same throughput
///      as READ(10) on healthy discs.
///   2. On failure: READ CD with User Data + C2 Error Pointers → 2342 bytes.
///      Parse the C2 mask to count uncorrectable user-data bytes.
///   3. If C2 error count ≤ `DCR_THRESHOLD`: apply DCR=1, read raw 2352-byte
///      sector, extract bytes 16..2064 as user data, restore DCR=0.
///      Even wrong bytes beat silence for video/audio recovery.
pub struct CdSectorReader {
    drive: DriveHandle,
    capacity_lba: u64,
    /// Shared cancellation flag from the `RecoveryEngine` — same wiring as
    /// `ScsiSectorReader.cancel_flag`. See that struct for the rationale.
    cancel_flag: parking_lot::Mutex<Arc<AtomicBool>>,
}

/// Maximum C2 user-data errors before we give up on the DCR fallback.
/// 64 bad bytes out of 2048 ≈ 3% corruption. A video decoder can conceal
/// this; at higher rates the sector is likely unrecoverable anyway.
const DCR_THRESHOLD: u32 = 64;

impl CdSectorReader {
    pub fn open(path: &str) -> io::Result<Self> {
        let drive = open_drive(path)?;
        apply_recovery_mode_settings(&drive);
        let capacity_lba = read_capacity(&drive)?;
        tracing::info!(
            "CdSectorReader: opened {path}, capacity={capacity_lba} sectors, using READ CD (0xBE)"
        );
        Ok(Self {
            drive,
            capacity_lba,
            cancel_flag: parking_lot::Mutex::new(Arc::new(AtomicBool::new(false))),
        })
    }

    /// Phase 1: fast path — READ CD user-data-only. Identical performance to
    /// READ(10) on healthy sectors, but correctly handles Mode 2 XA sectors.
    fn try_read_cd_user_data(&self, lba: u32, timeout_secs: u32) -> Option<Vec<u8>> {
        let cdb = build_read_cd_user_data_cdb(lba, 1);
        let mut buf = vec![0u8; CD_USER_DATA_LEN];
        match scsi_passthrough(&self.drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, timeout_secs) {
            Ok((0, _)) => Some(buf),
            _ => None,
        }
    }

    /// Phase 2: READ CD with C2 error pointers. Buffer layout per sector:
    ///   [0..2048] = user data, [2048..2342] = C2 error block (294 bytes).
    /// Returns (user_data, c2_error_count) on success.
    fn try_read_cd_c2(&self, lba: u32, timeout_secs: u32) -> Option<(Vec<u8>, u32)> {
        let frame_size = CD_USER_DATA_LEN + CD_C2_BLOCK_BYTES; // 2342
        let cdb = build_read_cd_c2_cdb(lba, 1);
        let mut buf = vec![0u8; frame_size];
        match scsi_passthrough(&self.drive, &cdb, &mut buf, SCSI_IOCTL_DATA_IN, timeout_secs) {
            Ok((0, _)) => {
                let user_data = buf[..CD_USER_DATA_LEN].to_vec();
                let c2_block = &buf[CD_USER_DATA_LEN..];
                let errors = count_c2_user_data_errors(c2_block);
                tracing::debug!("C2 read LBA {lba}: {errors} user-data bytes flagged");
                Some((user_data, errors))
            }
            _ => None,
        }
    }

    /// Phase 3: DCR raw fallback. Temporarily disables firmware ECC, reads the
    /// full 2352-byte raw sector, and extracts the Mode 1 user data region
    /// (bytes 16..2064). Restores ECC mode immediately after.
    ///
    /// The returned data may contain incorrect bytes where C2 flagged errors,
    /// but it is still useful: video decoders conceal individual bad blocks and
    /// audio decoders can interpolate over a handful of bad samples.
    fn try_read_cd_dcr(&self, lba: u32, timeout_secs: u32) -> Option<Vec<u8>> {
        set_dcr_mode(&self.drive);
        let cdb = build_read_cd_raw_cdb(lba, 1);
        let mut raw = vec![0u8; CD_RAW_SECTOR_BYTES];
        let result = scsi_passthrough(&self.drive, &cdb, &mut raw, SCSI_IOCTL_DATA_IN, timeout_secs);
        // Restore recovery mode (DCR=0) regardless of outcome.
        apply_recovery_mode_settings(&self.drive);

        match result {
            Ok((0, _)) => {
                if raw.len() >= CD_USER_DATA_OFFSET + CD_USER_DATA_LEN {
                    let user = raw[CD_USER_DATA_OFFSET..CD_USER_DATA_OFFSET + CD_USER_DATA_LEN].to_vec();
                    tracing::debug!("DCR raw read LBA {lba}: extracted user data (may contain errors)");
                    Some(user)
                } else {
                    None
                }
            }
            _ => {
                tracing::debug!("DCR raw read LBA {lba}: command rejected by drive");
                None
            }
        }
    }

    /// Per-sector fast fallback for block read failures: 2s cap, no resilient retry.
    fn cd_fast_sector_fallback(
        &self,
        start_lba: u64,
        count: u32,
        timeout_secs: u32,
    ) -> Vec<SectorReadResult> {
        let timeout = timeout_secs.min(2).max(1);
        (0..count as u64)
            .map(|i| {
                let lba = (start_lba + i) as u32;
                let started = Instant::now();
                let result = self.try_read_cd_user_data(lba, timeout);
                let elapsed = started.elapsed().as_millis() as u32;
                match result {
                    Some(data) => SectorReadResult::ok(start_lba + i, data, elapsed),
                    None => SectorReadResult::err(
                        start_lba + i, SectorError::MediumError, 1, elapsed,
                    ),
                }
            })
            .collect()
    }
}

impl SectorReader for CdSectorReader {
    fn set_cancel_flag(&self, flag: Arc<AtomicBool>) {
        *self.cancel_flag.lock() = flag;
    }

    fn read_sector(&self, lba: u64, opts: ReadOptions) -> SectorReadResult {
        if lba >= self.capacity_lba {
            return SectorReadResult::err(lba, SectorError::IllegalRequest, 0, 0);
        }
        let timeout_secs = (opts.timeout_ms / 1000).max(5);
        let started = Instant::now();

        // Phase 1: normal READ CD — correct data if drive can manage it.
        if let Some(data) = self.try_read_cd_user_data(lba as u32, timeout_secs) {
            return SectorReadResult::ok(lba, data, started.elapsed().as_millis() as u32);
        }

        // Phase 2: C2 analysis to measure damage.
        let c2_result = self.try_read_cd_c2(lba as u32, timeout_secs);

        let c2_errors = c2_result.as_ref().map(|(_, e)| *e).unwrap_or(u32::MAX);
        tracing::debug!("LBA {lba}: Phase 1 failed, C2 error count = {c2_errors}");

        // Phase 3: if damage is ≤ threshold, try DCR raw read.
        if c2_errors <= DCR_THRESHOLD {
            if let Some(data) = self.try_read_cd_dcr(lba as u32, timeout_secs) {
                tracing::info!(
                    "LBA {lba}: DCR fallback recovered sector with {c2_errors} known-bad bytes"
                );
                return SectorReadResult::ok(lba, data, started.elapsed().as_millis() as u32);
            }
        }

        // All phases failed.
        SectorReadResult::err(
            lba,
            SectorError::Uncorrectable,
            3,
            started.elapsed().as_millis() as u32,
        )
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

        let cdb = build_read_cd_user_data_cdb(start_lba as u32, n);
        let mut buf = AlignedBuffer::new(n as usize * CD_USER_DATA_LEN, 4096);
        let started = Instant::now();

        let result = scsi_passthrough(
            &self.drive, &cdb, buf.as_mut_slice(), SCSI_IOCTL_DATA_IN, timeout_secs,
        );
        let elapsed_ms = started.elapsed().as_millis() as u32;

        match result {
            Ok((0, _)) => {
                let per_ms = elapsed_ms.checked_div(n).unwrap_or(0);
                let bytes = buf.as_slice();
                (0..n as usize)
                    .map(|i| {
                        let off = i * CD_USER_DATA_LEN;
                        SectorReadResult::ok(
                            start_lba + i as u64,
                            bytes[off..off + CD_USER_DATA_LEN].to_vec(),
                            per_ms,
                        )
                    })
                    .collect()
            }
            Err(e)
                if e.kind() == io::ErrorKind::TimedOut || is_drive_disconnect_error(&e) =>
            {
                tracing::warn!(
                    "CD block timeout at LBA {start_lba} n={n}: {e}; skip per-sector retry"
                );
                (0..n as u64)
                    .map(|i| {
                        SectorReadResult::err(start_lba + i, SectorError::Timeout, 1, elapsed_ms)
                    })
                    .collect()
            }
            _ => {
                tracing::debug!(
                    "CD block read failed at LBA {start_lba} n={n}, falling back to per-sector"
                );
                self.cd_fast_sector_fallback(start_lba, n, timeout_secs)
            }
        }
    }

    fn capacity(&self) -> u64 {
        self.capacity_lba
    }
}
