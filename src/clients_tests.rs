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
            ..RouterModel::default()
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
        ..RouterModel::default()
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
        ..RouterModel::default()
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
fn claude_setup_maps_zai_only_main_and_subagent_without_fake_families() {
    let home = tempfile::tempdir().unwrap();
    let manager = ClientManager::isolated(home.path());
    std::fs::create_dir_all(home.path().join(".claude")).unwrap();
    std::fs::write(
        manager.config_path(ClientKind::ClaudeCode),
        r#"{"env":{"CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY":"0","ANTHROPIC_DEFAULT_OPUS_MODEL":"user-opus"}}"#,
    )
    .unwrap();
    let models = vec![RouterModel {
        id: "future-saffron-2099".into(),
        owned_by: ZAI_MODEL_OWNER.into(),
        ..RouterModel::default()
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
    assert!(
        settings["env"]
            .get("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC")
            .is_none()
    );
    for key in CLAUDE_GATEWAY_TARGET_ENV {
        assert_eq!(settings["env"][key], "future-saffron-2099", "{key}");
    }
    for key in [
        "ANTHROPIC_DEFAULT_OPUS_MODEL",
        "ANTHROPIC_DEFAULT_SONNET_MODEL",
        "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    ] {
        assert!(settings["env"].get(key).is_none(), "{key}");
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
    assert!(!env.contains("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"));
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
fn claude_setup_migrates_only_router_owned_legacy_nonessential_traffic() {
    for (previous, expected) in [(None, None), (Some("1"), Some("1"))] {
        let home = tempfile::tempdir().unwrap();
        let manager = ClientManager::isolated(home.path());
        std::fs::create_dir_all(home.path().join(".claude")).unwrap();
        std::fs::write(
            manager.config_path(ClientKind::ClaudeCode),
            r#"{"env":{"ANTHROPIC_BASE_URL":"https://old-router.example","CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC":"0"}}"#,
        )
        .unwrap();
        super::write_claude_marker(
            &manager
                .ownership_marker_path(ClientKind::ClaudeCode)
                .unwrap(),
            "https://old-router.example",
            None,
            &vec![(
                "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC".into(),
                Some("0".into()),
                previous.map(str::to_string),
            )],
        )
        .unwrap();

        manager
            .setup(ClientKind::ClaudeCode, "https://router.example", &[])
            .unwrap();
        let settings: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(manager.config_path(ClientKind::ClaudeCode)).unwrap(),
        )
        .unwrap();
        assert_eq!(
            settings["env"]
                .get("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC")
                .and_then(serde_json::Value::as_str),
            expected
        );
        let (_, _, entries) = super::claude_marker(
            &manager
                .ownership_marker_path(ClientKind::ClaudeCode)
                .unwrap(),
        )
        .unwrap()
        .unwrap();
        assert!(
            entries
                .iter()
                .all(|(key, _, _)| key != "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC")
        );
    }

    let home = tempfile::tempdir().unwrap();
    let manager = ClientManager::isolated(home.path());
    std::fs::create_dir_all(home.path().join(".claude")).unwrap();
    std::fs::write(
        manager.config_path(ClientKind::ClaudeCode),
        r#"{"env":{"CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC":"1"}}"#,
    )
    .unwrap();
    manager
        .setup(ClientKind::ClaudeCode, "https://router.example", &[])
        .unwrap();
    let settings: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(manager.config_path(ClientKind::ClaudeCode)).unwrap(),
    )
    .unwrap();
    assert_eq!(
        settings["env"]["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"],
        "1"
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
            ..RouterModel::default()
        },
        RouterModel {
            id: "future-saffron-2099".into(),
            owned_by: ZAI_MODEL_OWNER.into(),
            ..RouterModel::default()
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
            id: "future-first-2099".into(),
            owned_by: ZAI_MODEL_OWNER.into(),
            ..RouterModel::default()
        },
        RouterModel {
            id: "future-explicit-2099".into(),
            owned_by: ZAI_MODEL_OWNER.into(),
            ..RouterModel::default()
        },
    ];
    // Without a recency signal the choice must still be deterministic rather
    // than positional, so the id decides and the answer does not move when the
    // provider reorders its listing (issue #563).
    assert_eq!(
        claude_gateway_model(&zai, None).as_deref(),
        Some("future-first-2099")
    );
    let reversed: Vec<RouterModel> = zai.iter().rev().cloned().collect();
    assert_eq!(
        claude_gateway_model(&reversed, None),
        claude_gateway_model(&zai, None),
        "catalog order must not decide the gateway model"
    );
    assert_eq!(
        claude_gateway_model(&zai, Some("future-explicit-2099")).as_deref(),
        Some("future-explicit-2099")
    );

    let native = vec![RouterModel {
        id: "claude-future-native".into(),
        owned_by: ANTHROPIC_MODEL_OWNER.into(),
        ..RouterModel::default()
    }];
    assert_eq!(claude_gateway_model(&native, None), None);
}

/// Issue #563: the fallback took the first z.ai entry in catalog order, so a
/// deployment advertising ten models pinned the *oldest* one the provider
/// happened to list first — for both the main and the subagent slot — while
/// offering a picker whose last row was the newest.
///
/// Catalog order is the provider's listing, not a ranking. The vendor's own
/// `created` timestamp is the signal that answers which model is current.
#[test]
fn the_gateway_model_is_the_providers_current_model_not_its_first_listed() {
    // The exact reproduction from the issue: newest last, oldest first.
    let ids = [
        "glm-4.5",
        "glm-4.5-air",
        "glm-4.6",
        "glm-4.7",
        "glm-5",
        "glm-5-turbo",
        "glm-5.1",
        "glm-5.2",
        "glm-5.3",
        "glm-5.3-flash",
    ];
    let catalog: Vec<RouterModel> = ids
        .iter()
        .enumerate()
        .map(|(index, id)| RouterModel {
            id: (*id).into(),
            owned_by: ZAI_MODEL_OWNER.into(),
            // Monotonic, as a provider that dates its models would report.
            provider_created_at: Some(1_700_000_000 + i64::try_from(index).expect("small index")),
            ..RouterModel::default()
        })
        .collect();
    assert_eq!(
        claude_gateway_model(&catalog, None).as_deref(),
        Some("glm-5.3-flash"),
        "the newest advertised model must be the pin, not the first listed"
    );

    // Position must not decide it: the same catalog shuffled resolves the same.
    let mut shuffled = catalog.clone();
    shuffled.reverse();
    assert_eq!(
        claude_gateway_model(&shuffled, None).as_deref(),
        Some("glm-5.3-flash"),
        "reversing the catalog must not change the resolved model"
    );
    shuffled.rotate_left(4);
    assert_eq!(
        claude_gateway_model(&shuffled, None).as_deref(),
        Some("glm-5.3-flash"),
        "rotating the catalog must not change the resolved model"
    );

    // A model the catalog no longer advertises is never pinned: the explicit
    // path requires the id to be present and owned by the provider.
    let current: Vec<RouterModel> = catalog
        .iter()
        .filter(|model| model.id != "glm-4.5")
        .cloned()
        .collect();
    assert_ne!(
        claude_gateway_model(&current, Some("glm-4.5")).as_deref(),
        Some("glm-4.5"),
        "a withdrawn model must not be pinned just because it was asked for"
    );

    // A provider that dates none of its models still answers deterministically
    // rather than by position.
    let undated: Vec<RouterModel> = ids
        .iter()
        .map(|id| RouterModel {
            id: (*id).into(),
            owned_by: ZAI_MODEL_OWNER.into(),
            ..RouterModel::default()
        })
        .collect();
    let resolved = claude_gateway_model(&undated, None);
    assert!(resolved.is_some());
    let mut rotated = undated;
    rotated.rotate_right(3);
    assert_eq!(
        claude_gateway_model(&rotated, None),
        resolved,
        "an undated catalog must still not resolve by position"
    );

    // A dated model outranks an undated one: a provider that dates its newer
    // models must not lose to a legacy entry carrying no timestamp.
    let mixed = vec![
        RouterModel {
            id: "glm-legacy-undated".into(),
            owned_by: ZAI_MODEL_OWNER.into(),
            ..RouterModel::default()
        },
        RouterModel {
            id: "glm-5.3-flash".into(),
            owned_by: ZAI_MODEL_OWNER.into(),
            provider_created_at: Some(1_700_000_009),
            ..RouterModel::default()
        },
    ];
    assert_eq!(
        claude_gateway_model(&mixed, None).as_deref(),
        Some("glm-5.3-flash"),
        "a dated model must outrank one the provider did not date"
    );
}

#[test]
fn zai_model_pins_are_owned_configuration_and_drift_is_detected() {
    let home = tempfile::tempdir().unwrap();
    let manager = ClientManager::isolated(home.path());
    let models = vec![RouterModel {
        id: "future-saffron-2099".into(),
        owned_by: ZAI_MODEL_OWNER.into(),
        ..RouterModel::default()
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
                management_server: None,
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
            ..RouterModel::default()
        },
        RouterModel {
            id: "qwen-x".to_string(),
            owned_by: "qwen".to_string(),
            ..RouterModel::default()
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

/// Issue #565: capability was advertised per catalog owner, so every model of a
/// provider — current, older, large, flash — was described identically. Any
/// property that distinguishes two models of one provider was unrepresentable
/// rather than merely unset.
///
/// Resolution is now per model. The owner still selects which reviewed adapter
/// contract applies, so the claim stays reviewable rather than guessed from a
/// model name, and the live catalog still owns the inventory (#546).
#[test]
fn claude_capability_is_resolved_per_model_not_per_catalog_owner() {
    use crate::clients::claude_capability_profile;

    /// Identities Claude Code's auto-mode gate refuses outright.
    const GATE_DENIES: [&str; 7] = [
        "claude-sonnet-4-5",
        "claude-sonnet-4-6",
        "claude-sonnet-4-0",
        "claude-opus-4-0",
        "claude-opus-4-1",
        "claude-opus-4-5",
        "claude-opus-4-6",
    ];

    // Two models of the same provider each resolve on their own id.
    for id in ["glm-4.5", "glm-5.3-flash"] {
        let profile = claude_capability_profile(ZAI_MODEL_OWNER, id)
            .unwrap_or_else(|| panic!("{id} must carry a reviewed capability identity"));
        assert_eq!(profile.behaves_as(), "claude-sonnet-5");
        assert_eq!(profile.source(), "provider-protocol:z.ai-anthropic");
    }

    // The identity is what Claude Code's auto-mode gate reads, and the gate
    // denies a fixed set outright. Advertising one of those took auto mode away
    // from every z.ai model while the provider's own id would have passed
    // (issue #565). This pins the rule rather than the one value, so a future
    // change to a denied identity fails here instead of in a live session.
    let advertised = claude_capability_profile(ZAI_MODEL_OWNER, "glm-5.3-flash")
        .expect("a z.ai model carries an identity")
        .behaves_as();
    assert!(
        !GATE_DENIES.contains(&advertised),
        "{advertised} is refused by Claude Code's auto-mode gate"
    );
    // A gateway launch also refuses any identity naming the haiku family.
    assert!(
        !advertised.contains("haiku"),
        "{advertised} is refused for a gateway auth source"
    );
    // And a superseded identity must not come back: the advertised one has to
    // describe the generation the adapter actually serves. z.ai documents the
    // GLM-5 line at a 1M-token context, which the pre-#565 identity put at
    // 200K — understating the window by five times and making Claude Code
    // compact sessions that had room left.
    assert!(
        !advertised.ends_with("-4-5"),
        "{advertised} describes a superseded context window"
    );

    // A provider with no reviewed contract is still described by nothing: the
    // advertisement must not be invented from a model name.
    assert!(claude_capability_profile("another-provider", "glm-5.3-flash").is_none());

    // An id that names nothing describes nothing.
    assert!(claude_capability_profile(ZAI_MODEL_OWNER, "").is_none());
    assert!(claude_capability_profile(ZAI_MODEL_OWNER, "   ").is_none());

    // The answer depends on the model asked about, never on which other models
    // the provider advertises alongside it, so no catalog-order or neighbour
    // effect can reach it.
    assert_eq!(
        claude_capability_profile(ZAI_MODEL_OWNER, "glm-5.3-flash"),
        claude_capability_profile(ZAI_MODEL_OWNER, "glm-5.3-flash"),
    );
}
