use super::*;

fn provider(models: &[&str]) -> ResolvedProvider {
    ResolvedProvider {
        name: "lefine".into(),
        kind: ProviderKind::Lefine,
        base_url: BASE_URL.into(),
        default_model: None,
        models: models.iter().map(|model| (*model).to_string()).collect(),
        supported_clients: COMPATIBLE_CLIENTS.into_iter().map(str::to_string).collect(),
        api_key: Some("secret".into()),
        subscriber_id: None,
        intermediary_risk_acknowledged: false,
        unsupported_clients: Vec::new(),
    }
}

async fn fetch_from(
    status: axum::http::StatusCode,
    body: &str,
    declared_length: Option<usize>,
    base_has_v1: bool,
) -> Result<Vec<LiveProviderModel>, CatalogFailure> {
    let body = body.to_string();
    let app = axum::Router::new().route(
        "/v1/models",
        axum::routing::get(move || {
            let body = body.clone();
            async move {
                let mut response = axum::response::Response::builder()
                    .status(status)
                    .body(axum::body::Body::from(body))
                    .unwrap();
                if let Some(length) = declared_length {
                    response.headers_mut().insert(
                        axum::http::header::CONTENT_LENGTH,
                        axum::http::HeaderValue::from_str(&length.to_string()).unwrap(),
                    );
                }
                response
            }
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let mut provider = provider(&[]);
    let origin = format!("http://{}", listener.local_addr().unwrap());
    provider.base_url = if base_has_v1 {
        format!("{origin}/v1")
    } else {
        origin
    };
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let result = fetch_catalog(&reqwest::Client::new(), &provider).await;
    server.abort();
    result
}

#[test]
fn configured_fallback_preserves_exact_ids_without_inventing_a_model() {
    let models = configured_catalog(&provider(&["vendor/exact-a", "vendor/exact-b"])).unwrap();
    assert_eq!(
        models
            .iter()
            .map(|model| model.id.as_str())
            .collect::<Vec<_>>(),
        ["vendor/exact-a", "vendor/exact-b"]
    );
    assert!(configured_catalog(&provider(&[])).is_err());
    let documented_example = ["workflow", "orator"].join("/");
    assert!(!include_str!("lefine.rs").contains(&documented_example));
}

#[tokio::test]
async fn live_catalog_uses_bearer_auth_preserves_ids_and_deduplicates() {
    let app = axum::Router::new().route(
        "/v1/models",
        axum::routing::get(|headers: axum::http::HeaderMap| async move {
            assert_eq!(
                headers
                    .get("authorization")
                    .and_then(|value| value.to_str().ok()),
                Some("Bearer secret")
            );
            axum::Json(serde_json::json!({
                "object": "list",
                "data": [
                    {"id": "vendor/exact:alpha", "object": "model"},
                    {"id": "vendor/exact:alpha", "object": "model"},
                    {"id": "vendor/exact:beta", "object": "model"}
                ]
            }))
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let mut provider = provider(&[]);
    provider.base_url = format!("http://{}/v1", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });

    let models = fetch_catalog(&reqwest::Client::new(), &provider)
        .await
        .unwrap();

    assert_eq!(
        models
            .iter()
            .map(|model| model.id.as_str())
            .collect::<Vec<_>>(),
        ["vendor/exact:alpha", "vendor/exact:beta"]
    );
    server.abort();
}

#[tokio::test]
async fn catalog_failures_are_exactly_classified_and_redacted() {
    let mut wrong_kind = provider(&[]);
    wrong_kind.kind = ProviderKind::OpenAICompatible;
    let failure = fetch_catalog(&reqwest::Client::new(), &wrong_kind)
        .await
        .unwrap_err();
    assert_eq!(failure.kind(), CatalogFailureKind::Unavailable);
    assert_eq!(
        failure.to_string(),
        "provider does not use the Lefine catalog contract"
    );

    let mut missing_key = provider(&[]);
    missing_key.api_key = None;
    let failure = fetch_catalog(&reqwest::Client::new(), &missing_key)
        .await
        .unwrap_err();
    assert_eq!(failure.kind(), CatalogFailureKind::CredentialRejected);
    assert_eq!(failure.to_string(), "Lefine API key is unavailable");

    for status in [
        axum::http::StatusCode::UNAUTHORIZED,
        axum::http::StatusCode::FORBIDDEN,
    ] {
        let failure = fetch_from(status, "provider secret", None, true)
            .await
            .unwrap_err();
        assert_eq!(failure.kind(), CatalogFailureKind::CredentialRejected);
        assert!(!failure.to_string().contains("provider secret"));
    }
    let failure = fetch_from(
        axum::http::StatusCode::TOO_MANY_REQUESTS,
        "provider secret",
        None,
        true,
    )
    .await
    .unwrap_err();
    assert_eq!(failure.kind(), CatalogFailureKind::RateLimited);
    let failure = fetch_from(
        axum::http::StatusCode::SERVICE_UNAVAILABLE,
        "provider secret",
        None,
        true,
    )
    .await
    .unwrap_err();
    assert_eq!(failure.kind(), CatalogFailureKind::Unavailable);
    let failure = fetch_from(
        axum::http::StatusCode::OK,
        "{}",
        Some(MAX_CATALOG_BODY + 1),
        true,
    )
    .await
    .unwrap_err();
    assert_eq!(failure.kind(), CatalogFailureKind::Unavailable);

    let oversized = "x".repeat(MAX_CATALOG_BODY + 1);
    let failure = fetch_from(axum::http::StatusCode::OK, &oversized, None, true)
        .await
        .unwrap_err();
    assert_eq!(failure.kind(), CatalogFailureKind::Unavailable);
}

#[tokio::test]
async fn catalog_payload_validation_covers_every_refusal_shape() {
    let cases = [
        ("not json", CatalogFailureKind::Unavailable, "malformed"),
        (
            r#"{"error":{"code":"invalid_api_key"}}"#,
            CatalogFailureKind::CredentialRejected,
            "returned an error",
        ),
        (
            r#"{"error":{"message":"api key rejected"}}"#,
            CatalogFailureKind::CredentialRejected,
            "returned an error",
        ),
        (
            r#"{"error":{"type":"auth failure"}}"#,
            CatalogFailureKind::CredentialRejected,
            "returned an error",
        ),
        (
            r#"{"error":{"code":401}}"#,
            CatalogFailureKind::CredentialRejected,
            "returned an error",
        ),
        (
            r#"{"error":{"message":"rate limited"}}"#,
            CatalogFailureKind::RateLimited,
            "returned an error",
        ),
        (
            r#"{"error":{"code":429}}"#,
            CatalogFailureKind::RateLimited,
            "returned an error",
        ),
        (
            r#"{"error":"vendor failed"}"#,
            CatalogFailureKind::Unavailable,
            "returned an error",
        ),
        (
            r#"{"data":[]}"#,
            CatalogFailureKind::Unavailable,
            "contained no models",
        ),
        (
            r#"{"data":[7]}"#,
            CatalogFailureKind::Unavailable,
            "invalid model record",
        ),
        (
            r#"{"data":[{"id":" padded "}]}"#,
            CatalogFailureKind::Unavailable,
            "invalid exact model id",
        ),
    ];
    for (body, expected_kind, expected_message) in cases {
        let failure = fetch_from(axum::http::StatusCode::OK, body, None, true)
            .await
            .unwrap_err();
        assert_eq!(failure.kind(), expected_kind);
        assert!(failure.to_string().contains(expected_message));
        assert!(!failure.to_string().contains(body));
    }

    let models = fetch_from(
        axum::http::StatusCode::OK,
        r#"{"data":[{"id":"vendor/exact"}]}"#,
        None,
        false,
    )
    .await
    .unwrap();
    assert_eq!(models[0].id, "vendor/exact");
}
