//! Authenticated, bounded JSON request decoding with native replay support.

use std::io::{BufReader, Cursor, Read as _};

use axum::body::{Body, Bytes};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use serde_json::Value;

const MAX_DECOMPRESSION_RATIO: usize = 200;

/// Original native bytes plus the value they decoded to.
///
/// When routing leaves the value unchanged, forwarding reuses the exact input
/// bytes. If routing must rewrite it, the replacement is encoded with the same
/// supported content encoding instead of pairing compressed headers with JSON.
pub struct NativeBody {
    bytes: Bytes,
    original: Value,
    zstd: bool,
}

impl NativeBody {
    pub fn encode(self, value: &Value) -> Result<Vec<u8>, String> {
        if *value == self.original {
            return Ok(self.bytes.to_vec());
        }
        let json = serde_json::to_vec(value)
            .map_err(|error| format!("failed to serialize request JSON: {error}"))?;
        if self.zstd {
            zstd::encode_all(json.as_slice(), 0)
                .map_err(|error| format!("failed to encode zstd request: {error}"))
        } else {
            Ok(json)
        }
    }
}

pub struct ParsedBody {
    pub value: Value,
    pub native: NativeBody,
}

/// Read one native Responses body after the caller has authenticated it.
pub async fn read_native_json(
    headers: &HeaderMap,
    body: Body,
    limit: usize,
    zstd_allowed: bool,
) -> Result<ParsedBody, Response> {
    let zstd = match content_encoding(headers)? {
        Encoding::Identity => false,
        Encoding::Zstd => true,
    };
    if zstd && !zstd_allowed {
        return Err(request_error(
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            "zstd request bodies are supported only on the native Codex Responses route",
        ));
    }
    let bytes = axum::body::to_bytes(body, limit).await.map_err(|_| {
        request_error(
            StatusCode::PAYLOAD_TOO_LARGE,
            "request body exceeds the encoded-body limit",
        )
    })?;
    let decoded = if zstd {
        let compressed = bytes.clone();
        tokio::task::spawn_blocking(move || decode_zstd(&compressed, limit))
            .await
            .map_err(|_| {
                request_error(
                    StatusCode::BAD_REQUEST,
                    "zstd request decoder did not complete",
                )
            })?
            .map_err(|message| request_error(StatusCode::BAD_REQUEST, &message))?
    } else {
        bytes.to_vec()
    };
    let value: Value = serde_json::from_slice(&decoded).map_err(|error| {
        request_error(
            StatusCode::BAD_REQUEST,
            &format!("invalid JSON request body: {error}"),
        )
    })?;
    Ok(ParsedBody {
        value: value.clone(),
        native: NativeBody {
            bytes,
            original: value,
            zstd,
        },
    })
}

#[derive(Clone, Copy)]
enum Encoding {
    Identity,
    Zstd,
}

fn content_encoding(headers: &HeaderMap) -> Result<Encoding, Response> {
    let mut encodings = Vec::new();
    for value in headers.get_all("content-encoding") {
        let value = value.to_str().map_err(|_| {
            request_error(
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                "request content encoding is not valid ASCII",
            )
        })?;
        encodings.extend(
            value
                .split(',')
                .map(str::trim)
                .filter(|value| !value.is_empty()),
        );
    }
    match encodings.as_slice() {
        [] => Ok(Encoding::Identity),
        [value] if value.eq_ignore_ascii_case("identity") => Ok(Encoding::Identity),
        [value] if value.eq_ignore_ascii_case("zstd") => Ok(Encoding::Zstd),
        _ => Err(request_error(
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            "unsupported or stacked request content encoding",
        )),
    }
}

fn decode_zstd(compressed: &[u8], limit: usize) -> Result<Vec<u8>, String> {
    if compressed.is_empty() {
        return Err("empty zstd request body".into());
    }
    let reader = BufReader::new(Cursor::new(compressed));
    let mut decoder = zstd::stream::read::Decoder::with_buffer(reader)
        .map_err(|_| "malformed zstd request body".to_string())?
        .single_frame();
    let mut output = Vec::new();
    decoder
        .by_ref()
        .take(limit.saturating_add(1) as u64)
        .read_to_end(&mut output)
        .map_err(|_| "malformed zstd request body".to_string())?;
    if output.len() > limit {
        return Err("zstd request body exceeds the decompressed-body limit".into());
    }
    decoder
        .finish_frame()
        .map_err(|_| "malformed zstd request body".to_string())?;
    let reader = decoder.finish();
    if !reader.buffer().is_empty() || reader.get_ref().position() != compressed.len() as u64 {
        return Err("zstd request body contains trailing or concatenated data".into());
    }
    if output.len() > compressed.len().saturating_mul(MAX_DECOMPRESSION_RATIO) {
        return Err("zstd request body exceeds the decompression-ratio limit".into());
    }
    Ok(output)
}

fn request_error(status: StatusCode, message: &str) -> Response {
    crate::api_error::error_response_for_surface(
        crate::metrics::Surface::OpenAIResponses,
        status,
        "invalid_request_error",
        message,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bounded_single_zstd_frame_round_trips() {
        let json = br#"{"model":"gpt-test","input":"hello"}"#;
        let encoded = zstd::encode_all(json.as_slice(), 0).unwrap();
        assert_eq!(decode_zstd(&encoded, 1024).unwrap(), json);
    }

    #[test]
    fn malformed_oversized_and_concatenated_zstd_fail_closed() {
        assert!(decode_zstd(b"not zstd", 1024).is_err());
        let encoded = zstd::encode_all(&b"a".repeat(2048)[..], 0).unwrap();
        assert!(decode_zstd(&encoded, 1024).is_err());
        let first = zstd::encode_all(b"{}".as_slice(), 0).unwrap();
        let second = zstd::encode_all(b"[]".as_slice(), 0).unwrap();
        assert!(decode_zstd(&[first, second].concat(), 1024).is_err());
        let ratio_bomb = zstd::encode_all(&b"a".repeat(10_000)[..], 0).unwrap();
        assert!(decode_zstd(&ratio_bomb, 20_000).is_err());
    }

    #[tokio::test]
    async fn native_bytes_replay_exactly_and_rewrites_keep_zstd() {
        let source = br#"{ "model" : "gpt-test", "input" : "hello" }"#;
        let encoded = zstd::encode_all(source.as_slice(), 0).unwrap();
        let headers =
            HeaderMap::from_iter([("content-encoding".parse().unwrap(), "zstd".parse().unwrap())]);
        let parsed = read_native_json(&headers, Body::from(encoded.clone()), 1024, true)
            .await
            .unwrap();
        assert_eq!(parsed.native.encode(&parsed.value).unwrap(), encoded);

        let parsed = read_native_json(&headers, Body::from(encoded), 1024, true)
            .await
            .unwrap();
        let mut changed = parsed.value;
        changed["model"] = Value::String("rewritten".into());
        let rewritten = parsed.native.encode(&changed).unwrap();
        let decoded = decode_zstd(&rewritten, 1024).unwrap();
        assert_eq!(serde_json::from_slice::<Value>(&decoded).unwrap(), changed);
    }

    #[tokio::test]
    async fn responses_handler_authenticates_before_decoding() {
        let data = tempfile::tempdir().unwrap();
        let state = crate::app_state::AppState::for_tests(data.path());
        let request = axum::http::Request::builder()
            .uri("/api/services/codex/v1/responses")
            .header("content-encoding", "zstd")
            .body(Body::from("not-zstd"))
            .unwrap();
        let response = crate::proxy::openai_responses_route(
            axum::extract::State(state),
            axum::extract::OriginalUri(request.uri().clone()),
            request,
        )
        .await;
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn native_codex_replays_the_exact_zstd_body_upstream() {
        use http_body_util::BodyExt as _;
        use std::sync::{Arc, Mutex};

        let captured = Arc::new(Mutex::new(None));
        let server_capture = Arc::clone(&captured);
        let upstream = axum::Router::new().fallback(move |request: axum::extract::Request| {
            let captured = Arc::clone(&server_capture);
            async move {
                let headers = request.headers().clone();
                let body = request.into_body().collect().await.unwrap().to_bytes();
                *captured.lock().unwrap() = Some((headers, body));
                (
                    StatusCode::OK,
                    [("content-type", "application/json")],
                    r#"{"id":"resp_zstd","status":"completed","output":[]}"#,
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
            r#"{"tokens":{"access_token":"upstream","account_id":"account-42"}}"#,
        )
        .unwrap();
        let reader = crate::subscription::SubscriptionReader::new(
            crate::subscription::SubscriptionProvider::Codex,
            codex_home.path(),
        );
        let mut state = crate::app_state::AppState::for_tests(data.path());
        state.upstream_provider = crate::config::UpstreamProvider::Codex;
        state.subscription_base_url = Some(origin);
        state.subscription_reader = Some(reader.clone());
        state.subscription_readers = vec![reader];
        let token = crate::model_routing::tests::bound_client_token(
            &state,
            crate::clients::ClientKind::Codex,
            None,
        );
        let source = br#"{ "model":"gpt-live", "input":"hello", "store":false }"#;
        let encoded = zstd::encode_all(source.as_slice(), 0).unwrap();
        let request = axum::http::Request::builder()
            .uri("/api/services/codex/v1/responses")
            .header("authorization", format!("Bearer {token}"))
            .header("content-type", "application/json")
            .header("content-encoding", "zstd")
            .header("user-agent", "codex_exec/0.153.4")
            .header("originator", "codex_exec")
            .header("x-codex-turn-metadata", "fixture-turn")
            .body(Body::from(encoded.clone()))
            .unwrap();
        let response = crate::proxy::openai_responses_route(
            axum::extract::State(state),
            axum::extract::OriginalUri(request.uri().clone()),
            request,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let (headers, body) = captured.lock().unwrap().take().unwrap();
        assert_eq!(headers["content-encoding"], "zstd");
        assert_eq!(body.as_ref(), encoded.as_slice());
        server.abort();
    }
}
