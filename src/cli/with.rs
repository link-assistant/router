//! Temporary client launcher and managed-server CLI arguments.

use std::ffi::OsString;

use clap::{Args, Subcommand};

use crate::clients::ClientKind;

/// Normalize wrapper-owned flags that appear after the client positional.
///
/// Before an explicit `--`, a flag owned by the wrapper is accepted in either
/// position. Everything else is protected behind a clap argument boundary and
/// reaches the client verbatim.
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
    let value_options = [
        "--server",
        "--token",
        "--model",
        "--run-ttl-hours",
        "--run-max-requests",
    ];
    // Derived from the client table rather than hand-listed: a name missing
    // here silently stops protecting that client's arguments, which is what a
    // hardcoded copy invites every time a name changes (issue #220).
    let clients: Vec<&str> = crate::clients::ClientKind::ALL
        .iter()
        .flat_map(|kind| [kind.canonical_name(), kind.legacy_name()])
        .collect();
    let boolean_options = [
        "--global",
        "--undo",
        "--non-interactive",
        "--interactive",
        "--token-stdin",
        "--extend-global-config",
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
            let client = arguments[position].clone();
            let prefix = arguments[..position].to_vec();
            // Router options already given *before* the client name are the
            // router's. A second occurrence after the client belongs to the
            // client: `--model` is defined by five of the seven clients, so
            // routing to one model while telling the client another was
            // otherwise inexpressible, and the parser reported a duplicate
            // router option instead (issue #236).
            // A router option may be given once. The first occurrence is the
            // router's — whether it came before the client name or after it —
            // and any repeat belongs to the client: `--model` is defined by
            // five of the seven clients, so routing to one model while telling
            // the client another was otherwise inexpressible, and the parser
            // reported a duplicate router option instead (issue #236).
            let mut consumed: Vec<String> = prefix
                .iter()
                .map(|item| {
                    let item = item.to_string_lossy();
                    item.split_once('=')
                        .map_or_else(|| item.to_string(), |(name, _)| name.to_string())
                })
                .collect();
            let mut wrapper = Vec::new();
            let mut forwarded = Vec::new();
            let mut cursor = position + 1;
            let mut explicit_boundary = false;
            while cursor < arguments.len() {
                let item = arguments[cursor].to_string_lossy();
                if explicit_boundary {
                    forwarded.push(arguments[cursor].clone());
                    cursor += 1;
                    continue;
                }
                if item == "--" {
                    explicit_boundary = true;
                    cursor += 1;
                    continue;
                }
                if boolean_options.contains(&item.as_ref()) {
                    if consumed.iter().any(|seen| seen == item.as_ref()) {
                        forwarded.push(arguments[cursor].clone());
                    } else {
                        consumed.push(item.to_string());
                        wrapper.push(arguments[cursor].clone());
                    }
                    cursor += 1;
                    continue;
                }
                if value_options.contains(&item.as_ref()) {
                    let repeated = consumed.iter().any(|seen| seen == item.as_ref());
                    if !repeated {
                        consumed.push(item.to_string());
                    }
                    let target = if repeated {
                        &mut forwarded
                    } else {
                        &mut wrapper
                    };
                    target.push(arguments[cursor].clone());
                    if let Some(value) = arguments.get(cursor + 1) {
                        target.push(value.clone());
                        cursor += 2;
                    } else {
                        cursor += 1;
                    }
                    continue;
                }
                if value_options
                    .iter()
                    .any(|option| item.starts_with(&format!("{option}=")))
                {
                    wrapper.push(arguments[cursor].clone());
                    cursor += 1;
                    continue;
                }
                forwarded.push(arguments[cursor].clone());
                cursor += 1;
            }
            let mut normalized = prefix;
            normalized.extend(wrapper);
            normalized.push(client);
            if !forwarded.is_empty() {
                normalized.push("--".into());
                normalized.extend(forwarded);
            }
            return normalized;
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
    /// Keep the user's own configuration and add only the router's connection
    /// settings, so sessions and settings stay visible.
    ///
    /// The default gives the client a configuration directory of its own, which
    /// is right for CI and one-off runs but makes a session started outside the
    /// router impossible to resume: `/resume` lists nothing, because the user's
    /// `projects/` and `settings.json` are not on the path (issue #233).
    #[arg(long)]
    pub extend_global_config: bool,
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
        for option in [
            "--global",
            "--undo",
            "--non-interactive",
            "--interactive",
            "--token-stdin",
        ] {
            let arguments = ["router", "with", "codex", option, "prompt"]
                .into_iter()
                .map(OsString::from)
                .collect();
            assert_eq!(
                protect_client_arguments(arguments, true),
                ["router", "with", option, "codex", "--", "prompt"].map(OsString::from),
                "{option} after the client must remain wrapper-owned"
            );
        }
    }

    #[test]
    fn value_wrapper_flags_after_client_are_accepted() {
        for (option, value) in [
            ("--server", "https://router.test"),
            ("--token", "test-token"),
            ("--model", "gpt-test"),
            ("--run-ttl-hours", "2"),
            ("--run-max-requests", "3"),
        ] {
            let arguments = ["with-router", "codex", option, value, "hi"]
                .into_iter()
                .map(OsString::from)
                .collect();
            assert_eq!(
                protect_client_arguments(arguments, false),
                ["with-router", option, value, "codex", "--", "hi"].map(OsString::from),
                "{option} VALUE after the client must remain wrapper-owned"
            );

            let equals = format!("{option}={value}");
            let arguments = ["with-router", "codex", &equals, "hi"]
                .into_iter()
                .map(OsString::from)
                .collect();
            assert_eq!(
                protect_client_arguments(arguments, false),
                [
                    OsString::from("with-router"),
                    OsString::from(&equals),
                    OsString::from("codex"),
                    OsString::from("--"),
                    OsString::from("hi"),
                ],
                "{option}=VALUE after the client must remain wrapper-owned"
            );
        }
    }

    #[test]
    fn explicit_boundary_forwards_every_colliding_wrapper_flag_verbatim() {
        for option in [
            "--global",
            "--undo",
            "--non-interactive",
            "--interactive",
            "--token-stdin",
            "--server",
            "--token",
            "--model",
            "--run-ttl-hours",
            "--run-max-requests",
        ] {
            let arguments = ["with-router", "codex", "--", option, "client-value"]
                .into_iter()
                .map(OsString::from)
                .collect::<Vec<_>>();
            assert_eq!(
                protect_client_arguments(arguments.clone(), false),
                arguments,
                "{option} after -- must be forwarded to the client"
            );
        }
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

#[cfg(test)]
mod collision_tests {
    use super::protect_client_arguments;
    use std::ffi::OsString;

    fn split(arguments: &[&str]) -> Vec<String> {
        protect_client_arguments(arguments.iter().map(OsString::from).collect(), false)
            .iter()
            .map(|value| value.to_string_lossy().into_owned())
            .collect()
    }

    /// A router option may be given once; a repeat belongs to the client.
    /// `--model` is defined by five of the seven clients, so routing to one
    /// model while telling the client another was inexpressible — the parser
    /// rejected the second occurrence as a duplicate router option (#236).
    #[test]
    fn a_repeated_router_option_is_forwarded_to_the_client() {
        let split = split(&["with-router", "qwen", "--model", "A", "--model", "B"]);
        let separator = split
            .iter()
            .position(|value| value == "--")
            .expect("an explicit boundary is inserted");
        let router = &split[..separator];
        let client = &split[separator + 1..];
        assert!(
            router.windows(2).any(|pair| pair == ["--model", "A"]),
            "the router keeps the first occurrence: {router:?}"
        );
        assert!(
            client.windows(2).any(|pair| pair == ["--model", "B"]),
            "the client receives the repeat: {client:?}"
        );
    }

    /// The same holds for a boolean router option.
    #[test]
    fn a_repeated_boolean_option_is_forwarded() {
        let split = split(&[
            "with-router",
            "qwen",
            "--non-interactive",
            "--non-interactive",
        ]);
        let separator = split.iter().position(|value| value == "--").expect("--");
        assert_eq!(
            split[..separator]
                .iter()
                .filter(|value| *value == "--non-interactive")
                .count(),
            1,
            "the router consumes exactly one"
        );
        assert_eq!(
            split[separator + 1..]
                .iter()
                .filter(|value| *value == "--non-interactive")
                .count(),
            1,
            "the repeat is forwarded"
        );
    }

    /// A single occurrence still belongs to the router, so this is not a
    /// behaviour change for ordinary use.
    #[test]
    fn a_single_router_option_is_still_consumed_by_the_router() {
        let split = split(&["with-router", "qwen", "--model", "A", "--prompt", "hi"]);
        let separator = split.iter().position(|value| value == "--").expect("--");
        assert!(split[..separator].windows(2).any(|p| p == ["--model", "A"]));
        assert!(
            split[separator + 1..]
                .windows(2)
                .any(|p| p == ["--prompt", "hi"]),
            "client options still forward: {split:?}"
        );
    }

    /// Options before the client name are the router's, and a matching name
    /// after it then goes to the client.
    #[test]
    fn an_option_before_the_client_claims_the_router_slot() {
        let split = split(&["with-router", "--model", "A", "qwen", "--model", "B"]);
        let separator = split.iter().position(|value| value == "--").expect("--");
        assert!(split[..separator].windows(2).any(|p| p == ["--model", "A"]));
        assert!(
            split[separator + 1..]
                .windows(2)
                .any(|p| p == ["--model", "B"]),
            "{split:?}"
        );
    }
}
