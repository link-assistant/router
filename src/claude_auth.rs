//! Native Claude OAuth authorization using the public Claude Code client.

use std::io::Write as _;
use std::path::{Path, PathBuf};
use std::time::Duration;

use base64::Engine as _;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::refresh::{CLAUDE_CLIENT_ID, CLAUDE_TOKEN_URL};

/// Authorization endpoint used by Claude Code's public OAuth client.
pub const CLAUDE_AUTHORIZE_URL: &str = "https://claude.com/cai/oauth/authorize";
/// Fixed callback registered for the public client. The browser renders the
/// resulting code for copy/paste; the router does not serve this URL.
pub const CLAUDE_REDIRECT_URI: &str = "https://platform.claude.com/oauth/code/callback";
/// Scopes requested by the interactive Claude Code login.
pub const CLAUDE_SCOPES: &str = "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";

/// Scope requested by the narrow `setup-token` alternative.
///
/// The vendor CLI's `setup-token` command asks for inference only; the router
/// requests the same single scope in-process, so the narrow mode needs no
/// vendor binary (issue #193).
pub const CLAUDE_INFERENCE_SCOPE: &str = "user:inference";

const PENDING_LOGIN_FILE: &str = ".link-assistant-router-claude-login.json";

/// Which set of OAuth scopes a login asks for.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum ClaudeAuthMode {
    /// Full Claude Code `/login`-equivalent scopes.
    #[default]
    Full,
    /// Narrow `user:inference` only, matching `setup-token`.
    SetupToken,
}

impl ClaudeAuthMode {
    /// The space-separated scope string this mode requests.
    #[must_use]
    pub const fn scopes(self) -> &'static str {
        match self {
            Self::Full => CLAUDE_SCOPES,
            Self::SetupToken => CLAUDE_INFERENCE_SCOPE,
        }
    }

    /// Parse an operator-facing mode name.
    ///
    /// # Errors
    ///
    /// Returns the list of accepted names when `value` is not one of them.
    pub fn parse(value: &str) -> Result<Self, String> {
        match value.trim().to_ascii_lowercase().as_str() {
            "" | "full" | "login" | "default" => Ok(Self::Full),
            "setup-token" | "setup_token" | "inference" | "narrow" => Ok(Self::SetupToken),
            other => Err(format!(
                "unknown login mode '{other}'; expected 'full' or 'setup-token'"
            )),
        }
    }

    /// The operator-facing name of this mode.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::SetupToken => "setup-token",
        }
    }
}

/// Testable settings for one native Claude authorization.
#[derive(Clone, Debug)]
pub struct ClaudeAuthConfig {
    pub authorize_url: String,
    pub token_url: String,
    pub client_id: String,
    pub redirect_uri: String,
    pub claude_home: PathBuf,
    /// Scopes to request; see [`ClaudeAuthMode`].
    pub scopes: String,
}

impl ClaudeAuthConfig {
    #[must_use]
    pub fn production(claude_home: PathBuf) -> Self {
        Self::for_mode(claude_home, ClaudeAuthMode::Full)
    }

    /// Production settings requesting the scopes of `mode`.
    #[must_use]
    pub fn for_mode(claude_home: PathBuf, mode: ClaudeAuthMode) -> Self {
        Self {
            authorize_url: CLAUDE_AUTHORIZE_URL.to_string(),
            token_url: CLAUDE_TOKEN_URL.to_string(),
            client_id: CLAUDE_CLIENT_ID.to_string(),
            redirect_uri: CLAUDE_REDIRECT_URI.to_string(),
            claude_home,
            scopes: mode.scopes().to_string(),
        }
    }
}

/// A PKCE authorization awaiting the code displayed by Claude's callback page.
#[derive(Clone, Debug)]
pub struct ClaudeLogin {
    config: ClaudeAuthConfig,
    authorization_url: String,
    code_verifier: String,
    state: String,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
    refresh_token_expires_in: Option<i64>,
    scope: Option<String>,
    subscription_type: Option<String>,
    rate_limit_tier: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct PendingLogin {
    code_verifier: String,
    state: String,
    expires_at: i64,
}

impl ClaudeLogin {
    /// Construct a native login without spawning or locating a vendor CLI.
    #[must_use]
    pub fn begin(config: ClaudeAuthConfig) -> Self {
        let state = random_urlsafe();
        let code_verifier = random_urlsafe();
        let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(Sha256::digest(code_verifier.as_bytes()));
        let mut url = reqwest::Url::parse(&config.authorize_url)
            .expect("Claude authorization endpoint is a valid URL");
        url.query_pairs_mut()
            .append_pair("code", "true")
            .append_pair("client_id", &config.client_id)
            .append_pair("response_type", "code")
            .append_pair("redirect_uri", &config.redirect_uri)
            .append_pair("scope", &config.scopes)
            .append_pair("code_challenge", &challenge)
            .append_pair("code_challenge_method", "S256")
            .append_pair("state", &state);
        Self {
            config,
            authorization_url: url.into(),
            code_verifier,
            state,
        }
    }

    /// Start a login whose PKCE state can be redeemed by a later CLI process.
    pub fn begin_persisted(config: ClaudeAuthConfig, ttl: Duration) -> Result<Self, String> {
        let login = Self::begin(config);
        let ttl = i64::try_from(ttl.as_millis()).unwrap_or(i64::MAX);
        let pending = PendingLogin {
            code_verifier: login.code_verifier.clone(),
            state: login.state.clone(),
            expires_at: chrono::Utc::now().timestamp_millis().saturating_add(ttl),
        };
        write_pending(&login.config.claude_home, &pending)?;
        Ok(login)
    }

    /// Atomically consume the PKCE state created by [`Self::begin_persisted`].
    pub fn resume(config: ClaudeAuthConfig) -> Result<Self, String> {
        let pending = take_pending(&config.claude_home)?;
        if pending.expires_at <= chrono::Utc::now().timestamp_millis() {
            return Err(
                "pending Claude authorization expired; run `router auth claude --flow code` again"
                    .to_string(),
            );
        }
        if pending.code_verifier.is_empty() || pending.state.is_empty() {
            return Err(
                "pending Claude authorization is invalid; run `router auth claude --flow code` again"
                    .to_string(),
            );
        }
        Ok(Self {
            config,
            authorization_url: String::new(),
            code_verifier: pending.code_verifier,
            state: pending.state,
        })
    }

    #[must_use]
    pub fn authorization_url(&self) -> &str {
        &self.authorization_url
    }

    /// Exchange a copied code and write the credential layout Claude Code uses.
    pub async fn complete(&self, pasted_code: &str) -> Result<PathBuf, String> {
        self.complete_with_data_dir(pasted_code, &self.config.claude_home)
            .await
    }

    /// Exchange a copied code and install under a Router-resolved lock root.
    pub async fn complete_with_data_dir(
        &self,
        pasted_code: &str,
        data_dir: impl AsRef<Path>,
    ) -> Result<PathBuf, String> {
        let (code, returned_state) = pasted_code.trim().split_once('#').map_or_else(
            || (pasted_code.trim(), None),
            |(code, state)| (code, Some(state)),
        );
        if code.is_empty() {
            return Err("Claude authorization code is empty".to_string());
        }
        if returned_state.is_some_and(|state| state != self.state) {
            return Err("Claude authorization state did not match this login".to_string());
        }
        let response = reqwest::Client::new()
            .post(&self.config.token_url)
            .json(&serde_json::json!({
                "grant_type": "authorization_code",
                "code": code,
                "state": returned_state.unwrap_or(&self.state),
                "client_id": self.config.client_id,
                "redirect_uri": self.config.redirect_uri,
                "code_verifier": self.code_verifier,
            }))
            .send()
            .await
            .map_err(|error| format!("Claude authorization request failed: {error}"))?;
        let status = response.status();
        if !status.is_success() {
            let detail = response.text().await.unwrap_or_default();
            return Err(format!(
                "Claude token endpoint returned {status}{}",
                response_detail(&detail)
            ));
        }
        let token: TokenResponse = response
            .json()
            .await
            .map_err(|error| format!("invalid Claude token response: {error}"))?;
        if token.access_token.trim().is_empty() {
            return Err("invalid Claude token response: missing access_token".to_string());
        }
        persist(&self.config, token, data_dir.as_ref()).await
    }
}

fn write_pending(home: &Path, pending: &PendingLogin) -> Result<(), String> {
    std::fs::create_dir_all(home)
        .map_err(|error| crate::durable_file::describe_write_failure(home, &error))?;
    let path = home.join(PENDING_LOGIN_FILE);
    let temporary = home.join(format!("{PENDING_LOGIN_FILE}.{}.tmp", uuid::Uuid::new_v4()));
    // Links notation, readable, with the file name unchanged so an existing
    // installation keeps its path and migrates on the next write (issue #336).
    let bytes = crate::lino_json::encode(pending)
        .map_err(|error| format!("could not encode pending Claude authorization: {error}"))?
        .into_bytes();
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|error| crate::durable_file::describe_write_failure(&temporary, &error))?;
    file.write_all(&bytes)
        .and_then(|()| file.sync_all())
        .map_err(|error| format!("could not write {}: {error}", temporary.display()))?;
    restrict_permissions(&temporary)?;
    std::fs::rename(&temporary, &path)
        .map_err(|error| format!("could not install {}: {error}", path.display()))
}

fn take_pending(home: &Path) -> Result<PendingLogin, String> {
    let path = home.join(PENDING_LOGIN_FILE);
    let claimed = home.join(format!(
        "{PENDING_LOGIN_FILE}.{}.claimed",
        uuid::Uuid::new_v4()
    ));
    std::fs::rename(&path, &claimed).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            "no pending Claude authorization; run `router auth claude --flow code` first and open the printed URL"
                .to_string()
        } else {
            format!("could not consume {}: {error}", path.display())
        }
    })?;
    let result = std::fs::read(&claimed)
        .map_err(|error| format!("could not read {}: {error}", claimed.display()))
        .and_then(|bytes| {
            // Either encoding: a file written by an earlier release is JSON.
            let text = String::from_utf8_lossy(&bytes);
            crate::lino_json::decode(&text)
                .map_err(|error| format!("invalid pending Claude authorization: {error}"))
        });
    let _ = std::fs::remove_file(&claimed);
    result
}

async fn persist(
    config: &ClaudeAuthConfig,
    token: TokenResponse,
    data_dir: &Path,
) -> Result<PathBuf, String> {
    let now = chrono::Utc::now().timestamp_millis();
    // Fall back to what this login actually asked for, so a narrow
    // `setup-token` credential is not recorded as carrying full scopes.
    let scopes = token.scope.as_deref().map_or_else(
        || config.scopes.split_whitespace().collect::<Vec<_>>(),
        |scope| scope.split_whitespace().collect::<Vec<_>>(),
    );
    let mut oauth = serde_json::json!({
        "accessToken": token.access_token,
        "scopes": scopes,
        "subscriptionType": token.subscription_type,
        "rateLimitTier": token.rate_limit_tier,
    });
    if let Some(refresh) = token.refresh_token {
        oauth["refreshToken"] = refresh.into();
    }
    if let Some(seconds) = token.expires_in {
        oauth["expiresAt"] = (now + seconds.saturating_mul(1000)).into();
    }
    if let Some(seconds) = token.refresh_token_expires_in {
        oauth["refreshTokenExpiresAt"] = (now + seconds.saturating_mul(1000)).into();
    }
    let document = serde_json::to_string_pretty(&serde_json::json!({ "claudeAiOauth": oauth }))
        .map_err(|error| format!("could not encode Claude credential: {error}"))?;
    let reader = crate::subscription::SubscriptionReader::new(
        crate::subscription::SubscriptionProvider::Claude,
        &config.claude_home,
    );
    match reader
        .install_document_locked(
            data_dir,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            &document,
            crate::subscription::InstallMode::Replace,
        )
        .await?
    {
        crate::subscription::InstallDocumentResult::Installed(path) => Ok(path),
        crate::subscription::InstallDocumentResult::AlreadyPresent(_) => {
            Err("native Claude replacement unexpectedly became conditional".to_string())
        }
    }
}

fn random_urlsafe() -> String {
    let mut bytes = [0_u8; 32];
    getrandom::fill(&mut bytes).expect("operating system randomness is available");
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

fn response_detail(body: &str) -> String {
    let detail = body.trim();
    if detail.is_empty() {
        String::new()
    } else {
        let end = detail
            .char_indices()
            .nth(500)
            .map_or(detail.len(), |(i, _)| i);
        format!(": {}", &detail[..end])
    }
}

#[cfg(unix)]
fn restrict_permissions(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt as _;
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))
        .map_err(|error| format!("could not secure {}: {error}", path.display()))
}

#[cfg(not(unix))]
fn restrict_permissions(_path: &Path) -> Result<(), String> {
    Ok(())
}
