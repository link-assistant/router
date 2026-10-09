//! Rewrite model metadata after the provider's response validation and translation.
use axum::body::Body;
use axum::response::Response;
use bytes::Bytes;
use futures_util::StreamExt;
use serde_json::Value;

const MAX_RESPONSE_BYTES: usize = 32 * 1024 * 1024;
const MAX_EVENT_BYTES: usize = 1024 * 1024;

pub fn rewrite_value(value: &mut Value, upstream: &str, visible: &str) {
    for pointer in [
        "/model",
        "/message/model",
        "/response/model",
        "/modelVersion",
        "/response/modelVersion",
    ] {
        if let Some(model) = value.pointer_mut(pointer)
            && (model.as_str() == Some(upstream)
                || upstream
                    .strip_prefix("models/")
                    .is_some_and(|id| model.as_str() == Some(id)))
        {
            *model = Value::String(visible.to_string());
        }
    }
}

pub async fn rewrite(response: Response, upstream: &str, visible: &str) -> Response {
    if !response.status().is_success() {
        return response;
    }
    let streamed = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.contains("text/event-stream"));
    let (mut parts, body) = response.into_parts();
    parts.headers.remove("content-length");
    parts.headers.remove("etag");
    if parts
        .headers
        .get("content-encoding")
        .is_some_and(|v| v != "identity")
    {
        return crate::proxy::error_response(
            axum::http::StatusCode::BAD_GATEWAY,
            "routing_policy_error",
            "upstream compression prevents model alias rewriting",
        );
    }
    if !streamed {
        let bytes = match axum::body::to_bytes(body, MAX_RESPONSE_BYTES).await {
            Ok(bytes) => bytes,
            Err(error) => {
                return crate::proxy::error_response(
                    axum::http::StatusCode::BAD_GATEWAY,
                    "routing_policy_error",
                    &error.to_string(),
                );
            }
        };
        let bytes = if let Ok(mut value) = serde_json::from_slice::<Value>(&bytes) {
            rewrite_value(&mut value, upstream, visible);
            serde_json::to_vec(&value).map_or(bytes, Bytes::from)
        } else {
            bytes
        };
        return Response::from_parts(parts, Body::from(bytes));
    }
    let upstream = upstream.to_string();
    let visible = visible.to_string();
    let mut buffer = Vec::new();
    // An explicit EOF item preserves trailing bytes even when the vendor omits
    // the final separator. Bound each pending event, rather than a whole chunk.
    let chunks = body
        .into_data_stream()
        .map(|item| item.map(Some).map_err(std::io::Error::other))
        .chain(futures_util::stream::once(async { Ok(None) }));
    let stream = chunks.map(move |chunk| {
        let mut output = String::new();
        if let Some(chunk) = chunk? {
            for piece in chunk.chunks(16 * 1024) {
                for block in crate::sse::push_blocks(&mut buffer, piece) {
                    if block.len() > MAX_EVENT_BYTES {
                        return Err(std::io::Error::other(
                            "model alias SSE event exceeded 1 MiB",
                        ));
                    }
                    output.push_str(&rewrite_block(&block, &upstream, &visible));
                    output.push_str("\n\n");
                }
                if buffer.len() > MAX_EVENT_BYTES {
                    return Err(std::io::Error::other(
                        "model alias SSE buffer exceeded 1 MiB",
                    ));
                }
            }
        } else if !buffer.is_empty() {
            let block = std::str::from_utf8(&buffer).map_err(std::io::Error::other)?;
            output.push_str(&rewrite_block(block, &upstream, &visible));
            buffer.clear();
        }
        Ok::<_, std::io::Error>(Bytes::from(output))
    });
    Response::from_parts(parts, Body::from_stream(stream))
}

fn rewrite_block(block: &str, upstream: &str, visible: &str) -> String {
    let data = block
        .lines()
        .filter_map(|line| line.strip_prefix("data:"))
        .map(str::trim_start)
        .collect::<Vec<_>>()
        .join("\n");
    let Ok(mut value) = serde_json::from_str::<Value>(&data) else {
        return block.to_string();
    };
    rewrite_value(&mut value, upstream, visible);
    let mut emitted = false;
    block
        .lines()
        .filter_map(|line| {
            if line.starts_with("data:") {
                if emitted {
                    None
                } else {
                    emitted = true;
                    Some(format!("data: {value}"))
                }
            } else {
                Some(line.to_string())
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn sse_rewriting_handles_fragments_multiline_data_and_unterminated_tail() {
        // Multiline JSON, UTF-8 content and an unterminated final event, split into tiny chunks.
        let source = "event: message_start\r\ndata: {\"message\":\r\ndata: {\"model\":\"native\",\"text\":\"é native\"}}\r\n\r\ndata: {\"model\":\"native\"}";
        let split = source
            .as_bytes()
            .chunks(3)
            .map(|b| Ok::<_, std::io::Error>(bytes::Bytes::copy_from_slice(b)))
            .collect::<Vec<_>>();
        let response = Response::builder()
            .header("content-type", "text/event-stream")
            .body(Body::from_stream(futures_util::stream::iter(split)))
            .unwrap();
        let result = crate::account_policy_response::rewrite(response, "native", "friendly").await;
        let bytes = axum::body::to_bytes(result.into_body(), 4096)
            .await
            .unwrap();
        let output = std::str::from_utf8(&bytes).unwrap();
        assert_eq!(output.matches("friendly").count(), 2, "{output}");
    }
}
