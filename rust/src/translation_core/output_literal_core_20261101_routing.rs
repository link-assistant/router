//! Explicit synchronous dependency routing and independent memory adapter.
//! The production bridge delegates the ORIGINAL operation_output functions;
//! this backend contract does not replace native persistent host logging.
use std::cell::RefCell;
use std::fmt::Arguments;
use std::io;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mode { Write, Result, Passthrough }

pub trait OutputBackend {
    fn capture(&self, text: Arguments<'_>) -> bool;
    fn file_diagnostics(&self) -> Option<bool>;
    fn diagnostic(&self, text: Arguments<'_>, quiet: bool);
    fn context_write(&self, stderr: bool, text: Arguments<'_>) -> bool;
    fn process_write(&self, stderr: bool, text: Arguments<'_>) -> io::Result<()>;
}

pub fn route(backend: &impl OutputBackend, mode: Mode, stderr: bool, text: Arguments<'_>) {
    if mode == Mode::Write {
        if backend.capture(text) { return; }
        let diagnostics = backend.file_diagnostics();
        if stderr && let Some(quiet) = diagnostics { backend.diagnostic(text, quiet); }
        transport(backend, stderr, text, diagnostics.unwrap_or(false));
    } else {
        transport(backend, stderr, text, false);
    }
}
fn transport(backend: &impl OutputBackend, stderr: bool, text: Arguments<'_>, quiet: bool) {
    if backend.context_write(stderr, text) { return; }
    if stderr && quiet { return; }
    let _ = backend.process_write(stderr, text);
}

/// A concrete memory adapter with the same explicit finite owned envelope as JS.
/// Its capture text is intentionally unredacted: this tests routing, not the OPEN
/// native launcher redaction/locking/rotation implementation boundary.
#[derive(Clone, Copy, Debug)]
pub struct MemoryOptions {
    pub capture_active: bool,
    pub capture_terminal: bool,
    pub operation_active: bool,
    pub file_diagnostics: Option<bool>,
    pub transport_error: bool,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Event { pub kind: &'static str, pub stderr: bool, pub text: String, pub quiet: Option<bool> }
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Snapshot { pub stdout: String, pub stderr: String, pub events: Vec<Event>, pub bytes: usize }
pub struct MemoryBackend { options: MemoryOptions, state: RefCell<Snapshot> }
impl MemoryBackend {
    pub fn new(options: MemoryOptions) -> Self { Self { options, state: RefCell::default() } }
    pub fn snapshot(&self) -> Snapshot { self.state.borrow().clone() }
    fn event(&self, kind: &'static str, stderr: bool, text: Arguments<'_>, quiet: Option<bool>) {
        let text = text.to_string();
        assert!(text.len() <= 2 * 1024 * 1024, "owned text UTF8 bound");
        let mut state = self.state.borrow_mut();
        assert!(state.events.len() < 4096 && state.bytes <= 8 * 1024 * 1024 - text.len(), "owned memory event/UTF8 envelope");
        state.bytes += text.len();
        state.events.push(Event { kind, stderr, text, quiet });
    }
}
impl OutputBackend for MemoryBackend {
    fn capture(&self, text: Arguments<'_>) -> bool {
        self.event("capture-probe", false, text, None);
        if !self.options.capture_active { return false; }
        self.event("capture-record", false, text, None);
        if self.options.capture_terminal || self.options.operation_active {
            if !self.context_write(true, text) { let _ = self.process_write(true, text); }
        }
        true
    }
    fn file_diagnostics(&self) -> Option<bool> { self.options.file_diagnostics }
    fn diagnostic(&self, text: Arguments<'_>, quiet: bool) { self.event("diagnostic", true, text, Some(quiet)); }
    fn context_write(&self, stderr: bool, text: Arguments<'_>) -> bool {
        if !self.options.operation_active { return false; }
        self.event("context", stderr, text, None);
        use std::fmt::Write as _;
        let mut state = self.state.borrow_mut();
        let target = if stderr { &mut state.stderr } else { &mut state.stdout };
        let _ = target.write_fmt(text);
        true
    }
    fn process_write(&self, stderr: bool, text: Arguments<'_>) -> io::Result<()> {
        self.event("process", stderr, text, None);
        if self.options.transport_error { Err(io::Error::other("injected transport IO failure")) } else { Ok(()) }
    }
}
