//! Long-lived PTY sessions for driving an interactive terminal program.
//!
//! The Claude Code login is a TUI flow: it prints an authorization URL,
//! the human approves it in a browser, and pastes a code back. Driving that
//! from a service needs three properties that a plain `Command` cannot give:
//!
//! 1. **A real PTY.** The child must believe it is attached to a terminal,
//!    otherwise it refuses to run its interactive flow at all.
//! 2. **Idle-settled readiness.** A TUI repaints continuously, so a naive
//!    "wait until the output contains X" fires in the middle of a repaint and
//!    reads a half-drawn screen. [`PtySession::wait_for`] therefore requires
//!    the predicate to hold *and* the output to have been quiet for
//!    `idle` before it returns.
//! 3. **A lifetime longer than one request.** The session is created by one
//!    HTTP request and written to by a later one, so the child, its PTY, and
//!    its transcript are owned by the session object, not by a call.
//!
//! These are the semantics of `command-stream`'s `captureTerminal()`
//! (see issue #47), minus its single-batch lifecycle — which is exactly the
//! part that does not fit an HTTP flow.
//!
//! Every call here is blocking. Callers on an async runtime must wrap them in
//! `tokio::task::spawn_blocking`.

use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use portable_pty::{Child, CommandBuilder, MasterPty, PtySize, native_pty_system};

/// Terminal width used for spawned sessions.
///
/// Deliberately very wide: the authorization URL is long, and a narrow
/// terminal makes the child hard-wrap it across lines. Extraction can undo
/// that (see [`crate::login_url`]), but not needing to is more reliable.
pub const PTY_COLS: u16 = 400;
/// Terminal height used for spawned sessions.
pub const PTY_ROWS: u16 = 60;

/// How often [`PtySession::wait_for`] re-evaluates its predicate.
const POLL_INTERVAL: Duration = Duration::from_millis(50);

/// A running child process attached to a pseudo-terminal.
///
/// The session stays alive until it is [`killed`](PtySession::kill) or
/// dropped, independent of whatever created it.
pub struct PtySession {
    /// Write half of the PTY master — this is what "typing" goes through.
    writer: Mutex<Box<dyn Write + Send>>,
    /// Everything the child has written so far, plus the time of the last write.
    output: Arc<Mutex<Output>>,
    /// The child handle, used for exit-status polling and termination.
    child: Mutex<Box<dyn Child + Send + Sync>>,
    /// Set by the reader thread when the PTY reaches EOF.
    eof: Arc<AtomicBool>,
    /// Kept alive so the master side of the PTY is not closed early. The
    /// `Mutex` is only there to make the session `Sync`, so it can be shared
    /// between the request that starts a login and the one that finishes it.
    _master: Mutex<Box<dyn MasterPty + Send>>,
}

/// Raw child output plus the instant it last grew.
struct Output {
    bytes: Vec<u8>,
    last_write: Instant,
}

/// Why a [`PtySession::wait_for`] call gave up.
#[derive(Debug)]
pub enum WaitError {
    /// The predicate never held within the timeout.
    Timeout,
    /// The child exited before the predicate held.
    ChildExited(Option<u32>),
}

impl std::fmt::Display for WaitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Timeout => write!(f, "timed out waiting for expected terminal output"),
            Self::ChildExited(code) => match code {
                Some(code) => write!(f, "process exited with status {code} before it was ready"),
                None => write!(f, "process exited before it was ready"),
            },
        }
    }
}

impl std::error::Error for WaitError {}

impl PtySession {
    /// Spawn `command` on a fresh PTY and start draining its output.
    pub fn spawn(command: CommandBuilder) -> std::io::Result<Self> {
        let pty = native_pty_system()
            .openpty(PtySize {
                rows: PTY_ROWS,
                cols: PTY_COLS,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| std::io::Error::other(e.to_string()))?;
        let child = pty
            .slave
            .spawn_command(command)
            .map_err(|e| std::io::Error::other(e.to_string()))?;
        // The slave handle must be dropped, otherwise the master never sees
        // EOF when the child exits.
        drop(pty.slave);

        let mut reader = pty
            .master
            .try_clone_reader()
            .map_err(|e| std::io::Error::other(e.to_string()))?;
        let writer = pty
            .master
            .take_writer()
            .map_err(|e| std::io::Error::other(e.to_string()))?;

        let output = Arc::new(Mutex::new(Output {
            bytes: Vec::new(),
            last_write: Instant::now(),
        }));
        let eof = Arc::new(AtomicBool::new(false));

        let thread_output = Arc::clone(&output);
        let thread_eof = Arc::clone(&eof);
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        if let Ok(mut guard) = thread_output.lock() {
                            guard.bytes.extend_from_slice(&buf[..n]);
                            guard.last_write = Instant::now();
                        }
                    }
                }
            }
            thread_eof.store(true, Ordering::SeqCst);
        });

        Ok(Self {
            writer: Mutex::new(writer),
            output,
            child: Mutex::new(child),
            eof,
            _master: Mutex::new(pty.master),
        })
    }

    /// The child's output so far, with terminal control sequences removed.
    #[must_use]
    pub fn transcript(&self) -> String {
        let bytes = self
            .output
            .lock()
            .map(|guard| guard.bytes.clone())
            .unwrap_or_default();
        strip_ansi(&String::from_utf8_lossy(&bytes))
    }

    /// The last `limit` characters of the transcript, for error reporting.
    ///
    /// Credentials are stripped *before* truncation — this text is destined for
    /// an API response or a log line, and the CLI prints the account token on
    /// this very terminal. See [`crate::login_url::redact_secrets`].
    #[must_use]
    pub fn transcript_tail(&self, limit: usize) -> String {
        let text = crate::login_url::redact_secrets(&self.transcript());
        let trimmed = text.trim();
        if trimmed.chars().count() <= limit {
            return trimmed.to_string();
        }
        let skip = trimmed.chars().count() - limit;
        trimmed.chars().skip(skip).collect()
    }

    /// Block until `predicate` holds over the transcript *and* the child has
    /// been quiet for `idle`.
    ///
    /// The idle requirement is what makes this usable against a repainting
    /// TUI: the text that satisfies the predicate may still be mid-frame when
    /// it first appears, so the settled snapshot is the one worth parsing.
    ///
    /// Returns the settled transcript. `Err(WaitError::ChildExited)` is only
    /// returned when the predicate is still unsatisfied after the child has
    /// exited and its output has been fully drained.
    pub fn wait_for<F>(
        &self,
        predicate: F,
        idle: Duration,
        timeout: Duration,
    ) -> Result<String, WaitError>
    where
        F: Fn(&str) -> bool,
    {
        let deadline = Instant::now() + timeout;
        loop {
            let (text, quiet_for) = self.snapshot();
            if predicate(&text) && quiet_for >= idle {
                return Ok(text);
            }
            // Only give up on an exited child once the reader thread has
            // drained the PTY, so final output is never missed.
            if self.eof.load(Ordering::SeqCst) && quiet_for >= idle {
                return if predicate(&text) {
                    Ok(text)
                } else {
                    Err(WaitError::ChildExited(self.exit_code()))
                };
            }
            if Instant::now() >= deadline {
                return Err(WaitError::Timeout);
            }
            std::thread::sleep(POLL_INTERVAL);
        }
    }

    /// Block until the child exits, returning its exit code.
    pub fn wait_for_exit(&self, timeout: Duration) -> Result<Option<u32>, WaitError> {
        let deadline = Instant::now() + timeout;
        loop {
            if let Some(code) = self.exit_code() {
                return Ok(Some(code));
            }
            if Instant::now() >= deadline {
                return Err(WaitError::Timeout);
            }
            std::thread::sleep(POLL_INTERVAL);
        }
    }

    /// Block until output has stayed quiet for `idle` after this call began.
    ///
    /// Requiring a full idle interval after entry prevents old quiet time from
    /// making a post-input settle return before the child has processed the
    /// newly written bytes.
    pub fn wait_idle(&self, idle: Duration, timeout: Duration) -> Result<(), WaitError> {
        let started = Instant::now();
        let deadline = started + timeout;
        loop {
            let (_, quiet_for) = self.snapshot();
            if started.elapsed() >= idle && quiet_for >= idle {
                return Ok(());
            }
            if Instant::now() >= deadline {
                return Err(WaitError::Timeout);
            }
            std::thread::sleep(POLL_INTERVAL);
        }
    }

    /// Current transcript and how long the child has been quiet.
    fn snapshot(&self) -> (String, Duration) {
        let (bytes, quiet_for) = self.output.lock().map_or_else(
            |_| (Vec::new(), Duration::ZERO),
            |guard| (guard.bytes.clone(), guard.last_write.elapsed()),
        );
        (strip_ansi(&String::from_utf8_lossy(&bytes)), quiet_for)
    }

    /// The child's exit code, or `None` while it is still running.
    #[must_use]
    pub fn exit_code(&self) -> Option<u32> {
        let mut guard = self.child.lock().ok()?;
        match guard.try_wait() {
            Ok(Some(status)) => Some(status.exit_code()),
            _ => None,
        }
    }

    /// Whether the child is still running.
    #[must_use]
    pub fn is_running(&self) -> bool {
        self.exit_code().is_none()
    }

    /// Type `text` into the PTY as if a human had typed it.
    pub fn send_text(&self, text: &str) -> std::io::Result<()> {
        let mut writer = self
            .writer
            .lock()
            .map_err(|_| std::io::Error::other("PTY writer poisoned"))?;
        writer.write_all(text.as_bytes())?;
        writer.flush()
    }

    /// Paste `text` as one bracketed-paste transaction.
    ///
    /// Ink and other terminal UIs use these delimiters to distinguish a paste
    /// from a burst of independent keypresses. Keeping the complete sequence
    /// under one writer lock also prevents another input from interleaving.
    pub fn send_bracketed_paste(&self, text: &str) -> std::io::Result<()> {
        let mut writer = self
            .writer
            .lock()
            .map_err(|_| std::io::Error::other("PTY writer poisoned"))?;
        writer.write_all(b"\x1b[200~")?;
        writer.write_all(text.as_bytes())?;
        writer.write_all(b"\x1b[201~")?;
        writer.flush()
    }

    /// Send a named key. Mirrors `command-stream`'s key vocabulary.
    pub fn send_key(&self, key: Key) -> std::io::Result<()> {
        self.send_text(key.sequence())
    }

    /// Terminate the child. Safe to call more than once.
    pub fn kill(&self) {
        if let Ok(mut guard) = self.child.lock() {
            let _ = guard.kill();
            let _ = guard.wait();
        }
    }
}

impl Drop for PtySession {
    fn drop(&mut self) {
        self.kill();
    }
}

/// Named keys that can be sent to a PTY session.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Key {
    /// Carriage return — what a terminal sends for the Enter key.
    Enter,
    /// Escape.
    Escape,
    /// `Ctrl+C`.
    CtrlC,
}

impl Key {
    /// The byte sequence a terminal emits for this key.
    #[must_use]
    pub const fn sequence(self) -> &'static str {
        match self {
            Self::Enter => "\r",
            Self::Escape => "\x1b",
            Self::CtrlC => "\x03",
        }
    }
}

/// Remove ANSI escape sequences and carriage returns from terminal output.
///
/// This keeps only the printable text, which is what predicates and URL
/// extraction operate on. Cursor movement is not replayed — a repainting TUI
/// therefore leaves repeated text in the transcript, which is why extraction
/// takes the *last* match rather than the first.
#[must_use]
pub fn strip_ansi(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    while let Some(ch) = chars.next() {
        match ch {
            '\x1b' => match chars.next() {
                // CSI: ESC [ params… final-byte in @..~
                Some('[') => {
                    for next in chars.by_ref() {
                        if ('\x40'..='\x7e').contains(&next) {
                            break;
                        }
                    }
                }
                // OSC: ESC ] … terminated by BEL or ESC \
                Some(']') => {
                    while let Some(next) = chars.next() {
                        if next == '\x07' {
                            break;
                        }
                        if next == '\x1b' {
                            if chars.peek() == Some(&'\\') {
                                chars.next();
                            }
                            break;
                        }
                    }
                }
                // Two-character sequences (ESC =, ESC >, charset selects, …).
                Some(_) | None => {}
            },
            '\r' => {}
            // Other C0 controls except newline and tab carry no text.
            c if (c as u32) < 0x20 && c != '\n' && c != '\t' => {}
            c => out.push(c),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_colour_and_cursor_sequences() {
        let raw = "\x1b[2J\x1b[H\x1b[1;32mReady\x1b[0m\r\nnext";
        assert_eq!(strip_ansi(raw), "Ready\nnext");
    }

    #[test]
    fn strips_osc_title_sequences() {
        assert_eq!(strip_ansi("\x1b]0;window title\x07text"), "text");
        assert_eq!(strip_ansi("\x1b]0;window title\x1b\\text"), "text");
    }

    #[test]
    fn keys_map_to_terminal_sequences() {
        assert_eq!(Key::Enter.sequence(), "\r");
        assert_eq!(Key::CtrlC.sequence(), "\x03");
    }
}
