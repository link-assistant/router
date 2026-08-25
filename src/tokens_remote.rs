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

async fn execute(server: &ResolvedServer, op: &TokenOp) -> Result<ExitCode, String> {
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
        } => {
            let body = serde_json::json!({
                "ttl_hours": ttl_hours,
                "label": label,
                "account": account,
                "max_requests": max_requests,
                "max_tokens": max_tokens,
                "rate_limit_per_minute": rate_limit_per_minute,
                "scope": if *admin { Some(crate::token::ADMIN_SCOPE) } else { None },
                "github_repos": (!github_repo.is_empty()).then(|| github_repo.clone()),
            });
            let answer = crate::auth_remote::post(server, "/api/tokens", body).await?;
            print_issued(&answer);
            Ok(ExitCode::SUCCESS)
        }
        TokenOp::Rotate {
            id,
            ttl_hours,
            label,
            max_requests,
            max_tokens,
            rate_limit_per_minute,
            account,
            ..
        } => {
            // `rotate-client` replaces a named token; `/api/tokens/rotate`
            // rotates the *caller's own* admin credential, which is a
            // different operation and not what `tokens rotate <ID>` means.
            let body = serde_json::json!({
                "id": id,
                "ttl_hours": ttl_hours,
                "label": (!label.is_empty()).then(|| label.clone()),
                "max_requests": max_requests,
                "max_tokens": max_tokens,
                "rate_limit_per_minute": rate_limit_per_minute,
                "account": account,
            });
            let answer =
                crate::auth_remote::post(server, "/api/tokens/rotate-client", body).await?;
            print_issued(&answer);
            if let Some(revoked) = answer.get("revoked").and_then(serde_json::Value::as_str) {
                eprintln!("revoked {revoked}");
            }
            Ok(ExitCode::SUCCESS)
        }
        TokenOp::List { .. } => {
            let records = list(server).await?;
            crate::token_report::print_table(&records);
            Ok(ExitCode::SUCCESS)
        }
        TokenOp::Revoke { id, .. } | TokenOp::Expire { id, .. } => {
            let body = serde_json::json!({ "id": id });
            crate::auth_remote::post(server, "/api/tokens/revoke", body).await?;
            println!("revoked {id}");
            Ok(ExitCode::SUCCESS)
        }
        TokenOp::Show { id, .. } => {
            // No `GET /api/tokens/{id}` exists, and the local command is itself
            // a filter over the list, so this stays a filter rather than
            // growing a server route for something already answerable.
            let records = list(server).await?;
            records
                .iter()
                .find(|record| {
                    record.get("id").and_then(serde_json::Value::as_str) == Some(id.as_str())
                })
                .map_or_else(
                    || {
                        eprintln!("not found: {id}");
                        Ok(ExitCode::from(2))
                    },
                    |record| {
                        println!(
                            "{}",
                            serde_json::to_string_pretty(record).unwrap_or_default()
                        );
                        Ok(ExitCode::SUCCESS)
                    },
                )
        }
    }
}

/// The token records the selected router holds.
async fn list(server: &ResolvedServer) -> Result<Vec<serde_json::Value>, String> {
    let answer = crate::auth_remote::get(server, "/api/tokens/list").await?;
    Ok(answer
        .get("data")
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default())
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
