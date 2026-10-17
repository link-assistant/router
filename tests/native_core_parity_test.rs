//! Shared deterministic fixtures for the native JavaScript core.
//! This adapter must be run in a Rust-enabled CI environment; authoring it is
//! not evidence that the Rust/native comparison has passed.
use link_assistant_router::{
    operation_context::OperationContext,
    storage::{MemoryTokenStore, RequestAdmission, TextTokenStore, TokenRecord, TokenStore},
    token::TokenManager,
};
use std::sync::Arc;

fn fixture() -> serde_json::Value {
    serde_json::from_str(include_str!("../parity/fixtures/core/behavior.json")).unwrap()
}

#[test]
fn shared_native_token_projection_and_signature() {
    let fixture = fixture();
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("tokens.lino");
    std::fs::write(&path, include_str!("../parity/fixtures/core/tokens.lino")).unwrap();
    let store = Arc::new(TextTokenStore::open(path).unwrap());
    let expected: TokenRecord = serde_json::from_value(fixture["token_record"].clone()).unwrap();
    assert_eq!(store.get(&expected.id).unwrap().unwrap(), expected);
    let manager = TokenManager::with_store(fixture["token_secret"].as_str().unwrap(), store);
    let mut context = OperationContext::default();
    context.now = chrono::DateTime::from_timestamp(fixture["clock"].as_i64().unwrap(), 0);
    context.scope(|| {
        let claims = manager
            .validate_token(fixture["token"].as_str().unwrap())
            .unwrap();
        assert_eq!(claims.sub, expected.id);
        assert!(manager.authorize_model(&claims.sub, "model-a").is_ok());
        assert!(manager.authorize_model(&claims.sub, "model-b").is_err());
    });
}

#[test]
fn shared_token_budget_boundaries() {
    let fixture = fixture();
    let baseline: TokenRecord = serde_json::from_value(fixture["token_record"].clone()).unwrap();
    for row in fixture["budget_cases"].as_array().unwrap() {
        let store = MemoryTokenStore::new();
        let mut record = baseline.clone();
        record.max_requests = None;
        record.used_tokens = row["used"].as_u64().unwrap();
        record.reserved_tokens = row["reserved"].as_u64().unwrap();
        record.max_tokens = row["max"]
            .as_i64()
            .filter(|max| *max >= 0)
            .map(|max| max as u64);
        store.put(record.clone()).unwrap();
        let verdict = store
            .try_admit_request_reserving(
                &record.id,
                fixture["clock"].as_i64().unwrap(),
                row["reserve"].as_u64().unwrap(),
            )
            .unwrap();
        assert_eq!(
            verdict == RequestAdmission::Admitted,
            row["admitted"].as_bool().unwrap()
        );
    }
}
