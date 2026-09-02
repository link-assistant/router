//! Tests for the temporary launcher's directories, isolation and settings.
//!
//! Split from `with_command.rs` to keep that file within the repository's
//! 1000-line limit.

use super::*;
/// Gemini CLI resolves settings as `<home>/.gemini/settings.json`, where
/// `<home>` is `GEMINI_CLI_HOME` if set and `$HOME` otherwise. Pointing
/// `GEMINI_CLI_HOME` at the `.gemini` directory made it look one level too
/// deep, fall back to the user's personal settings, and refuse the run
/// (issue #227). Both variables must therefore name the root.
#[test]
fn the_gemini_client_is_pointed_at_the_isolated_home() {
    let root = tempfile::tempdir().expect("isolated root");
    let manager = ClientManager::isolated(root.path());
    let mut command = Command::new("gemini");
    configure_isolation(
        &mut command,
        &manager,
        root.path(),
        ClientKind::GeminiCli,
        true,
    )
    .expect("configure gemini isolation");

    let environment: std::collections::HashMap<_, _> = command
        .get_envs()
        .filter_map(|(key, value)| Some((key.to_string_lossy().into_owned(), value?)))
        .collect();

    for name in ["HOME", "GEMINI_CLI_HOME"] {
        assert_eq!(
            environment.get(name).map(|value| value.to_string_lossy()),
            Some(root.path().to_string_lossy()),
            "{name} must name the isolated root, not the .gemini directory \
             inside it — the CLI appends `.gemini` itself"
        );
    }
    // The file the CLI actually reads lives under that home.
    assert_eq!(
        manager.config_path(ClientKind::GeminiCli),
        root.path().join(".gemini/settings.json")
    );
    // The trusted-directory prompt cannot be answered non-interactively.
    assert_eq!(
        environment
            .get("GEMINI_CLI_TRUST_WORKSPACE")
            .map(|value| value.to_string_lossy()),
        Some(std::borrow::Cow::Borrowed("true"))
    );
}

/// End to end: after preparing the client, the file Gemini CLI actually
/// reads must exist and select the API-key flow. The router previously
/// wrote a correct file the CLI never opened (issue #227).
/// By default the client keeps its own configuration directory, so sessions
/// started outside the router remain visible and a conversation can be
/// resumed through it (issue #233), and an interactive user does not land in
/// first-run onboarding (issue #277).
#[test]
fn the_users_configuration_is_kept_by_default() {
    let models = [RouterModel {
        id: "test-model".to_string(),
        owned_by: "test".to_string(),
    }];
    let extended = TemporaryClient::prepare(&Preparation {
        client: ClientKind::ClaudeCode,
        base_url: "http://router.test",
        token: "task-token",
        model_override: None,
        models: &models,
        isolated_config: false,
        one_shot: true,
        profile_root: None,
    })
    .expect("prepare with the default configuration handling");
    let names: Vec<String> = extended
        .command
        .get_envs()
        .map(|(name, _)| name.to_string_lossy().into_owned())
        .collect();
    assert!(
        !names.iter().any(|name| name == "CLAUDE_CONFIG_DIR"),
        "the user's configuration directory must not be repointed: {names:?}"
    );
    // The router's actual contribution is still applied.
    for required in ["ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL"] {
        assert!(
            names.iter().any(|name| name == required),
            "{required} missing: {names:?}"
        );
    }
    let environment = extended
        .command
        .get_envs()
        .filter_map(|(name, value)| {
            Some((
                name.to_string_lossy().into_owned(),
                value?.to_string_lossy().into_owned(),
            ))
        })
        .collect::<std::collections::HashMap<_, _>>();
    assert_eq!(
        environment.get("ANTHROPIC_BASE_URL").map(String::as_str),
        Some("http://router.test/api/services/anthropic")
    );
    assert_eq!(
        environment
            .get("CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY")
            .map(String::as_str),
        Some("1")
    );
    assert_eq!(
        environment
            .get("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC")
            .map(String::as_str),
        Some("0")
    );
    for cleared in [
        "ANTHROPIC_API_KEY",
        "ANTHROPIC_MODEL",
        "ANTHROPIC_DEFAULT_OPUS_MODEL",
        "ANTHROPIC_DEFAULT_SONNET_MODEL",
        "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    ] {
        assert_eq!(
            environment.get(cleared).map(String::as_str),
            Some(""),
            "{cleared}"
        );
    }

    // Asking for isolation still repoints the directory.
    let isolated = TemporaryClient::prepare(&Preparation {
        client: ClientKind::ClaudeCode,
        base_url: "http://router.test",
        token: "task-token",
        model_override: None,
        models: &models,
        isolated_config: true,
        one_shot: true,
        profile_root: None,
    })
    .expect("prepare isolated");
    assert!(
        isolated
            .command
            .get_envs()
            .any(|(name, _)| name == "CLAUDE_CONFIG_DIR"),
        "--isolated-config must still give the client its own directory"
    );
}

/// Issue #379: Codex supports repeatable global `-c` overlays, so routing does
/// not require replacing `HOME` or `CODEX_HOME`. The overlay must precede the
/// user's subcommand and arguments; `launch` appends those after preparation.
#[test]
fn codex_overlays_routing_without_repointing_user_configuration() {
    let models = [RouterModel {
        id: "gpt-5.6-sol".to_string(),
        owned_by: "codex".to_string(),
    }];
    assert!(
        extends_user_configuration(ClientKind::Codex, false),
        "ordinary Codex runs can layer routing through CLI configuration"
    );
    assert!(
        !extends_user_configuration(ClientKind::Codex, true),
        "explicit isolation must still replace the client configuration"
    );

    let prepared = TemporaryClient::prepare(&Preparation {
        client: ClientKind::Codex,
        base_url: "http://router.test/path?tenant=one",
        token: "task-token",
        model_override: None,
        models: &models,
        isolated_config: false,
        one_shot: true,
        profile_root: None,
    })
    .expect("prepare Codex overlay");

    let environment = prepared
        .command
        .get_envs()
        .map(|(name, value)| (name.to_string_lossy().into_owned(), value))
        .collect::<std::collections::HashMap<_, _>>();
    assert!(!environment.contains_key("HOME"), "{environment:?}");
    assert!(!environment.contains_key("CODEX_HOME"), "{environment:?}");
    assert_eq!(
        environment
            .get("LINK_ASSISTANT_TOKEN")
            .and_then(|value| *value)
            .map(|value| value.to_string_lossy()),
        Some(std::borrow::Cow::Borrowed("task-token"))
    );

    let arguments = prepared
        .command
        .get_args()
        .map(|argument| argument.to_string_lossy().into_owned())
        .collect::<Vec<_>>();
    assert_eq!(
        arguments,
        [
            "-c",
            "model_provider=\"link-assistant\"",
            "-c",
            "model_providers.link-assistant.name=\"Link.Assistant.Router\"",
            "-c",
            "model_providers.link-assistant.base_url=\"http://router.test/path?tenant=one/api/services/codex/v1\"",
            "-c",
            "model_providers.link-assistant.env_key=\"LINK_ASSISTANT_TOKEN\"",
            "-c",
            "model_providers.link-assistant.wire_api=\"responses\"",
        ]
    );

    let isolated = TemporaryClient::prepare(&Preparation {
        client: ClientKind::Codex,
        base_url: "http://router.test",
        token: "task-token",
        model_override: None,
        models: &models,
        isolated_config: true,
        one_shot: true,
        profile_root: None,
    })
    .expect("prepare isolated Codex");
    let isolated_home = isolated
        .command
        .get_envs()
        .find_map(|(name, value)| (name == "HOME").then_some(value?))
        .expect("isolated Codex sets HOME");
    assert_eq!(Path::new(isolated_home), isolated.directory.path());
    assert!(
        isolated
            .command
            .get_envs()
            .any(|(name, value)| name == "CODEX_HOME" && value.is_none()),
        "isolation must prevent an inherited CODEX_HOME from escaping"
    );
    assert!(isolated.command.get_args().next().is_none());
    assert!(
        isolated
            .directory
            .path()
            .join(".codex/config.toml")
            .is_file()
    );
}

/// A client configured through a file is isolated even though extending is
/// the default, because there is nothing to layer short of rewriting that
/// file.
///
/// A fallback rather than an error: the user did not ask for isolation, they
/// asked to run a client, and this is the only way it can be run. Refusing
/// was right while extending was opt-in — the flag could not be honoured —
/// but as a default it would make `with opencode` fail outright (issue
/// #277).
#[test]
fn a_file_configured_client_is_isolated_even_by_default() {
    let models = [RouterModel {
        id: "test-model".to_string(),
        owned_by: "test".to_string(),
    }];
    assert!(
        !extends_user_configuration(ClientKind::Opencode, false),
        "opencode sets no base-url variable, so there is nothing to layer"
    );
    assert!(
        extends_user_configuration(ClientKind::ClaudeCode, false),
        "claude code sets both variables, so the default extends"
    );
    assert!(
        !extends_user_configuration(ClientKind::ClaudeCode, true),
        "--isolated-config wins over the default"
    );

    // And it still prepares rather than failing.
    let profiles = tempfile::tempdir().expect("profile root");
    TemporaryClient::prepare(&Preparation {
        client: ClientKind::Opencode,
        base_url: "http://router.test",
        token: "task-token",
        model_override: None,
        models: &models,
        isolated_config: false,
        one_shot: true,
        profile_root: Some(profiles.path()),
    })
    .expect("a file-configured client must still run");
}

/// Gemini CLI sets both connection variables and still cannot be extended.
///
/// It is pointed at the router by a `settings.json` it resolves from `HOME`,
/// so extending — which leaves `HOME` alone — would write that file where
/// the client never looks and let the user's own settings decide the run
/// (issue #227). Having both variables is therefore not enough to layer
/// onto, and the default must not assume it is.
#[test]
fn a_client_needing_a_written_file_is_isolated_despite_its_variables() {
    let integration = ClientKind::GeminiCli.integration();
    assert!(
        integration.token_env.is_some() && integration.base_url_env.is_some(),
        "the variables alone would otherwise qualify it for extending"
    );
    assert!(
        !extends_user_configuration(ClientKind::GeminiCli, false),
        "routing depends on a file only isolation makes reachable"
    );
}

#[test]
fn a_prepared_gemini_run_leaves_settings_where_the_cli_reads_them() {
    let models = [RouterModel {
        id: "test-model".to_string(),
        owned_by: "test".to_string(),
    }];
    let profiles = tempfile::tempdir().expect("profile root");
    let temporary = TemporaryClient::prepare(&Preparation {
        client: ClientKind::GeminiCli,
        base_url: "http://router.test",
        token: "task-token",
        model_override: None,
        models: &models,
        isolated_config: false,
        one_shot: true,
        profile_root: Some(profiles.path()),
    })
    .expect("prepare gemini");
    let root = temporary.directory.path();
    let home = temporary
        .command
        .get_envs()
        .find_map(|(name, value)| (name == "HOME").then_some(value?))
        .expect("gemini run sets HOME");
    // The CLI resolves its settings from HOME; the file must be there.
    let settings = Path::new(home).join(".gemini/settings.json");
    assert!(
        settings.is_file(),
        "no settings at {}, which is where the CLI looks",
        settings.display()
    );
    let written = fs::read_to_string(&settings).expect("read settings");
    assert!(written.contains("gemini-api-key"), "{written}");
    assert!(Path::new(home).starts_with(root), "HOME escaped the root");
}

/// An isolated run must be governed by the settings the router wrote. The
/// previous `create_new` silently deferred to whatever was already there,
/// which with the `HOME` fix would let an inherited `oauth-personal`
/// survive and fail the run.
#[test]
fn written_gemini_settings_replace_an_existing_file() {
    let root = tempfile::tempdir().expect("isolated root");
    let path = root.path().join(".gemini/settings.json");
    fs::create_dir_all(path.parent().expect("parent")).expect("create directory");
    fs::write(
        &path,
        r#"{"security":{"auth":{"selectedType":"oauth-personal"}}}"#,
    )
    .expect("seed a conflicting file");

    write_gemini_settings(&path).expect("write settings");

    let written = fs::read_to_string(&path).expect("read settings");
    assert!(written.contains("gemini-api-key"), "{written}");
    assert!(
        !written.contains("oauth-personal"),
        "the inherited value survived: {written}"
    );
}

/// The value itself is the one the CLI accepts; a wrong spelling is what
/// produced the original error, so it is pinned rather than assumed.
#[test]
fn gemini_settings_select_the_api_key_flow() {
    let root = tempfile::tempdir().expect("isolated root");
    let path = root.path().join(".gemini/settings.json");
    write_gemini_settings(&path).expect("write settings");
    let written: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&path).expect("read")).expect("valid JSON");
    assert_eq!(
        written["security"]["auth"]["selectedType"],
        "gemini-api-key"
    );
}

/// Every client prepares under a root the router owns, and only the ones
/// that were meant to be thrown away are.
///
/// A client routed through a file the router writes *lives* in that
/// directory. Discarding it after every run made every launch a first
/// launch — no session history, so nothing to resume, and onboarding
/// answered again from scratch (issue #298).
#[test]
fn a_client_that_cannot_be_extended_keeps_its_profile() {
    let models = [RouterModel {
        id: "test-model".to_string(),
        owned_by: "test".to_string(),
    }];
    let profiles = tempfile::tempdir().expect("profile root");
    for client in ClientKind::ALL {
        if client == ClientKind::Cursor {
            assert!(
                TemporaryClient::prepare(&Preparation {
                    client,
                    base_url: "http://router.test",
                    token: "task-token",
                    model_override: None,
                    models: &models,
                    isolated_config: false,
                    one_shot: true,
                    profile_root: Some(profiles.path()),
                })
                .is_err()
            );
            continue;
        }
        let temporary = TemporaryClient::prepare(&Preparation {
            client,
            base_url: "http://router.test",
            token: "task-token",
            model_override: None,
            models: &models,
            isolated_config: false,
            one_shot: true,
            profile_root: Some(profiles.path()),
        })
        .unwrap_or_else(|error| panic!("{client} failed setup: {error}"));
        let root = temporary.directory.path().to_path_buf();
        assert_eq!(temporary.command.get_program(), client.command());
        let environment = temporary
            .command
            .get_envs()
            .filter_map(|(name, value)| value.map(|value| (name, value)))
            .collect::<std::collections::HashMap<_, _>>();
        if let Some(token_env) = client.token_env() {
            assert_eq!(
                environment.get(std::ffi::OsStr::new(token_env)).copied(),
                Some(std::ffi::OsStr::new("task-token")),
                "{client} did not receive its token environment"
            );
        }
        for name in [
            "HOME",
            "CLAUDE_CONFIG_DIR",
            "GEMINI_CLI_HOME",
            "OPENCODE_CONFIG",
            "OPENCODE_CONFIG_DIR",
        ] {
            if let Some(value) = environment.get(std::ffi::OsStr::new(name)) {
                assert!(
                    Path::new(value).starts_with(&root),
                    "{client} {name} escaped its root"
                );
            }
        }
        let keeps_a_profile = !extends_user_configuration(client, false);
        drop(temporary);
        assert_eq!(
            root.exists(),
            keeps_a_profile,
            "{client}: a client routed through a written file must keep its profile, and \
             one that only needs two environment variables must not leave a directory behind"
        );
        if keeps_a_profile {
            assert!(
                root.starts_with(profiles.path()),
                "{client} profile must live under the router's own directory, not TMPDIR: \
                 {}",
                root.display()
            );
        }
    }
}

/// The same client twice gets the same directory, which is what makes a
/// session resumable through the router.
#[test]
fn two_runs_of_the_same_client_share_one_profile() {
    let profiles = tempfile::tempdir().expect("profile root");
    let root = Some(profiles.path());
    let first = persistent_profile(ClientKind::Codex, root).expect("first profile");
    let second = persistent_profile(ClientKind::Codex, root).expect("second profile");
    assert_eq!(first, second);
    assert!(first.is_dir());
    assert_ne!(
        first,
        persistent_profile(ClientKind::GeminiCli, root).expect("another client")
    );
}

#[test]
fn registry_order_matches_client_discriminants() {
    for client in ClientKind::ALL {
        assert_eq!(client.integration().kind, client);
    }
}

/// The default label names the client and a run, never the directory the
/// command was run in — a deployment was accumulating a list of every project
/// its users work in, visible to anyone who can list tokens (issue #316).
#[test]
fn the_default_label_carries_no_directory_name() {
    let label = format!("with-{}-{}", ClientKind::ClaudeCode, super::run_suffix());

    assert!(label.starts_with("with-claude-"), "{label}");
    // Whatever the working directory is called, it is not in the label.
    let cwd = std::env::current_dir().expect("cwd");
    let name = cwd
        .file_name()
        .expect("directory name")
        .to_string_lossy()
        .into_owned();
    assert!(
        !label.contains(&name),
        "the working directory's name must not reach the router: {label} contains {name}"
    );
    // The suffix distinguishes concurrent runs without describing them.
    assert_eq!(super::run_suffix().len(), 4, "a fixed-width run suffix");
    assert_eq!(
        super::run_suffix(),
        super::run_suffix(),
        "stable within one process, so one run has one label"
    );
}
