//! HTTP clients and health/revocation calls for selected Router origins.

use std::fs;
use std::path::Path;
use std::time::Duration;

use serde_json::Value;

use super::diagnostics::compact;
use super::{AnyError, load_persisted, normalize_server, same_origin, selection};

/// Build a normal-verification client with one optional additional CA bundle.
pub(super) fn client(
    ca_cert: Option<&Path>,
    timeout: Duration,
) -> Result<reqwest::Client, AnyError> {
    let mut builder = reqwest::Client::builder().timeout(timeout);
    if let Some(path) = ca_cert {
        let pem = fs::read(path)
            .map_err(|error| format!("could not read Router CA {}: {error}", path.display()))?;
        let certificates = reqwest::Certificate::from_pem_bundle(&pem)
            .map_err(|error| format!("invalid Router CA {}: {error}", path.display()))?;
        if certificates.is_empty() {
            return Err(format!("Router CA {} contains no certificates", path.display()).into());
        }
        for certificate in certificates {
            builder = builder.add_root_certificate(certificate);
        }
    }
    builder
        .build()
        .map_err(|error| format!("could not build Router HTTP client: {error}").into())
}

pub(super) async fn verify_health(base_url: &str) -> Result<(), AnyError> {
    let client = client(None, Duration::from_secs(10))?;
    verify_health_with_client(&client, base_url).await
}

pub(super) async fn verify_health_with_client(
    client: &reqwest::Client,
    base_url: &str,
) -> Result<(), AnyError> {
    let url = format!(
        "{}{}",
        base_url.trim_end_matches('/'),
        crate::route_contract::route_template(crate::route_contract::RouteId::Health)
    );
    let response = client.get(&url).send().await.map_err(|error| {
        let mut rendered = error.to_string();
        let mut source = std::error::Error::source(&error);
        while let Some(cause) = source {
            rendered.push_str(": ");
            rendered.push_str(&cause.to_string());
            source = cause.source();
        }
        if rendered.to_ascii_lowercase().contains("certificate") {
            format!("TLS certificate validation failed for {url}: {rendered}")
        } else {
            format!("router is unreachable at {url}: {rendered}")
        }
    })?;
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    let router_json = serde_json::from_str::<Value>(&body).is_ok_and(|value| {
        value.get("status").and_then(Value::as_str) == Some("ok")
            || value.get("version").and_then(Value::as_str).is_some()
    });
    if status.is_success() && (body.trim() == "ok" || router_json) {
        Ok(())
    } else {
        Err(format!(
            "{url} did not identify a Link.Assistant.Router ({status}): {}",
            compact(&body)
        )
        .into())
    }
}

/// Revoke one token record on a Router, using trust associated with its origin.
///
/// A credential that outlives its command has to remain revocable. Permanent
/// configuration deliberately keeps its token, so undo must be able to revoke
/// it without requiring a system-wide CA installation (issues #190, #558).
pub async fn revoke(base_url: &str, admin_token: &str, id: &str) -> Result<(), AnyError> {
    let base_url = normalize_server(base_url)?;
    let persisted = load_persisted().ok().flatten();
    let ca_name = persisted.as_ref().and_then(|config| {
        let management = config
            .management_server
            .as_deref()
            .unwrap_or(&config.server);
        if same_origin(management, &base_url) {
            config.management_ca_cert.as_deref().or_else(|| {
                same_origin(&config.server, management)
                    .then_some(config.ca_cert.as_deref())
                    .flatten()
            })
        } else if same_origin(&config.server, &base_url) {
            config.ca_cert.as_deref()
        } else {
            None
        }
    });
    let ca_cert = selection::certificate_path(ca_name)?;
    let client = client(ca_cert.as_deref(), Duration::from_secs(10))?;
    revoke_with_client(&client, &base_url, admin_token, id).await
}

pub(super) async fn revoke_with_client(
    client: &reqwest::Client,
    base_url: &str,
    admin_token: &str,
    id: &str,
) -> Result<(), AnyError> {
    let url = crate::route_contract::management_endpoint(
        base_url,
        crate::route_contract::RouteId::RevokeToken,
    );
    let response = client
        .post(&url)
        .bearer_auth(admin_token)
        .json(&serde_json::json!({"id": id}))
        .send()
        .await
        .map_err(|error| format!("could not revoke the token at {url}: {error}"))?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("token revocation failed at {url} ({})", response.status()).into())
    }
}
