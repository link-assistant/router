//! Temporary client launcher and managed-server CLI arguments.

use std::ffi::OsString;

use clap::{Args, Subcommand};

use crate::clients::ClientKind;

/// Insert the client-argument boundary, and say when a name changed hands.
///
/// One rule, holdable in the head: **everything after the client name belongs
/// to the client, verbatim.** Router options go before it.
///
/// What this replaces was a list of twelve names claimed back from the client
/// wherever they appeared, and the list was neither complete nor derivable
/// from anything a user could see: `--port`, `--host`, `--data-dir` and
/// `--managed` are router options and reached the client, while `--model`,
/// `--token`, `--server` and `--interactive` are router options and did not.
/// Both directions failed silently — `claude --model opus[1m]` was intercepted
/// and validated against the router's catalog, and `with claude --managed`
/// started nothing (issue #299).
///
/// The boundary is the first bare word that names a client, found by skipping
/// options and, for options that take one, their values — taken from the
/// parser itself rather than a hand-kept list, so a value that happens to
/// equal a client name (`--data-dir agent`) no longer shifts the split.
///
/// `--` is still accepted and still consumed, for anyone who prefers to write
/// the boundary out.
#[must_use]
pub fn protect_client_arguments(arguments: Vec<OsString>, nested: bool) -> Vec<OsString> {
    let start = if nested {
        arguments
            .iter()
            .position(|argument| argument == "with")
            .map_or(arguments.len(), |position| position + 1)
    } else {
        1
    };
    let options = wrapper_options();
    let clients: Vec<&str> = ClientKind::ALL
        .iter()
        .flat_map(|kind| [kind.canonical_name(), kind.legacy_name()])
        .collect();
    let mut position = start;
    while position < arguments.len() {
        let value = arguments[position].to_string_lossy().into_owned();
        if value == "--" {
            // An explicit boundary the user wrote: the client name follows it.
            position += 1;
            continue;
        }
        if value.starts_with('-') {
            let name = value
                .split_once('=')
                .map_or(value.as_str(), |(name, _)| name);
            let takes_a_value = !value.contains('=') && options.contains(&(name.to_string(), true));
            position += if takes_a_value { 2 } else { 1 };
            continue;
        }
        if !clients.contains(&value.as_str()) {
            position += 1;
            continue;
        }
        let mut normalized = arguments[..=position].to_vec();
        let forwarded = &arguments[position + 1..];
        if forwarded.is_empty() {
            return normalized;
        }
        let explicit = forwarded.first().is_some_and(|argument| argument == "--");
        let forwarded = if explicit { &forwarded[1..] } else { forwarded };
        // The forward itself is silent. Narrating a rule that behaved exactly
        // as documented turned a settled design decision (issue #299) into a
        // recurring interruption printed into the client's own terminal, once
        // per matching flag, with no way for a reader to say "yes, I know".
        // `with --help` documents the boundary, and `--` states it explicitly
        // for anyone who wants it stated (issue #330).
        normalized.push("--".into());
        normalized.extend(forwarded.iter().cloned());
        return normalized;
    }
    arguments
}

/// Every option `with` itself accepts, and whether it takes a value.
///
/// Read off the parser rather than written down beside it: a hand-kept copy is
/// what made the split undiscoverable and incomplete, and it drifts every time
/// an option is added (issue #299).
fn wrapper_options() -> std::collections::HashSet<(String, bool)> {
    use clap::CommandFactory as _;

    let mut options = std::collections::HashSet::new();
    let mut collect = |command: &clap::Command| {
        for argument in command.get_arguments() {
            // A flag declares zero values; anything else takes one. Clap
            // leaves `num_args` unset for both, so the switch is identified by
            // its `ArgAction`, which is what actually decides.
            let takes_a_value = argument.get_num_args().map_or_else(
                || {
                    !matches!(
                        argument.get_action(),
                        clap::ArgAction::SetTrue
                            | clap::ArgAction::SetFalse
                            | clap::ArgAction::Count
                            | clap::ArgAction::Help
                            | clap::ArgAction::Version
                    )
                },
                |range| range.takes_values(),
            );
            if let Some(long) = argument.get_long() {
                options.insert((format!("--{long}"), takes_a_value));
            }
            for alias in argument.get_all_aliases().unwrap_or_default() {
                options.insert((format!("--{alias}"), takes_a_value));
            }
            if let Some(short) = argument.get_short() {
                options.insert((format!("-{short}"), takes_a_value));
            }
        }
    };
    let root = crate::cli::Cli::command();
    collect(&root);
    if let Some(with) = root.find_subcommand("with") {
        collect(with);
    }
    options
}

/// Options shared by `router with` and the standalone `with-router` binary.
#[derive(Clone, Debug, Args)]
#[command(trailing_var_arg = true)]
pub struct WithArgs {
    /// Permanently configure the client instead of launching it temporarily.
    #[arg(long)]
    pub global: bool,
    /// Restore the exact configuration saved by a previous `--global` call.
    #[arg(long, requires = "global")]
    pub undo: bool,
    /// Force the client's non-interactive/one-shot mode.
    ///
    /// By default a bare positional is read as a prompt and starts a one-shot
    /// run, a flag is read as an option passed to a session, and streams that
    /// are not a terminal are one-shot. Reading *any* forwarded argument as a
    /// task turned `--resume`, `--continue` and `--verbose` into batch runs
    /// (issue #297).
    #[arg(long, conflicts_with = "interactive")]
    pub non_interactive: bool,
    /// Force the client's interactive mode.
    #[arg(long, conflicts_with = "non_interactive")]
    pub interactive: bool,
    /// (deprecated, no-op) Keep the user's own configuration.
    ///
    /// This is the default, and has been since issue #277. Kept as an accepted
    /// flag so existing scripts keep working; passing it changes nothing. The
    /// marker is in the first line because a reader scanning flag names could
    /// not otherwise tell the live options from the retired one (issue #312).
    #[arg(long)]
    pub extend_global_config: bool,
    /// Give the client a configuration directory of its own.
    ///
    /// `with` changes how the client reaches the model and nothing else, so the
    /// user's theme, permissions, MCP servers, `settings.json` and `projects/`
    /// are left in place by default — starting a configured client in first-run
    /// onboarding, with `/resume` listing nothing, is a much larger side effect
    /// than choosing a connection route implies (issue #277).
    ///
    /// Extending adds only the two connection variables to the environment of
    /// the one process being launched; nothing the user owns is written or
    /// modified. A client configured through a file rather than environment
    /// variables cannot be extended, and is given its own directory regardless.
    ///
    /// Isolation remains right for CI and clean-room reproductions, where
    /// passing a flag is normal and cheap.
    ///
    /// It is a no-op for `codex`, `gemini`, `opencode` and `agent`: those are
    /// routed through a file the router writes, so they never use the user's
    /// own directory with or without it. The run says so rather than accepting
    /// the flag silently (issue #312). What they get instead is a profile of
    /// their own that persists between runs, so sessions stay resumable
    /// (issue #298); `--isolated-config` makes that profile disposable.
    #[arg(long, conflicts_with = "extend_global_config")]
    pub isolated_config: bool,
    /// Start a disposable managed container even if a router is already
    /// listening locally.
    ///
    /// The default reuses a running local router (issue #250); CI and
    /// clean-room reproductions want a fresh instance on purpose.
    #[arg(long, conflicts_with = "server")]
    pub managed: bool,
    /// Router origin. No local server is started when this is supplied.
    #[arg(long)]
    pub server: Option<String>,
    /// Use the router running on this machine, not the selected one.
    ///
    /// `with` had `--server` and `--managed` but not `--local`, so it carried
    /// half the target vocabulary every other family has (issue #314).
    #[arg(long, conflicts_with_all = ["server", "managed"])]
    pub local: bool,
    /// Router token. Prefer the environment or `--token-stdin` to shell history.
    #[arg(long, hide_env_values = true, conflicts_with = "token_stdin")]
    pub token: Option<String>,
    /// Read the router token as one line from standard input.
    #[arg(long, conflicts_with = "token")]
    pub token_stdin: bool,
    /// Model the client is launched with.
    ///
    /// Without this the client keeps the model its own configuration selects,
    /// and `with` changes only how that model is reached — the same rule
    /// `--global` follows. A router that picked one by catalog order replaced
    /// the user's choice silently, and the client's status line then presented
    /// the substitution as though the user had made it (issue #295).
    ///
    /// A client whose configuration embeds the router's catalog — `opencode`,
    /// `qwen`, `agent` — is always given an id, because it cannot start
    /// without one.
    #[arg(long)]
    pub model: Option<String>,
    /// Let the router choose a model from the target's live catalog.
    ///
    /// It reports what it picked and why. Without this no model is named and
    /// the client's own configuration decides.
    #[arg(long, conflicts_with = "model")]
    pub pick_model: bool,
    /// Label recorded on the router for this run's token.
    ///
    /// Each run mints a token on the target and the label is stored there. It
    /// defaults to the client name and a short suffix; it used to be the name
    /// of the directory the run was launched from, so a deployment
    /// accumulated a list of the projects its users work in (issue #316).
    /// Anything sent to a router someone else operates should be something you
    /// chose to send.
    #[arg(long)]
    pub label: Option<String>,
    /// Lifetime of an automatically minted per-run token, in hours.
    ///
    /// `--ttl-hours` is accepted too, so the name matches `tokens issue`,
    /// `tokens rotate` and `configure` (issue #314).
    ///
    /// Defaults to a day because this token is revoked when the client exits:
    /// the run already bounds its life, and the clock was a second bound that
    /// could only fire early. At one hour it routinely did — an interactive
    /// session that outlived the hour died mid-work with `401 Token has
    /// expired`, and the client answered with its own `/login` advice about
    /// an unrelated credential (issue #341).
    #[arg(long, alias = "ttl-hours", default_value_t = 24 * 7)]
    pub run_ttl_hours: i64,
    /// Keep a fixed expiry instead of extending it while the run is in use.
    ///
    /// By default the per-run token's expiry slides: every request served
    /// with it pushes the expiry to `now + --run-ttl-hours`, so a session
    /// that is still being used never hits the wall, and one abandoned for
    /// longer than the window still expires. That is what the bound is for --
    /// the run's own life already bounds the token, since it is revoked when
    /// the client exits, and a fixed clock could only ever fire early
    /// (issue #354).
    ///
    /// Pass this to keep the old behaviour: the expiry set at issue time is
    /// final, whatever the session is doing.
    #[arg(long)]
    pub fixed_run_ttl: bool,
    /// Optional request budget for an automatically minted per-run token.
    #[arg(long)]
    pub run_max_requests: Option<u64>,
    /// Client integration to launch or configure.
    #[arg(value_enum)]
    pub client: ClientKind,
    /// Arguments forwarded to the client. Use `--` to make the boundary explicit.
    #[arg(value_name = "CLIENT_ARGS", allow_hyphen_values = true)]
    pub client_args: Vec<OsString>,
}

/// Persistent and managed-local server operations.
#[derive(Debug, Subcommand)]
pub enum ServerOp {
    /// Persist a remote router URL and optional token, or clear that selection.
    Use {
        /// Remote router origin to persist.
        server: Option<String>,
        /// Token to persist with owner-only permissions.
        #[arg(long, hide_env_values = true, conflicts_with = "token_stdin")]
        token: Option<String>,
        /// Read the token as one line from standard input.
        #[arg(long, conflicts_with = "token")]
        token_stdin: bool,
        /// Clear the persisted remote selection and return to automatic local mode.
        #[arg(long)]
        clear: bool,
        /// Default request budget for tokens minted for wrapper runs.
        #[arg(long)]
        run_max_requests: Option<u64>,
    },
    /// Show the selected server source and managed-container lifecycle.
    Status,
    /// Start the shared managed local container.
    Start,
    /// Reveal and claim the managed router's bootstrap administrator credential.
    Claim,
    /// Stop the shared managed local container without deleting its state.
    Stop,
    /// Remove the managed container and volume, destroying saved credentials.
    Remove {
        /// Confirm destructive removal without an interactive prompt.
        #[arg(long)]
        yes: bool,
    },
    /// Reap a crashed wrapper's managed-server reference.
    #[command(hide = true)]
    Reap { pid: u32 },
}

impl WithArgs {
    /// The permanent-setup request `--global` / `--undo` really is.
    ///
    /// `with --global` predates `configure` and stays as an accepted spelling,
    /// so it maps onto the same arguments rather than keeping a second
    /// implementation that can disagree with it (issue #296).
    #[must_use]
    pub fn as_configure(&self) -> crate::cli::ConfigureArgs {
        crate::cli::ConfigureArgs {
            client: Some(self.client),
            all: false,
            undo: self.undo,
            target: crate::cli::AuthTarget {
                local: self.local,
                server: self.server.clone(),
                managed: self.managed,
            },
            token: self.token.clone(),
            token_stdin: self.token_stdin,
            ttl_hours: 8760,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn split(arguments: &[&str], nested: bool) -> Vec<String> {
        protect_client_arguments(arguments.iter().map(OsString::from).collect(), nested)
            .iter()
            .map(|value| value.to_string_lossy().into_owned())
            .collect()
    }

    /// One rule: everything after the client name is the client's.
    ///
    /// What this replaces claimed twelve names back from the client wherever
    /// they appeared, by no principle a user could state — `--port` reached
    /// the client, `--model` was eaten and validated against the router's
    /// catalog (issue #299).
    #[test]
    fn everything_after_the_client_name_reaches_the_client() {
        for option in [
            "--global",
            "--undo",
            "--non-interactive",
            "--interactive",
            "--token-stdin",
            "--model",
            "--server",
            "--managed",
            "--isolated-config",
            "--port",
        ] {
            let split = split(&["router", "with", "codex", option, "value"], true);
            assert_eq!(
                split,
                ["router", "with", "codex", "--", option, "value"],
                "{option} after the client name must reach the client"
            );
        }
    }

    /// The model the client understands can be named without a boundary. The
    /// router intercepted it, validated `opus[1m]` against its own catalog and
    /// aborted a run the client would have accepted (issues #236, #299).
    #[test]
    fn a_client_model_reaches_the_client_and_a_router_model_does_not() {
        let split = split(
            &["with-router", "--model", "A", "qwen", "--model", "B"],
            false,
        );
        let boundary = split.iter().position(|value| value == "--").expect("--");
        assert!(split[..boundary].windows(2).any(|p| p == ["--model", "A"]));
        assert!(
            split[boundary + 1..]
                .windows(2)
                .any(|p| p == ["--model", "B"])
        );
    }

    /// A router option's value is skipped when looking for the boundary, so a
    /// value that happens to name a client no longer shifts the split.
    #[test]
    fn an_option_value_that_names_a_client_is_not_the_boundary() {
        for option in ["--model", "--data-dir", "--upstream-provider"] {
            let split = split(&["with-router", option, "codex", "qwen", "hello"], false);
            assert_eq!(
                split,
                ["with-router", option, "codex", "qwen", "--", "hello"],
                "{option}'s value must not be read as the client name"
            );
        }
    }

    /// An explicit boundary is accepted and consumed exactly once.
    #[test]
    fn an_explicit_boundary_is_not_doubled() {
        let split = split(&["with-router", "codex", "--", "--global", "hi"], false);
        assert_eq!(split, ["with-router", "codex", "--", "--global", "hi"]);
        assert_eq!(split.iter().filter(|value| *value == "--").count(), 1);
    }

    /// A client launched with nothing after it needs no boundary at all.
    #[test]
    fn a_bare_client_is_left_alone() {
        assert_eq!(
            split(&["with-router", "codex"], false),
            ["with-router", "codex"]
        );
    }

    /// The option table comes from the parser, so it cannot drift from it.
    #[test]
    fn the_option_table_is_read_from_the_parser() {
        let options = wrapper_options();
        assert!(
            options.contains(&("--model".to_string(), true)),
            "--model takes a value"
        );
        assert!(
            options.contains(&("--global".to_string(), false)),
            "--global does not"
        );
        assert!(
            options.iter().any(|(name, _)| name == "--isolated-config"),
            "an option missing from a hand-kept list is the defect this prevents"
        );
    }
}
