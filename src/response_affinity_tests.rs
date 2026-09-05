use std::time::Duration;

use super::response_affinity::{
    AffinityDestination, RecordOutcome, ResponseAffinityStore, ResponseNamespace, ResponseOwner,
    StoreError,
};

fn owner(principal: &str) -> ResponseOwner {
    ResponseOwner::new("codex", principal)
}

fn provider(name: &str) -> AffinityDestination {
    AffinityDestination::StoredProvider {
        name: name.to_string(),
        provider_kind: crate::providers::ProviderKind::OpenAICompatible,
        base_url: format!("https://{name}.example/v1"),
    }
}

#[test]
fn affinity_survives_reopen_and_token_rotation_identity() {
    let directory = tempfile::tempdir().unwrap();
    let store = ResponseAffinityStore::open(directory.path()).unwrap();
    let inserted = store
        .record_at(
            ResponseNamespace::CodexResponses,
            "resp_one",
            owner("account-1"),
            provider("alpha"),
            1_000,
        )
        .unwrap();
    assert_eq!(inserted, RecordOutcome::Inserted);

    let reopened = ResponseAffinityStore::open(directory.path()).unwrap();
    let found = reopened
        .lookup_at(
            ResponseNamespace::CodexResponses,
            "resp_one",
            &owner("account-1"),
            1_001,
        )
        .unwrap()
        .expect("durable affinity");
    assert_eq!(found.destination, provider("alpha"));
    assert_eq!(found.owner, owner("account-1"));

    let encoded = std::fs::read_to_string(directory.path().join("response-affinities.lino"))
        .expect("affinity document");
    let decoded: serde_json::Value = crate::lino_json::decode(&encoded).unwrap();
    assert_eq!(decoded["version"], 1);
}

#[test]
fn namespace_owner_and_expiry_are_fail_closed() {
    let directory = tempfile::tempdir().unwrap();
    let store =
        ResponseAffinityStore::open_with_limits(directory.path(), Duration::from_secs(10), 10)
            .unwrap();
    store
        .record_at(
            ResponseNamespace::OpenAiResponses,
            "resp_one",
            owner("account-1"),
            provider("alpha"),
            100,
        )
        .unwrap();

    assert!(
        store
            .lookup_at(
                ResponseNamespace::QwenResponses,
                "resp_one",
                &owner("account-1"),
                101,
            )
            .unwrap()
            .is_none()
    );
    assert!(
        store
            .lookup_at(
                ResponseNamespace::OpenAiResponses,
                "resp_one",
                &owner("account-2"),
                101,
            )
            .unwrap()
            .is_none()
    );
    assert!(
        store
            .lookup_at(
                ResponseNamespace::OpenAiResponses,
                "resp_one",
                &owner("account-1"),
                111,
            )
            .unwrap()
            .is_none()
    );
}

#[test]
fn a_same_id_destination_collision_is_never_overwritten() {
    let directory = tempfile::tempdir().unwrap();
    let store = ResponseAffinityStore::open(directory.path()).unwrap();
    store
        .record_at(
            ResponseNamespace::OpenAiResponses,
            "resp_collision",
            owner("account-1"),
            provider("alpha"),
            100,
        )
        .unwrap();
    let error = store
        .record_at(
            ResponseNamespace::OpenAiResponses,
            "resp_collision",
            owner("account-1"),
            provider("beta"),
            101,
        )
        .expect_err("ambiguous response id must be refused");
    assert!(matches!(error, StoreError::Collision));

    let kind_substitution = AffinityDestination::StoredProvider {
        name: "alpha".to_string(),
        provider_kind: crate::providers::ProviderKind::Lefine,
        base_url: "https://alpha.example/v1".to_string(),
    };
    let error = store
        .record_at(
            ResponseNamespace::OpenAiResponses,
            "resp_collision",
            owner("account-1"),
            kind_substitution,
            101,
        )
        .expect_err("provider kind substitution must be refused");
    assert!(matches!(error, StoreError::Collision));

    let found = store
        .lookup_at(
            ResponseNamespace::OpenAiResponses,
            "resp_collision",
            &owner("account-1"),
            102,
        )
        .unwrap()
        .unwrap();
    assert_eq!(found.destination, provider("alpha"));
}

#[test]
fn oldest_affinity_is_evicted_at_the_bound_and_delete_is_conditional() {
    let directory = tempfile::tempdir().unwrap();
    let store =
        ResponseAffinityStore::open_with_limits(directory.path(), Duration::from_secs(100), 2)
            .unwrap();
    for (id, created) in [("resp_1", 1), ("resp_2", 2), ("resp_3", 3)] {
        store
            .record_at(
                ResponseNamespace::CodexResponses,
                id,
                owner("account-1"),
                provider("alpha"),
                created,
            )
            .unwrap();
    }
    assert!(
        store
            .lookup_at(
                ResponseNamespace::CodexResponses,
                "resp_1",
                &owner("account-1"),
                4,
            )
            .unwrap()
            .is_none()
    );
    let record = store
        .lookup_at(
            ResponseNamespace::CodexResponses,
            "resp_2",
            &owner("account-1"),
            4,
        )
        .unwrap()
        .unwrap();
    let mut stale = record.clone();
    stale.destination = provider("beta");
    assert!(!store.remove_if_matches(&stale).unwrap());
    assert!(store.remove_if_matches(&record).unwrap());
    assert!(
        store
            .lookup_at(
                ResponseNamespace::CodexResponses,
                "resp_2",
                &owner("account-1"),
                4,
            )
            .unwrap()
            .is_none()
    );
}

#[test]
fn safe_punctuation_is_accepted_but_path_breakout_is_refused() {
    let temp = tempfile::tempdir().unwrap();
    let store = ResponseAffinityStore::open(temp.path()).unwrap();
    let owner = ResponseOwner::new("codex", "principal-a");
    store
        .record(
            ResponseNamespace::CodexResponses,
            "resp.?#+:% unicode",
            owner.clone(),
            provider("one"),
        )
        .unwrap();
    assert!(
        store
            .lookup(
                ResponseNamespace::CodexResponses,
                "resp.?#+:% unicode",
                &owner
            )
            .unwrap()
            .is_some()
    );
    assert!(
        store
            .record(
                ResponseNamespace::CodexResponses,
                "bad/id",
                owner.clone(),
                provider("one"),
            )
            .is_err()
    );
    assert!(
        store
            .record(
                ResponseNamespace::CodexResponses,
                "bad\ncontrol",
                owner,
                provider("one"),
            )
            .is_err()
    );
}
