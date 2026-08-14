//! Temporary client launcher and managed-server CLI arguments.

use std::ffi::OsString;

use clap::{Args, Subcommand};

use crate::clients::ClientKind;

/// Insert clap's argument boundary immediately after a wrapper client.
///
/// Clap otherwise continues recognizing wrapper flags after the client name,
/// which makes `with codex --global` configure Codex globally instead of
/// forwarding `--global` to it. The public grammar deliberately ends wrapper
/// option parsing at the client positional.
#[must_use]
pub fn protect_client_arguments(mut arguments: Vec<OsString>, nested: bool) -> Vec<OsString> {
    let start = if nested {
        arguments
            .iter()
            .position(|argument| argument == "with")
            .map_or(arguments.len(), |position| position + 1)
    } else {
        1
    };
    let value_options = [
        "--server",
        "--token",
        "--model",
        "--run-ttl-hours",
        "--run-max-requests",
    ];
    let clients = [
        "codex",
        "claude-code",
        "claude",
        "cursor",
        "gemini-cli",
        "gemini",
        "grok-cli",
        "grok",
        "opencode",
        "qwen-code",
        "qwen",
        "agent",
    ];
    let mut position = start;
    while position < arguments.len() {
        let value = arguments[position].to_string_lossy();
        if value_options.contains(&value.as_ref()) {
            position += 2;
            continue;
        }
        if value_options
            .iter()
            .any(|option| value.starts_with(&format!("{option}=")))
        {
            position += 1;
            continue;
        }
        if clients.contains(&value.as_ref()) {
            let boundary = position + 1;
            if arguments
                .get(boundary)
                .is_none_or(|argument| argument != "--")
            {
                arguments.insert(boundary, "--".into());
            }
            break;
        }
        position += 1;
    }
    arguments
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
    #[arg(long, conflicts_with = "interactive")]
    pub non_interactive: bool,
    /// Force the client's interactive mode.
    #[arg(long, conflicts_with = "non_interactive")]
    pub interactive: bool,
    /// Router origin. No local server is started when this is supplied.
    #[arg(long)]
    pub server: Option<String>,
    /// Router token. Prefer the environment or `--token-stdin` to shell history.
    #[arg(long, hide_env_values = true, conflicts_with = "token_stdin")]
    pub token: Option<String>,
    /// Read the router token as one line from standard input.
    #[arg(long, conflicts_with = "token")]
    pub token_stdin: bool,
    /// Model passed to the client instead of the integration default.
    #[arg(long)]
    pub model: Option<String>,
    /// Lifetime of an automatically minted per-run token.
    #[arg(long, default_value_t = 1)]
    pub run_ttl_hours: i64,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wrapper_flags_after_client_are_protected() {
        let arguments = ["router", "with", "--global", "codex", "--global", "prompt"]
            .into_iter()
            .map(OsString::from)
            .collect();
        assert_eq!(
            protect_client_arguments(arguments, true),
            [
                "router", "with", "--global", "codex", "--", "--global", "prompt"
            ]
            .map(OsString::from)
        );
    }

    #[test]
    fn option_values_that_match_clients_are_not_boundaries() {
        let arguments = ["with-router", "--model", "codex", "qwen", "hello"]
            .into_iter()
            .map(OsString::from)
            .collect();
        assert_eq!(
            protect_client_arguments(arguments, false),
            ["with-router", "--model", "codex", "qwen", "--", "hello"].map(OsString::from)
        );
    }
}
