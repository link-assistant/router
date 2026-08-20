//! The `accounts` subcommand: report what each configured account can do.
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit.

use std::process::ExitCode;

use link_assistant_router::accounts::AccountRouter;
use link_assistant_router::cli::AccountOp;

/// Render the account pool.
///
/// `credential` is printed beside `healthy` so an operator can see *why* an
/// account is unhealthy without running `doctor`, which was the contradiction
/// issue #242 reported: `accounts list` said `healthy true` while `doctor`
/// said EXPIRED and every request returned 401.
pub fn run(
    router: &AccountRouter,
    refreshes: Option<&link_assistant_router::refresh::TokenCache>,
    op: &AccountOp,
) -> ExitCode {
    match op {
        AccountOp::List => {
            println!(
                "{:<16}  {:<8}  {:<12}  {:<6}  {:<9}  {:<9}  home",
                "name", "healthy", "credential", "used", "limit", "remaining"
            );
            for h in router.health_snapshot_with(refreshes) {
                let limit = h
                    .request_limit
                    .map_or_else(|| "-".to_string(), |value| value.to_string());
                let remaining = h
                    .remaining_requests
                    .map_or_else(|| "-".to_string(), |value| value.to_string());
                println!(
                    "{:<16}  {:<8}  {:<12}  {:<6}  {:<9}  {:<9}  {}",
                    h.name,
                    h.healthy,
                    h.credential,
                    h.used,
                    limit,
                    remaining,
                    h.home.display()
                );
            }
            ExitCode::SUCCESS
        }
    }
}
