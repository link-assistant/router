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
async fn real_catalog_smoke_uses_only_an_explicit_secret_environment_variable() {
    let Ok(api_key) = std::env::var("LEFINE_API_KEY") else {
        return;
    };
    if api_key.is_empty() {
        return;
    }
    let mut provider = provider(&[]);
    provider.api_key = Some(api_key);
    let models = fetch_catalog(&reqwest::Client::new(), &provider)
        .await
        .expect("explicit Lefine smoke credential must reach the non-inference catalog");
    assert!(!models.is_empty());
}
