//! Offline validation shared by downstream callers and contract tests.
use serde_json::Value;
use std::collections::BTreeMap;
use std::sync::{Arc, LazyLock, Mutex};

static VALIDATORS: LazyLock<Mutex<BTreeMap<String, Arc<jsonschema::Validator>>>> =
    LazyLock::new(|| Mutex::new(BTreeMap::new()));

fn validate(key: &str, schema: &Value, document: &Value) -> Result<(), String> {
    let validator = {
        let mut validators = VALIDATORS.lock().map_err(|_| "contract cache poisoned")?;
        if let Some(validator) = validators.get(key) {
            validator.clone()
        } else {
            let validator =
                Arc::new(jsonschema::draft202012::new(schema).map_err(|error| error.to_string())?);
            validators.insert(key.into(), validator.clone());
            validator
        }
    };
    validator
        .validate(document)
        .map_err(|error| error.to_string())
}

/// Validate the complete versioned CLI result, including operation-owned fields.
pub fn operation(name: &str, document: &Value) -> Result<(), String> {
    let (_, schema) = super::generated::CLI_SCHEMAS
        .iter()
        .find(|(operation, _)| *operation == name)
        .ok_or_else(|| format!("undocumented operation {name}"))?;
    let schema = serde_json::from_str(schema).map_err(|error| error.to_string())?;
    validate(name, &schema, document)
}

/// Validate an HTTP JSON response against the served route's published schema.
/// Vendor-defined model payloads deliberately permit native extensions.
pub fn http(
    method: &axum::http::Method,
    path: &str,
    status: u16,
    document: &Value,
) -> Result<(), String> {
    let route = crate::route_contract::route_for_path(method, path)
        .ok_or_else(|| format!("undocumented HTTP route {method} {path}"))?;
    let spec: Value =
        serde_json::from_str(super::generated::HTTP).map_err(|error| error.to_string())?;
    let template = route.template.replace("{*", "{");
    let mut operation = &spec["paths"][&template][method.as_str().to_lowercase()];
    if method == axum::http::Method::CONNECT {
        operation = &spec["x-router-any-methods"][&template]["connect"];
    } else if operation.is_null() && route.method == crate::route_contract::RouteMethod::Any {
        operation = spec["x-router-any-methods"][&template]["$ref"]
            .as_str()
            .and_then(|reference| reference.strip_prefix('#'))
            .and_then(|pointer| spec.pointer(pointer))
            .ok_or_else(|| format!("undocumented catch-all response {method} {path}"))?;
    }
    let response = if status < 400 {
        &operation["responses"]["200"]
    } else {
        &operation["responses"]["default"]
    };
    let mut schema = response["content"]["application/json"]["schema"].clone();
    if schema.is_null() {
        return Err(format!(
            "undocumented JSON response {method} {path} ({status})"
        ));
    }
    schema["components"] = spec["components"].clone();
    validate(
        &format!("http:{method}:{template}:{}", status < 400),
        &schema,
        document,
    )
}

/// Validate and decode a CLI payload while keeping the caller's exit handling.
/// Pre-versioned reports are accepted for interoperating with older deployments.
pub fn cli_payload<T: serde::de::DeserializeOwned>(bytes: &[u8]) -> Result<T, String> {
    let value: Value = serde_json::from_slice(bytes).map_err(|error| error.to_string())?;
    let data = if let Some(name) = value.get("operation").and_then(Value::as_str) {
        operation(name, &value)?;
        value["data"].clone()
    } else {
        value
    };
    serde_json::from_value(data).map_err(|error| error.to_string())
}

/// Test/diagnostic middleware validating JSON before a client receives it.
/// Streaming bodies retain their native framing and are tested separately.
pub async fn response_contract(
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let method = request.method().clone();
    let path = request.uri().path().to_owned();
    let response = next.run(request).await;
    // Explicit test-only handlers are not part of the served Router surface.
    if method == axum::http::Method::HEAD
        || method == axum::http::Method::CONNECT && response.status().is_success()
        || path.starts_with("/test/")
        || response.status().as_u16() == 404
            && crate::route_contract::route_for_path(&method, &path).is_none()
        || !response
            .headers()
            .get(axum::http::header::CONTENT_TYPE)
            .is_some_and(|value| value.as_bytes().starts_with(b"application/json"))
    {
        return response;
    }
    let (parts, body) = response.into_parts();
    let bytes = axum::body::to_bytes(body, 16 * 1024 * 1024)
        .await
        .expect("bounded contract response");
    let document: Value = serde_json::from_slice(&bytes).expect("HTTP JSON contract");
    http(&method, &path, parts.status.as_u16(), &document)
        .unwrap_or_else(|error| panic!("HTTP contract {method} {path}: {error}"));
    axum::response::Response::from_parts(parts, axum::body::Body::from(bytes))
}
