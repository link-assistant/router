//! GitHub API credential proxy with a deny-by-default destructive policy.

use std::path::{Path, PathBuf};

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderValue, StatusCode};
use axum::response::Response;
use serde::Deserialize;
use serde_json::Value;
#[cfg(test)]
use serde_json::json;

use crate::app_state::AppState;

pub(crate) const POLICY_HEADER: &str = "x-link-assistant-policy";

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
        // A credential stored by `router auth gh`, then a mounted `gh`
        // configuration: both are existing logins the deployment can reuse
        // rather than a second credential to mint and rotate (issue #263).
        // Consulted last, so every explicit environment setting still wins.
        token = token.or_else(|| {
            std::env::var("DATA_DIR")
                .ok()
                .filter(|dir| !dir.is_empty())
                .and_then(|dir| stored_credential(Path::new(&dir)))
        });
        token = token.or_else(|| {
            gh_config_directory()
                .as_deref()
                .and_then(token_from_gh_config)
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

    /// The operator credential this proxy presents upstream.
    #[must_use]
    pub fn credential(&self) -> Option<&str> {
        self.token.as_deref()
    }

    /// The ordered rules this deployment enforces.
    #[must_use]
    pub const fn policy_rules(&self) -> &GitHubPolicy {
        &self.policy
    }

    /// The git transport base for the configured GitHub host.
    ///
    /// Derived from the API base so an enterprise or test deployment stays
    /// consistent across both surfaces rather than needing a second setting.
    #[must_use]
    pub fn git_base_url(&self) -> String {
        if let Some(host) = self.base_url.strip_prefix("https://api.github.com") {
            return format!("https://github.com{host}");
        }
        self.base_url.clone()
    }

    /// A proxy configured with an operator credential.
    #[must_use]
    pub fn with_credential(token: &str, base_url: &str) -> Self {
        Self {
            token: Some(token.into()),
            base_url: base_url.trim_end_matches('/').into(),
            policy: GitHubPolicy::default(),
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
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

    /// Whether an operator has explicitly permitted a destructive update to
    /// one ref of one repository.
    ///
    /// Expressed as an ordinary allow rule whose path is the git ref, so the
    /// same ordered file governs both surfaces and a permission names exactly
    /// the ref it applies to (issue #261).
    #[must_use]
    pub fn allows_git_ref(&self, repository: &str, git_ref: &str) -> bool {
        let path = format!("/git/{repository}/{git_ref}");
        self.rules.iter().any(|rule| {
            matches!(rule.effect, PolicyEffect::Allow)
                && rule
                    .method
                    .as_deref()
                    .is_none_or(|method| method.eq_ignore_ascii_case("GIT"))
                && glob_matches(&rule.path, &path)
        })
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
#[serde(deny_unknown_fields)]
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
    let names = graphql_name_tokens(query);
    if !names.iter().any(|name| name == "mutation") {
        return false;
    }
    let has_delete = names.iter().any(|name| name.starts_with("delete"));
    let updates_ref = names
        .iter()
        .any(|name| matches!(name.as_str(), "updateref" | "updaterefs"));
    let forced_ref = updates_ref
        && (compact.contains("force:true")
            || value.get("variables").is_some_and(contains_forced_true));
    let deletes_ref = names.iter().any(|name| name == "updaterefs")
        && (contains_inline_zero_after_oid(&compact)
            || value.get("variables").is_some_and(contains_zero_after_oid));
    has_delete || forced_ref || deletes_ref
}

/// GraphQL names outside comments and quoted values. Destructive operations
/// may follow fragments or another named operation, so checking only the
/// document prefix is unsafe.
fn graphql_name_tokens(query: &str) -> Vec<String> {
    let characters = query.chars().collect::<Vec<_>>();
    let mut tokens = Vec::new();
    let mut position = 0;
    while position < characters.len() {
        if characters[position] == '#' {
            position += 1;
            while position < characters.len() && characters[position] != '\n' {
                position += 1;
            }
            continue;
        }
        if characters[position] == '"' {
            let block = characters.get(position + 1) == Some(&'"')
                && characters.get(position + 2) == Some(&'"');
            position += if block { 3 } else { 1 };
            while position < characters.len() {
                if block
                    && characters.get(position) == Some(&'"')
                    && characters.get(position + 1) == Some(&'"')
                    && characters.get(position + 2) == Some(&'"')
                {
                    position += 3;
                    break;
                }
                if !block && characters[position] == '"' {
                    position += 1;
                    break;
                }
                if !block && characters[position] == '\\' {
                    position += 1;
                }
                position += 1;
            }
            continue;
        }
        if characters[position].is_ascii_alphabetic() || characters[position] == '_' {
            let start = position;
            position += 1;
            while position < characters.len()
                && (characters[position].is_ascii_alphanumeric() || characters[position] == '_')
            {
                position += 1;
            }
            tokens.push(
                characters[start..position]
                    .iter()
                    .collect::<String>()
                    .to_ascii_lowercase(),
            );
            continue;
        }
        position += 1;
    }
    tokens
}

fn contains_inline_zero_after_oid(compact_query: &str) -> bool {
    let mut remainder = compact_query;
    while let Some((_, after)) = remainder.split_once("afteroid:\"") {
        let value = after.split('"').next().unwrap_or_default();
        if value.len() >= 40 && value.bytes().all(|byte| byte == b'0') {
            return true;
        }
        remainder = after;
    }
    false
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

fn contains_zero_after_oid(value: &Value) -> bool {
    match value {
        Value::Object(fields) => fields.iter().any(|(name, value)| {
            (name.eq_ignore_ascii_case("afterOid")
                && value
                    .as_str()
                    .is_some_and(|oid| oid.len() >= 40 && oid.bytes().all(|byte| byte == b'0')))
                || contains_zero_after_oid(value)
        }),
        Value::Array(values) => values.iter().any(contains_zero_after_oid),
        _ => false,
    }
}

pub async fn proxy(State(state): State<AppState>, request: Request) -> Response {
    // The route layer has already authenticated this caller, but it discards
    // the claims. Re-reading them here is what lets a token carry a repository
    // scope (issue #262); an admin credential yields unrestricted claims.
    let scope = crate::proxy::authenticate_client_error(&state, request.headers())
        .map(|claims| claims.github_repos)
        .unwrap_or_default();
    forward(
        &state.client,
        &state.github,
        state.max_proxy_request_bytes,
        &scope,
        request,
    )
    .await
}

/// Where a credential stored by `router auth gh` lives.
#[must_use]
pub fn stored_credential_path(data_dir: &Path) -> PathBuf {
    data_dir.join("github-credential")
}

/// Persist the GitHub credential the proxy will present upstream.
///
/// Written owner-only, like every other secret this crate stores.
///
/// # Errors
///
/// Returns an operator-readable message when the write cannot land.
pub fn store_credential(data_dir: &Path, token: &str) -> Result<PathBuf, String> {
    let path = stored_credential_path(data_dir);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("could not create {}: {error}", parent.display()))?;
    }
    crate::durable_file::atomic_write_owner_only(&path, token.trim().as_bytes())
        .map_err(|error| crate::durable_file::describe_write_failure(&path, &error))?;
    Ok(path)
}

/// The credential stored by `router auth gh`, when one exists.
#[must_use]
pub fn stored_credential(data_dir: &Path) -> Option<String> {
    std::fs::read_to_string(stored_credential_path(data_dir))
        .ok()
        .map(|token| token.trim().to_string())
        .filter(|token| !token.is_empty())
}

/// The `gh` configuration directory this deployment should read.
///
/// `GH_CONFIG_DIR` is what `gh` itself honours, so mounting a host config into
/// a container needs no router-specific variable.
#[must_use]
pub fn gh_config_directory() -> Option<PathBuf> {
    if let Ok(dir) = std::env::var("GH_CONFIG_DIR")
        && !dir.is_empty()
    {
        return Some(PathBuf::from(dir));
    }
    std::env::var("HOME")
        .ok()
        .filter(|home| !home.is_empty())
        .map(|home| PathBuf::from(home).join(".config/gh"))
}

/// Read the GitHub credential out of a `gh` configuration directory.
///
/// `gh` stores it as `hosts.yml` with an `oauth_token:` entry under a host key.
/// Parsed by line rather than with a YAML dependency: the file is written by
/// `gh` in a fixed shape, and a whole parser for one scalar would be more to
/// go wrong than it saves.
#[must_use]
pub fn token_from_gh_config(directory: &Path) -> Option<String> {
    let contents = std::fs::read_to_string(directory.join("hosts.yml")).ok()?;
    contents.lines().find_map(|line| {
        let (key, value) = line.split_once(':')?;
        (key.trim() == "oauth_token")
            .then(|| value.trim().trim_matches(['"', '\'']).to_string())
            .filter(|token| !token.is_empty())
    })
}

/// The `owner/repo` a GitHub REST path acts on, when it names one.
///
/// Only paths that clearly identify a repository can be scoped; anything else
/// (`/user`, `/graphql`, search) is left to the policy rules, since guessing a
/// repository out of an unfamiliar shape would either leak or block wrongly.
#[must_use]
pub fn repository_in_path(path: &str) -> Option<String> {
    let rest = path.strip_prefix("/repos/")?;
    let mut parts = rest.split('/');
    let owner = parts.next().filter(|part| !part.is_empty())?;
    let repo = parts.next().filter(|part| !part.is_empty())?;
    Some(format!("{owner}/{repo}"))
}

async fn forward(
    client: &reqwest::Client,
    github: &GitHubProxyConfig,
    max_request_bytes: usize,
    allowed_repositories: &[String],
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
    // A token's repository scope is evaluated ahead of the shared rules, so a
    // scoped credential cannot reach outside its repositories even where the
    // global policy would allow the call (issue #262).
    if !allowed_repositories.is_empty()
        && !repository_in_path(&upstream_path).is_some_and(|repository| {
            allowed_repositories
                .iter()
                .any(|allowed| allowed.eq_ignore_ascii_case(&repository))
        })
    {
        let mut response = github_error(
            StatusCode::FORBIDDEN,
            "Blocked by Link.Assistant.Router GitHub policy: outside this token's repositories",
        );
        response
            .headers_mut()
            .insert(POLICY_HEADER, HeaderValue::from_static("blocked"));
        return response;
    }
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
        assert!(GitHubProxyConfig::with_credential("operator", "https://example.test").enabled());
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
        for path in [
            "/repos/o/r",
            "/repos/o/r/git/refs/heads/main",
            "/repos/o/r/git/refs/tags/v1",
            "/repos/o/r/releases/1",
            "/repos/o/r/issues/1",
            "/repos/o/r/issues/comments/1",
            "/repos/o/r/actions/workflows/ci.yml",
            "/orgs/o/packages/container/p/versions/1",
            "/repos/o/r/deploy-keys/1",
            "/repos/o/r/hooks/1",
        ] {
            assert_eq!(
                policy.decision("DELETE", path, b""),
                PolicyDecision::Deny,
                "DELETE {path} must be blocked by default"
            );
        }
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
        assert_eq!(
            policy.decision(
                "POST",
                "/graphql",
                br##"{"query":"# a harmless preface\nfragment F on Repository { name }\nmutation Remove { deleteRelease(input:{releaseId:\"x\"}) { clientMutationId } }"}"##
            ),
            PolicyDecision::Deny
        );
        assert_eq!(
            policy.decision(
                "POST",
                "/graphql",
                br#"{"query":"mutation($updates:[RefUpdate!]!){updateRefs(input:{repositoryId:\"r\",refUpdates:$updates}){clientMutationId}}","variables":{"updates":[{"name":"refs/heads/main","afterOid":"0000000000000000000000000000000000000000"}]}}"#
            ),
            PolicyDecision::Deny
        );
        assert_eq!(
            policy.decision(
                "POST",
                "/graphql",
                br#"{"query":"mutation { updateRefs(input:{repositoryId:\"r\",refUpdates:[{name:\"refs/heads/main\",afterOid:\"0000000000000000000000000000000000000000\"}]}) { clientMutationId } }"}"#
            ),
            PolicyDecision::Deny
        );
    }

    #[test]
    fn policy_rejects_misspelled_configuration_fields() {
        let error = serde_json::from_value::<GitHubPolicy>(json!({
            "rules": [{"effect":"deny", "path":"/**", "methd":"POST"}]
        }))
        .unwrap_err();
        assert!(error.to_string().contains("unknown field `methd`"));
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
        let config =
            GitHubProxyConfig::with_credential("operator-secret", &format!("http://{address}"));
        let request = HttpRequest::builder()
            .uri("/api/v3/rate_limit")
            .header("authorization", "Bearer caller-placeholder")
            .body(Body::empty())
            .unwrap();

        let response = forward(
            &reqwest::Client::new(),
            &config,
            crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
            &[],
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

    /// A scoped token reaches only its own repositories.
    ///
    /// Without this, every token that could reach the proxy acted as the
    /// operator across their whole account, so one task going wrong had the
    /// account as its blast radius rather than the one repository it was
    /// given (issue #262).
    #[test]
    fn a_scoped_token_names_only_its_own_repositories() {
        assert_eq!(
            repository_in_path("/repos/link-assistant/hive-mind/issues"),
            Some("link-assistant/hive-mind".to_string())
        );
        assert_eq!(
            repository_in_path("/repos/acme/demo"),
            Some("acme/demo".to_string())
        );
        // Not repository-shaped: left to the policy rules rather than guessed at.
        assert_eq!(repository_in_path("/user"), None);
        assert_eq!(repository_in_path("/graphql"), None);
        assert_eq!(repository_in_path("/repos/onlyowner"), None);
        assert_eq!(repository_in_path("/orgs/acme/repos"), None);
    }

    /// An unrestricted token keeps reaching everything the operator credential
    /// reaches, which is the default and the pre-existing behaviour.
    #[tokio::test]
    async fn an_unrestricted_token_is_not_narrowed() {
        let claims = crate::token::TokenClaims {
            sub: "t".into(),
            iat: 0,
            exp: i64::MAX,
            label: String::new(),
            scope: String::new(),
            github_repos: Vec::new(),
        };

        assert!(claims.may_reach_repository("acme/anything"));
        assert!(claims.may_reach_repository("other/repo"));
    }

    /// A scope is matched case-insensitively, as GitHub treats these names —
    /// otherwise a differently-cased request would evade the restriction.
    #[tokio::test]
    async fn a_scope_is_case_insensitive_and_exclusive() {
        let claims = crate::token::TokenClaims {
            sub: "t".into(),
            iat: 0,
            exp: i64::MAX,
            label: String::new(),
            scope: String::new(),
            github_repos: vec!["link-assistant/hive-mind".to_string()],
        };

        assert!(claims.may_reach_repository("link-assistant/hive-mind"));
        assert!(claims.may_reach_repository("Link-Assistant/Hive-Mind"));
        assert!(!claims.may_reach_repository("link-assistant/router"));
        assert!(!claims.may_reach_repository("someone-else/hive-mind"));
    }

    /// The scope is enforced by the proxy, not merely representable.
    ///
    /// A request outside the token's repositories must be refused before the
    /// operator credential is attached — the whole point being that the caller
    /// never acts as the operator outside its scope (issue #262).
    #[tokio::test]
    async fn a_request_outside_the_scope_never_reaches_github() {
        let config = GitHubProxyConfig {
            base_url: "http://127.0.0.1:1".to_string(),
            token: Some("operator-secret".to_string()),
            policy: GitHubPolicy::default(),
        };
        let scope = vec!["link-assistant/hive-mind".to_string()];

        let refused = forward(
            &reqwest::Client::new(),
            &config,
            crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
            &scope,
            HttpRequest::builder()
                .uri("/api/v3/repos/someone-else/private/issues")
                .body(Body::empty())
                .unwrap(),
        )
        .await;

        assert_eq!(refused.status(), StatusCode::FORBIDDEN);
        assert_eq!(refused.headers()[POLICY_HEADER], "blocked");
        // The upstream is an unroutable port: had the request been forwarded,
        // this would be a transport error rather than a policy refusal.
    }

    /// A request inside the scope is not refused by the scope check, so the
    /// restriction narrows access without breaking the repository it names.
    #[tokio::test]
    async fn a_request_inside_the_scope_is_not_refused_by_the_scope() {
        let config = GitHubProxyConfig {
            base_url: "http://127.0.0.1:1".to_string(),
            token: Some("operator-secret".to_string()),
            policy: GitHubPolicy::default(),
        };
        let scope = vec!["link-assistant/hive-mind".to_string()];

        let response = forward(
            &reqwest::Client::new(),
            &config,
            crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
            &scope,
            HttpRequest::builder()
                .uri("/api/v3/repos/link-assistant/hive-mind/issues")
                .body(Body::empty())
                .unwrap(),
        )
        .await;

        // Reaching the unroutable upstream is a gateway failure, which proves
        // the scope let it through rather than blocking it.
        assert_ne!(response.status(), StatusCode::FORBIDDEN);
    }

    /// A mounted `gh` login is an existing credential the deployment reuses,
    /// rather than a second token to mint and rotate (issue #263).
    #[test]
    fn a_gh_configuration_yields_its_credential() {
        let directory = tempfile::tempdir().expect("gh config dir");
        std::fs::write(
            directory.path().join("hosts.yml"),
            "github.com:\n    oauth_token: gho_example\n    user: someone\n",
        )
        .expect("write hosts.yml");

        assert_eq!(
            token_from_gh_config(directory.path()),
            Some("gho_example".to_string())
        );
    }

    /// A quoted value and an absent file are both handled, so a config written
    /// by any `gh` version either works or is reported as missing.
    #[test]
    fn a_quoted_or_absent_credential_is_handled() {
        let directory = tempfile::tempdir().expect("gh config dir");
        assert_eq!(token_from_gh_config(directory.path()), None, "absent file");

        std::fs::write(
            directory.path().join("hosts.yml"),
            "github.com:\n    oauth_token: \"gho_quoted\"\n",
        )
        .expect("write hosts.yml");
        assert_eq!(
            token_from_gh_config(directory.path()),
            Some("gho_quoted".to_string())
        );

        std::fs::write(
            directory.path().join("hosts.yml"),
            "github.com:\n    user: someone\n",
        )
        .expect("rewrite");
        assert_eq!(token_from_gh_config(directory.path()), None, "no token key");
    }

    /// A stored credential round-trips and is written owner-only, like every
    /// other secret this crate persists.
    #[test]
    fn a_stored_credential_round_trips_owner_only() {
        let data_dir = tempfile::tempdir().expect("data dir");

        assert_eq!(
            stored_credential(data_dir.path()),
            None,
            "nothing stored yet"
        );
        // Bound with an underscore prefix: the path is only inspected under
        // unix, where file modes exist.
        let _path = store_credential(data_dir.path(), "  gho_stored\n").expect("store it");
        assert_eq!(
            stored_credential(data_dir.path()),
            Some("gho_stored".to_string()),
            "surrounding whitespace is not part of the credential"
        );

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            let mode = std::fs::metadata(&_path)
                .expect("stat")
                .permissions()
                .mode();
            assert_eq!(mode & 0o777, 0o600, "mode was {:o}", mode & 0o777);
        }
    }

    /// The git transport base is derived from the API base, so an enterprise
    /// or test deployment stays consistent across both surfaces.
    #[test]
    fn the_git_base_follows_the_api_base() {
        assert_eq!(
            GitHubProxyConfig::with_credential("t", "https://api.github.com").git_base_url(),
            "https://github.com"
        );
        assert_eq!(
            GitHubProxyConfig::with_credential("t", "http://127.0.0.1:9000").git_base_url(),
            "http://127.0.0.1:9000"
        );
    }
}
