//! Black-box coverage for the local client configurator from issue #69.

use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::process::{Command, Output};
use std::time::Duration;

fn router(home: &std::path::Path, args: &[&str]) -> Output {
    router_with_env(home, args, &[])
}

fn router_with_env(home: &std::path::Path, args: &[&str], env: &[(&str, &str)]) -> Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    command
        .args(args)
        .env("HOME", home)
        .env("TOKEN_SECRET", "clients-cli-test-secret")
        .env("DATA_DIR", home.join("router-data"))
        .env("STORAGE_POLICY", "text");
    for (key, value) in env {
        command.env(key, value);
    }
    command.output().expect("router CLI should run")
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
    assert!(String::from_utf8_lossy(&first.stdout).contains("LINK_ASSISTANT_TOKEN"));
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
    assert!(String::from_utf8_lossy(&setup.stdout).contains("ANTHROPIC_AUTH_TOKEN"));

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
    assert!(output.contains("export LINK_ASSISTANT_TOKEN='la_sk_"));

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
    assert!(diagnostic.contains("LINK_ASSISTANT_TOKEN is unset"));
    assert!(diagnostic.contains("clients setup codex"));

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
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock router");
    let port = listener.local_addr().expect("listener address").port();
    let base_url = format!("http://127.0.0.1:{port}");
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

    let server = std::thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept doctor request");
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .expect("set timeout");
        let mut bytes = Vec::new();
        let mut buffer = [0_u8; 4096];
        loop {
            let count = stream.read(&mut buffer).expect("read request");
            if count == 0 {
                break;
            }
            bytes.extend_from_slice(&buffer[..count]);
            if bytes.windows(4).any(|window| window == b"\r\n\r\n") {
                break;
            }
        }
        stream
            .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}")
            .expect("write response");
        String::from_utf8_lossy(&bytes).into_owned()
    });
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
    let request = server.join().expect("mock server thread");
    assert!(request.starts_with("POST /v1/responses HTTP/1.1"));
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
    for client in [
        "codex",
        "claude-code",
        "cursor",
        "gemini-cli",
        "grok-cli",
        "opencode",
        "qwen-code",
        "agent",
    ] {
        assert!(output.contains(client), "missing {client} from:\n{output}");
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
        let args = [
            "clients",
            "setup",
            client,
            "--token",
            "la_sk_existing",
            "--base-url",
            "http://router.test:8080/",
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
            "http://router.test:8080/v1"
        );
        assert_eq!(
            document["provider"]["link-assistant"]["options"]["apiKey"],
            "{env:LINK_ASSISTANT_TOKEN}"
        );
        assert!(!configured.contains("la_sk_existing"));

        let second = router(home.path(), &args);
        assert!(second.status.success());
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

    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "qwen-code",
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
    let path = qwen_dir.join("settings.json");
    let configured = fs::read_to_string(&path).expect("read Qwen settings");
    let document: serde_json::Value = serde_json::from_str(&configured).expect("valid JSON");
    let models = document["modelProviders"]["openai"]
        .as_array()
        .expect("current Qwen modelProviders array");
    assert!(models.iter().any(|model| model["id"] == "mine"));
    assert!(models.iter().any(|model| {
        model["baseUrl"] == "http://router.test:8080/v1"
            && model["envKey"] == "LINK_ASSISTANT_TOKEN"
    }));
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
fn grok_setup_prints_both_required_exports_without_persisting_the_token() {
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
    assert!(output.contains("export GROK_BASE_URL='http://router.test:8080/v1'"));
    assert!(output.contains("export GROK_API_KEY='la_sk_existing'"));
    assert_eq!(
        fs::read_to_string(settings_path).expect("read Grok settings"),
        original,
        "Grok only supports the router URL through GROK_BASE_URL"
    );
}

#[test]
fn vendor_gated_clients_fail_before_minting_tokens_or_writing_configs() {
    for (client, expected) in [
        ("cursor", "does not expose a base-URL override"),
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
