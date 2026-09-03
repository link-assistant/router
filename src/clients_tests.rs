//! Tests for [`crate::clients`].
//!
//! Split from `clients.rs` to keep that file within the repository's 1000-line
//! limit.

/// The name every surface advertises must be the command the client
/// actually installs as. Advertising `claude-code` while the user's shell
/// has `claude` taught a name that does not exist (issue #220).
///
/// One assertion over the existing table, so the two cannot drift apart.
#[test]
fn the_canonical_name_is_the_real_command() {
    for integration in super::CLIENT_INTEGRATIONS {
        let advertised = integration
            .kind
            .to_possible_value()
            .expect("every client is selectable")
            .get_name()
            .to_string();
        assert_eq!(
            advertised, integration.command,
            "{advertised} is advertised but the command is {}",
            integration.command
        );
        // `Display` drives `clients list` and the managed file names, so it
        // must agree with what the parser advertises.
        assert_eq!(integration.kind.to_string(), integration.command);
        assert_eq!(integration.kind.canonical_name(), integration.command);
    }
}

/// The superseded long forms must keep parsing, so this rename does not
/// break existing scripts or the commands already documented elsewhere.
#[test]
fn every_legacy_client_name_still_parses() {
    for (legacy, expected) in [
        ("claude-code", super::ClientKind::ClaudeCode),
        ("cursor", super::ClientKind::Cursor),
        ("gemini-cli", super::ClientKind::GeminiCli),
        ("grok-cli", super::ClientKind::GrokCli),
        ("qwen-code", super::ClientKind::QwenCode),
    ] {
        assert_eq!(
            super::ClientKind::from_str(legacy, true),
            Ok(expected),
            "{legacy} must remain accepted"
        );
    }
    // And the canonical names parse, naturally.
    for integration in super::CLIENT_INTEGRATIONS {
        assert_eq!(
            super::ClientKind::from_str(integration.command, true),
            Ok(integration.kind),
            "{} must parse",
            integration.command
        );
    }
}

/// A managed file written under the pre-rename name must still be found.
/// These paths are derived from the client name, so without the fallback an
/// existing installation's `claude-code.env` would simply stop being seen
/// and the user would be told to run a setup they had already run.
#[test]
fn a_file_written_under_the_legacy_name_is_still_found() {
    let home = tempfile::tempdir().expect("temp home");
    let clients = home.path().join(".config/link-assistant-router/clients");
    std::fs::create_dir_all(&clients).expect("create managed directory");
    let legacy = clients.join("claude-code.env");
    std::fs::write(&legacy, "TOKEN=x").expect("write legacy file");

    let manager = super::ClientManager::isolated(home.path());
    assert_eq!(
        manager.environment_path(super::ClientKind::ClaudeCode),
        legacy,
        "an existing legacy file must be honoured"
    );
}

/// A fresh installation uses the canonical name, so the legacy names do not
/// outlive the migration.
#[test]
fn a_fresh_installation_uses_the_canonical_name() {
    let home = tempfile::tempdir().expect("temp home");
    let manager = super::ClientManager::isolated(home.path());
    let path = manager.environment_path(super::ClientKind::ClaudeCode);
    assert!(
        path.ends_with("claude.env"),
        "expected the canonical name, got {}",
        path.display()
    );
}

/// Every variant is covered by the legacy table, so the file-migration
/// fallback cannot silently miss one.
#[test]
fn every_client_has_a_legacy_name() {
    for kind in super::ClientKind::ALL {
        assert!(!kind.legacy_name().is_empty(), "{kind} has no legacy name");
    }
}

use super::*;

#[test]
fn rejects_non_http_router_urls() {
    assert!(normalize_base_url("router.internal:8080").is_err());
}

#[test]
fn compact_diagnostics_do_not_echo_unbounded_upstream_bodies() {
    let body = "x".repeat(500);
    let compact = compact_body(&body);
    assert!(compact.ends_with('…'));
    assert!(compact.chars().count() <= 241);
}

/// The defect in issue #301: two of the eight integrations named the wrong
/// vendor, so the Gemini CLI could never be selected a Google model and Qwen
/// Code never a Qwen one. On a deployment serving only a Gemini subscription
/// the run aborted with a message reading as though the router were short of
/// models.
#[test]
fn each_client_can_select_its_own_vendors_models() {
    // A catalog serving several vendors at once, which is where declaring the
    // wrong owner stops being invisible: the fallback picks the first entry,
    // so a single-vendor deployment hid the defect entirely.
    let catalog: Vec<RouterModel> = ["openai", "anthropic", "google", "qwen"]
        .iter()
        .map(|owner| RouterModel {
            id: format!("{owner}-flagship"),
            owned_by: (*owner).to_string(),
        })
        .collect();
    for (client, owner) in [
        (ClientKind::ClaudeCode, "anthropic"),
        (ClientKind::Codex, "openai"),
        (ClientKind::GeminiCli, "google"),
        (ClientKind::QwenCode, "qwen"),
    ] {
        assert_eq!(
            crate::clients::select_model(client, &catalog),
            Some(format!("{owner}-flagship").as_str()),
            "{client} was given another vendor's model"
        );
    }
}

/// The same, on a deployment serving only that one vendor — where declaring
/// the wrong owner did not substitute quietly but aborted the run outright,
/// with a message reading as though the router were short of models.
#[test]
fn a_single_vendor_deployment_serves_its_own_client() {
    let google = vec![RouterModel {
        id: "gemini-flagship".to_string(),
        owned_by: "google".to_string(),
    }];
    assert_eq!(
        crate::clients::select_model(ClientKind::GeminiCli, &google),
        Some("gemini-flagship")
    );
    assert!(
        crate::clients::usable_models(ClientKind::GeminiCli, &google)
            .iter()
            .any(|model| model.owned_by == "google"),
        "the Gemini CLI must be able to use a Google model"
    );
}

/// Claude Code is still refused a model of another vendor rather than launched
/// on one: substituting made the client blame its own model name instead of
/// the lapsed subscription (issue #225).
#[test]
fn a_strict_client_refuses_another_vendors_model() {
    let openai = vec![RouterModel {
        id: "gpt-test".to_string(),
        owned_by: "openai".to_string(),
    }];
    assert_eq!(
        crate::clients::select_model(ClientKind::ClaudeCode, &openai),
        None
    );
    // The generic OpenAI-dialect gateways take whatever the router serves —
    // the rule `clients doctor` already used, now the only one.
    for client in [ClientKind::Opencode, ClientKind::Agent, ClientKind::GrokCli] {
        assert_eq!(
            crate::clients::select_model(client, &openai),
            Some("gpt-test"),
            "{client} routes for whatever the router serves"
        );
    }
}

#[test]
fn claude_setup_maps_zai_only_default_families_and_subagents() {
    let home = tempfile::tempdir().unwrap();
    let manager = ClientManager::isolated(home.path());
    std::fs::create_dir_all(home.path().join(".claude")).unwrap();
    std::fs::write(
        manager.config_path(ClientKind::ClaudeCode),
        r#"{"env":{"CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY":"0","ANTHROPIC_DEFAULT_OPUS_MODEL":"user-opus"}}"#,
    )
    .unwrap();
    let models = vec![RouterModel {
        id: "claude-zai-future-saffron".into(),
        owned_by: ZAI_MODEL_OWNER.into(),
    }];
    manager
        .setup(ClientKind::ClaudeCode, "https://router.example", &models)
        .unwrap();
    let settings: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(manager.config_path(ClientKind::ClaudeCode)).unwrap(),
    )
    .unwrap();
    assert_eq!(
        settings["env"]["CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY"],
        "1"
    );
    assert_eq!(
        settings["env"]["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"],
        "0"
    );
    for key in CLAUDE_MODEL_ENV {
        assert_eq!(settings["env"][key], "claude-zai-future-saffron", "{key}");
    }
    let env = manager
        .write_environment(
            ClientKind::ClaudeCode,
            "https://router.example",
            "router-token",
        )
        .unwrap();
    let env = std::fs::read_to_string(env).unwrap();
    assert!(env.contains("CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1"));
    assert!(env.contains("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=0"));
    assert!(env.contains("https://router.example/api/services/anthropic"));
    assert!(!env.contains("zai-secret"));

    manager.remove(ClientKind::ClaudeCode).unwrap();
    let restored: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(manager.config_path(ClientKind::ClaudeCode)).unwrap(),
    )
    .unwrap();
    assert_eq!(
        restored["env"]["CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY"],
        "0"
    );
    assert_eq!(restored["env"]["ANTHROPIC_DEFAULT_OPUS_MODEL"], "user-opus");
    assert!(
        restored["env"]
            .get("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC")
            .is_none()
    );
    assert!(restored["env"].get("ANTHROPIC_MODEL").is_none());
    assert!(
        restored["env"]
            .get("ANTHROPIC_DEFAULT_SONNET_MODEL")
            .is_none()
    );
}

#[test]
fn claude_setup_leaves_native_anthropic_discovery_unpinned() {
    let home = tempfile::tempdir().unwrap();
    let manager = ClientManager::isolated(home.path());
    let models = vec![
        RouterModel {
            id: "claude-future-native".into(),
            owned_by: ANTHROPIC_MODEL_OWNER.into(),
        },
        RouterModel {
            id: "claude-zai-future-saffron".into(),
            owned_by: ZAI_MODEL_OWNER.into(),
        },
    ];

    manager
        .setup(ClientKind::ClaudeCode, "https://router.example", &models)
        .unwrap();
    let settings: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(manager.config_path(ClientKind::ClaudeCode)).unwrap(),
    )
    .unwrap();
    for key in CLAUDE_MODEL_ENV {
        assert!(settings["env"].get(key).is_none(), "{key}");
    }
}

#[test]
fn claude_gateway_model_is_live_and_an_explicit_zai_choice_wins() {
    let zai = vec![
        RouterModel {
            id: "claude-zai-future-first".into(),
            owned_by: ZAI_MODEL_OWNER.into(),
        },
        RouterModel {
            id: "claude-zai-future-explicit".into(),
            owned_by: ZAI_MODEL_OWNER.into(),
        },
    ];
    assert_eq!(
        claude_gateway_model(&zai, None).as_deref(),
        Some("claude-zai-future-first")
    );
    assert_eq!(
        claude_gateway_model(&zai, Some("claude-zai-future-explicit")).as_deref(),
        Some("claude-zai-future-explicit")
    );

    let native = vec![RouterModel {
        id: "claude-future-native".into(),
        owned_by: ANTHROPIC_MODEL_OWNER.into(),
    }];
    assert_eq!(claude_gateway_model(&native, None), None);
}

#[test]
fn zai_model_pins_are_owned_configuration_and_drift_is_detected() {
    let home = tempfile::tempdir().unwrap();
    let manager = ClientManager::isolated(home.path());
    let models = vec![RouterModel {
        id: "claude-zai-future-saffron".into(),
        owned_by: ZAI_MODEL_OWNER.into(),
    }];
    manager
        .setup(ClientKind::ClaudeCode, "https://router.example", &models)
        .unwrap();
    manager
        .write_environment(
            ClientKind::ClaudeCode,
            "https://router.example",
            "router-token",
        )
        .unwrap();
    manager
        .write_credential_metadata(
            ClientKind::ClaudeCode,
            &ManagedCredential {
                client: ClientKind::ClaudeCode.to_string(),
                source: TokenSource::Supplied,
                token_id: None,
                label: None,
                issued_at: None,
                router: Some("https://router.example".into()),
                principal_id: Some("primary".into()),
                config_sha256: None,
            },
        )
        .unwrap();

    let intact = manager.analyze(ClientKind::ClaudeCode).unwrap();
    assert_eq!(intact.state, OwnershipState::ManagedIntact);
    assert!(intact.conflicts.is_empty(), "{:?}", intact.conflicts);

    let settings_path = manager.config_path(ClientKind::ClaudeCode);
    let mut settings: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&settings_path).unwrap()).unwrap();
    settings["env"]["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = "foreign-future-model".into();
    std::fs::write(
        &settings_path,
        serde_json::to_vec_pretty(&settings).unwrap(),
    )
    .unwrap();
    let drifted = manager.analyze(ClientKind::ClaudeCode).unwrap();
    assert_eq!(drifted.state, OwnershipState::ManagedDrifted);
    assert!(
        drifted
            .conflicts
            .contains(&"public-config:ANTHROPIC_DEFAULT_HAIKU_MODEL".to_string())
    );
}

/// What a client config embeds is what `with` would launch it on. The three
/// paths used to answer this differently, so `clients setup opencode` could
/// write a model the launcher would then refuse (issue #301).
#[test]
fn the_written_catalog_agrees_with_the_launcher() {
    let mixed = vec![
        RouterModel {
            id: "claude-x".to_string(),
            owned_by: "anthropic".to_string(),
        },
        RouterModel {
            id: "qwen-x".to_string(),
            owned_by: "qwen".to_string(),
        },
    ];
    for client in ClientKind::ALL {
        if client == ClientKind::Cursor {
            continue;
        }
        let written = crate::clients::usable_models(client, &mixed);
        match crate::clients::select_model(client, &mixed) {
            Some(launched) => assert!(
                written.iter().any(|model| model.id == launched),
                "{client} would launch on `{launched}`, which its config does not list: \
                 {written:?}"
            ),
            None => assert!(
                written.is_empty(),
                "{client} refuses every model but its config lists {written:?}"
            ),
        }
    }
}
