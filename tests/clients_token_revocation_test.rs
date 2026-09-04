//! Managed-credential lifecycle coverage for issue #190.
//!
//! `clients setup` may mint a router token on the user's behalf. Before this
//! suite existed, `clients remove` deleted the local secret while the token it
//! had minted stayed valid forever — anybody who had copied the environment
//! file kept working access. Each test drives the shipped binary end to end:
//! setup → show → remove → `tokens list` in a *new* process, which is also the
//! restart-persistence check, because the second process reads the store from
//! disk rather than from memory.

mod common;

use common::mock_router;
use link_assistant_router::config::StoragePolicy;
use link_assistant_router::storage::build_token_store;
use link_assistant_router::token::{IssueRequest, TokenManager};
use std::fs;
use std::path::Path;
use std::process::{Command, Output};

/// Clients whose permanent setup this router supports.
/// Named canonically: the client names are the real commands (issue #220), and
/// these names also derive the managed file paths asserted below.
const SUPPORTED: [&str; 6] = ["codex", "claude", "opencode", "qwen", "agent", "grok"];

/// Clients whose setup fetches the model catalog before writing anything.
fn needs_catalog(client: &str) -> bool {
    matches!(client, "claude" | "opencode" | "qwen" | "agent")
}

const BACKENDS: [&str; 2] = ["text", "binary"];

fn router(home: &Path, storage: &str, args: &[&str]) -> Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    command
        .args(args)
        .env("HOME", home)
        .env_remove("CODEX_HOME")
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("QWEN_HOME")
        .env_remove("GEMINI_CLI_HOME")
        .env_remove("CURSOR_CONFIG_DIR")
        .env_remove("LINK_ASSISTANT_ROUTER_TOKEN")
        .env_remove("LINK_ASSISTANT_TOKEN")
        .env("TOKEN_SECRET", "clients-revocation-test-secret")
        .env("DATA_DIR", home.join("router-data"))
        .env("STORAGE_POLICY", storage);
    command.output().expect("router CLI should run")
}

fn text(output: &Output) -> String {
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

/// Parsed `tokens list` row: `(id, revoked, label)`.
fn tokens(home: &Path, storage: &str) -> Vec<(String, bool, String)> {
    let listed = router(home, storage, &["tokens", "list"]);
    assert!(listed.status.success(), "tokens list: {}", text(&listed));
    String::from_utf8_lossy(&listed.stdout)
        .lines()
        .filter_map(|line| {
            let mut fields = line.split_whitespace();
            // The banner and the header share stdout with the rows; a 36-char
            // UUID in the first column is what makes a line a token record.
            let id = fields.next().filter(|id| id.len() == 36)?.to_string();
            let _issued = fields.next()?;
            let _expires = fields.next()?;
            let revoked = fields.next()? == "true";
            let label = fields.last().unwrap_or_default().to_string();
            Some((id, revoked, label))
        })
        .collect()
}

fn revoked_state(home: &Path, storage: &str, id: &str) -> Option<bool> {
    tokens(home, storage)
        .into_iter()
        .find(|(listed, _, _)| listed == id)
        .map(|(_, revoked, _)| revoked)
}

/// Issue the operator-owned credential through the same durable store as the
/// CLI while retaining the complete immutable managed-client binding.
fn supplied_client_token(home: &Path, storage: &str, client: &str) -> String {
    let policy = StoragePolicy::from_str_opt(storage).expect("test storage policy");
    let store = build_token_store(policy, &home.join("router-data")).expect("token store");
    TokenManager::with_store("clients-revocation-test-secret", store)
        .issue(&IssueRequest {
            ttl_hours: 24,
            label: "operator-owned",
            account: Some("primary"),
            max_requests: None,
            max_tokens: None,
            rate_limit_per_minute: None,
            scope: "",
            github_repos: Vec::new(),
            sliding_window_seconds: None,
            client_kind: Some(client),
            principal_id: Some("primary"),
        })
        .expect("issue bound operator-owned token")
}

fn credential_path(home: &Path, client: &str) -> std::path::PathBuf {
    home.join(".config/link-assistant-router/clients")
        .join(format!("{client}.credential.json"))
}

fn environment_path(home: &Path, client: &str) -> std::path::PathBuf {
    home.join(".config/link-assistant-router/clients")
        .join(format!("{client}.env"))
}

fn recorded_token_id(home: &Path, client: &str) -> String {
    let source = fs::read_to_string(credential_path(home, client)).expect("credential metadata");
    let record: serde_json::Value = serde_json::from_str(&source).expect("valid metadata");
    record["token_id"]
        .as_str()
        .expect("recorded token id")
        .to_string()
}

/// Run `clients setup <client>`, minting a token unless `token` is given.
fn setup(home: &Path, storage: &str, client: &str, token: Option<&str>) -> Output {
    let catalog = needs_catalog(client).then(|| {
        let model = if client == "claude" {
            ("claude-future-test", "anthropic")
        } else {
            ("gpt-test", "openai")
        };
        mock_router(&[model], 1)
    });
    let base_url = catalog.as_ref().map_or_else(
        || "http://router.test:8080".to_string(),
        |(url, _)| url.clone(),
    );
    let mut args = vec!["clients", "setup", client, "--base-url", &base_url];
    if let Some(token) = token {
        args.extend(["--token", token]);
    }
    let output = router(home, storage, &args);
    if let Some((_, server)) = catalog {
        let _ = server.join();
    }
    output
}

#[test]
fn setup_show_remove_revokes_the_minted_token_for_every_client_and_backend() {
    for storage in BACKENDS {
        for client in SUPPORTED {
            let home = tempfile::tempdir().expect("temp home");
            let home = home.path();

            let created = setup(home, storage, client, None);
            assert!(
                created.status.success(),
                "{client}/{storage} setup: {}",
                text(&created)
            );
            let id = recorded_token_id(home, client);
            assert_eq!(
                revoked_state(home, storage, &id),
                Some(false),
                "{client}/{storage} minted token should start active"
            );

            let shown = router(home, storage, &["clients", "show", client]);
            assert!(
                shown.status.success(),
                "{client}/{storage}: {}",
                text(&shown)
            );
            let printed = String::from_utf8_lossy(&shown.stdout).into_owned();
            let json = &printed[printed.find('{').expect("status JSON object")..];
            let status: serde_json::Value = serde_json::from_str(json).expect("client status JSON");
            assert_eq!(
                status["token_env_set"], true,
                "{client}/{storage} should report a managed credential"
            );

            let removed = router(home, storage, &["clients", "remove", client]);
            assert!(
                removed.status.success(),
                "{client}/{storage} remove: {}",
                text(&removed)
            );
            assert!(
                text(&removed).contains(&format!("revoked managed token {id}")),
                "{client}/{storage} remove did not report the revocation: {}",
                text(&removed)
            );
            assert!(!environment_path(home, client).exists());
            assert!(!credential_path(home, client).exists());
            // A fresh process reads the store back from disk: this is the
            // restart-persistence assertion as well as the revocation one.
            assert_eq!(
                revoked_state(home, storage, &id),
                Some(true),
                "{client}/{storage} left its minted token usable after remove"
            );
        }
    }
}

#[test]
fn repeating_an_identical_setup_does_not_mint_another_token() {
    let home = tempfile::tempdir().expect("temp home");
    let home = home.path();

    let first = setup(home, "text", "codex", None);
    assert!(first.status.success(), "first setup: {}", text(&first));
    let before = tokens(home, "text");
    assert_eq!(before.len(), 1);

    let second = setup(home, "text", "codex", None);
    assert!(second.status.success(), "second setup: {}", text(&second));
    assert_eq!(
        tokens(home, "text"),
        before,
        "an identical setup must reuse the complete managed configuration"
    );
}

#[test]
fn catalog_failure_revokes_the_candidate_minted_before_validation() {
    let home = tempfile::tempdir().expect("temp home");
    let home = home.path();
    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("reserve port");
    let base_url = format!("http://{}", listener.local_addr().expect("address"));
    drop(listener);

    let failed = router(
        home,
        "text",
        &["clients", "setup", "opencode", "--base-url", &base_url],
    );
    assert!(!failed.status.success(), "setup unexpectedly worked");
    let records = tokens(home, "text");
    assert_eq!(records.len(), 1, "one candidate should have been minted");
    assert!(records[0].1, "the unused candidate must be revoked");
    assert!(!home.join(".config/opencode/opencode.json").exists());
}

#[test]
fn supplied_tokens_survive_remove_unless_revocation_is_requested() {
    for storage in BACKENDS {
        let home = tempfile::tempdir().expect("temp home");
        let home = home.path();
        let token = supplied_client_token(home, storage, "codex");
        let id = tokens(home, storage)
            .into_iter()
            .find(|(_, _, label)| label == "operator-owned")
            .expect("issued token is listed")
            .0;

        assert!(
            setup(home, storage, "codex", Some(&token)).status.success(),
            "supplied-token setup failed"
        );
        let removed = router(home, storage, &["clients", "remove", "codex"]);
        assert!(removed.status.success(), "{}", text(&removed));
        assert_eq!(
            revoked_state(home, storage, &id),
            Some(false),
            "{storage}: an operator-supplied token must not be revoked implicitly"
        );

        assert!(
            setup(home, storage, "codex", Some(&token)).status.success(),
            "second supplied-token setup failed"
        );
        let removed = router(
            home,
            storage,
            &["clients", "remove", "codex", "--revoke-supplied"],
        );
        assert!(removed.status.success(), "{}", text(&removed));
        assert_eq!(
            revoked_state(home, storage, &id),
            Some(true),
            "{storage}: --revoke-supplied must revoke the operator's token"
        );
    }
}

#[test]
fn rejected_generic_token_leaves_every_store_byte_and_mtime_unchanged() {
    for storage in ["text", "binary", "both"] {
        let home = tempfile::tempdir().expect("temp home");
        let issued = router(
            home.path(),
            storage,
            &["tokens", "issue", "--label", "generic-not-managed"],
        );
        assert!(issued.status.success(), "{}", text(&issued));
        let token = String::from_utf8_lossy(&issued.stdout)
            .lines()
            .find(|line| line.trim().starts_with("la_sk_"))
            .expect("issued token")
            .trim()
            .to_string();
        let data = home.path().join("router-data");
        let before = fs::read_dir(&data)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_file()))
            .map(|entry| {
                let path = entry.path();
                let bytes = fs::read(&path).unwrap();
                let modified = fs::metadata(&path).unwrap().modified().unwrap();
                (path, bytes, modified)
            })
            .collect::<Vec<_>>();

        let rejected = setup(home.path(), storage, "codex", Some(&token));
        assert!(!rejected.status.success(), "generic token was adopted");
        for (path, bytes, modified) in before {
            assert_eq!(
                fs::read(&path).unwrap(),
                bytes,
                "{} changed",
                path.display()
            );
            assert_eq!(
                fs::metadata(&path).unwrap().modified().unwrap(),
                modified,
                "{} mtime changed",
                path.display()
            );
        }
        assert!(!credential_path(home.path(), "codex").exists());
        assert!(!environment_path(home.path(), "codex").exists());
        assert!(!home.path().join(".codex").exists());
    }
}

#[test]
fn read_only_generic_token_validation_does_not_touch_a_binary_projection() {
    let home = tempfile::tempdir().expect("temp home");
    let issued = router(
        home.path(),
        "binary",
        &["tokens", "issue", "--label", "binary-generic"],
    );
    assert!(issued.status.success(), "{}", text(&issued));
    let token = String::from_utf8_lossy(&issued.stdout)
        .lines()
        .find(|line| line.trim().starts_with("la_sk_"))
        .expect("issued token")
        .trim()
        .to_string();
    let path = home.path().join("router-data/tokens.bin");
    let before = fs::read(&path).expect("binary token projection");
    let modified = fs::metadata(&path)
        .expect("binary token metadata")
        .modified()
        .expect("binary token mtime");

    let rejected = setup(home.path(), "binary", "codex", Some(&token));
    assert!(!rejected.status.success(), "generic token was adopted");
    assert_eq!(fs::read(&path).expect("binary token projection"), before);
    assert_eq!(
        fs::metadata(&path)
            .expect("binary token metadata")
            .modified()
            .expect("binary token mtime"),
        modified,
        "read-only validation changed the binary projection mtime"
    );
}

#[test]
fn failed_revocation_keeps_the_credential_and_exits_nonzero() {
    let home = tempfile::tempdir().expect("temp home");
    let home = home.path();
    assert!(setup(home, "text", "codex", None).status.success());
    let id = recorded_token_id(home, "codex");

    // Simulate a store that can no longer answer for the token — the token is
    // still out there, so removal must refuse to claim success.
    fs::remove_file(home.join("router-data/tokens.lino")).expect("drop the token store");

    let removed = router(home, "text", &["clients", "remove", "codex"]);
    assert!(
        !removed.status.success(),
        "remove reported success without revoking: {}",
        text(&removed)
    );
    let message = text(&removed);
    assert!(
        message.contains(&id),
        "recovery hint omits the token id: {message}"
    );
    assert!(
        message.contains("tokens revoke"),
        "no recovery instructions: {message}"
    );
    assert!(
        environment_path(home, "codex").exists(),
        "the credential file must survive a failed revocation"
    );
    assert!(credential_path(home, "codex").exists());

    let forced = router(home, "text", &["clients", "remove", "codex", "--force"]);
    assert!(
        forced.status.success(),
        "--force removal failed: {}",
        text(&forced)
    );
    assert!(!environment_path(home, "codex").exists());
}

/// A live router process sharing the CLI's token store.
struct Router {
    child: std::process::Child,
    port: u16,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Router {
    fn start(home: &Path, storage: &str) -> Self {
        let port = std::net::TcpListener::bind("127.0.0.1:0")
            .expect("ephemeral port")
            .local_addr()
            .expect("local address")
            .port();
        let child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .arg("serve")
            .env("HOME", home)
            .env("TOKEN_SECRET", "clients-revocation-test-secret")
            .env("DATA_DIR", home.join("router-data"))
            .env("STORAGE_POLICY", storage)
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("CLAUDE_CODE_HOME", home.join("claude"))
            .env("DISABLE_LOGIN_API", "true")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .expect("router should start");
        let router = Self { child, port };
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(30);
        while std::time::Instant::now() < deadline {
            if http_post(&router.url("/api/health"), None, "").is_some() {
                return router;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        panic!("router never became healthy on port {}", router.port);
    }

    fn url(&self, path: &str) -> String {
        format!("http://127.0.0.1:{}{path}", self.port)
    }
}

/// Minimal blocking POST; the crate's `reqwest` is async-only here.
fn http_post(url: &str, bearer: Option<&str>, body: &str) -> Option<u16> {
    use std::io::{Read as _, Write as _};

    let rest = url.strip_prefix("http://")?;
    let (authority, path) = rest.split_once('/')?;
    let mut stream = std::net::TcpStream::connect(authority).ok()?;
    stream
        .set_read_timeout(Some(std::time::Duration::from_secs(20)))
        .ok()?;
    let mut request = format!(
        "POST /{path} HTTP/1.1\r\nHost: {authority}\r\nConnection: close\r\n\
         Content-Type: application/json\r\nContent-Length: {}\r\n",
        body.len()
    );
    if let Some(bearer) = bearer {
        request.push_str("Authorization: Bearer ");
        request.push_str(bearer);
        request.push_str("\r\n");
    }
    request.push_str("\r\n");
    request.push_str(body);
    stream.write_all(request.as_bytes()).ok()?;
    let mut raw = String::new();
    stream.read_to_string(&mut raw).ok()?;
    raw.split_whitespace().nth(1)?.parse().ok()
}

/// Read the bearer token out of the managed environment file.
fn environment_token(home: &Path, client: &str) -> String {
    let source = fs::read_to_string(environment_path(home, client)).expect("environment file");
    source
        .lines()
        .find_map(|line| {
            let (_, value) = line.split_once('=')?;
            let value = value.trim().trim_matches('\'');
            value.starts_with("la_sk_").then(|| value.to_string())
        })
        .expect("token export")
}

#[test]
fn a_removed_client_credential_is_rejected_by_a_live_router() {
    for storage in BACKENDS {
        let home = tempfile::tempdir().expect("temp home");
        let home = home.path();
        let router_process = Router::start(home, storage);
        let base_url = router_process.url("");

        let created = router(
            home,
            storage,
            &["clients", "setup", "codex", "--base-url", &base_url],
        );
        assert!(created.status.success(), "setup: {}", text(&created));
        let token = environment_token(home, "codex");
        let probe = format!("{base_url}/api/services/openai/v1/chat/completions");
        let body = r#"{"model":"gpt-5.6-sol","messages":[{"role":"user","content":"hi"}]}"#;
        let before = http_post(&probe, Some(&token), body).expect("router answers");
        assert!(
            before != 401 && before != 403,
            "{storage}: the freshly minted credential should authenticate, got {before}"
        );

        let removed = router(home, storage, &["clients", "remove", "codex"]);
        assert!(removed.status.success(), "remove: {}", text(&removed));

        let after = http_post(&probe, Some(&token), body).expect("router answers");
        assert!(
            after == 401 || after == 403,
            "{storage}: the router still accepts a credential that `clients remove` deleted, got {after}"
        );
    }
}

#[test]
fn credential_metadata_never_contains_the_token() {
    let home = tempfile::tempdir().expect("temp home");
    let home = home.path();
    assert!(setup(home, "text", "codex", None).status.success());
    let metadata = fs::read_to_string(credential_path(home, "codex")).expect("credential metadata");
    assert!(
        !metadata.contains("la_sk_"),
        "metadata leaked the token: {metadata}"
    );
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        let mode = fs::metadata(credential_path(home, "codex"))
            .expect("metadata stat")
            .permissions()
            .mode();
        assert_eq!(mode & 0o777, 0o600, "credential metadata is not owner-only");
    }
}
