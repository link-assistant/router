//! GitHub API credential proxy with a deny-by-default destructive policy.

use std::path::Path;

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderValue, StatusCode};
use axum::response::Response;
use serde::Deserialize;
use serde_json::Value;
#[cfg(test)]
use serde_json::json;

use crate::app_state::AppState;

const POLICY_HEADER: &str = "x-link-assistant-policy";

#[derive(Clone, Debug)]
pub struct GitHubProxyConfig {
    token: Option<String>,
    pub base_url: String,
    pub policy: GitHubPolicy,
}

impl Default for GitHubProxyConfig {
    fn default() -> Self {
        Self {
            token: None,
            base_url: "https://api.github.com".into(),
            policy: GitHubPolicy::default(),
        }
    }
}

impl GitHubProxyConfig {
    /// Load the opt-in proxy from environment configuration.
    ///
    /// `GITHUB_PROXY_TOKEN` contains the operator credential,
    /// `GITHUB_PROXY_BASE_URL` overrides GitHub for tests/enterprise, and
    /// `GITHUB_PROXY_POLICY` points at an ordered JSON rule file.
    pub fn from_env() -> Result<Self, String> {
        let mut token = std::env::var("GITHUB_PROXY_TOKEN")
            .ok()
            .filter(|token| !token.is_empty());
        if token.is_none()
            && let Ok(path) = std::env::var("GITHUB_PROXY_TOKEN_FILE")
            && !path.is_empty()
        {
            token = Some(
                std::fs::read_to_string(&path)
                    .map_err(|error| format!("could not read GitHub credential {path}: {error}"))?
                    .trim()
                    .to_string(),
            )
            .filter(|token| !token.is_empty());
        }
        token = token.or_else(|| {
            std::env::var("GITHUB_PROXY_TOKEN_ENV")
                .ok()
                .and_then(|name| std::env::var(name).ok())
                .filter(|token| !token.is_empty())
        });
        let base_url = std::env::var("GITHUB_PROXY_BASE_URL")
            .unwrap_or_else(|_| "https://api.github.com".into())
            .trim_end_matches('/')
            .to_string();
        let policy = std::env::var("GITHUB_PROXY_POLICY")
            .ok()
            .filter(|path| !path.is_empty())
            .map(|path| GitHubPolicy::from_path(Path::new(&path)))
            .transpose()?
            .unwrap_or_default();
        Ok(Self {
            token,
            base_url,
            policy,
        })
    }

    #[must_use]
    pub const fn enabled(&self) -> bool {
        self.token.is_some()
    }

    #[cfg(test)]
    fn with_token(token: &str, base_url: &str) -> Self {
        Self {
            token: Some(token.into()),
            base_url: base_url.trim_end_matches('/').into(),
            policy: GitHubPolicy::default(),
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize)]
pub struct GitHubPolicy {
    /// First matching configured rule wins; built-in destructive denials are
    /// evaluated afterwards.
    #[serde(default)]
    pub rules: Vec<PolicyRule>,
}

impl GitHubPolicy {
    fn from_path(path: &Path) -> Result<Self, String> {
        let bytes = std::fs::read(path)
            .map_err(|error| format!("could not read GitHub policy {}: {error}", path.display()))?;
        serde_json::from_slice(&bytes)
            .map_err(|error| format!("invalid GitHub policy {}: {error}", path.display()))
    }

    #[must_use]
    pub fn decision(&self, method: &str, path: &str, body: &[u8]) -> PolicyDecision {
        for rule in &self.rules {
            if rule.matches(method, path, body) {
                return rule.effect.into();
            }
        }
        if method.eq_ignore_ascii_case("DELETE") {
            return PolicyDecision::Deny;
        }
        if method.eq_ignore_ascii_case("PATCH")
            && path.contains("/git/refs/")
            && serde_json::from_slice::<Value>(body)
                .ok()
                .and_then(|value| value.get("force").and_then(Value::as_bool))
                == Some(true)
        {
            return PolicyDecision::Deny;
        }
        if path == "/graphql" && destructive_graphql(body) {
            return PolicyDecision::Deny;
        }
        PolicyDecision::Allow
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PolicyEffect {
    Allow,
    Deny,
}

impl From<PolicyEffect> for PolicyDecision {
    fn from(value: PolicyEffect) -> Self {
        match value {
            PolicyEffect::Allow => Self::Allow,
            PolicyEffect::Deny => Self::Deny,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct PolicyRule {
    pub effect: PolicyEffect,
    #[serde(default)]
    pub method: Option<String>,
    /// `*` matches inside one path segment; `**` matches the remainder.
    pub path: String,
    /// Optional case-insensitive substring required in a GraphQL body.
    #[serde(default)]
    pub body_contains: Option<String>,
}

impl PolicyRule {
    fn matches(&self, method: &str, path: &str, body: &[u8]) -> bool {
        self.method
            .as_deref()
            .is_none_or(|expected| expected.eq_ignore_ascii_case(method))
            && glob_matches(&self.path, path)
            && self.body_contains.as_deref().is_none_or(|needle| {
                String::from_utf8_lossy(body)
                    .to_ascii_lowercase()
                    .contains(&needle.to_ascii_lowercase())
            })
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PolicyDecision {
    Allow,
    Deny,
}

fn glob_matches(pattern: &str, value: &str) -> bool {
    if let Some(prefix) = pattern.strip_suffix("/**") {
        return value == prefix
            || value
                .strip_prefix(prefix)
                .is_some_and(|rest| rest.starts_with('/'));
    }
    let pattern = pattern.split('/').collect::<Vec<_>>();
    let value = value.split('/').collect::<Vec<_>>();
    pattern.len() == value.len()
        && pattern
            .iter()
            .zip(value)
            .all(|(expected, actual)| *expected == "*" || *expected == actual)
}

fn destructive_graphql(body: &[u8]) -> bool {
    let Ok(value) = serde_json::from_slice::<Value>(body) else {
        return false;
    };
    let Some(query) = value.get("query").and_then(Value::as_str) else {
        return false;
    };
    let compact = query
        .chars()
        .filter(|character| !character.is_whitespace())
        .collect::<String>()
        .to_ascii_lowercase();
    if !compact.starts_with("mutation") {
        return false;
    }
    let has_delete = query
        .split(|character: char| !(character.is_ascii_alphanumeric() || character == '_'))
        .any(|token| token.to_ascii_lowercase().starts_with("delete"));
    let forced_ref = compact.contains("updateref(")
        && (compact.contains("force:true")
            || value.get("variables").is_some_and(contains_forced_true));
    has_delete || forced_ref
}

fn contains_forced_true(value: &Value) -> bool {
    match value {
        Value::Object(fields) => fields.iter().any(|(name, value)| {
            (name.eq_ignore_ascii_case("force") && value.as_bool() == Some(true))
                || contains_forced_true(value)
        }),
        Value::Array(values) => values.iter().any(contains_forced_true),
        _ => false,
    }
}

pub async fn proxy(State(state): State<AppState>, request: Request) -> Response {
    forward(
        &state.client,
        &state.github,
        state.max_proxy_request_bytes,
        request,
    )
    .await
}

async fn forward(
    client: &reqwest::Client,
    github: &GitHubProxyConfig,
    max_request_bytes: usize,
    request: Request,
) -> Response {
    let Some(token) = github.token.as_deref() else {
        return github_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "GitHub proxy is not configured",
        );
    };
    let (parts, body) = request.into_parts();
    let body = match axum::body::to_bytes(body, max_request_bytes).await {
        Ok(body) => body,
        Err(error) => {
            return github_error(
                StatusCode::PAYLOAD_TOO_LARGE,
                &format!("request body exceeds the proxy limit: {error}"),
            );
        }
    };
    let upstream_path = normalize_path(parts.uri.path());
    if github
        .policy
        .decision(parts.method.as_str(), &upstream_path, &body)
        == PolicyDecision::Deny
    {
        let mut response = github_error(
            StatusCode::FORBIDDEN,
            "Blocked by Link.Assistant.Router GitHub policy",
        );
        response
            .headers_mut()
            .insert(POLICY_HEADER, HeaderValue::from_static("blocked"));
        return response;
    }
    let mut url = upstream_url(&github.base_url, &upstream_path);
    if let Some(query) = parts.uri.query() {
        url.push('?');
        url.push_str(query);
    }
    let mut upstream = client.request(parts.method.clone(), url).bearer_auth(token);
    for name in [
        "accept",
        "content-type",
        "user-agent",
        "time-zone",
        "x-github-api-version",
        "if-none-match",
        "if-modified-since",
    ] {
        if let Some(value) = parts.headers.get(name) {
            upstream = upstream.header(name, value);
        }
    }
    let response = match upstream.body(body).send().await {
        Ok(response) => response,
        Err(error) => {
            return github_error(
                StatusCode::BAD_GATEWAY,
                &format!("GitHub upstream request failed: {error}"),
            );
        }
    };
    let status = response.status();
    let headers = crate::proxy::relay_response_headers(response.headers());
    let bytes = match response.bytes().await {
        Ok(bytes) => bytes,
        Err(error) => {
            return github_error(
                StatusCode::BAD_GATEWAY,
                &format!("GitHub upstream response failed: {error}"),
            );
        }
    };
    let mut result = Response::new(Body::from(bytes));
    *result.status_mut() = status;
    *result.headers_mut() = headers;
    result
}

fn normalize_path(path: &str) -> String {
    path.strip_prefix("/api/v3")
        .or_else(|| path.strip_prefix("/github"))
        .filter(|path| !path.is_empty())
        .unwrap_or_else(|| {
            if path == "/api/graphql" {
                "/graphql"
            } else {
                path
            }
        })
        .to_string()
}

fn upstream_url(base_url: &str, path: &str) -> String {
    if path == "/graphql"
        && let Some(root) = base_url.strip_suffix("/api/v3")
    {
        return format!("{root}/api/graphql");
    }
    format!("{base_url}{path}")
}

fn github_error(status: StatusCode, message: &str) -> Response {
    let dialect = crate::api_error::dialect_for_path("/api/v3");
    crate::api_error::PresentedError {
        status,
        error_type: "policy_error",
        message,
    }
    .render(dialect)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request as HttpRequest;
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    #[test]
    fn enterprise_and_bare_paths_normalize_to_github_rest() {
        assert!(GitHubProxyConfig::with_token("operator", "https://example.test").enabled());
        assert_eq!(normalize_path("/api/v3/rate_limit"), "/rate_limit");
        assert_eq!(normalize_path("/repos/o/r"), "/repos/o/r");
        assert_eq!(normalize_path("/api/graphql"), "/graphql");
        assert_eq!(
            upstream_url("https://github.example/api/v3", "/graphql"),
            "https://github.example/api/graphql"
        );
    }

    #[test]
    fn default_policy_blocks_each_destructive_class() {
        let policy = GitHubPolicy::default();
        assert_eq!(
            policy.decision("DELETE", "/repos/o/r", b""),
            PolicyDecision::Deny
        );
        assert_eq!(
            policy.decision(
                "PATCH",
                "/repos/o/r/git/refs/heads/main",
                br#"{"force":true}"#
            ),
            PolicyDecision::Deny
        );
        assert_eq!(
            policy.decision(
                "POST",
                "/graphql",
                br#"{"query":"mutation { deleteIssue(input:{}) { clientMutationId } }"}"#
            ),
            PolicyDecision::Deny
        );
        assert_eq!(
            policy.decision(
                "PATCH",
                "/repos/o/r/git/refs/heads/main",
                br#"{"force":false}"#
            ),
            PolicyDecision::Allow
        );
        assert_eq!(
            policy.decision(
                "POST",
                "/graphql",
                br#"{"query":"mutation($input:UpdateRefInput!){updateRef(input:$input){clientMutationId}}","variables":{"input":{"force":true}}}"#
            ),
            PolicyDecision::Deny
        );
    }

    #[test]
    fn explicit_allow_overrides_one_default_without_weakening_others() {
        let policy: GitHubPolicy = serde_json::from_value(json!({"rules": [{
            "effect": "allow", "method": "DELETE", "path": "/repos/o/r/issues/*"
        }]}))
        .unwrap();
        assert_eq!(
            policy.decision("DELETE", "/repos/o/r/issues/1", b""),
            PolicyDecision::Allow
        );
        assert_eq!(
            policy.decision("DELETE", "/repos/o/r/releases/1", b""),
            PolicyDecision::Deny
        );
    }

    #[tokio::test]
    async fn forwarding_contains_credentials_and_preserves_rate_limits() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = vec![0_u8; 8 * 1024];
            let read = socket.read(&mut request).await.unwrap();
            socket
                .write_all(
                    b"HTTP/1.1 200 OK\r\ncontent-type: application/json\r\nx-ratelimit-remaining: 42\r\nset-cookie: upstream=secret\r\ncontent-length: 11\r\n\r\n{\"ok\":true}",
                )
                .await
                .unwrap();
            String::from_utf8_lossy(&request[..read]).to_string()
        });
        let config = GitHubProxyConfig::with_token("operator-secret", &format!("http://{address}"));
        let request = HttpRequest::builder()
            .uri("/api/v3/rate_limit")
            .header("authorization", "Bearer caller-placeholder")
            .body(Body::empty())
            .unwrap();

        let response = forward(
            &reqwest::Client::new(),
            &config,
            crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
            request,
        )
        .await;
        let forwarded = server.await.unwrap().to_ascii_lowercase();
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers()["x-ratelimit-remaining"], "42");
        assert!(!response.headers().contains_key("set-cookie"));
        assert!(forwarded.contains("authorization: bearer operator-secret"));
        assert!(!forwarded.contains("caller-placeholder"));
    }
}
