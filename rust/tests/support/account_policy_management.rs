//! Policy endpoints use the same peer gate and failure tracker as other management routes.
use axum::body::Body;
use axum::extract::ConnectInfo;
use axum::http::{Request, StatusCode};
use link_assistant_router::app_state::AppState;
use lino_arguments::Parser as _;
use tower::ServiceExt as _;

fn request(peer: Option<&str>, path: &str, key: &str) -> Request<Body> {
    let mut request = Request::get(path)
        .header("authorization", format!("Bearer {key}"))
        .header("x-forwarded-for", "127.0.0.1")
        .body(Body::empty())
        .unwrap();
    if let Some(peer) = peer {
        request
            .extensions_mut()
            .insert(ConnectInfo(peer.parse::<std::net::SocketAddr>().unwrap()));
    }
    request
}

pub async fn assert_access_controls(mut state: AppState) {
    let mut config = link_assistant_router::cli::Cli::try_parse_from([
        "router",
        "--token-secret",
        "policy-management-fixture-secret",
    ])
    .unwrap()
    .into_config()
    .unwrap();
    let app = link_assistant_router::server_router::router(state.clone(), &config);
    let policy_path = "/api/management/accounts/primary/policy";
    for peer in [None, Some("198.51.100.10:12345")] {
        assert_eq!(
            app.clone()
                .oneshot(request(peer, policy_path, "admin-fixture"))
                .await
                .unwrap()
                .status(),
            StatusCode::FORBIDDEN
        );
    }
    // Management configuration is fixed once per instance; use a fresh tracker
    // when testing a second instance with remote administration enabled.
    state.admin = std::sync::Arc::new(link_assistant_router::admin::AdminClaim::in_memory(
        Some("admin-fixture".into()),
        std::time::Duration::from_secs(60),
    ));
    config.management.allow_remote = true;
    config.management.lockout_failures = 2;
    let app = link_assistant_router::server_router::router(state, &config);
    for (path, expected) in [
        (policy_path, StatusCode::UNAUTHORIZED),
        ("/api/management/accounts", StatusCode::TOO_MANY_REQUESTS),
    ] {
        assert_eq!(
            app.clone()
                .oneshot(request(Some("198.51.100.10:12345"), path, "client"))
                .await
                .unwrap()
                .status(),
            expected
        );
    }
    let banned = app
        .clone()
        .oneshot(request(
            Some("198.51.100.10:12345"),
            policy_path,
            "admin-fixture",
        ))
        .await
        .unwrap();
    assert_eq!(banned.status(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(banned.headers()["retry-after"], "1800");
    assert_eq!(
        app.oneshot(request(
            Some("198.51.100.11:12345"),
            policy_path,
            "admin-fixture",
        ))
        .await
        .unwrap()
        .status(),
        StatusCode::OK
    );
}
