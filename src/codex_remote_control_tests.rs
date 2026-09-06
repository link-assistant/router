use crate::codex_remote_control::{
    CodexRemoteControlStore, EnrollmentIdentity, EnrollmentRecord, StoreError,
};
use axum::body::{Body, Bytes};
use axum::extract::{Request, State};
use axum::http::{HeaderMap, Method, StatusCode};
use axum::response::IntoResponse as _;
use http_body_util::BodyExt as _;
use std::sync::{Arc, Mutex};

fn request_logs(root: &std::path::Path) -> String {
    std::fs::read_dir(root.join("requests"))
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter_map(|entry| std::fs::read_to_string(entry.path().join("requests.lino")).ok())
        .collect::<Vec<_>>()
        .join("\n")
}

fn record(expires_at: i64, upstream_token: &str) -> EnrollmentRecord {
    EnrollmentRecord {
        identity: EnrollmentIdentity {
            principal_id: "principal-private".into(),
            account_name: "account-private".into(),
            server_id: "server-private".into(),
            environment_id: "environment-private".into(),
            installation_id: "installation-private".into(),
        },
        upstream_token: upstream_token.into(),
        upstream_base_url: "https://chatgpt.example/backend-api".into(),
        expires_at,
    }
}

#[test]
fn continuation_store_encrypts_identity_and_secret_and_survives_restart() {
    let directory = tempfile::tempdir().unwrap();
    let store = CodexRemoteControlStore::open(directory.path(), "store-test-secret").unwrap();
    let continuation = store.issue(&record(2_000, "upstream-private")).unwrap();

    assert!(continuation.starts_with("la_rc_"));
    let persisted =
        std::fs::read_to_string(directory.path().join("codex-remote-control.lino")).unwrap();
    for private in [
        &continuation,
        "principal-private",
        "account-private",
        "server-private",
        "environment-private",
        "installation-private",
        "upstream-private",
    ] {
        assert!(
            !persisted.contains(private),
            "persisted store leaked {private}"
        );
    }

    let reopened = CodexRemoteControlStore::open(directory.path(), "store-test-secret").unwrap();
    assert_eq!(
        reopened.resolve(&continuation, 1_999).unwrap(),
        Some(record(2_000, "upstream-private"))
    );
    assert_eq!(reopened.resolve(&continuation, 2_000).unwrap(), None);
    assert_eq!(reopened.resolve("la_rc_unknown", 1_999).unwrap(), None);
}

#[test]
fn refresh_rotation_is_identity_checked_atomic_and_revokes_the_old_token() {
    let directory = tempfile::tempdir().unwrap();
    let store = CodexRemoteControlStore::open(directory.path(), "store-test-secret").unwrap();
    let old = store.issue(&record(2_000, "old-upstream")).unwrap();
    let current = store
        .find(
            "principal-private",
            "account-private",
            "server-private",
            "installation-private",
        )
        .unwrap()
        .unwrap();

    let mut rotated = record(3_000, "new-upstream");
    let new = store.rotate(&current.token_hash, &rotated).unwrap();
    assert_eq!(store.resolve(&old, 1_500).unwrap(), None);
    assert_eq!(store.resolve(&new, 2_500).unwrap(), Some(rotated.clone()));

    rotated.upstream_token = "stale-race".into();
    assert!(matches!(
        store.rotate(&current.token_hash, &rotated),
        Err(StoreError::StaleRotation)
    ));
    assert_eq!(
        store.resolve(&new, 2_500).unwrap().unwrap().upstream_token,
        "new-upstream"
    );
}

#[test]
fn environment_authorization_is_bound_to_principal_and_account_even_after_expiry() {
    let directory = tempfile::tempdir().unwrap();
    let store = CodexRemoteControlStore::open(directory.path(), "store-test-secret").unwrap();
    store.issue(&record(100, "expired-upstream")).unwrap();

    assert!(
        store
            .owns_environment(
                "principal-private",
                "account-private",
                "environment-private"
            )
            .unwrap()
    );
    assert!(
        !store
            .owns_environment(
                "another-principal",
                "account-private",
                "environment-private"
            )
            .unwrap()
    );
    assert!(
        !store
            .owns_environment(
                "principal-private",
                "another-account",
                "environment-private"
            )
            .unwrap()
    );
}

#[tokio::test]
async fn enroll_hides_upstream_bearer_and_continuation_resumes_after_restart() {
    use axum::middleware::from_fn_with_state;
    use lino_arguments::Parser as _;
    use tower::ServiceExt as _;

    type Capture = (String, HeaderMap, Bytes);
    let captured = Arc::new(Mutex::new(Vec::<Capture>::new()));
    let upstream_capture = Arc::clone(&captured);
    let upstream = axum::Router::new().fallback(move |request: Request| {
        let capture = Arc::clone(&upstream_capture);
        async move {
            let path = request.uri().path().to_string();
            let headers = request.headers().clone();
            let body = request.into_body().collect().await.unwrap().to_bytes();
            capture.lock().unwrap().push((path.clone(), headers, body));
            match path.as_str() {
                "/wham/remote/control/server/enroll" => axum::Json(serde_json::json!({
                    "server_id": "server-private",
                    "environment_id": "environment-private",
                    "remote_control_token": "upstream-private",
                    "expires_at": "2099-01-02T03:04:05Z",
                    "future": {"preserved": true}
                }))
                .into_response(),
                "/wham/remote/control/server/pair" => axum::Json(serde_json::json!({
                    "pairing_code": "pairing-private",
                    "manual_pairing_code": null,
                    "server_id": "server-private",
                    "environment_id": "environment-private",
                    "expires_at": "2099-01-02T03:04:05Z"
                }))
                .into_response(),
                "/wham/remote/control/server/refresh" => axum::Json(serde_json::json!({
                    "server_id": "server-private",
                    "environment_id": "environment-private",
                    "remote_control_token": "upstream-refreshed-private",
                    "expires_at": "2099-01-02T03:04:05Z"
                }))
                .into_response(),
                _ => axum::Json(serde_json::json!({
                    "private": "remote-control-response-private"
                }))
                .into_response(),
            }
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let codex_home = tempfile::tempdir().unwrap();
    std::fs::write(
        codex_home.path().join("auth.json"),
        r#"{"tokens":{"access_token":"primary-private","account_id":"account-upstream-private"}}"#,
    )
    .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(
        crate::subscription::SubscriptionProvider::Codex,
        codex_home.path(),
    );
    let mut state = crate::app_state::AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_base_url = Some(origin.clone());
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    let primary = crate::model_routing::tests::bound_client_token(
        &state,
        crate::clients::ClientKind::Codex,
        None,
    );
    let primary = crate::token::codex_token_alias(&primary).unwrap();
    let data_dir = data.path().to_str().unwrap();
    let config = crate::cli::Cli::try_parse_from([
        "router",
        "--token-secret",
        "test-secret",
        "--data-dir",
        data_dir,
        "--upstream-provider",
        "codex",
        "--disable-login-api",
    ])
    .unwrap()
    .into_config()
    .unwrap();
    let app = crate::server_router::router_for_listener(
        state.clone(),
        &config,
        crate::route_contract::ListenerKind::Combined,
    )
    .layer(from_fn_with_state(
        state.clone(),
        crate::request_log::log_http_exchange,
    ));

    let enroll_body = Bytes::from_static(
        br#"{"name":"name-private","os":"macos","arch":"aarch64","app_server_version":"0.153.4","installation_id":"installation-private"}"#,
    );
    let enroll = Request::builder()
        .method(Method::POST)
        .uri("/api/services/codex/backend-api/wham/remote/control/server/enroll")
        .header("authorization", format!("Bearer {primary}"))
        .header("chatgpt-account-id", "acct_invalid-until-whoami")
        .body(Body::from(enroll_body.clone()))
        .unwrap();
    // The official client learns the opaque account handle from whoami. For
    // this fixture omit it so the same selected account is used directly.
    let mut enroll = enroll;
    enroll.headers_mut().remove("chatgpt-account-id");
    let response = app.clone().oneshot(enroll).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert!(
        !body
            .windows("upstream-private".len())
            .any(|v| v == b"upstream-private")
    );
    let body: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let continuation = body["remote_control_token"].as_str().unwrap().to_string();
    assert!(continuation.starts_with("la_rc_"));
    assert_eq!(body["future"]["preserved"], true);

    for (method, path, authorization, body) in [
        (
            Method::GET,
            "/api/services/codex/backend-api/wham/remote/control/environments/environment-private/clients",
            primary.as_str(),
            "",
        ),
        (
            Method::DELETE,
            "/api/services/codex/backend-api/wham/remote/control/environments/environment-private/clients/client-private",
            primary.as_str(),
            "",
        ),
        (
            Method::POST,
            "/api/services/codex/backend-api/wham/remote/control/server/pair",
            continuation.as_str(),
            r#"{"manual_code":false}"#,
        ),
        (
            Method::POST,
            "/api/services/codex/backend-api/wham/remote/control/server/pair/status",
            continuation.as_str(),
            r#"{"pairing_code":"pair-status-private"}"#,
        ),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(path)
                    .header("authorization", format!("Bearer {authorization}"))
                    .header("x-codex-installation-id", "installation-private")
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK, "{path}");
        response.into_body().collect().await.unwrap();
    }
    let refresh = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/services/codex/backend-api/wham/remote/control/server/refresh")
                .header("authorization", format!("Bearer {primary}"))
                .body(Body::from(
                    r#"{"server_id":"server-private","installation_id":"installation-private"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(refresh.status(), StatusCode::OK);
    let refresh: serde_json::Value =
        serde_json::from_slice(&refresh.into_body().collect().await.unwrap().to_bytes()).unwrap();
    let refreshed_continuation = refresh["remote_control_token"]
        .as_str()
        .unwrap()
        .to_string();
    assert!(refreshed_continuation.starts_with("la_rc_"));

    // Reopen all Router-side state to prove that an active remote-control
    // continuation does not depend on process memory.
    drop(app);
    drop(state);
    let mut restarted = crate::app_state::AppState::for_tests(data.path());
    restarted.subscription_base_url = Some(origin);
    let restarted_app = crate::server_router::router_for_listener(
        restarted.clone(),
        &config,
        crate::route_contract::ListenerKind::Combined,
    )
    .layer(from_fn_with_state(
        restarted,
        crate::request_log::log_http_exchange,
    ));
    let pair_body = Bytes::from_static(br#"{"manual_code":false}"#);
    let pair = Request::builder()
        .method(Method::POST)
        .uri("/api/services/codex/backend-api/wham/remote/control/server/pair")
        .header("authorization", format!("Bearer {refreshed_continuation}"))
        .header("x-codex-installation-id", "installation-private")
        .body(Body::from(pair_body.clone()))
        .unwrap();
    let response = restarted_app.oneshot(pair).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let captured = captured.lock().unwrap();
    assert_eq!(captured.len(), 7);
    assert_eq!(captured[0].0, "/wham/remote/control/server/enroll");
    assert_eq!(captured[0].1["authorization"], "Bearer primary-private");
    assert_eq!(
        captured[0].1["chatgpt-account-id"],
        "account-upstream-private"
    );
    assert_eq!(captured[0].2, enroll_body);
    let first_pair = captured
        .iter()
        .find(|(path, headers, _)| {
            path == "/wham/remote/control/server/pair"
                && headers["authorization"] == "Bearer upstream-private"
        })
        .unwrap();
    assert_eq!(first_pair.0, "/wham/remote/control/server/pair");
    assert_eq!(first_pair.1["authorization"], "Bearer upstream-private");
    assert_eq!(
        first_pair.1["x-codex-installation-id"],
        "installation-private"
    );
    assert_eq!(first_pair.2, pair_body);
    for (_, headers, _) in captured.iter() {
        let authorization = headers["authorization"].to_str().unwrap();
        assert!(!authorization.contains("at-"));
        assert!(!authorization.contains("la_rc_"));
    }
    drop(captured);
    let logs = request_logs(data.path());
    for private in [
        "name-private",
        "installation-private",
        "server-private",
        "environment-private",
        "upstream-private",
        "pairing-private",
        "pair-status-private",
        "client-private",
        "remote-control-response-private",
        "upstream-refreshed-private",
        "primary-private",
        "account-upstream-private",
        &continuation,
        &refreshed_continuation,
    ] {
        assert!(
            !logs.contains(private),
            "request log leaked {private}: {logs}"
        );
    }
    assert!(logs.contains("/api/services/codex/backend-api/wham/remote/control/server/enroll"));
    assert!(logs.contains("/api/services/codex/backend-api/wham/remote/control/server/pair"));
    assert!(logs.contains("/api/services/codex/backend-api/wham/remote/control/server/refresh"));
    assert!(logs.contains(
        "/api/services/codex/backend-api/wham/remote/control/environments/{environment_id}/clients"
    ));
    assert!(logs.contains(
        "/api/services/codex/backend-api/wham/remote/control/environments/{environment_id}/clients/{client_id}"
    ));
    server.abort();
}

#[tokio::test]
async fn refresh_rejects_mismatched_identity_then_rotates_without_replaying() {
    use std::sync::atomic::{AtomicUsize, Ordering};

    let calls = Arc::new(AtomicUsize::new(0));
    let upstream_calls = Arc::clone(&calls);
    let upstream = axum::Router::new().fallback(move |request: Request| {
        let calls = Arc::clone(&upstream_calls);
        async move {
            assert_eq!(request.method(), Method::POST);
            assert_eq!(request.uri().path(), "/wham/remote/control/server/refresh");
            assert_eq!(request.headers()["authorization"], "Bearer primary-private");
            let call = calls.fetch_add(1, Ordering::Relaxed);
            let environment = if call == 0 {
                "environment-from-another-enrollment"
            } else {
                "environment-private"
            };
            axum::Json(serde_json::json!({
                "server_id": "server-private",
                "environment_id": environment,
                "remote_control_token": format!("upstream-new-{call}"),
                "expires_at": "2099-01-02T03:04:05Z"
            }))
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let codex_home = tempfile::tempdir().unwrap();
    std::fs::write(
        codex_home.path().join("auth.json"),
        r#"{"tokens":{"access_token":"primary-private","account_id":"account-upstream-private"}}"#,
    )
    .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(
        crate::subscription::SubscriptionProvider::Codex,
        codex_home.path(),
    );
    let mut state = crate::app_state::AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_base_url = Some(origin.clone());
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    let primary = crate::model_routing::tests::bound_client_token(
        &state,
        crate::clients::ClientKind::Codex,
        None,
    );
    let primary = crate::token::codex_token_alias(&primary).unwrap();
    let old = state
        .provider_store
        .codex_remote_control()
        .issue(&EnrollmentRecord {
            identity: EnrollmentIdentity {
                principal_id: "primary".into(),
                account_name: "primary".into(),
                server_id: "server-private".into(),
                environment_id: "environment-private".into(),
                installation_id: "installation-private".into(),
            },
            upstream_token: "upstream-old".into(),
            upstream_base_url: origin,
            expires_at: 4_070_995_200,
        })
        .unwrap();
    let refresh_body = Bytes::from_static(
        br#"{"server_id":"server-private","installation_id":"installation-private"}"#,
    );
    let refresh_request = || {
        Request::builder()
            .method(Method::POST)
            .uri("/api/services/codex/backend-api/wham/remote/control/server/refresh")
            .header("authorization", format!("Bearer {primary}"))
            .body(Body::from(refresh_body.clone()))
            .unwrap()
    };

    let mismatched =
        crate::native_service::codex_backend(State(state.clone()), refresh_request()).await;
    assert_eq!(mismatched.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert!(
        state
            .provider_store
            .codex_remote_control()
            .resolve(&old, chrono::Utc::now().timestamp())
            .unwrap()
            .is_some()
    );

    let refreshed =
        crate::native_service::codex_backend(State(state.clone()), refresh_request()).await;
    assert_eq!(refreshed.status(), StatusCode::OK);
    let refreshed: serde_json::Value =
        serde_json::from_slice(&refreshed.into_body().collect().await.unwrap().to_bytes()).unwrap();
    let new = refreshed["remote_control_token"].as_str().unwrap();
    assert!(new.starts_with("la_rc_"));
    assert_ne!(new, old);
    assert!(
        state
            .provider_store
            .codex_remote_control()
            .resolve(&old, chrono::Utc::now().timestamp())
            .unwrap()
            .is_none()
    );
    assert_eq!(
        state
            .provider_store
            .codex_remote_control()
            .resolve(new, chrono::Utc::now().timestamp())
            .unwrap()
            .unwrap()
            .upstream_token,
        "upstream-new-1"
    );

    let rejected_old = Request::builder()
        .method(Method::POST)
        .uri("/api/services/codex/backend-api/wham/remote/control/server/pair/status")
        .header("authorization", format!("Bearer {old}"))
        .body(Body::from(r#"{"pairing_code":"private"}"#))
        .unwrap();
    let rejected_old = crate::native_service::codex_backend(State(state), rejected_old).await;
    assert_eq!(rejected_old.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(calls.load(Ordering::Relaxed), 2);
    server.abort();
}

#[tokio::test]
async fn continuation_websocket_substitutes_auth_and_preserves_messages() {
    use axum::extract::WebSocketUpgrade;
    use axum::extract::ws::Message;
    use axum::middleware::from_fn_with_state;
    use axum::routing::get;
    use futures_util::{SinkExt as _, StreamExt as _};
    use lino_arguments::Parser as _;
    use tokio_tungstenite::tungstenite::client::IntoClientRequest as _;

    let upstream_headers = Arc::new(Mutex::new(None::<HeaderMap>));
    let captured_headers = Arc::clone(&upstream_headers);
    let upstream = axum::Router::new().route(
        "/wham/remote/control/server",
        get(move |headers: HeaderMap, upgrade: WebSocketUpgrade| {
            *captured_headers.lock().unwrap() = Some(headers);
            async move {
                upgrade.on_upgrade(|mut socket| async move {
                    while let Some(Ok(message)) = socket.recv().await {
                        let closes = matches!(message, Message::Close(_));
                        if socket.send(message).await.is_err() || closes {
                            break;
                        }
                    }
                })
            }
        }),
    );
    let upstream_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_origin = format!("http://{}", upstream_listener.local_addr().unwrap());
    let upstream_server =
        tokio::spawn(async move { axum::serve(upstream_listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let state = crate::app_state::AppState::for_tests(data.path());
    let continuation = state
        .provider_store
        .codex_remote_control()
        .issue(&EnrollmentRecord {
            identity: EnrollmentIdentity {
                principal_id: "principal-private".into(),
                account_name: "account-private".into(),
                server_id: "server-private".into(),
                environment_id: "environment-private".into(),
                installation_id: "installation-private".into(),
            },
            upstream_token: "upstream-private".into(),
            upstream_base_url: upstream_origin,
            expires_at: 4_070_995_200,
        })
        .unwrap();
    let data_dir = data.path().to_str().unwrap();
    let config = crate::cli::Cli::try_parse_from([
        "router",
        "--token-secret",
        "test-secret",
        "--data-dir",
        data_dir,
        "--upstream-provider",
        "codex",
        "--disable-login-api",
    ])
    .unwrap()
    .into_config()
    .unwrap();
    let router = crate::server_router::router_for_listener(
        state.clone(),
        &config,
        crate::route_contract::ListenerKind::Combined,
    )
    .layer(from_fn_with_state(
        state.clone(),
        crate::request_log::log_http_exchange,
    ));
    let router_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let router_address = router_listener.local_addr().unwrap();
    let router_server =
        tokio::spawn(async move { axum::serve(router_listener, router).await.unwrap() });

    let mut request = format!(
        "ws://{router_address}/api/services/codex/backend-api/wham/remote/control/server?cursor=private"
    )
    .into_client_request()
    .unwrap();
    request.headers_mut().insert(
        "authorization",
        format!("Bearer {continuation}").parse().unwrap(),
    );
    request
        .headers_mut()
        .insert("x-codex-server-id", "server-private".parse().unwrap());
    request.headers_mut().insert(
        "x-codex-installation-id",
        "installation-private".parse().unwrap(),
    );
    request
        .headers_mut()
        .insert("x-codex-protocol-version", "3".parse().unwrap());
    request.headers_mut().insert(
        "x-codex-subscribe-cursor",
        "cursor-private".parse().unwrap(),
    );
    let (mut socket, _) = tokio_tungstenite::connect_async(request).await.unwrap();
    for message in [
        tokio_tungstenite::tungstenite::Message::Text("json-rpc-private".into()),
        tokio_tungstenite::tungstenite::Message::Binary(vec![0, 1, 2, 255].into()),
    ] {
        socket.send(message.clone()).await.unwrap();
        let echoed = socket.next().await.unwrap().unwrap();
        assert_eq!(echoed, message);
    }
    socket
        .send(tokio_tungstenite::tungstenite::Message::Ping(
            vec![7, 8].into(),
        ))
        .await
        .unwrap();
    assert_eq!(
        socket.next().await.unwrap().unwrap(),
        tokio_tungstenite::tungstenite::Message::Pong(vec![7, 8].into())
    );
    socket.close(None).await.unwrap();

    let headers = upstream_headers.lock().unwrap().take().unwrap();
    assert_eq!(headers["authorization"], "Bearer upstream-private");
    assert_eq!(headers["x-codex-server-id"], "server-private");
    assert_eq!(headers["x-codex-installation-id"], "installation-private");
    assert_eq!(headers["x-codex-protocol-version"], "3");
    assert_eq!(headers["x-codex-subscribe-cursor"], "cursor-private");
    assert_eq!(headers.get_all("sec-websocket-key").iter().count(), 1);
    assert_eq!(headers.get_all("sec-websocket-version").iter().count(), 1);
    assert!(
        !headers["authorization"]
            .to_str()
            .unwrap()
            .contains("la_rc_")
    );
    drop(headers);
    let request_log =
        std::fs::read_to_string(data.path().join("requests/unauthenticated/requests.lino"))
            .unwrap();
    assert!(request_log.contains("/api/services/codex/backend-api/wham/remote/control/server"));
    for private in [
        "cursor=private",
        "cursor-private",
        "server-private",
        "installation-private",
        "principal-private",
        "account-private",
        "upstream-private",
        &continuation,
    ] {
        assert!(
            !request_log.contains(private),
            "request log leaked {private}: {request_log}"
        );
    }
    router_server.abort();
    upstream_server.abort();
}
