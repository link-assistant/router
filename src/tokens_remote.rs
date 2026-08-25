//! `router tokens` against the *selected* router.
//!
//! Tokens are the part of a deployment an operator touches most often, and
//! every routine action was remote-only in practice: a token expires and a job
//! starts returning 401, or one leaks and must be revoked now, and the only
//! routes to either were `ssh` into the host or a hand-written `curl` with the
//! right path — `/api/tokens/list`, not `/api/tokens`, which is `POST`-only and
//! answers 405 to a `GET` (issue #293).
//!
//! The HTTP surface was already complete and admin-gated, and the CLI was
//! already complete for a local store. Only the connection between them was
//! missing, so the capability existed twice and was reachable neither way for
//! the ordinary remote case.

use std::process::ExitCode;

use crate::cli::TokenOp;
use crate::managed_server::ResolvedServer;

/// Run one token operation against `server`.
pub async fn run(server: &ResolvedServer, op: &TokenOp) -> ExitCode {
    match execute(server, op).await {
        Ok(code) => code,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

/// The call one token operation makes: method, path, and body.
///
/// Separated from sending it so the request an operation builds can be
/// asserted without a server. What goes on the wire is the part that can be
/// wrong in a way an operator notices — a rotate aimed at
/// `/api/tokens/rotate` would rotate the caller's *own* admin credential
/// rather than the named token — and it is exactly the part a live-server test
/// covers worst.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Call {
    /// `GET` or `POST`, as the endpoint expects.
    pub method: &'static str,
    /// The admin route this operation uses.
    pub path: &'static str,
    /// The JSON body, for a `POST`.
    pub body: Option<serde_json::Value>,
}

/// The call `op` makes against the selected router.
#[must_use]
pub fn call_for(op: &TokenOp) -> Call {
    match op {
        TokenOp::Issue {
            ttl_hours,
            label,
            account,
            max_requests,
            max_tokens,
            rate_limit_per_minute,
            admin,
            github_repo,
            ..
        } => Call {
            method: "POST",
            path: "/api/tokens",
            body: Some(serde_json::json!({
                "ttl_hours": ttl_hours,
                "label": label,
                "account": account,
                "max_requests": max_requests,
                "max_tokens": max_tokens,
                "rate_limit_per_minute": rate_limit_per_minute,
                "scope": admin.then_some(crate::token::ADMIN_SCOPE),
                "github_repos": (!github_repo.is_empty()).then(|| github_repo.clone()),
            })),
        },
        TokenOp::Rotate {
            id,
            ttl_hours,
            label,
            max_requests,
            max_tokens,
            rate_limit_per_minute,
            account,
            ..
        } => Call {
            method: "POST",
            // `rotate-client` replaces a named token. `/api/tokens/rotate`
            // rotates the *caller's own* admin credential, which is a
            // different operation and not what `tokens rotate <ID>` means.
            path: "/api/tokens/rotate-client",
            body: Some(serde_json::json!({
                "id": id,
                "ttl_hours": ttl_hours,
                "label": (!label.is_empty()).then(|| label.clone()),
                "max_requests": max_requests,
                "max_tokens": max_tokens,
                "rate_limit_per_minute": rate_limit_per_minute,
                "account": account,
            })),
        },
        // `show` has no route of its own: no `GET /api/tokens/{id}` exists, and
        // the local command is itself a filter over the list, so this stays a
        // filter rather than growing server surface for something already
        // answerable.
        TokenOp::List { .. } | TokenOp::Show { .. } => Call {
            method: "GET",
            path: "/api/tokens/list",
            body: None,
        },
        TokenOp::Revoke { id, .. } | TokenOp::Expire { id, .. } => Call {
            method: "POST",
            path: "/api/tokens/revoke",
            body: Some(serde_json::json!({ "id": id })),
        },
    }
}

async fn execute(server: &ResolvedServer, op: &TokenOp) -> Result<ExitCode, String> {
    let call = call_for(op);
    let answer = match call.body {
        Some(body) => crate::auth_remote::post(server, call.path, body).await?,
        None => crate::auth_remote::get(server, call.path).await?,
    };
    match op {
        TokenOp::Issue { .. } => {
            print_issued(&answer);
            Ok(ExitCode::SUCCESS)
        }
        TokenOp::Rotate { .. } => {
            print_issued(&answer);
            if let Some(revoked) = answer.get("revoked").and_then(serde_json::Value::as_str) {
                eprintln!("revoked {revoked}");
            }
            Ok(ExitCode::SUCCESS)
        }
        TokenOp::List { .. } => {
            crate::token_report::print_table(&records_in(&answer));
            Ok(ExitCode::SUCCESS)
        }
        TokenOp::Revoke { id, .. } | TokenOp::Expire { id, .. } => {
            println!("revoked {id}");
            Ok(ExitCode::SUCCESS)
        }
        TokenOp::Show { id, .. } => Ok(show_one(&records_in(&answer), id)),
    }
}

/// Print one token record, or say it is not there.
///
/// Exits 2 for an unknown id, as the local path does, so a script's meaning is
/// the same against either target.
#[must_use]
pub fn show_one(records: &[serde_json::Value], id: &str) -> ExitCode {
    records
        .iter()
        .find(|record| record.get("id").and_then(serde_json::Value::as_str) == Some(id))
        .map_or_else(
            || {
                eprintln!("not found: {id}");
                ExitCode::from(2)
            },
            |record| {
                println!(
                    "{}",
                    serde_json::to_string_pretty(record).unwrap_or_default()
                );
                ExitCode::SUCCESS
            },
        )
}

/// The token records inside a `/api/tokens/list` answer.
#[must_use]
pub fn records_in(answer: &serde_json::Value) -> Vec<serde_json::Value> {
    answer
        .get("data")
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default()
}

/// Print a freshly issued or rotated token exactly as the local path does.
///
/// The token itself goes to stdout alone, so `tokens issue > file` and
/// `$(router tokens issue)` keep working against a remote deployment.
fn print_issued(answer: &serde_json::Value) {
    if let Some(token) = answer.get("token").and_then(serde_json::Value::as_str) {
        println!("{token}");
    }
}

#[cfg(test)]
#[path = "tokens_remote_tests.rs"]
mod tests;
