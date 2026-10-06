//! Shared fallible argument parser.
use super::{Cli, Command};

/// Parse the CLI, hiding options that cannot affect the subcommand shown.
///
/// `with` and `configure` return before the server configuration is built, so
/// none of the binary's ~28 global options — `--host`, `--port`,
/// `--storage-policy`, `--upstream-base-url` and the rest — reaches them.
/// Clap lists a global under every subcommand, so `with --help` advertised
/// them as options of `with`: `--verbose` was accepted and produced no
/// logging, and `--port` written after the client name went to the client
/// (issue #312). Listing options that cannot work is worse than omitting them.
///
/// Only the *help* changes. A global still parses wherever it always did, so
/// no existing invocation breaks.
pub fn try_parse_arguments(arguments: Vec<std::ffi::OsString>) -> Result<Cli, clap::Error> {
    use clap::FromArgMatches as _;

    let mut command = crate::contracts::command();
    // Globals are declared on the root and propagated into every subcommand
    // when the parser is built, so they can only be hidden before that — and
    // only for the invocations they cannot affect. `router tokens list --help`
    // still lists them, because there they work.
    if names_a_client_launcher(&arguments) {
        command = command.mut_args(|argument| {
            if argument.is_global_set() {
                argument.hide(true)
            } else {
                argument
            }
        });
    }
    // The usage strings that hide the globals are written with a `{name}`
    // placeholder, because clap does not interpolate one there. Substituting
    // the invoked name here keeps both properties at once: the error usage
    // line still omits globals that are not required (issue #312), and it
    // names the binary the reader actually ran rather than hardcoding `router`
    // under both installed names (issue #315).
    let invoked = arguments
        .first()
        .map(std::path::Path::new)
        .and_then(std::path::Path::file_stem)
        .map_or_else(
            || "router".to_string(),
            |name| name.to_string_lossy().into_owned(),
        );
    command = substitute_usage_name(command, &invoked);
    let matches = command.try_get_matches_from(arguments)?;
    let mut cli = Cli::from_arg_matches(&matches)?;
    // A propagated global default is not a deploy override of --config (#688).
    if let Some(Command::Deploy(deploy)) = &mut cli.command
        && matches
            .subcommand_matches("deploy")
            .and_then(|args| args.value_source("port"))
            == Some(clap::parser::ValueSource::DefaultValue)
    {
        deploy.port = None;
    }
    Ok(cli)
}

/// The subcommands whose usage line is written out, and what follows the name.
///
/// Written out because clap's generated *error* usage lists every configured
/// global as required (issue #312); the leading binary name is substituted at
/// parse time rather than hardcoded, so it is the one the reader invoked
/// (issue #315). One table, so the two rules cannot drift apart.
const OVERRIDDEN_USAGE: [(&[&str], &str); 14] = [
    (&["configure"], "configure [OPTIONS] <CLIENT>"),
    (&["clients", "setup"], "clients setup [OPTIONS] <CLIENT>"),
    (&["clients", "show"], "clients show [OPTIONS] <CLIENT>"),
    (&["clients", "remove"], "clients remove [OPTIONS] <CLIENT>"),
    (&["clients", "doctor"], "clients doctor [OPTIONS] <CLIENT>"),
    (&["tokens", "rotate"], "tokens rotate [OPTIONS] <ID>"),
    (&["tokens", "revoke"], "tokens revoke [OPTIONS] <ID>"),
    (&["tokens", "show"], "tokens show [OPTIONS] <ID>"),
    (
        &["providers", "add"],
        "providers add [OPTIONS] --name <NAME> --base-url <BASE_URL>",
    ),
    (&["providers", "show"], "providers show [OPTIONS] <NAME>"),
    (
        &["providers", "remove"],
        "providers remove [OPTIONS] <NAME>",
    ),
    (
        &["providers", "import"],
        "providers import [OPTIONS] <PATH>",
    ),
    (
        &["auth", "import"],
        "auth import [OPTIONS] [PROVIDER] [DIR]",
    ),
    (&["auth", "clear"], "auth clear [OPTIONS] [PROVIDER]"),
];

/// Write each overridden usage line with the name that was actually invoked.
fn substitute_usage_name(mut command: clap::Command, invoked: &str) -> clap::Command {
    for (path, usage) in OVERRIDDEN_USAGE {
        command = with_subcommand(command, path, &format!("{invoked} {usage}"));
    }
    command
}

/// Apply `usage` to the subcommand reached by `path`.
fn with_subcommand(command: clap::Command, path: &[&str], usage: &str) -> clap::Command {
    let Some((head, rest)) = path.split_first() else {
        return command.override_usage(usage.to_string());
    };
    command.mut_subcommand(head, |subcommand| with_subcommand(subcommand, rest, usage))
}

/// Whether this invocation is one that returns before the server config exists.
///
/// Read off argv rather than the parsed command, because the decision has to be
/// made before parsing. Only the first bare word is consulted, so a *value*
/// that happens to be `with` cannot flip it.
///
/// `tls` joins them because it reads and writes one certificate directory and
/// starts no server: `--port`, `--upstream-base-url` and `--routing-mode`
/// cannot change what it does, and listing twenty such options above the three
/// that matter is what issue #312 removed from `with` (issue #308).
fn names_a_client_launcher(arguments: &[std::ffi::OsString]) -> bool {
    arguments
        .iter()
        .skip(1)
        .map(|argument| argument.to_string_lossy().into_owned())
        .find(|argument| !argument.starts_with('-'))
        .is_some_and(|argument| argument == "with" || argument == "configure" || argument == "tls")
}

/// Parse human CLI arguments, retaining Clap's established help/error behavior.
#[must_use]
pub fn parse_arguments(arguments: Vec<std::ffi::OsString>) -> Cli {
    try_parse_arguments(arguments).unwrap_or_else(|error| error.exit())
}
