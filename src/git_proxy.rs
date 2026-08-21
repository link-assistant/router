//! Git smart-HTTP proxy with ref-update policy.
//!
//! The GitHub API proxy denies deletions and forced ref updates, but it only
//! ever sees REST and GraphQL. A `git push --force` travels over the git
//! transport as a single `git-receive-pack` exchange and never reaches those
//! routes, so configuring an agent's git to "use the router" changed only
//! *where the credential lived*, not *what the agent could destroy* (issue
//! #261).
//!
//! Terminating the smart-HTTP endpoints here closes that gap. The ref-update
//! commands a client sends are parsed before anything is forwarded, so a
//! deletion or a non-fast-forward is refused by the router rather than
//! discovered afterwards in a reflog:
//!
//! ```text
//! git config --global url."https://router.internal/git/".insteadOf "https://github.com/"
//! ```
//!
//! Destructive updates are refused by default and re-enabled only by
//! reconfiguring the router, which is the point: an agent cannot talk its way
//! past a rule it has no access to.

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};

use crate::app_state::AppState;
use crate::github_proxy::POLICY_HEADER;

/// The all-zero object id a client sends to delete a ref.
const ZERO_OID: &str = "0000000000000000000000000000000000000000";

/// One ref update requested by a `git-receive-pack` body.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RefUpdate {
    pub old: String,
    pub new: String,
    pub name: String,
}

impl RefUpdate {
    /// Whether this update removes the ref.
    #[must_use]
    pub fn is_delete(&self) -> bool {
        self.new == ZERO_OID
    }

    /// Whether this update creates a ref that did not exist.
    #[must_use]
    pub fn is_create(&self) -> bool {
        self.old == ZERO_OID
    }
}

/// Why a push was refused.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RefRefusal {
    /// The client asked to delete a ref.
    Delete(String),
    /// The client asked to overwrite a ref with unrelated history.
    NonFastForward(String),
}

impl RefRefusal {
    /// An operator-readable explanation naming the ref and the remedy.
    #[must_use]
    pub fn message(&self) -> String {
        match self {
            Self::Delete(name) => format!(
                "Blocked by Link.Assistant.Router git policy: deleting {name} is refused; \
                 allow it in GITHUB_PROXY_POLICY to permit this ref"
            ),
            Self::NonFastForward(name) => format!(
                "Blocked by Link.Assistant.Router git policy: force-updating {name} is refused; \
                 allow it in GITHUB_PROXY_POLICY to permit this ref"
            ),
        }
    }
}

/// Parse the ref-update commands out of a `git-receive-pack` request body.
///
/// The body is pkt-line framed: a four-hex length prefix covering itself,
/// then `<old-oid> <new-oid> <ref>` optionally followed by a NUL and the
/// client's capabilities. `0000` ends the command list, and everything after
/// it is the packfile, which carries no ref decisions and is not inspected.
#[must_use]
pub fn parse_ref_updates(body: &[u8]) -> Vec<RefUpdate> {
    let mut updates = Vec::new();
    let mut cursor = 0usize;
    while cursor + 4 <= body.len() {
        let Ok(header) = std::str::from_utf8(&body[cursor..cursor + 4]) else {
            break;
        };
        let Ok(length) = usize::from_str_radix(header, 16) else {
            break;
        };
        if length == 0 {
            // Flush packet: the command list is complete and the packfile
            // follows, which says nothing about refs.
            break;
        }
        if length < 4 || cursor + length > body.len() {
            break;
        }
        let payload = &body[cursor + 4..cursor + length];
        cursor += length;
        // Capabilities travel after a NUL on the first command only.
        let line = payload.split(|byte| *byte == 0).next().unwrap_or(payload);
        let Ok(line) = std::str::from_utf8(line) else {
            continue;
        };
        let mut fields = line.trim().split(' ');
        if let (Some(old), Some(new), Some(name)) = (fields.next(), fields.next(), fields.next())
            && old.len() == 40
            && new.len() == 40
        {
            updates.push(RefUpdate {
                old: old.to_string(),
                new: new.to_string(),
                name: name.to_string(),
            });
        }
    }
    updates
}

/// Decide whether a set of ref updates may proceed.
///
/// Deletions and non-fast-forwards are refused; creates and ordinary updates
/// are allowed. A non-fast-forward cannot be proven from the request alone —
/// the router does not hold the object graph — so a client that asks to
/// overwrite history announces it by sending the `force` capability, and an
/// update to an existing ref is otherwise treated as a fast-forward.
///
/// The policy file can allow a specific ref deliberately, which is the
/// "reconfigure the router" escape hatch rather than something a caller can
/// assert for itself.
#[must_use]
pub fn refuse_destructive_updates(
    updates: &[RefUpdate],
    forced: bool,
    policy: &crate::github_proxy::GitHubPolicy,
    repository: &str,
) -> Option<RefRefusal> {
    for update in updates {
        // An operator may permit one ref explicitly; the rule path names the
        // repository and ref so a permission cannot leak to another.
        let allowed = policy.allows_git_ref(repository, &update.name);
        if update.is_delete() {
            if allowed {
                continue;
            }
            return Some(RefRefusal::Delete(update.name.clone()));
        }
        if forced && !update.is_create() && !allowed {
            return Some(RefRefusal::NonFastForward(update.name.clone()));
        }
    }
    None
}

/// Whether a receive-pack body announces the `force` capability.
#[must_use]
pub fn body_requests_force(body: &[u8]) -> bool {
    // Capabilities follow a NUL on the first command line.
    let window = &body[..body.len().min(4096)];
    let Some(start) = window.iter().position(|byte| *byte == 0) else {
        return false;
    };
    let tail = String::from_utf8_lossy(&window[start..]);
    tail.contains("force-ref-updates") || tail.contains("push-force")
}

/// `owner/repo` from a `/git/{owner}/{repo}.git/...` path.
#[must_use]
pub fn repository_in_git_path(path: &str) -> Option<String> {
    let rest = path.strip_prefix("/git/")?;
    let mut parts = rest.split('/');
    let owner = parts.next().filter(|part| !part.is_empty())?;
    let repo = parts.next().filter(|part| !part.is_empty())?;
    Some(format!("{owner}/{}", repo.trim_end_matches(".git")))
}

/// The upstream git URL for a proxied path.
#[must_use]
pub fn upstream_git_url(base: &str, path: &str, query: Option<&str>) -> Option<String> {
    let rest = path.strip_prefix("/git/")?;
    let mut url = format!("{}/{rest}", base.trim_end_matches('/'));
    if let Some(query) = query {
        url.push('?');
        url.push_str(query);
    }
    Some(url)
}

/// Terminate a git smart-HTTP request, enforcing ref policy before forwarding.
pub async fn proxy(State(state): State<AppState>, request: Request) -> Response {
    let scope = crate::proxy::authenticate_client_error(&state, request.headers())
        .map(|claims| claims.github_repos)
        .unwrap_or_default();
    forward(&state, &scope, request).await
}

async fn forward(state: &AppState, allowed_repositories: &[String], request: Request) -> Response {
    let Some(token) = state.github.credential() else {
        return git_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "GitHub proxy is not configured",
        );
    };
    let (parts, body) = request.into_parts();
    let path = parts.uri.path().to_string();
    let Some(repository) = repository_in_git_path(&path) else {
        return git_error(StatusCode::NOT_FOUND, "not a git repository path");
    };
    if !allowed_repositories.is_empty()
        && !allowed_repositories
            .iter()
            .any(|allowed| allowed.eq_ignore_ascii_case(&repository))
    {
        return blocked("outside this token's repositories");
    }
    let body = match axum::body::to_bytes(body, state.max_proxy_request_bytes).await {
        Ok(body) => body,
        Err(error) => {
            return git_error(
                StatusCode::PAYLOAD_TOO_LARGE,
                &format!("request body exceeds the proxy limit: {error}"),
            );
        }
    };

    // Only a push carries ref updates; a fetch is read-only and needs no
    // ref decision.
    if path.ends_with("/git-receive-pack") {
        let updates = parse_ref_updates(&body);
        if let Some(refusal) = refuse_destructive_updates(
            &updates,
            body_requests_force(&body),
            state.github.policy_rules(),
            &repository,
        ) {
            // Recorded like every other mediated call, so a refused push
            // appears in the same audit trail as an API refusal.
            state.request_log.record(
                &crate::request_log::correlation_id(&parts.headers),
                "git_policy_refusal",
                serde_json::json!({
                    "repository": repository,
                    "refusal": refusal.message(),
                }),
            );
            return blocked(&refusal.message());
        }
    }

    let Some(url) = upstream_git_url(&state.github.git_base_url(), &path, parts.uri.query()) else {
        return git_error(StatusCode::NOT_FOUND, "not a git repository path");
    };
    let mut upstream = state
        .client
        .request(parts.method.clone(), url)
        // The caller never holds a GitHub credential; the router presents its
        // own, exactly as the API proxy already does.
        .basic_auth("x-access-token", Some(token));
    for header in ["content-type", "accept", "user-agent", "git-protocol"] {
        if let Some(value) = parts.headers.get(header) {
            upstream = upstream.header(header, value.clone());
        }
    }
    let response = match upstream.body(body.to_vec()).send().await {
        Ok(response) => response,
        Err(error) => {
            return git_error(
                StatusCode::BAD_GATEWAY,
                &format!("git upstream request failed: {error}"),
            );
        }
    };
    let status = StatusCode::from_u16(response.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let headers = crate::proxy::relay_response_headers(response.headers());
    let payload = response.bytes().await.unwrap_or_default();
    let mut relayed = Response::new(Body::from(payload));
    *relayed.status_mut() = status;
    *relayed.headers_mut() = headers;
    relayed
}

/// A policy refusal, marked so an operator can find it in a log.
fn blocked(message: &str) -> Response {
    let mut response = git_error(StatusCode::FORBIDDEN, message);
    response
        .headers_mut()
        .insert(POLICY_HEADER, HeaderValue::from_static("blocked"));
    response
}

fn git_error(status: StatusCode, message: &str) -> Response {
    (status, format!("{message}\n")).into_response()
}

#[cfg(test)]
#[path = "git_proxy_tests.rs"]
mod tests;
