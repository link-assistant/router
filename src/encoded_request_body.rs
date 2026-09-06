//! Authenticated, bounded JSON request decoding with native replay support.

use std::io::{BufReader, Cursor, Read as _};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, LazyLock};
use std::time::{Duration, Instant};

use axum::body::{Body, Bytes};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use serde_json::Value;

const MAX_DECOMPRESSION_RATIO: usize = 200;
const ZSTD_DECODE_TIMEOUT: Duration = Duration::from_secs(15);
const ZSTD_DECODE_CHUNK_BYTES: usize = 64 * 1024;
const MAX_PARALLEL_ZSTD_DECODES: usize = 4;
static ZSTD_DECODE_SLOTS: LazyLock<Arc<tokio::sync::Semaphore>> = LazyLock::new(|| {
    let available = std::thread::available_parallelism().map_or(1, usize::from);
    Arc::new(tokio::sync::Semaphore::new(
        available.clamp(1, MAX_PARALLEL_ZSTD_DECODES),
    ))
});

struct DecodeCancellation {
    cancelled: Arc<AtomicBool>,
    armed: bool,
}

impl DecodeCancellation {
    const fn new(cancelled: Arc<AtomicBool>) -> Self {
        Self {
            cancelled,
            armed: true,
        }
    }

    const fn disarm(&mut self) {
        self.armed = false;
    }
}

impl Drop for DecodeCancellation {
    fn drop(&mut self) {
        if self.armed {
            self.cancelled.store(true, Ordering::Release);
        }
    }
}

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
        decode_zstd_async(bytes.clone(), limit).await?
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

async fn decode_zstd_async(compressed: Bytes, limit: usize) -> Result<Vec<u8>, Response> {
    let deadline = tokio::time::Instant::now() + ZSTD_DECODE_TIMEOUT;
    let permit = tokio::time::timeout_at(deadline, Arc::clone(&ZSTD_DECODE_SLOTS).acquire_owned())
        .await
        .map_err(|_| {
            request_error(
                StatusCode::REQUEST_TIMEOUT,
                "zstd request decoding timed out while waiting for bounded capacity",
            )
        })?
        .map_err(|_| {
            request_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "zstd request decoder is unavailable",
            )
        })?;
    let cancelled = Arc::new(AtomicBool::new(false));
    let mut cancellation = DecodeCancellation::new(Arc::clone(&cancelled));
    let blocking_deadline = deadline.into_std();
    let task = tokio::task::spawn_blocking(move || {
        let _permit = permit;
        decode_zstd_bounded(&compressed, limit, &cancelled, blocking_deadline)
    });
    let joined = tokio::time::timeout_at(deadline, task).await.map_err(|_| {
        request_error(
            StatusCode::REQUEST_TIMEOUT,
            "zstd request decoding timed out",
        )
    })?;
    cancellation.disarm();
    joined
        .map_err(|_| {
            request_error(
                StatusCode::BAD_REQUEST,
                "zstd request decoder did not complete",
            )
        })?
        .map_err(|message| request_error(StatusCode::BAD_REQUEST, &message))
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

#[cfg(test)]
fn decode_zstd(compressed: &[u8], limit: usize) -> Result<Vec<u8>, String> {
    let cancelled = AtomicBool::new(false);
    decode_zstd_bounded(
        compressed,
        limit,
        &cancelled,
        Instant::now() + ZSTD_DECODE_TIMEOUT,
    )
}

fn zstd_window_log(limit: usize) -> u32 {
    let log = limit
        .max(1)
        .checked_next_power_of_two()
        .map_or(usize::BITS - 1, usize::ilog2);
    // Libzstd's ordinary streaming encoder advertises a 2 MiB window even
    // for tiny inputs. Keep that interoperable floor while still reducing the
    // 128 MiB decoder default for normal Router limits.
    log.clamp(21, 31)
}

fn decode_zstd_bounded(
    compressed: &[u8],
    limit: usize,
    cancelled: &AtomicBool,
    deadline: Instant,
) -> Result<Vec<u8>, String> {
    let check_work_boundary = || {
        if cancelled.load(Ordering::Acquire) {
            Err("zstd request decoding was cancelled".to_string())
        } else if Instant::now() >= deadline {
            Err("zstd request decoding timed out".to_string())
        } else {
            Ok(())
        }
    };
    check_work_boundary()?;
    if compressed.is_empty() {
        return Err("empty zstd request body".into());
    }
    let reader = BufReader::new(Cursor::new(compressed));
    let mut decoder = zstd::stream::read::Decoder::with_buffer(reader)
        .map_err(|_| "malformed zstd request body".to_string())?
        .single_frame();
    decoder
        .window_log_max(zstd_window_log(limit))
        .map_err(|_| "zstd request body exceeds the configured window limit".to_string())?;
    let mut output = Vec::new();
    let ratio_limit = compressed.len().saturating_mul(MAX_DECOMPRESSION_RATIO);
    let mut chunk = vec![0_u8; ZSTD_DECODE_CHUNK_BYTES].into_boxed_slice();
    loop {
        check_work_boundary()?;
        let remaining = limit.saturating_add(1).saturating_sub(output.len());
        let chunk_limit = chunk.len().min(remaining);
        if chunk_limit == 0 {
            return Err("zstd request body exceeds the decompressed-body limit".into());
        }
        let read = decoder
            .read(&mut chunk[..chunk_limit])
            .map_err(|_| "malformed zstd request body".to_string())?;
        check_work_boundary()?;
        if read == 0 {
            break;
        }
        output.extend_from_slice(&chunk[..read]);
        if output.len() > limit {
            return Err("zstd request body exceeds the decompressed-body limit".into());
        }
        if output.len() > ratio_limit {
            return Err("zstd request body exceeds the decompression-ratio limit".into());
        }
    }
    check_work_boundary()?;
    decoder
        .finish_frame()
        .map_err(|_| "malformed zstd request body".to_string())?;
    let reader = decoder.finish();
    if !reader.buffer().is_empty() || reader.get_ref().position() != compressed.len() as u64 {
        return Err("zstd request body contains trailing or concatenated data".into());
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
    use std::sync::atomic::AtomicBool;

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

    #[test]
    fn zstd_decoder_observes_cancellation_and_deadline_between_chunks() {
        let encoded = zstd::encode_all(br#"{"model":"gpt-test"}"#.as_slice(), 0).unwrap();
        let cancelled = AtomicBool::new(true);
        assert_eq!(
            decode_zstd_bounded(
                &encoded,
                1024,
                &cancelled,
                std::time::Instant::now() + std::time::Duration::from_secs(1),
            )
            .unwrap_err(),
            "zstd request decoding was cancelled"
        );

        let active = AtomicBool::new(false);
        assert_eq!(
            decode_zstd_bounded(
                &encoded,
                1024,
                &active,
                std::time::Instant::now()
                    .checked_sub(std::time::Duration::from_millis(1))
                    .unwrap(),
            )
            .unwrap_err(),
            "zstd request decoding timed out"
        );
    }

    #[test]
    fn zstd_window_bound_tracks_the_configured_decoded_body_limit() {
        assert_eq!(zstd_window_log(1), 21);
        assert_eq!(zstd_window_log(64 * 1024 * 1024), 26);
        assert_eq!(zstd_window_log(500 * 1024 * 1024), 29);
        assert_eq!(zstd_window_log(usize::MAX), 31);
        assert!(ZSTD_DECODE_SLOTS.available_permits() <= MAX_PARALLEL_ZSTD_DECODES);
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
