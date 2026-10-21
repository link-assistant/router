//! Total-deadline regression for Gonka's authenticated live catalog.

use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;

use axum::body::Body;
use axum::http::StatusCode;
use axum::response::Response;
use futures_util::StreamExt as _;

#[tokio::test]
async fn catalog_deadline_covers_a_slow_trickled_response_body() {
    let requests = Arc::new(AtomicUsize::new(0));
    let observed = Arc::clone(&requests);
    let app = axum::Router::new().route(
        "/v1/models",
        axum::routing::get(move || {
            let observed = Arc::clone(&observed);
            async move {
                observed.fetch_add(1, Ordering::SeqCst);
                let prefix = futures_util::stream::iter([Ok::<_, std::io::Error>(
                    bytes::Bytes::from_static(b"{\"data\":["),
                )]);
                let suffix = futures_util::stream::once(async {
                    tokio::time::sleep(Duration::from_secs(1)).await;
                    Ok::<_, std::io::Error>(bytes::Bytes::from_static(b"]}"))
                });
                Response::builder()
                    .status(StatusCode::OK)
                    .header("content-type", "application/json")
                    .body(Body::from_stream(prefix.chain(suffix)))
                    .unwrap()
            }
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let gonka = crate::gonka::GonkaConfig::new(
        Some("broker-secret".into()),
        Some(&base_url),
        String::new(),
    )
    .unwrap();

    assert!(
        gonka
            .refresh_catalog_with_timeout(&reqwest::Client::new(), Duration::from_millis(40))
            .await
            .is_err(),
        "the total deadline must expire after headers and a partial body"
    );
    assert_eq!(requests.load(Ordering::SeqCst), 1);
    assert!(
        gonka.live_catalog(&reqwest::Client::new()).await.is_err(),
        "a timed-out refresh must fail closed during the retry interval"
    );
    assert_eq!(requests.load(Ordering::SeqCst), 1);
    server.abort();
}
