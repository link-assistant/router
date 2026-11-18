//! Optional, fail-closed content scanning at the authenticated inference boundary.

use std::io::Read as _;
use std::sync::Arc;
use std::time::Duration;

use axum::body::{Body, Bytes, to_bytes};
use axum::extract::ws::{CloseFrame, Message, WebSocket};
use axum::extract::{Request, State};
use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest as _, Sha256};
use url::Url;

use crate::api_error::{PresentedError, dialect_for_path};

#[path = "sensitive_data_response.rs"]
mod response;
use response::Replacements;

const SESSION: &str = "x-router-privacy-session";
const LIMIT: usize = 4 * 1024 * 1024;

const STRUCTURAL_HEADERS: &[&str] = &[
    "accept",
    "accept-encoding",
    "authorization",
    "connection",
    "content-encoding",
    "content-length",
    "content-type",
    "host",
    "transfer-encoding",
    "upgrade",
    "x-api-key",
    "x-goog-api-key",
    "anthropic-version",
    "anthropic-beta",
    "x-router-share-geolocation",
    "x-router-repository",
    "sec-websocket-extensions",
    "sec-websocket-key",
    "sec-websocket-version",
];

#[derive(Clone)]
pub(crate) struct PrivacyRoute {
    scanner: Option<Arc<Scanner>>,
    limit: usize,
}

struct Scanner {
    client: reqwest::Client,
    endpoint: Url,
    token: String,
    salt: String,
    full: bool,
}

#[derive(Clone)]
pub(crate) struct WebSocketPrivacy {
    scanner: Arc<Scanner>,
    session: String,
    limit: usize,
    replacements: Replacements,
}

impl WebSocketPrivacy {
    pub(crate) async fn scan_event(&mut self, value: Value) -> Result<Value, ()> {
        if !value.is_object() || contains_attachment(&value) {
            return Err(());
        }
        let document = Document {
            body: value,
            headers: Vec::new(),
            query: Vec::new(),
        };
        let scanned = self
            .scanner
            .scan(Scan {
                session: Some(self.session.clone()),
                document: &document,
            })
            .await
            .map_err(|_| ())?;
        if !scanned.document.body.is_object()
            || !scanned.document.headers.is_empty()
            || !scanned.document.query.is_empty()
            || serde_json::to_vec(&scanned.document.body).map_err(|_| ())?.len() > self.limit
        {
            return Err(());
        }
        self.replacements = Replacements::new(scanned.replacements).ok_or(())?;
        Ok(scanned.document.body)
    }

    pub(crate) fn restore_event(&self, text: &str) -> String {
        let mut frame = self.replacements.clone();
        frame
            .feed(text.as_bytes(), true)
            .ok()
            .and_then(|bytes| String::from_utf8(bytes.to_vec()).ok())
            .unwrap_or_else(|| text.to_owned())
    }
}

pub(crate) async fn private_control(socket: &mut WebSocket, message: Message) -> Option<Message> {
    match message {
        Message::Ping(bytes) => {
            let _ = socket.send(Message::Pong(bytes)).await;
            None
        }
        Message::Pong(_) => None,
        Message::Close(frame) => Some(Message::Close(frame.map(|frame| CloseFrame {
            code: frame.code,
            reason: "".into(),
        }))),
        message => Some(message),
    }
}

#[derive(Deserialize, Serialize)]
struct Document {
    body: Value,
    headers: Vec<(String, String)>,
    query: Vec<(String, String)>,
}

#[derive(Serialize)]
struct Scan<'a> {
    session: Option<String>,
    document: &'a Document,
}

#[derive(Deserialize)]
struct Scanned {
    document: Document,
    replacements: Vec<(String, String)>,
}

#[derive(Clone, Copy, Debug)]
enum Failure {
    InvalidBody,
    InvalidSession,
    TooLarge,
    UnsupportedBody,
    Unavailable,
}

impl Failure {
    fn render(self, path: &str) -> Response {
        let (status, message) = match self {
            Self::InvalidBody => (
                StatusCode::BAD_REQUEST,
                "sensitive data protection requires valid UTF-8 JSON",
            ),
            Self::InvalidSession => (
                StatusCode::BAD_REQUEST,
                "invalid sensitive data session identifier",
            ),
            Self::TooLarge => (
                StatusCode::PAYLOAD_TOO_LARGE,
                "sensitive data scanner input exceeds limit",
            ),
            Self::UnsupportedBody => (
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                "sensitive data protection requires inspectable JSON",
            ),
            Self::Unavailable => (
                StatusCode::SERVICE_UNAVAILABLE,
                "sensitive data scanner is unavailable or returned invalid output",
            ),
        };
        PresentedError {
            status,
            error_type: "sensitive_data_protection",
            message,
        }
        .render(dialect_for_path(path))
    }
}

impl PrivacyRoute {
    pub(crate) fn from_env(limit: usize) -> Option<Self> {
        let endpoint = crate::operation_context::var_os("ROUTER_SENSITIVE_DATA_SCANNER_URL")?;
        let scanner = endpoint
            .to_str()
            .and_then(|endpoint| {
                let token = crate::operation_context::var("ROUTER_SENSITIVE_DATA_SCANNER_TOKEN").ok()?;
                let scope = crate::operation_context::var("ROUTER_SENSITIVE_DATA_SCOPE")
                    .unwrap_or_else(|_| "full".to_owned());
                Scanner::new(endpoint, token, &scope)
            })
            .map(Arc::new);
        // A configured but invalid scanner keeps the boundary active and refuses requests.
        Some(Self {
            scanner,
            limit: limit.min(LIMIT),
        })
    }
}

impl Scanner {
    fn new(endpoint: &str, token: String, scope: &str) -> Option<Self> {
        let endpoint = Url::parse(endpoint).ok()?;
        if endpoint.scheme() != "http"
            || !matches!(endpoint.host_str(), Some("127.0.0.1" | "[::1]"))
            || endpoint.port().is_none()
            || !endpoint.username().is_empty()
            || endpoint.password().is_some()
            || endpoint.query().is_some()
            || endpoint.fragment().is_some()
            || endpoint.path() != "/scan"
            || !(32..=128).contains(&token.len())
            || !token
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
            || !matches!(scope, "body" | "full")
        {
            return None;
        }
        let client = reqwest::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(Duration::from_secs(10))
            .build()
            .ok()?;
        Some(Self {
            client,
            endpoint,
            token,
            salt: uuid::Uuid::new_v4().to_string(),
            full: scope == "full",
        })
    }

    fn session_key(&self, headers: &HeaderMap) -> Result<Option<String>, Failure> {
        let selected = [
            SESSION,
            "x-claude-code-session-id",
            "x-codex-session-id",
            "x-session-id",
            "session-id",
        ]
        .into_iter()
        .find(|name| headers.contains_key(*name));
        let Some(name) = selected else {
            return Ok(None);
        };
        let all = headers.get_all(name);
        let mut values = all.iter();
        let session = values
            .next()
            .and_then(|value| value.to_str().ok())
            .filter(|value| {
                (1..=128).contains(&value.len())
                    && value.bytes().all(|byte| {
                        byte.is_ascii_alphanumeric()
                            || matches!(byte, b'.' | b'_' | b':' | b'-')
                    })
            });
        let session = session.filter(|_| values.next().is_none());
        if session.is_none() && name == SESSION {
            return Err(Failure::InvalidSession);
        }
        let token = crate::proxy::extract_client_token(headers);
        Ok(session.zip(token).map(|(session, token)| {
            let mut digest = Sha256::new();
            digest.update(self.salt.as_bytes());
            digest.update((token.len() as u64).to_be_bytes());
            digest.update(token.as_bytes());
            digest.update(session.as_bytes());
            hex::encode(digest.finalize())
        }))
    }

    async fn scan(&self, request: Scan<'_>) -> Result<Scanned, Failure> {
        let input = serde_json::to_vec(&request).map_err(|_| Failure::InvalidBody)?;
        if input.len() > LIMIT {
            return Err(Failure::TooLarge);
        }
        let mut scanner = self
            .client
            .post(self.endpoint.clone())
            .bearer_auth(&self.token)
            .header("content-type", "application/json")
            .body(input)
            .send()
            .await
            .map_err(|_| Failure::Unavailable)?;
        if scanner.status() != StatusCode::OK {
            return Err(Failure::Unavailable);
        }
        let mut output = Vec::new();
        while let Some(chunk) = scanner.chunk().await.map_err(|_| Failure::Unavailable)? {
            if chunk.len() > LIMIT - output.len() {
                return Err(Failure::Unavailable);
            }
            output.extend_from_slice(&chunk);
        }
        serde_json::from_slice(&output).map_err(|_| Failure::Unavailable)
    }
}

pub(crate) async fn route(
    State(policy): State<PrivacyRoute>,
    request: Request,
    next: Next,
) -> Response {
    if !protected_path(request.method(), request.uri().path()) {
        return next.run(request).await;
    }
    let path = request.uri().path().to_owned();
    let Some(scanner) = policy.scanner else {
        return Failure::Unavailable.render(&path);
    };
    let websocket = request
        .headers()
        .get("upgrade")
        .is_some_and(|value| value.as_bytes().eq_ignore_ascii_case(b"websocket"));
    if !websocket
        && (request.headers().contains_key("upgrade")
            || request.method() == axum::http::Method::CONNECT
            || path == "/api/services/codex/v1/live"
            || path.contains("/realtime/calls"))
    {
        return Failure::UnsupportedBody.render(&path);
    }
    let session = match scanner.session_key(request.headers()) {
        Ok(None) if websocket => Some(hex::encode(Sha256::digest(uuid::Uuid::new_v4().as_bytes()))),
        Ok(session) => session,
        Err(failure) => return failure.render(&path),
    };
    match protect(request, &scanner, policy.limit, session.clone()).await {
        Ok((mut request, replacements)) => {
            if let Some(session) = session.filter(|_| websocket) {
                request.extensions_mut().insert(WebSocketPrivacy {
                    scanner,
                    session,
                    limit: policy.limit,
                    replacements: replacements.clone(),
                });
            }
            response::restore(next.run(request).await, replacements)
        }
        Err(failure) => failure.render(&path),
    }
}

fn protected_path(method: &axum::http::Method, path: &str) -> bool {
    use crate::route_contract::{RouteClass, ServiceKind, route_for_path};
    route_for_path(method, path).is_some_and(|route| {
        matches!(
            route.class,
            RouteClass::Service(
                ServiceKind::Anthropic
                    | ServiceKind::OpenAi
                    | ServiceKind::Codex
                    | ServiceKind::Qwen
                    | ServiceKind::Gemini
                    | ServiceKind::Vertex
                    | ServiceKind::Bedrock
            )
        )
    })
        || path.strip_prefix("/api/services/")
        .and_then(|path| path.split_once('/'))
        .is_some_and(|(service, _)| {
            matches!(
                service,
                "anthropic" | "bedrock" | "codex" | "gemini" | "openai" | "qwen" | "vertex"
            )
        })
        || path
            .strip_prefix("/v1/")
            .and_then(|path| path.split('/').next())
            .is_some_and(|kind| {
                matches!(kind, "chat" | "conversations" | "messages" | "models" | "responses")
            })
}

async fn protect(
    request: Request,
    scanner: &Scanner,
    limit: usize,
    session: Option<String>,
) -> Result<(Request, Replacements), Failure> {
    let (mut parts, body) = request.into_parts();
    parts.headers.remove(SESSION);
    let bytes = to_bytes(body, limit)
        .await
        .map_err(|_| Failure::TooLarge)?;
    let value = read_document(&parts.headers, bytes, limit).await?;
    let mut headers = Vec::new();
    let mut query = Vec::new();
    if scanner.full {
        for (name, value) in &parts.headers {
            if !STRUCTURAL_HEADERS.contains(&name.as_str()) {
                let value = value.to_str().map_err(|_| Failure::UnsupportedBody)?;
                headers.push((name.as_str().to_owned(), value.to_owned()));
            }
        }
        if let Some(raw) = parts.uri.query() {
            query.extend(url::form_urlencoded::parse(raw.as_bytes()).into_owned());
        }
    }
    let document = Document {
        body: value,
        headers,
        query,
    };
    let scanned = scanner
        .scan(Scan {
            session,
            document: &document,
        })
        .await?;
    validate_pairs(&document.headers, &scanned.document.headers)?;
    validate_pairs(&document.query, &scanned.document.query)?;
    if document.body.is_null() != scanned.document.body.is_null()
        || (!scanned.document.body.is_null() && !scanned.document.body.is_object())
    {
        return Err(Failure::Unavailable);
    }
    if scanner.full {
        let query = (document.query != scanned.document.query).then_some(&scanned.document.query[..]);
        apply_metadata(&mut parts, scanned.document.headers, query)?;
    }
    for name in [
        "content-length",
        "content-encoding",
        "content-md5",
        "content-digest",
        "digest",
    ] {
        parts.headers.remove(name);
    }
    parts
        .headers
        .insert("accept-encoding", HeaderValue::from_static("identity"));
    let body = if scanned.document.body.is_null() {
        Body::empty()
    } else {
        Body::from(serde_json::to_vec(&scanned.document.body).map_err(|_| Failure::Unavailable)?)
    };
    let replacements = Replacements::new(scanned.replacements).ok_or(Failure::Unavailable)?;
    Ok((Request::from_parts(parts, body), replacements))
}

fn validate_pairs(
    original: &[(String, String)],
    scanned: &[(String, String)],
) -> Result<(), Failure> {
    if original.len() != scanned.len() || original.iter().zip(scanned).any(|(a, b)| a.0 != b.0) {
        return Err(Failure::Unavailable);
    }
    Ok(())
}

fn apply_metadata(
    parts: &mut axum::http::request::Parts,
    headers: Vec<(String, String)>,
    query: Option<&[(String, String)]>,
) -> Result<(), Failure> {
    for (key, _) in &headers {
        parts.headers.remove(key.as_str());
    }
    for (key, value) in headers {
        let key = HeaderName::from_bytes(key.as_bytes()).map_err(|_| Failure::Unavailable)?;
        let value = HeaderValue::from_str(&value).map_err(|_| Failure::Unavailable)?;
        parts.headers.append(key, value);
    }
    if let Some(query) = query {
        let encoded = url::form_urlencoded::Serializer::new(String::new())
            .extend_pairs(query)
            .finish();
        let path = format!("{}?{encoded}", parts.uri.path());
        let mut uri = parts.uri.clone().into_parts();
        uri.path_and_query = Some(path.parse().map_err(|_| Failure::Unavailable)?);
        parts.uri = axum::http::Uri::from_parts(uri).map_err(|_| Failure::Unavailable)?;
    }
    Ok(())
}

async fn read_document(headers: &HeaderMap, bytes: Bytes, limit: usize) -> Result<Value, Failure> {
    if bytes.is_empty() {
        return Ok(Value::Null);
    }
    let mime = header(headers, "content-type")?.unwrap_or("application/json");
    let mime = mime
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    if mime != "application/json" && !mime.ends_with("+json") {
        return Err(Failure::UnsupportedBody);
    }
    let encoding = header(headers, "content-encoding")?.unwrap_or("identity");
    let value = match encoding.to_ascii_lowercase().as_str() {
        "identity" => serde_json::from_slice(&bytes).map_err(|_| Failure::InvalidBody)?,
        "gzip" => {
            let mut decoded = Vec::new();
            flate2::read::MultiGzDecoder::new(bytes.as_ref())
                .take(limit as u64 + 1)
                .read_to_end(&mut decoded)
                .map_err(|_| Failure::InvalidBody)?;
            if decoded.len() > limit {
                return Err(Failure::TooLarge);
            }
            serde_json::from_slice(&decoded).map_err(|_| Failure::InvalidBody)?
        }
        "zstd" => {
            crate::encoded_request_body::read_native_json(headers, Body::from(bytes), limit, true)
                .await
                .map_err(|_| Failure::InvalidBody)?
                .value
        }
        _ => return Err(Failure::UnsupportedBody),
    };
    if !value.is_object() {
        return Err(Failure::InvalidBody);
    }
    if contains_attachment(&value) {
        return Err(Failure::UnsupportedBody);
    }
    Ok(value)
}

fn header<'a>(headers: &'a HeaderMap, name: &str) -> Result<Option<&'a str>, Failure> {
    let all = headers.get_all(name);
    let mut values = all.iter();
    let first = values.next();
    if values.next().is_some() {
        return Err(Failure::UnsupportedBody);
    }
    first
        .map(|value| value.to_str().map_err(|_| Failure::UnsupportedBody))
        .transpose()
}

fn contains_attachment(value: &Value) -> bool {
    match value {
        Value::Array(array) => array.iter().any(contains_attachment),
        Value::Object(object) => object.iter().any(|(name, value)| {
            (!value.is_null()
                && matches!(
                    name.as_str(),
                    "audio"
                        | "b64_json"
                        | "file_data"
                        | "file_id"
                        | "file_uri"
                        | "fileData"
                        | "fileUri"
                        | "image_url"
                        | "inlineData"
                        | "inline_data"
                        | "input_audio"
                ))
                || contains_attachment(value)
        }),
        Value::String(text) => text
            .get(..5)
            .is_some_and(|prefix| prefix.eq_ignore_ascii_case("data:")),
        _ => false,
    }
}

#[cfg(test)]
#[path = "sensitive_data_tests.rs"]
mod tests;
