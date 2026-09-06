//! Opaque logging contract for private Codex control-plane routes.

use super::*;
use axum::http::Method;

#[test]
fn every_private_codex_control_plane_route_is_opaque_and_uses_its_template() {
    let exact_post = [
        "/api/services/codex/backend-api/codex/analytics-events/events",
        "/api/services/codex/v1/alpha/history/v2/list_windows",
        "/api/services/codex/v1/alpha/history/v2/list_items",
        "/api/services/codex/v1/alpha/history/v2/read_item",
        "/api/services/codex/v1/alpha/history/v2/search_contents",
        "/api/services/codex/v1/alpha/notes/v2/thread_hint",
        "/api/services/codex/v1/alpha/notes/v2/list_files_by_prefix",
        "/api/services/codex/v1/alpha/notes/v2/read_file",
        "/api/services/codex/v1/alpha/notes/v2/search_contents",
        "/api/services/codex/v1/alpha/notes/v2/append_to_file",
        "/api/services/codex/v1/alpha/notes/v2/write_file",
        "/api/services/codex/backend-api/wham/remote/control/server/enroll",
        "/api/services/codex/backend-api/wham/remote/control/server/refresh",
        "/api/services/codex/backend-api/wham/remote/control/server/pair",
        "/api/services/codex/backend-api/wham/remote/control/server/pair/status",
    ];
    for path in exact_post {
        assert_eq!(
            opaque_codex_route(&Method::POST, path),
            Some(path),
            "{path}"
        );
    }

    let websocket = "/api/services/codex/backend-api/wham/remote/control/server";
    assert_eq!(opaque_codex_route(&Method::GET, websocket), Some(websocket));
    assert_eq!(
        opaque_codex_route(
            &Method::GET,
            "/api/services/codex/backend-api/wham/remote/control/environments/private-environment/clients",
        ),
        Some(
            "/api/services/codex/backend-api/wham/remote/control/environments/{environment_id}/clients",
        )
    );
    assert_eq!(
        opaque_codex_route(
            &Method::DELETE,
            "/api/services/codex/backend-api/wham/remote/control/environments/private-environment/clients/private-client",
        ),
        Some(
            "/api/services/codex/backend-api/wham/remote/control/environments/{environment_id}/clients/{client_id}",
        )
    );
}

#[test]
fn ordinary_and_wrong_method_routes_keep_the_normal_logging_policy() {
    assert_eq!(
        opaque_codex_route(&Method::POST, "/api/services/codex/v1/responses"),
        None
    );
    assert_eq!(
        opaque_codex_route(
            &Method::GET,
            "/api/services/codex/v1/alpha/notes/v2/read_file"
        ),
        None
    );
    assert_eq!(
        opaque_codex_route(
            &Method::POST,
            "/api/services/codex/backend-api/wham/remote/control/not-a-route"
        ),
        None
    );
}

#[tokio::test]
async fn analytics_relay_is_byte_transparent_but_opaque_in_production_request_logs() {
    use std::sync::{Arc, Mutex};

    use axum::body::{Body, Bytes};
    use axum::extract::Request;
    use axum::http::{HeaderMap, StatusCode};
    use axum::middleware::from_fn_with_state;
    use http_body_util::BodyExt as _;
    use lino_arguments::Parser as _;
    use tower::ServiceExt as _;

    type Capture = (String, HeaderMap, Bytes);
    let captured = Arc::new(Mutex::new(Vec::<Capture>::new()));
    let upstream_capture = Arc::clone(&captured);
    let upstream = axum::Router::new().fallback(move |request: Request| {
        let captured = Arc::clone(&upstream_capture);
        async move {
            let uri = request.uri().to_string();
            let headers = request.headers().clone();
            let body = request.into_body().collect().await.unwrap().to_bytes();
            captured.lock().unwrap().push((uri, headers, body));
            (
                StatusCode::OK,
                [
                    ("x-private-response", "analytics-response-header-private"),
                    ("x-request-id", "analytics-upstream-request-id"),
                ],
                r#"{"accepted":"analytics-response-body-private"}"#,
            )
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let data = tempfile::tempdir().unwrap();
    let codex_home = tempfile::tempdir().unwrap();
    std::fs::write(
        codex_home.path().join("auth.json"),
        r#"{"tokens":{"access_token":"analytics-upstream-private","account_id":"analytics-account-private"}}"#,
    )
    .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(
        crate::subscription::SubscriptionProvider::Codex,
        codex_home.path(),
    );
    let mut state = AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_base_url = Some(format!("{origin}/backend-api/codex"));
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];
    let token = crate::model_routing::tests::bound_client_token(
        &state,
        crate::clients::ClientKind::Codex,
        None,
    );
    let token = crate::token::codex_token_alias(&token).unwrap();
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
    .layer(from_fn_with_state(state, log_http_exchange));
    let body = Bytes::from_static(
        br#"{"events":[{"thread_id":"analytics-thread-private","tool":"analytics-tool-private","future":"analytics-unknown-private"}]}"#,
    );
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/services/codex/backend-api/codex/analytics-events/events?batch=analytics-query-private")
                .header("authorization", format!("Bearer {token}"))
                .header("content-type", "application/json")
                .header("x-analytics-private", "analytics-request-header-private")
                .body(Body::from(body.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let response_body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        status,
        StatusCode::OK,
        "{}",
        String::from_utf8_lossy(&response_body)
    );
    assert_eq!(
        response_body,
        r#"{"accepted":"analytics-response-body-private"}"#
    );

    let requests = captured.lock().unwrap();
    assert_eq!(requests.len(), 1);
    assert_eq!(
        requests[0].0,
        "/backend-api/codex/analytics-events/events?batch=analytics-query-private"
    );
    assert_eq!(requests[0].2, body);
    assert_eq!(
        requests[0].1["x-analytics-private"],
        "analytics-request-header-private"
    );
    drop(requests);

    let logs = std::fs::read_dir(data.path().join("requests"))
        .unwrap()
        .filter_map(Result::ok)
        .filter_map(|entry| std::fs::read_to_string(entry.path().join("requests.lino")).ok())
        .collect::<Vec<_>>()
        .join("\n");
    let records = logs
        .lines()
        .filter_map(crate::lino_json::decode_line)
        .collect::<Vec<_>>();
    assert_eq!(records.len(), 2, "one safe request/response pair: {logs}");
    for record in &records {
        for forbidden in [
            "headers",
            "body",
            "version",
            "token_hash",
            "token_id",
            "token_label",
            "model",
        ] {
            assert!(
                record.get(forbidden).is_none(),
                "opaque record retained {forbidden}: {record}"
            );
        }
    }
    assert!(logs.contains("/api/services/codex/backend-api/codex/analytics-events/events"));
    assert!(logs.contains("analytics-upstream-request-id"));
    for private in [
        "analytics-query-private",
        "analytics-thread-private",
        "analytics-tool-private",
        "analytics-unknown-private",
        "analytics-request-header-private",
        "analytics-response-header-private",
        "analytics-response-body-private",
        "analytics-upstream-private",
        "analytics-account-private",
    ] {
        assert!(
            !logs.contains(private),
            "request log leaked {private}: {logs}"
        );
    }
    server.abort();
}
