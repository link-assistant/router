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
