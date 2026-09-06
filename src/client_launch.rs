//! What the wrapped client is actually told to do.
//!
//! Two decisions are made here, and both used to be made by accident.
//!
//! **Which session the client starts.** A forwarded argument was read as "this
//! is a one-shot task", so `with claude --resume <id>` added `--print` and the
//! client was told to resume a session, answer once and exit — with no prompt
//! to answer. The client's own error was correct for what it had been asked to
//! do and mentioned neither `--print` nor the router (issue #297). A flag is
//! not a prompt: a bare positional is.
//!
//! **Which model and how hard it thinks.** `with` changes how the client
//! reaches the model. Which model it is, and the effort spent on an answer, are
//! the user's own settings, and replacing them for the duration of a run is a
//! much larger change than choosing a route (issue #295). Both are now left
//! alone unless the user asked, which is what `--global` already did.

use std::ffi::OsString;

use crate::cli::WithArgs;
use crate::clients::ClientKind;

/// The client's argv, plus anything worth telling the user about how it was
/// decided.
pub struct Launch {
    pub arguments: Vec<OsString>,
    /// Whether the client was told to answer once and exit.
    ///
    /// Carried out of here because the answer also decides whether the router
    /// may answer the client's own prompts on the user's behalf: a batch run
    /// cannot answer one, a person at a terminal can (issue #310).
    pub one_shot: bool,
    /// A mode that was inferred rather than stated, reported at the moment it
    /// is chosen. A wrong guess is otherwise invisible until it surfaces
    /// several lines into an error written by the client about itself.
    pub note: Option<&'static str>,
}

/// Whether this client cannot start at all without a model named for it.
///
/// These three are configured by a file that embeds the router's catalog, so
/// the id is part of the configuration the router must write for them to run.
/// That is the client's requirement rather than a preference being overridden,
/// which is why it survives the rule in issue #295.
#[must_use]
pub const fn requires_a_model(client: ClientKind) -> bool {
    matches!(
        client,
        ClientKind::Opencode | ClientKind::QwenCode | ClientKind::Agent
    )
}

/// Whether the run is a one-shot task rather than an interactive session.
///
/// `attached_to_a_terminal` is passed in so the rule is testable without a tty.
fn is_one_shot(args: &WithArgs, forwarded: &[OsString], attached_to_a_terminal: bool) -> bool {
    if args.non_interactive {
        return true;
    }
    if args.interactive {
        return false;
    }
    // A bare positional is a prompt; a flag is an option passed to a session.
    // Reading "any argument at all" as a task turned `--resume`, `--continue`,
    // `--verbose`, `--debug` and `--add-dir` into batch runs (issue #297).
    carries_a_prompt(args.client, forwarded) || !attached_to_a_terminal
}

fn carries_a_prompt(client: ClientKind, forwarded: &[OsString]) -> bool {
    forwarded.first().is_some_and(|argument| {
        !argument.to_string_lossy().starts_with('-')
            && !is_native_command(client, argument.to_string_lossy().as_ref())
    })
}

/// Current native command inventory. The explicit `--` boundary below is the
/// future-proof escape hatch for commands added after this Router release.
const fn native_commands(client: ClientKind) -> &'static [&'static str] {
    match client {
        ClientKind::Codex => &[
            "agents",
            "exec",
            "e",
            "review",
            "login",
            "logout",
            "mcp",
            "plugin",
            "mcp-server",
            "app-server",
            "remote-control",
            "app",
            "completion",
            "update",
            "doctor",
            "sandbox",
            "debug",
            "apply",
            "a",
            "resume",
            "queue",
            "archive",
            "delete",
            "migrate-rollouts",
            "unarchive",
            "fork",
            "cloud",
            "cloud-tasks",
            "exec-server",
            "features",
        ],
        ClientKind::ClaudeCode => &[
            "agents",
            "attach",
            "auth",
            "auto-mode",
            "doctor",
            "gateway",
            "import",
            "install",
            "logs",
            "mcp",
            "plugin",
            "plugins",
            "project",
            "respawn",
            "rm",
            "setup-token",
            "stop",
            "kill",
            "ultrareview",
            "update",
            "upgrade",
        ],
        ClientKind::Opencode => &[
            "completion",
            "acp",
            "mcp",
            "attach",
            "run",
            "debug",
            "providers",
            "auth",
            "agent",
            "upgrade",
            "uninstall",
            "serve",
            "web",
            "models",
            "stats",
            "export",
            "import",
            "github",
            "pr",
            "session",
            "plugin",
            "plug",
            "db",
        ],
        ClientKind::GeminiCli => &[
            "mcp",
            "extensions",
            "extension",
            "skills",
            "skill",
            "hooks",
            "hook",
            "gemma",
        ],
        ClientKind::QwenCode => &["mcp", "extensions"],
        ClientKind::GrokCli => &["git", "mcp"],
        ClientKind::Agent => &["auth"],
        ClientKind::Cursor => &[],
    }
}

fn is_native_command(client: ClientKind, argument: &str) -> bool {
    native_commands(client).contains(&argument)
}

fn codex_root_option_takes_value(argument: &str) -> bool {
    matches!(
        argument,
        "-c" | "--config"
            | "--enable"
            | "--disable"
            | "-i"
            | "--image"
            | "-m"
            | "--model"
            | "--local-provider"
            | "--profile"
            | "-s"
            | "--sandbox"
            | "-a"
            | "--ask-for-approval"
            | "-C"
            | "--cd"
            | "--add-dir"
    )
}

fn codex_root_boolean_option(argument: &str) -> bool {
    matches!(
        argument,
        "--oss"
            | "--search"
            | "--full-auto"
            | "--dangerously-bypass-approvals-and-sandbox"
            | "--no-alt-screen"
            | "-h"
            | "--help"
            | "-V"
            | "--version"
    )
}

fn codex_subcommand(arguments: &[OsString]) -> Option<&str> {
    let mut index = 0;
    while let Some(argument) = arguments.get(index).and_then(|value| value.to_str()) {
        if argument == "--" {
            return arguments.get(index + 1)?.to_str();
        }
        if !argument.starts_with('-') || argument == "-" {
            return Some(argument);
        }
        if codex_root_boolean_option(argument) {
            index += 1;
            continue;
        }
        if codex_root_option_takes_value(argument) {
            arguments.get(index + 1)?;
            index += 2;
            continue;
        }
        if argument.starts_with("--") && argument.contains('=') {
            let name = argument.split_once('=').map(|(name, _)| name)?;
            if codex_root_option_takes_value(name) {
                index += 1;
                continue;
            }
        }
        if ["-c", "-i", "-m", "-s", "-a", "-C"]
            .iter()
            .any(|option| argument.starts_with(option) && argument.len() > option.len())
        {
            index += 1;
            continue;
        }
        // An unknown option can take a value. Guessing past it could mistake
        // that value for a command, so leave it to Codex to diagnose.
        return None;
    }
    None
}

/// Commands whose vendor control plane cannot be routed through the supported
/// Codex split-auth boundary. Detect these before server lookup or token mint.
#[must_use]
pub fn unsupported_native_command(args: &WithArgs) -> Option<&'static str> {
    if args.client != ClientKind::Codex {
        return None;
    }
    matches!(
        codex_subcommand(&args.client_args),
        Some("cloud" | "cloud-tasks")
    )
    .then_some(
        "Codex Cloud tasks cannot be routed: the official Codex client does not support a split credential or custom backend for Cloud; no Router token was minted and no client was launched",
    )
}

/// Whether standard input and output both belong to a terminal.
///
/// Piped or redirected means nobody is there to hold a session, so the run is
/// one-shot with no flag — which is how `with` is used from CI and scripts.
pub fn attached_to_a_terminal() -> bool {
    use std::io::IsTerminal as _;

    std::io::stdin().is_terminal() && std::io::stdout().is_terminal()
}

/// Build the wrapped client's argv.
///
/// `resolved_model` is `None` unless the user asked for a model or the client
/// cannot start without one; the router no longer picks one by catalog order
/// on the user's behalf (issue #295).
pub fn plan(args: &WithArgs, resolved_model: Option<&str>, attached_to_a_terminal: bool) -> Launch {
    let integration = args.client.integration();
    let mut forwarded = args.client_args.clone();
    let exact_argv = forwarded.first().is_some_and(|value| value == "--");
    if exact_argv {
        forwarded.remove(0);
    }
    let native_command = exact_argv
        || forwarded
            .first()
            .is_some_and(|value| is_native_command(args.client, value.to_string_lossy().as_ref()));
    let non_interactive = !native_command && is_one_shot(args, &forwarded, attached_to_a_terminal);
    let mode = integration.non_interactive_arg;
    let has_mode = contains_native_mode(args.client, &forwarded);
    // No note here on purpose. A user who passed no prompt and got an
    // interactive session got the expected outcome of what they typed, and it
    // was announced as though it were a surprise — above the client's own
    // banner, in a terminal the router does not own. The inversion was the
    // tell: a bare launch was silent while any client flag, which is what a
    // user who already knows the tool passes, earned two lines of explanation.
    // The rule is documented on `--non-interactive` and under `with --help`,
    // which is where it is looked up (issue #330).
    let note = None;
    let model = resolved_model
        .filter(|_| !contains_model_argument(&forwarded))
        .and_then(|model| {
            integration.model_arg.map(|flag| {
                [
                    OsString::from(flag),
                    model_selector(args.client, model).into(),
                ]
            })
        });
    let command_mode = matches!(args.client, ClientKind::Codex | ClientKind::Opencode);
    let mut result = Vec::new();
    if command_mode && has_mode {
        result.push(forwarded.remove(0));
    } else if command_mode
        && non_interactive
        && let Some(mode) = mode
    {
        // `--skip-git-repo-check` is deliberately not added. Codex refuses to
        // run outside a git repository because that check is what stops an
        // agent editing a directory with nothing to diff and nothing to
        // revert; the router turned it off for every run it supplied `exec`
        // for, and left it on when the user typed `exec` themselves — the same
        // tool and task with two safety postures (issue #310).
        result.push(mode.into());
    }
    if let Some(model) = model {
        result.extend(model);
    }
    let mut note = note;
    if !command_mode
        && non_interactive
        && !has_mode
        && let Some(mode) = mode
    {
        // For four clients the mode argument takes the prompt as its value, and
        // it was inserted immediately before whatever the user passed. With a
        // flag there, that flag landed where the prompt belongs: Claude Code
        // fails loudly, these four risk having the next argument read as the
        // prompt text — a silent change of meaning (issue #297).
        if integration.non_interactive_arg_takes_a_value
            && !carries_a_prompt(args.client, &forwarded)
        {
            note = Some(
                "note: this client's one-shot mode takes the prompt as an argument and none was \
                 given, so it is launched as an ordinary session",
            );
        } else {
            result.push(mode.into());
        }
    }
    result.extend(forwarded);
    Launch {
        arguments: result,
        one_shot: non_interactive,
        note,
    }
}

/// Whether the user already asked for the client's one-shot mode themselves.
///
/// Every spelling the client accepts counts. Comparing against one exact
/// string meant Claude Code's own `-p` was not recognised as the `--print` it
/// is, so both ended up on the command line (issue #297).
fn contains_native_mode(client: ClientKind, arguments: &[OsString]) -> bool {
    let integration = client.integration();
    let Some(mode) = integration.non_interactive_arg else {
        return false;
    };
    let spellings = |argument: &OsString| {
        argument == mode
            || integration
                .non_interactive_aliases
                .iter()
                .any(|alias| argument == alias)
    };
    // Codex and OpenCode spell the mode as a subcommand, which is only the mode
    // in first position — elsewhere it is an ordinary word of the prompt.
    if matches!(client, ClientKind::Codex | ClientKind::Opencode) {
        arguments.first().is_some_and(spellings)
    } else {
        arguments.iter().any(spellings)
    }
}

fn contains_model_argument(arguments: &[OsString]) -> bool {
    arguments.iter().any(|argument| {
        let argument = argument.to_string_lossy();
        matches!(argument.as_ref(), "-m" | "--model") || argument.starts_with("--model=")
    })
}

fn model_selector(client: ClientKind, model: &str) -> String {
    if matches!(client, ClientKind::Opencode | ClientKind::Agent) && !model.contains('/') {
        format!("link-assistant/{model}")
    } else {
        model.to_string()
    }
}

#[cfg(test)]
#[path = "client_launch_tests.rs"]
mod tests;
