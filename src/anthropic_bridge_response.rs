//! Response translation for the Anthropic bridge.

use axum::body::{Body, Bytes};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt as _;
use serde_json::Value;

use crate::anthropic_stream::AnthropicStreamTranslator;

use super::{anthropic_error, enforce_anthropic_stop, openai_json_to_anthropic_message};

/// Convert the `OpenAI`-dialect response produced by a delegate forwarder into
/// the Anthropic dialect.
pub async fn translate_upstream_response(
    upstream: Response,
    requested_model: &str,
    _upstream_model: &str,
    stream_requested: bool,
    stop_sequences: &[String],
) -> Response {
    let (parts, body) = upstream.into_parts();
    let status = parts.status;

    if !status.is_success() {
        let bytes = axum::body::to_bytes(body, 1024 * 1024)
            .await
            .unwrap_or_default();
        let mut response = anthropic_error(status, &bytes);
        *response.headers_mut() = parts.headers;
        response
            .headers_mut()
            .insert("content-type", HeaderValue::from_static("application/json"));
        return response;
    }

    if stream_requested {
        return anthropic_sse_response(
            body,
            requested_model,
            &parts.headers,
            stop_sequences.to_vec(),
        );
    }

    let bytes = match axum::body::to_bytes(body, 32 * 1024 * 1024).await {
        Ok(bytes) => bytes,
        Err(error) => {
            return anthropic_error(
                StatusCode::BAD_GATEWAY,
                format!("failed to read upstream body: {error}").as_bytes(),
            );
        }
    };
    let Ok(payload) = serde_json::from_slice::<Value>(&bytes) else {
        return anthropic_error(
            StatusCode::BAD_GATEWAY,
            b"Upstream returned a malformed response",
        );
    };
    let mut translated = openai_json_to_anthropic_message(&payload, requested_model);
    enforce_anthropic_stop(&mut translated, stop_sequences);
    let mut response = (StatusCode::OK, axum::Json(translated)).into_response();
    *response.headers_mut() = parts.headers;
    response
        .headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));
    response
}

/// Wrap the upstream stream in an incremental Anthropic SSE translator.
fn anthropic_sse_response(
    body: Body,
    requested_model: &str,
    upstream: &HeaderMap,
    stop_sequences: Vec<String>,
) -> Response {
    let translator =
        AnthropicStreamTranslator::new(requested_model).with_stop_sequences(stop_sequences);
    let data = body.into_data_stream();
    let stream = futures_util::stream::unfold(
        (data, translator, false),
        |(mut data, mut translator, done)| async move {
            if done {
                return None;
            }
            loop {
                match data.next().await {
                    Some(Ok(chunk)) => {
                        let frames = translator.push(&chunk);
                        if frames.is_empty() {
                            continue;
                        }
                        return Some((
                            Ok::<Bytes, std::io::Error>(Bytes::from(frames.concat())),
                            (data, translator, false),
                        ));
                    }
                    Some(Err(error)) => {
                        return Some((Err(std::io::Error::other(error)), (data, translator, true)));
                    }
                    None => {
                        let frames = translator.finish();
                        return Some((Ok(Bytes::from(frames.concat())), (data, translator, true)));
                    }
                }
            }
        },
    );

    let mut response = Response::new(Body::from_stream(stream));
    *response.status_mut() = StatusCode::OK;
    *response.headers_mut() = crate::proxy::relay_response_headers(upstream);
    response.headers_mut().insert(
        "content-type",
        HeaderValue::from_static("text/event-stream"),
    );
    response
        .headers_mut()
        .insert("cache-control", HeaderValue::from_static("no-cache"));
    response
}
