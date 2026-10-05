//! Unit tests for the declarative deploy configuration (issues #679, #680, #683).

use std::path::Path;

use crate::cli::DeploySettingsArgs;
use crate::deploy_config::{
    DeployConfig, EnvSpec, ProviderKeyMode, SecretSource, env_fingerprint, merge,
    parse_verification_profile, validate_env_name, value_fingerprint,
};

const FULL: &str = r#"
[deploy]
instance = "blue"
port = 18080
image = "ghcr.io/link-assistant/router:1.2.3"

[remote]
server = "deploy@example.test"
public_port = 8443

[local]
port = 28080
mode = "host"

[env]
OPENAI_ORG = "env"
UPSTREAM_REGION = "env:REGION_FOR_ROUTER"
EXTRA_CONFIG = "file:extra.txt"

[ssh]
port = 2222
identity_file = "keys/id_ed25519"
known_hosts = ["example.test ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample"]
keepalive_secs = 15
deadline_secs = 900

[tokens]
ttl_hours = 72
max_requests = 1000
max_tokens = 2000000
rate_limit_per_minute = 30
allowed_models = ["claude-sonnet-4-5"]

[provider_keys.openrouter]
source = "env:OPENROUTER_KEY"
mode = "replace"

[provider_keys.zai]
source = "file:zai.key"
kind = "anthropic-compatible"
base_url = "https://api.z.ai/api/anthropic"
models = ["glm-4.6"]

[verification]
clients = ["claude", "codex"]
providers = ["openrouter"]
require_client_launch = true
quota_requires_upstream_evidence = true
check_thinking_display = true

[verification.models.openrouter]
claude = "anthropic/claude-sonnet-4.5"
codex = "openai/gpt-5"
"#;

#[test]
fn one_file_describes_local_and_remote_targets() {
    let config = DeployConfig::parse(FULL, Some(Path::new("/etc/router"))).unwrap();

    let remote = config.section_for(true);
    assert_eq!(remote.server.as_deref(), Some("deploy@example.test"));
    assert_eq!(remote.port, Some(18080));
    assert_eq!(remote.public_port, Some(8443));
    assert_eq!(remote.instance.as_deref(), Some("blue"));

    let local = config.section_for(false);
    assert_eq!(local.server, None);
    assert_eq!(local.port, Some(28080));
    assert_eq!(local.mode.as_deref(), Some("host"));

    assert_eq!(config.ssh.port, Some(2222));
    assert_eq!(
        config.ssh.identity_file.as_deref(),
        Some(Path::new("/etc/router/keys/id_ed25519"))
    );
    assert_eq!(config.ssh.deadline_secs, Some(900));
    assert_eq!(config.tokens.ttl_hours, Some(72));
    assert_eq!(config.tokens.allowed_models, ["claude-sonnet-4-5"]);

    let names: Vec<&str> = config.env.iter().map(|spec| spec.name.as_str()).collect();
    assert_eq!(names, ["OPENAI_ORG", "UPSTREAM_REGION", "EXTRA_CONFIG"]);
    assert_eq!(config.env[0].source, SecretSource::Env("OPENAI_ORG".into()));
    assert_eq!(
        config.env[2].source,
        SecretSource::File("/etc/router/extra.txt".into())
    );

    assert_eq!(config.provider_keys[0].mode, Some(ProviderKeyMode::Replace));
    let template = config.provider_keys[1].template.as_ref().unwrap();
    assert_eq!(template.kind, "anthropic-compatible");
    assert_eq!(template.models, ["glm-4.6"]);

    let verification = config.verification.unwrap();
    assert_eq!(verification.clients, ["claude", "codex"]);
    assert_eq!(verification.models["openrouter"]["codex"], "openai/gpt-5");
    assert!(verification.require_client_launch);
    assert!(verification.quota_requires_upstream_evidence);
}

#[test]
fn literal_values_are_refused_so_they_never_reach_argv_or_a_file() {
    let error = DeployConfig::parse("[env]\nAPI = \"sk-literal\"\n", None).unwrap_err();
    assert!(error.contains("env:VAR or file:PATH"), "{error}");
    assert!(
        !error.contains("sk-literal"),
        "the refusal never echoes a value"
    );

    let error = EnvSpec::parse("API=sk-literal", None).unwrap_err();
    assert!(!error.contains("sk-literal"), "{error}");
}

#[test]
fn names_the_deployment_owns_cannot_be_passed_through() {
    for name in [
        "TOKEN_SECRET",
        "DATA_DIR",
        "HOME",
        "TLS_CERT",
        "VERIFY_X",
        "ROUTER_DEPLOY_Y",
    ] {
        assert!(validate_env_name(name).is_err(), "{name} must be reserved");
    }
    assert!(validate_env_name("lower").is_err());
    assert!(validate_env_name("OPENAI_ORG").is_ok());
}

#[test]
fn unknown_sections_and_keys_are_refused_rather_than_ignored() {
    assert!(DeployConfig::parse("[deploi]\nport = 1\n", None).is_err());
    assert!(DeployConfig::parse("[ssh]\nprot = 22\n", None).is_err());
    assert!(DeployConfig::parse("[deploy]\ninstance = \"Bad_Name\"\n", None).is_err());
    assert!(DeployConfig::parse("[ssh]\nknown_hosts = [\"host-only\"]\n", None).is_err());
    assert!(
        DeployConfig::parse(
            "[provider_keys.x]\nsource = \"env:X\"\nmode = \"always\"\n",
            None
        )
        .is_err()
    );
    assert!(
        parse_verification_profile("clients = [\"unknown-client\"]\n").is_err(),
        "an unknown client can never be proven"
    );
}

#[test]
fn a_bare_profile_file_and_a_verification_table_mean_the_same() {
    let bare =
        parse_verification_profile("clients = [\"claude\"]\nproviders = [\"zai\"]\n").unwrap();
    let table = parse_verification_profile(
        "[verification]\nclients = [\"claude\"]\nproviders = [\"zai\"]\n",
    )
    .unwrap();
    assert_eq!(bare, table);
}

#[test]
fn fingerprints_identify_changes_without_revealing_values() {
    let one = vec![
        ("A".to_string(), "1".to_string()),
        ("B".to_string(), "2".to_string()),
    ];
    let reordered = vec![
        ("B".to_string(), "2".to_string()),
        ("A".to_string(), "1".to_string()),
    ];
    let changed = vec![
        ("A".to_string(), "1".to_string()),
        ("B".to_string(), "3".to_string()),
    ];

    let fingerprint = env_fingerprint("secret", &one).unwrap();
    assert!(fingerprint.starts_with("hmac-sha256:"));
    assert_eq!(fingerprint.len(), "hmac-sha256:".len() + 32);
    assert_eq!(env_fingerprint("secret", &reordered).unwrap(), fingerprint);
    assert_ne!(env_fingerprint("secret", &changed).unwrap(), fingerprint);
    assert_ne!(env_fingerprint("other-secret", &one).unwrap(), fingerprint);
    assert_eq!(env_fingerprint("secret", &[]), None);

    assert_ne!(
        value_fingerprint("secret", "sk-a"),
        value_fingerprint("secret", "sk-b")
    );
    assert!(!value_fingerprint("secret", "sk-a").contains("sk-a"));
}

#[test]
fn flags_override_the_file_key_by_key() {
    let directory = tempfile::tempdir().unwrap();
    let file = directory.path().join("deploy.toml");
    std::fs::write(&file, FULL).unwrap();
    std::fs::write(directory.path().join("zai.key"), "zai-value\n").unwrap();
    std::fs::write(directory.path().join("other.key"), "other-value").unwrap();
    let flags = DeploySettingsArgs {
        config: Some(file),
        instance: Some("green".into()),
        ssh_port: Some(22),
        token_ttl_hours: Some(1),
        provider_key: vec![format!(
            "zai=file:{}",
            directory.path().join("other.key").display()
        )],
        ..DeploySettingsArgs::default()
    };

    let merged = merge(&flags, true).unwrap();

    assert_eq!(merged.instance.as_deref(), Some("green"));
    assert_eq!(merged.ssh.port, Some(22));
    assert_eq!(
        merged.ssh.deadline_secs,
        Some(900),
        "unset flags keep the file"
    );
    assert_eq!(merged.tokens.ttl_hours, Some(1));
    assert_eq!(merged.tokens.max_requests, Some(1000));
    let zai = merged
        .provider_keys
        .iter()
        .find(|key| key.name == "zai")
        .unwrap();
    assert!(zai.template.is_some(), "the flag keeps the file's template");
    assert_eq!(
        merged.known_hosts().unwrap().unwrap(),
        "example.test ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample\n"
    );
}

#[test]
fn values_are_read_from_files_and_redacted_from_debug_output() {
    let directory = tempfile::tempdir().unwrap();
    let key = directory.path().join("key");
    std::fs::write(&key, "sk-file-value\n").unwrap();
    let flags = DeploySettingsArgs {
        provider_key: vec![format!("openrouter=file:{}", key.display())],
        provider_key_mode: Some(ProviderKeyMode::IfAbsent),
        ..DeploySettingsArgs::default()
    };

    let resolved = merge(&flags, true).unwrap().read_values().unwrap();

    assert_eq!(resolved.provider_keys[0].value, "sk-file-value");
    assert_eq!(resolved.provider_keys[0].mode, ProviderKeyMode::IfAbsent);
    let debug = format!("{resolved:?}");
    assert!(!debug.contains("sk-file-value"), "{debug}");
    assert!(resolved.needs_payload());
}

#[test]
fn a_value_with_a_newline_is_refused() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("multi");
    std::fs::write(&path, "line-one\nline-two\n").unwrap();
    let error = SecretSource::File(path).read().unwrap_err();
    assert!(error.contains("newline"), "{error}");
    assert!(!error.contains("line-one"), "{error}");
}

#[test]
fn no_settings_need_no_payload_and_change_nothing() {
    let merged = merge(&DeploySettingsArgs::default(), false).unwrap();
    let resolved = merged.read_values().unwrap();
    assert!(!resolved.needs_payload());
    assert!(!resolved.tokens.is_limited());
    assert_eq!(merged.known_hosts().unwrap(), None);
    assert!(resolved.tokens.issue_arguments().is_empty());
}
