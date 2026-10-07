//! Launch adapters and explicit Claude profile-reset confirmation.

use std::io::{IsTerminal as _, Write as _};
use std::path::Path;
use std::process::ExitCode;

use super::{AnyError, ClientKind, WithArgs, run_inner};

/// Execute one wrapper invocation and preserve the client's exit status.
pub async fn run(args: &WithArgs) -> ExitCode {
    let verbose = crate::operation_context::var("VERBOSE").is_ok_and(|value| {
        matches!(
            value.trim().to_ascii_lowercase().as_str(),
            "1" | "true" | "yes" | "on"
        )
    });
    run_with_logging(args, None, verbose).await
}

/// Execute a wrapper with a selected diagnostic state root and verbosity.
///
/// Claude launches persist diagnostics under `data_dir/launcher`; `None` uses
/// the same `DATA_DIR`/`HOME` default as the other Router commands.
pub async fn run_with_logging(args: &WithArgs, data_dir: Option<&Path>, verbose: bool) -> ExitCode {
    if args.client == ClientKind::ClaudeCode && !args.global && !args.undo {
        let work = Box::pin(run_inner(args));
        return crate::launcher_log::run(args, data_dir, verbose, work).await;
    }
    match run_inner(args).await {
        Ok(code) => code,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

pub(super) fn confirm_claude_profile_reset(yes: bool) -> Result<(), AnyError> {
    if yes {
        return Ok(());
    }
    if !std::io::stdin().is_terminal() {
        return Err(
            "Claude profile reset requires interactive confirmation; rerun with --yes before the client name"
                .into(),
        );
    }
    crate::operation_output::write_passthrough(
        true,
        format_args!("Reset the Router-owned Claude profile and keep a recoverable backup? [y/N] "),
    );
    std::io::stderr().flush()?;
    let mut response = String::new();
    std::io::stdin().read_line(&mut response)?;
    if matches!(response.trim().to_ascii_lowercase().as_str(), "y" | "yes") {
        Ok(())
    } else {
        Err("Claude profile reset cancelled; the previous profile is unchanged".into())
    }
}

pub(super) fn exit_code(status: std::process::ExitStatus) -> ExitCode {
    if let Some(code) = status.code() {
        return ExitCode::from(u8::try_from(code).unwrap_or(1));
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::ExitStatusExt as _;
        ExitCode::from(
            status
                .signal()
                .and_then(|signal| u8::try_from(128 + signal).ok())
                .unwrap_or(1),
        )
    }
    #[cfg(not(unix))]
    ExitCode::from(1)
}
