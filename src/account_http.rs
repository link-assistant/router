//! Per-account upstream HTTP clients and egress proxies (issue #678).
//!
//! Every account of a subscription pool gets its own `reqwest::Client`, so its
//! own connection pool and, for canonical Codex traffic, its own Cloudflare
//! cookie store. Vendor anti-abuse layers and rate limits key on identity: a
//! keep-alive connection or a cookie shared between accounts links them, and
//! carries one account's state into another's requests.
//!
//! Connection lifetime is bounded twice:
//!
//! * idle connections close after `ACCOUNT_POOL_IDLE_TIMEOUT_SECS`
//!   (`reqwest`'s `pool_idle_timeout`);
//! * no connection outlives `ACCOUNT_CONNECTION_MAX_AGE_SECS`. `reqwest` has
//!   no such option, so the account's client is *rotated*: once it is older
//!   than the limit, the next request builds a fresh client, and the old one
//!   is dropped from the registry. A `reqwest::Client` is reference counted,
//!   so requests already in flight keep the old pool alive until they finish;
//!   new requests never reuse its connections. The cookie store survives the
//!   rotation, because it belongs to the account rather than to a client.
//!
//! An account may egress through its own HTTP, HTTPS or SOCKS5 proxy
//! (`ACCOUNT_EGRESS_PROXY`). Credentials never travel on the command line:
//! the proxy URL is either read whole from an environment variable or a file,
//! or given without a password, with the password read from one. A proxy that
//! cannot be resolved fails the request for that account instead of falling
//! back to direct egress, which would expose the router's own address.

use std::collections::{BTreeMap, HashMap};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use reqwest::cookie::CookieStore;

/// Default seconds an idle pooled connection of an account is kept open.
/// Matches the `reqwest` default, so only the isolation changes.
pub const DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS: u64 = 90;

/// Default seconds after which an account's client — and with it every
/// connection it opened — is rotated.
pub const DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS: u64 = 300;

/// Proxy URL schemes `reqwest` can egress through.
const PROXY_SCHEMES: &[&str] = &["http", "https", "socks5", "socks5h"];

/// Where a secret is read from. Never the secret itself.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SecretRef {
    /// An environment variable of the router process.
    Env(String),
    /// A file whose trimmed contents are the secret.
    File(PathBuf),
}

impl SecretRef {
    fn read(&self) -> Result<String, String> {
        let value = match self {
            Self::Env(name) => std::env::var(name)
                .map_err(|_| format!("environment variable {name} is not set"))?,
            Self::File(path) => std::fs::read_to_string(path)
                .map_err(|error| format!("cannot read {}: {error}", path.display()))?,
        };
        let value = value.trim().to_string();
        if value.is_empty() {
            return Err(format!("{self} is empty"));
        }
        Ok(value)
    }
}

impl std::fmt::Display for SecretRef {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Env(name) => write!(f, "env:{name}"),
            Self::File(path) => write!(f, "file:{}", path.display()),
        }
    }
}

/// One account's egress proxy.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum EgressProxy {
    /// The whole proxy URL, credentials included, read from a secret.
    UrlFrom(SecretRef),
    /// A proxy URL without a password, plus an optional password secret.
    Url {
        url: String,
        password: Option<SecretRef>,
    },
}

impl EgressProxy {
    /// Parse one `ACCOUNT_EGRESS_PROXY` value: `env:VAR`, `file:PATH`, or a
    /// password-less URL optionally followed by `;password-env=VAR` or
    /// `;password-file=PATH`.
    ///
    /// # Errors
    /// An operator-facing message; it never echoes a password.
    pub fn parse(spec: &str) -> Result<Self, String> {
        let spec = spec.trim();
        if let Some(name) = spec.strip_prefix("env:") {
            return Ok(Self::UrlFrom(SecretRef::Env(non_empty(name, "env:")?)));
        }
        if let Some(path) = spec.strip_prefix("file:") {
            return Ok(Self::UrlFrom(SecretRef::File(PathBuf::from(non_empty(
                path, "file:",
            )?))));
        }
        let mut parts = spec.split(';');
        let url = parts.next().unwrap_or_default().trim();
        let parsed = parse_proxy_url(url)?;
        if parsed.password().is_some() {
            return Err(
                "a proxy URL must not carry its password; use env:VAR, file:PATH, or \
                 ;password-env=VAR / ;password-file=PATH"
                    .to_string(),
            );
        }
        let mut password = None;
        for option in parts {
            let (key, value) = option
                .split_once('=')
                .ok_or_else(|| format!("expected key=value after ';', got '{option}'"))?;
            let reference = match key.trim() {
                "password-env" => SecretRef::Env(non_empty(value, "password-env")?),
                "password-file" => {
                    SecretRef::File(PathBuf::from(non_empty(value, "password-file")?))
                }
                other => return Err(format!("unknown proxy option '{other}'")),
            };
            if password.replace(reference).is_some() {
                return Err("only one proxy password reference is allowed".to_string());
            }
        }
        if password.is_some() && parsed.username().is_empty() {
            return Err("a proxy password needs a user name in the URL".to_string());
        }
        Ok(Self::Url {
            url: url.to_string(),
            password,
        })
    }

    /// Read the referenced secrets and build the `reqwest` proxy.
    ///
    /// # Errors
    /// Why the proxy could not be resolved; secrets are never included.
    pub fn resolve(&self) -> Result<reqwest::Proxy, String> {
        let url = match self {
            Self::UrlFrom(reference) => {
                let raw = reference.read()?;
                parse_proxy_url(&raw).map_err(|error| format!("{reference}: {error}"))?
            }
            Self::Url { url, password } => {
                let mut parsed = parse_proxy_url(url)?;
                if let Some(reference) = password {
                    let secret = reference.read()?;
                    parsed
                        .set_password(Some(&secret))
                        .map_err(|()| "the proxy URL cannot carry credentials".to_string())?;
                }
                parsed
            }
        };
        reqwest::Proxy::all(url).map_err(|error| format!("invalid proxy: {error}"))
    }

    /// The proxy endpoint without any credentials, for diagnostics.
    #[must_use]
    pub fn describe(&self) -> String {
        match self {
            Self::UrlFrom(reference) => reference.to_string(),
            Self::Url { url, password } => {
                let shown = reqwest::Url::parse(url).map_or_else(
                    |_| "<invalid>".to_string(),
                    |url| {
                        format!(
                            "{}://{}:{}",
                            url.scheme(),
                            url.host_str().unwrap_or_default(),
                            url.port_or_known_default().unwrap_or_default()
                        )
                    },
                );
                password
                    .as_ref()
                    .map_or_else(|| shown.clone(), |secret| format!("{shown} ({secret})"))
            }
        }
    }
}

fn non_empty(value: &str, what: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        Err(format!("{what} needs a value"))
    } else {
        Ok(value.to_string())
    }
}

fn parse_proxy_url(raw: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(raw.trim()).map_err(|_| "invalid proxy URL".to_string())?;
    if !PROXY_SCHEMES.contains(&url.scheme()) {
        return Err(format!(
            "unsupported proxy scheme '{}'; expected one of {}",
            url.scheme(),
            PROXY_SCHEMES.join(", ")
        ));
    }
    if url.host_str().is_none_or(str::is_empty) {
        return Err("the proxy URL needs a host".to_string());
    }
    Ok(url)
}

/// Parse `ACCOUNT_EGRESS_PROXY`: comma-separated `ACCOUNT=SPEC` entries, where
/// `ACCOUNT` is a pool account name (`primary`, `account-1`, …) and `SPEC` is
/// accepted by [`EgressProxy::parse`].
///
/// # Errors
/// An operator-facing message naming the offending entry.
pub fn parse_egress_proxies(raw: &str) -> Result<BTreeMap<String, EgressProxy>, String> {
    let mut proxies = BTreeMap::new();
    for entry in raw
        .split(',')
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
    {
        let (account, spec) = entry
            .split_once('=')
            .ok_or_else(|| "expected ACCOUNT=SPEC entries".to_string())?;
        let account = account.trim();
        if account.is_empty() {
            return Err("an egress proxy entry has no account name".to_string());
        }
        let proxy = EgressProxy::parse(spec).map_err(|error| format!("{account}: {error}"))?;
        if proxies.insert(account.to_string(), proxy).is_some() {
            return Err(format!("{account}: more than one egress proxy"));
        }
    }
    Ok(proxies)
}

/// Connection and egress settings of the per-account clients.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AccountHttpPolicy {
    /// Idle connections close after this long; `None` keeps them open.
    pub pool_idle_timeout: Option<Duration>,
    /// An account's client is rotated once older than this; `None` never.
    pub max_connection_age: Option<Duration>,
    /// Egress proxies by account name. An account without one connects
    /// directly, as before.
    pub proxies: BTreeMap<String, EgressProxy>,
}

impl Default for AccountHttpPolicy {
    fn default() -> Self {
        Self {
            pool_idle_timeout: Some(Duration::from_secs(DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS)),
            max_connection_age: Some(Duration::from_secs(DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS)),
            proxies: BTreeMap::new(),
        }
    }
}

impl AccountHttpPolicy {
    /// Build from raw settings; `0` disables a bound.
    #[must_use]
    pub fn new(
        pool_idle_timeout_secs: u64,
        max_connection_age_secs: u64,
        proxies: BTreeMap<String, EgressProxy>,
    ) -> Self {
        let bound = |secs: u64| (secs > 0).then(|| Duration::from_secs(secs));
        Self {
            pool_idle_timeout: bound(pool_idle_timeout_secs),
            max_connection_age: bound(max_connection_age_secs),
            proxies,
        }
    }

    /// One `doctor` line; proxies are shown without credentials.
    #[must_use]
    pub fn doctor_line(&self) -> String {
        let secs = |bound: Option<Duration>| {
            bound.map_or_else(|| "off".to_string(), |d| format!("{}s", d.as_secs()))
        };
        let proxies = if self.proxies.is_empty() {
            "none".to_string()
        } else {
            self.proxies
                .iter()
                .map(|(account, proxy)| format!("{account} via {}", proxy.describe()))
                .collect::<Vec<_>>()
                .join(", ")
        };
        format!(
            "account connections     : isolated (idle {}, max age {}); egress proxies: {proxies}\n",
            secs(self.pool_idle_timeout),
            secs(self.max_connection_age),
        )
    }
}

/// Which cookie store an account's client carries.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum CookieMode {
    /// No cookies at all — every path except canonical Codex.
    None,
    /// The account's own Cloudflare infrastructure cookie store, for
    /// canonical Codex `ChatGPT` traffic.
    CodexCloudflare,
}

/// A cookie store shared by every client one account rotates through.
#[derive(Clone)]
struct AccountCookies(Arc<dyn CookieStore>);

impl CookieStore for AccountCookies {
    fn set_cookies(
        &self,
        cookie_headers: &mut dyn Iterator<Item = &reqwest::header::HeaderValue>,
        url: &reqwest::Url,
    ) {
        self.0.set_cookies(cookie_headers, url);
    }

    fn cookies(&self, url: &reqwest::Url) -> Option<reqwest::header::HeaderValue> {
        self.0.cookies(url)
    }
}

struct Slot {
    client: reqwest::Client,
    built: Instant,
    cookies: Option<AccountCookies>,
}

type CookieFactory = fn() -> Arc<dyn CookieStore>;

/// The per-account clients of one pool. Cheap to share behind the router.
pub struct AccountClients {
    policy: AccountHttpPolicy,
    slots: Mutex<HashMap<(String, CookieMode), Slot>>,
    cookie_factory: CookieFactory,
}

impl std::fmt::Debug for AccountClients {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AccountClients")
            .field("policy", &self.policy)
            .finish_non_exhaustive()
    }
}

impl AccountClients {
    #[must_use]
    pub fn new(policy: AccountHttpPolicy) -> Self {
        Self {
            policy,
            slots: Mutex::new(HashMap::new()),
            cookie_factory: crate::codex_cloudflare_cookies::isolated_store,
        }
    }

    /// Replace the store built for [`CookieMode::CodexCloudflare`].
    ///
    /// The production store only accepts Cloudflare cookies for `https`
    /// `ChatGPT` hosts, which a loopback test stub cannot be; tests use this to
    /// observe the isolation with a store that accepts any cookie.
    #[doc(hidden)]
    #[must_use]
    pub fn with_cookie_store_factory(mut self, factory: CookieFactory) -> Self {
        self.cookie_factory = factory;
        self
    }

    /// The settings these clients are built with.
    #[must_use]
    pub const fn policy(&self) -> &AccountHttpPolicy {
        &self.policy
    }

    /// The client `account` sends with, built on first use and rotated once
    /// older than the maximum connection age.
    ///
    /// # Errors
    /// The account's egress proxy cannot be resolved, or the client cannot be
    /// built. The request must then fail rather than egress directly.
    pub fn client(&self, account: &str, cookies: CookieMode) -> Result<reqwest::Client, String> {
        let mut slots = self
            .slots
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let key = (account.to_string(), cookies);
        let previous = match slots.get(&key) {
            Some(slot)
                if self
                    .policy
                    .max_connection_age
                    .is_none_or(|age| slot.built.elapsed() < age) =>
            {
                return Ok(slot.client.clone());
            }
            Some(slot) => {
                tracing::debug!(account, "rotating the account's upstream client");
                slot.cookies.clone()
            }
            None => None,
        };
        let store = match cookies {
            CookieMode::None => None,
            CookieMode::CodexCloudflare => {
                Some(previous.unwrap_or_else(|| AccountCookies((self.cookie_factory)())))
            }
        };
        let client = self.build(account, store.clone())?;
        slots.insert(
            key,
            Slot {
                client: client.clone(),
                built: Instant::now(),
                cookies: store,
            },
        );
        drop(slots);
        Ok(client)
    }

    fn build(
        &self,
        account: &str,
        cookies: Option<AccountCookies>,
    ) -> Result<reqwest::Client, String> {
        let mut builder = crate::upstream_client::upstream_client_builder()
            .pool_idle_timeout(self.policy.pool_idle_timeout);
        if let Some(proxy) = self.policy.proxies.get(account) {
            let proxy = proxy
                .resolve()
                .map_err(|error| format!("egress proxy of account {account}: {error}"))?;
            builder = builder.proxy(proxy);
        }
        if let Some(cookies) = cookies {
            builder = builder.cookie_provider(Arc::new(cookies));
        }
        builder
            .build()
            .map_err(|error| format!("cannot build the client of account {account}: {error}"))
    }
}

/// The client a request sends with: the pooled account's own client when a
/// pool serves it, otherwise `default` unchanged.
///
/// # Errors
/// The pooled account's egress proxy cannot be resolved.
pub fn pooled_client(
    router: Option<&crate::accounts::AccountRouter>,
    account: Option<&str>,
    default: &reqwest::Client,
    cookies: CookieMode,
) -> Result<reqwest::Client, String> {
    match (router, account) {
        (Some(router), Some(account)) => router.http_client(account, cookies),
        _ => Ok(default.clone()),
    }
}

#[cfg(test)]
#[path = "account_http_tests.rs"]
mod tests;
