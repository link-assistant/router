//! `accounts list` must tell the truth about a credential before any request.
//!
//! Driven through the real binary rather than the library: issue #242 was not
//! a wrong computation but a wrong report, and the report is what an operator
//! and an automated health check actually read.

use std::path::{Path, PathBuf};
use std::process::Command;

fn scratch(slug: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "router-accounts-list-{slug}-{}",
        uuid::Uuid::new_v4()
    ));
    std::fs::create_dir_all(&dir).expect("create the credential home");
    dir
}

fn write_credential(home: &Path, refresh_token: &str, expires_at_ms: i64) {
    let refresh = if refresh_token.is_empty() {
        String::new()
    } else {
        format!("\"refreshToken\":\"{refresh_token}\",")
    };
    std::fs::write(
        home.join("credentials.json"),
        format!(
            "{{\"claudeAiOauth\":{{\"accessToken\":\"sk-ant-oat01-probe\",{refresh}\"expiresAt\":{expires_at_ms}}}}}"
        ),
    )
    .expect("write the credential");
}

/// The row `accounts list` prints for `home`, as `(healthy, credential)`.
fn account_row(home: &Path) -> (String, String) {
    let output = Command::new(env!("CARGO_BIN_EXE_router"))
        .args(["accounts", "list", "--claude-code-home"])
        .arg(home)
        .env("TOKEN_SECRET", "accounts-list-probe-secret")
        .output()
        .expect("router accounts list should run");
    assert!(
        output.status.success(),
        "accounts list failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    let row = stdout
        .lines()
        .find(|line| line.starts_with("primary"))
        .unwrap_or_else(|| panic!("no primary row in:\n{stdout}"));
    let mut fields = row.split_whitespace();
    let _name = fields.next();
    let healthy = fields.next().expect("healthy column").to_string();
    let credential = fields.next().expect("credential column").to_string();
    (healthy, credential)
}

/// Far in the past, and far in the future, as epoch milliseconds.
const EXPIRED_MS: i64 = 1_600_000_000_000;
const DISTANT_MS: i64 = 4_100_000_000_000;

/// A subscription whose access token has expired with no refresh token left
/// cannot serve a request, and must not be reported as healthy.
///
/// This is the contradiction issue #242 reported: `accounts list` printed
/// `healthy true` while `doctor` printed EXPIRED and every proxied request
/// returned 401. A health check that stays green on a dead pool is worse than
/// none, because it suppresses the alert that would otherwise fire.
#[test]
fn a_revoked_subscription_is_not_reported_healthy() {
    let home = scratch("revoked");
    write_credential(&home, "", EXPIRED_MS);
    assert_eq!(
        account_row(&home),
        ("false".to_string(), "expired".to_string())
    );
}

/// An expired access token that still holds a refresh token is recovered by
/// the refresh ladder on the next request, so it stays healthy. Without this
/// the fix for #242 would trade a false green for a false red.
#[test]
fn a_refreshable_subscription_stays_healthy() {
    let home = scratch("refreshable");
    write_credential(&home, "sk-ant-ort01-probe", EXPIRED_MS);
    assert_eq!(
        account_row(&home),
        ("true".to_string(), "refreshable".to_string())
    );
}

/// A live credential is healthy and says so.
#[test]
fn a_live_subscription_is_reported_healthy() {
    let home = scratch("live");
    write_credential(&home, "sk-ant-ort01-probe", DISTANT_MS);
    assert_eq!(account_row(&home), ("true".to_string(), "ok".to_string()));
}

/// An account pointed at a directory with no credential in it cannot serve
/// anything either, and reported healthy before this fix.
#[test]
fn a_missing_credential_is_not_reported_healthy() {
    let home = scratch("missing");
    assert_eq!(
        account_row(&home),
        ("false".to_string(), "missing".to_string())
    );
}
