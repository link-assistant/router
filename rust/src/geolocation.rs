//! Explicit location metadata policy; transport IPs and account settings are separate.

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, Method, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use serde_json::Value;

pub const OPT_IN: &str = "x-router-share-geolocation";

pub fn shares_geolocation(headers: &HeaderMap) -> bool {
    let all = headers.get_all(OPT_IN);
    let mut values = all.iter();
    values.next().is_some_and(|value| value.as_bytes() == b"true")
        && values.next().is_none()
}

pub fn is_geolocation_header(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    let name = name.as_str();
    name.starts_with("x-vercel-ip-")
        || name.starts_with("x-geo-")
        || name.starts_with("x-geolocation-")
        || matches!(
            name,
            "cf-ipcountry"
                | "cf-ipcity"
                | "cf-ipcontinent"
                | "cf-iplatitude"
                | "cf-iplongitude"
                | "cf-ipregion"
                | "cf-ipregion-code"
                | "cf-iptimezone"
                | "cf-ippostal-code"
                | "cf-region"
                | "cf-region-code"
                | "cf-metro-code"
                | "cf-postal-code"
                | "cf-timezone"
                | "cloudfront-viewer-country"
                | "cloudfront-viewer-country-name"
                | "cloudfront-viewer-country-region"
                | "cloudfront-viewer-country-region-name"
                | "cloudfront-viewer-city"
                | "cloudfront-viewer-latitude"
                | "cloudfront-viewer-longitude"
                | "cloudfront-viewer-postal-code"
                | "cloudfront-viewer-time-zone"
                | "x-appengine-country"
                | "x-appengine-region"
                | "x-appengine-city"
                | "x-appengine-citylatlong"
                | "x-geolocation"
                | "x-user-location"
                | "x-client-country"
                | "x-client-city"
                | "x-client-region"
                | "x-latitude"
                | "x-longitude"
        )
}

fn remove(value: Option<&mut Value>, key: &str) -> bool {
    value
        .and_then(Value::as_object_mut)
        .is_some_and(|object| object.remove(key).is_some())
}

fn sanitize_root(value: &mut Value) -> bool {
    let mut changed = remove(value.get_mut("web_search_options"), "user_location");
    // ProtoJSON field aliases are independent at each level of the path.
    for config in ["toolConfig", "tool_config"] {
        for retrieval in ["retrievalConfig", "retrieval_config"] {
            if let Some(location) = value
                .get_mut(config)
                .and_then(|item| item.get_mut(retrieval))
            {
                changed |= remove(Some(&mut *location), "latLng");
                changed |= remove(Some(location), "lat_lng");
            }
        }
    }
    if let Some(tools) = value.get_mut("tools").and_then(Value::as_array_mut) {
        for tool in tools {
            let kind = tool.get("type").and_then(Value::as_str).unwrap_or_default();
            let base = kind.strip_prefix("web_search");
            let suffix = base.map(|tail| tail.strip_prefix("_preview").unwrap_or(tail));
            let search = suffix.is_some_and(|tail| {
                tail.is_empty()
                    || tail.strip_prefix('_').is_some_and(|date| {
                        let plain = date.len() == 8 && date.bytes().all(|byte| byte.is_ascii_digit());
                        let dated = date.len() == 10
                            && date.bytes().enumerate().all(|(i, byte)| {
                                if i == 4 || i == 7 {
                                    byte == b'_'
                                } else {
                                    byte.is_ascii_digit()
                                }
                            });
                        plain || dated
                    })
            });
            if search {
                changed |= remove(Some(tool), "user_location");
            }
        }
    }
    changed
}

pub fn sanitize(value: &mut Value, share: bool) -> bool {
    if share || !value.is_object() {
        return false;
    }
    let mut changed = sanitize_root(value);
    for key in ["request", "response", "session"] {
        if let Some(child) = value.get_mut(key) {
            changed |= sanitize_root(child);
        }
    }
    if let Some(requests) = value.get_mut("requests").and_then(Value::as_array_mut) {
        for request in requests {
            if let Some(params) = request.get_mut("params") {
                changed |= sanitize_root(params);
            }
        }
    }
    changed
}

/// Run after authentication and before account selection, logging or byte replay.
pub async fn route(
    State(state): State<crate::app_state::AppState>,
    request: Request,
    next: Next,
) -> Response {
    let path = request.uri().path();
    let inference = [
        "/messages",
        "/messages/count_tokens",
        "/messages/batches",
        "/chat/completions",
        "/responses",
        "/responses/compact",
        "/responses/input_tokens",
        "/invoke",
        "/invoke-with-response-stream",
        ":generateContent",
        ":streamGenerateContent",
        ":countTokens",
        ":rawPredict",
        ":streamRawPredict",
    ]
    .iter()
    .any(|suffix| path.ends_with(suffix));
    if request.method() != Method::POST || !inference || shares_geolocation(request.headers()) {
        return next.run(request).await;
    }
    let zstd_allowed = path.contains("/codex/") && path.ends_with("/responses");
    let (mut parts, body) = request.into_parts();
    let mut parsed = match crate::encoded_request_body::read_native_json(
        &parts.headers,
        body,
        state.max_proxy_request_bytes,
        zstd_allowed,
    )
    .await
    {
        Ok(parsed) => parsed,
        Err(response) => return response,
    };
    let changed = sanitize(&mut parsed.value, false);
    let bytes = match parsed.native.encode(&parsed.value) {
        Ok(bytes) => bytes,
        Err(_) => {
            return crate::api_error::PresentedError {
                status: StatusCode::INTERNAL_SERVER_ERROR,
                error_type: "api_error",
                message: "could not encode private request",
            }
            .render(crate::api_error::dialect_for_path(parts.uri.path()));
        }
    };
    if changed {
        parts.headers.remove("content-length");
    }
    next.run(Request::from_parts(parts, Body::from(bytes))).await
}

#[cfg(test)]
#[path = "geolocation_tests.rs"]
mod tests;
