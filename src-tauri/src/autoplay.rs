//! Suppress the Windows AutoPlay popup while Heirvo is running.
//!
//! When an optical disc is inserted, the Windows shell broadcasts the
//! registered window message `"QueryCancelAutoPlay"` to the **foreground**
//! top-level window. A window that returns `TRUE` cancels AutoPlay for that
//! media — no disc-player prompt, no "choose an app" toast.
//!
//! We subclass our main window so that whenever Heirvo is focused at the moment
//! a disc goes in, the AutoPlay popup never appears. This is deliberately
//! polite:
//!   - It changes **no** system settings (AutoPlay behaves normally for every
//!     other app, and the instant Heirvo isn't the foreground window).
//!   - It needs no admin rights.
//!   - It only suppresses AutoPlay while Heirvo is actually in front — which is
//!     exactly when the user is inserting a disc to recover it.

/// Install the AutoPlay suppressor on the given window. No-op on failure.
#[cfg(windows)]
pub fn install(window: &tauri::WebviewWindow) {
    use std::sync::OnceLock;
    use windows::core::w;
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows::Win32::UI::Shell::{DefSubclassProc, SetWindowSubclass};
    use windows::Win32::UI::WindowsAndMessaging::RegisterWindowMessageW;

    // The shell-registered "QueryCancelAutoPlay" message id, shared with the
    // subclass proc (which can't capture environment, being an extern fn).
    static QCAP_MSG: OnceLock<u32> = OnceLock::new();

    unsafe extern "system" fn subclass_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _subclass_id: usize,
        _ref_data: usize,
    ) -> LRESULT {
        if let Some(qcap) = QCAP_MSG.get() {
            if msg == *qcap {
                // Non-zero = "yes, cancel AutoPlay for this media".
                return LRESULT(1);
            }
        }
        DefSubclassProc(hwnd, msg, wparam, lparam)
    }

    let msg_id = unsafe { RegisterWindowMessageW(w!("QueryCancelAutoPlay")) };
    if msg_id == 0 {
        tracing::warn!("AutoPlay suppression: RegisterWindowMessageW failed");
        return;
    }
    let _ = QCAP_MSG.set(msg_id);

    let hwnd = match window.hwnd() {
        Ok(h) => HWND(h.0),
        Err(e) => {
            tracing::warn!("AutoPlay suppression: could not get window handle ({e})");
            return;
        }
    };

    let ok = unsafe { SetWindowSubclass(hwnd, Some(subclass_proc), 1, 0) };
    if ok.as_bool() {
        tracing::info!(
            "AutoPlay suppression active — Windows won't pop up a disc player while Heirvo is focused"
        );
    } else {
        tracing::warn!("AutoPlay suppression: SetWindowSubclass failed");
    }
}

/// No-op on non-Windows platforms.
#[cfg(not(windows))]
pub fn install(_window: &tauri::WebviewWindow) {}
