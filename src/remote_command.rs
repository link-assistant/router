//! One targeting rule for every command that reads or changes router state.
//!
//! Targeting used to be decided per command family, so what "the router" meant
//! depended on which subcommand was typed: `auth` and `with` followed the
//! selected server while `tokens`, `accounts`, `providers`, `logs` and `doctor`
//! were local-only and refused to start without a local `TOKEN_SECRET` — even
//! with a selected server reachable and answering in the same second. That
//! turned one predictable behaviour into a table an operator had to memorise
//! (issue #294).
//!
//! The rule is now stated once, here: act on the router this machine is
//! pointed at, and where an operation genuinely has no remote form, say so and
//! name the target rather than silently answering about local state.
//!
//! `TOKEN_SECRET` belongs to the deployment that signs tokens. A workstation
//! driving a remote router authenticates with an admin token instead, so the
//! signing secret has no reason to be there — requiring it pushed operators
//! toward copying it off the host, which is the opposite of what the
//! admin-token design is for.

use std::process::ExitCode;

use crate::cli::{AuthTarget, Command};
use crate::managed_server::ResolvedServer;

/// Which router a command acts on.
///
/// Deliberately not `Debug`: [`ResolvedServer`] holds the admin credential,
/// and a derived formatter is the easiest way for one to reach a log.
pub enum Target {
    /// No selection, or one declined with `--local` / `--managed`.
    Local,
    /// A selected or explicitly named deployment.
    Remote(Box<ResolvedServer>),
}

/// Resolve the router `target` names, reporting a resolution failure itself.
///
/// `Err` carries the exit code to return: an unreachable *named* target is an
/// error in its own right, because quietly falling back to local state is the
/// surprise this exists to prevent.
///
/// # Errors
///
/// Returns the process exit code when a named target cannot be resolved.
pub async fn resolve(target: &AuthTarget) -> Result<Target, ExitCode> {
    match crate::auth_remote::target_for(target.local, target.managed, target.server.as_deref())
        .await
    {
        Ok(Some(server)) => Ok(Target::Remote(Box::new(server))),
        Ok(None) => Ok(Target::Local),
        Err(error) => {
            eprintln!("error: {error}");
            Err(ExitCode::from(1))
        }
    }
}

/// The target flags a command carries, when it has them.
///
/// Reading them off `Command` rather than threading them through each family's
/// dispatch keeps the rule in one place, which is the point of issue #294.
#[must_use]
pub const fn target_of(command: &Command) -> Option<&AuthTarget> {
    match command {
        Command::Tokens { op } => Some(op.target()),
        Command::Accounts { op } => Some(op.target()),
        Command::Providers { op } => Some(op.target()),
        Command::Logs { op } => Some(op.target()),
        Command::Doctor { target } => Some(target),
        Command::Tls { op } => Some(op.target()),
        _ => None,
    }
}

/// Whether this invocation may need a router other than the local one.
///
/// Answers from the flags alone, so `--local` and `--managed` never contact a
/// server and never fail because one is unreachable.
#[must_use]
pub const fn may_be_remote(command: &Command) -> bool {
    match target_of(command) {
        Some(target) => !target.local && !target.managed,
        None => false,
    }
}

/// Whether this invocation named the local state it wants acted on.
///
/// Without a selection, `auth` adopts a router already listening here, because
/// authorizing locally while a live router is one port away lands the
/// credential where that router cannot see it (issue #250). That reasoning
/// does not carry to a command handed `--data-dir` or `--claude-code-home`:
/// those name *this machine's* state explicitly, and redirecting them to a
/// discovered router would answer about a different deployment than the one
/// the operator pointed at — the same wrong-target failure this work exists to
/// remove.
///
/// An explicit `--server` still wins, so naming a router remains the way to
/// ask for one.
#[must_use]
pub const fn names_local_state(cli: &crate::cli::Cli) -> bool {
    cli.data_dir.is_some() || cli.claude_code_home.is_some()
}

/// Let every command that does not serve start without `TOKEN_SECRET`.
///
/// The secret signs this machine's tokens and encrypts its provider keys.
/// Requiring it per *command family* refused to start for commands that sign
/// nothing — a read-only listing, a certificate, a diagnostic — and the check
/// was satisfied by any value, so it only taught operators to keep a
/// deployment's signing secret exported in their shell (issue #308). Worse,
/// the relaxation was attached to "might be remote", so `--local` — the only
/// way to state "this machine" out loud — was the spelling that broke.
///
/// The requirement now lives where the secret is used: signing, validating and
/// encrypting all refuse a stand-in and give the ordinary error (issue #300).
/// That is what makes relaxing here safe rather than merely convenient — the
/// stand-in cannot be mistaken for a key, so a command that needs one still
/// fails, and one that does not simply runs.
///
/// A secret the operator did supply is never overwritten.
#[must_use]
pub fn relax_token_secret_for_cli(mut cli: crate::cli::Cli) -> crate::cli::Cli {
    let serves = matches!(cli.command, None | Some(Command::Serve));
    if !serves && cli.token_secret.as_deref().is_none_or(str::is_empty) {
        cli.token_secret = Some(crate::token_secret::placeholder("cli-command"));
    }
    cli
}

/// Say that an operation has no remote form, naming the router it cannot reach.
///
/// The shape issue #284 gave `auth gh`: an error that names the real target is
/// honest, where one describing local state as though it were the target is
/// not. `alternative` says what *can* be done instead, because a refusal that
/// leaves the operator without a next step is only half an answer.
#[must_use]
pub fn no_remote_form(command: &str, server: &ResolvedServer, alternative: &str) -> Vec<String> {
    vec![
        format!(
            "error: `{command}` reports on the machine it runs on, so it cannot answer for {} \
             from here.",
            server.base_url
        ),
        format!("note: {alternative}"),
        String::from("note: pass --local to report on this machine instead."),
    ]
}

/// Print a refusal and return its exit code.
#[must_use]
pub fn refuse(lines: Vec<String>) -> ExitCode {
    for line in lines {
        eprintln!("{line}");
    }
    ExitCode::from(1)
}

#[cfg(test)]
#[path = "remote_command_tests.rs"]
mod tests;
