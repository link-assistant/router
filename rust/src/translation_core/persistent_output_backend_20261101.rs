//! Qualified synchronous persistent output lifecycle. The private native logger
//! algorithms/global LOG remain the original implementations, not copied globals.
use std::collections::BTreeMap;
use std::path::Path;
use std::process::ExitCode;

// Explicit portable ingress restriction, not a replacement for vars_os lossy
// semantics. Invalid original bytes/code units are rejected BEFORE logger IO.
pub(crate) fn persistent_portable_process_environment() {
    let mut names = std::collections::BTreeSet::new();
    let mut count = 0usize;
    let mut bytes = 0usize;
    for (name, value) in std::env::vars_os() {
        let name = name.to_str().expect("unqualified raw environment name");
        let value = value.to_str().expect("unqualified raw environment value");
        assert!(!name.is_empty() && !name.contains(['=', '\0', '\u{fffd}']));
        assert!(!value.contains(['\0', '\u{fffd}']));
        assert!(!name.bytes().all(|byte| byte.is_ascii_digit()));
        let identity = if cfg!(windows) {
            assert!(name.is_ascii(), "unqualified Windows Unicode environment key");
            name.to_ascii_uppercase()
        } else { name.to_string() };
        assert!(names.insert(identity), "unqualified aliased environment name");
        count = count.checked_add(1).expect("environment row overflow");
        bytes = bytes.checked_add(name.len()).and_then(|size| size.checked_add(value.len()))
            .expect("environment byte overflow");
        assert!(count <= 65536 && bytes <= 8388608, "unqualified environment bound");
    }
}

pub struct PersistentOutputContext {
    context: crate::operation_context::OperationContext,
}
impl PersistentOutputContext {
    pub fn new(environment: BTreeMap<String, String>) -> Self {
        // Keeps the String/OsString/JS ordering join exact on every admitted
        // target without assuming UTF16 ordering equals native WTF8 ordering.
        assert!(environment.keys().all(|name| name.is_ascii()),
            "Unicode context key ordering remains unqualified");
        let mut context = crate::operation_context::OperationContext::default();
        context.environment = environment.into_iter().map(|(name, value)| (name.into(), value.into())).collect();
        Self { context }
    }
    pub fn snapshot(&self) -> (String, String) {
        let output = self.context.output.lock().expect("operation output lock");
        (output.stdout.clone(), output.stderr.clone())
    }
    pub fn scope<T>(&self, operation: impl FnOnce() -> T) -> T {
        self.context.scope(operation)
    }
}

pub struct PersistentOutputOptions<'a> {
    pub data_directory: &'a Path,
    pub verbose: bool,
    pub quiet: bool,
    pub operation: &'a str,
    pub token: Option<&'a str>,
    pub secrets: Vec<String>,
    pub version: &'a str,
    pub source_commit: &'a str,
}

pub(crate) struct ProcessExitGuard { finished: bool }
impl ProcessExitGuard {
    fn finish(mut self, code: u8) -> u8 {
        self.finished = true;
        crate::logging::event(::std::format_args!(
            "process_exit exit_code={code} outcome={}",
            if code == 0 { "success" } else { "error" }
        ));
        code
    }
}
impl Drop for ProcessExitGuard {
    fn drop(&mut self) {
        if !self.finished {
            crate::logging::event(::std::format_args!(
                "process_exit exit_code=1 outcome=panic_or_cancelled"
            ));
        }
    }
}

pub fn persistent_run_operational_sync(
    options: &PersistentOutputOptions<'_>,
    work: impl FnOnce() -> u8,
) -> u8 {
    persistent_portable_process_environment();
    if let Err(error) = crate::logging::persistent_owned_install(
        options.data_directory, options.verbose, options.secrets.clone(),
    ) {
        crate::operation_output::write(true, ::std::format_args!(
            "cannot initialize operational log at {}: {error}\n",
            options.data_directory.join("logs").display()
        ));
        return 1;
    }
    crate::logging::event(::std::format_args!(
        "process_start version={} source_commit={} operation={}",
        options.version, options.source_commit, options.operation
    ));
    let guard = ProcessExitGuard { finished: false };
    let code = crate::logging::FILE_DIAGNOSTICS.sync_scope(options.quiet, work);
    guard.finish(code)
}

pub fn persistent_run_launcher_sync(
    options: &PersistentOutputOptions<'_>,
    work: impl FnOnce() -> Result<u8, String>,
) -> u8 {
    if crate::operation_context::current().is_none() {
        persistent_portable_process_environment();
    }
    let log = match crate::launcher_log::PersistentOwnedDiagnosticLog::open(
        options.data_directory, options.verbose,
    ) {
        Ok(log) => log,
        Err(error) => {
            if options.verbose || crate::operation_context::current().is_some() {
                crate::operation_output::write(true, ::std::format_args!(
                    "error: could not open launcher log {}: {error}\n",
                    options.data_directory.display()
                ));
            }
            return 1;
        }
    };
    if let Some(token) = options.token { log.add_secret_exact(token); }
    log.record("launch_started", "Claude launcher diagnostics opened");
    if let Err(error) = log.check() {
        if options.verbose || crate::operation_context::current().is_some() {
            crate::operation_output::write(true, ::std::format_args!("error: {error}\n"));
        }
        return 1;
    }
    log.scope(|| {
        let code = match work() {
            Ok(number) => {
                let code = ExitCode::from(number);
                if code != ExitCode::SUCCESS {
                    log.record("launch_failed", &::std::format!("launcher exit status: {code:?}"));
                }
                log.record("launch_finished", &::std::format!("launcher exit status: {code:?}"));
                number
            }
            Err(error) => {
                log.record("launch_failed", &error);
                crate::operation_output::write(true, ::std::format_args!("error: {error}\n"));
                1
            }
        };
        if let Err(error) = log.check() {
            crate::operation_output::write(true, ::std::format_args!("error: {error}\n"));
            1
        } else { code }
    })
}

pub fn persistent_run_launcher_operational_sync(
    options: &PersistentOutputOptions<'_>,
    work: impl FnOnce() -> u8,
) -> u8 {
    persistent_run_launcher_sync(options, || Ok(persistent_run_operational_sync(options, work)))
}

pub fn persistent_add_launcher_secret(secret: &str) {
    crate::launcher_log::add_secret(Some(secret));
}
pub fn persistent_check_launcher() -> Result<(), String> {
    crate::launcher_log::check()
}
pub fn persistent_record_launcher(event: &str, message: &str) {
    crate::launcher_log::record(event, message);
}

pub struct PersistentLauncherWriter {
    writer: Option<crate::launcher_log::PersistentOwnedTraceWriter>,
    bytes: usize,
}
impl PersistentLauncherWriter {
    pub fn write(&mut self, bytes: &[u8]) -> u64 {
        let size = self.bytes.checked_add(bytes.len()).expect("writer byte overflow");
        assert!(size <= 2097152, "owned writer complete byte domain");
        self.bytes = size;
        self.writer.as_mut().expect("live launcher writer").write(bytes).expect("native byte-vector write is infallible")
    }
    pub fn flush(&mut self) {
        self.writer.as_mut().expect("live launcher writer").flush().expect("native byte-vector flush is infallible")
    }
    pub fn finish(mut self) { self.writer.take().expect("live launcher writer").finish(); }
}
pub fn persistent_trace_writer() -> PersistentLauncherWriter {
    PersistentLauncherWriter {
        writer: Some(crate::launcher_log::persistent_owned_trace_writer()
            .expect("actual active launcher writer scope required")),
        bytes: 0,
    }
}
pub struct PersistentOperationalWriter {
    writer: Option<crate::operational_log::RecordWriter>,
    bytes: usize,
}
impl PersistentOperationalWriter {
    pub fn write(&mut self, bytes: &[u8]) -> u64 {
        use std::io::Write as _;
        let size = self.bytes.checked_add(bytes.len()).expect("writer byte overflow");
        assert!(size <= 2097152, "owned writer complete byte domain");
        self.bytes = size;
        self.writer.as_mut().expect("live operational writer").write(bytes).expect("native byte-vector write is infallible") as u64
    }
    pub fn flush(&mut self) {
        use std::io::Write as _;
        self.writer.as_mut().expect("live operational writer").flush().expect("native byte-vector flush is infallible")
    }
    pub fn finish(mut self) { drop(self.writer.take().expect("live operational writer")); }
}
pub fn persistent_operational_writer() -> PersistentOperationalWriter {
    PersistentOperationalWriter {
        writer: Some(crate::logging::persistent_owned_writer()
            .expect("actual installed operational writer required")),
        bytes: 0,
    }
}

pub fn persistent_with_trace_writer<T>(work: impl FnOnce(&mut PersistentLauncherWriter) -> T) -> T {
    let mut writer = persistent_trace_writer();
    let result = work(&mut writer);
    writer.finish();
    result
}
pub fn persistent_with_operational_writer<T>(work: impl FnOnce(&mut PersistentOperationalWriter) -> T) -> T {
    let mut writer = persistent_operational_writer();
    let result = work(&mut writer);
    writer.finish();
    result
}
