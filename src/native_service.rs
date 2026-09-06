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
    let resource = native_resource_request(&method, path);
    let list = native_list_request(&method, path);
    let list_destination = match list.as_ref() {
        Some(list) => match native_list_destination(&state, &owner, list) {
            Ok(destination) => destination,
            Err(response) => return response,
        },
        None => None,
    };
    let existing = match resource.as_ref() {
        Some(resource) => match existing_resource(&state, &owner, resource) {
            Ok(affinity) => affinity,
            Err(response) => return response,
        },
        None => match referenced_response_affinity(
            &state,
            &owner,
            service,
            path,
            routing_body.map_or(&[][..], Bytes::as_ref),
        ) {
            Ok(affinity) => affinity,
            Err(response) => return response,
        },
    };
    let (target, destination) = match target(
        &state,
        &headers,
        &claims,
        service,
        &uri,
        routing_body,
        existing
            .as_ref()
            .map(|affinity| &affinity.destination)
            .or(list_destination.as_ref()),
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

fn native_resource_request(method: &Method, path: &str) -> Option<NativeResourceRequest> {
    if let Some(tail) = path.strip_prefix("/api/services/openai/v1/realtime/calls") {
        return call_resource(method, tail, ResponseNamespace::OpenAiRealtimeCalls);
    }
    if let Some(tail) = path.strip_prefix("/api/services/codex/v1/realtime/calls") {
        return call_resource(method, tail, ResponseNamespace::CodexRealtimeCalls);
    }
    if let Some(tail) = path.strip_prefix("/api/services/codex/v1/live") {
        return call_resource(method, tail, ResponseNamespace::CodexRealtimeCalls);
    }
    if let Some(tail) = path.strip_prefix("/api/services/anthropic/v1/files") {
        return simple_resource(method, tail, ResponseNamespace::AnthropicFiles, true);
    }
    if let Some(tail) = path.strip_prefix("/api/services/anthropic/v1/messages/batches") {
        return simple_resource(method, tail, ResponseNamespace::AnthropicBatches, false);
    }
    if let Some(tail) = path.strip_prefix("/api/services/anthropic/v1/skills") {
        return skill_resource(method, tail);
    }
    if let Some(tail) = path.strip_prefix("/api/services/codex/backend-api/files") {
        return match (method, split_tail(tail).as_slice()) {
            (&Method::POST, []) => Some(resource_create(ResponseNamespace::CodexFiles, None)),
            (&Method::POST, [file_id, "uploaded"]) => Some(resource_use(
                ResponseNamespace::CodexFiles,
                file_id,
                NativeResourceAction::Use,
                None,
            )),
            _ => None,
        };
    }
    None
}

fn native_list_request(method: &Method, path: &str) -> Option<NativeListRequest> {
    if method != Method::GET {
        return None;
    }
    match path {
        "/api/services/anthropic/v1/files" => Some(NativeListRequest {
            namespace: ResponseNamespace::AnthropicFiles,
            parent_id: None,
        }),
        "/api/services/anthropic/v1/messages/batches" => Some(NativeListRequest {
            namespace: ResponseNamespace::AnthropicBatches,
            parent_id: None,
        }),
        "/api/services/anthropic/v1/skills" => Some(NativeListRequest {
            namespace: ResponseNamespace::AnthropicSkills,
            parent_id: None,
        }),
        _ => path
            .strip_prefix("/api/services/anthropic/v1/skills/")
            .and_then(|tail| {
                let segments = split_tail(tail);
                let [skill_id, "versions"] = segments.as_slice() else {
                    return None;
                };
                Some(NativeListRequest {
                    namespace: ResponseNamespace::AnthropicSkillVersions,
                    parent_id: Some((*skill_id).to_string()),
                })
            }),
    }
}

fn native_list_destination(
    state: &AppState,
    owner: &ResponseOwner,
    list: &NativeListRequest,
) -> Result<Option<AffinityDestination>, Response> {
    let affinities = state
        .provider_store
        .response_affinities()
        .list(list.namespace, owner)
        .map_err(|_| unavailable("native resource affinity is unavailable"))?;
    let mut destinations = affinities
        .into_iter()
        .filter(|affinity| {
            list.parent_id
                .as_ref()
                .is_none_or(|parent| affinity.parent_id.as_ref() == Some(parent))
        })
        .map(|affinity| affinity.destination);
    let Some(first) = destinations.next() else {
        return Ok(None);
    };
    if destinations.any(|destination| destination != first) {
        return Err(anthropic_error(
            StatusCode::CONFLICT,
            "invalid_request_error",
            "the requested native resources span multiple subscription accounts",
        ));
    }
    Ok(Some(first))
}

fn call_resource(
    method: &Method,
    tail: &str,
    namespace: ResponseNamespace,
) -> Option<NativeResourceRequest> {
    match (method, split_tail(tail).as_slice()) {
        (&Method::POST, []) => Some(resource_create(namespace, None)),
        (&Method::POST | &Method::DELETE, [call_id]) => Some(resource_use(
            namespace,
            call_id,
            if method == Method::DELETE {
                NativeResourceAction::Delete
            } else {
                NativeResourceAction::Use
            },
            None,
        )),
        (&Method::POST, [call_id, "accept" | "hangup" | "refer" | "reject"]) => Some(resource_use(
            namespace,
            call_id,
            NativeResourceAction::Use,
            None,
        )),
        _ => None,
    }
}

fn simple_resource(
    method: &Method,
    tail: &str,
    namespace: ResponseNamespace,
    content_route: bool,
) -> Option<NativeResourceRequest> {
    match (method, split_tail(tail).as_slice()) {
        (&Method::POST, []) => Some(resource_create(namespace, None)),
        (&Method::GET, [id]) => Some(resource_use(namespace, id, NativeResourceAction::Use, None)),
        (&Method::DELETE, [id]) => Some(resource_use(
            namespace,
            id,
            NativeResourceAction::Delete,
            None,
        )),
        (&Method::GET, [id, "content"]) if content_route => {
            Some(resource_use(namespace, id, NativeResourceAction::Use, None))
        }
        (&Method::POST, [id, "cancel"]) if !content_route => {
            Some(resource_use(namespace, id, NativeResourceAction::Use, None))
        }
        (&Method::GET, [id, "results"]) if !content_route => {
            Some(resource_use(namespace, id, NativeResourceAction::Use, None))
        }
        _ => None,
    }
}

fn skill_resource(method: &Method, tail: &str) -> Option<NativeResourceRequest> {
    let segments = split_tail(tail);
    if ((method == Method::GET || method == Method::POST || method == Method::DELETE)
        && segments.len() == 1)
        || (method == Method::GET && matches!(segments.as_slice(), [_, "versions"]))
    {
        return Some(resource_use(
            ResponseNamespace::AnthropicSkills,
            segments[0],
            if method == Method::DELETE {
                NativeResourceAction::Delete
            } else {
                NativeResourceAction::Use
            },
            None,
        ));
    }
    if ((method == Method::GET || method == Method::POST || method == Method::DELETE)
        && segments.len() == 3)
        || (method == Method::GET && matches!(segments.as_slice(), [_, "versions", _, "content"]))
    {
        return Some(resource_use(
            ResponseNamespace::AnthropicSkillVersions,
            segments[2],
            if method == Method::DELETE {
                NativeResourceAction::Delete
            } else {
                NativeResourceAction::Use
            },
            Some(segments[0]),
        ));
    }
    match (method, segments.as_slice()) {
        (&Method::POST, []) => Some(resource_create(ResponseNamespace::AnthropicSkills, None)),
        (&Method::POST, [skill_id, "versions"]) => Some(NativeResourceRequest {
            namespace: ResponseNamespace::AnthropicSkillVersions,
            action: NativeResourceAction::Create,
            id: Some((*skill_id).to_string()),
            parent_id: Some((*skill_id).to_string()),
        }),
        _ => None,
    }
}

fn split_tail(tail: &str) -> Vec<&str> {
    tail.trim_matches('/')
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect()
}

fn resource_create(namespace: ResponseNamespace, parent_id: Option<&str>) -> NativeResourceRequest {
    NativeResourceRequest {
        namespace,
        action: NativeResourceAction::Create,
        id: parent_id.map(str::to_string),
        parent_id: parent_id.map(str::to_string),
    }
}

fn resource_use(
    namespace: ResponseNamespace,
    id: &str,
    action: NativeResourceAction,
    parent_id: Option<&str>,
) -> NativeResourceRequest {
    NativeResourceRequest {
        namespace,
        action,
        id: Some(id.to_string()),
        parent_id: parent_id.map(str::to_string),
    }
}

fn existing_resource(
    state: &AppState,
    owner: &ResponseOwner,
    resource: &NativeResourceRequest,
) -> Result<Option<ResponseAffinity>, Response> {
    let lookup = if resource.action == NativeResourceAction::Create {
        resource
            .parent_id
            .as_deref()
            .map(|parent_id| (ResponseNamespace::AnthropicSkills, parent_id))
    } else {
        resource.id.as_deref().map(|id| (resource.namespace, id))
    };
    let Some((namespace, id)) = lookup else {
        return Ok(None);
    };
    let store = state.provider_store.response_affinities();
    let found = resource.parent_id.as_deref().map_or_else(
        || store.lookup(namespace, id, owner),
        |parent_id| store.lookup_child(namespace, id, parent_id, owner),
    );
    match found {
        Ok(Some(affinity))
            if resource.action == NativeResourceAction::Create
                || resource.parent_id.is_none()
                || affinity.parent_id == resource.parent_id =>
        {
            Ok(Some(affinity))
        }
        Ok(Some(_) | None) => Err(error(
            StatusCode::NOT_FOUND,
            "not_found_error",
            "the native resource is unavailable",
        )),
        Err(_) => Err(unavailable("native resource affinity is unavailable")),
    }
}

async fn finish_resource_request(
    state: &AppState,
    owner: ResponseOwner,
    destination: AffinityDestination,
    resource: NativeResourceRequest,
    existing: Option<ResponseAffinity>,
    response: Response,
) -> Response {
    match resource.action {
        NativeResourceAction::Create => {
            let fields: &[&str] = match resource.namespace {
                ResponseNamespace::CodexFiles => &["file_id", "id"],
                ResponseNamespace::AnthropicSkillVersions => &["version", "id"],
                ResponseNamespace::OpenAiRealtimeCalls | ResponseNamespace::CodexRealtimeCalls => {
                    &["call_id", "id"]
                }
                _ => &["id"],
            };
            let context = crate::resource_capture::CaptureContext::native(
                resource.namespace,
                owner,
                destination,
                resource.parent_id,
            );
            crate::resource_capture::capture_with_json_fields(state, context, response, fields)
                .await
        }
        NativeResourceAction::Delete if response.status().is_success() => {
            if let Some(affinity) = existing {
                let store = state.provider_store.response_affinities();
                if resource.namespace == ResponseNamespace::AnthropicSkills
                    && store
                        .remove_children(
                            ResponseNamespace::AnthropicSkillVersions,
                            &affinity.response_id,
                            &owner,
                            &affinity.destination,
                        )
                        .is_err()
                {
                    return unavailable("native child resource affinities could not be removed");
                }
                if store.remove_if_matches(&affinity).is_err() {
                    return unavailable("native resource affinity could not be removed");
                }
            }
            response
        }
        NativeResourceAction::Use | NativeResourceAction::Delete => response,
    }
}

async fn filter_native_list_response(
    state: &AppState,
    owner: &ResponseOwner,
    list: &NativeListRequest,
    response: Response,
) -> Response {
    if !response.status().is_success() {
        return response;
    }
    let (mut parts, body) = response.into_parts();
    let Ok(bytes) = axum::body::to_bytes(body, state.max_proxy_request_bytes).await else {
        return anthropic_error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "upstream native resource list exceeds the proxy limit",
        );
    };
    let Ok(serde_json::Value::Object(mut document)) =
        serde_json::from_slice::<serde_json::Value>(&bytes)
    else {
        return anthropic_error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "upstream native resource list is not a JSON object",
        );
    };
    let Ok(affinities) = state
        .provider_store
        .response_affinities()
        .list(list.namespace, owner)
    else {
        return unavailable("native resource affinity is unavailable");
    };
    let owned_ids = affinities
        .into_iter()
        .filter(|affinity| {
            list.parent_id
                .as_ref()
                .is_none_or(|parent| affinity.parent_id.as_ref() == Some(parent))
        })
        .map(|affinity| affinity.response_id)
        .collect::<std::collections::HashSet<_>>();
    let Some(data) = document
        .get_mut("data")
        .and_then(serde_json::Value::as_array_mut)
    else {
        return anthropic_error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "upstream native resource list has no data array",
        );
    };
    data.retain(|item| list_item_id(item, list.namespace).is_some_and(|id| owned_ids.contains(id)));
    let first_id = data
        .first()
        .and_then(|item| list_item_id(item, list.namespace))
        .map(str::to_string);
    let last_id = data
        .last()
        .and_then(|item| list_item_id(item, list.namespace))
        .map(str::to_string);
    if document.contains_key("first_id") {
        document.insert(
            "first_id".to_string(),
            first_id.map_or(serde_json::Value::Null, serde_json::Value::String),
        );
    }
    if document.contains_key("last_id") {
        document.insert(
            "last_id".to_string(),
            last_id.map_or(serde_json::Value::Null, serde_json::Value::String),
        );
    }
    let Ok(encoded) = serde_json::to_vec(&serde_json::Value::Object(document)) else {
        return unavailable("native resource list could not be encoded");
    };
    parts.headers.remove("content-length");
    Response::from_parts(parts, Body::from(encoded))
}

fn list_item_id(item: &serde_json::Value, namespace: ResponseNamespace) -> Option<&str> {
    let field = if namespace == ResponseNamespace::AnthropicSkillVersions {
        "version"
    } else {
        "id"
    };
    item.get(field)
        .or_else(|| item.get("id"))
        .and_then(serde_json::Value::as_str)
        .filter(|id| !id.is_empty())
}

fn response_references(
    service: Service,
    path: &str,
    body: &[u8],
) -> Vec<(ResponseNamespace, String)> {
    let response_namespace = match (service, path) {
        (
            Service::OpenAi,
            "/api/services/openai/v1/responses/compact"
            | "/api/services/openai/v1/responses/input_tokens",
        ) => Some(ResponseNamespace::OpenAiResponses),
        (Service::Codex, "/api/services/codex/v1/responses/compact") => {
            Some(ResponseNamespace::CodexResponses)
        }
        _ => None,
    };
    let Ok(document) = serde_json::from_slice::<serde_json::Value>(body) else {
        return Vec::new();
    };
    let mut references = Vec::new();
    if let Some(namespace) = response_namespace
        && let Some(id) = document
            .get("previous_response_id")
            .and_then(serde_json::Value::as_str)
            .filter(|id| !id.is_empty())
    {
        references.push((namespace, id.to_string()));
    }
    if service == Service::OpenAi
        && path == "/api/services/openai/v1/responses/input_tokens"
        && let Some(id) = document.get("conversation").and_then(|conversation| {
            conversation
                .as_str()
                .or_else(|| conversation.get("id").and_then(serde_json::Value::as_str))
        })
        && !id.is_empty()
    {
        let reference = (ResponseNamespace::OpenAiConversations, id.to_string());
        if !references.contains(&reference) {
            references.push(reference);
        }
    }
    references
}

fn requires_json_object(service: Service, method: &Method, path: &str) -> bool {
    if method != Method::POST {
        return false;
    }
    match service {
        Service::OpenAi => matches!(
            path,
            "/api/services/openai/v1/responses/compact"
                | "/api/services/openai/v1/responses/input_tokens"
                | "/api/services/openai/v1/images/generations"
                | "/api/services/openai/v1/audio/speech"
        ),
        Service::Codex => matches!(
            path,
            "/api/services/codex/v1/responses/compact"
                | "/api/services/codex/v1/images/generations"
                | "/api/services/codex/v1/images/edits"
                | "/api/services/codex/v1/alpha/search"
        ),
        Service::Anthropic | Service::CodexBackend => false,
    }
}

fn tracks_native_usage(service: Service, path: &str) -> bool {
    match service {
        Service::OpenAi => matches!(
            path,
            "/api/services/openai/v1/responses/compact"
                | "/api/services/openai/v1/images/generations"
                | "/api/services/openai/v1/images/edits"
                | "/api/services/openai/v1/images/variations"
                | "/api/services/openai/v1/audio/speech"
                | "/api/services/openai/v1/audio/transcriptions"
                | "/api/services/openai/v1/audio/translations"
        ),
        Service::Codex => matches!(
            path,
            "/api/services/codex/v1/responses/compact"
                | "/api/services/codex/v1/images/generations"
                | "/api/services/codex/v1/images/edits"
                | "/api/services/codex/v1/alpha/search"
        ),
        Service::Anthropic | Service::CodexBackend => false,
    }
}

fn created_response_namespace(service: Service, path: &str) -> Option<ResponseNamespace> {
    match (service, path) {
        (Service::OpenAi, "/api/services/openai/v1/responses/compact") => {
            Some(ResponseNamespace::OpenAiResponses)
        }
        (Service::Codex, "/api/services/codex/v1/responses/compact") => {
            Some(ResponseNamespace::CodexResponses)
        }
        _ => None,
    }
}

fn referenced_response_affinity(
    state: &AppState,
    owner: &ResponseOwner,
    service: Service,
    path: &str,
    body: &[u8],
) -> Result<Option<ResponseAffinity>, Response> {
    let store = state.provider_store.response_affinities();
    let mut selected: Option<ResponseAffinity> = None;
    for (namespace, id) in response_references(service, path, body) {
        let affinity = store
            .lookup(namespace, &id, owner)
            .map_err(|_| unavailable("resource affinity is unavailable"))?
            .ok_or_else(|| {
                error(
                    StatusCode::NOT_FOUND,
                    "not_found_error",
                    "the referenced response resource is unavailable",
                )
            })?;
        if selected
            .as_ref()
            .is_some_and(|existing| existing.destination != affinity.destination)
        {
            return Err(error(
                StatusCode::CONFLICT,
                "invalid_request_error",
                "the referenced response resources do not share one provider account",
            ));
        }
        selected = Some(affinity);
    }
    Ok(selected)
}

const fn route_belongs(route: crate::route_contract::RouteSpec, service: Service) -> bool {
    matches!(
        (route.id, service),
        (RouteId::NativeOpenAi, Service::OpenAi)
            | (RouteId::NativeAnthropic, Service::Anthropic)
            | (RouteId::NativeCodex, Service::Codex)
            | (RouteId::NativeCodexBackend, Service::CodexBackend)
    )
}

fn authorize_service(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    service: Service,
) -> Result<(), Response> {
    let (client, _) = crate::client_policy::bound_client(claims)
        .map_err(|message| error(StatusCode::FORBIDDEN, "permission_error", &message))?;
    match service {
        Service::Codex | Service::CodexBackend if client != ClientKind::Codex => Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the Codex service requires a Codex-bound Router token",
        )),
        Service::Anthropic if client != ClientKind::ClaudeCode => Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the Anthropic native service requires a Claude-bound Router token",
        )),
        Service::OpenAi => {
            let provider = crate::provider_proxy::resolve_openai_compatible_provider(state)
                .map_err(|_| unavailable("the native OpenAI provider is unavailable"))?;
            if provider.supports_client(client) {
                Ok(())
            } else {
                Err(error(
                    StatusCode::FORBIDDEN,
                    "permission_error",
                    "the selected OpenAI provider does not support this client",
                ))
            }
        }
        _ => Ok(()),
    }
}

async fn whoami(
    state: &AppState,
    headers: &HeaderMap,
    claims: &crate::token::TokenClaims,
) -> Response {
    if crate::proxy::extract_client_token(headers)
        .is_none_or(|token| !token.starts_with(crate::token::CODEX_TOKEN_PREFIX))
    {
        return error(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "Codex whoami requires the paired Router-issued at- token",
        );
    }
    if let Err(response) = authorize_service(state, claims, Service::Codex) {
        return response;
    }
    let selected = match selected_subscription(
        state,
        headers,
        claims,
        SubscriptionProvider::Codex,
        None,
    )
    .await
    {
        Ok(selected) => selected,
        Err(response) => return response,
    };
    let (_, principal) = crate::client_policy::bound_client(claims).expect("authorized above");
    let user = opaque_handle("usr", principal);
    let account = codex_account_handle(
        principal,
        &selected.name,
        selected.token.account_id.as_deref(),
    );
    let (plan, fedramp) = codex_identity_metadata(state, &selected.name, &selected.token);
    axum::Json(serde_json::json!({
        "email": serde_json::Value::Null,
        "chatgpt_user_id": user,
        "chatgpt_account_id": account,
        "chatgpt_plan_type": plan,
        "chatgpt_account_is_fedramp": fedramp,
    }))
    .into_response()
}

fn opaque_handle(prefix: &str, value: &str) -> String {
    let digest = hex::encode(Sha256::digest(value.as_bytes()));
    format!("{prefix}_{}", &digest[..24])
}

fn codex_account_handle(
    principal: &str,
    account: &str,
    upstream_account_id: Option<&str>,
) -> String {
    opaque_handle(
        "acct",
        &format!(
            "{principal}:{account}:{}",
            upstream_account_id.unwrap_or_default()
        ),
    )
}

fn codex_identity_metadata(
    state: &AppState,
    account: &str,
    token: &crate::subscription::SubscriptionToken,
) -> (String, bool) {
    let claims = codex_identity_claims(&token.access_token).or_else(|| {
        let reader = codex_reader_for_account(state, account)?;
        let source = reader.read_document_for_import().ok()?;
        if source.token.access_token != token.access_token {
            return None;
        }
        let document = serde_json::from_str::<serde_json::Value>(&source.document).ok()?;
        let id_token = document.pointer("/tokens/id_token")?.as_str()?;
        codex_identity_claims(id_token)
    });
    let plan = claims
        .as_ref()
        .and_then(|claims| claims.get("chatgpt_plan_type"))
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|plan| !plan.is_empty() && plan.len() <= 128)
        .unwrap_or("unknown")
        .to_string();
    let fedramp = claims
        .as_ref()
        .and_then(|claims| claims.get("chatgpt_account_is_fedramp"))
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    (plan, fedramp)
}

fn codex_identity_claims(token: &str) -> Option<serde_json::Map<String, serde_json::Value>> {
    use base64::Engine as _;

    let payload = token.split('.').nth(1)?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload)
        .ok()?;
    let document = serde_json::from_slice::<serde_json::Value>(&bytes).ok()?;
    document
        .get("https://api.openai.com/auth")?
        .as_object()
        .cloned()
}

fn codex_reader_for_account(
    state: &AppState,
    account: &str,
) -> Option<crate::subscription::SubscriptionReader> {
    state
        .account_router
        .as_ref()
        .filter(|router| router.provider() == SubscriptionProvider::Codex)
        .and_then(|router| {
            router
                .subscription_readers()
                .into_iter()
                .find_map(|(name, reader)| (name == account).then_some(reader))
        })
        .or_else(|| {
            (account == crate::credential_recovery_store::PRIMARY_ACCOUNT)
                .then(|| {
                    state
                        .subscription_readers
                        .iter()
                        .find(|reader| reader.provider() == SubscriptionProvider::Codex)
                        .or_else(|| {
                            state
                                .subscription_reader
                                .as_ref()
                                .filter(|reader| reader.provider() == SubscriptionProvider::Codex)
                        })
                        .cloned()
                })
                .flatten()
        })
}

async fn target(
    state: &AppState,
    incoming: &HeaderMap,
    claims: &crate::token::TokenClaims,
    service: Service,
    uri: &axum::http::Uri,
    body: Option<&Bytes>,
    exact: Option<&AffinityDestination>,
) -> Result<(Target, AffinityDestination), Response> {
    match service {
        Service::OpenAi => provider_target(state, incoming, uri, exact),
        Service::Anthropic => {
            subscription_target(
                state,
                incoming,
                claims,
                SubscriptionProvider::Claude,
                service,
                uri,
                body,
                exact,
            )
            .await
        }
        Service::Codex | Service::CodexBackend => {
            subscription_target(
                state,
                incoming,
                claims,
                SubscriptionProvider::Codex,
                service,
                uri,
                body,
                exact,
            )
            .await
        }
    }
}

fn provider_target(
    state: &AppState,
    incoming: &HeaderMap,
    uri: &axum::http::Uri,
    exact: Option<&AffinityDestination>,
) -> Result<(Target, AffinityDestination), Response> {
    let provider = crate::provider_proxy::resolve_openai_compatible_provider(state)
        .map_err(|_| unavailable("the native OpenAI provider is unavailable"))?;
    if provider.kind != crate::providers::ProviderKind::OpenAICompatible {
        return Err(unavailable(
            "the selected provider does not implement native OpenAI resource APIs",
        ));
    }
    let key = provider
        .api_key
        .as_deref()
        .ok_or_else(|| unavailable("the native OpenAI provider credential is unavailable"))?;
    let destination = AffinityDestination::StoredProvider {
        name: provider.name.clone(),
        provider_kind: provider.kind,
        base_url: provider.base_url.clone(),
    };
    if exact.is_some_and(|expected| expected != &destination) {
        return Err(unavailable(
            "the native resource's exact provider is unavailable",
        ));
    }
    let path = strip_service_path(uri, Service::OpenAi);
    Ok((
        Target {
            client: state.client.clone(),
            url: crate::provider_proxy::join_openai_compatible_url(&provider.base_url, &path),
            headers: crate::proxy::native_request_headers(incoming, key),
        },
        destination,
    ))
}

#[allow(clippy::too_many_arguments)]
async fn subscription_target(
    state: &AppState,
    incoming: &HeaderMap,
    claims: &crate::token::TokenClaims,
    provider: SubscriptionProvider,
    service: Service,
    uri: &axum::http::Uri,
    body: Option<&Bytes>,
    exact: Option<&AffinityDestination>,
) -> Result<(Target, AffinityDestination), Response> {
    let exact_account = match exact {
        Some(AffinityDestination::Subscription {
            provider: expected,
            account,
            ..
        }) if *expected == provider => Some(account.as_str()),
        Some(_) => {
            return Err(unavailable(
                "the native resource's exact subscription is unavailable",
            ));
        }
        None => None,
    };
    let selected =
        selected_subscription_with_account(state, incoming, claims, provider, body, exact_account)
            .await?;
    let base = state
        .subscription_base_url
        .clone()
        .unwrap_or_else(|| selected.token.base_url(provider));
    let path = if service == Service::Codex {
        codex_subscription_path(uri)
    } else {
        strip_service_path(uri, service)
    };
    let url = if service == Service::CodexBackend {
        let root = base
            .strip_suffix("/codex")
            .unwrap_or(&base)
            .trim_end_matches('/');
        format!("{root}{path}")
    } else if service == Service::Codex
        && exact.is_some()
        && realtime_sideband(Service::Codex, uri.path(), uri.query())
            .ok()
            .flatten()
            .is_some()
    {
        format!("{}{path}", codex_realtime_origin(state))
    } else {
        crate::subscription_proxy::join_subscription_url(provider, &base, &path)
    };
    let mut headers = crate::proxy::native_request_headers(incoming, &selected.token.access_token);
    if provider == SubscriptionProvider::Codex {
        if let Some(account_id) = selected.token.account_id.as_deref()
            && let Ok(value) = HeaderValue::from_str(account_id)
        {
            headers.insert("chatgpt-account-id", value);
        }
        for (name, value) in crate::codex_identity::headers(selected.token.account_id.as_deref()) {
            if let Some(name) = name
                && name != "chatgpt-account-id"
                && !headers.contains_key(&name)
            {
                headers.insert(name, value);
            }
        }
    }
    let destination = AffinityDestination::Subscription {
        provider,
        account: selected.name,
        upstream_account_id: selected.token.account_id,
        base_url: base,
    };
    if exact.is_some_and(|expected| expected != &destination) {
        return Err(unavailable(
            "the native resource's exact subscription account changed",
        ));
    }
    Ok((
        Target {
            client: crate::upstream_client::subscription_client(
                &state.client,
                provider,
                state.subscription_base_url.is_some(),
            )
            .clone(),
            url,
            headers,
        },
        destination,
    ))
}

fn codex_realtime_origin(state: &AppState) -> String {
    let Some(configured) = state.subscription_base_url.as_deref() else {
        return "https://api.openai.com".to_string();
    };
    let Ok(mut url) = reqwest::Url::parse(configured) else {
        return configured.trim_end_matches('/').to_string();
    };
    url.set_path("");
    url.set_query(None);
    url.set_fragment(None);
    url.to_string().trim_end_matches('/').to_string()
}

fn codex_subscription_path(uri: &axum::http::Uri) -> String {
    if uri.path() != "/api/services/codex/v1/live" {
        return strip_service_path(uri, Service::Codex);
    }
    let mut path = "/v1/realtime/calls".to_string();
    path.push('?');
    if let Some(query) = uri.query() {
        path.push_str(query);
        path.push('&');
    }
    path.push_str("intent=quicksilver&architecture=avas");
    path
}

fn strip_service_path(uri: &axum::http::Uri, service: Service) -> String {
    let prefix = match service {
        Service::OpenAi => "/api/services/openai",
        Service::Anthropic => "/api/services/anthropic",
        Service::Codex => "/api/services/codex",
        Service::CodexBackend => "/api/services/codex/backend-api",
    };
    let mut path = uri
        .path()
        .strip_prefix(prefix)
        .unwrap_or_else(|| uri.path())
        .to_string();
    if service == Service::CodexBackend {
        // The configured ChatGPT root already ends in `/backend-api`.
    } else if service == Service::Codex && !path.starts_with("/v1/") {
        path.insert_str(0, "/v1");
    }
    if let Some(query) = uri.query() {
        path.push('?');
        path.push_str(query);
    }
    path
}

fn codex_account_pin(
    state: &AppState,
    headers: &HeaderMap,
    principal: &str,
) -> Result<Option<String>, Response> {
    let values = headers.get_all("chatgpt-account-id");
    let mut values = values.iter();
    let Some(handle) = values.next() else {
        return Ok(None);
    };
    if values.next().is_some() {
        return Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "exactly one Router-issued Codex account handle is required",
        ));
    }
    let handle = handle.to_str().map_err(|_| {
        error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the Codex account handle is invalid",
        )
    })?;
    let accounts = state
        .account_router
        .as_ref()
        .filter(|router| router.provider() == SubscriptionProvider::Codex)
        .map_or_else(
            || {
                codex_reader_for_account(state, crate::credential_recovery_store::PRIMARY_ACCOUNT)
                    .map(|reader| {
                        vec![(
                            crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
                            reader,
                        )]
                    })
                    .unwrap_or_default()
            },
            crate::accounts::AccountRouter::subscription_readers,
        );
    accounts
        .into_iter()
        .find(|(account, reader)| {
            let account_id = reader.read_token().ok().and_then(|token| token.account_id);
            codex_account_handle(principal, account, account_id.as_deref()) == handle
        })
        .map(|(account, _)| Some(account))
        .ok_or_else(|| {
            error(
                StatusCode::FORBIDDEN,
                "permission_error",
                "the Codex account handle is not valid for this Router principal",
            )
        })
}

fn codex_history_notes_operation(path: &str) -> Option<&'static str> {
    match path {
        "/api/services/codex/v1/alpha/history/v2/list_windows" => {
            Some("codex.history.list_windows")
        }
        "/api/services/codex/v1/alpha/history/v2/list_items" => Some("codex.history.list_items"),
        "/api/services/codex/v1/alpha/history/v2/read_item" => Some("codex.history.read_item"),
        "/api/services/codex/v1/alpha/history/v2/search_contents" => {
            Some("codex.history.search_contents")
        }
        "/api/services/codex/v1/alpha/notes/v2/thread_hint" => Some("codex.notes.thread_hint"),
        "/api/services/codex/v1/alpha/notes/v2/list_files_by_prefix" => {
            Some("codex.notes.list_files_by_prefix")
        }
        "/api/services/codex/v1/alpha/notes/v2/read_file" => Some("codex.notes.read_file"),
        "/api/services/codex/v1/alpha/notes/v2/search_contents" => {
            Some("codex.notes.search_contents")
        }
        "/api/services/codex/v1/alpha/notes/v2/append_to_file" => {
            Some("codex.notes.append_to_file")
        }
        "/api/services/codex/v1/alpha/notes/v2/write_file" => Some("codex.notes.write_file"),
        _ => None,
    }
}

pub async fn selected_subscription(
    state: &AppState,
    headers: &HeaderMap,
    claims: &crate::token::TokenClaims,
    provider: SubscriptionProvider,
    body: Option<&Bytes>,
) -> Result<crate::accounts::SelectedSubscriptionAccount, Response> {
    selected_subscription_with_account(state, headers, claims, provider, body, None).await
}

async fn selected_subscription_with_account(
    state: &AppState,
    headers: &HeaderMap,
    claims: &crate::token::TokenClaims,
    provider: SubscriptionProvider,
    body: Option<&Bytes>,
    exact_account: Option<&str>,
) -> Result<crate::accounts::SelectedSubscriptionAccount, Response> {
    let (client, principal) = crate::client_policy::bound_client(claims)
        .map_err(|message| error(StatusCode::FORBIDDEN, "permission_error", &message))?;
    let protocol = if provider == SubscriptionProvider::Claude {
        crate::client_policy::ClientProtocol::AnthropicMessages
    } else {
        crate::client_policy::ClientProtocol::OpenAIResponses
    };
    let policy = state
        .provider_store
        .subscription_entitlement_policy()
        .map_err(|_| unavailable("subscription policy is unavailable"))?;
    if policy.decide(Some(client), provider, protocol)
        != crate::client_policy::EntitlementDecision::Native
    {
        return Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "native service access is not entitled for this client and provider",
        ));
    }
    let pinned = state
        .token_manager
        .account_for(&claims.sub)
        .map_err(|_| unavailable("token account binding is unavailable"))?;
    let handle_pin = if provider == SubscriptionProvider::Codex {
        codex_account_pin(state, headers, principal)?
    } else {
        None
    };
    let pinned = if let Some(exact) = exact_account {
        if pinned.as_deref().is_some_and(|token| token != exact)
            || handle_pin.as_deref().is_some_and(|handle| handle != exact)
        {
            return Err(error(
                StatusCode::FORBIDDEN,
                "permission_error",
                "the native resource account does not match this Router token",
            ));
        }
        Some(exact.to_string())
    } else {
        match (pinned, handle_pin) {
            (Some(token), Some(handle)) if token != handle => {
                return Err(error(
                    StatusCode::FORBIDDEN,
                    "permission_error",
                    "the Codex account handle does not match this Router token",
                ));
            }
            (Some(token), _) => Some(token),
            (None, handle) => handle,
        }
    };
    let routing_body = body
        .and_then(|body| serde_json::from_slice::<serde_json::Value>(body).ok())
        .unwrap_or_else(|| serde_json::json!({}));
    let context = crate::proxy::request_routing_context(headers, &routing_body, pinned);
    let mut selected = if let Some(router) = state
        .account_router
        .as_ref()
        .filter(|router| router.provider() == provider)
    {
        router
            .select_subscription_where_authoritative(&context, &state.subscription_cache, |_| true)
            .await
            .map_err(|_| unavailable("the bound subscription account is unavailable"))?
    } else {
        if context
            .pinned_account
            .as_deref()
            .is_some_and(|name| name != crate::credential_recovery_store::PRIMARY_ACCOUNT)
        {
            return Err(unavailable("the bound subscription account is unavailable"));
        }
        let reader = state
            .subscription_readers
            .iter()
            .find(|reader| reader.provider() == provider)
            .or_else(|| {
                state
                    .subscription_reader
                    .as_ref()
                    .filter(|reader| reader.provider() == provider)
            })
            .ok_or_else(|| unavailable("the native subscription is not configured"))?;
        let account = crate::credential_recovery_store::PRIMARY_ACCOUNT;
        state.subscription_cache.register_reader(account, reader);
        let token = state
            .subscription_cache
            .load_authoritative(provider, account)
            .await
            .map_err(|_| unavailable("the native subscription credential is unreadable"))?
            .ok_or_else(|| unavailable("the native subscription credential is absent"))?;
        crate::accounts::SelectedSubscriptionAccount {
            name: account.to_string(),
            token,
        }
    };
    selected.token = state
        .subscription_cache
        .get_fresh_loaded(
            &state.client,
            provider,
            &selected.name,
            selected.token,
            chrono::Utc::now().timestamp_millis(),
        )
        .await
        .map_err(|_| unavailable("the native subscription credential cannot refresh"))?;
    Ok(selected)
}

pub async fn relay_http(
    state: &AppState,
    method: &Method,
    body: Bytes,
    target: Target,
) -> Response {
    relay_native_http(state, method, NativeRequestBody::Memory(body), target, None).await
}

async fn relay_native_http(
    state: &AppState,
    method: &Method,
    body: NativeRequestBody,
    target: Target,
    usage_token_id: Option<&str>,
) -> Response {
    let body_len = body.len();
    let request = target
        .client
        .request(
            reqwest::Method::from_bytes(method.as_str().as_bytes()).expect("valid HTTP method"),
            target.url,
        )
        .headers(target.headers);
    let upstream = match body {
        NativeRequestBody::Memory(bytes) => request.body(bytes).send().await,
        NativeRequestBody::Spool { file, .. } => {
            let Ok(reopened) = file.reopen() else {
                return unavailable("the temporary upload spool could not be opened");
            };
            let async_file = tokio::fs::File::from_std(reopened);
            let result = request.body(async_file).send().await;
            drop(file);
            result
        }
    };
    let Ok(upstream) = upstream else {
        return unavailable("native service upstream request failed");
    };
    let status = StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let headers = crate::proxy::relay_response_headers(upstream.headers());
    let metrics = std::sync::Arc::clone(&state.metrics);
    let mut usage = usage_token_id
        .map(|token_id| crate::usage::UsageTracker::new(state.token_manager.clone(), token_id));
    let stream = upstream.bytes_stream().map(move |chunk| {
        if let Ok(bytes) = &chunk {
            metrics.record_bytes(0, bytes.len() as u64);
            if let Some(usage) = usage.as_mut() {
                usage.feed(bytes);
            }
        }
        chunk
    });
    let mut response = Response::new(Body::from_stream(stream));
    *response.status_mut() = status;
    *response.headers_mut() = headers;
    state.metrics.record_bytes(body_len as u64, 0);
    response
}

fn is_websocket(headers: &HeaderMap) -> bool {
    headers
        .get("upgrade")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.eq_ignore_ascii_case("websocket"))
}

pub async fn upgrade_websocket(
    state: AppState,
    request: Request,
    target: Target,
    usage_token_id: Option<String>,
) -> Response {
    let (mut parts, _) = request.into_parts();
    let upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &state).await {
        Ok(upgrade) => upgrade,
        Err(rejection) => return rejection.into_response(),
    };
    let limit = state.max_proxy_request_bytes;
    let (upstream, upstream_headers) = match connect_upstream_websocket(target, limit).await {
        Ok(connected) => connected,
        Err(response) => return response,
    };
    let token_manager = state.token_manager.clone();
    let metrics = Arc::clone(&state.metrics);
    let mut response = upgrade
        .max_message_size(limit)
        .max_frame_size(limit)
        .on_upgrade(move |downstream| {
            websocket_session(downstream, upstream, token_manager, usage_token_id, metrics)
        });
    for (name, value) in upstream_headers {
        if let Some(name) = name {
            response.headers_mut().append(name, value);
        }
    }
    response
}

async fn connect_upstream_websocket(
    target: Target,
    limit: usize,
) -> Result<(UpstreamWebSocket, HeaderMap), Response> {
    let Ok(mut request) = websocket_url(&target.url)
        .and_then(|url| url.into_client_request().map_err(|error| error.to_string()))
    else {
        return Err(error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "invalid upstream WebSocket URL",
        ));
    };
    for (name, value) in target.headers {
        if let Some(name) = name {
            request.headers_mut().append(name, value);
        }
    }
    let config = tungstenite::protocol::WebSocketConfig::default()
        .max_message_size(Some(limit))
        .max_frame_size(Some(limit))
        .max_write_buffer_size(limit.saturating_mul(2));
    let connected = tokio::time::timeout(
        CONNECT_TIMEOUT,
        tokio_tungstenite::connect_async_with_config(request, Some(config), false),
    )
    .await;
    match connected {
        Err(_) => Err(error(
            StatusCode::GATEWAY_TIMEOUT,
            "api_error",
            "upstream WebSocket connection timed out",
        )),
        Ok(Err(tungstenite::Error::Http(upstream))) => Err(websocket_http_failure(*upstream)),
        Ok(Err(_)) => Err(unavailable("upstream WebSocket connection failed")),
        Ok(Ok((upstream, response))) => {
            let mut headers = crate::proxy::relay_response_headers(response.headers());
            for generated in [
                "sec-websocket-accept",
                "sec-websocket-key",
                "sec-websocket-version",
                "sec-websocket-extensions",
            ] {
                headers.remove(generated);
            }
            Ok((upstream, headers))
        }
    }
}

fn websocket_http_failure(upstream: http::Response<Option<Vec<u8>>>) -> Response {
    let (parts, body) = upstream.into_parts();
    let status = StatusCode::from_u16(parts.status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
    let mut response = Response::new(Body::from(body.unwrap_or_default()));
    *response.status_mut() = status;
    *response.headers_mut() = crate::proxy::relay_response_headers(&parts.headers);
    response
}

async fn websocket_session(
    mut downstream: WebSocket,
    mut upstream: UpstreamWebSocket,
    token_manager: crate::token::TokenManager,
    usage_token_id: Option<String>,
    metrics: Arc<crate::metrics::Metrics>,
) {
    let mut completed_responses = std::collections::HashSet::new();
    loop {
        tokio::select! {
            message = downstream.next() => {
                let Some(Ok(message)) = message else {
                    let _ = upstream.close(None).await;
                    break;
                };
                let message_bytes = websocket_message_len(&message);
                if let (Some(token_id), Message::Text(text)) = (&usage_token_id, &message)
                    && serde_json::from_slice::<serde_json::Value>(text.as_bytes())
                        .ok()
                        .and_then(|event| event.get("type").and_then(serde_json::Value::as_str).map(str::to_string))
                        .as_deref()
                        == Some("response.create")
                    && token_manager.enforce_request_budget(token_id).is_err()
                {
                    close(&mut downstream, 1008, "Router token budget is exhausted").await;
                    let _ = upstream.close(None).await;
                    break;
                }
                let closes = matches!(message, Message::Close(_));
                if upstream.send(downstream_message(message)).await.is_err() || closes {
                    break;
                }
                metrics.record_bytes(message_bytes, 0);
            }
            message = upstream.next() => {
                let Some(Ok(message)) = message else {
                    close(&mut downstream, 1011, "upstream WebSocket disconnected").await;
                    break;
                };
                let message_bytes = tungstenite_message_len(&message);
                let budget_exhausted = if let (Some(token_id), tungstenite::Message::Text(text)) =
                    (&usage_token_id, &message)
                {
                    record_realtime_usage(
                        &token_manager,
                        token_id,
                        &mut completed_responses,
                        text.as_bytes(),
                    )
                } else {
                    false
                };
                let closes = matches!(message, tungstenite::Message::Close(_));
                if downstream.send(upstream_message(message)).await.is_err() || closes {
                    break;
                }
                metrics.record_bytes(0, message_bytes);
                if budget_exhausted {
                    close(&mut downstream, 1008, "Router token budget is exhausted").await;
                    let _ = upstream.close(None).await;
                    break;
                }
            }
        }
    }
}

fn record_realtime_usage(
    token_manager: &crate::token::TokenManager,
    token_id: &str,
    completed_responses: &mut std::collections::HashSet<String>,
    bytes: &[u8],
) -> bool {
    let Ok(event) = serde_json::from_slice::<serde_json::Value>(bytes) else {
        return false;
    };
    if event.get("type").and_then(serde_json::Value::as_str) != Some("response.done") {
        return false;
    }
    let key = event
        .pointer("/response/id")
        .and_then(serde_json::Value::as_str)
        .filter(|id| !id.is_empty())
        .map_or_else(|| hex::encode(Sha256::digest(bytes)), str::to_string);
    if !completed_responses.insert(key) {
        return false;
    }
    if let Some(tokens) = crate::usage::token_count(&event)
        && let Err(error) = token_manager.settle_token_usage(token_id, 0, tokens)
    {
        tracing::warn!(token_id, "failed to persist Realtime token usage: {error}");
    }
    token_manager.enforce_request_budget(token_id).is_err()
}

fn websocket_message_len(message: &Message) -> u64 {
    match message {
        Message::Text(text) => text.len() as u64,
        Message::Binary(bytes) | Message::Ping(bytes) | Message::Pong(bytes) => bytes.len() as u64,
        Message::Close(_) => 0,
    }
}

fn tungstenite_message_len(message: &tungstenite::Message) -> u64 {
    match message {
        tungstenite::Message::Text(text) => text.len() as u64,
        tungstenite::Message::Binary(bytes)
        | tungstenite::Message::Ping(bytes)
        | tungstenite::Message::Pong(bytes) => bytes.len() as u64,
        tungstenite::Message::Close(_) | tungstenite::Message::Frame(_) => 0,
    }
}

fn downstream_message(message: Message) -> tungstenite::Message {
    match message {
        Message::Text(text) => tungstenite::Message::Text(text.to_string().into()),
        Message::Binary(bytes) => tungstenite::Message::Binary(bytes.to_vec().into()),
        Message::Ping(bytes) => tungstenite::Message::Ping(bytes.to_vec().into()),
        Message::Pong(bytes) => tungstenite::Message::Pong(bytes.to_vec().into()),
        Message::Close(frame) => {
            tungstenite::Message::Close(frame.map(|frame| tungstenite::protocol::CloseFrame {
                code: frame.code.into(),
                reason: frame.reason.to_string().into(),
            }))
        }
    }
}

fn upstream_message(message: tungstenite::Message) -> Message {
    match message {
        tungstenite::Message::Text(text) => Message::Text(text.to_string().into()),
        tungstenite::Message::Binary(bytes) => Message::Binary(bytes.to_vec().into()),
        tungstenite::Message::Ping(bytes) => Message::Ping(bytes.to_vec().into()),
        tungstenite::Message::Pong(bytes) => Message::Pong(bytes.to_vec().into()),
        tungstenite::Message::Close(frame) => Message::Close(frame.map(|frame| CloseFrame {
            code: frame.code.into(),
            reason: frame.reason.to_string().into(),
        })),
        tungstenite::Message::Frame(_) => Message::Close(Some(CloseFrame {
            code: 1011,
            reason: "unexpected raw upstream frame".into(),
        })),
    }
}

async fn close(socket: &mut WebSocket, code: u16, reason: &'static str) {
    let _ = socket
        .send(Message::Close(Some(CloseFrame {
            code,
            reason: reason.into(),
        })))
        .await;
}

fn websocket_url(url: &str) -> Result<String, String> {
    let mut url = reqwest::Url::parse(url).map_err(|error| error.to_string())?;
    let scheme = match url.scheme() {
        "https" => "wss",
        "http" => "ws",
        _ => return Err("unsupported WebSocket scheme".into()),
    };
    url.set_scheme(scheme)
        .map_err(|()| "could not set WebSocket scheme".to_string())?;
    Ok(url.to_string())
}

fn rewrite_realtime_location(
    service: Service,
    request_path: &str,
    response: &mut Response,
) -> Result<(), Response> {
    let Some(location) = response.headers().get("location") else {
        return Ok(());
    };
    let location = location.to_str().map_err(|_| {
        error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "upstream Realtime call Location is invalid",
        )
    })?;
    let (path, query) = location
        .split_once('?')
        .map_or((location, None), |(path, query)| (path, Some(query)));
    let call_id = path
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .filter(|call_id| !call_id.is_empty())
        .ok_or_else(|| {
            error(
                StatusCode::BAD_GATEWAY,
                "api_error",
                "upstream Realtime call Location has no call id",
            )
        })?;
    let router_base = match (service, request_path) {
        (Service::OpenAi, "/api/services/openai/v1/realtime/calls") => {
            "/api/services/openai/v1/realtime/calls"
        }
        (Service::Codex, "/api/services/codex/v1/realtime/calls") => {
            "/api/services/codex/v1/realtime/calls"
        }
        (Service::Codex, "/api/services/codex/v1/live") => "/api/services/codex/v1/live",
        _ => return Ok(()),
    };
    let mut rewritten = format!("{router_base}/{call_id}");
    if let Some(query) = query {
        rewritten.push('?');
        rewritten.push_str(query);
    }
    let value = HeaderValue::from_str(&rewritten).map_err(|_| {
        error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "upstream Realtime call Location cannot be relayed safely",
        )
    })?;
    response.headers_mut().insert("location", value);
    Ok(())
}

fn unavailable(message: &str) -> Response {
    error(StatusCode::SERVICE_UNAVAILABLE, "api_error", message)
}

fn not_found() -> Response {
    error(StatusCode::NOT_FOUND, "not_found_error", "route not found")
}

fn error(status: StatusCode, error_type: &str, message: &str) -> Response {
    crate::api_error::PresentedError {
        status,
        error_type,
        message,
    }
    .render(crate::api_error::ApiDialect::OpenAi)
}

fn anthropic_error(status: StatusCode, error_type: &str, message: &str) -> Response {
    crate::api_error::PresentedError {
        status,
        error_type,
        message,
    }
    .render(crate::api_error::ApiDialect::Anthropic)
}

#[cfg(test)]
mod tests {
    use super::*;
    use http_body_util::BodyExt as _;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::{Arc, Mutex};

    #[path = "native_service_private_tests.rs"]
    mod private_logging;

    #[test]
    fn every_history_notes_path_has_one_redacted_operation_name() {
        let paths = [
            ("history/v2/list_windows", "codex.history.list_windows"),
            ("history/v2/list_items", "codex.history.list_items"),
            ("history/v2/read_item", "codex.history.read_item"),
            (
                "history/v2/search_contents",
                "codex.history.search_contents",
            ),
            ("notes/v2/thread_hint", "codex.notes.thread_hint"),
            (
                "notes/v2/list_files_by_prefix",
                "codex.notes.list_files_by_prefix",
            ),
            ("notes/v2/read_file", "codex.notes.read_file"),
            ("notes/v2/search_contents", "codex.notes.search_contents"),
            ("notes/v2/append_to_file", "codex.notes.append_to_file"),
            ("notes/v2/write_file", "codex.notes.write_file"),
        ];
        for (suffix, operation) in paths {
            assert_eq!(
                codex_history_notes_operation(&format!("/api/services/codex/v1/alpha/{suffix}")),
                Some(operation)
            );
        }
        assert_eq!(
            codex_history_notes_operation("/api/services/codex/v1/responses"),
            None
        );
    }

    #[test]
    fn native_resource_routes_have_exact_create_and_lifecycle_contracts() {
        let cases = [
            (
                Method::POST,
                "/api/services/openai/v1/realtime/calls",
                ResponseNamespace::OpenAiRealtimeCalls,
                NativeResourceAction::Create,
                None,
            ),
            (
                Method::POST,
                "/api/services/openai/v1/realtime/calls/call_1/accept",
                ResponseNamespace::OpenAiRealtimeCalls,
                NativeResourceAction::Use,
                Some("call_1"),
            ),
            (
                Method::POST,
                "/api/services/anthropic/v1/files",
                ResponseNamespace::AnthropicFiles,
                NativeResourceAction::Create,
                None,
            ),
            (
                Method::GET,
                "/api/services/anthropic/v1/files/file_1/content",
                ResponseNamespace::AnthropicFiles,
                NativeResourceAction::Use,
                Some("file_1"),
            ),
            (
                Method::DELETE,
                "/api/services/anthropic/v1/files/file_1",
                ResponseNamespace::AnthropicFiles,
                NativeResourceAction::Delete,
                Some("file_1"),
            ),
            (
                Method::POST,
                "/api/services/anthropic/v1/messages/batches",
                ResponseNamespace::AnthropicBatches,
                NativeResourceAction::Create,
                None,
            ),
            (
                Method::POST,
                "/api/services/anthropic/v1/messages/batches/batch_1/cancel",
                ResponseNamespace::AnthropicBatches,
                NativeResourceAction::Use,
                Some("batch_1"),
            ),
            (
                Method::POST,
                "/api/services/anthropic/v1/skills/skill_1/versions",
                ResponseNamespace::AnthropicSkillVersions,
                NativeResourceAction::Create,
                Some("skill_1"),
            ),
            (
                Method::DELETE,
                "/api/services/anthropic/v1/skills/skill_1",
                ResponseNamespace::AnthropicSkills,
                NativeResourceAction::Delete,
                Some("skill_1"),
            ),
            (
                Method::DELETE,
                "/api/services/anthropic/v1/skills/skill_1/versions/7",
                ResponseNamespace::AnthropicSkillVersions,
                NativeResourceAction::Delete,
                Some("7"),
            ),
            (
                Method::GET,
                "/api/services/anthropic/v1/skills/skill_1/versions/7/content",
                ResponseNamespace::AnthropicSkillVersions,
                NativeResourceAction::Use,
                Some("7"),
            ),
            (
                Method::POST,
                "/api/services/codex/backend-api/files",
                ResponseNamespace::CodexFiles,
                NativeResourceAction::Create,
                None,
            ),
            (
                Method::POST,
                "/api/services/codex/backend-api/files/file_1/uploaded",
                ResponseNamespace::CodexFiles,
                NativeResourceAction::Use,
                Some("file_1"),
            ),
        ];
        for (method, path, namespace, action, id) in cases {
            let request = native_resource_request(&method, path)
                .unwrap_or_else(|| panic!("missing native resource contract for {method} {path}"));
            assert_eq!(request.namespace, namespace, "{method} {path}");
            assert_eq!(request.action, action, "{method} {path}");
            assert_eq!(request.id.as_deref(), id, "{method} {path}");
        }

        for (method, path) in [
            (Method::GET, "/api/services/anthropic/v1/files"),
            (Method::GET, "/api/services/anthropic/v1/messages/batches"),
            (Method::GET, "/api/services/anthropic/v1/skills"),
            (Method::POST, "/api/services/openai/v1/images/generations"),
        ] {
            assert!(
                native_resource_request(&method, path).is_none(),
                "{method} {path}"
            );
        }
    }

    #[test]
    fn responses_helpers_pin_native_compaction_to_existing_state() {
        assert_eq!(
            created_response_namespace(
                Service::OpenAi,
                "/api/services/openai/v1/responses/compact"
            ),
            Some(ResponseNamespace::OpenAiResponses)
        );
        assert_eq!(
            created_response_namespace(Service::Codex, "/api/services/codex/v1/responses/compact"),
            Some(ResponseNamespace::CodexResponses)
        );
        assert_eq!(
            response_references(
                Service::OpenAi,
                "/api/services/openai/v1/responses/compact",
                br#"{"previous_response_id":"resp_1"}"#,
            ),
            vec![(ResponseNamespace::OpenAiResponses, "resp_1".to_string())]
        );
        assert_eq!(
            response_references(
                Service::Codex,
                "/api/services/codex/v1/responses/compact",
                br#"{"previous_response_id":"resp_2"}"#,
            ),
            vec![(ResponseNamespace::CodexResponses, "resp_2".to_string())]
        );
        assert_eq!(
            response_references(
                Service::OpenAi,
                "/api/services/openai/v1/images/generations",
                br#"{"previous_response_id":"resp_3"}"#,
            ),
            vec![]
        );
        assert_eq!(
            response_references(
                Service::OpenAi,
                "/api/services/openai/v1/responses/input_tokens",
                br#"{"previous_response_id":"resp_4","conversation":{"id":"conv_1"}}"#,
            ),
            vec![
                (ResponseNamespace::OpenAiResponses, "resp_4".to_string()),
                (ResponseNamespace::OpenAiConversations, "conv_1".to_string()),
            ]
        );
        assert_eq!(
            response_references(
                Service::OpenAi,
                "/api/services/openai/v1/responses/input_tokens",
                br#"{"conversation":"conv_2"}"#,
            ),
            vec![(ResponseNamespace::OpenAiConversations, "conv_2".to_string())]
        );
    }

    #[test]
    fn native_json_operations_reject_malformed_or_non_object_bodies_locally() {
        for (service, path) in [
            (Service::OpenAi, "/api/services/openai/v1/responses/compact"),
            (
                Service::OpenAi,
                "/api/services/openai/v1/responses/input_tokens",
            ),
            (
                Service::OpenAi,
                "/api/services/openai/v1/images/generations",
            ),
            (Service::OpenAi, "/api/services/openai/v1/audio/speech"),
            (Service::Codex, "/api/services/codex/v1/responses/compact"),
            (Service::Codex, "/api/services/codex/v1/images/generations"),
            (Service::Codex, "/api/services/codex/v1/images/edits"),
            (Service::Codex, "/api/services/codex/v1/alpha/search"),
        ] {
            assert!(requires_json_object(service, &Method::POST, path), "{path}");
        }
        assert!(!requires_json_object(
            Service::OpenAi,
            &Method::POST,
            "/api/services/openai/v1/images/edits"
        ));
        assert!(!requires_json_object(
            Service::OpenAi,
            &Method::POST,
            "/api/services/openai/v1/realtime/calls"
        ));
        for body in [br"[]".as_slice(), br"null", br"not-json"] {
            assert!(
                !serde_json::from_slice::<serde_json::Value>(body)
                    .is_ok_and(|value| value.is_object())
            );
        }
    }

    #[test]
    fn realtime_sideband_routes_extract_only_their_opaque_call_id() {
        assert_eq!(
            realtime_sideband(
                Service::OpenAi,
                "/api/services/openai/v1/realtime",
                Some("model=future&call_id=call%2Done&extra=1"),
            )
            .unwrap(),
            Some((
                ResponseNamespace::OpenAiRealtimeCalls,
                "call-one".to_string()
            ))
        );
        assert_eq!(
            realtime_sideband(Service::Codex, "/api/services/codex/v1/live/call_2", None,).unwrap(),
            Some((ResponseNamespace::CodexRealtimeCalls, "call_2".to_string()))
        );
        assert_eq!(
            realtime_sideband(
                Service::Codex,
                "/api/services/codex/v1/realtime",
                Some("model=gpt-future"),
            )
            .unwrap(),
            None
        );
        assert!(
            realtime_sideband(
                Service::Codex,
                "/api/services/codex/v1/realtime",
                Some("call_id=one&call_id=two"),
            )
            .is_err()
        );
    }

    #[tokio::test]
    async fn codex_realtime_multipart_becomes_the_exact_backend_json_envelope() {
        let multipart = concat!(
            "--codex-boundary\r\n",
            "Content-Disposition: form-data; name=\"sdp\"\r\n",
            "Content-Type: application/sdp\r\n\r\n",
            "v=0\r\na=opaque:future\r\n",
            "\r\n--codex-boundary\r\n",
            "Content-Disposition: form-data; name=\"session\"\r\n",
            "Content-Type: application/json\r\n\r\n",
            r#"{"type":"realtime","future":{"nested":[1,true,"kept"]}}"#,
            "\r\n--codex-boundary--\r\n",
        );
        let mut headers = HeaderMap::new();
        headers.insert(
            "content-type",
            HeaderValue::from_static("multipart/form-data; boundary=codex-boundary"),
        );
        let body = collect_native_body(Body::from(multipart), 4096, true)
            .await
            .unwrap();

        let translated = translate_codex_realtime_call(&mut headers, body)
            .await
            .unwrap();

        assert_eq!(headers.get("content-type").unwrap(), "application/json");
        let NativeRequestBody::Memory(bytes) = translated else {
            panic!("translated backend JSON must be held in memory");
        };
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&bytes).unwrap(),
            serde_json::json!({
                "sdp": "v=0\r\na=opaque:future\r\n",
                "session": {
                    "type": "realtime",
                    "future": {"nested": [1, true, "kept"]}
                }
            })
        );
    }

    #[test]
    fn codex_live_call_maps_to_backend_create_without_reencoding_existing_query() {
        let uri: axum::http::Uri = "/api/services/codex/v1/live?future=one&future=two%2Bthree"
            .parse()
            .unwrap();
        assert_eq!(
            codex_subscription_path(&uri),
            "/v1/realtime/calls?future=one&future=two%2Bthree&intent=quicksilver&architecture=avas"
        );

        let legacy: axum::http::Uri =
            "/api/services/codex/v1/realtime/calls?intent=quicksilver&architecture=avas"
                .parse()
                .unwrap();
        assert_eq!(
            codex_subscription_path(&legacy),
            "/v1/realtime/calls?intent=quicksilver&architecture=avas"
        );
    }

    #[test]
    fn realtime_call_location_is_rewritten_to_the_corresponding_router_path() {
        for (service, request_path, expected) in [
            (
                Service::OpenAi,
                "/api/services/openai/v1/realtime/calls",
                "/api/services/openai/v1/realtime/calls/rtc_openai?trace=one",
            ),
            (
                Service::Codex,
                "/api/services/codex/v1/realtime/calls",
                "/api/services/codex/v1/realtime/calls/rtc_codex?trace=two",
            ),
            (
                Service::Codex,
                "/api/services/codex/v1/live",
                "/api/services/codex/v1/live/rtc_live?trace=three",
            ),
        ] {
            let id = expected
                .split('?')
                .next()
                .unwrap()
                .rsplit('/')
                .next()
                .unwrap();
            let query = expected.split_once('?').unwrap().1;
            let mut response = Response::new(Body::from("v=answer\r\n"));
            response.headers_mut().insert(
                "location",
                HeaderValue::from_str(&format!(
                    "https://upstream.example/v1/realtime/calls/calls/{id}?{query}"
                ))
                .unwrap(),
            );

            rewrite_realtime_location(service, request_path, &mut response).unwrap();

            assert_eq!(
                response.headers().get("location").unwrap(),
                expected,
                "{request_path}"
            );
        }
    }

    #[tokio::test]
    async fn codex_live_call_is_translated_pinned_and_rewritten_end_to_end() {
        let seen = Arc::new(Mutex::new(None));
        let upstream_seen = Arc::clone(&seen);
        let upstream = axum::Router::new().fallback(
            move |method: Method,
                  uri: axum::http::Uri,
                  headers: HeaderMap,
                  body: Bytes| {
                let seen = Arc::clone(&upstream_seen);
                async move {
                    *seen.lock().unwrap() = Some((method, uri, headers, body));
                    (
                        StatusCode::CREATED,
                        [
                            ("content-type", "application/sdp"),
                            (
                                "location",
                                "https://chatgpt.example/backend-api/codex/realtime/calls/calls/rtc_e2e?opaque=kept",
                            ),
                        ],
                        "v=answer\r\n",
                    )
                }
            },
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let origin = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

        let data = tempfile::tempdir().unwrap();
        let codex_home = tempfile::tempdir().unwrap();
        std::fs::write(
            codex_home.path().join("auth.json"),
            serde_json::json!({
                "tokens": {
                    "access_token": "codex-realtime-upstream",
                    "account_id": "account-realtime"
                }
            })
            .to_string(),
        )
        .unwrap();
        let reader = crate::subscription::SubscriptionReader::new(
            SubscriptionProvider::Codex,
            codex_home.path(),
        );
        let mut state = AppState::for_tests(data.path());
        state.upstream_provider = crate::config::UpstreamProvider::Codex;
        state.subscription_base_url = Some(format!("{origin}/backend-api/codex"));
        state.subscription_reader = Some(reader.clone());
        state.subscription_readers = vec![reader];
        let token =
            crate::model_routing::tests::bound_client_token(&state, ClientKind::Codex, None);
        let multipart = concat!(
            "--codex-boundary\r\n",
            "Content-Disposition: form-data; name=\"sdp\"\r\n",
            "Content-Type: application/sdp\r\n\r\n",
            "v=offer\r\n",
            "\r\n--codex-boundary\r\n",
            "Content-Disposition: form-data; name=\"session\"\r\n",
            "Content-Type: application/json\r\n\r\n",
            r#"{"type":"realtime","future":{"preserved":true}}"#,
            "\r\n--codex-boundary--\r\n",
        );
        let request = Request::builder()
            .method(Method::POST)
            .uri("/api/services/codex/v1/live?future=one&future=two%2Bthree")
            .header("authorization", format!("Bearer {token}"))
            .header("user-agent", "codex-cli/exact-fixture")
            .header("originator", "codex_cli_rs")
            .header("x-session-id", "session-opaque")
            .header(
                "content-type",
                "multipart/form-data; boundary=codex-boundary",
            )
            .body(Body::from(multipart))
            .unwrap();

        let response = codex(State(state), request).await;

        assert_eq!(response.status(), StatusCode::CREATED);
        assert_eq!(
            response.headers().get("content-type").unwrap(),
            "application/sdp"
        );
        assert_eq!(
            response.headers().get("location").unwrap(),
            "/api/services/codex/v1/live/rtc_e2e?opaque=kept"
        );
        assert_eq!(
            response.into_body().collect().await.unwrap().to_bytes(),
            "v=answer\r\n"
        );
        let (method, uri, headers, body) = seen.lock().unwrap().take().unwrap();
        assert_eq!(method, Method::POST);
        assert_eq!(
            uri.to_string(),
            "/backend-api/codex/realtime/calls?future=one&future=two%2Bthree&intent=quicksilver&architecture=avas"
        );
        assert_eq!(
            headers.get("authorization").unwrap(),
            "Bearer codex-realtime-upstream"
        );
        assert_eq!(
            headers.get("chatgpt-account-id").unwrap(),
            "account-realtime"
        );
        assert_eq!(
            headers.get("user-agent").unwrap(),
            "codex-cli/exact-fixture"
        );
        assert_eq!(headers.get("originator").unwrap(), "codex_cli_rs");
        assert_eq!(headers.get("x-session-id").unwrap(), "session-opaque");
        assert!(headers.get("x-link-assistant-client").is_none());
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&body).unwrap(),
            serde_json::json!({
                "sdp": "v=offer\r\n",
                "session": {"type": "realtime", "future": {"preserved": true}}
            })
        );
        server.abort();
    }

    #[tokio::test]
    async fn native_file_lifecycle_is_principal_scoped_and_account_pinned() {
        let seen = Arc::new(Mutex::new(Vec::<String>::new()));
        let upstream_seen = Arc::clone(&seen);
        let upstream = axum::Router::new().fallback(
            move |method: Method, uri: axum::http::Uri, headers: HeaderMap| {
                let seen = Arc::clone(&upstream_seen);
                async move {
                    seen.lock().unwrap().push(
                        headers
                            .get("authorization")
                            .and_then(|value| value.to_str().ok())
                            .unwrap_or_default()
                            .to_string(),
                    );
                    match (method, uri.path()) {
                        (Method::POST, "/v1/files") => (
                            StatusCode::OK,
                            [("content-type", "application/json")],
                            r#"{"id":"file_native_1","future":"opaque"}"#,
                        ),
                        (Method::GET, "/v1/files/file_native_1") => (
                            StatusCode::OK,
                            [("content-type", "application/json")],
                            r#"{"id":"file_native_1","future":"still-opaque"}"#,
                        ),
                        _ => (
                            StatusCode::NOT_FOUND,
                            [("content-type", "application/json")],
                            r#"{"error":"unexpected"}"#,
                        ),
                    }
                }
            },
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let origin = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

        let data = tempfile::tempdir().unwrap();
        let primary = tempfile::tempdir().unwrap();
        let additional = tempfile::tempdir().unwrap();
        for (home, access) in [
            (&primary, "primary-upstream"),
            (&additional, "other-upstream"),
        ] {
            std::fs::write(
                home.path().join(".credentials.json"),
                serde_json::json!({
                    "claudeAiOauth": {
                        "accessToken": access,
                        "expiresAt": 9_999_999_999_999_i64,
                        "scopes": ["user:file_upload"]
                    }
                })
                .to_string(),
            )
            .unwrap();
        }
        let primary_reader = crate::subscription::SubscriptionReader::new(
            SubscriptionProvider::Claude,
            primary.path(),
        );
        let mut state = AppState::for_tests(data.path());
        state.upstream_provider = crate::config::UpstreamProvider::Anthropic;
        state.subscription_base_url = Some(origin);
        state.subscription_reader = Some(primary_reader.clone());
        state.subscription_readers = vec![primary_reader];
        let account_router = crate::accounts::AccountRouter::new_for_provider(
            primary.path().to_path_buf(),
            &[additional.path().to_path_buf()],
            SubscriptionProvider::Claude,
            crate::accounts::AccountRouterOptions::default(),
        );
        account_router.register_credential_stores_in(&state.subscription_cache, data.path());
        state.account_router = Some(account_router);

        let token_for = |principal: &str| {
            state
                .token_manager
                .issue_with_id(&crate::token::IssueRequest {
                    ttl_hours: 1,
                    label: "native file fixture",
                    account: None,
                    max_requests: None,
                    max_tokens: None,
                    rate_limit_per_minute: None,
                    scope: "",
                    github_repos: Vec::new(),
                    sliding_window_seconds: None,
                    client_kind: Some(ClientKind::ClaudeCode.canonical_name()),
                    principal_id: Some(principal),
                })
                .unwrap()
                .0
        };
        let owner_token = token_for("owner-a");
        let foreign_token = token_for("owner-b");

        let create = Request::builder()
            .method(Method::POST)
            .uri("/api/services/anthropic/v1/files")
            .header("authorization", format!("Bearer {owner_token}"))
            .header("user-agent", "claude-code/test-fixture")
            .header("content-type", "multipart/form-data; boundary=opaque")
            .body(Body::from("--opaque--"))
            .unwrap();
        let create = anthropic(State(state.clone()), create).await;
        assert_eq!(create.status(), StatusCode::OK);
        assert_eq!(
            create.into_body().collect().await.unwrap().to_bytes(),
            r#"{"id":"file_native_1","future":"opaque"}"#
        );

        let get = Request::builder()
            .method(Method::GET)
            .uri("/api/services/anthropic/v1/files/file_native_1")
            .header("authorization", format!("Bearer {owner_token}"))
            .header("user-agent", "claude-code/test-fixture")
            .body(Body::empty())
            .unwrap();
        let get = anthropic(State(state.clone()), get).await;
        assert_eq!(get.status(), StatusCode::OK);
        assert_eq!(
            get.into_body().collect().await.unwrap().to_bytes(),
            r#"{"id":"file_native_1","future":"still-opaque"}"#
        );

        let foreign = Request::builder()
            .method(Method::GET)
            .uri("/api/services/anthropic/v1/files/file_native_1")
            .header("authorization", format!("Bearer {foreign_token}"))
            .header("user-agent", "claude-code/test-fixture")
            .body(Body::empty())
            .unwrap();
        let foreign = anthropic(State(state), foreign).await;
        assert_eq!(foreign.status(), StatusCode::NOT_FOUND);
        assert_eq!(
            seen.lock().unwrap().as_slice(),
            ["Bearer primary-upstream", "Bearer primary-upstream"]
        );
        server.abort();
    }

    #[tokio::test]
    async fn native_lists_expose_only_resources_owned_by_the_router_principal() {
        let data = tempfile::tempdir().unwrap();
        let state = AppState::for_tests(data.path());
        let destination = AffinityDestination::Subscription {
            provider: SubscriptionProvider::Claude,
            account: "account-a".to_string(),
            upstream_account_id: Some("workspace-a".to_string()),
            base_url: "https://api.anthropic.test".to_string(),
        };
        let owner = ResponseOwner::new("claude", "owner-a");
        let foreign = ResponseOwner::new("claude", "owner-b");
        state
            .provider_store
            .response_affinities()
            .record(
                ResponseNamespace::AnthropicFiles,
                "file_owned",
                owner.clone(),
                destination.clone(),
            )
            .unwrap();
        state
            .provider_store
            .response_affinities()
            .record(
                ResponseNamespace::AnthropicFiles,
                "file_foreign",
                foreign,
                destination,
            )
            .unwrap();
        let mut response = Response::new(Body::from(
            serde_json::json!({
                "data": [
                    {"id": "file_foreign", "filename": "private.txt"},
                    {"id": "file_owned", "filename": "owned.txt", "future": true}
                ],
                "first_id": "file_foreign",
                "last_id": "file_owned",
                "has_more": true,
                "next_page": "opaque-cursor",
                "future_top_level": {"kept": true}
            })
            .to_string(),
        ));
        response
            .headers_mut()
            .insert("content-type", HeaderValue::from_static("application/json"));

        let filtered = filter_native_list_response(
            &state,
            &owner,
            &NativeListRequest {
                namespace: ResponseNamespace::AnthropicFiles,
                parent_id: None,
            },
            response,
        )
        .await;

        assert_eq!(filtered.status(), StatusCode::OK);
        let value: serde_json::Value =
            serde_json::from_slice(&filtered.into_body().collect().await.unwrap().to_bytes())
                .unwrap();
        assert_eq!(
            value,
            serde_json::json!({
                "data": [
                    {"id": "file_owned", "filename": "owned.txt", "future": true}
                ],
                "first_id": "file_owned",
                "last_id": "file_owned",
                "has_more": true,
                "next_page": "opaque-cursor",
                "future_top_level": {"kept": true}
            })
        );
    }

    #[tokio::test]
    async fn native_file_upload_requires_the_selected_claude_scope_before_upstream() {
        let calls = Arc::new(AtomicUsize::new(0));
        let upstream_calls = Arc::clone(&calls);
        let upstream = axum::Router::new().fallback(move || {
            let calls = Arc::clone(&upstream_calls);
            async move {
                calls.fetch_add(1, Ordering::Relaxed);
                axum::Json(serde_json::json!({"id": "should-not-exist"}))
            }
        });
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let origin = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

        let data = tempfile::tempdir().unwrap();
        let claude_home = tempfile::tempdir().unwrap();
        std::fs::write(
            claude_home.path().join(".credentials.json"),
            r#"{"claudeAiOauth":{"accessToken":"inference-only","expiresAt":9999999999999,"scopes":["user:inference"]}}"#,
        )
        .unwrap();
        let reader = crate::subscription::SubscriptionReader::new(
            SubscriptionProvider::Claude,
            claude_home.path(),
        );
        let mut state = AppState::for_tests(data.path());
        state.upstream_provider = crate::config::UpstreamProvider::Anthropic;
        state.subscription_base_url = Some(origin);
        state.subscription_reader = Some(reader.clone());
        state.subscription_readers = vec![reader];
        let token =
            crate::model_routing::tests::bound_client_token(&state, ClientKind::ClaudeCode, None);
        let request = Request::builder()
            .method(Method::POST)
            .uri("/api/services/anthropic/v1/files")
            .header("authorization", format!("Bearer {token}"))
            .header("user-agent", "claude-code/test-fixture")
            .header("content-type", "multipart/form-data; boundary=opaque")
            .body(Body::from("--opaque--"))
            .unwrap();
        let response = anthropic(State(state), request).await;
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
        assert_eq!(calls.load(Ordering::Relaxed), 0);
        server.abort();
    }

    #[tokio::test]
    async fn multipart_requests_are_bounded_and_spooled_byte_exactly() {
        let chunks = futures_util::stream::iter([
            Ok::<_, std::convert::Infallible>(Bytes::from_static(b"--boundary\r\nzero:")),
            Ok(Bytes::from_static(b"\0\xff\r\n--boundary--\r\n")),
        ]);
        let body = Body::from_stream(chunks);
        let collected = collect_native_body(body, 64, true).await.unwrap();
        let NativeRequestBody::Spool { file, len } = collected else {
            panic!("multipart body was buffered in memory");
        };
        assert_eq!(len, 35);
        assert_eq!(
            std::fs::read(file.path()).unwrap(),
            b"--boundary\r\nzero:\0\xff\r\n--boundary--\r\n"
        );

        let too_large = collect_native_body(Body::from("12345"), 4, true).await;
        assert!(too_large.is_err());
    }

    #[test]
    fn anthropic_batches_validate_every_nested_model_for_the_selected_account() {
        let data = tempfile::tempdir().unwrap();
        let state = AppState::for_tests(data.path());
        state.model_catalogs.record_success_for_account(
            SubscriptionProvider::Claude,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            None,
            vec!["claude-a".to_string(), "claude-b".to_string()],
        );
        let destination = AffinityDestination::Subscription {
            provider: SubscriptionProvider::Claude,
            account: crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
            upstream_account_id: None,
            base_url: "https://example.invalid".to_string(),
        };
        let good =
            br#"{"requests":[{"params":{"model":"claude-a"}},{"params":{"model":"claude-b"}}]}"#;
        assert!(validate_anthropic_batch(&state, &destination, good).is_ok());
        for bad in [
            br#"{"requests":[{"params":{"model":"claude-a"}},{"params":{"model":"other"}}]}"#
                .as_slice(),
            br#"{"requests":[{"params":{}}]}"#.as_slice(),
            br#"{"requests":[]}"#.as_slice(),
            br"not-json".as_slice(),
        ] {
            assert!(validate_anthropic_batch(&state, &destination, bad).is_err());
        }
    }

    #[tokio::test]
    async fn history_notes_authentication_precedes_body_handling() {
        let data = tempfile::tempdir().unwrap();
        let mut state = AppState::for_tests(data.path());
        state.max_proxy_request_bytes = 1;
        let request = Request::builder()
            .method(Method::POST)
            .uri("/api/services/codex/v1/alpha/notes/v2/read_file")
            .body(Body::from("private body larger than the limit"))
            .unwrap();
        let response = codex(State(state), request).await;
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn ambiguous_note_mutation_is_returned_once_and_never_replayed() {
        let calls = Arc::new(AtomicUsize::new(0));
        let upstream_calls = Arc::clone(&calls);
        let upstream = axum::Router::new().fallback(move || {
            let calls = Arc::clone(&upstream_calls);
            async move {
                calls.fetch_add(1, Ordering::Relaxed);
                (
                    StatusCode::SERVICE_UNAVAILABLE,
                    [
                        ("content-type", "application/json"),
                        ("x-request-id", "req-ambiguous"),
                    ],
                    r#"{ "error" : { "private" : "ambiguous" } }"#,
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
            r#"{"tokens":{"access_token":"upstream","account_id":"account"}}"#,
        )
        .unwrap();
        let reader = crate::subscription::SubscriptionReader::new(
            SubscriptionProvider::Codex,
            codex_home.path(),
        );
        let mut state = AppState::for_tests(data.path());
        state.upstream_provider = crate::config::UpstreamProvider::Codex;
        state.subscription_base_url = Some(origin);
        state.subscription_reader = Some(reader.clone());
        state.subscription_readers = vec![reader];
        let token =
            crate::model_routing::tests::bound_client_token(&state, ClientKind::Codex, None);
        let request = Request::builder()
            .method(Method::POST)
            .uri("/api/services/codex/v1/alpha/notes/v2/append_to_file")
            .header("authorization", format!("Bearer {token}"))
            .body(Body::from(r#"{"path":"private","text":"private"}"#))
            .unwrap();
        let response = codex(State(state), request).await;
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
        assert_eq!(response.headers()["x-request-id"], "req-ambiguous");
        assert_eq!(
            response.into_body().collect().await.unwrap().to_bytes(),
            r#"{ "error" : { "private" : "ambiguous" } }"#
        );
        assert_eq!(calls.load(Ordering::Relaxed), 1);
        server.abort();
    }

    #[tokio::test]
    async fn websocket_upstream_handshake_failure_is_returned_before_downstream_upgrade() {
        use axum::routing::get;
        use tokio_tungstenite::tungstenite::client::IntoClientRequest as _;

        let upstream = axum::Router::new().route(
            "/realtime",
            get(|| async {
                (
                    StatusCode::TOO_MANY_REQUESTS,
                    [
                        ("content-type", "application/problem+json"),
                        ("retry-after", "17"),
                        ("x-request-id", "realtime-handshake-request"),
                    ],
                    r#"{"error":"native handshake rejected"}"#,
                )
            }),
        );
        let upstream_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let upstream_url = format!(
            "http://{}/realtime",
            upstream_listener.local_addr().unwrap()
        );
        let upstream_server =
            tokio::spawn(async move { axum::serve(upstream_listener, upstream).await.unwrap() });

        let data = tempfile::tempdir().unwrap();
        let state = AppState::for_tests(data.path());
        let router_state = state.clone();
        let router = axum::Router::new().route(
            "/realtime",
            get(move |request: Request| {
                let state = router_state.clone();
                let url = upstream_url.clone();
                async move {
                    upgrade_websocket(
                        state.clone(),
                        request,
                        Target {
                            client: state.client.clone(),
                            url,
                            headers: HeaderMap::new(),
                        },
                        None,
                    )
                    .await
                }
            }),
        );
        let router_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let router_address = router_listener.local_addr().unwrap();
        let router_server =
            tokio::spawn(async move { axum::serve(router_listener, router).await.unwrap() });

        let request = format!("ws://{router_address}/realtime")
            .into_client_request()
            .unwrap();
        let failure = tokio_tungstenite::connect_async(request)
            .await
            .expect_err("the upstream HTTP rejection must precede the downstream upgrade");
        let tungstenite::Error::Http(response) = failure else {
            panic!("expected the native upstream HTTP response, got {failure}");
        };
        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(response.headers()["retry-after"], "17");
        assert_eq!(
            response.headers()["x-request-id"],
            "realtime-handshake-request"
        );
        assert_eq!(
            response.body().as_deref(),
            Some(br#"{"error":"native handshake rejected"}"#.as_slice())
        );
        router_server.abort();
        upstream_server.abort();
    }

    #[tokio::test]
    async fn native_websocket_relay_preserves_subprotocol_frames_and_fresh_handshake() {
        use axum::extract::WebSocketUpgrade;
        use axum::routing::get;
        use tokio_tungstenite::tungstenite::client::IntoClientRequest as _;

        let captured = Arc::new(Mutex::new(None::<HeaderMap>));
        let upstream_capture = Arc::clone(&captured);
        let upstream = axum::Router::new().route(
            "/realtime",
            get(move |headers: HeaderMap, upgrade: WebSocketUpgrade| {
                *upstream_capture.lock().unwrap() = Some(headers);
                async move {
                    upgrade
                        .protocols(["realtime"])
                        .on_upgrade(|mut socket| async move {
                            while let Some(Ok(message)) = socket.recv().await {
                                let closes = matches!(message, Message::Close(_));
                                if socket.send(message).await.is_err() || closes {
                                    break;
                                }
                            }
                        })
                }
            }),
        );
        let upstream_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let upstream_url = format!(
            "http://{}/realtime",
            upstream_listener.local_addr().unwrap()
        );
        let upstream_server =
            tokio::spawn(async move { axum::serve(upstream_listener, upstream).await.unwrap() });

        let data = tempfile::tempdir().unwrap();
        let state = AppState::for_tests(data.path());
        let router_state = state.clone();
        let router = axum::Router::new().route(
            "/realtime",
            get(move |request: Request| {
                let state = router_state.clone();
                let url = upstream_url.clone();
                async move {
                    let headers = crate::proxy::native_request_headers(
                        request.headers(),
                        "upstream-websocket-secret",
                    );
                    upgrade_websocket(
                        state.clone(),
                        request,
                        Target {
                            client: state.client.clone(),
                            url,
                            headers,
                        },
                        None,
                    )
                    .await
                }
            }),
        );
        let router_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let router_address = router_listener.local_addr().unwrap();
        let router_server =
            tokio::spawn(async move { axum::serve(router_listener, router).await.unwrap() });

        let mut request = format!("ws://{router_address}/realtime")
            .into_client_request()
            .unwrap();
        request
            .headers_mut()
            .insert("sec-websocket-protocol", "realtime".parse().unwrap());
        let (mut socket, response) = tokio_tungstenite::connect_async(request).await.unwrap();
        assert_eq!(response.headers()["sec-websocket-protocol"], "realtime");
        for message in [
            tungstenite::Message::Text("realtime text".into()),
            tungstenite::Message::Binary(vec![0, 1, 2, 255].into()),
        ] {
            socket.send(message.clone()).await.unwrap();
            assert_eq!(socket.next().await.unwrap().unwrap(), message);
        }
        socket
            .send(tungstenite::Message::Ping(vec![7, 8].into()))
            .await
            .unwrap();
        assert_eq!(
            socket.next().await.unwrap().unwrap(),
            tungstenite::Message::Pong(vec![7, 8].into())
        );
        socket.close(None).await.unwrap();

        let headers = captured.lock().unwrap().take().unwrap();
        assert_eq!(headers["authorization"], "Bearer upstream-websocket-secret");
        assert_eq!(headers["sec-websocket-protocol"], "realtime");
        assert_eq!(headers.get_all("sec-websocket-key").iter().count(), 1);
        assert_eq!(headers.get_all("sec-websocket-version").iter().count(), 1);
        router_server.abort();
        upstream_server.abort();
    }

    #[test]
    fn realtime_usage_counts_each_completed_response_once() {
        let data = tempfile::tempdir().unwrap();
        let state = AppState::for_tests(data.path());
        let token = state
            .token_manager
            .issue_token(1, "realtime usage")
            .unwrap();
        let token_id = state.token_manager.validate_token(&token).unwrap().sub;
        let mut completed = std::collections::HashSet::new();
        let first = br#"{"type":"response.done","response":{"id":"resp_1","usage":{"input_tokens":4,"output_tokens":3,"input_token_details":{"audio_tokens":2},"output_token_details":{"audio_tokens":1}}}}"#;
        let second = br#"{"type":"response.done","response":{"id":"resp_2","usage":{"total_tokens":5,"input_tokens":3,"output_tokens":2}}}"#;

        assert!(!record_realtime_usage(
            &state.token_manager,
            &token_id,
            &mut completed,
            first
        ));
        assert!(!record_realtime_usage(
            &state.token_manager,
            &token_id,
            &mut completed,
            first
        ));
        assert!(!record_realtime_usage(
            &state.token_manager,
            &token_id,
            &mut completed,
            second
        ));

        assert_eq!(
            state
                .token_manager
                .store()
                .get(&token_id)
                .unwrap()
                .unwrap()
                .used_tokens,
            12
        );
    }

    #[tokio::test]
    async fn native_http_usage_is_settled_without_rewriting_the_response() {
        let upstream_body =
            br#"{"id":"image_1","usage":{"input_tokens":6,"output_tokens":3,"total_tokens":9}}"#;
        let upstream = axum::Router::new().fallback(|| async {
            (
                StatusCode::OK,
                [
                    ("content-type", "application/json; charset=utf-8"),
                    ("x-request-id", "native-usage-request"),
                ],
                Body::from(upstream_body.as_slice()),
            )
        });
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!(
            "http://{}/images/generations",
            listener.local_addr().unwrap()
        );
        let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });

        let data = tempfile::tempdir().unwrap();
        let state = AppState::for_tests(data.path());
        let token = state.token_manager.issue_token(1, "native usage").unwrap();
        let token_id = state.token_manager.validate_token(&token).unwrap().sub;
        let response = relay_native_http(
            &state,
            &Method::POST,
            NativeRequestBody::Memory(Bytes::from_static(br#"{"prompt":"image"}"#)),
            Target {
                client: state.client.clone(),
                url,
                headers: HeaderMap::new(),
            },
            Some(&token_id),
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers()["x-request-id"], "native-usage-request");
        assert_eq!(
            response.into_body().collect().await.unwrap().to_bytes(),
            upstream_body.as_slice()
        );
        assert_eq!(
            state
                .token_manager
                .store()
                .get(&token_id)
                .unwrap()
                .unwrap()
                .used_tokens,
            9
        );
        assert!(!tracks_native_usage(
            Service::OpenAi,
            "/api/services/openai/v1/responses/input_tokens"
        ));
        assert!(tracks_native_usage(
            Service::OpenAi,
            "/api/services/openai/v1/images/generations"
        ));
        server.abort();
    }

    #[test]
    fn codex_whoami_metadata_and_account_handle_follow_the_selected_workspace() {
        use base64::Engine as _;

        let payload = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(
            br#"{"https://api.openai.com/auth":{"chatgpt_plan_type":"business","chatgpt_account_is_fedramp":true}}"#,
        );
        let id_token = format!("header.{payload}.signature");
        let home = tempfile::tempdir().unwrap();
        std::fs::write(
            home.path().join("auth.json"),
            format!(
                r#"{{"tokens":{{"id_token":"{id_token}","access_token":"opaque-access","account_id":"workspace-a"}}}}"#
            ),
        )
        .unwrap();
        let reader =
            crate::subscription::SubscriptionReader::new(SubscriptionProvider::Codex, home.path());
        let data = tempfile::tempdir().unwrap();
        let mut state = AppState::for_tests(data.path());
        state.subscription_reader = Some(reader.clone());
        state.subscription_readers = vec![reader.clone()];
        let token = reader.read_token().unwrap();

        assert_eq!(
            codex_identity_metadata(
                &state,
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                &token
            ),
            ("business".to_string(), true)
        );
        assert_ne!(
            codex_account_handle("principal", "primary", Some("workspace-a")),
            codex_account_handle("principal", "primary", Some("workspace-b"))
        );
    }
}
