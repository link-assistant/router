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
        management_server: None,
        local: false,
        token: None,
        token_stdin: false,
        model: None,
        label: None,
        run_ttl_hours: 1,
        fixed_run_ttl: false,
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

/// The launcher is silent when it does the obvious thing.
///
/// A flagged interactive launch is most launches for an interactive tool, and
/// each one printed advice above the client's own banner about an option the
/// user had not asked about. The bare invocation was the silent one, so advice
/// arrived in inverse proportion to how much the user needed it (issue #330).
#[test]
fn an_ordinary_interactive_launch_says_nothing_of_its_own() {
    for forwarded in [&["--verbose"][..], &["--model", "claude-opus-5"], &[]] {
        let launch = plan(&args(ClientKind::ClaudeCode, forwarded), None, true);
        assert!(
            launch.note.is_none(),
            "{forwarded:?} went as typed and needs no announcement: {:?}",
            launch.note
        );
    }
    // A one-shot run with a prompt is equally unremarkable.
    assert!(
        plan(
            &args(ClientKind::ClaudeCode, &["fix the tests"]),
            None,
            true
        )
        .note
        .is_none()
    );
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

#[test]
fn every_current_native_command_stays_in_command_position() {
    let cases: &[(ClientKind, &[&str])] = &[
        (
            ClientKind::Codex,
            &["review", "login", "mcp", "remote-control", "features", "e"],
        ),
        (
            ClientKind::ClaudeCode,
            &["auth", "doctor", "mcp", "plugins", "upgrade"],
        ),
        (
            ClientKind::Opencode,
            &["models", "auth", "mcp", "serve", "db"],
        ),
        (
            ClientKind::GeminiCli,
            &["mcp", "extensions", "skills", "hooks"],
        ),
        (ClientKind::QwenCode, &["mcp", "extensions"]),
        (ClientKind::GrokCli, &["git", "mcp"]),
        (ClientKind::Agent, &["auth"]),
    ];
    for &(client, commands) in cases {
        for command in commands {
            for terminal in [true, false] {
                let launch = plan(&args(client, &[command, "--help"]), None, terminal);
                assert_eq!(
                    rendered(&launch),
                    [command.to_string(), "--help".to_string()],
                    "{client} {command} terminal={terminal}"
                );
                assert!(!launch.one_shot, "native commands are not inference tasks");
            }
        }
    }
}

#[test]
fn separator_is_future_proof_exact_argv_mode() {
    for client in ClientKind::ALL {
        if client == ClientKind::Cursor {
            continue;
        }
        let launch = plan(
            &args(client, &["--", "future-command", "--flag"]),
            None,
            false,
        );
        assert_eq!(
            rendered(&launch),
            ["future-command".to_string(), "--flag".to_string()],
            "{client}"
        );
        assert!(!launch.one_shot);
    }
}

#[test]
fn codex_cloud_is_rejected_before_launch_planning() {
    for command in ["cloud", "cloud-tasks"] {
        assert!(unsupported_native_command(&args(ClientKind::Codex, &[command])).is_some());
        assert!(unsupported_native_command(&args(ClientKind::Codex, &["--", command])).is_some());
    }
    assert!(
        unsupported_native_command(&args(ClientKind::Codex, &["exec", "explain cloud"])).is_none()
    );
    assert!(unsupported_native_command(&args(ClientKind::ClaudeCode, &["cloud"])).is_none());
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

/// The per-run token outlives the session it was minted for.
///
/// `with` launches an interactive client and stays attached for as long as the
/// user works, so a one-hour token was guaranteed to expire in use — the only
/// question was how far in. The token is revoked when the client exits, so the
/// run already bounds its life and the clock was a second bound that could
/// only ever fire early (issue #341).
#[test]
fn the_per_run_token_outlives_an_ordinary_session() {
    use clap::Parser as _;

    let parsed = crate::cli::Cli::try_parse_from(["router", "with", "claude"])
        .expect("a bare launch parses");
    let Some(crate::cli::Command::With(args)) = parsed.command else {
        panic!("with is the command");
    };
    assert!(
        args.run_ttl_hours >= 12,
        "a coding session routinely runs for hours; {} is short enough to expire in use",
        args.run_ttl_hours
    );

    // And the flag still overrides it, for a caller who wants a tighter bound.
    let parsed =
        crate::cli::Cli::try_parse_from(["router", "with", "--run-ttl-hours", "2", "claude"])
            .expect("the flag parses");
    let Some(crate::cli::Command::With(args)) = parsed.command else {
        panic!("with is the command");
    };
    assert_eq!(args.run_ttl_hours, 2, "an explicit lifetime is honoured");
}
