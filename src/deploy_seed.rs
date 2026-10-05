//! `router deploy --server … --seed-credential <provider>` (issue #681).
//!
//! Gives a fresh remote deployment the subscription login this machine holds,
//! without forking its OAuth refresh chain. A refresh token is single-use for
//! both vendors: two parties refreshing the same chain each invalidate the
//! other. So the chain is *moved*, never copied:
//!
//! 1. The local source is marked handed over (`refresh_owner: external`, which
//!    this machine's Router already honours by never spending the refresh
//!    token) *before* anything is sent, in state `pending`.
//! 2. The document travels over SSH stdin inside the settings payload — never
//!    in argv — and the target installs it only when it holds no login of its
//!    own (`auth import --if-absent` semantics), recording a receipt keyed by
//!    the chain's fingerprint.
//! 3. The target's answer settles the local mark: `imported` or
//!    `already-seeded` makes it `handed-over`; `kept-existing` (the target had
//!    its own login) restores the source untouched.
//!
//! A response lost in transit leaves the mark `pending`, which is safe — the
//! source is not refreshed here — and re-running the same command finds the
//! receipt on the target and settles it. The fingerprint identifies the
//! refresh chain (keyed by `TOKEN_SECRET`), so a re-run is a no-op and seeding
//! the same chain to a *second* server is refused: that is exactly a fork.

use std::fmt;
use std::path::{Path, PathBuf};

use serde_json::{Value, json};

use crate::subscription::{SubscriptionProvider, SubscriptionReader};

const METADATA_KEY: &str = "_link_assistant_router";
const HANDOVER_KEY: &str = "handed_over";

/// A provider whose login can be seeded into a remote deployment.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SeedProvider {
    /// Anthropic Claude (Claude Code login, `~/.claude`).
    Claude,
    /// `OpenAI` Codex (`ChatGPT` login, `~/.codex`).
    Codex,
}

impl SeedProvider {
    /// Parse `claude`/`anthropic` or `codex`/`chatgpt`.
    ///
    /// # Errors
    ///
    /// Names the accepted spellings for anything else.
    pub fn parse(value: &str) -> Result<Self, String> {
        match value.trim().to_ascii_lowercase().as_str() {
            "claude" | "anthropic" => Ok(Self::Claude),
            "codex" | "chatgpt" | "openai" => Ok(Self::Codex),
            other => Err(format!(
                "--seed-credential {other}: expected claude (anthropic) or codex (chatgpt)"
            )),
        }
    }

    /// Stable spelling for the payload, the receipt and `--json`.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Claude => "claude",
            Self::Codex => "codex",
        }
    }

    /// The subscription this login authorizes.
    #[must_use]
    pub const fn subscription(self) -> SubscriptionProvider {
        match self {
            Self::Claude => SubscriptionProvider::Claude,
            Self::Codex => SubscriptionProvider::Codex,
        }
    }
}

/// Parse and de-duplicate `--seed-credential` values, keeping their order.
///
/// # Errors
///
/// Reports the first unknown provider.
pub fn parse_providers(names: &[String]) -> Result<Vec<SeedProvider>, String> {
    let mut providers = Vec::new();
    for name in names {
        let provider = SeedProvider::parse(name)?;
        if !providers.contains(&provider) {
            providers.push(provider);
        }
    }
    Ok(providers)
}

/// One local login, read and ready to hand over.
pub struct Seed {
    /// Which login.
    pub provider: SeedProvider,
    /// The vendor document to install, without Router's local metadata.
    pub document: String,
    /// Keyed fingerprint of the refresh chain; the target's receipt id.
    pub fingerprint: String,
    /// The local vendor file that is marked handed over.
    pub path: PathBuf,
    /// The file's bytes before this run marked it, restored on `kept-existing`.
    original: String,
}

impl fmt::Debug for Seed {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("Seed")
            .field("provider", &self.provider)
            .field("fingerprint", &self.fingerprint)
            .field("path", &self.path)
            .finish_non_exhaustive()
    }
}

/// The handover recorded in a document, if any: `(server, fingerprint, state)`.
fn handover_of(value: &Value) -> Option<(String, String, String)> {
    let record = value.pointer(&format!("/{METADATA_KEY}/{HANDOVER_KEY}"))?;
    let field = |name: &str| {
        record
            .get(name)
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string()
    };
    Some((field("server"), field("fingerprint"), field("state")))
}

/// The keyed fingerprint of `provider`'s refresh chain.
///
/// Keyed by the refresh token when the document has one (it *is* the chain),
/// otherwise by the access token.
#[must_use]
pub fn fingerprint(token_secret: &str, provider: SeedProvider, chain: &str) -> String {
    crate::deploy_config::value_fingerprint(
        token_secret,
        &format!("seed-credential\0{}\0{chain}", provider.as_str()),
    )
}

/// Read `provider`'s login from its conventional home under `user_home`.
///
/// # Errors
///
/// No login, a login held only in the platform keychain (it cannot be marked
/// handed over), an unreadable document, or a chain already handed over to a
/// different server.
pub fn prepare(
    provider: SeedProvider,
    user_home: &Path,
    server: &str,
    token_secret: &str,
) -> Result<Seed, String> {
    let subscription = provider.subscription();
    let home = subscription.conventional_home(&user_home.to_string_lossy());
    let source = SubscriptionReader::new(subscription, &home)
        .read_document_for_import()
        .map_err(|error| format!("--seed-credential {}: {error}", provider.as_str()))?;
    let Some(path) = source.path else {
        return Err(format!(
            "--seed-credential {}: the login is held only in the platform keychain, which \
             cannot be marked handed over; export it to {} first",
            provider.as_str(),
            home.display()
        ));
    };
    let chain = source
        .token
        .refresh_token
        .as_deref()
        .filter(|token| !token.is_empty())
        .unwrap_or(&source.token.access_token);
    let fingerprint = fingerprint(token_secret, provider, chain);
    let mut value: Value = serde_json::from_str(&source.document).map_err(|_| {
        format!(
            "--seed-credential {}: the credential document is not JSON",
            provider.as_str()
        )
    })?;
    if let Some((previous, recorded, state)) = handover_of(&value)
        && recorded == fingerprint
        && previous != server
    {
        return Err(format!(
            "--seed-credential {}: this login was already handed over to {previous} ({state}); \
             seeding it to {server} as well would fork its refresh chain. Log in again on this \
             machine to seed a separate login",
            provider.as_str()
        ));
    }
    if let Some(object) = value.as_object_mut() {
        object.remove(METADATA_KEY);
    }
    let document = serde_json::to_string(&value).map_err(|error| error.to_string())?;
    if document.contains(['\n', '\r', '\0']) {
        return Err(format!(
            "--seed-credential {}: the credential document cannot be encoded",
            provider.as_str()
        ));
    }
    Ok(Seed {
        provider,
        document,
        fingerprint,
        original: std::fs::read_to_string(&path).unwrap_or(source.document),
        path,
    })
}

/// The document with a handover record for `server` in `state`.
fn marked(original: &str, seed: &Seed, server: &str, state: &str) -> Result<String, String> {
    let mut value: Value = serde_json::from_str(original)
        .map_err(|_| "the credential document is not JSON".to_string())?;
    let object = value
        .as_object_mut()
        .ok_or_else(|| "the credential document is not a JSON object".to_string())?;
    let metadata = object
        .entry(METADATA_KEY)
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .ok_or_else(|| "Router credential metadata is not a JSON object".to_string())?;
    let at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |elapsed| elapsed.as_secs());
    // Router never spends an externally owned refresh token.
    metadata.insert("refresh_owner".into(), "external".into());
    metadata.insert(
        HANDOVER_KEY.into(),
        json!({
            "server": server,
            "fingerprint": seed.fingerprint,
            "state": state,
            "at_unix": at,
        }),
    );
    serde_json::to_string_pretty(&value).map_err(|error| error.to_string())
}

/// Replace `path` atomically, keeping it private to this user.
fn replace(path: &Path, text: &str) -> Result<(), String> {
    use std::io::Write as _;
    let directory = path.parent().unwrap_or_else(|| Path::new("."));
    let mut file = tempfile::Builder::new()
        .prefix(".router-seed-")
        .tempfile_in(directory)
        .map_err(|error| format!("{}: {error}", directory.display()))?;
    file.write_all(text.as_bytes())
        .and_then(|()| file.flush())
        .map_err(|error| format!("{}: {error}", path.display()))?;
    file.persist(path)
        .map_err(|error| format!("{}: {error}", path.display()))?;
    Ok(())
}

impl Seed {
    /// Mark the local source `pending` before the document leaves.
    ///
    /// # Errors
    ///
    /// The source could not be rewritten; nothing was sent.
    pub fn mark_pending(&self, server: &str) -> Result<(), String> {
        replace(
            &self.path,
            &marked(&self.original, self, server, "pending")?,
        )
    }

    /// Settle the local mark with the target's `action`.
    ///
    /// Returns the local state: `handed-over`, `restored` or `pending` (no
    /// answer arrived; a re-run settles it).
    ///
    /// # Errors
    ///
    /// The source could not be rewritten.
    pub fn settle(&self, server: &str, action: Option<&str>) -> Result<&'static str, String> {
        match action {
            Some("imported" | "already-seeded") => {
                replace(
                    &self.path,
                    &marked(&self.original, self, server, "handed-over")?,
                )?;
                Ok("handed-over")
            }
            Some("kept-existing") => {
                // The target kept its own login: nothing moved, so the
                // source is this machine's again, exactly as it was.
                replace(&self.path, &self.original)?;
                Ok("restored")
            }
            _ => Ok("pending"),
        }
    }
}

#[cfg(test)]
#[path = "deploy_seed_tests.rs"]
mod tests;
