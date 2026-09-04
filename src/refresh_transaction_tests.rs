//! Fail-closed refresh transaction regressions (issue #383).

use std::path::PathBuf;

use super::super::{
    RefreshError, refresh_failure_diagnostic, terminal_failure_diagnostic, terminal_message,
};
use super::*;
use crate::credential_recovery_store::RecoverableCredentialStore;

#[derive(Debug)]
struct ControlledStore {
    credential: Option<SubscriptionToken>,
    lock_path: Option<PathBuf>,
    persist_error: Option<&'static str>,
}

#[derive(Debug)]
struct ExternalAuthoritativeStore {
    credential: SubscriptionToken,
    lock_path: PathBuf,
}

impl CredentialStore for ExternalAuthoritativeStore {
    fn reload(&self) -> Option<SubscriptionToken> {
        Some(self.credential.clone())
    }

    fn prepare_refresh(&self, _token: &SubscriptionToken) -> Result<(), String> {
        Err("external authoritative store is not writable".into())
    }

    fn persist(&self, _token: &SubscriptionToken) -> Result<(), String> {
        panic!("a refused external refresh must never reach persistence")
    }

    fn lock_path(&self) -> Option<PathBuf> {
        Some(self.lock_path.clone())
    }

    fn describe(&self) -> String {
        "injected external authoritative store".into()
    }
}

impl CredentialStore for ControlledStore {
    fn reload(&self) -> Option<SubscriptionToken> {
        self.credential.clone()
    }

    fn persist(&self, _token: &SubscriptionToken) -> Result<(), String> {
        self.persist_error.map_or(Ok(()), |error| Err(error.into()))
    }

    fn lock_path(&self) -> Option<PathBuf> {
        self.lock_path.clone()
    }

    fn describe(&self) -> String {
        self.lock_path.as_ref().map_or_else(
            || "test credential store".into(),
            |path| path.display().to_string(),
        )
    }
}

fn request_refresh_link(body: &str) -> String {
    if let Ok(document) = serde_json::from_str::<serde_json::Value>(body) {
        return document["refresh_token"]
            .as_str()
            .expect("JSON refresh_token")
            .to_string();
    }
    body.split('&')
        .find_map(|pair| pair.strip_prefix("refresh_token=").map(str::to_string))
        .expect("form refresh_token")
}

async fn assert_refresh_is_refused_without_endpoint_request(
    store: Option<Arc<dyn CredentialStore>>,
    expected_error: &str,
) {
    let (url, received, server) = scripted_endpoint(
        vec![Answer::new(
            200,
            r#"{"access_token":"must-not-escape","refresh_token":"must-not-be-spent","expires_in":3600}"#,
        )],
        |_| {},
    )
    .await;
    let cache = TokenCache::new();
    if let Some(store) = store {
        cache.register_store(SubscriptionProvider::Claude, "primary", store);
    }
    let original = token("safe-old-access", "safe-old-refresh", NOW_MS - 1);

    let returned = cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            "primary",
            original.clone(),
            NOW_MS,
        )
        .await;

    assert_eq!(returned, original);
    assert!(
        received.lock().unwrap().is_empty(),
        "the token endpoint must not be contacted without a durable lock"
    );
    let reported = cache
        .last_refresh_error(SubscriptionProvider::Claude)
        .expect("storage failure is operator-visible");
    assert!(reported.contains(expected_error), "{reported}");
    assert!(!reported.contains("safe-old-access"), "{reported}");
    assert!(!reported.contains("safe-old-refresh"), "{reported}");
    server.abort();
}

#[tokio::test]
async fn a_missing_store_fails_closed_before_the_token_endpoint() {
    assert_refresh_is_refused_without_endpoint_request(None, "not registered").await;
}

#[tokio::test]
async fn a_store_without_a_lock_path_fails_closed_before_the_token_endpoint() {
    let store = Arc::new(ControlledStore {
        credential: Some(token("safe-old-access", "safe-old-refresh", NOW_MS - 1)),
        lock_path: None,
        persist_error: None,
    });
    assert_refresh_is_refused_without_endpoint_request(
        Some(store as Arc<dyn CredentialStore>),
        "lock path",
    )
    .await;
}

#[tokio::test]
async fn an_external_authoritative_store_is_not_spent_without_a_writer() {
    let directory = tempfile::tempdir().expect("lock directory");
    let store = Arc::new(ExternalAuthoritativeStore {
        credential: token("safe-old-access", "safe-old-refresh", NOW_MS - 1),
        lock_path: directory.path().join("credential.lock"),
    });

    assert_refresh_is_refused_without_endpoint_request(
        Some(store as Arc<dyn CredentialStore>),
        "external store cannot be durably advanced",
    )
    .await;
}

#[tokio::test]
async fn a_lock_open_error_fails_closed_before_the_token_endpoint() {
    let directory = tempfile::tempdir().expect("lock directory");
    let blocking_file = directory.path().join("not-a-directory");
    std::fs::write(&blocking_file, b"occupied").expect("blocking file");
    let store = Arc::new(ControlledStore {
        credential: Some(token("safe-old-access", "safe-old-refresh", NOW_MS - 1)),
        lock_path: Some(blocking_file.join("credential.lock")),
        persist_error: None,
    });
    assert_refresh_is_refused_without_endpoint_request(
        Some(store as Arc<dyn CredentialStore>),
        "could not acquire",
    )
    .await;
}

#[tokio::test]
async fn a_lock_timeout_fails_closed_before_the_token_endpoint() {
    let directory = tempfile::tempdir().expect("lock directory");
    let lock_path = directory.path().join("credential.lock");
    let holder = std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(&lock_path)
        .expect("lock file");
    holder.lock().expect("hold lock");
    let store = Arc::new(ControlledStore {
        credential: Some(token("safe-old-access", "safe-old-refresh", NOW_MS - 1)),
        lock_path: Some(lock_path),
        persist_error: None,
    });

    assert_refresh_is_refused_without_endpoint_request(
        Some(store as Arc<dyn CredentialStore>),
        "timed out",
    )
    .await;
}

#[tokio::test]
async fn a_failed_post_lock_reload_fails_closed_before_the_token_endpoint() {
    let directory = tempfile::tempdir().expect("lock directory");
    let store = Arc::new(ControlledStore {
        credential: None,
        lock_path: Some(directory.path().join("credential.lock")),
        persist_error: None,
    });
    assert_refresh_is_refused_without_endpoint_request(
        Some(store as Arc<dyn CredentialStore>),
        "re-read",
    )
    .await;
}

#[tokio::test]
async fn post_lock_reload_failure_hides_account_paths_from_errors_and_logs() {
    const SENTINEL: &str = "raw-account-sentinel@example.invalid";
    let directory = tempfile::tempdir().expect("credential parent");
    let home = directory.path().join(SENTINEL);
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, &home);
    let (url, received, server) = scripted_endpoint(
        vec![Answer::new(
            200,
            r#"{"access_token":"must-not-escape","refresh_token":"must-not-be-spent","expires_in":3600}"#,
        )],
        |_| {},
    )
    .await;
    let cache = TokenCache::new();
    cache.register_store(
        SubscriptionProvider::Claude,
        SENTINEL,
        Arc::new(reader) as Arc<dyn CredentialStore>,
    );
    let original = token("safe-old-access", "safe-old-refresh", NOW_MS - 1);
    let returned = cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            SENTINEL,
            original.clone(),
            NOW_MS,
        )
        .await;

    assert_eq!(returned, original);
    assert!(received.lock().unwrap().is_empty());
    let reported = cache
        .last_refresh_error_for(SubscriptionProvider::Claude, SENTINEL)
        .expect("storage failure is operator-visible");
    let diagnostic = refresh_failure_diagnostic(SubscriptionProvider::Claude, &reported);
    assert!(reported.contains("re-read"), "{reported}");
    assert!(
        diagnostic.contains("could not re-read the registered claude credential"),
        "the log formatter must retain the provider-scoped cause: {diagnostic}"
    );
    assert!(!reported.contains(SENTINEL), "{reported}");
    assert!(!diagnostic.contains(SENTINEL), "{diagnostic}");
    server.abort();
}

#[tokio::test]
async fn terminal_invalid_grant_hides_account_paths_from_errors_and_logs() {
    const SENTINEL: &str = "raw-account-sentinel@example.invalid";
    const RESPONSE_SENTINEL: &str = "raw-oauth-response-sentinel@example.invalid";
    const REDACTED_INVALID_GRANT: &str = r#"{"error":{"type":"invalid_grant","description":"raw-oauth-response-sentinel@example.invalid"},"access_token":"raw-oauth-response-sentinel@example.invalid"}"#;
    let directory = tempfile::tempdir().expect("lock directory");
    let original = token("safe-old-access", "safe-old-refresh", NOW_MS - 1);
    let store = Arc::new(ControlledStore {
        credential: Some(original.clone()),
        lock_path: Some(directory.path().join(SENTINEL).join("credential.lock")),
        persist_error: None,
    });
    let (url, received, server) =
        scripted_endpoint(vec![Answer::new(400, REDACTED_INVALID_GRANT)], |_| {}).await;
    let cache = TokenCache::new();
    cache.register_store(
        SubscriptionProvider::Claude,
        SENTINEL,
        store.clone() as Arc<dyn CredentialStore>,
    );

    let returned = cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            SENTINEL,
            original.clone(),
            NOW_MS,
        )
        .await;
    drain(server).await;

    let reported = cache
        .last_refresh_error_for(SubscriptionProvider::Claude, SENTINEL)
        .expect("terminal rejection is operator-visible");
    let diagnostic = terminal_failure_diagnostic(SubscriptionProvider::Claude, &reported, true);
    assert_eq!(returned, original);
    assert_eq!(received.lock().unwrap().len(), 1);
    assert!(reported.contains("invalid_grant"), "{reported}");
    assert!(
        reported.contains("link-assistant-router auth claude"),
        "{reported}"
    );
    assert!(diagnostic.contains("invalid_grant"), "{diagnostic}");
    assert!(!reported.contains(SENTINEL), "{reported}");
    assert!(!diagnostic.contains(SENTINEL), "{diagnostic}");
    assert!(!reported.contains(RESPONSE_SENTINEL), "{reported}");
    assert!(!diagnostic.contains(RESPONSE_SENTINEL), "{diagnostic}");

    // The legacy provider-wide health view reads the primary cache slot. Feed
    // the already-redacted account diagnostic through that compatibility path
    // and verify its operator-facing reason remains safe too.
    cache.record_refresh_error(SubscriptionProvider::Claude, &reported);
    cache.record_credential_rejected(SubscriptionProvider::Claude);
    let health = crate::model_routing::configured_provider_health(
        &[SubscriptionReader::new(
            SubscriptionProvider::Claude,
            directory.path(),
        )],
        &cache,
        &crate::model_catalog::ModelCatalogCache::new(),
    );
    let health_text = format!("{health:?}");
    assert!(health_text.contains("invalid_grant"), "{health_text}");
    assert!(!health_text.contains(RESPONSE_SENTINEL), "{health_text}");

    let endpoint_error = RefreshError::from_status(400, REDACTED_INVALID_GRANT, None);
    for retried_with_newer_link in [false, true] {
        let message = terminal_message(
            SubscriptionProvider::Claude,
            &endpoint_error,
            Some(&(store.clone() as Arc<dyn CredentialStore>)),
            retried_with_newer_link,
        );
        assert!(message.contains("invalid_grant"), "{message}");
        assert!(
            message.contains("link-assistant-router auth claude"),
            "{message}"
        );
        assert!(!message.contains(SENTINEL), "{message}");
        assert!(!message.contains(RESPONSE_SENTINEL), "{message}");
    }
}

#[tokio::test]
async fn a_rotation_is_rejected_when_no_durable_write_succeeds() {
    let directory = tempfile::tempdir().expect("lock directory");
    let original = token("safe-old-access", "safe-old-refresh", NOW_MS - 1);
    let store = Arc::new(ControlledStore {
        credential: Some(original.clone()),
        lock_path: Some(directory.path().join("credential.lock")),
        persist_error: Some("primary and recovery persistence both failed"),
    });
    let (url, received, server) = scripted_endpoint(
        vec![Answer::new(
            200,
            r#"{"access_token":"unsafe-fresh-access","refresh_token":"unsafe-fresh-refresh","expires_in":3600}"#,
        )],
        |_| {},
    )
    .await;
    let cache = TokenCache::new();
    cache.register_store(
        SubscriptionProvider::Claude,
        "primary",
        store as Arc<dyn CredentialStore>,
    );

    let returned = cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            "primary",
            original.clone(),
            NOW_MS,
        )
        .await;
    drain(server).await;

    assert_eq!(
        returned, original,
        "only the original safe token may escape"
    );
    assert_eq!(received.lock().unwrap().len(), 1, "one exchange was spent");
    assert!(
        cache
            .cached_valid_for(SubscriptionProvider::Claude, "primary", NOW_MS)
            .is_none(),
        "the unsafe fresh token must not enter the cache"
    );
    let reported = cache
        .last_refresh_error(SubscriptionProvider::Claude)
        .expect("storage failure is operator-visible");
    assert!(reported.contains("durably persist"), "{reported}");
    assert!(reported.contains("primary and recovery"), "{reported}");
    assert!(!reported.contains("unsafe-fresh-access"), "{reported}");
    assert!(!reported.contains("unsafe-fresh-refresh"), "{reported}");
}

struct VendorRestartCase {
    provider: SubscriptionProvider,
    filename: &'static str,
    document: &'static str,
    vendor_field: &'static str,
    vendor_value: serde_json::Value,
}

fn vendor_restart_cases() -> Vec<VendorRestartCase> {
    vec![
        VendorRestartCase {
            provider: SubscriptionProvider::Claude,
            filename: ".credentials.json",
            document: r#"{"claudeAiOauth":{"accessToken":"access-1","refreshToken":"refresh-1","expiresAt":1,"subscriptionType":"max","scopes":["user:inference"]}}"#,
            vendor_field: "/claudeAiOauth/subscriptionType",
            vendor_value: serde_json::json!("max"),
        },
        VendorRestartCase {
            provider: SubscriptionProvider::Codex,
            filename: "auth.json",
            document: r#"{"auth_mode":"chatgpt","tokens":{"id_token":"id-1","access_token":"access-1","refresh_token":"refresh-1","account_id":"acct_1"},"last_refresh":"2026-08-11T11:31:03Z"}"#,
            vendor_field: "/tokens/id_token",
            vendor_value: serde_json::json!("id-1"),
        },
        VendorRestartCase {
            provider: SubscriptionProvider::Gemini,
            filename: "oauth_creds.json",
            document: r#"{"access_token":"access-1","refresh_token":"refresh-1","expiry_date":1,"token_type":"Bearer","scope":"cloud-platform"}"#,
            vendor_field: "/scope",
            vendor_value: serde_json::json!("cloud-platform"),
        },
        VendorRestartCase {
            provider: SubscriptionProvider::Qwen,
            filename: "oauth_creds.json",
            document: r#"{"access_token":"access-1","refresh_token":"refresh-1","expiry_date":1,"token_type":"Bearer","resource_url":"portal.qwen.ai","scope":"openid"}"#,
            vendor_field: "/scope",
            vendor_value: serde_json::json!("openid"),
        },
    ]
}

#[tokio::test]
async fn every_provider_uses_the_rotated_link_after_a_restart() {
    for case in vendor_restart_cases() {
        let home = tempfile::tempdir().expect("vendor home");
        let data = tempfile::tempdir().expect("recovery data");
        std::fs::write(home.path().join(case.filename), case.document)
            .expect("seed real vendor credential");
        let (url, received, server) = scripted_endpoint(
            vec![
                Answer::new(
                    200,
                    r#"{"access_token":"access-2","refresh_token":"refresh-2","expires_in":0}"#,
                ),
                Answer::new(
                    200,
                    r#"{"access_token":"access-3","refresh_token":"refresh-3","expires_in":3600}"#,
                ),
            ],
            |_| {},
        )
        .await;
        let reader = SubscriptionReader::new(case.provider, home.path());
        let original = reader.read_token().expect("initial vendor credential");
        let store = Arc::new(RecoverableCredentialStore::new(
            case.provider,
            "restart-matrix-account",
            Arc::new(reader) as Arc<dyn CredentialStore>,
            data.path(),
        ));
        let before_restart = TokenCache::new();
        before_restart.register_store(case.provider, "primary", store as Arc<dyn CredentialStore>);
        let first = before_restart
            .refresh_rejected_at(
                &reqwest::Client::new(),
                &url,
                case.provider,
                "primary",
                original,
                NOW_MS,
            )
            .await
            .expect("the first rejected credential is refreshed");
        assert_eq!(first.refresh_token.as_deref(), Some("refresh-2"));
        drop(before_restart);

        let restarted_reader = SubscriptionReader::new(case.provider, home.path());
        let restarted_store = Arc::new(RecoverableCredentialStore::new(
            case.provider,
            "restart-matrix-account",
            Arc::new(restarted_reader) as Arc<dyn CredentialStore>,
            data.path(),
        ));
        let reloaded = restarted_store.reload().expect("restarted credential");
        assert_eq!(
            reloaded.refresh_token.as_deref(),
            Some("refresh-2"),
            "{} did not persist its first rotation",
            case.provider
        );
        let after_restart = TokenCache::new();
        after_restart.register_store(
            case.provider,
            "primary",
            restarted_store as Arc<dyn CredentialStore>,
        );
        let second = after_restart
            .refresh_rejected_at(
                &reqwest::Client::new(),
                &url,
                case.provider,
                "primary",
                reloaded,
                NOW_MS + 1,
            )
            .await
            .expect("the restarted rejected credential is refreshed");
        assert_eq!(second.access_token, "access-3", "{}", case.provider);
        drain(server).await;

        let spent: Vec<String> = received
            .lock()
            .unwrap()
            .iter()
            .map(|(_, body)| request_refresh_link(body))
            .collect();
        assert_eq!(
            spent,
            vec!["refresh-1", "refresh-2"],
            "{} replayed a consumed refresh link",
            case.provider
        );
        let document: serde_json::Value = serde_json::from_slice(
            &std::fs::read(home.path().join(case.filename)).expect("vendor document"),
        )
        .expect("valid vendor document");
        assert_eq!(
            document.pointer(case.vendor_field),
            Some(&case.vendor_value),
            "{} lost vendor-specific fields",
            case.provider
        );
    }
}
