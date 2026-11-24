// Issue #612: Codex 0.157+ needs `wham/accounts/check` before `account/read`.

async fn json_body(response: Response) -> serde_json::Value {
    serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap()
}

#[tokio::test]
async fn codex_account_discovery_lists_only_the_selected_account_handle() {
    let calls = Arc::new(AtomicUsize::new(0));
    let upstream_calls = Arc::clone(&calls);
    let upstream = axum::Router::new().fallback(move || {
        upstream_calls.fetch_add(1, Ordering::Relaxed);
        async { StatusCode::OK }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let primary = tempfile::tempdir().unwrap();
    let additional = tempfile::tempdir().unwrap();
    for (home, access, account) in [
        (&primary, "codex-primary", "workspace-primary"),
        (&additional, "codex-additional", "workspace-additional"),
    ] {
        std::fs::write(
            home.path().join("auth.json"),
            serde_json::json!({"tokens": {"access_token": access, "account_id": account}})
                .to_string(),
        )
        .unwrap();
    }
    let primary_reader =
        crate::subscription::SubscriptionReader::new(SubscriptionProvider::Codex, primary.path());
    let mut state = AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_base_url = Some(format!("{origin}/backend-api/codex"));
    state.subscription_reader = Some(primary_reader.clone());
    state.subscription_readers = vec![primary_reader];
    let account_router = crate::accounts::AccountRouter::new_for_provider(
        primary.path().to_path_buf(),
        &[additional.path().to_path_buf()],
        SubscriptionProvider::Codex,
        crate::accounts::AccountRouterOptions::default(),
    );
    account_router.register_credential_stores_in(&state.subscription_cache, data.path());
    state.account_router = Some(account_router);
    let alias = codex_apps_token(&state, "principal-a");

    let whoami = Request::builder()
        .uri("/api/services/codex/v1/user-auth-credential/whoami")
        .header("authorization", format!("Bearer {alias}"))
        .body(Body::empty())
        .unwrap();
    let whoami = json_body(codex(State(state.clone()), whoami).await).await;
    let handle = whoami["chatgpt_account_id"].as_str().unwrap().to_string();

    let check = |bearer: &str| {
        Request::builder()
            .uri("/api/services/codex/backend-api/wham/accounts/check")
            .header("authorization", format!("Bearer {bearer}"))
            .header("chatgpt-account-id", &handle)
            .body(Body::empty())
            .unwrap()
    };
    let response = codex_backend(State(state.clone()), check(&alias)).await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = json_body(response).await;
    // Exactly the entry Codex looks up by whoami's account id, and nothing else.
    assert_eq!(
        body,
        serde_json::json!({
            "accounts": [{
                "id": handle,
                "plan_type": "unknown",
                "workspace_backend_origin": "https://chatgpt.com",
                "account_routing_override": "NO_CONSTRAINT",
            }],
            "account_ordering": [handle],
            "default_account_id": handle,
        })
    );
    let rendered = body.to_string();
    for secret in ["workspace-primary", "workspace-additional", "codex-"] {
        assert!(!rendered.contains(secret), "{rendered}");
    }
    assert_eq!(calls.load(Ordering::Relaxed), 0, "discovery is not relayed");

    // A Router key is not the paired Codex credential.
    let key = crate::model_routing::tests::bound_client_token(&state, ClientKind::Codex, None);
    let response = codex_backend(State(state.clone()), check(&key)).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    // Another principal's handle does not select this account.
    let other = codex_apps_token(&state, "principal-b");
    let response = codex_backend(State(state), check(&other)).await;
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    server.abort();
}

#[test]
fn codex_backend_origin_is_the_https_upstream_origin_or_the_vendor_one() {
    assert_eq!(
        codex_backend_origin("https://chatgpt.example:8443/backend-api/codex"),
        "https://chatgpt.example:8443"
    );
    for upstream in ["http://127.0.0.1:9/backend-api/codex", "not a url"] {
        assert_eq!(codex_backend_origin(upstream), "https://chatgpt.com");
    }
}
