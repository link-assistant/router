//! Explicit bounded HTTP value operations. Transport remains a separate effect.
use base64::{Engine as _, engine::general_purpose::STANDARD};
use crate::translation_core::Json;

const MAX_HEADERS: usize = 128;
const MAX_HEADER_BYTES: usize = 65_536;
const MAX_ENCODED_BODY: usize = 1_048_576;

fn error(message: &str) -> String { message.to_owned() }
fn decoded(value: &str) -> Result<Vec<u8>, String> {
    if value.len() > MAX_ENCODED_BODY { return Err(error("HTTP body bound")); }
    let bytes = STANDARD.decode(value).map_err(|_| error("invalid HTTP base64"))?;
    if STANDARD.encode(&bytes) != value { return Err(error("invalid HTTP base64")); }
    Ok(bytes)
}
fn headers(value: &Json) -> Result<Vec<(String, String)>, String> {
    let rows = value.as_array().ok_or_else(|| error("invalid HTTP headers"))?;
    if rows.len() > MAX_HEADERS { return Err(error("HTTP header count bound")); }
    let mut result = Vec::with_capacity(rows.len());
    let mut total = 0_usize;
    for row in rows {
        let row = row.as_array().filter(|row| row.len() == 2).ok_or_else(|| error("invalid HTTP header pair"))?;
        let name = row[0].as_str().ok_or_else(|| error("invalid HTTP header name"))?;
        let name = header_name(name)?;
        let encoded = row[1].as_str().ok_or_else(|| error("invalid HTTP header value"))?;
        if encoded.len() > 87_384 { return Err(error("HTTP header bytes bound")); }
        let bytes = decoded(encoded)?;
        let _ = reqwest::header::HeaderValue::from_bytes(&bytes).map_err(|_| error("invalid HTTP header value"))?;
        total = total.saturating_add(name.len()).saturating_add(bytes.len());
        if total > MAX_HEADER_BYTES { return Err(error("HTTP header bytes bound")); }
        result.push((name, encoded.to_owned()));
    }
    Ok(result)
}
fn header_name(value: &str) -> Result<String, String> {
    if !value.is_ascii() { return Err(error("invalid HTTP header name")); }
    if value.len() > 256 { return Err(error("HTTP header name bound")); }
    reqwest::header::HeaderName::from_bytes(value.as_bytes()).map(|name| name.as_str().to_owned()).map_err(|_| error("invalid HTTP header name"))
}
fn header_value(value: &str) -> Result<(), String> {
    if value.len() > 87_384 { return Err(error("HTTP header bytes bound")); }
    let bytes = decoded(value)?;
    let _ = reqwest::header::HeaderValue::from_bytes(&bytes).map_err(|_| error("invalid HTTP header value"))?;
    Ok(())
}
fn response(value: &Json) -> Result<(), String> {
    let object = value.as_object().ok_or_else(|| error("invalid HTTP response"))?;
    if object.len() != 4 || value.get("kind").and_then(Json::as_str) != Some("response") || !value.get("headers").is_some_and(Json::is_array) || !value.get("body_base64").is_some_and(Json::is_string) {
        return Err(error("invalid HTTP response"));
    }
    let status = value.get("status").and_then(Json::as_u64).ok_or_else(|| error("invalid HTTP status"))?;
    if !(100..=999).contains(&status) { return Err(error("invalid HTTP status")); }
    Ok(())
}

pub fn http_headers_normalize(value: &Json) -> Result<Json, String> {
    Ok(serde_json::json!(headers(value)?))
}
pub fn http_headers_get_all(value: &Json, name: &str) -> Result<Json, String> {
    let name = header_name(name)?;
    Ok(serde_json::json!(headers(value)?.into_iter().filter(|(key, _)| key == &name).map(|(_, value)| value).collect::<Vec<_>>()))
}
pub fn http_headers_append(value: &Json, name: &str, encoded: &str) -> Result<Json, String> {
    let mut rows = headers(value)?;
    let name = header_name(name)?;
    header_value(encoded)?;
    rows.push((name, encoded.to_owned()));
    http_headers_normalize(&serde_json::json!(rows))
}
pub fn http_headers_set(value: &Json, name: &str, encoded: &str) -> Result<Json, String> {
    let name = header_name(name)?;
    let rows = headers(value)?;
    header_value(encoded)?;
    let first = rows.iter().position(|(key, _)| key == &name);
    let mut output = Vec::new();
    for (index, (key, value)) in rows.into_iter().enumerate() {
        if Some(index) == first { output.push((name.clone(), encoded.to_owned())); }
        if key != name { output.push((key, value)); }
    }
    if first.is_none() { output.push((name, encoded.to_owned())); }
    http_headers_normalize(&serde_json::json!(output))
}
pub fn http_headers_remove(value: &Json, name: &str) -> Result<Json, String> {
    let name = header_name(name)?;
    Ok(serde_json::json!(headers(value)?.into_iter().filter(|(key, _)| key != &name).collect::<Vec<_>>()))
}
pub fn http_request(method: &str, url: &str, values: &Json, body: &str) -> Result<Json, String> {
    if method.is_empty() || method.len() > 32 || !method.bytes().all(|byte| byte.is_ascii_alphanumeric() || b"!#$%&'*+-.^_`|~".contains(&byte)) { return Err(error("invalid HTTP method")); }
    if url.is_empty() || url.len() > 8192 || !url.bytes().all(|byte| byte.is_ascii_graphic()) { return Err(error("invalid HTTP URL")); }
    let parsed = reqwest::Url::parse(url).map_err(|_| error("invalid HTTP URL"))?;
    let authority = url.split_once("://").map(|(_, rest)| rest.split(['/', '\\', '?', '#']).next().unwrap_or("")).ok_or_else(|| error("invalid HTTP URL"))?;
    if authority.contains('@') || url.contains('#') { return Err(error("invalid HTTP URL")); }
    if !["http", "https"].contains(&parsed.scheme()) || parsed.host_str().is_none() || !parsed.username().is_empty() || parsed.password().is_some() || parsed.fragment().is_some() { return Err(error("invalid HTTP URL")); }
    let headers = headers(values)?;
    let _ = decoded(body)?;
    Ok(serde_json::json!({"kind":"request","method":method,"url":url,"headers":headers,"body_base64":body}))
}
pub fn http_response(status: u64, values: &Json, body: &str) -> Result<Json, String> {
    if !(100..=999).contains(&status) { return Err(error("invalid HTTP status")); }
    let headers = headers(values)?;
    let _ = decoded(body)?;
    Ok(serde_json::json!({"kind":"response","status":status,"headers":headers,"body_base64":body}))
}
pub fn http_status(value: &Json) -> Result<u64, String> {
    response(value)?;
    value.get("status").and_then(Json::as_u64).ok_or_else(|| error("invalid HTTP status"))
}
pub fn http_is_success(value: &Json) -> Result<bool, String> {
    let status = http_status(value)?;
    Ok((200..300).contains(&status))
}
pub fn http_body_base64(value: &Json) -> Result<&str, String> {
    response(value)?;
    let body = value.get("body_base64").and_then(Json::as_str).ok_or_else(|| error("invalid HTTP response"))?;
    let _ = decoded(body)?;
    Ok(body)
}
pub fn http_body_text(value: &Json) -> Result<String, String> {
    response(value)?;
    let body = value.get("body_base64").and_then(Json::as_str).ok_or_else(|| error("invalid HTTP response"))?;
    String::from_utf8(decoded(body)?).map_err(|_| error("invalid HTTP UTF8 body"))
}
pub fn http_body_json(value: &Json) -> Result<Json, String> {
    crate::translation_core::json_parse(&http_body_text(value)?).ok_or_else(|| error("invalid HTTP JSON body"))
}
