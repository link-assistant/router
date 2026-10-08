//! Scoped output transport shared by human adapters and importable operations.
use serde_json::Value;
use std::fmt::Arguments;

macro_rules! println {
    () => { crate::operation_output::write(false, format_args!("\n")) };
    ($($argument:tt)*) => { crate::operation_output::write(false, format_args!("{}\n", format_args!($($argument)*))) };
}
macro_rules! eprintln {
    () => { crate::operation_output::write(true, format_args!("\n")) };
    ($($argument:tt)*) => { crate::operation_output::write(true, format_args!("{}\n", format_args!($($argument)*))) };
}
macro_rules! print {
    ($($argument:tt)*) => { crate::operation_output::write(false, format_args!($($argument)*)) };
}

pub fn write(stderr: bool, arguments: Arguments<'_>) {
    let file_diagnostics = crate::logging::FILE_DIAGNOSTICS
        .try_with(|active| *active)
        .ok();
    if stderr && let Some(quiet) = file_diagnostics {
        crate::logging::diagnostic(arguments, quiet);
    }
    write_transport(stderr, arguments, file_diagnostics.unwrap_or(false));
}

fn write_transport(stderr: bool, arguments: Arguments<'_>, quiet: bool) {
    use std::fmt::Write as _;
    use std::io::Write as _;
    if let Some(context) = crate::operation_context::current() {
        let mut output = context.output.lock().expect("operation output lock");
        let target = if stderr {
            &mut output.stderr
        } else {
            &mut output.stdout
        };
        let _ = target.write_fmt(arguments);
    } else if stderr && quiet {
        // Router diagnostics have already reached the file and optional console.
    } else if stderr {
        let _ = std::io::stderr().lock().write_fmt(arguments);
    } else {
        let _ = std::io::stdout().lock().write_fmt(arguments);
    }
}

/// Keep explicitly requested results and interactive prompts on their output channel.
pub fn write_result(stderr: bool, arguments: Arguments<'_>) {
    write_transport(stderr, arguments, false);
}

/// Attach a domain report while retaining its separately rendered human output.
pub fn report(report: impl serde::Serialize) {
    record(serde_json::to_value(report).expect("domain report serializes"));
}

/// Attach structured data while leaving human rendering to the existing adapter.
pub fn record(value: Value) {
    if let Some(context) = crate::operation_context::current() {
        context.output.lock().expect("operation output lock").data = Some(value);
    }
}
