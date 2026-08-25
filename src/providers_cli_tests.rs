//! Unit tests for [`crate::providers_cli`].
//!
//! Driven against a real store rather than a mock: these commands are how an
//! operator declares the providers that automatic routing then uses (issue
//! #260), so what matters is that the record they write is the record routing
//! reads back.

use super::*;
use crate::cli::AuthTarget;

fn store(directory: &std::path::Path) -> ProviderStore {
    ProviderStore::open(directory, "providers-cli-test-secret").expect("open a provider store")
}

fn add(name: &str, models: &[&str]) -> ProviderOp {
    ProviderOp::Add {
        name: name.to_string(),
        kind: "openai-compatible".to_string(),
        base_url: "https://provider.example/v1".to_string(),
        model: models.first().map(|model| (*model).to_string()),
        models: models.iter().map(|model| (*model).to_string()).collect(),
        api_key: Some("provider-key".to_string()),
        api_key_env: None,
        enabled: true,
        target: AuthTarget::default(),
    }
}

/// Adding a provider persists exactly what routing later reads: the declared
/// models are what let it win a route at all.
#[test]
fn adding_a_provider_persists_its_declared_models() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = store(directory.path());

    assert_eq!(
        run_with(&store, &add("formal-ai", &["formal-ai-mini"])),
        ExitCode::SUCCESS
    );

    let resolved = store
        .resolve("formal-ai")
        .expect("read the store")
        .expect("the provider is present");
    assert!(resolved.declares("formal-ai-mini"));
    assert_eq!(resolved.base_url, "https://provider.example/v1");
}

/// Listing and showing a provider succeed, and never print the API key: the
/// store redacts it, and these commands are the operator-facing view of it.
#[test]
fn listing_and_showing_a_provider_succeed() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = store(directory.path());
    assert_eq!(
        run_with(&store, &add("formal-ai", &["formal-ai-mini"])),
        ExitCode::SUCCESS
    );

    assert_eq!(
        run_with(
            &store,
            &ProviderOp::List {
                target: AuthTarget::default()
            }
        ),
        ExitCode::SUCCESS
    );
    assert_eq!(
        run_with(
            &store,
            &ProviderOp::Show {
                name: "formal-ai".to_string(),
                target: AuthTarget::default(),
            }
        ),
        ExitCode::SUCCESS
    );
    let redacted = store.list_redacted().expect("list");
    assert!(
        !format!("{redacted:?}").contains("provider-key"),
        "the API key must not be exposed: {redacted:?}"
    );
}

/// Showing or removing an unknown provider fails rather than reporting success
/// for something that was never there.
#[test]
fn an_unknown_provider_is_not_reported_as_removed() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = store(directory.path());

    assert_ne!(
        run_with(
            &store,
            &ProviderOp::Show {
                name: "absent".to_string(),
                target: AuthTarget::default(),
            }
        ),
        ExitCode::SUCCESS
    );
    assert_ne!(
        run_with(
            &store,
            &ProviderOp::Remove {
                name: "absent".to_string(),
                target: AuthTarget::default(),
            }
        ),
        ExitCode::SUCCESS
    );
}

/// Removing a provider takes its models out of the store, so a decommissioned
/// endpoint stops being routable.
#[test]
fn removing_a_provider_takes_its_models_with_it() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = store(directory.path());
    assert_eq!(
        run_with(&store, &add("formal-ai", &["formal-ai-mini"])),
        ExitCode::SUCCESS
    );

    assert_eq!(
        run_with(
            &store,
            &ProviderOp::Remove {
                name: "formal-ai".to_string(),
                target: AuthTarget::default(),
            }
        ),
        ExitCode::SUCCESS
    );

    assert!(
        store
            .resolve("formal-ai")
            .expect("read the store")
            .is_none()
    );
}

/// Importing a file that is not there fails with a message rather than
/// silently leaving the store unchanged.
#[test]
fn importing_a_missing_file_fails() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = store(directory.path());

    assert_ne!(
        run_with(
            &store,
            &ProviderOp::Import {
                path: directory.path().join("absent.lenv"),
                target: AuthTarget::default(),
            }
        ),
        ExitCode::SUCCESS
    );
}
