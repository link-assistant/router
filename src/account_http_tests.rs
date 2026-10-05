use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use reqwest::cookie::CookieStore;

use super::*;

#[test]
fn parses_secret_reference_specs() {
    assert_eq!(
        EgressProxy::parse("env:PROXY_A").unwrap(),
        EgressProxy::UrlFrom(SecretRef::Env("PROXY_A".into()))
    );
    assert_eq!(
        EgressProxy::parse(" file:/run/secrets/proxy ").unwrap(),
        EgressProxy::UrlFrom(SecretRef::File(PathBuf::from("/run/secrets/proxy")))
    );
    assert!(EgressProxy::parse("env:").is_err());
    assert!(EgressProxy::parse("file: ").is_err());
}

#[test]
fn parses_password_less_urls_with_password_references() {
    assert_eq!(
        EgressProxy::parse("socks5h://user@127.0.0.1:1080;password-env=PROXY_PW").unwrap(),
        EgressProxy::Url {
            url: "socks5h://user@127.0.0.1:1080".into(),
            password: Some(SecretRef::Env("PROXY_PW".into())),
        }
    );
    assert_eq!(
        EgressProxy::parse("http://proxy.internal:3128").unwrap(),
        EgressProxy::Url {
            url: "http://proxy.internal:3128".into(),
            password: None,
        }
    );
    assert!(
        EgressProxy::parse("http://u@proxy:3128;password-file=/run/pw")
            .unwrap()
            .describe()
            .contains("file:/run/pw")
    );
}

#[test]
fn rejects_inline_passwords_and_malformed_specs() {
    let inline = EgressProxy::parse("http://user:hunter2@proxy:3128").unwrap_err();
    assert!(!inline.contains("hunter2"), "{inline}");
    assert!(EgressProxy::parse("ftp://proxy:21").is_err());
    assert!(EgressProxy::parse("not a url").is_err());
    assert!(EgressProxy::parse("http://proxy:3128;colour=blue").is_err());
    assert!(EgressProxy::parse("http://proxy:3128;password-env=PW").is_err());
    assert!(EgressProxy::parse("http://u@proxy:3128;password-env=A;password-env=B").is_err());
    assert!(EgressProxy::parse("http://u@proxy:3128;password-env").is_err());
}

#[test]
fn parses_the_per_account_list() {
    let proxies =
        parse_egress_proxies("primary=http://proxy:3128, account-1=env:ACCOUNT_1_PROXY").unwrap();
    assert_eq!(proxies.len(), 2);
    assert!(proxies.contains_key("primary"));
    assert!(proxies.contains_key("account-1"));
    assert!(parse_egress_proxies("").unwrap().is_empty());
    assert!(parse_egress_proxies("primary").is_err());
    assert!(parse_egress_proxies("=http://proxy:3128").is_err());
    assert!(parse_egress_proxies("primary=env:A,primary=env:B").is_err());
}

#[test]
fn default_policy_bounds_idle_and_age_without_proxies() {
    let policy = AccountHttpPolicy::default();
    assert_eq!(
        policy.pool_idle_timeout,
        Some(Duration::from_secs(DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS))
    );
    assert_eq!(
        policy.max_connection_age,
        Some(Duration::from_secs(DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS))
    );
    assert!(policy.proxies.is_empty());
    let disabled = AccountHttpPolicy::new(0, 0, BTreeMap::new());
    assert_eq!(disabled.pool_idle_timeout, None);
    assert_eq!(disabled.max_connection_age, None);
    assert!(disabled.doctor_line().contains("idle off, max age off"));
}

#[test]
fn doctor_line_never_shows_credentials() {
    let proxies =
        parse_egress_proxies("primary=http://alice@proxy:3128;password-env=PROXY_PW").unwrap();
    let line = AccountHttpPolicy::new(90, 300, proxies).doctor_line();
    assert!(
        line.contains("primary via http://proxy:3128 (env:PROXY_PW)"),
        "{line}"
    );
    assert!(!line.contains("alice"), "{line}");
}

#[test]
fn resolves_a_password_from_a_file() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("pw");
    std::fs::write(&path, "s3cret\n").unwrap();
    let proxy = EgressProxy::Url {
        url: "http://alice@127.0.0.1:3128".into(),
        password: Some(SecretRef::File(path)),
    };
    assert!(proxy.resolve().is_ok());
}

#[test]
fn an_unresolvable_proxy_fails_closed() {
    let missing = EgressProxy::UrlFrom(SecretRef::File(PathBuf::from(
        "/nonexistent/link-assistant-router/proxy",
    )));
    let clients = AccountClients::new(AccountHttpPolicy {
        proxies: BTreeMap::from([("account-1".to_string(), missing)]),
        ..AccountHttpPolicy::default()
    });
    let error = clients.client("account-1", CookieMode::None).unwrap_err();
    assert!(
        error.contains("egress proxy of account account-1"),
        "{error}"
    );
    // Accounts without a proxy are unaffected.
    assert!(clients.client("primary", CookieMode::None).is_ok());
}

#[test]
fn unpooled_requests_keep_the_shared_client() {
    let shared = reqwest::Client::new();
    assert!(pooled_client(None, Some("primary"), &shared, CookieMode::None).is_ok());
    assert!(pooled_client(None, None, &shared, CookieMode::CodexCloudflare).is_ok());
}

fn chatgpt() -> reqwest::Url {
    reqwest::Url::parse("https://chatgpt.com/backend-api/codex/responses").unwrap()
}

#[test]
fn production_cookie_stores_are_per_account() {
    let first = crate::codex_cloudflare_cookies::isolated_store();
    let second = crate::codex_cloudflare_cookies::isolated_store();
    let header = reqwest::header::HeaderValue::from_static("__cf_bm=abc; Path=/; Secure");
    first.set_cookies(&mut std::iter::once(&header), &chatgpt());
    assert!(first.cookies(&chatgpt()).is_some());
    assert!(second.cookies(&chatgpt()).is_none());
}

fn jar() -> Arc<dyn CookieStore> {
    Arc::new(reqwest::cookie::Jar::default())
}

#[test]
fn rotation_keeps_the_account_cookie_store() {
    let clients = AccountClients::new(AccountHttpPolicy {
        max_connection_age: Some(Duration::from_millis(1)),
        ..AccountHttpPolicy::default()
    })
    .with_cookie_store_factory(jar);
    clients
        .client("primary", CookieMode::CodexCloudflare)
        .unwrap();
    let store = |clients: &AccountClients| {
        let slots = clients.slots.lock().unwrap();
        let slot = &slots[&("primary".to_string(), CookieMode::CodexCloudflare)];
        let found = (
            Arc::as_ptr(&slot.cookies.as_ref().unwrap().0).cast::<()>(),
            slot.built,
        );
        drop(slots);
        found
    };
    let (before, built_before) = store(&clients);
    std::thread::sleep(Duration::from_millis(5));
    clients
        .client("primary", CookieMode::CodexCloudflare)
        .unwrap();
    let (after, built_after) = store(&clients);
    assert!(built_after > built_before, "the client was rotated");
    assert_eq!(before, after, "the cookie store survived the rotation");
}

#[test]
fn clients_are_reused_until_their_maximum_age() {
    let clients = AccountClients::new(AccountHttpPolicy::default());
    clients.client("primary", CookieMode::None).unwrap();
    let built = |clients: &AccountClients| {
        clients.slots.lock().unwrap()[&("primary".to_string(), CookieMode::None)].built
    };
    let first = built(&clients);
    clients.client("primary", CookieMode::None).unwrap();
    assert_eq!(first, built(&clients));
    clients.client("account-1", CookieMode::None).unwrap();
    assert_eq!(clients.slots.lock().unwrap().len(), 2);
}
