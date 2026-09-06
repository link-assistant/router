//! Byte-transparent native vendor service forwarding.
//!
//! These endpoints are provider-owned resources and control-plane operations,
//! not inference translations. Router authenticates and binds an upstream
//! account, swaps only credentials, and leaves request/response bytes opaque.

use axum::body::{Body, Bytes};
use axum::extract::ws::{CloseFrame, Message, WebSocket, WebSocketUpgrade};
use axum::extract::{FromRequestParts, Request, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::{SinkExt, StreamExt};
use sha2::{Digest as _, Sha256};
use std::io::Write as _;
use std::sync::Arc;
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::tungstenite::client::IntoClientRequest as _;

use crate::app_state::AppState;
use crate::clients::ClientKind;
use crate::response_affinity::{
    AffinityDestination, ResponseAffinity, ResponseNamespace, ResponseOwner,
};
use crate::route_contract::{RouteId, route_for_path};
use crate::subscription::SubscriptionProvider;

const CONNECT_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(15);
type UpstreamWebSocket =
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Service {
    OpenAi,
    Anthropic,
    Codex,
    CodexBackend,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum NativeResourceAction {
    Create,
    Use,
    Delete,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct NativeResourceRequest {
    namespace: ResponseNamespace,
    action: NativeResourceAction,
    id: Option<String>,
    parent_id: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct NativeListRequest {
    namespace: ResponseNamespace,
    parent_id: Option<String>,
}

pub struct Target {
    pub client: reqwest::Client,
    pub url: String,
    pub headers: HeaderMap,
}

enum NativeRequestBody {
    Memory(Bytes),
    Spool {
        file: tempfile::NamedTempFile,
        len: usize,
    },
}

impl NativeRequestBody {
    const fn routing_bytes(&self) -> Option<&Bytes> {
        match self {
            Self::Memory(bytes) => Some(bytes),
            Self::Spool { .. } => None,
        }
    }

    const fn len(&self) -> usize {
        match self {
            Self::Memory(bytes) => bytes.len(),
            Self::Spool { len, .. } => *len,
        }
    }
}

pub async fn openai(State(state): State<AppState>, request: Request) -> Response {
    Box::pin(forward(state, request, Service::OpenAi)).await
}

pub async fn anthropic(State(state): State<AppState>, request: Request) -> Response {
    Box::pin(forward(state, request, Service::Anthropic)).await
}

pub async fn codex(State(state): State<AppState>, request: Request) -> Response {
    Box::pin(forward(state, request, Service::Codex)).await
}

pub async fn codex_backend(State(state): State<AppState>, request: Request) -> Response {
    Box::pin(forward(state, request, Service::CodexBackend)).await
}

async fn forward(state: AppState, request: Request, service: Service) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let path = uri.path();
    let Some(route) = route_for_path(&method, path).filter(|route| route_belongs(**route, service))
    else {
        return not_found();
    };
    if service == Service::CodexBackend && crate::codex_remote_control::is_remote_control_path(path)
    {
        return Box::pin(crate::codex_remote_control::forward(state, request)).await;
    }
    let mut headers = request.headers().clone();
    let claims = match crate::proxy::authenticate_client_error(&state, &headers) {
        Ok(claims) => claims,
        Err(error) => return error.render(route.dialect),
    };
    if service == Service::CodexBackend {
        let supported = crate::proxy::extract_client_token(&headers)
            .is_some_and(|token| token.starts_with(crate::token::CODEX_TOKEN_PREFIX));
        if !supported {
            return error(
                StatusCode::UNAUTHORIZED,
                "authentication_error",
                "Codex backend routes require the paired Router-issued at- token",
            );
        }
    }
    if path == "/api/services/codex/v1/user-auth-credential/whoami" {
        return whoami(&state, &headers, &claims).await;
    }
    if path == "/api/services/openai/v1/realtime/client_secrets" {
        return error(
            StatusCode::NOT_IMPLEMENTED,
            "unsupported_operation",
            "Router does not expose upstream Realtime client secrets",
        );
    }
    if let Err(response) = authorize_service(&state, &claims, service) {
        return response;
    }
    if let Err(error) = state.token_manager.enforce_request_budget(&claims.sub) {
        return crate::token_http::budget_error_response(&error);
    }
    let owner = match ResponseOwner::from_claims(&claims) {
        Ok(owner) => owner,
        Err(message) => return error(StatusCode::FORBIDDEN, "permission_error", &message),
    };
    if method == Method::GET && is_websocket(&headers) {
        let affinity = match realtime_sideband(service, path, uri.query()) {
            Ok(Some((namespace, call_id))) => {
                match state
                    .provider_store
                    .response_affinities()
                    .lookup(namespace, &call_id, &owner)
                {
                    Ok(Some(affinity)) => Some(affinity),
                    Ok(None) => {
                        return error(
                            StatusCode::NOT_FOUND,
                            "not_found_error",
                            "the Realtime call is unavailable",
                        );
                    }
                    Err(_) => return unavailable("Realtime call affinity is unavailable"),
                }
            }
            Ok(None) => None,
            Err(()) => {
                return error(
                    StatusCode::BAD_REQUEST,
                    "invalid_request_error",
                    "exactly one non-empty Realtime call_id is allowed",
                );
            }
        };
        let target = match target(
            &state,
            &headers,
            &claims,
            service,
            &uri,
            None,
            affinity.as_ref().map(|affinity| &affinity.destination),
        )
        .await
        {
            Ok((target, _)) => target,
            Err(response) => return response,
        };
        return upgrade_websocket(state, request, target, Some(claims.sub)).await;
    }
    let spool = headers
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.to_ascii_lowercase().starts_with("multipart/"));
    let body = match collect_native_body(request.into_body(), state.max_proxy_request_bytes, spool)
        .await
    {
        Ok(body) => body,
        Err(response) => return response,
    };
    let body = if service == Service::Codex
        && method == Method::POST
        && matches!(
            path,
            "/api/services/codex/v1/realtime/calls" | "/api/services/codex/v1/live"
        ) {
        match translate_codex_realtime_call(&mut headers, body).await {
            Ok(body) => body,
            Err(response) => return response,
        }
    } else {
        body
    };
    let routing_body = body.routing_bytes();
    if requires_json_object(service, &method, path)
        && !routing_body.is_some_and(|bytes| {
            serde_json::from_slice::<serde_json::Value>(bytes).is_ok_and(|value| value.is_object())
        })
    {
        return error(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "the native service request body must be a JSON object",
        );
    }
    let resource = match mcp_session_resource_request(&method, path, &headers) {
        Ok(resource) => resource.or_else(|| native_resource_request(&method, path)),
        Err(response) => return response,
    };
    let list = native_list_request(&method, path);
    let list_destination = match list.as_ref() {
        Some(list) => match native_list_destination(&state, &owner, list) {
            Ok(destination) => destination,
            Err(response) => return response,
        },
        None => None,
    };
    let existing = match resource
        .as_ref()
        .map(|resource| existing_resource(&state, &owner, resource))
        .transpose()
    {
        Ok(affinity) => affinity.flatten(),
        Err(response) => return response,
    };
    let referenced = match referenced_response_affinity(
        &state,
        &owner,
        service,
        path,
        routing_body.map_or(&[][..], Bytes::as_ref),
    ) {
        Ok(affinity) => affinity,
        Err(response) => return response,
    };
    let exact_destination = match one_native_destination(
        existing.as_ref().map(|affinity| &affinity.destination),
        referenced.as_ref().map(|affinity| &affinity.destination),
        list_destination.as_ref(),
    ) {
        Ok(destination) => destination,
        Err(response) => return response,
    };
    let (target, destination) = match target(
        &state,
        &headers,
        &claims,
        service,
        &uri,
        routing_body,
        exact_destination.as_ref(),
    )
    .await
    {
        Ok(target) => target,
        Err(response) => return response,
    };
    if let Some(operation) = codex_history_notes_operation(path) {
        crate::audit::record_control_plane_request(&state, &claims, "codex", operation);
    }
    if path == "/api/services/anthropic/v1/files"
        && method == Method::POST
        && let Err(response) = require_claude_file_upload_scope(&state, &destination)
    {
        return response;
    }
    if path == "/api/services/anthropic/v1/messages/batches"
        && method == Method::POST
        && let Err(response) = validate_anthropic_batch(
            &state,
            &destination,
            routing_body.map_or(&[][..], Bytes::as_ref),
        )
    {
        return response;
    }
    let usage_token_id = tracks_native_usage(service, path).then_some(claims.sub.as_str());
    let mut response = relay_native_http(&state, &method, body, target, usage_token_id).await;
    if let Some(namespace) = created_response_namespace(service, path) {
        let context = crate::resource_capture::CaptureContext::native(
            namespace,
            owner.clone(),
            destination.clone(),
            None,
        );
        response = crate::resource_capture::capture(&state, context, response).await;
    }
    if let Some(list) = list {
        response = filter_native_list_response(&state, &owner, &list, response).await;
    }
    if let Some(resource) = resource {
        if matches!(
            resource.namespace,
            ResponseNamespace::OpenAiRealtimeCalls | ResponseNamespace::CodexRealtimeCalls
        ) && resource.action == NativeResourceAction::Create
            && response.status().is_success()
            && let Err(rewrite_error) = rewrite_realtime_location(service, path, &mut response)
        {
            return rewrite_error;
        }
        return finish_resource_request(&state, owner, destination, resource, existing, response)
            .await;
    }
    response
}

fn realtime_sideband(
    service: Service,
    path: &str,
    query: Option<&str>,
) -> Result<Option<(ResponseNamespace, String)>, ()> {
    let namespace = match service {
        Service::OpenAi => ResponseNamespace::OpenAiRealtimeCalls,
        Service::Codex => ResponseNamespace::CodexRealtimeCalls,
        Service::Anthropic | Service::CodexBackend => return Ok(None),
    };
    if service == Service::Codex
        && let Some(encoded) = path.strip_prefix("/api/services/codex/v1/live/")
    {
        let id = percent_decode_segment(encoded).ok_or(())?;
        if id.is_empty() {
            return Err(());
        }
        return Ok(Some((namespace, id)));
    }
    let realtime = match service {
        Service::OpenAi => "/api/services/openai/v1/realtime",
        Service::Codex => "/api/services/codex/v1/realtime",
        Service::Anthropic | Service::CodexBackend => unreachable!(),
    };
    if path != realtime {
        return Ok(None);
    }
    let mut ids = query
        .into_iter()
        .flat_map(|query| url::form_urlencoded::parse(query.as_bytes()))
        .filter_map(|(key, value)| (key == "call_id").then_some(value.into_owned()));
    let Some(id) = ids.next() else {
        return Ok(None);
    };
    if id.is_empty() || ids.next().is_some() {
        return Err(());
    }
    Ok(Some((namespace, id)))
}

fn percent_decode_segment(encoded: &str) -> Option<String> {
    let bytes = encoded.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            let high = hex_digit(*bytes.get(index + 1)?)?;
            let low = hex_digit(*bytes.get(index + 2)?)?;
            decoded.push((high << 4) | low);
            index += 3;
        } else {
            decoded.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(decoded).ok()
}

const fn hex_digit(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

async fn collect_native_body(
    body: Body,
    limit: usize,
    spool: bool,
) -> Result<NativeRequestBody, Response> {
    if !spool {
        return axum::body::to_bytes(body, limit)
            .await
            .map(NativeRequestBody::Memory)
            .map_err(|_| {
                error(
                    StatusCode::PAYLOAD_TOO_LARGE,
                    "invalid_request_error",
                    "request body exceeds the proxy limit",
                )
            });
    }
    let mut file = tempfile::NamedTempFile::new()
        .map_err(|_| unavailable("a temporary upload spool could not be created"))?;
    let mut len = 0usize;
    let mut source = body.into_data_stream();
    while let Some(chunk) = source.next().await {
        let chunk = chunk.map_err(|_| {
            error(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                "request body stream failed",
            )
        })?;
        len = len.checked_add(chunk.len()).ok_or_else(|| {
            error(
                StatusCode::PAYLOAD_TOO_LARGE,
                "invalid_request_error",
                "request body exceeds the proxy limit",
            )
        })?;
        if len > limit {
            return Err(error(
                StatusCode::PAYLOAD_TOO_LARGE,
                "invalid_request_error",
                "request body exceeds the proxy limit",
            ));
        }
        file.write_all(&chunk)
            .map_err(|_| unavailable("the temporary upload spool could not be written"))?;
    }
    file.flush()
        .map_err(|_| unavailable("the temporary upload spool could not be written"))?;
    Ok(NativeRequestBody::Spool { file, len })
}

async fn translate_codex_realtime_call(
    headers: &mut HeaderMap,
    body: NativeRequestBody,
) -> Result<NativeRequestBody, Response> {
    let content_type = headers
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            error(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                "Codex Realtime call creation requires a supported content type",
            )
        })?;
    let media_type = content_type.split(';').next().unwrap_or_default().trim();
    if media_type.eq_ignore_ascii_case("application/sdp")
        || media_type.eq_ignore_ascii_case("application/json")
    {
        return Ok(body);
    }
    if !media_type.eq_ignore_ascii_case("multipart/form-data") {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "Codex Realtime call creation supports SDP, multipart, or JSON bodies",
        ));
    }
    let boundary = multipart_boundary(content_type).ok_or_else(|| {
        error(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "Codex Realtime multipart body has an invalid boundary",
        )
    })?;
    let bytes = native_body_bytes(body).await?;
    let (sdp, session) = parse_codex_realtime_multipart(&bytes, &boundary)?;
    let encoded = serde_json::to_vec(&serde_json::json!({
        "sdp": sdp,
        "session": session,
    }))
    .map_err(|_| unavailable("Codex Realtime backend JSON could not be encoded"))?;
    headers.insert("content-type", HeaderValue::from_static("application/json"));
    headers.remove("content-length");
    Ok(NativeRequestBody::Memory(Bytes::from(encoded)))
}

async fn native_body_bytes(body: NativeRequestBody) -> Result<Bytes, Response> {
    match body {
        NativeRequestBody::Memory(bytes) => Ok(bytes),
        NativeRequestBody::Spool { file, len } => {
            let bytes = tokio::fs::read(file.path())
                .await
                .map_err(|_| unavailable("the temporary upload spool could not be read"))?;
            if bytes.len() != len {
                return Err(unavailable(
                    "the temporary upload spool changed before forwarding",
                ));
            }
            Ok(Bytes::from(bytes))
        }
    }
}

fn multipart_boundary(content_type: &str) -> Option<String> {
    content_type.split(';').skip(1).find_map(|parameter| {
        let (name, raw_value) = parameter.trim().split_once('=')?;
        if !name.trim().eq_ignore_ascii_case("boundary") {
            return None;
        }
        let raw_value = raw_value.trim();
        let value = raw_value
            .strip_prefix('"')
            .and_then(|value| value.strip_suffix('"'))
            .unwrap_or(raw_value);
        (!value.is_empty()
            && value.len() <= 70
            && value
                .bytes()
                .all(|byte| byte.is_ascii_graphic() && byte != b'"'))
        .then(|| value.to_string())
    })
}

fn parse_codex_realtime_multipart(
    body: &[u8],
    boundary: &str,
) -> Result<(String, serde_json::Value), Response> {
    let delimiter = format!("--{boundary}").into_bytes();
    let separator = format!("\r\n--{boundary}").into_bytes();
    let mut cursor = 0usize;
    let mut sdp = None;
    let mut session = None;
    loop {
        if !body
            .get(cursor..)
            .is_some_and(|tail| tail.starts_with(&delimiter))
        {
            return Err(invalid_codex_multipart());
        }
        cursor += delimiter.len();
        if body
            .get(cursor..)
            .is_some_and(|tail| tail.starts_with(b"--"))
        {
            cursor += 2;
            if !matches!(body.get(cursor..), Some(b"" | b"\r\n")) {
                return Err(invalid_codex_multipart());
            }
            break;
        }
        if !body
            .get(cursor..)
            .is_some_and(|tail| tail.starts_with(b"\r\n"))
        {
            return Err(invalid_codex_multipart());
        }
        cursor += 2;
        let header_end = find_bytes(body.get(cursor..).unwrap_or_default(), b"\r\n\r\n")
            .ok_or_else(invalid_codex_multipart)?;
        let headers = std::str::from_utf8(&body[cursor..cursor + header_end])
            .map_err(|_| invalid_codex_multipart())?;
        cursor += header_end + 4;
        let content_end = find_bytes(body.get(cursor..).unwrap_or_default(), &separator)
            .ok_or_else(invalid_codex_multipart)?;
        let content = &body[cursor..cursor + content_end];
        cursor += content_end + 2;
        match multipart_field_name(headers).as_deref() {
            Some("sdp") if sdp.is_none() => {
                sdp = Some(
                    std::str::from_utf8(content)
                        .map_err(|_| invalid_codex_multipart())?
                        .to_string(),
                );
            }
            Some("session") if session.is_none() => {
                session =
                    Some(serde_json::from_slice(content).map_err(|_| invalid_codex_multipart())?);
            }
            Some("sdp" | "session") => return Err(invalid_codex_multipart()),
            _ => {}
        }
    }
    match (sdp, session) {
        (Some(sdp), Some(session)) if !sdp.is_empty() => Ok((sdp, session)),
        _ => Err(invalid_codex_multipart()),
    }
}

fn multipart_field_name(headers: &str) -> Option<String> {
    let disposition = headers.lines().find_map(|line| {
        let (name, value) = line.split_once(':')?;
        name.trim()
            .eq_ignore_ascii_case("content-disposition")
            .then_some(value)
    })?;
    disposition.split(';').skip(1).find_map(|parameter| {
        let (name, raw_value) = parameter.trim().split_once('=')?;
        name.trim().eq_ignore_ascii_case("name").then(|| {
            raw_value
                .trim()
                .strip_prefix('"')
                .and_then(|value| value.strip_suffix('"'))
                .unwrap_or_else(|| raw_value.trim())
                .to_string()
        })
    })
}

fn find_bytes(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    (!needle.is_empty())
        .then(|| {
            haystack
                .windows(needle.len())
                .position(|window| window == needle)
        })
        .flatten()
}

fn invalid_codex_multipart() -> Response {
    error(
        StatusCode::BAD_REQUEST,
        "invalid_request_error",
        "Codex Realtime multipart body must contain one SDP and one JSON session field",
    )
}

fn require_claude_file_upload_scope(
    state: &AppState,
    destination: &AffinityDestination,
) -> Result<(), Response> {
    let AffinityDestination::Subscription {
        provider: SubscriptionProvider::Claude,
        account,
        ..
    } = destination
    else {
        return Err(unavailable(
            "the selected credential cannot authorize Anthropic file uploads",
        ));
    };
    let reader = state
        .account_router
        .as_ref()
        .filter(|router| router.provider() == SubscriptionProvider::Claude)
        .and_then(|router| {
            router
                .subscription_readers()
                .into_iter()
                .find_map(|(name, reader)| (name == *account).then_some(reader))
        })
        .or_else(|| {
            (account == crate::credential_recovery_store::PRIMARY_ACCOUNT)
                .then(|| {
                    state
                        .subscription_readers
                        .iter()
                        .find(|reader| reader.provider() == SubscriptionProvider::Claude)
                        .cloned()
                        .or_else(|| {
                            state
                                .subscription_reader
                                .as_ref()
                                .filter(|reader| reader.provider() == SubscriptionProvider::Claude)
                                .cloned()
                        })
                })
                .flatten()
        })
        .ok_or_else(|| unavailable("the selected Claude credential is unavailable"))?;
    match reader.has_claude_scope("user:file_upload") {
        Ok(true) => Ok(()),
        Ok(false) => Err(anthropic_error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the selected Claude credential does not authorize file uploads",
        )),
        Err(_) => Err(unavailable(
            "the selected Claude credential authorization is unreadable",
        )),
    }
}

fn validate_anthropic_batch(
    state: &AppState,
    destination: &AffinityDestination,
    body: &[u8],
) -> Result<(), Response> {
    let AffinityDestination::Subscription {
        provider: SubscriptionProvider::Claude,
        account,
        ..
    } = destination
    else {
        return Err(anthropic_error(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "Anthropic message batches require one native Claude account",
        ));
    };
    let document = serde_json::from_slice::<serde_json::Value>(body).map_err(|_| {
        anthropic_error(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "message batch body must be valid JSON",
        )
    })?;
    let requests = document
        .get("requests")
        .and_then(serde_json::Value::as_array)
        .filter(|requests| !requests.is_empty())
        .ok_or_else(|| {
            anthropic_error(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                "message batch requests must be a non-empty array",
            )
        })?;
    let catalog = state
        .model_catalogs
        .status_for(SubscriptionProvider::Claude, account);
    let models = catalog.routable_models();
    for request in requests {
        let model = request
            .pointer("/params/model")
            .and_then(serde_json::Value::as_str)
            .filter(|model| !model.is_empty())
            .ok_or_else(|| {
                anthropic_error(
                    StatusCode::BAD_REQUEST,
                    "invalid_request_error",
                    "every message batch request requires a non-empty model",
                )
            })?;
        if !models.iter().any(|candidate| candidate == model) {
            return Err(anthropic_error(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                "a message batch model is unavailable on the selected Claude account",
            ));
        }
    }
    Ok(())
}

include!("native_service_resources.rs");
include!("native_service_target.rs");
include!("native_service_relay.rs");

#[cfg(test)]
mod tests {
    use super::*;
    use http_body_util::BodyExt as _;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::{Arc, Mutex};

    include!("native_service_tests_resources.rs");
    include!("native_service_tests_relay.rs");
    include!("native_service_tests_codex_apps.rs");
}
