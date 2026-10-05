//! The `accounts` subcommand: report what each configured account can do.
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit, and kept in the library so the remote form renders through the same
//! printer — an operator reading a table has no way to tell which machine
//! answered, so the two must not be able to drift (issues #294, #306).

use std::process::ExitCode;

use crate::accounts::AccountRouter;
use crate::cli::AccountOp;

/// Render the account pool.
///
/// `credential` is printed beside `healthy` so an operator can see *why* an
/// account is unhealthy without running `doctor`, which was the contradiction
/// issue #242 reported: `accounts list` said `healthy true` while `doctor`
/// said EXPIRED and every request returned 401.
#[must_use]
pub fn run(
    router: &AccountRouter,
    refreshes: Option<&crate::refresh::TokenCache>,
    op: &AccountOp,
) -> ExitCode {
    match op {
        AccountOp::List { json, .. } if *json => {
            let rows: Vec<serde_json::Value> = router
                .health_snapshot_with(refreshes)
                .into_iter()
                .map(|health| {
                    serde_json::json!({
                        "name": health.name,
                        "healthy": health.healthy,
                        "credential": health.credential.label(),
                        "used": health.used,
                        "request_limit": health.request_limit,
                        "remaining_requests": health.remaining_requests,
                        "home": health.home.display().to_string(),
                        // Vendor rate-limit state (issue #677).
                        "cooldown_reason": health.limits.cooldown_reason,
                        "cooldown_until_unix": health.limits.cooldown_until_unix,
                        "model_cooldowns": health.limits.model_cooldowns,
                        "paused": health.limits.paused_at(crate::account_limits::now_unix()),
                        "pause": health.limits.pause,
                        "windows": health.limits.windows,
                    })
                })
                .collect();
            println!(
                "{}",
                serde_json::to_string_pretty(&rows).unwrap_or_else(|_| "[]".to_string())
            );
            ExitCode::SUCCESS
        }
        AccountOp::List { .. } => {
            println!("{}", header());
            for health in router.health_snapshot_with(refreshes) {
                println!(
                    "{}",
                    row(&AccountRow {
                        name: &health.name,
                        healthy: Some(health.healthy),
                        credential: health.credential.label(),
                        used: Some(health.used as u64),
                        limit: health.request_limit.map(|value| value as u64),
                        remaining: health.remaining_requests.map(|value| value as u64),
                        home: health.home.display().to_string(),
                    })
                );
            }
            ExitCode::SUCCESS
        }
        AccountOp::Pause {
            name,
            reason,
            until,
            ..
        } => {
            let reason = reason.as_deref().unwrap_or(DEFAULT_PAUSE_REASON);
            match router.pause(name, *until, reason) {
                Ok(()) => {
                    println!("{}", pause_message(name, *until));
                    println!("{LOCAL_NOTE}");
                    ExitCode::SUCCESS
                }
                Err(error) => {
                    eprintln!("error: {error}");
                    ExitCode::from(1)
                }
            }
        }
        AccountOp::Resume { name, .. } => match router.resume(name) {
            Ok(was_paused) => {
                println!("{}", resume_message(name, was_paused));
                println!("{LOCAL_NOTE}");
                ExitCode::SUCCESS
            }
            Err(error) => {
                eprintln!("error: {error}");
                ExitCode::from(1)
            }
        },
    }
}

/// The reason recorded when the operator gives none; the management API uses
/// the same words.
const DEFAULT_PAUSE_REASON: &str = "paused by an operator";

/// The local form edits the persisted pool state, not a running process.
const LOCAL_NOTE: &str = "note: recorded in this machine's data directory; a router started \
     from it applies the change at startup. Pass --server <URL> to change a running router.";

fn pause_message(name: &str, until: Option<u64>) -> String {
    until.map_or_else(
        || format!("paused {name} until it is resumed"),
        |until| {
            let when =
                chrono::DateTime::from_timestamp(i64::try_from(until).unwrap_or(i64::MAX), 0)
                    .map_or_else(|| until.to_string(), |time| time.to_rfc3339());
            format!("paused {name} until {when}")
        },
    )
}

fn resume_message(name: &str, was_paused: bool) -> String {
    if was_paused {
        format!("resumed {name}")
    } else {
        format!("{name} was not paused")
    }
}

/// The account-name placeholder in the pause/resume route templates.
const NAME_PLACEHOLDER: &str = concat!("{", "name", "}");

/// Percent-encode an account name for one URL path segment, so a name can
/// never reach a different route.
fn path_segment(name: &str) -> String {
    use std::fmt::Write as _;

    let mut encoded = String::with_capacity(name.len());
    for byte in name.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            encoded.push(char::from(byte));
        } else {
            let _ = write!(encoded, "%{byte:02X}");
        }
    }
    encoded
}

/// Run an `accounts` operation against a selected router over its admin API
/// (issues #294, #677).
pub async fn run_remote(
    server: &crate::managed_server::ResolvedServer,
    op: &AccountOp,
) -> ExitCode {
    use crate::route_contract::{RouteId, route_template};

    let (route, name, body) = match op {
        AccountOp::List { .. } => return crate::auth_remote::accounts(server).await,
        AccountOp::Pause {
            name,
            reason,
            until,
            ..
        } => (
            RouteId::AccountPause,
            name,
            serde_json::json!({
                "reason": reason.as_deref().unwrap_or(DEFAULT_PAUSE_REASON),
                "until_unix": until,
            }),
        ),
        AccountOp::Resume { name, .. } => (RouteId::AccountResume, name, serde_json::json!({})),
    };
    let path = route_template(route).replace(NAME_PLACEHOLDER, &path_segment(name));
    match crate::auth_remote::post(server, &path, body).await {
        Ok(answer) => {
            println!("server: {} ({})", server.base_url, server.source);
            let message = match op {
                AccountOp::Pause { .. } => pause_message(
                    name,
                    answer.get("until_unix").and_then(serde_json::Value::as_u64),
                ),
                _ => resume_message(
                    name,
                    answer
                        .get("was_paused")
                        .and_then(serde_json::Value::as_bool)
                        .unwrap_or(true),
                ),
            };
            println!("{message}");
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

/// One account, from either the local pool or a remote router's JSON.
///
/// `None` means the answer is genuinely absent. That distinction is the point:
/// the remote formatter read every field with `as_str()`, so a JSON *number*
/// yielded the same `-` as a field the server never sent, and the table could
/// not show a figure at all (issue #306).
pub struct AccountRow<'a> {
    pub name: &'a str,
    pub healthy: Option<bool>,
    pub credential: &'a str,
    pub used: Option<u64>,
    pub limit: Option<u64>,
    pub remaining: Option<u64>,
    pub home: String,
}

/// The column titles, shared by both modes.
///
/// One printer for both paths, for the reason issue #294 gave for `tokens` and
/// `providers`: an operator reading a table has no way to tell which machine
/// answered, so the two must not be able to drift. The remote form rendered
/// three of these eight columns — dropping `healthy`, which is the one the
/// command exists to answer (issue #306).
#[must_use]
pub fn header() -> String {
    format!(
        "{:<16}  {:<8}  {:<12}  {:<6}  {:<9}  {:<9}  home",
        "name", "healthy", "credential", "used", "limit", "remaining"
    )
}

/// One rendered row, in the columns [`header`] names.
#[must_use]
pub fn row(account: &AccountRow<'_>) -> String {
    let optional =
        |value: Option<u64>| value.map_or_else(|| "-".to_string(), |value| value.to_string());
    format!(
        "{:<16}  {:<8}  {:<12}  {:<6}  {:<9}  {:<9}  {}",
        account.name,
        account
            .healthy
            .map_or_else(|| "-".to_string(), |healthy| healthy.to_string()),
        account.credential,
        optional(account.used),
        optional(account.limit),
        optional(account.remaining),
        account.home
    )
}
