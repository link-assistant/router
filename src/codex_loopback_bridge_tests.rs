use axum::body::{Body, Bytes};
use axum::extract::Request;
use axum::http::{HeaderMap, StatusCode};
use http_body_util::BodyExt as _;
use std::sync::{Arc, Mutex};

#[test]
fn only_external_router_origins_need_a_codex_loopback_bridge() {
    for local in [
        "http://localhost:8080",
        "https://localhost:8443",
        "http://127.0.0.1:8080",
        "http://[::1]:8080",
    ] {
        assert!(
            !crate::codex_loopback_bridge::required(local).unwrap(),
            "{local}"
        );
    }
    for external in [
        "https://router.example",
        "http://192.0.2.1:8080",
        "https://chatgpt.com.evil.example",
    ] {
        assert!(
            crate::codex_loopback_bridge::required(external).unwrap(),
            "{external}"
        );
    }
    assert!(crate::codex_loopback_bridge::required("not a URL").is_err());
}

#[tokio::test]
async fn ephemeral_bridge_preserves_http_request_and_stops_on_drop() {
    type Capture = (String, HeaderMap, Bytes);
    let capture = Arc::new(Mutex::new(None::<Capture>));
    let upstream_capture = Arc::clone(&capture);
    let upstream = axum::Router::new().fallback(move |request: Request| {
        let capture = Arc::clone(&upstream_capture);
        async move {
            let uri = request.uri().to_string();
            let headers = request.headers().clone();
            let body = request.into_body().collect().await.unwrap().to_bytes();
            *capture.lock().unwrap() = Some((uri, headers, body));
            (
                StatusCode::CREATED,
                [("x-request-id", "request-public")],
                Body::from(Bytes::from_static(b"response-private")),
            )
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_origin = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

    let bridge = crate::codex_loopback_bridge::start_ephemeral(&upstream_origin)
        .await
        .unwrap();
    assert!(bridge.backend_base_url().starts_with("http://127.0.0.1:"));
    let response = reqwest::Client::new()
        .post(format!(
            "{}/wham/remote/control/server/enroll?cursor=a%2Fb",
            bridge.backend_base_url()
        ))
        .header("authorization", "Bearer router-private")
        .header("x-codex-installation-id", "installation-private")
        .body(Bytes::from_static(b"body-private"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    assert_eq!(response.headers()["x-request-id"], "request-public");
    assert_eq!(response.bytes().await.unwrap(), "response-private");

    let captured = capture.lock().unwrap().take().unwrap();
    assert_eq!(
        captured.0,
        "/api/services/codex/backend-api/wham/remote/control/server/enroll?cursor=a%2Fb"
    );
    assert_eq!(captured.1["authorization"], "Bearer router-private");
    assert_eq!(
        captured.1["x-codex-installation-id"],
        "installation-private"
    );
    assert_eq!(captured.2, "body-private");

    let health = bridge.health_url().to_string();
    drop(bridge);
    for _ in 0..20 {
        if reqwest::get(&health).await.is_err() {
            break;
        }
        tokio::task::yield_now().await;
    }
    assert!(reqwest::get(&health).await.is_err());
    server.abort();
}
