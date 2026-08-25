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
pub(crate) struct Launch {
    pub arguments: Vec<OsString>,
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
pub(crate) const fn requires_a_model(client: ClientKind) -> bool {
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
    carries_a_prompt(forwarded) || !attached_to_a_terminal
}

fn carries_a_prompt(forwarded: &[OsString]) -> bool {
    forwarded
        .first()
        .is_some_and(|argument| !argument.to_string_lossy().starts_with('-'))
}

/// Whether standard input and output both belong to a terminal.
///
/// Piped or redirected means nobody is there to hold a session, so the run is
/// one-shot with no flag — which is how `with` is used from CI and scripts.
pub(crate) fn attached_to_a_terminal() -> bool {
    use std::io::IsTerminal as _;

    std::io::stdin().is_terminal() && std::io::stdout().is_terminal()
}

/// Build the wrapped client's argv.
///
/// `resolved_model` is `None` unless the user asked for a model or the client
/// cannot start without one; the router no longer picks one by catalog order
/// on the user's behalf (issue #295).
pub(crate) fn plan(
    args: &WithArgs,
    resolved_model: Option<&str>,
    attached_to_a_terminal: bool,
) -> Launch {
    let integration = args.client.integration();
    let mut forwarded = args.client_args.clone();
    if forwarded.first().is_some_and(|value| value == "--") {
        forwarded.remove(0);
    }
    let non_interactive = is_one_shot(args, &forwarded, attached_to_a_terminal);
    let mode = integration.non_interactive_arg;
    let has_mode = contains_native_mode(args.client, &forwarded);
    let note = (!non_interactive
        && !args.interactive
        && !forwarded.is_empty()
        && !has_mode
        && !carries_a_prompt(&forwarded))
    .then_some(
        "note: no prompt was given, so an interactive session is starting; \
         pass --non-interactive for one-shot output",
    );
    let model = resolved_model
        .filter(|_| !contains_model_argument(&forwarded))
        .and_then(|model| {
            integration
                .model_arg
                .map(|flag| [OsString::from(flag), model_selector(args.client, model).into()])
        });
    let command_mode = matches!(args.client, ClientKind::Codex | ClientKind::Opencode);
    let mut result = Vec::new();
    if command_mode && has_mode {
        result.push(forwarded.remove(0));
    } else if command_mode
        && non_interactive
        && let Some(mode) = mode
    {
        result.push(mode.into());
        if args.client == ClientKind::Codex {
            result.push("--skip-git-repo-check".into());
        }
    }
    if let Some(model) = model {
        result.extend(model);
    }
    if !command_mode
        && non_interactive
        && !has_mode
        && let Some(mode) = mode
    {
        result.push(mode.into());
    }
    result.extend(forwarded);
    Launch {
        arguments: result,
        note,
    }
}

fn contains_native_mode(client: ClientKind, arguments: &[OsString]) -> bool {
    let Some(mode) = client.integration().non_interactive_arg else {
        return false;
    };
    if matches!(client, ClientKind::Codex | ClientKind::Opencode) {
        arguments.first().is_some_and(|argument| argument == mode)
    } else {
        arguments.iter().any(|argument| argument == mode)
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
