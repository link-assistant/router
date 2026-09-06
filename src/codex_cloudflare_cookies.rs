//! Narrow process-wide Cloudflare cookie continuity for official Codex traffic.
//!
//! Policy is tied to Codex 0.153.4. The store must never be broadened to hold
//! account, session, authentication, CSRF, preference, or caller cookies.

use std::sync::{Arc, LazyLock, Mutex};

use reqwest::cookie::CookieStore as ReqwestCookieStore;
use reqwest::header::HeaderValue;
use reqwest::{ClientBuilder, Url};

#[cfg(test)]
const SUPPORTED_CODEX_VERSION: &str = "0.153.4";
const MAX_COOKIE_BYTES: usize = 4_096;
const MAX_COOKIE_COUNT: usize = 64;
const MAX_COOKIE_HEADER_BYTES: usize = 16_384;
const EXACT_HOSTS: &[&str] = &["chatgpt.com", "chat.openai.com", "chatgpt-staging.com"];
const SUBDOMAIN_SUFFIXES: &[&str] = &[".chatgpt.com", ".chatgpt-staging.com"];
const EXACT_COOKIE_NAMES: &[&str] = &[
    "__cf_bm",
    "__cflb",
    "__cfruid",
    "__cfseq",
    "__cfwaitingroom",
    "_cfuvid",
    "cf_clearance",
    "cf_ob_info",
    "cf_use_ob",
];

static SHARED_STORE: LazyLock<Arc<CodexCloudflareCookieStore>> =
    LazyLock::new(|| Arc::new(CodexCloudflareCookieStore::default()));

#[derive(Default)]
struct CodexCloudflareCookieStore {
    inner: Mutex<cookie_store::CookieStore>,
}

pub fn with_cookie_store(builder: ClientBuilder) -> ClientBuilder {
    builder.cookie_provider(Arc::clone(&SHARED_STORE))
}

pub fn cookie_header(url: &Url) -> Option<HeaderValue> {
    SHARED_STORE.cookies(url)
}

pub fn store_response_headers<'a>(headers: impl Iterator<Item = &'a HeaderValue>, url: &Url) {
    SHARED_STORE.set_cookies(&mut headers.into_iter(), url);
}

pub fn websocket_url_to_https(value: &str) -> Option<Url> {
    let mut url = Url::parse(value).ok()?;
    (url.scheme() == "wss").then_some(())?;
    url.set_scheme("https").ok()?;
    Some(url)
}

fn is_cookie_url(url: &Url) -> bool {
    url.scheme() == "https" && url.host_str().is_some_and(is_allowed_chatgpt_host)
}

fn is_allowed_chatgpt_host(host: &str) -> bool {
    EXACT_HOSTS.contains(&host)
        || SUBDOMAIN_SUFFIXES
            .iter()
            .any(|suffix| host.ends_with(suffix))
}

fn is_allowed_cookie_name(name: &str) -> bool {
    EXACT_COOKIE_NAMES.contains(&name) || name.starts_with("cf_chl_")
}

impl ReqwestCookieStore for CodexCloudflareCookieStore {
    fn set_cookies(&self, cookie_headers: &mut dyn Iterator<Item = &HeaderValue>, url: &Url) {
        if !is_cookie_url(url) {
            return;
        }
        let mut store = self
            .inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        for header in cookie_headers {
            if header.as_bytes().len() > MAX_COOKIE_BYTES {
                continue;
            }
            let Ok(raw) = header.to_str() else {
                continue;
            };
            let Ok(cookie) = cookie_store::Cookie::parse(raw.to_owned(), url) else {
                continue;
            };
            if !is_allowed_cookie_name(cookie.name()) {
                continue;
            }
            let domain = String::from(&cookie.domain);
            let path = String::from(&cookie.path);
            let already_present = store.contains_any(&domain, &path, cookie.name());
            if !cookie.is_expired()
                && !already_present
                && store.iter_unexpired().count() >= MAX_COOKIE_COUNT
            {
                continue;
            }
            let _ = store.insert(cookie.into_owned(), url);
        }
    }

    fn cookies(&self, url: &Url) -> Option<HeaderValue> {
        if !is_cookie_url(url) {
            return None;
        }
        let store = self
            .inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let mut rendered = String::new();
        for (name, value) in store
            .get_request_values(url)
            .filter(|(name, _)| is_allowed_cookie_name(name))
        {
            let extra = name.len() + 1 + value.len() + usize::from(!rendered.is_empty()) * 2;
            if rendered.len().saturating_add(extra) > MAX_COOKIE_HEADER_BYTES {
                return None;
            }
            if !rendered.is_empty() {
                rendered.push_str("; ");
            }
            rendered.push_str(name);
            rendered.push('=');
            rendered.push_str(value);
        }
        drop(store);
        if rendered.is_empty() {
            return None;
        }
        let mut header = HeaderValue::from_str(&rendered).ok()?;
        header.set_sensitive(true);
        Some(header)
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::thread;

    use super::*;

    fn url(value: &str) -> Url {
        Url::parse(value).expect("valid test URL")
    }

    fn set(store: &CodexCloudflareCookieStore, url: &Url, values: &[&str]) {
        let values = values
            .iter()
            .map(|value| HeaderValue::from_str(value).expect("valid test header"))
            .collect::<Vec<_>>();
        store.set_cookies(&mut values.iter(), url);
    }

    fn get(store: &CodexCloudflareCookieStore, url: &Url) -> String {
        store
            .cookies(url)
            .and_then(|value| value.to_str().ok().map(str::to_owned))
            .unwrap_or_default()
    }

    #[test]
    fn policy_is_pinned_to_the_supported_codex_fixture() {
        assert_eq!(
            SUPPORTED_CODEX_VERSION,
            crate::codex_identity::DEFAULT_CLIENT_VERSION
        );
        let fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../tests/fixtures/clients/oauth-refresh-contracts.json"
        ))
        .unwrap();
        assert_eq!(
            fixture["codex"]["cloudflare_cookies"]["exact_hosts"],
            serde_json::json!(EXACT_HOSTS)
        );
        assert_eq!(
            fixture["codex"]["cloudflare_cookies"]["subdomain_suffixes"],
            serde_json::json!(SUBDOMAIN_SUFFIXES)
        );
        assert_eq!(
            fixture["codex"]["cloudflare_cookies"]["exact_names"],
            serde_json::json!(EXACT_COOKIE_NAMES)
        );
        for name in EXACT_COOKIE_NAMES.iter().copied().chain(["cf_chl_rc_i"]) {
            assert!(is_allowed_cookie_name(name), "{name}");
        }
        for name in [
            "__Secure-next-auth.session-token",
            "chatgpt_session",
            "oai-auth-token",
            "csrf",
            "preference",
            "not_cf_clearance",
        ] {
            assert!(!is_allowed_cookie_name(name), "{name}");
        }
    }

    #[test]
    fn host_policy_rejects_http_unrelated_and_suffix_tricks() {
        for accepted in [
            "https://chatgpt.com/a",
            "https://foo.chatgpt.com/a",
            "https://chat.openai.com/a",
            "https://chatgpt-staging.com/a",
            "https://api.chatgpt-staging.com/a",
        ] {
            assert!(is_cookie_url(&url(accepted)), "{accepted}");
        }
        for rejected in [
            "http://chatgpt.com/a",
            "https://evilchatgpt.com/a",
            "https://chatgpt.com.example/a",
            "https://api.openai.com/a",
            "https://auth.openai.com/a",
            "https://foo.chat.openai.com/a",
        ] {
            assert!(!is_cookie_url(&url(rejected)), "{rejected}");
        }
    }

    #[test]
    fn retains_only_allowed_infrastructure_cookies() {
        let store = CodexCloudflareCookieStore::default();
        let source = url("https://chatgpt.com/backend-api/codex/responses");
        set(
            &store,
            &source,
            &[
                "__cf_bm=bot; Path=/; Secure; HttpOnly",
                "_cfuvid=visitor; Path=/; Secure",
                "cf_clearance=clear; Path=/; Secure",
                "chatgpt_session=account-secret; Path=/; Secure",
                "unknown=value; Path=/; Secure",
            ],
        );
        let header = get(&store, &source);
        assert!(header.contains("__cf_bm=bot"));
        assert!(header.contains("_cfuvid=visitor"));
        assert!(header.contains("cf_clearance=clear"));
        assert!(!header.contains("account-secret"));
        assert!(!header.contains("unknown"));
        assert!(
            store
                .cookies(&source)
                .is_some_and(|value| value.is_sensitive())
        );
    }

    #[test]
    fn applies_domain_path_secure_replacement_and_deletion_semantics() {
        let store = CodexCloudflareCookieStore::default();
        let scoped = url("https://a.chatgpt.com/backend-api/codex/responses");
        set(
            &store,
            &scoped,
            &[
                "__cflb=old; Domain=.chatgpt.com; Path=/backend-api; Secure",
                "cf_chl_path=narrow; Path=/backend-api/codex; Secure",
                "_cfuvid=host; Path=/; Secure",
            ],
        );
        let applicable = get(&store, &url("https://b.chatgpt.com/backend-api/codex/next"));
        assert!(applicable.contains("__cflb=old"));
        assert!(!applicable.contains("_cfuvid=host"));
        assert!(!get(&store, &url("https://a.chatgpt.com/other")).contains("cf_chl_path"));
        assert!(get(&store, &url("http://a.chatgpt.com/backend-api/codex")).is_empty());

        set(
            &store,
            &scoped,
            &["__cflb=new; Domain=.chatgpt.com; Path=/backend-api; Secure"],
        );
        assert!(!get(&store, &scoped).contains("__cflb=old"));
        assert!(get(&store, &scoped).contains("__cflb=new"));
        set(
            &store,
            &scoped,
            &["__cflb=; Domain=.chatgpt.com; Path=/backend-api; Max-Age=0; Secure"],
        );
        assert!(!get(&store, &scoped).contains("__cflb="));
    }

    #[test]
    fn duplicate_names_remain_path_scoped_and_malformed_values_are_ignored() {
        let store = CodexCloudflareCookieStore::default();
        let source = url("https://chatgpt.com/backend-api/codex/responses");
        set(
            &store,
            &source,
            &[
                "cf_chl_dup=wide; Path=/; Secure",
                "cf_chl_dup=narrow; Path=/backend-api; Secure",
                "not a cookie",
                "=missing-name; Path=/; Secure",
            ],
        );
        let header = get(&store, &source);
        assert!(header.contains("cf_chl_dup=wide"));
        assert!(header.contains("cf_chl_dup=narrow"));
        assert_eq!(
            get(&store, &url("https://chatgpt.com/else")),
            "cf_chl_dup=wide"
        );

        let expired = CodexCloudflareCookieStore::default();
        set(
            &expired,
            &source,
            &["cf_chl_expired=gone; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure"],
        );
        assert!(get(&expired, &source).is_empty());
    }

    #[test]
    fn count_and_individual_cookie_size_are_bounded() {
        let store = CodexCloudflareCookieStore::default();
        let source = url("https://chatgpt.com/");
        let headers = (0..=MAX_COOKIE_COUNT)
            .map(|index| format!("cf_chl_{index}=value; Path=/; Secure"))
            .collect::<Vec<_>>();
        let refs = headers.iter().map(String::as_str).collect::<Vec<_>>();
        set(&store, &source, &refs);
        assert_eq!(
            get(&store, &source).matches("cf_chl_").count(),
            MAX_COOKIE_COUNT
        );

        let oversized = format!(
            "cf_chl_oversized={}; Path=/; Secure",
            "x".repeat(MAX_COOKIE_BYTES)
        );
        set(&store, &source, &[&oversized]);
        assert!(!get(&store, &source).contains("cf_chl_oversized"));
    }

    #[test]
    fn concurrent_responses_cannot_admit_disallowed_cookie_state() {
        let store = Arc::new(CodexCloudflareCookieStore::default());
        let source = url("https://chatgpt.com/backend-api/codex/responses");
        let mut workers = Vec::new();
        for index in 0..16 {
            let store = Arc::clone(&store);
            let source = source.clone();
            workers.push(thread::spawn(move || {
                let allowed = format!("cf_chl_concurrent_{index}=ok; Path=/; Secure");
                let forbidden = format!("session_{index}=secret; Path=/; Secure");
                set(&store, &source, &[&allowed, &forbidden]);
            }));
        }
        for worker in workers {
            worker.join().expect("worker completes");
        }
        let header = get(&store, &source);
        assert_eq!(header.matches("cf_chl_concurrent_").count(), 16);
        assert!(!header.contains("session_"));
        assert!(!header.contains("secret"));
    }

    #[test]
    fn no_cookie_escapes_to_other_provider_or_custom_hosts() {
        let store = CodexCloudflareCookieStore::default();
        let source = url("https://chatgpt.com/backend-api/codex/responses");
        set(&store, &source, &["cf_clearance=secret; Path=/; Secure"]);
        for target in [
            "https://api.openai.com/v1/responses",
            "https://api.anthropic.com/v1/messages",
            "https://generativelanguage.googleapis.com/v1beta/models",
            "https://portal.qwen.ai/v1/chat/completions",
            "https://api.z.ai/v1/chat/completions",
            "https://models.github.ai/inference/chat/completions",
            "https://provider.example/v1/chat/completions",
        ] {
            assert!(store.cookies(&url(target)).is_none(), "{target}");
        }
    }
}
