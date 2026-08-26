//! Tests for the two decisions `with` makes on the user's behalf.

use super::*;

fn args(client: ClientKind, client_args: &[&str]) -> WithArgs {
    WithArgs {
        managed: false,
        global: false,
        undo: false,
        non_interactive: false,
        interactive: false,
        extend_global_config: false,
        isolated_config: false,
        pick_model: false,
        server: None,
        local: false,
        token: None,
        token_stdin: false,
        model: None,
        label: None,
        run_ttl_hours: 1,
        run_max_requests: None,
        client,
        client_args: client_args.iter().map(OsString::from).collect(),
    }
}

fn argv(client: ClientKind, client_args: &[&str]) -> Vec<String> {
    rendered(&plan(&args(client, client_args), None, true))
}

fn rendered(launch: &Launch) -> Vec<String> {
    launch
        .arguments
        .iter()
        .map(|value| value.to_string_lossy().into_owned())
        .collect()
}

/// The defect in issue #297: `with claude --resume <id>` added `--print`, so
/// the client was told to resume a session, answer once and exit — with no
/// prompt to answer. Its own error was correct and named neither `--print`
/// nor the router.
#[test]
fn a_client_flag_does_not_turn_a_session_into_a_one_shot_run() {
    for forwarded in [
        &["--resume", "2a42a73e"][..],
        &["--continue"],
        &["--verbose"],
        &["--debug"],
        &["--add-dir", "/tmp"],
        &["--dangerously-skip-permissions"],
    ] {
        let rendered = argv(ClientKind::ClaudeCode, forwarded);
        assert!(
            !rendered.iter().any(|argument| argument == "--print"),
            "{forwarded:?} must launch a session, not a batch run: {rendered:?}"
        );
        assert!(
            rendered.ends_with(
                &forwarded
                    .iter()
                    .map(ToString::to_string)
                    .collect::<Vec<_>>()
            ),
            "the client's own arguments must still reach it: {rendered:?}"
        );
    }
}

/// The other half of the same rule: a bare positional *is* a prompt, so the
/// one-shot case that already worked keeps working with no flag.
#[test]
fn a_bare_positional_is_still_a_one_shot_prompt() {
    let rendered = argv(ClientKind::ClaudeCode, &["fix the tests"]);
    assert!(
        rendered.iter().any(|argument| argument == "--print"),
        "a prompt is a task: {rendered:?}"
    );
    // Codex and OpenCode spell the mode as a subcommand, which must come first.
    assert_eq!(
        argv(ClientKind::Codex, &["fix the tests"]).first(),
        Some(&"exec".to_string())
    );
}

/// Nobody is holding a session when the streams are pipes, so CI and shell
/// pipelines keep their one-shot behaviour without learning a flag.
#[test]
fn a_run_without_a_terminal_is_one_shot() {
    let launch = plan(&args(ClientKind::ClaudeCode, &["--verbose"]), None, false);
    assert!(rendered(&launch).iter().any(|value| value == "--print"));
    assert!(
        launch.note.is_none(),
        "nothing was guessed: there is no terminal to hold a session"
    );
}

/// Both overrides still win over the rule, in both directions.
#[test]
fn the_explicit_flags_win_over_the_rule() {
    let mut interactive = args(ClientKind::ClaudeCode, &["fix the tests"]);
    interactive.interactive = true;
    assert!(
        !rendered(&plan(&interactive, None, true))
            .iter()
            .any(|value| value == "--print")
    );

    let mut one_shot = args(ClientKind::ClaudeCode, &["--resume", "abc"]);
    one_shot.non_interactive = true;
    assert!(
        rendered(&plan(&one_shot, None, true))
            .iter()
            .any(|value| value == "--print")
    );
}

/// A guess is reported at the moment it is made. Without this the only signal
/// is an error the client writes about itself, several lines later.
#[test]
fn an_inferred_session_says_so_and_an_unambiguous_one_stays_quiet() {
    let guessed = plan(&args(ClientKind::ClaudeCode, &["--verbose"]), None, true);
    let note = guessed.note.expect("an inferred mode is reported");
    assert!(note.contains("--non-interactive"), "{note}");

    for unambiguous in [&[][..], &["fix the tests"]] {
        assert!(
            plan(&args(ClientKind::ClaudeCode, unambiguous), None, true)
                .note
                .is_none(),
            "{unambiguous:?} needed no guess"
        );
    }
}

/// The defect in issue #295: a bare launch replaced the model the user had
/// configured with whatever sorted first in the catalog for that vendor.
#[test]
fn a_bare_launch_names_no_model() {
    for client in ClientKind::ALL {
        if requires_a_model(client) || client.integration().model_arg.is_none() {
            continue;
        }
        let rendered = argv(client, &[]);
        assert!(
            !rendered.iter().any(|argument| argument == "--model"),
            "{client} was given a model nobody asked for: {rendered:?}"
        );
    }
}

/// Asking for one still works, and the id reaches the client unchanged.
#[test]
fn an_explicit_model_is_passed_through() {
    let launch = plan(&args(ClientKind::ClaudeCode, &[]), Some("opus[1m]"), true);
    assert!(
        rendered(&launch)
            .windows(2)
            .any(|pair| pair == ["--model", "opus[1m]"]),
        "{:?}",
        rendered(&launch)
    );
}

/// A client whose configuration embeds the catalog cannot start without a
/// model, so that one is still filled in — it is the client's requirement
/// rather than a preference being overridden.
#[test]
fn a_client_that_cannot_start_without_a_model_still_gets_one() {
    for client in [
        ClientKind::Opencode,
        ClientKind::QwenCode,
        ClientKind::Agent,
    ] {
        assert!(requires_a_model(client), "{client}");
    }
    for client in [
        ClientKind::ClaudeCode,
        ClientKind::Codex,
        ClientKind::GeminiCli,
        ClientKind::GrokCli,
    ] {
        assert!(!requires_a_model(client), "{client}");
    }
    let launch = plan(&args(ClientKind::Opencode, &[]), Some("some-model"), true);
    assert!(
        rendered(&launch)
            .windows(2)
            .any(|pair| pair == ["--model", "link-assistant/some-model"]),
        "opencode namespaces the id it was given: {:?}",
        rendered(&launch)
    );
}

/// A model the client was told about itself is never overridden.
#[test]
fn a_model_the_client_was_given_wins() {
    let launch = plan(
        &args(ClientKind::ClaudeCode, &["--model", "theirs"]),
        Some("ours"),
        true,
    );
    let rendered = rendered(&launch);
    assert_eq!(
        rendered.iter().filter(|value| *value == "--model").count(),
        1,
        "{rendered:?}"
    );
    assert!(
        rendered.iter().any(|value| value == "theirs"),
        "{rendered:?}"
    );
}

#[test]
fn colliding_wrapper_flags_after_client_are_forwarded() {
    let rendered = argv(ClientKind::Codex, &["--global", "hi"]);
    assert!(rendered.ends_with(&["--global".to_string(), "hi".to_string()]));
    // `--global` is a flag, so the mode comes from the terminal rule; this
    // path has one, and the trailing `hi` is not in first position.
    assert_ne!(rendered.first().map(String::as_str), Some("exec"));
}

#[test]
fn explicit_separator_is_not_forwarded() {
    let rendered = argv(ClientKind::Opencode, &["--", "run", "hi"]);
    assert_eq!(rendered.first().map(String::as_str), Some("run"));
    assert_eq!(
        rendered.iter().filter(|arg| arg.as_str() == "run").count(),
        1
    );
}

#[test]
fn command_mode_word_inside_prompt_is_not_treated_as_the_subcommand() {
    let rendered = argv(ClientKind::Opencode, &["explain", "run"]);
    assert_eq!(rendered.first().map(String::as_str), Some("run"));
    assert!(rendered.ends_with(&["explain".to_string(), "run".to_string()]));
}

/// The defect in the issue #297 follow-up: for four clients the injected mode
/// argument takes the prompt as its *value*, and it was inserted immediately
/// before whatever the user passed. With a flag there, that flag landed where
/// the prompt belongs — Claude Code fails loudly, these four risk the next
/// argument being read as prompt text.
#[test]
fn a_mode_argument_that_takes_a_prompt_is_not_placed_before_a_flag() {
    for client in [
        ClientKind::GeminiCli,
        ClientKind::GrokCli,
        ClientKind::QwenCode,
        ClientKind::Agent,
    ] {
        assert!(
            client.integration().non_interactive_arg_takes_a_value,
            "{client} spells its mode as a flag taking the prompt"
        );
        let mut one_shot = args(client, &["--yolo"]);
        one_shot.non_interactive = true;
        let launch = plan(&one_shot, None, true);
        let rendered = rendered(&launch);
        let mode = client
            .integration()
            .non_interactive_arg
            .expect("these clients have one");
        assert!(
            !rendered
                .windows(2)
                .any(|pair| pair[0] == mode && pair[1] == "--yolo"),
            "{client}: the user's flag was placed where the prompt value belongs: {rendered:?}"
        );
        assert!(
            launch.note.is_some(),
            "{client}: a mode that could not be applied must say so"
        );
    }
}

/// With a prompt present the mode is applied as before, and the prompt follows
/// it immediately — which is what makes the value placement correct.
#[test]
fn a_prompt_still_gets_the_mode_argument() {
    let launch = plan(&args(ClientKind::GeminiCli, &["fix the tests"]), None, true);
    let rendered = rendered(&launch);
    assert!(
        rendered
            .windows(2)
            .any(|pair| pair == ["-p", "fix the tests"]),
        "{rendered:?}"
    );
}

/// A mode the user already asked for is not asked for again. The comparison
/// was exact against one string, so Claude Code's own `-p` was not recognised
/// as the `--print` it is and both ended up on the command line (issue #297).
#[test]
fn a_mode_the_user_already_spelled_is_not_repeated() {
    let rendered = argv(ClientKind::ClaudeCode, &["-p", "hi"]);
    assert!(
        !rendered.iter().any(|value| value == "--print"),
        "the mode was added on top of the user's own spelling: {rendered:?}"
    );
    assert_eq!(rendered, ["-p", "hi"], "{rendered:?}");
}

/// Codex refuses to run outside a git repository because that check is what
/// stops an agent editing a directory with nothing to diff and nothing to
/// revert. The router turned it off for every run it supplied `exec` for, and
/// left it on when the user typed `exec` themselves (issue #310).
#[test]
fn the_clients_own_git_guard_is_left_alone() {
    for forwarded in [&["fix the tests"][..], &["exec", "fix the tests"]] {
        let rendered = argv(ClientKind::Codex, forwarded);
        assert!(
            !rendered
                .iter()
                .any(|value| value == "--skip-git-repo-check"),
            "{forwarded:?}: {rendered:?}"
        );
    }
}
