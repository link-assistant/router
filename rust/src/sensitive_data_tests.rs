use super::*;
use axum::{Json, Router};
use flate2::{Compression, write::GzEncoder};
use serde_json::json;
use std::io::Write as _;
use tokio::net::TcpListener;

const TOKEN: &str = "fixture_loopback_scanner_credential";
const PERSON: &str = "Synthetic \"Person\"";
const MARKER: &str = "[[Router_00000000000000000000000000000000_Person_1]]";

async fn echo_scan(headers: HeaderMap, Json(value): Json<Value>) -> (StatusCode, Json<Value>) {
    let expected = format!("Bearer {TOKEN}");
    if headers.get("authorization").and_then(|value| value.to_str().ok()) != Some(expected.as_str())
    {
        return (StatusCode::UNAUTHORIZED, Json(Value::Null));
    }
    let mut document = value["document"].clone();
    document["body"]["input"] = json!(MARKER);
    document["headers"][0][1] = json!(MARKER);
    document["query"][0][1] = json!(MARKER);
    (
        StatusCode::OK,
        Json(json!({"document": document, "replacements": [[MARKER, PERSON]]})),
    )
}

async fn scanner_stub() -> (String, tokio::task::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let endpoint = format!("http://{}/scan", listener.local_addr().unwrap());
    let router = Router::new().route("/scan", axum::routing::post(echo_scan));
    let task = tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });
    (endpoint, task)
}

fn inference(encoding: &str, body: impl Into<Body>) -> Request {
    Request::builder()
        .method("POST")
        .uri("/api/services/openai/v1/responses?tag=private")
        .header("authorization", "Bearer fixture-client")
        .header("content-type", "application/json")
        .header("content-encoding", encoding)
        .header("x-application-value", "private")
        .header(SESSION, "fixture")
        .body(body.into())
        .unwrap()
}

#[tokio::test]
async fn anonymizes_request_metadata_and_restores_json_after_network_rechunking() {
    let (endpoint, task) = scanner_stub().await;
    let scanner = Scanner::new(&endpoint, TOKEN.to_owned(), "full").unwrap();
    let mut gzip = GzEncoder::new(Vec::new(), Compression::default());
    gzip.write_all(serde_json::to_string(&json!({"input": PERSON})).unwrap().as_bytes())
        .unwrap();
    let request = inference("gzip", gzip.finish().unwrap());
    let session = scanner.session_key(request.headers()).unwrap();
    let (protected, replacements) = protect(request, &scanner, 8192, session).await.unwrap();
    assert_eq!(protected.headers()["x-application-value"], MARKER);
    assert_eq!(protected.headers()["authorization"], "Bearer fixture-client");
    assert!(protected.headers().get("content-encoding").is_none());
    assert!(protected.headers().get(SESSION).is_none());
    let pairs: Vec<_> =
        url::form_urlencoded::parse(protected.uri().query().unwrap().as_bytes()).collect();
    assert_eq!(pairs[0].0, "tag");
    assert_eq!(pairs[0].1, MARKER);
    let input = to_bytes(protected.into_body(), 8192).await.unwrap();
    assert_eq!(serde_json::from_slice::<Value>(&input).unwrap()["input"], MARKER);

    let event = format!("data: {{\"delta\":\"{MARKER}\"}}\n\ndata: [DONE]\n\n");
    let (first, second) = event.as_bytes().split_at(28);
    let chunks = [first, second].map(|part| Ok::<_, std::io::Error>(Bytes::copy_from_slice(part)));
    let response = Response::builder()
        .header("content-type", "text/event-stream")
        .header("content-length", event.len())
        .body(Body::from_stream(futures_util::stream::iter(chunks)))
        .unwrap();
    let restored = response::restore(response, replacements);
    assert!(restored.headers().get("content-length").is_none());
    let output = to_bytes(restored.into_body(), 8192).await.unwrap();
    assert_eq!(
        std::str::from_utf8(&output).unwrap(),
        format!("data: {{\"delta\":{}}}\n\ndata: [DONE]\n\n", json!(PERSON))
    );
    task.abort();
}

#[tokio::test]
async fn refuses_opaque_input_and_a_rejected_loopback_exchange() {
    let (endpoint, task) = scanner_stub().await;
    let scanner = Scanner::new(&endpoint, "fixture_incorrect_scanner_credential".to_owned(), "full")
        .unwrap();
    let opaque = inference("identity", r#"{"image_url":"https://example.test/image"}"#);
    assert!(matches!(
        protect(opaque, &scanner, 8192, None).await,
        Err(Failure::UnsupportedBody)
    ));
    let rejected = inference("identity", r#"{"input":"private"}"#);
    assert!(matches!(
        protect(rejected, &scanner, 8192, None).await,
        Err(Failure::Unavailable)
    ));
    task.abort();
}

#[test]
fn caller_credentials_and_session_ids_separate_restore_state() {
    let scanner = Scanner::new("http://127.0.0.1:8081/scan", TOKEN.to_owned(), "full").unwrap();
    let request = inference("identity", "");
    let mut headers = request.headers().clone();
    let original = scanner.session_key(&headers).unwrap().unwrap();
    assert_eq!(original.len(), 64);
    headers.insert("authorization", HeaderValue::from_static("Bearer other-client"));
    assert_ne!(scanner.session_key(&headers).unwrap().unwrap(), original);
    headers.insert("authorization", HeaderValue::from_static("Bearer fixture-client"));
    headers.insert(SESSION, HeaderValue::from_static("another-session"));
    assert_ne!(scanner.session_key(&headers).unwrap().unwrap(), original);
    headers.append(SESSION, HeaderValue::from_static("second-value"));
    assert!(matches!(scanner.session_key(&headers), Err(Failure::InvalidSession)));
    assert!(Scanner::new("http://example.test:8081/scan", TOKEN.to_owned(), "full").is_none());
}
