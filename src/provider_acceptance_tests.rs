use super::*;
use axum::http::StatusCode;
use axum::routing::get;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;

fn zai_input(base_url: &str, api_key: &str) -> ProviderUpsert {
    ProviderUpsert {
        name: "z-ai-personal".into(),
        kind: Some("z.ai-coding-plan".into()),
        base_url: base_url.into(),
        default_model: Some("glm-live".into()),
        models: Some(vec!["glm-live".into()]),
        supported_clients: None,
        api_key: Some(api_key.into()),
        api_key_env: None,
        encrypted_api_key: None,
        enabled: Some(true),
        subscriber_id: Some("owner".into()),
        acknowledge_intermediary_risk: Some(true),
        acknowledge_unsupported_clients: Some(Vec::new()),
        if_absent: false,
    }
}

fn lefine_input(base_url: &str, api_key: &str) -> ProviderUpsert {
    ProviderUpsert {
        name: "lefine".into(),
        kind: Some("lefine".into()),
        base_url: base_url.into(),
        default_model: None,
        models: Some(vec!["configured/exact-id".into()]),
        supported_clients: None,
        api_key: Some(api_key.into()),
        api_key_env: None,
        encrypted_api_key: None,
        enabled: Some(true),
        subscriber_id: None,
        acknowledge_intermediary_risk: None,
        acknowledge_unsupported_clients: None,
        if_absent: false,
    }
}

async fn catalog_server(
    status: StatusCode,
    body: &'static str,
    delay: Duration,
) -> (String, Arc<AtomicUsize>, tokio::task::JoinHandle<()>) {
    provider_catalog_server(crate::zai_coding_plan::CATALOG_PATH, status, body, delay).await
}

async fn provider_catalog_server(
    path: &'static str,
    status: StatusCode,
    body: &'static str,
    delay: Duration,
) -> (String, Arc<AtomicUsize>, tokio::task::JoinHandle<()>) {
    let calls = Arc::new(AtomicUsize::new(0));
    let observed = Arc::clone(&calls);
    let app = axum::Router::new().route(
        path,
        get(move || {
            let observed = Arc::clone(&observed);
            async move {
                observed.fetch_add(1, Ordering::SeqCst);
                tokio::time::sleep(delay).await;
                (status, [("content-type", "application/json")], body)
            }
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (base_url, calls, server)
}

#[tokio::test]
async fn every_unaccepted_zai_probe_preserves_the_old_encrypted_record() {
    let cases = [
        (StatusCode::UNAUTHORIZED, r#"{"error":"bad key"}"#, 250),
        (StatusCode::TOO_MANY_REQUESTS, r#"{"error":"slow"}"#, 251),
        (
            StatusCode::OK,
            r#"{"success":false,"code":401,"message":"bad key"}"#,
            250,
        ),
        (StatusCode::OK, "not-json", 503),
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            r#"{"error":"down"}"#,
            503,
        ),
    ];
    for (status, body, expected_status) in cases {
        let (base_url, calls, server) = catalog_server(status, body, Duration::ZERO).await;
        let data = tempfile::tempdir().unwrap();
        let store = ProviderStore::open(data.path(), "test-secret").unwrap();
        store.upsert(zai_input(&base_url, "old-secret")).unwrap();
        let before = std::fs::read(data.path().join("providers.lenv")).unwrap();

        let error = provision(
            &reqwest::Client::new(),
            &store,
            zai_input(&base_url, "candidate-secret"),
        )
        .await
        .unwrap_err();

        let actual_status = match error.kind() {
            ProviderProvisionFailureKind::CredentialRejected => 250,
            ProviderProvisionFailureKind::RateLimited => 251,
            ProviderProvisionFailureKind::Unverified => 503,
            other => panic!("unexpected failure {other:?}"),
        };
        assert_eq!(actual_status, expected_status);
        assert_eq!(
            std::fs::read(data.path().join("providers.lenv")).unwrap(),
            before
        );
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert_eq!(
            store
                .resolve("z-ai-personal")
                .unwrap()
                .unwrap()
                .api_key
                .as_deref(),
            Some("old-secret")
        );
        server.abort();
    }
}

#[tokio::test]
async fn rejected_lefine_replacement_keeps_the_working_provider() {
    let (base_url, calls, server) = provider_catalog_server(
        "/v1/models",
        StatusCode::UNAUTHORIZED,
        r#"{"error":{"code":"invalid_api_key"}}"#,
        Duration::ZERO,
    )
    .await;
    let data = tempfile::tempdir().unwrap();
    let store = ProviderStore::open(data.path(), "test-secret").unwrap();
    store.upsert(lefine_input(&base_url, "old-secret")).unwrap();
    let path = data.path().join("providers.lenv");
    let before = std::fs::read(&path).unwrap();

    let error = provision(
        &reqwest::Client::new(),
        &store,
        lefine_input(&base_url, "candidate-secret"),
    )
    .await
    .unwrap_err();

    assert_eq!(
        error.kind(),
        ProviderProvisionFailureKind::CredentialRejected
    );
    assert_eq!(std::fs::read(path).unwrap(), before);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    server.abort();
}

#[tokio::test]
async fn lefine_failure_matrix_preserves_the_encrypted_primary() {
    let cases = [
        (
            StatusCode::OK,
            r#"{"error":{"code":"invalid_api_key","message":"bad"}}"#,
            ProviderProvisionFailureKind::CredentialRejected,
        ),
        (
            StatusCode::TOO_MANY_REQUESTS,
            r#"{"error":{"code":"rate_limit"}}"#,
            ProviderProvisionFailureKind::RateLimited,
        ),
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            r#"{"error":"down"}"#,
            ProviderProvisionFailureKind::Unverified,
        ),
        (
            StatusCode::OK,
            "not-json",
            ProviderProvisionFailureKind::Unverified,
        ),
    ];
    for (status, body, expected) in cases {
        let (base_url, calls, server) =
            provider_catalog_server("/v1/models", status, body, Duration::ZERO).await;
        let data = tempfile::tempdir().unwrap();
        let store = ProviderStore::open(data.path(), "test-secret").unwrap();
        store.upsert(lefine_input(&base_url, "old-secret")).unwrap();
        let path = data.path().join("providers.lenv");
        let before = std::fs::read(&path).unwrap();

        let error = provision(
            &reqwest::Client::new(),
            &store,
            lefine_input(&base_url, "candidate-secret"),
        )
        .await
        .unwrap_err();

        assert_eq!(error.kind(), expected);
        assert_eq!(std::fs::read(path).unwrap(), before);
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        server.abort();
    }
}

#[tokio::test]
async fn lefine_timeout_preserves_the_encrypted_primary() {
    let (base_url, calls, server) = provider_catalog_server(
        "/v1/models",
        StatusCode::OK,
        r#"{"data":[{"id":"vendor/exact-id"}]}"#,
        Duration::from_millis(100),
    )
    .await;
    let data = tempfile::tempdir().unwrap();
    let store = ProviderStore::open(data.path(), "test-secret").unwrap();
    store.upsert(lefine_input(&base_url, "old-secret")).unwrap();
    let path = data.path().join("providers.lenv");
    let before = std::fs::read(&path).unwrap();
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(20))
        .build()
        .unwrap();

    let error = provision(&client, &store, lefine_input(&base_url, "candidate-secret"))
        .await
        .unwrap_err();

    assert_eq!(error.kind(), ProviderProvisionFailureKind::Unverified);
    assert_eq!(std::fs::read(path).unwrap(), before);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    server.abort();
}

#[tokio::test]
async fn accepted_lefine_candidate_is_encrypted_promoted_and_live() {
    let (base_url, calls, server) = provider_catalog_server(
        "/v1/models",
        StatusCode::OK,
        r#"{"data":[{"id":"vendor/live-exact"}]}"#,
        Duration::ZERO,
    )
    .await;
    let data = tempfile::tempdir().unwrap();
    let store = ProviderStore::open(data.path(), "test-secret").unwrap();

    let result = provision(
        &reqwest::Client::new(),
        &store,
        lefine_input(&base_url, "accepted-secret"),
    )
    .await
    .unwrap();

    assert_eq!(result.outcome, ProviderProvisionOutcome::Created);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    let persisted = std::fs::read_to_string(data.path().join("providers.lenv")).unwrap();
    assert!(!persisted.contains("accepted-secret"));
    let resolved = store.resolve("lefine").unwrap().unwrap();
    assert_eq!(resolved.api_key.as_deref(), Some("accepted-secret"));
    assert_eq!(resolved.kind, ProviderKind::Lefine);
    server.abort();
}

#[tokio::test]
async fn timeout_is_unverified_and_does_not_promote_the_candidate() {
    let (base_url, calls, server) = catalog_server(
        StatusCode::OK,
        r#"{"data":[{"id":"glm-live"}]}"#,
        Duration::from_millis(100),
    )
    .await;
    let data = tempfile::tempdir().unwrap();
    let store = ProviderStore::open(data.path(), "test-secret").unwrap();
    store.upsert(zai_input(&base_url, "old-secret")).unwrap();
    let before = std::fs::read(data.path().join("providers.lenv")).unwrap();
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(20))
        .build()
        .unwrap();

    let error = provision(&client, &store, zai_input(&base_url, "candidate-secret"))
        .await
        .unwrap_err();

    assert_eq!(error.kind(), ProviderProvisionFailureKind::Unverified);
    assert_eq!(
        std::fs::read(data.path().join("providers.lenv")).unwrap(),
        before
    );
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    server.abort();
}

#[tokio::test]
async fn accepted_live_catalog_promotes_without_an_inference_request() {
    let (base_url, calls, server) = catalog_server(
        StatusCode::OK,
        r#"{"success":true,"data":[{"id":"glm-live"}]}"#,
        Duration::ZERO,
    )
    .await;
    let data = tempfile::tempdir().unwrap();
    let store = ProviderStore::open(data.path(), "test-secret").unwrap();

    let result = provision(
        &reqwest::Client::new(),
        &store,
        zai_input(&base_url, "accepted-secret"),
    )
    .await
    .unwrap();

    assert_eq!(result.outcome, ProviderProvisionOutcome::Created);
    let resolved = store.resolve("z-ai-personal").unwrap().unwrap();
    assert_eq!(resolved.api_key.as_deref(), Some("accepted-secret"));
    let live = crate::zai_coding_plan::fetch_catalog(&reqwest::Client::new(), &resolved)
        .await
        .unwrap();
    assert_eq!(live[0].id, "glm-live");
    assert_eq!(calls.load(Ordering::SeqCst), 2);
    let public = serde_json::to_string(&result.response()).unwrap();
    assert!(public.contains(r#""outcome":"created""#), "{public}");
    assert!(!public.contains("owner"), "{public}");
    assert!(!public.contains("accepted-secret"), "{public}");
    assert!(!public.contains("subscriber_id"), "{public}");
    server.abort();
}

#[tokio::test]
async fn disabled_candidates_are_validated_before_they_can_replace_a_working_provider() {
    for kind in [ProviderKind::ZaiCodingPlan, ProviderKind::Lefine] {
        let path = if kind == ProviderKind::ZaiCodingPlan {
            crate::zai_coding_plan::CATALOG_PATH
        } else {
            "/v1/models"
        };
        let (base_url, calls, server) = provider_catalog_server(
            path,
            StatusCode::UNAUTHORIZED,
            r#"{"error":"candidate rejected"}"#,
            Duration::ZERO,
        )
        .await;
        let data = tempfile::tempdir().unwrap();
        let store = ProviderStore::open(data.path(), "test-secret").unwrap();
        let mut original = if kind == ProviderKind::ZaiCodingPlan {
            zai_input(&base_url, "working-secret")
        } else {
            lefine_input(&base_url, "working-secret")
        };
        original.enabled = Some(true);
        store.upsert(original).unwrap();
        let before = std::fs::read(data.path().join("providers.lenv")).unwrap();
        let mut candidate = if kind == ProviderKind::ZaiCodingPlan {
            zai_input(&base_url, "unverified-secret")
        } else {
            lefine_input(&base_url, "unverified-secret")
        };
        candidate.enabled = Some(false);

        let error = provision(&reqwest::Client::new(), &store, candidate)
            .await
            .unwrap_err();

        assert_eq!(
            error.kind(),
            ProviderProvisionFailureKind::CredentialRejected
        );
        assert_eq!(
            std::fs::read(data.path().join("providers.lenv")).unwrap(),
            before
        );
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        server.abort();
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn concurrent_if_absent_has_exactly_one_winner() {
    let barrier = Arc::new(tokio::sync::Barrier::new(2));
    let waiting = Arc::clone(&barrier);
    let app = axum::Router::new().route(
        crate::zai_coding_plan::CATALOG_PATH,
        get(move || {
            let waiting = Arc::clone(&waiting);
            async move {
                waiting.wait().await;
                axum::Json(serde_json::json!({"data":[{"id":"glm-live"}]}))
            }
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let data = tempfile::tempdir().unwrap();
    let store = ProviderStore::open(data.path(), "test-secret").unwrap();
    let mut first = zai_input(&base_url, "first-secret");
    first.if_absent = true;
    let mut second = zai_input(&base_url, "second-secret");
    second.if_absent = true;
    let client = reqwest::Client::new();

    let (first, second) = tokio::join!(
        provision(&client, &store, first),
        provision(&client, &store, second)
    );
    let results = [first.unwrap(), second.unwrap()];

    assert_eq!(
        results
            .iter()
            .filter(|result| result.outcome == ProviderProvisionOutcome::Created)
            .count(),
        1
    );
    assert_eq!(
        results
            .iter()
            .filter(|result| result.outcome == ProviderProvisionOutcome::AlreadyPresent)
            .count(),
        1
    );
    assert_eq!(results[0].record, results[1].record);
    server.abort();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn concurrent_lefine_if_absent_has_exactly_one_winner() {
    let barrier = Arc::new(tokio::sync::Barrier::new(2));
    let waiting = Arc::clone(&barrier);
    let app = axum::Router::new().route(
        "/v1/models",
        get(move || {
            let waiting = Arc::clone(&waiting);
            async move {
                waiting.wait().await;
                axum::Json(serde_json::json!({"data":[{"id":"vendor/exact-id"}]}))
            }
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let data = tempfile::tempdir().unwrap();
    let store = ProviderStore::open(data.path(), "test-secret").unwrap();
    let mut first = lefine_input(&base_url, "first-secret");
    first.if_absent = true;
    let mut second = lefine_input(&base_url, "second-secret");
    second.if_absent = true;
    let client = reqwest::Client::new();

    let (first, second) = tokio::join!(
        provision(&client, &store, first),
        provision(&client, &store, second)
    );
    let results = [first.unwrap(), second.unwrap()];

    assert_eq!(
        results
            .iter()
            .filter(|result| result.outcome == ProviderProvisionOutcome::Created)
            .count(),
        1
    );
    assert_eq!(
        results
            .iter()
            .filter(|result| result.outcome == ProviderProvisionOutcome::AlreadyPresent)
            .count(),
        1
    );
    assert_eq!(results[0].record, results[1].record);
    server.abort();
}

#[test]
fn abandoning_a_staged_candidate_leaves_the_durable_primary_unchanged() {
    let data = tempfile::tempdir().unwrap();
    let store = ProviderStore::open(data.path(), "test-secret").unwrap();
    store
        .upsert(zai_input("https://example.test", "old-secret"))
        .unwrap();
    let path = data.path().join("providers.lenv");
    let before = std::fs::read(&path).unwrap();

    let candidate = store
        .stage(zai_input("https://example.test", "candidate-secret"))
        .unwrap();
    drop(candidate);

    assert_eq!(std::fs::read(&path).unwrap(), before);
    assert_eq!(
        ProviderStore::open(data.path(), "test-secret")
            .unwrap()
            .resolve("z-ai-personal")
            .unwrap()
            .unwrap()
            .api_key
            .as_deref(),
        Some("old-secret")
    );
}

#[cfg(unix)]
#[tokio::test]
async fn persistence_uncertainty_restores_the_old_record_bytes() {
    use std::os::unix::fs::PermissionsExt as _;

    let (base_url, _calls, server) = catalog_server(
        StatusCode::OK,
        r#"{"data":[{"id":"glm-live"}]}"#,
        Duration::ZERO,
    )
    .await;
    let data = tempfile::tempdir().unwrap();
    let store = ProviderStore::open(data.path(), "test-secret").unwrap();
    store.upsert(zai_input(&base_url, "old-secret")).unwrap();
    let path = data.path().join("providers.lenv");
    let before = std::fs::read(&path).unwrap();
    std::fs::set_permissions(data.path(), std::fs::Permissions::from_mode(0o500)).unwrap();

    let result = provision(
        &reqwest::Client::new(),
        &store,
        zai_input(&base_url, "candidate-secret"),
    )
    .await;
    std::fs::set_permissions(data.path(), std::fs::Permissions::from_mode(0o700)).unwrap();
    let error = result.unwrap_err();

    assert_eq!(
        error.kind(),
        ProviderProvisionFailureKind::PersistenceUncertain
    );
    assert_eq!(std::fs::read(path).unwrap(), before);
    assert_eq!(
        store
            .resolve("z-ai-personal")
            .unwrap()
            .unwrap()
            .api_key
            .as_deref(),
        Some("old-secret")
    );
    server.abort();
}

#[tokio::test]
async fn late_provider_rename_and_commit_failures_restore_the_old_primary() {
    for failed_path in ["providers.lenv", ".providers.lenv.router-commit"] {
        let (base_url, _calls, server) = catalog_server(
            StatusCode::OK,
            r#"{"data":[{"id":"glm-live"}]}"#,
            Duration::ZERO,
        )
        .await;
        let data = tempfile::tempdir().unwrap();
        let store = ProviderStore::open(data.path(), "test-secret").unwrap();
        store.upsert(zai_input(&base_url, "old-secret")).unwrap();
        let path = data.path().join("providers.lenv");
        let before = std::fs::read(&path).unwrap();
        let _fault = crate::durable_file::inject_fault(
            &data.path().join(failed_path),
            crate::durable_file::FaultPoint::AfterRename,
        );

        let error = provision(
            &reqwest::Client::new(),
            &store,
            zai_input(&base_url, "candidate-secret"),
        )
        .await
        .unwrap_err();

        assert_eq!(
            error.kind(),
            ProviderProvisionFailureKind::PersistenceUncertain
        );
        assert_eq!(std::fs::read(&path).unwrap(), before);
        assert_eq!(
            ProviderStore::open(data.path(), "test-secret")
                .unwrap()
                .resolve("z-ai-personal")
                .unwrap()
                .unwrap()
                .api_key
                .as_deref(),
            Some("old-secret")
        );
        server.abort();
    }
}

#[tokio::test]
async fn late_provider_unlock_failure_reports_the_committed_candidate() {
    let (base_url, _calls, server) = catalog_server(
        StatusCode::OK,
        r#"{"data":[{"id":"glm-live"}]}"#,
        Duration::ZERO,
    )
    .await;
    let data = tempfile::tempdir().unwrap();
    let store = ProviderStore::open(data.path(), "test-secret").unwrap();
    store.upsert(zai_input(&base_url, "old-secret")).unwrap();
    let _fault = crate::durable_file::inject_fault(
        &data.path().join("providers.lock"),
        crate::durable_file::FaultPoint::Unlock,
    );

    let result = provision(
        &reqwest::Client::new(),
        &store,
        zai_input(&base_url, "candidate-secret"),
    )
    .await
    .unwrap();

    assert_eq!(result.outcome, ProviderProvisionOutcome::Replaced);
    assert_eq!(
        ProviderStore::open(data.path(), "test-secret")
            .unwrap()
            .resolve("z-ai-personal")
            .unwrap()
            .unwrap()
            .api_key
            .as_deref(),
        Some("candidate-secret")
    );
    server.abort();
}
