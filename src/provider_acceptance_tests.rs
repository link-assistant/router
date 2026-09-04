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

async fn catalog_server(
    status: StatusCode,
    body: &'static str,
    delay: Duration,
) -> (String, Arc<AtomicUsize>, tokio::task::JoinHandle<()>) {
    let calls = Arc::new(AtomicUsize::new(0));
    let observed = Arc::clone(&calls);
    let app = axum::Router::new().route(
        crate::zai_coding_plan::CATALOG_PATH,
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

    assert_eq!(result.outcome, ProviderProvisionOutcome::Promoted);
    let resolved = store.resolve("z-ai-personal").unwrap().unwrap();
    assert_eq!(resolved.api_key.as_deref(), Some("accepted-secret"));
    let live = crate::zai_coding_plan::fetch_catalog(&reqwest::Client::new(), &resolved)
        .await
        .unwrap();
    assert_eq!(live[0].id, "glm-live");
    assert_eq!(calls.load(Ordering::SeqCst), 2);
    server.abort();
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
            .filter(|result| result.outcome == ProviderProvisionOutcome::Promoted)
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
