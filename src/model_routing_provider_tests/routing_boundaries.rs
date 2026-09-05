use super::*;

/// A disabled provider advertises nothing, so disabling one takes its models
/// out of both the catalog and the routing table.
#[tokio::test]
async fn a_disabled_provider_advertises_nothing() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["formal-ai-mini"]);
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "formal-ai".to_string(),
            kind: None,
            base_url: "https://provider.example/v1".to_string(),
            default_model: None,
            models: Some(vec!["formal-ai-mini".to_string()]),
            supported_clients: Some(vec!["opencode".to_string()]),
            api_key: None,
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(false),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
            if_absent: false,
        })
        .expect("disable the provider");

    let Err(error) =
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "formal-ai-mini"}))
            .await
    else {
        panic!("a disabled provider must not route");
    };
    assert!(
        matches!(error, crate::model_routing::ModelRouteError::NotFound(_)),
        "{error:?}"
    );
}

/// A provider-looking name is still an exact id, never a Router alias.
#[tokio::test]
async fn a_provider_looking_name_is_not_interpreted_as_an_alias() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    let (base_url, task) = live_catalog_upstream(&["formal-ai-mini"]).await;
    store_provider_at(&state, "formal-ai", &base_url, &["formal-ai-mini"]);

    let Err(error) = crate::model_routing::route_state_with_subscription_for_client(
        &state,
        &serde_json::json!({"model": "formal-ai/not-declared"}),
        &[],
        Some(crate::clients::ClientKind::Opencode),
        false,
    )
    .await
    else {
        panic!("an undeclared qualified model must be refused");
    };

    assert!(
        matches!(error, crate::model_routing::ModelRouteError::NotFound(_)),
        "{error:?}"
    );
    task.abort();
}

/// A qualified name for a provider that does not exist falls through to
/// ordinary routing rather than being treated as a provider reference.
#[tokio::test]
async fn an_unknown_provider_prefix_is_not_a_provider_reference() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());

    let Err(error) =
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "nobody/model"}))
            .await
    else {
        panic!("nothing advertises this model");
    };

    assert!(
        matches!(error, crate::model_routing::ModelRouteError::NotFound(_)),
        "{error:?}"
    );
}

/// A stored model whose exact id collides with a subscription fails explicitly.
#[tokio::test]
async fn a_colliding_declared_model_is_rejected_without_a_qualified_alias() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    let (base_url, task) = live_catalog_upstream(&["shared-id"]).await;
    store_provider_at(&state, "formal-ai", &base_url, &["shared-id"]);

    let mut catalog = serde_json::json!({
        "object": "list",
        "data": [{"id": "shared-id", "object": "model", "owned_by": "anthropic"}]
    });
    let (claims, headers) = opencode_catalog_identity();
    let result = crate::model_routing::append_stored_provider_models(
        &state,
        &claims,
        &headers,
        "/api/services/openai/v1/models",
        &mut catalog,
    )
    .await;
    assert!(matches!(
        result,
        Err(crate::model_routing::ModelRouteError::Conflict(_))
    ));

    let ids: Vec<&str> = catalog["data"]
        .as_array()
        .expect("data")
        .iter()
        .filter_map(|entry| entry["id"].as_str())
        .collect();
    assert!(
        ids.contains(&"shared-id"),
        "the subscription keeps its id: {ids:?}"
    );
    assert!(!ids.contains(&"formal-ai/shared-id"), "no aliases: {ids:?}");
    task.abort();
}

#[tokio::test]
async fn a_subscription_collision_fails_instead_of_selecting_by_merge_order() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let claude = tempfile::tempdir().expect("Claude home");
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"claude-live"}}"#,
    )
    .expect("Claude credential");
    let state = auto_state(
        vec![crate::subscription::SubscriptionReader::new(
            crate::subscription::SubscriptionProvider::Claude,
            claude.path(),
        )],
        data_dir.path(),
    );
    state.model_catalogs.record_success(
        crate::subscription::SubscriptionProvider::Claude,
        vec!["shared-id".to_string()],
    );
    let (base_url, task) = live_catalog_upstream(&["shared-id"]).await;
    store_provider_at(&state, "formal-ai", &base_url, &["shared-id"]);

    let bare = crate::model_routing::route_state_with_subscription_for_client(
        &state,
        &serde_json::json!({"model": "shared-id"}),
        &[crate::subscription::SubscriptionProvider::Claude],
        Some(crate::clients::ClientKind::Opencode),
        false,
    )
    .await;
    assert!(matches!(
        bare,
        Err(crate::model_routing::ModelRouteError::Conflict(_))
    ));

    let qualified = crate::model_routing::route_state_with_subscription_for_client(
        &state,
        &serde_json::json!({"model": "formal-ai/shared-id"}),
        &[crate::subscription::SubscriptionProvider::Claude],
        Some(crate::clients::ClientKind::Opencode),
        false,
    )
    .await;
    assert!(qualified.is_err(), "qualified aliases are not exposed");
    task.abort();
}

/// A request with no model is refused before any provider is consulted.
#[tokio::test]
async fn a_request_without_a_model_is_refused() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());

    let Err(error) = crate::model_routing::route_state(&state, &serde_json::json!({})).await else {
        panic!("a model is required in automatic mode");
    };

    assert!(
        matches!(error, crate::model_routing::ModelRouteError::ModelRequired),
        "{error:?}"
    );
}

#[test]
fn automatic_routing_errors_never_expose_catalog_bodies_accounts_or_paths() {
    let catalogs = ModelCatalogCache::new();
    let sentinel = "vendor-body account-secret /private/credentials/codex.json";
    catalogs.record_failure(SubscriptionProvider::Codex, sentinel, true);

    let error = available_provider_for_model("gpt-secret", &[], &catalogs)
        .expect_err("a failed catalog is not routable")
        .to_string();

    assert!(error.contains("codex"));
    assert!(!error.contains("vendor-body"), "{error}");
    assert!(!error.contains("account-secret"), "{error}");
    assert!(!error.contains("/private/credentials"), "{error}");
}
