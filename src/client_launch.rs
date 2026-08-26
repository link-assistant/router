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
        if integration.non_interactive_arg_takes_a_value && !carries_a_prompt(&forwarded) {
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
