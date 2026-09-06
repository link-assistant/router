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
    forward(state, request, Service::OpenAi).await
}

pub async fn anthropic(State(state): State<AppState>, request: Request) -> Response {
    forward(state, request, Service::Anthropic).await
}

pub async fn codex(State(state): State<AppState>, request: Request) -> Response {
    forward(state, request, Service::Codex).await
}

pub async fn codex_backend(State(state): State<AppState>, request: Request) -> Response {
    forward(state, request, Service::CodexBackend).await
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
        return crate::codex_remote_control::forward(state, request).await;
    }
    let headers = request.headers().clone();
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
        return upgrade_websocket(state, request, target).await;
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
    let routing_body = body.routing_bytes();
    let resource = native_resource_request(&method, path);
    let existing = match resource.as_ref() {
        Some(resource) => match existing_resource(&state, &owner, resource) {
            Ok(affinity) => affinity,
            Err(response) => return response,
        },
        None => match previous_response_namespace(
            service,
            path,
            routing_body.map_or(&[][..], Bytes::as_ref),
        ) {
            Some((namespace, response_id)) => {
                match state.provider_store.response_affinities().lookup(
                    namespace,
                    &response_id,
                    &owner,
                ) {
                    Ok(Some(affinity)) => Some(affinity),
                    Ok(None) => {
                        return error(
                            StatusCode::NOT_FOUND,
                            "not_found_error",
                            "the referenced response is unavailable",
                        );
                    }
                    Err(_) => return unavailable("resource affinity is unavailable"),
                }
            }
            None => None,
        },
    };
    let (target, destination) = match target(
        &state,
        &headers,
        &claims,
        service,
        &uri,
        routing_body,
        existing.as_ref().map(|affinity| &affinity.destination),
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
    let response = relay_native_http(&state, &method, body, target).await;
    if let Some(resource) = resource {
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
    if ((method == Method::GET || method == Method::POST) && segments.len() == 1)
        || (method == Method::GET && matches!(segments.as_slice(), [_, "versions"]))
    {
        return Some(resource_use(
            ResponseNamespace::AnthropicSkills,
            segments[0],
            NativeResourceAction::Use,
            None,
        ));
    }
    if ((method == Method::GET || method == Method::POST) && segments.len() == 3)
        || (method == Method::GET && matches!(segments.as_slice(), [_, "versions", _, "content"]))
    {
        return Some(resource_use(
            ResponseNamespace::AnthropicSkillVersions,
            segments[2],
            NativeResourceAction::Use,
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
    match state
        .provider_store
        .response_affinities()
        .lookup(namespace, id, owner)
    {
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
            if let Some(affinity) = existing
                && state
                    .provider_store
                    .response_affinities()
                    .remove_if_matches(&affinity)
                    .is_err()
            {
                return unavailable("native resource affinity could not be removed");
            }
            response
        }
        NativeResourceAction::Use | NativeResourceAction::Delete => response,
    }
}

fn previous_response_namespace(
    service: Service,
    path: &str,
    body: &[u8],
) -> Option<(ResponseNamespace, String)> {
    let namespace = match (service, path) {
        (
            Service::OpenAi,
            "/api/services/openai/v1/responses/compact"
            | "/api/services/openai/v1/responses/input_tokens",
        ) => ResponseNamespace::OpenAiResponses,
        (Service::Codex, "/api/services/codex/v1/responses/compact") => {
            ResponseNamespace::CodexResponses
        }
        _ => return None,
    };
    let id = serde_json::from_slice::<serde_json::Value>(body)
        .ok()?
        .get("previous_response_id")?
        .as_str()?
        .to_string();
    (!id.is_empty()).then_some((namespace, id))
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
    let account = opaque_handle("acct", &format!("{principal}:{}", selected.name));
    axum::Json(serde_json::json!({
        "email": serde_json::Value::Null,
        "chatgpt_user_id": user,
        "chatgpt_account_id": account,
        // These fields are required by Codex's public PAT metadata schema.
        // Router has no need to reveal the subscriber's real plan or workspace
        // classification, so it supplies schema-valid conservative values.
        "chatgpt_plan_type": "unknown",
        "chatgpt_account_is_fedramp": false,
    }))
    .into_response()
}

fn opaque_handle(prefix: &str, value: &str) -> String {
    let digest = hex::encode(Sha256::digest(value.as_bytes()));
    format!("{prefix}_{}", &digest[..24])
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
    let path = strip_service_path(uri, service);
    let url = if service == Service::CodexBackend {
        let root = base
            .strip_suffix("/codex")
            .unwrap_or(&base)
            .trim_end_matches('/');
        format!("{root}{path}")
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
        .map(crate::accounts::AccountRouter::subscription_readers)
        .map_or_else(
            || vec![crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string()],
            |accounts| {
                accounts
                    .into_iter()
                    .map(|(name, _)| name)
                    .collect::<Vec<_>>()
            },
        );
    accounts
        .into_iter()
        .find(|account| opaque_handle("acct", &format!("{principal}:{account}")) == handle)
        .map(Some)
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
    relay_native_http(state, method, NativeRequestBody::Memory(body), target).await
}

async fn relay_native_http(
    state: &AppState,
    method: &Method,
    body: NativeRequestBody,
    target: Target,
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
    let stream = upstream.bytes_stream().map(move |chunk| {
        if let Ok(bytes) = &chunk {
            metrics.record_bytes(0, bytes.len() as u64);
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

pub async fn upgrade_websocket(state: AppState, request: Request, target: Target) -> Response {
    let (mut parts, _) = request.into_parts();
    let upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &state).await {
        Ok(upgrade) => upgrade,
        Err(rejection) => return rejection.into_response(),
    };
    let limit = state.max_proxy_request_bytes;
    upgrade
        .max_message_size(limit)
        .max_frame_size(limit)
        .on_upgrade(move |downstream| websocket_session(downstream, target, limit))
}

async fn websocket_session(mut downstream: WebSocket, target: Target, limit: usize) {
    let Ok(mut request) = websocket_url(&target.url)
        .and_then(|url| url.into_client_request().map_err(|error| error.to_string()))
    else {
        close(&mut downstream, 1011, "invalid upstream WebSocket URL").await;
        return;
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
    let Ok(Ok((mut upstream, _))) = connected else {
        close(
            &mut downstream,
            1011,
            "upstream WebSocket connection failed",
        )
        .await;
        return;
    };
    loop {
        tokio::select! {
            message = downstream.next() => {
                let Some(Ok(message)) = message else {
                    let _ = upstream.close(None).await;
                    break;
                };
                let closes = matches!(message, Message::Close(_));
                if upstream.send(downstream_message(message)).await.is_err() || closes {
                    break;
                }
            }
            message = upstream.next() => {
                let Some(Ok(message)) = message else {
                    close(&mut downstream, 1011, "upstream WebSocket disconnected").await;
                    break;
                };
                let closes = matches!(message, tungstenite::Message::Close(_));
                if downstream.send(upstream_message(message)).await.is_err() || closes {
                    break;
                }
            }
        }
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
            previous_response_namespace(
                Service::OpenAi,
                "/api/services/openai/v1/responses/compact",
                br#"{"previous_response_id":"resp_1"}"#,
            ),
            Some((ResponseNamespace::OpenAiResponses, "resp_1".to_string()))
        );
        assert_eq!(
            previous_response_namespace(
                Service::Codex,
                "/api/services/codex/v1/responses/compact",
                br#"{"previous_response_id":"resp_2"}"#,
            ),
            Some((ResponseNamespace::CodexResponses, "resp_2".to_string()))
        );
        assert_eq!(
            previous_response_namespace(
                Service::OpenAi,
                "/api/services/openai/v1/images/generations",
                br#"{"previous_response_id":"resp_3"}"#,
            ),
            None
        );
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
}
