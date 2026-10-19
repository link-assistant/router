//! Every wall-clock dependency observes the caller's scoped operation clock.
use std::{fs, path::Path, time::Duration};

use link_assistant_router::{
    account_limits,
    admin::{AdminClaim, ClaimError},
    clients::{ClientKind, ClientManager},
    deploy_seed::{self, SeedProvider},
    operation_context::OperationContext,
    zai_upstream_error,
};
use serde_json::{Value, json};

const ISSUED: i64 = 1_600_000_000;

fn clock(root: &Path, timestamp: i64) -> OperationContext {
    let mut context = OperationContext::isolated(root);
    context.now = chrono::DateTime::from_timestamp(timestamp, 0);
    context
}

#[test]
fn account_usage_and_exhaustion_observations_use_the_scoped_clock() {
    let home = tempfile::tempdir().unwrap();
    clock(home.path(), ISSUED).scope(|| {
        assert_eq!(account_limits::now_unix(), ISSUED.cast_unsigned());
        let exhaustion = zai_upstream_error::classify(
            br#"{"error":{"code":"1113","message":"fixture exhaustion"}}"#,
        )
        .unwrap();
        assert_eq!(exhaustion.observed_unix(), ISSUED.cast_unsigned());
    });
    clock(home.path(), -1).scope(|| {
        assert_eq!(account_limits::now_unix(), 0);
        assert_eq!(
            zai_upstream_error::classify(br#"{"code":1113}"#)
                .unwrap()
                .observed_unix(),
            0
        );
    });
}

#[test]
fn administrator_candidate_expires_at_the_exact_injected_boundary() {
    let home = tempfile::tempdir().unwrap();
    let admin = AdminClaim::in_memory(None, Duration::from_secs(60));
    let candidate = clock(home.path(), ISSUED).scope(|| admin.begin()).unwrap();
    assert!(clock(home.path(), ISSUED + 59).scope(|| admin.status().candidate_pending));
    assert!(!clock(home.path(), ISSUED + 60).scope(|| admin.status().candidate_pending));
    assert!(matches!(
        clock(home.path(), ISSUED + 60)
            .scope(|| admin.confirm(&candidate.claim_id, &candidate.token)),
        Err(ClaimError::NoCandidate)
    ));
}

#[test]
fn administrator_confirmation_records_the_injected_timestamp() {
    let home = tempfile::tempdir().unwrap();
    let admin = AdminClaim::in_memory(None, Duration::from_secs(60));
    clock(home.path(), ISSUED).scope(|| {
        let candidate = admin.begin().unwrap();
        admin
            .confirm(&candidate.claim_id, &candidate.token)
            .unwrap();
        assert_eq!(admin.status().claimed_at, Some(ISSUED.cast_unsigned()));
    });
}

#[test]
fn deployment_handover_records_each_scoped_timestamp() {
    let home = tempfile::tempdir().unwrap();
    fs::create_dir(home.path().join(".claude")).unwrap();
    let path = home.path().join(".claude/.credentials.json");
    fs::write(
        &path,
        json!({"claudeAiOauth": {
            "accessToken": "fixture-access",
            "refreshToken": "fixture-refresh",
            "expiresAt": 4_102_444_800_000_i64,
            "scopes": ["user:inference"],
        }})
        .to_string(),
    )
    .unwrap();
    let seed = clock(home.path(), ISSUED)
        .scope(|| deploy_seed::prepare(SeedProvider::Claude, home.path(), "fixture", "secret"))
        .unwrap();
    clock(home.path(), ISSUED)
        .scope(|| seed.mark_pending("fixture"))
        .unwrap();
    let stored = || serde_json::from_slice::<Value>(&fs::read(&path).unwrap()).unwrap();
    assert_eq!(
        stored().pointer("/_link_assistant_router/handed_over/at_unix"),
        Some(&json!(ISSUED))
    );
    clock(home.path(), ISSUED + 120)
        .scope(|| seed.settle("fixture", Some("imported")))
        .unwrap();
    assert_eq!(
        stored().pointer("/_link_assistant_router/handed_over/at_unix"),
        Some(&json!(ISSUED + 120))
    );
}

#[test]
fn repeated_client_writes_at_a_frozen_clock_preserve_distinct_backups() {
    let home = tempfile::tempdir().unwrap();
    let manager = ClientManager::isolated(home.path());
    let directory = home.path().join(".claude");
    fs::create_dir(&directory).unwrap();
    let config = directory.join("settings.json");
    let mut backups = Vec::new();
    for user_setting in ["first", "second"] {
        let original = json!({
            "env": {"ANTHROPIC_BASE_URL": "http://fixture.invalid"},
            "user_setting": user_setting,
        })
        .to_string();
        fs::write(&config, &original).unwrap();
        fs::write(
            directory.join(".link-assistant-router-client.json"),
            r#"{"anthropic_base_url":"http://fixture.invalid"}"#,
        )
        .unwrap();
        let result = clock(home.path(), ISSUED)
            .scope(|| manager.remove(ClientKind::ClaudeCode))
            .unwrap();
        let backup = result.backup.unwrap();
        let stamp = u128::from(ISSUED.cast_unsigned()) * 1_000_000_000;
        assert!(
            backup
                .file_name()
                .unwrap()
                .to_string_lossy()
                .contains(&format!(".link-assistant-router.{stamp}.")),
            "backup timestamp must come from the injected clock: {backup:?}"
        );
        backups.push((backup, original));
    }
    assert_ne!(backups[0].0, backups[1].0);
    for (backup, original) in backups {
        assert_eq!(fs::read_to_string(backup).unwrap(), original);
    }
}
