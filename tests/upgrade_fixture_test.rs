//! Upgrade compatibility against a checked-in release state (issue #673).
//!
//! `tests/fixtures/upgrade/v1.15.1/` was written by the released v1.15.1
//! binary through `scripts/upgrade-matrix.sh fixture`: a capped client token,
//! an admin token, a revoked token, a provider with an encrypted API key and a
//! persisted server profile. Every secret in it is a throwaway: the signing
//! secret below, a fake API key, and tokens signed with that secret.
//!
//! The `Upgrade matrix` workflow runs the same checks against the last three
//! releases' own binaries; this test keeps one of them in the ordinary run.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;

use link_assistant_router::config::StoragePolicy;
use link_assistant_router::providers::ProviderStore;
use link_assistant_router::storage::build_token_store;
use link_assistant_router::token::{TokenError, TokenManager};

/// The throwaway signing secret the fixture was written with.
const SECRET: &str = "upgrade-matrix-secret-0123456789abcdef";
const PROVIDER: &str = "upgrade-stub";
const PROVIDER_KEY: &str = "upgrade-matrix-fake-api-key";
const SERVER_URL: &str = "http://127.0.0.1:18080";

fn fixture_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/upgrade/v1.15.1")
}

fn copy_dir(from: &Path, to: &Path) {
    std::fs::create_dir_all(to).unwrap();
    for entry in std::fs::read_dir(from).unwrap() {
        let entry = entry.unwrap();
        let target = to.join(entry.file_name());
        if entry.file_type().unwrap().is_dir() {
            copy_dir(&entry.path(), &target);
        } else {
            std::fs::copy(entry.path(), &target).unwrap();
        }
    }
}

/// A private copy of the fixture, so the upgrade's writes stay in a temp dir.
struct State {
    _dir: tempfile::TempDir,
    root: PathBuf,
    tokens: HashMap<String, String>,
}

impl State {
    fn new() -> Self {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().join("state");
        copy_dir(&fixture_dir(), &root);
        let tokens = std::fs::read_to_string(root.join("tokens.env"))
            .unwrap()
            .lines()
            .filter_map(|line| line.split_once('='))
            .map(|(name, value)| (name.to_owned(), value.to_owned()))
            .collect();
        Self {
            _dir: dir,
            root,
            tokens,
        }
    }

    fn data(&self) -> PathBuf {
        self.root.join("data")
    }

    fn get(&self, name: &str) -> &str {
        self.tokens
            .get(name)
            .unwrap_or_else(|| panic!("tokens.env has no {name}"))
    }

    fn manager(&self) -> TokenManager {
        let store = build_token_store(StoragePolicy::Both, &self.data()).unwrap();
        TokenManager::with_store(SECRET, store)
    }

    /// Run this commit's `router` against the copied state.
    fn router(&self, args: &[&str]) -> String {
        let home = self.root.join("home");
        let output = Command::new(env!("CARGO_BIN_EXE_router"))
            .arg("--data-dir")
            .arg(self.data())
            .args(args)
            .env("HOME", &home)
            .env("XDG_CONFIG_HOME", home.join(".config"))
            .env("TOKEN_SECRET", SECRET)
            .env_remove("LINK_ASSISTANT_ROUTER_SERVER")
            .env_remove("LINK_ASSISTANT_ROUTER_TOKEN")
            .output()
            .unwrap();
        let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
        assert!(
            output.status.success(),
            "router {args:?} failed: {stdout}{}",
            String::from_utf8_lossy(&output.stderr)
        );
        stdout
    }
}

#[test]
fn released_tokens_keep_their_identity_caps_scope_and_revocation() {
    let state = State::new();
    let manager = state.manager();

    let user = manager.validate_token(state.get("USER_TOKEN")).unwrap();
    assert_eq!(user.sub, state.get("USER_ID"));
    assert_eq!(user.label, "upgrade-user");
    assert!(matches!(
        manager.validate_admin_token(state.get("USER_TOKEN")),
        Err(TokenError::InsufficientScope)
    ));

    let admin = manager
        .validate_admin_token(state.get("ADMIN_TOKEN"))
        .unwrap();
    assert_eq!(admin.sub, state.get("ADMIN_ID"));

    assert!(matches!(
        manager.validate_token(state.get("REVOKED_TOKEN")),
        Err(TokenError::Revoked)
    ));

    let records = manager.list_tokens().unwrap();
    let user = records
        .iter()
        .find(|record| record.id == state.get("USER_ID"))
        .expect("the capped token survives");
    assert_eq!(user.max_requests, Some(50));
    assert_eq!(user.max_tokens, Some(100_000));
    assert!(!user.revoked);
    assert!(
        records
            .iter()
            .any(|record| record.id == state.get("REVOKED_ID") && record.revoked)
    );
}

#[test]
fn released_tokens_do_not_validate_under_another_secret() {
    let state = State::new();
    let store = build_token_store(StoragePolicy::Both, &state.data()).unwrap();
    let other = TokenManager::with_store("a-different-secret-0123456789abcdef", store);
    assert!(other.validate_token(state.get("USER_TOKEN")).is_err());
}

#[test]
fn a_released_provider_key_still_decrypts() {
    let state = State::new();
    let store = ProviderStore::open(&state.data(), SECRET).unwrap();
    let provider = store.resolve(PROVIDER).unwrap().expect("provider survives");
    assert_eq!(provider.base_url, "http://127.0.0.1:9/v1");
    assert_eq!(provider.default_model.as_deref(), Some("stub-model"));
    assert_eq!(provider.api_key.as_deref(), Some(PROVIDER_KEY));

    // The key is bound to the secret: another one cannot read it.
    let other = ProviderStore::open(&state.data(), "a-different-secret-0123456789abcdef")
        .and_then(|store| store.resolve(PROVIDER));
    assert!(
        !matches!(other, Ok(Some(ref provider)) if provider.api_key.as_deref() == Some(PROVIDER_KEY))
    );
}

#[test]
fn the_cli_reads_and_extends_a_released_state() {
    let state = State::new();
    let listing = state.router(&["tokens", "list", "--local"]);
    for id in ["USER_ID", "ADMIN_ID", "REVOKED_ID"] {
        assert!(listing.contains(state.get(id)), "{id} missing: {listing}");
    }
    let shown = state.router(&["providers", "show", "--local", PROVIDER]);
    assert!(shown.contains("\"has_encrypted_api_key\": true"), "{shown}");
    let status = state.router(&["server", "status"]);
    assert!(status.contains(SERVER_URL), "{status}");

    // The upgraded store stays writable, and the old records survive a write.
    state.router(&[
        "tokens",
        "issue",
        "--local",
        "--label",
        "upgrade-after",
        "--ttl-hours",
        "1",
    ]);
    state.router(&["tokens", "revoke", "--local", state.get("USER_ID")]);
    let manager = state.manager();
    assert!(matches!(
        manager.validate_token(state.get("USER_TOKEN")),
        Err(TokenError::Revoked)
    ));
    manager
        .validate_admin_token(state.get("ADMIN_TOKEN"))
        .unwrap();
    let labels: Vec<String> = manager
        .list_tokens()
        .unwrap()
        .into_iter()
        .map(|record| record.label)
        .collect();
    for label in [
        "upgrade-user",
        "upgrade-admin",
        "upgrade-revoked",
        "upgrade-after",
    ] {
        assert!(
            labels.iter().any(|have| have == label),
            "{label}: {labels:?}"
        );
    }
}
