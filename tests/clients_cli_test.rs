//! Black-box coverage for the local client configurator from issue #69.

mod common;

use common::{catalog_server, mock_router, router, router_with_env};
use std::fs;
use std::net::TcpListener;

#[test]
fn opencode_setup_populates_models_from_the_live_catalog() {
    let home = tempfile::tempdir().expect("temp home");
    let (base_url, server) = catalog_server(&[("gpt-live-only", "openai")]);

    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "opencode",
            "--token",
            "la_sk_catalog",
            "--base-url",
            &base_url,
        ],
    );
    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );
    let requests = server.join().expect("mock catalog server");
    let request = &requests[0];
    assert!(request.starts_with("GET /v1/models HTTP/1.1"));
    assert!(
        request
            .to_ascii_lowercase()
            .contains("authorization: bearer la_sk_catalog")
    );
    let configured = fs::read_to_string(home.path().join(".config/opencode/opencode.json"))
        .expect("read OpenCode config");
    let configured: serde_json::Value =
        serde_json::from_str(&configured).expect("valid OpenCode config");
    let models = configured["provider"]["link-assistant"]["models"]
        .as_object()
        .expect("provider models object");
    assert_eq!(models.len(), 1);
    assert!(models.contains_key("gpt-live-only"));
}

#[test]
fn opencode_reconfiguration_preserves_user_added_models() {
    let home = tempfile::tempdir().expect("temp home");
    let (base_url, server) = mock_router(&[("gpt-live", "openai")], 2);
    let args = [
        "clients",
        "setup",
        "opencode",
        "--token",
        "la_sk_catalog",
        "--base-url",
        &base_url,
    ];
    assert!(router(home.path(), &args).status.success());
    let path = home.path().join(".config/opencode/opencode.json");
    let mut configured: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&path).expect("read config"))
            .expect("valid config");
    configured["provider"]["link-assistant"]["models"]["user-model"] =
        serde_json::json!({"name": "My model"});
    fs::write(
        &path,
        format!(
            "{}\n",
            serde_json::to_string_pretty(&configured).expect("render config")
        ),
    )
    .expect("add user model");

    let repeated = router(home.path(), &args);
    assert!(
        repeated.status.success(),
        "{}",
        String::from_utf8_lossy(&repeated.stderr)
    );
    assert_eq!(server.join().expect("catalog server").len(), 2);
    let configured: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(path).expect("read repeated config"))
            .expect("valid repeated config");
    assert_eq!(
        configured["provider"]["link-assistant"]["models"]["user-model"]["name"],
        "My model"
    );
}

#[test]
fn catalog_dependent_setup_fails_before_writing_when_router_is_unreachable() {
    let home = tempfile::tempdir().expect("temp home");
    let listener = TcpListener::bind("127.0.0.1:0").expect("reserve unused port");
    let base_url = format!(
        "http://{}",
        listener.local_addr().expect("listener address")
    );
    drop(listener);
    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "opencode",
            "--token",
            "la_sk_catalog",
            "--base-url",
            &base_url,
        ],
    );
    assert!(!setup.status.success());
    assert!(String::from_utf8_lossy(&setup.stderr).contains("catalog is not reachable"));
    assert!(!home.path().join(".config/opencode/opencode.json").exists());
}

#[test]
fn codex_setup_merges_idempotently_and_remove_is_surgical() {
    let home = tempfile::tempdir().expect("temp home");
    let codex_dir = home.path().join(".codex");
    fs::create_dir_all(&codex_dir).expect("create codex dir");
    fs::write(
        codex_dir.join("config.toml"),
        "model = \"user-model\"\nmodel_provider = \"user-provider\"\napproval_policy = \"never\"\n\n[model_providers.user-provider]\nname = \"Mine\"\nbase_url = \"http://mine.test/v1\"\n\n[custom]\nkeep = true\n",
    )
    .expect("seed config");

    let args = [
        "clients",
        "setup",
        "codex",
        "--token",
        "la_sk_existing",
        "--base-url",
        "http://router.test:8080",
    ];
    let first = router(home.path(), &args);
    assert!(
        first.status.success(),
        "{}",
        String::from_utf8_lossy(&first.stderr)
    );
    let configured = fs::read_to_string(codex_dir.join("config.toml")).expect("read config");
    assert!(configured.contains("approval_policy = \"never\""));
    assert!(configured.contains("[custom]"));
    assert!(configured.contains("[model_providers.link-assistant]"));
    assert!(configured.contains("wire_api = \"responses\""));
    assert!(configured.contains("env_key = \"LINK_ASSISTANT_TOKEN\""));
    assert!(
        !configured.contains("la_sk_existing"),
        "secret leaked into config"
    );
    assert!(String::from_utf8_lossy(&first.stdout).contains("credentials:"));
    assert!(!String::from_utf8_lossy(&first.stdout).contains("la_sk_existing"));
    assert!(
        fs::read_dir(&codex_dir)
            .expect("list codex dir")
            .filter_map(Result::ok)
            .any(|entry| entry.file_name().to_string_lossy().ends_with(".bak")),
        "a changed existing config must be backed up"
    );

    let second = router(home.path(), &args);
    assert!(second.status.success());
    let configured_again = fs::read_to_string(codex_dir.join("config.toml")).expect("read config");
    assert_eq!(configured, configured_again, "setup must be idempotent");

    let removed = router(home.path(), &["clients", "remove", "codex"]);
    assert!(removed.status.success());
    let after_remove = fs::read_to_string(codex_dir.join("config.toml")).expect("read config");
    assert!(after_remove.contains("model = \"user-model\""));
    assert!(after_remove.contains("model_provider = \"user-provider\""));
    assert!(after_remove.contains("[model_providers.user-provider]"));
    assert!(after_remove.contains("approval_policy = \"never\""));
    assert!(after_remove.contains("[custom]"));
    assert!(!after_remove.contains("model_providers.link-assistant"));
}

#[test]
fn claude_code_setup_preserves_settings_without_storing_the_token() {
    let home = tempfile::tempdir().expect("temp home");
    let claude_dir = home.path().join(".claude");
    fs::create_dir_all(&claude_dir).expect("create claude dir");
    fs::write(
        claude_dir.join("settings.json"),
        r#"{"permissions":{"allow":["Read"]},"env":{"KEEP_ME":"yes"}}"#,
    )
    .expect("seed settings");

    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "claude-code",
            "--token",
            "la_sk_existing",
            "--base-url",
            "http://router.test:8080/",
        ],
    );
    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );

    let settings: serde_json::Value = serde_json::from_str(
        &fs::read_to_string(claude_dir.join("settings.json")).expect("read settings"),
    )
    .expect("valid JSON");
    assert_eq!(settings["permissions"]["allow"][0], "Read");
    assert_eq!(settings["env"]["KEEP_ME"], "yes");
    assert_eq!(
        settings["env"]["ANTHROPIC_BASE_URL"],
        "http://router.test:8080"
    );
    assert!(settings["env"].get("ANTHROPIC_AUTH_TOKEN").is_none());
    assert!(!settings.to_string().contains("la_sk_existing"));
    assert!(String::from_utf8_lossy(&setup.stdout).contains("credentials:"));
    assert!(!String::from_utf8_lossy(&setup.stdout).contains("la_sk_existing"));
    let environment = fs::read_to_string(
        home.path()
            .join(".config/link-assistant-router/clients/claude.env"),
    )
    .expect("read Claude credential file");
    assert!(environment.contains("export ANTHROPIC_AUTH_TOKEN='la_sk_existing'"));
    assert!(environment.contains("export ANTHROPIC_BASE_URL='http://router.test:8080'"));
    assert!(!environment.contains("http://router.test:8080/v1"));

    let removed = router(home.path(), &["clients", "remove", "claude-code"]);
    assert!(removed.status.success());
    let settings: serde_json::Value = serde_json::from_str(
        &fs::read_to_string(claude_dir.join("settings.json")).expect("read settings"),
    )
    .expect("valid JSON");
    assert_eq!(settings["env"]["KEEP_ME"], "yes");
    assert!(settings["env"].get("ANTHROPIC_BASE_URL").is_none());
}

#[test]
fn claude_remove_without_an_ownership_marker_is_a_noop() {
    let home = tempfile::tempdir().expect("temp home");
    let claude_dir = home.path().join(".claude");
    fs::create_dir_all(&claude_dir).expect("create claude dir");
    let original = r#"{"env":{"ANTHROPIC_BASE_URL":"http://someone-elses-router"}}"#;
    fs::write(claude_dir.join("settings.json"), original).expect("seed settings");

    let removed = router(home.path(), &["clients", "remove", "claude-code"]);
    assert!(removed.status.success());
    assert_eq!(
        fs::read_to_string(claude_dir.join("settings.json")).expect("read settings"),
        original
    );
}

#[test]
fn codex_remove_without_an_ownership_marker_is_a_noop() {
    let home = tempfile::tempdir().expect("temp home");
    let codex_dir = home.path().join(".codex");
    fs::create_dir_all(&codex_dir).expect("create codex dir");
    let original = "model_provider = \"link-assistant\"\n\n[model_providers.link-assistant]\nbase_url = \"http://someone-elses-router/v1\"\n";
    fs::write(codex_dir.join("config.toml"), original).expect("seed config");

    let removed = router(home.path(), &["clients", "remove", "codex"]);
    assert!(removed.status.success());
    assert_eq!(
        fs::read_to_string(codex_dir.join("config.toml")).expect("read config"),
        original
    );
}

#[test]
fn setup_can_mint_a_persisted_token_and_status_never_discloses_it() {
    let home = tempfile::tempdir().expect("temp home");
    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "codex",
            "--base-url",
            "http://router.test:8080",
        ],
    );
    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );
    let output = String::from_utf8_lossy(&setup.stdout);
    assert!(output.contains("credentials:"));
    assert!(
        !output.contains("la_sk_"),
        "setup stdout must not disclose the token"
    );
    let environment_path = home
        .path()
        .join(".config/link-assistant-router/clients/codex.env");
    let environment = fs::read_to_string(&environment_path).expect("read credential file");
    assert!(environment.contains("export LINK_ASSISTANT_TOKEN='la_sk_"));
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        assert_eq!(
            fs::metadata(environment_path)
                .expect("credential metadata")
                .permissions()
                .mode()
                & 0o777,
            0o600
        );
    }

    let tokens = router(home.path(), &["tokens", "list"]);
    assert!(tokens.status.success());
    assert!(String::from_utf8_lossy(&tokens.stdout).contains("client-codex"));

    let show = router(home.path(), &["clients", "show", "codex"]);
    assert!(show.status.success());
    let shown = String::from_utf8_lossy(&show.stdout);
    assert!(shown.contains("\"configured\": true"));
    assert!(shown.contains("\"token_env\": \"LINK_ASSISTANT_TOKEN\""));
    assert!(!shown.contains("la_sk_"));

    let doctor = router(home.path(), &["clients", "doctor", "codex"]);
    assert!(!doctor.status.success());
    let diagnostic = String::from_utf8_lossy(&doctor.stderr);
    assert!(diagnostic.contains("router catalog is not reachable"));
    assert!(!diagnostic.contains("la_sk_"));

    let config_path = home.path().join(".codex/config.toml");
    let config = fs::read_to_string(&config_path).expect("read configured Codex file");
    fs::write(
        &config_path,
        config.replacen(
            "model_provider = \"link-assistant\"",
            "model_provider = \"user-provider\"",
            1,
        ),
    )
    .expect("switch selected provider");
    let show = router(home.path(), &["clients", "show", "codex"]);
    assert!(show.status.success());
    assert!(String::from_utf8_lossy(&show.stdout).contains("\"configured\": false"));

    let doctor = router(home.path(), &["clients", "doctor", "codex"]);
    assert!(!doctor.status.success());
    let diagnostic = String::from_utf8_lossy(&doctor.stderr);
    assert!(diagnostic.contains("Codex CLI is not configured"));
}

#[test]
fn doctor_uses_the_configured_codex_path_and_token_variable() {
    let home = tempfile::tempdir().expect("temp home");
    let (base_url, server) = mock_router(&[("gpt-codex-live", "openai")], 2);
    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "codex",
            "--token",
            "la_sk_doctor",
            "--base-url",
            &base_url,
        ],
    );
    assert!(setup.status.success());

    let doctor = router_with_env(
        home.path(),
        &["clients", "doctor", "codex"],
        &[("LINK_ASSISTANT_TOKEN", "la_sk_doctor")],
    );
    assert!(
        doctor.status.success(),
        "{}",
        String::from_utf8_lossy(&doctor.stderr)
    );
    assert!(String::from_utf8_lossy(&doctor.stdout).contains("successfully (200 OK)"));
    let requests = server.join().expect("mock server thread");
    assert!(
        requests[0].starts_with("GET /api/codex/v1/models HTTP/1.1"),
        "unexpected requests: {requests:?}"
    );
    let request = &requests[1];
    assert!(request.starts_with("POST /v1/responses HTTP/1.1"));
    assert!(request.contains("gpt-codex-live"));
    assert!(
        request
            .to_ascii_lowercase()
            .contains("authorization: bearer la_sk_doctor")
    );
}

#[test]
fn codex_doctor_requires_an_openai_owned_catalog_model() {
    let home = tempfile::tempdir().expect("temp home");
    let (base_url, server) = catalog_server(&[("claude-live", "anthropic")]);
    assert!(
        router(
            home.path(),
            &[
                "clients",
                "setup",
                "codex",
                "--token",
                "la_sk_doctor",
                "--base-url",
                &base_url,
            ],
        )
        .status
        .success()
    );
    let doctor = router_with_env(
        home.path(),
        &["clients", "doctor", "codex"],
        &[("LINK_ASSISTANT_TOKEN", "la_sk_doctor")],
    );
    assert!(!doctor.status.success());
    let stderr = String::from_utf8_lossy(&doctor.stderr);
    assert!(
        stderr.contains("no model for Codex CLI (openai, z.ai models)"),
        "{stderr}"
    );
    // The refusal points at the way out rather than leaving the reader to
    // guess that an explicit model is still allowed (issue #301).
    assert!(stderr.contains("--model"), "{stderr}");
    assert_eq!(server.join().expect("catalog server").len(), 1);
}

#[test]
fn doctor_uses_chat_completions_for_opencode_compatible_clients() {
    let home = tempfile::tempdir().expect("temp home");
    let (base_url, server) = mock_router(&[("gpt-chat-live", "openai")], 3);
    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "opencode",
            "--token",
            "la_sk_doctor",
            "--base-url",
            &base_url,
        ],
    );
    assert!(setup.status.success());

    let doctor = router_with_env(
        home.path(),
        &["clients", "doctor", "opencode"],
        &[("LINK_ASSISTANT_TOKEN", "la_sk_doctor")],
    );
    assert!(
        doctor.status.success(),
        "{}",
        String::from_utf8_lossy(&doctor.stderr)
    );
    let requests = server.join().expect("mock server thread");
    assert!(requests[0].starts_with("GET /v1/models HTTP/1.1"));
    assert!(requests[1].starts_with("GET /v1/models HTTP/1.1"));
    let request = &requests[2];
    assert!(request.starts_with("POST /v1/chat/completions HTTP/1.1"));
    assert!(request.contains("gpt-chat-live"));
    assert!(
        request
            .to_ascii_lowercase()
            .contains("authorization: bearer la_sk_doctor")
    );
}

#[test]
fn list_covers_every_documented_client_and_agent() {
    let home = tempfile::tempdir().expect("temp home");
    let listed = router(home.path(), &["clients", "list"]);
    assert!(listed.status.success());
    let output = String::from_utf8_lossy(&listed.stdout);
    // The canonical names are the real commands, so what `clients list` shows
    // is what the user's shell has (issue #220).
    for client in [
        "codex",
        "claude",
        "cursor-agent",
        "gemini",
        "grok",
        "opencode",
        "qwen",
        "agent",
    ] {
        assert!(output.contains(client), "missing {client} from:\n{output}");
    }
    // The superseded long forms must not reappear as displayed names.
    for legacy in ["claude-code", "gemini-cli", "grok-cli", "qwen-code"] {
        assert!(
            !output.contains(legacy),
            "list still shows the legacy name {legacy}:\n{output}"
        );
    }
}

#[test]
fn setup_for_every_supported_client_needs_no_preinstalled_vendor_binary() {
    for client in [
        "codex",
        "claude-code",
        "grok-cli",
        "opencode",
        "qwen-code",
        "agent",
    ] {
        let home = tempfile::tempdir().expect("temp home");
        let (base_url, server) = if matches!(client, "opencode" | "qwen-code" | "agent") {
            let (base_url, server) = catalog_server(&[("gpt-live", "openai")]);
            (base_url, Some(server))
        } else {
            ("http://router.test:8080".to_string(), None)
        };
        let configured = router_with_env(
            home.path(),
            &[
                "clients",
                "setup",
                client,
                "--token",
                "la_sk_existing",
                "--base-url",
                &base_url,
            ],
            &[("PATH", "")],
        );
        assert!(
            configured.status.success(),
            "{client} setup unexpectedly required its executable: {}",
            String::from_utf8_lossy(&configured.stderr)
        );
        if let Some(server) = server {
            assert_eq!(server.join().expect("catalog server").len(), 1);
        }
    }
}

#[test]
fn opencode_and_agent_setup_merge_owned_provider_without_storing_token() {
    for (client, relative_path) in [
        ("opencode", ".config/opencode/opencode.json"),
        ("agent", ".config/link-assistant-agent/opencode.json"),
    ] {
        let home = tempfile::tempdir().expect("temp home");
        let path = home.path().join(relative_path);
        fs::create_dir_all(path.parent().expect("config parent")).expect("create config dir");
        fs::write(
            &path,
            r#"{"theme":"user-theme","provider":{"mine":{"name":"Mine"}}}"#,
        )
        .expect("seed config");
        let (base_url, server) = mock_router(&[("gpt-live", "openai")], 2);
        let args = [
            "clients",
            "setup",
            client,
            "--token",
            "la_sk_existing",
            "--base-url",
            &base_url,
        ];

        let first = router(home.path(), &args);
        assert!(
            first.status.success(),
            "{}",
            String::from_utf8_lossy(&first.stderr)
        );
        let configured = fs::read_to_string(&path).expect("read config");
        let document: serde_json::Value = serde_json::from_str(&configured).expect("valid JSON");
        assert_eq!(document["theme"], "user-theme");
        assert_eq!(document["provider"]["mine"]["name"], "Mine");
        assert_eq!(
            document["provider"]["link-assistant"]["options"]["baseURL"],
            format!("{base_url}/v1")
        );
        assert_eq!(
            document["provider"]["link-assistant"]["options"]["apiKey"],
            "{env:LINK_ASSISTANT_TOKEN}"
        );
        assert!(!configured.contains("la_sk_existing"));

        let second = router(home.path(), &args);
        assert!(second.status.success());
        assert_eq!(server.join().expect("catalog server").len(), 2);
        assert_eq!(
            configured,
            fs::read_to_string(&path).expect("read idempotent config")
        );

        let removed = router(home.path(), &["clients", "remove", client]);
        assert!(removed.status.success());
        let removed: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&path).expect("read removed config"))
                .expect("valid removed JSON");
        assert_eq!(removed["theme"], "user-theme");
        assert_eq!(removed["provider"]["mine"]["name"], "Mine");
        assert!(removed["provider"].get("link-assistant").is_none());
    }
}

#[test]
fn qwen_setup_uses_current_model_providers_shape_and_removes_only_its_entry() {
    let home = tempfile::tempdir().expect("temp home");
    let qwen_dir = home.path().join(".qwen");
    fs::create_dir_all(&qwen_dir).expect("create qwen dir");
    fs::write(
        qwen_dir.join("settings.json"),
        r#"{"theme":"dark","modelProviders":{"openai":[{"id":"mine","baseUrl":"http://mine.test/v1"}]}}"#,
    )
    .expect("seed settings");
    let (base_url, server) = catalog_server(&[("gpt-live", "openai")]);

    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "qwen-code",
            "--token",
            "la_sk_existing",
            "--base-url",
            &base_url,
        ],
    );
    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );
    let path = qwen_dir.join("settings.json");
    let configured = fs::read_to_string(&path).expect("read Qwen settings");
    let document: serde_json::Value = serde_json::from_str(&configured).expect("valid JSON");
    let models = document["modelProviders"]["openai"]
        .as_array()
        .expect("current Qwen modelProviders array");
    assert!(models.iter().any(|model| model["id"] == "mine"));
    assert!(models.iter().any(|model| {
        model["baseUrl"] == format!("{base_url}/v1") && model["envKey"] == "LINK_ASSISTANT_TOKEN"
    }));
    assert_eq!(server.join().expect("catalog server").len(), 1);
    assert!(!configured.contains("la_sk_existing"));

    let removed = router(home.path(), &["clients", "remove", "qwen-code"]);
    assert!(removed.status.success());
    let removed: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(path).expect("read removed settings"))
            .expect("valid removed JSON");
    let models = removed["modelProviders"]["openai"]
        .as_array()
        .expect("models remain an array");
    assert_eq!(models.len(), 1);
    assert_eq!(models[0]["id"], "mine");
    assert_eq!(removed["theme"], "dark");
}

#[test]
fn qwen_keeps_stable_ownership_when_the_user_changes_the_model() {
    let home = tempfile::tempdir().expect("temp home");
    let (base_url, server) =
        mock_router(&[("gpt-live", "openai"), ("gpt-user-choice", "openai")], 2);
    let args = [
        "clients",
        "setup",
        "qwen-code",
        "--token",
        "la_sk_existing",
        "--base-url",
        &base_url,
    ];
    assert!(router(home.path(), &args).status.success());
    let path = home.path().join(".qwen/settings.json");
    let mut configured: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&path).expect("read Qwen settings"))
            .expect("valid settings");
    configured["modelProviders"]["openai"][0]["id"] = serde_json::json!("gpt-user-choice");
    fs::write(
        &path,
        format!(
            "{}\n",
            serde_json::to_string_pretty(&configured).expect("render settings")
        ),
    )
    .expect("change configured model");

    let shown = router(home.path(), &["clients", "show", "qwen-code"]);
    assert!(shown.status.success());
    assert!(String::from_utf8_lossy(&shown.stdout).contains("\"configured\": true"));
    assert!(router(home.path(), &args).status.success());
    assert_eq!(server.join().expect("catalog server").len(), 2);
    let configured: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(path).expect("read repeated settings"))
            .expect("valid repeated settings");
    let models = configured["modelProviders"]["openai"]
        .as_array()
        .expect("Qwen models array");
    assert_eq!(
        models.len(),
        2,
        "repeat setup must refresh the full catalog"
    );
    assert_eq!(models[0]["id"], "gpt-live");
    assert_eq!(models[1]["id"], "gpt-user-choice");
    assert!(
        models
            .iter()
            .all(|model| model["name"] == "Link.Assistant.Router")
    );
}

#[test]
fn grok_setup_stores_both_required_exports_without_persisting_in_client_config() {
    let home = tempfile::tempdir().expect("temp home");
    let grok_dir = home.path().join(".grok");
    fs::create_dir_all(&grok_dir).expect("create grok dir");
    let settings_path = grok_dir.join("user-settings.json");
    let original = r#"{"recapsEnabled":true}"#;
    fs::write(&settings_path, original).expect("seed Grok settings");

    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "grok-cli",
            "--token",
            "la_sk_existing",
            "--base-url",
            "http://router.test:8080",
        ],
    );
    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );
    let output = String::from_utf8_lossy(&setup.stdout);
    assert!(output.contains("credentials:"));
    assert!(!output.contains("la_sk_existing"));
    let environment = fs::read_to_string(
        home.path()
            .join(".config/link-assistant-router/clients/grok.env"),
    )
    .expect("read Grok credential file");
    assert!(environment.contains("export GROK_BASE_URL='http://router.test:8080/v1'"));
    assert!(environment.contains("export GROK_API_KEY='la_sk_existing'"));
    assert_eq!(
        fs::read_to_string(settings_path).expect("read Grok settings"),
        original,
        "Grok only supports the router URL through GROK_BASE_URL"
    );
}

#[test]
fn vendor_gated_clients_fail_before_minting_tokens_or_writing_configs() {
    for (client, expected) in [
        ("cursor", "speaks Connect-RPC"),
        ("gemini-cli", "IneligibleTierError"),
    ] {
        let home = tempfile::tempdir().expect("temp home");
        let setup = router(home.path(), &["clients", "setup", client]);
        assert!(!setup.status.success());
        assert!(
            String::from_utf8_lossy(&setup.stderr).contains(expected),
            "unexpected diagnostic: {}",
            String::from_utf8_lossy(&setup.stderr)
        );
        assert!(
            !home.path().join("router-data/tokens.json").exists(),
            "unsupported setup must not mint a token"
        );

        let doctor = router(home.path(), &["clients", "doctor", client]);
        assert!(!doctor.status.success());
        assert!(String::from_utf8_lossy(&doctor.stderr).contains(expected));
    }
}

#[test]
fn qwen_setup_remains_compatible_with_legacy_wrapped_models() {
    let home = tempfile::tempdir().expect("temp home");
    let qwen_dir = home.path().join(".qwen");
    fs::create_dir_all(&qwen_dir).expect("create qwen dir");
    fs::write(
        qwen_dir.join("settings.json"),
        r#"{"modelProviders":{"openai":{"models":[{"id":"mine"}]}}}"#,
    )
    .expect("seed legacy settings");
    let (base_url, server) = catalog_server(&[("gpt-live", "openai")]);
    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "qwen-code",
            "--token",
            "la_sk_existing",
            "--base-url",
            &base_url,
        ],
    );
    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );
    let document: serde_json::Value = serde_json::from_str(
        &fs::read_to_string(qwen_dir.join("settings.json")).expect("read settings"),
    )
    .expect("valid JSON");
    let models = document["modelProviders"]["openai"]["models"]
        .as_array()
        .expect("legacy models remain wrapped");
    assert_eq!(models.len(), 2);
    assert_eq!(models[0]["id"], "mine");
    assert_eq!(server.join().expect("catalog server").len(), 1);
}

#[test]
fn opencode_remove_restores_a_provider_that_setup_replaced() {
    let home = tempfile::tempdir().expect("temp home");
    let directory = home.path().join(".config/opencode");
    fs::create_dir_all(&directory).expect("create config dir");
    let path = directory.join("opencode.json");
    fs::write(
        &path,
        r#"{"provider":{"link-assistant":{"name":"User-owned"}}}"#,
    )
    .expect("seed provider");
    let (base_url, server) = catalog_server(&[("gpt-live", "openai")]);
    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "opencode",
            "--token",
            "la_sk_existing",
            "--base-url",
            &base_url,
        ],
    );
    assert!(setup.status.success());
    assert_eq!(server.join().expect("catalog server").len(), 1);
    let removed = router(home.path(), &["clients", "remove", "opencode"]);
    assert!(removed.status.success());
    let document: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(path).expect("read restored config"))
            .expect("valid JSON");
    assert_eq!(document["provider"]["link-assistant"]["name"], "User-owned");
}

#[test]
fn reconfiguration_updates_owned_entries_so_remove_stays_surgical() {
    for client in ["opencode", "qwen-code"] {
        let home = tempfile::tempdir().expect("temp home");
        for _ in 0..2 {
            let (base_url, server) = catalog_server(&[("gpt-live", "openai")]);
            let setup = router(
                home.path(),
                &[
                    "clients",
                    "setup",
                    client,
                    "--token",
                    "la_sk_existing",
                    "--base-url",
                    &base_url,
                ],
            );
            assert!(
                setup.status.success(),
                "{}",
                String::from_utf8_lossy(&setup.stderr)
            );
            assert_eq!(server.join().expect("catalog server").len(), 1);
        }

        let removed = router(home.path(), &["clients", "remove", client]);
        assert!(removed.status.success());
        let shown = router(home.path(), &["clients", "show", client]);
        assert!(shown.status.success());
        assert!(String::from_utf8_lossy(&shown.stdout).contains("\"configured\": false"));
    }
}
