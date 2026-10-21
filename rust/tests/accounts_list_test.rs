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
    let data = scratch("row-data");
    account_row_in(home, &data)
}

/// As [`account_row`], but with an explicit data directory — the durable
/// refusal store lives there.
fn account_row_in(home: &Path, data_dir: &Path) -> (String, String) {
    let output = Command::new(env!("CARGO_BIN_EXE_router"))
        .args(["accounts", "list", "--data-dir"])
        .arg(data_dir)
        .args(["--claude-code-home"])
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

/// After a refresh has been refused for the credential on disk, `accounts
/// list` must stop calling that account healthy.
///
/// This is the assertion issue #245 said would have caught the bug. It drives
/// the real binary, and records the refusal the way a running router or
/// `doctor` does — through the durable store, because `accounts list` is its
/// own short-lived process and performs no refresh of its own.
#[test]
fn a_refused_chain_is_not_reported_healthy() {
    let home = scratch("refused");
    let data = scratch("refused-data");
    // Expired, with a refresh token that is still a non-empty string — exactly
    // what a revoked chain looks like on disk.
    write_credential(&home, "sk-ant-ort01-revoked", EXPIRED_MS);

    // Nothing tried yet: "expired but holds a refresh token" is honest.
    assert_eq!(
        account_row_in(&home, &data),
        ("true".to_string(), "refreshable".to_string())
    );

    link_assistant_router::refresh_rejections::RejectionStore::open(&data).record(
        link_assistant_router::subscription::SubscriptionProvider::Claude,
        "primary",
        &link_assistant_router::subscription::SubscriptionToken {
            access_token: "sk-ant-oat01-probe".into(),
            refresh_token: Some("sk-ant-ort01-revoked".into()),
            expires_at_ms: Some(EXPIRED_MS),
            account_id: None,
            resource_url: None,
        },
    );

    assert_eq!(
        account_row_in(&home, &data),
        ("false".to_string(), "rejected".to_string()),
        "a chain the upstream refused was still reported healthy"
    );
}

/// A refusal covers one chain link, not the account: once another holder
/// rotates the credential forward, the account is reported recoverable again
/// with no restart and no manual step (issue #239's rule, preserved).
#[test]
fn a_rotated_chain_recovers_from_a_recorded_refusal() {
    let home = scratch("rotated");
    let data = scratch("rotated-data");
    write_credential(&home, "sk-ant-ort01-revoked", EXPIRED_MS);
    link_assistant_router::refresh_rejections::RejectionStore::open(&data).record(
        link_assistant_router::subscription::SubscriptionProvider::Claude,
        "primary",
        &link_assistant_router::subscription::SubscriptionToken {
            access_token: "sk-ant-oat01-probe".into(),
            refresh_token: Some("sk-ant-ort01-revoked".into()),
            expires_at_ms: Some(EXPIRED_MS),
            account_id: None,
            resource_url: None,
        },
    );
    assert_eq!(
        account_row_in(&home, &data),
        ("false".to_string(), "rejected".to_string())
    );

    write_credential(&home, "sk-ant-ort01-rotated", EXPIRED_MS);

    assert_eq!(
        account_row_in(&home, &data),
        ("true".to_string(), "refreshable".to_string()),
        "a rotated chain must recover without a restart"
    );
}

/// `router accounts <args>` against local state in `home`/`data`.
fn accounts_cli(home: &Path, data: &Path, args: &[&str]) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_router"))
        .arg("accounts")
        .args(args)
        .arg("--data-dir")
        .arg(data)
        .arg("--claude-code-home")
        .arg(home)
        .env("TOKEN_SECRET", "accounts-list-probe-secret")
        .output()
        .expect("router accounts should run")
}

/// `accounts pause` and `accounts resume` change the pool state that
/// `accounts list` reports, and that a router started from the same data
/// directory restores (issue #677).
#[test]
fn pause_and_resume_change_the_reported_state() {
    let home = scratch("pause");
    let data = scratch("pause-data");
    write_credential(&home, "sk-ant-ort01-live", DISTANT_MS);

    let paused = accounts_cli(
        &home,
        &data,
        &[
            "pause",
            "primary",
            "--reason",
            "maintenance",
            "--until",
            "2h",
        ],
    );
    assert!(
        paused.status.success(),
        "{}",
        String::from_utf8_lossy(&paused.stderr)
    );
    assert!(String::from_utf8_lossy(&paused.stdout).contains("paused primary until"));

    let listed = accounts_cli(&home, &data, &["list", "--json"]);
    let rows: serde_json::Value =
        link_assistant_router::contracts::validation::cli_payload(&listed.stdout)
            .expect("JSON rows");
    let primary = &rows[0];
    assert_eq!(primary["name"], "primary");
    assert_eq!(primary["paused"], true, "{primary}");
    assert_eq!(primary["pause"]["reason"], "maintenance");
    let until = primary["pause"]["until_unix"].as_u64().expect("until");
    let now = link_assistant_router::account_limits::now_unix();
    assert!((now + 7000..=now + 7300).contains(&until), "{until}");

    let resumed = accounts_cli(&home, &data, &["resume", "primary"]);
    assert!(String::from_utf8_lossy(&resumed.stdout).contains("resumed primary"));
    let listed = accounts_cli(&home, &data, &["list", "--json"]);
    let rows: serde_json::Value =
        link_assistant_router::contracts::validation::cli_payload(&listed.stdout)
            .expect("JSON rows");
    assert_eq!(rows[0]["paused"], false, "{}", rows[0]);

    let unknown = accounts_cli(&home, &data, &["pause", "nobody"]);
    assert!(!unknown.status.success());
    let bad_until = accounts_cli(&home, &data, &["pause", "primary", "--until", "soon"]);
    assert!(!bad_until.status.success());
    assert!(String::from_utf8_lossy(&bad_until.stderr).contains("--until"));
}

/// Against a selected router the commands call the admin API, with the admin
/// credential, the account name in the path and the pause in the body.
#[test]
fn pause_and_resume_call_the_selected_routers_admin_api() {
    use std::io::{BufRead, BufReader, Read, Write};
    use std::sync::{Arc, Mutex};

    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("bind stub router");
    let url = format!("http://{}", listener.local_addr().expect("address"));
    let seen = Arc::new(Mutex::new(Vec::<(String, String, String)>::new()));
    let recorded = Arc::clone(&seen);
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(mut stream) = stream else { continue };
            let mut reader = BufReader::new(stream.try_clone().expect("clone stream"));
            let mut request_line = String::new();
            reader.read_line(&mut request_line).expect("request line");
            let (mut length, mut authorization) = (0, String::new());
            loop {
                let mut line = String::new();
                reader.read_line(&mut line).expect("header");
                let line = line.trim_end();
                if line.is_empty() {
                    break;
                }
                let (name, value) = line.split_once(':').unwrap_or((line, ""));
                match name.to_ascii_lowercase().as_str() {
                    "content-length" => length = value.trim().parse().unwrap_or(0),
                    "authorization" => authorization = value.trim().to_string(),
                    _ => {}
                }
            }
            let mut body = vec![0; length];
            reader.read_exact(&mut body).expect("body");
            let answer = if request_line.starts_with("GET ") {
                r#"{"status":"ok"}"#
            } else if request_line.contains("/resume") {
                r#"{"account":"account-1","paused":false,"was_paused":true}"#
            } else {
                r#"{"account":"account-1","paused":true,"until_unix":4102444800}"#
            };
            if request_line.starts_with("POST ") {
                recorded.lock().expect("record").push((
                    request_line.trim_end().to_string(),
                    authorization,
                    String::from_utf8_lossy(&body).into_owned(),
                ));
            }
            let _ = write!(
                stream,
                "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\n\
                 connection: close\r\n\r\n{answer}",
                answer.len()
            );
        }
    });

    let home = tempfile::tempdir().expect("home");
    let remote = |args: &[&str]| {
        Command::new(env!("CARGO_BIN_EXE_router"))
            .arg("accounts")
            .args(args)
            .args(["--server", &url])
            .env_remove("TOKEN_SECRET")
            .env("HOME", home.path())
            .env("XDG_CONFIG_HOME", home.path())
            .env("LINK_ASSISTANT_ROUTER_TOKEN", "admin-credential")
            .output()
            .expect("router accounts should run")
    };

    let paused = remote(&[
        "pause",
        "account-1",
        "--reason",
        "weekly limit",
        "--until",
        "4102444800",
    ]);
    assert!(
        paused.status.success(),
        "{}",
        String::from_utf8_lossy(&paused.stderr)
    );
    assert!(
        String::from_utf8_lossy(&paused.stdout).contains("paused account-1 until 2100-01-01"),
        "{}",
        String::from_utf8_lossy(&paused.stdout)
    );
    let resumed = remote(&["resume", "account-1"]);
    assert!(
        resumed.status.success(),
        "{}",
        String::from_utf8_lossy(&resumed.stderr)
    );
    assert!(String::from_utf8_lossy(&resumed.stdout).contains("resumed account-1"));

    let seen = seen.lock().expect("requests").clone();
    assert_eq!(seen.len(), 2, "{seen:?}");
    assert!(
        seen[0]
            .0
            .starts_with("POST /api/management/accounts/account-1/pause "),
        "{seen:?}"
    );
    assert_eq!(seen[0].1, "Bearer admin-credential");
    let body: serde_json::Value = serde_json::from_str(&seen[0].2).expect("pause body");
    assert_eq!(
        body,
        serde_json::json!({"reason": "weekly limit", "until_unix": 4_102_444_800_u64})
    );
    assert!(
        seen[1]
            .0
            .starts_with("POST /api/management/accounts/account-1/resume "),
        "{seen:?}"
    );
}
