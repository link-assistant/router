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
    /// The data directory is read from `DATA_DIR`, which is only correct when
    /// the operator spelled it that way. Prefer
    /// [`from_env_with_data_dir`](Self::from_env_with_data_dir), which takes
    /// the directory clap already resolved from flag *and* environment; this
    /// spelling remains for callers that have no parsed configuration to hand.
    ///
    /// # Errors
    ///
    /// Returns an operator-readable message when a named credential file or
    /// policy file cannot be read.
    pub fn from_env() -> Result<Self, String> {
        Self::from_env_with_data_dir(std::env::var_os("DATA_DIR").as_deref().map(Path::new))
    }

    /// Load the proxy, reading a stored credential from `data_dir`.
    ///
    /// `--data-dir` and `DATA_DIR` name one setting, and clap merges them into
    /// `config.data_dir` before anything else looks. Re-reading the environment
    /// here saw only the environment spelling, so a credential stored by
    /// `router auth gh --data-dir DIR` was never found at startup and the whole
    /// GitHub surface stayed unmounted — while `auth gh --status`, which does
    /// read the parsed value, reported the credential as present (issue #282).
    ///
    /// The `GITHUB_PROXY_TOKEN*` sources stay environment-only: those are
    /// genuinely environment settings with no parsed counterpart.
    ///
    /// # Errors
    ///
    /// Returns an operator-readable message when a named credential file or
    /// policy file cannot be read.
    pub fn from_env_with_data_dir(data_dir: Option<&Path>) -> Result<Self, String> {
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
        token = token.or_else(|| reusable_credential(data_dir, gh_config_directory().as_deref()));
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
        if destroys_by_effect(method, path, body) {
            return PolicyDecision::Deny;
        }
        if path == "/graphql" && destructive_graphql(body) {
            return PolicyDecision::Deny;
        }
        PolicyDecision::Allow
    }
}

/// Destructive operations that do not spell their intent in the method.
///
/// "Destructive" was inferred from the HTTP verb, and GitHub's API does not
/// respect that correspondence: `DELETE .../branches/{b}/protection` was
/// denied while the `PUT` beside it replaces the whole protection object and
/// reaches the same end state. `POST .../transfer` moves the repository to
/// another owner — strictly worse for the org than the denied `DELETE` of it —
/// and `PATCH` with `visibility` publishes a private repository, which is a
/// data-exfiltration primitive that needs no exfiltration path (issue #329).
///
/// Branch protection matters most of the four: it is the control this
/// project's own reasoning leans on as the one an agent cannot talk past, so a
/// routed token that can rewrite it puts the backstop inside the blast radius
/// of the thing it backstops.
///
/// Kept small and explicit rather than heuristic, and configured rules are
/// still evaluated first, so an operator who wants one of these writes an
/// allow rule for that one path — the same escape hatch `allows_git_ref` uses.
fn destroys_by_effect(method: &str, path: &str, body: &[u8]) -> bool {
    // `glob_matches` compares whole segments and its `/**` suffix strips a
    // literal prefix, so a pattern that needs both wildcards and a tail is
    // spelled here rather than as a glob.
    let segments = path.split('/').collect::<Vec<_>>();
    // A branch name may contain slashes -- `feature/x` is ordinary -- so the
    // branch is however many segments sit between `branches` and `protection`
    // rather than exactly one. Matching it as one segment let a `PUT` to
    // `feature/x`'s protection through, on the control the rest of this policy
    // leans on. Sub-resources (`.../protection/required_signatures` and its
    // siblings) each relax one part of the same object, so the subtree counts.
    let protection = matches!(segments.as_slice(), ["", "repos", _, _, "branches", ..])
        && segments
            .iter()
            .skip(5)
            .any(|segment| *segment == "protection");
    // Rulesets govern the same thing one level up, and an organisation's
    // rulesets are what a repository's protection inherits. Creating one can
    // shadow an existing rule, so the create verb is covered beside the
    // update -- the same verb asymmetry this whole function exists to close.
    let ruleset = matches!(
        segments.as_slice(),
        ["", "repos", _, _, "rulesets", ..] | ["", "orgs", _, "rulesets", ..]
    );
    if (method.eq_ignore_ascii_case("PUT")
        || method.eq_ignore_ascii_case("POST")
        || method.eq_ignore_ascii_case("PATCH"))
        && (protection || ruleset)
    {
        return true;
    }
    if method.eq_ignore_ascii_case("POST") && glob_matches("/repos/*/*/transfer", path) {
        return true;
    }
    // Keyed on the body rather than the path, the same way the forced-ref rule
    // is: an ordinary `PATCH` setting `description` or `homepage` stays
    // allowed, because naming a field is what makes this one destructive.
    // A trailing slash is tolerated by GitHub, and a field name is a field
    // name whatever case it arrives in; neither should decide whether a
    // repository can be published.
    let repository = matches!(
        path.trim_end_matches('/')
            .split('/')
            .collect::<Vec<_>>()
            .as_slice(),
        ["", "repos", _, _]
    );
    method.eq_ignore_ascii_case("PATCH")
        && repository
        && serde_json::from_slice::<Value>(body)
            .ok()
            .and_then(|value| {
                value.as_object().map(|fields| {
                    fields.keys().any(|field| {
                        matches!(
                            field.to_ascii_lowercase().as_str(),
                            "archived" | "private" | "visibility" | "default_branch"
                        )
                    })
                })
            })
            .unwrap_or(false)
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
    // The REST and GraphQL halves must not disagree about what is
    // destructive, or the deny list is a routing question rather than a
    // policy (issue #329).
    let destroys_by_effect = names.iter().any(|name| {
        matches!(
            name.as_str(),
            "transferrepository"
                | "updaterepositoryruleset"
                | "createrepositoryruleset"
                // An organisation's rulesets are what a repository's own
                // protection inherits, so the REST and GraphQL halves cover
                // the same level.
                | "updateorganizationruleset"
                | "createorganizationruleset"
                | "updatebranchprotectionrule"
                | "createbranchprotectionrule"
        )
    }) || (names.iter().any(|name| name == "updaterepository")
        && (compact.contains("visibility:") || compact.contains("\"visibility\"")));
    has_delete || forced_ref || deletes_ref || destroys_by_effect
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

/// A credential the deployment can reuse rather than mint.
///
/// A credential stored by `router auth gh` first, then a mounted `gh`
/// configuration: both are existing logins (issue #263). Consulted only after
/// every explicit environment setting, so this never overrides one.
#[must_use]
pub fn reusable_credential(data_dir: Option<&Path>, gh_config: Option<&Path>) -> Option<String> {
    data_dir
        .filter(|dir| !dir.as_os_str().is_empty())
        .and_then(stored_credential)
        .or_else(|| gh_config.and_then(token_from_gh_config))
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

/// Remove the credential stored by `router auth gh`.
///
/// Reports whether a file was actually removed, so the caller can tell "there
/// was one and it is gone" from "there was nothing here" rather than printing
/// a reassuring message either way.
///
/// This clears only what the router itself stored. A credential supplied
/// through `GITHUB_PROXY_TOKEN`, `GITHUB_PROXY_TOKEN_FILE`,
/// `GITHUB_PROXY_TOKEN_ENV`, or a mounted `gh` configuration is not the
/// router's to delete, and the proxy stays enabled from it; the caller is
/// expected to say so.
///
/// # Errors
///
/// Returns an operator-readable message when the file exists but cannot be
/// removed, since a silent failure here would report a withdrawal that did
/// not happen.
pub fn clear_credential(data_dir: &Path) -> Result<bool, String> {
    let path = stored_credential_path(data_dir);
    match std::fs::remove_file(&path) {
        Ok(()) => Ok(true),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(format!("could not remove {}: {error}", path.display())),
    }
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
    path.strip_prefix("/api/services/github/api/v3")
        .filter(|path| !path.is_empty())
        .unwrap_or({
            if path == "/api/services/github/api/graphql" {
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
    let dialect = crate::api_error::dialect_for_path("/api/services/github/api/v3/user");
    crate::api_error::PresentedError {
        status,
        error_type: "policy_error",
        message,
    }
    .render(dialect)
}

#[cfg(test)]
#[path = "github_proxy_tests.rs"]
mod tests;
