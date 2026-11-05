//! Explicit guarded HTTP/1 pull transport. Implementation internals stay native.
use base64::{Engine as _, engine::general_purpose::STANDARD};
use crate::translation_core::Json;
use crate::translation_async_control_core::{Cancellation, cancel_is_set, cancel_wait};
use crate::translation_http_protocol_core::{http_request, http_response};
use crate::upstream_guard::{GuardedResolver, NetworkPolicy};
use std::{collections::VecDeque, future::Future, sync::Arc, time::Duration};
use tokio::sync::{OwnedSemaphorePermit, Semaphore};

const MAX_DELAY_MS: u64 = 86_400_000;
const MAX_CHUNK: usize = 65_536;
const MAX_PENDING_BYTES: usize = 1_048_576;
const MAX_BUFFERED_BODY: usize = 786_432;
const CANCELLED: &str = "HTTP cancelled";
const TIMEOUT: &str = "HTTP timeout";
const FAILED: &str = "HTTP request failed";
const BODY_FAILED: &str = "HTTP body read failed";
const RESOURCE: &str = "HTTP transport resource bound";
const CLOSED: &str = "HTTP client closed";

pub struct Client {
    inner: Option<reqwest::Client>, policy: NetworkPolicy, first_byte_ms: u64,
    slots: Arc<Semaphore>,
}
pub struct Stream {
    response: Option<reqwest::Response>, head: Json, pending: VecDeque<u8>,
    permit: Option<OwnedSemaphorePermit>,
}
fn error(message: &str) -> String { message.to_owned() }
fn network_error(value: &reqwest::Error, body: bool) -> String {
    error(if value.is_timeout() { TIMEOUT } else if body { BODY_FAILED } else { FAILED })
}
async fn timed<T, F: Future<Output = T>>(milliseconds: u64, operation: F) -> Result<T, String> {
    if milliseconds == 0 { Ok(operation.await) }
    else { tokio::time::timeout(Duration::from_millis(milliseconds), operation).await.map_err(|_| error(TIMEOUT)) }
}
pub fn client_new(connect_ms: u64, idle_ms: u64, first_byte_ms: u64, allow: &str) -> Result<Client, String> {
    if [connect_ms, idle_ms, first_byte_ms].iter().any(|value| *value > MAX_DELAY_MS) { return Err(error("invalid HTTP timeout")); }
    let _ = crate::translation_text_core::len_utf8(allow);
    let policy = NetworkPolicy::parse(Some(allow));
    let mut builder = reqwest::Client::builder().redirect(reqwest::redirect::Policy::none())
        .no_proxy().http1_only().no_gzip().no_brotli().no_deflate().no_zstd()
        .dns_resolver(Arc::new(GuardedResolver::new(policy)));
    if connect_ms != 0 { builder = builder.connect_timeout(Duration::from_millis(connect_ms)); }
    if idle_ms != 0 { builder = builder.read_timeout(Duration::from_millis(idle_ms)); }
    let inner = builder.build().map_err(|_| error(FAILED))?;
    Ok(Client { inner: Some(inner), policy, first_byte_ms, slots: Arc::new(Semaphore::new(32)) })
}
pub fn client_clone(value: &Client) -> Result<Client, String> {
    Ok(Client { inner: Some(value.inner.as_ref().ok_or_else(|| error(CLOSED))?.clone()), policy: value.policy,
        first_byte_ms: value.first_byte_ms, slots: value.slots.clone() })
}
pub fn client_dispose(value: &mut Client) { drop(value.inner.take()); }
fn string<'a>(value: &'a Json, key: &str) -> Result<&'a str, String> {
    value.get(key).and_then(Json::as_str).ok_or_else(|| error("invalid HTTP request"))
}
fn validated_request(value: &Json) -> Result<Json, String> {
    if value.as_object().is_none_or(|fields| fields.len() != 5) || string(value,"kind")? != "request" { return Err(error("invalid HTTP request")); }
    http_request(string(value,"method")?, string(value,"url")?, value.get("headers").ok_or_else(|| error("invalid HTTP request"))?, string(value,"body_base64")?)
}
const FRAMING_HEADERS: &[&str] = &["host","content-length","transfer-encoding","connection","upgrade","proxy-authorization","proxy-connection","expect"];
pub async fn open(value: &Client, request: &Json, cancellation: &Cancellation) -> Result<Stream, String> {
    if cancel_is_set(cancellation) { return Err(error(CANCELLED)); }
    let client = value.inner.as_ref().ok_or_else(|| error(CLOSED))?;
    let request = validated_request(request)?;
    let url = string(&request,"url")?;
    value.policy.check_base_url(url).map_err(|_| error("HTTP destination refused"))?;
    let method = string(&request,"method")?;
    if method.eq_ignore_ascii_case("CONNECT") { return Err(error("unsupported HTTP upgrade or framing")); }
    let mut headers = reqwest::header::HeaderMap::new();
    for row in request["headers"].as_array().ok_or_else(|| error("invalid HTTP headers"))? {
        let name = row[0].as_str().ok_or_else(|| error("invalid HTTP header name"))?;
        if FRAMING_HEADERS.contains(&name) { return Err(error("unsupported HTTP upgrade or framing")); }
        let bytes = STANDARD.decode(row[1].as_str().ok_or_else(|| error("invalid HTTP header value"))?).map_err(|_| error("invalid HTTP base64"))?;
        headers.append(reqwest::header::HeaderName::from_bytes(name.as_bytes()).map_err(|_| error("invalid HTTP header name"))?,reqwest::header::HeaderValue::from_bytes(&bytes).map_err(|_| error("invalid HTTP header value"))?);
    }
    if !headers.contains_key(reqwest::header::ACCEPT) { headers.insert(reqwest::header::ACCEPT,reqwest::header::HeaderValue::from_static("*/*")); }
    let bytes = STANDARD.decode(string(&request,"body_base64")?).map_err(|_| error("invalid HTTP base64"))?;
    headers.insert(reqwest::header::CONTENT_LENGTH,reqwest::header::HeaderValue::from_str(&bytes.len().to_string()).map_err(|_| error(RESOURCE))?);
    let permit = value.slots.clone().try_acquire_owned().map_err(|_| error(RESOURCE))?;
    let operation = client.request(reqwest::Method::from_bytes(method.as_bytes()).map_err(|_| error("invalid HTTP method"))?,url).headers(headers).body(bytes).send();
    let response = tokio::select! { biased;
        () = cancel_wait(cancellation) => return Err(error(CANCELLED)),
        result = timed(value.first_byte_ms,operation) => result?.map_err(|failure| network_error(&failure,false))?,
    };
    if response.status().as_u16() == 101 { return Err(error("unsupported HTTP upgrade or framing")); }
    let mut rows: Vec<(String,String)> = response.headers().iter().map(|(name,value)|(name.as_str().to_owned(),STANDARD.encode(value.as_bytes()))).collect();
    rows.sort_by(|left,right| left.0.cmp(&right.0));
    let headers = Json::Array(rows.into_iter().map(|(name,value)|Json::Array(vec![Json::String(name),Json::String(value)])).collect());
    let head = http_response(u64::from(response.status().as_u16()),&headers,"")?;
    Ok(Stream { response: Some(response), head, pending: VecDeque::new(), permit: Some(permit) })
}
#[must_use]
pub fn head(value: &Stream) -> Json { value.head.clone() }
pub fn close(value: &mut Stream) { drop(value.response.take()); value.pending.clear(); drop(value.permit.take()); }
pub async fn read(value: &mut Stream, cancellation: &Cancellation) -> Result<Option<String>, String> {
    if cancel_is_set(cancellation) { close(value); return Err(error(CANCELLED)); }
    if !value.pending.is_empty() { let bytes: Vec<u8> = value.pending.drain(..value.pending.len().min(MAX_CHUNK)).collect(); return Ok(Some(STANDARD.encode(bytes))); }
    let Some(response) = value.response.as_mut() else { return Ok(None); };
    let selected = tokio::select! { biased;
        () = cancel_wait(cancellation) => None,
        result = response.chunk() => Some(result),
    };
    let Some(chunk) = selected else { close(value); return Err(error(CANCELLED)); };
    match chunk {
        Err(failure) => { let message = network_error(&failure,true); close(value); Err(message) },
        Ok(None) => { close(value); Ok(None) },
        Ok(Some(bytes)) => {
            if bytes.len() > MAX_PENDING_BYTES { close(value); return Err(error(RESOURCE)); }
            let count = bytes.len().min(MAX_CHUNK); value.pending.extend(&bytes[count..]);
            Ok(Some(STANDARD.encode(&bytes[..count])))
        },
    }
}
pub async fn send(value: &Client, request: &Json, cancellation: &Cancellation) -> Result<Json, String> {
    let mut stream = open(value,request,cancellation).await?;
    let mut body = Vec::new();
    while let Some(chunk) = read(&mut stream,cancellation).await? {
        let bytes = STANDARD.decode(chunk).map_err(|_| error(BODY_FAILED))?;
        if bytes.len() > MAX_BUFFERED_BODY.saturating_sub(body.len()) { close(&mut stream); return Err(error("HTTP body bound")); }
        body.extend(bytes);
    }
    let mut output = head(&stream); output["body_base64"] = Json::String(STANDARD.encode(body)); Ok(output)
}
