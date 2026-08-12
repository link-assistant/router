//! Native Claude OAuth authorization using the public Claude Code client.

use std::io::Write as _;
use std::path::{Path, PathBuf};

use base64::Engine as _;
use serde::Deserialize;
use sha2::{Digest, Sha256};

use crate::refresh::{CLAUDE_CLIENT_ID, CLAUDE_TOKEN_URL};

/// Authorization endpoint used by Claude Code's public OAuth client.
pub const CLAUDE_AUTHORIZE_URL: &str = "https://claude.com/cai/oauth/authorize";
/// Fixed callback registered for the public client. The browser renders the
/// resulting code for copy/paste; the router does not serve this URL.
pub const CLAUDE_REDIRECT_URI: &str = "https://platform.claude.com/oauth/code/callback";
/// Scopes requested by the interactive Claude Code login.
pub const CLAUDE_SCOPES: &str = "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";

/// Testable settings for one native Claude authorization.
#[derive(Clone, Debug)]
pub struct ClaudeAuthConfig {
    pub authorize_url: String,
    pub token_url: String,
    pub client_id: String,
    pub redirect_uri: String,
    pub claude_home: PathBuf,
}

impl ClaudeAuthConfig {
    #[must_use]
    pub fn production(claude_home: PathBuf) -> Self {
        Self {
            authorize_url: CLAUDE_AUTHORIZE_URL.to_string(),
            token_url: CLAUDE_TOKEN_URL.to_string(),
            client_id: CLAUDE_CLIENT_ID.to_string(),
            redirect_uri: CLAUDE_REDIRECT_URI.to_string(),
            claude_home,
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
            .append_pair("scope", CLAUDE_SCOPES)
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

    #[must_use]
    pub fn authorization_url(&self) -> &str {
        &self.authorization_url
    }

    /// Exchange a copied code and write the credential layout Claude Code uses.
    pub async fn complete(&self, pasted_code: &str) -> Result<PathBuf, String> {
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
        persist(&self.config.claude_home, token)
    }
}

fn persist(home: &Path, token: TokenResponse) -> Result<PathBuf, String> {
    std::fs::create_dir_all(home)
        .map_err(|error| format!("could not create {}: {error}", home.display()))?;
    let now = chrono::Utc::now().timestamp_millis();
    let scopes = token.scope.as_deref().map_or_else(
        || CLAUDE_SCOPES.split_whitespace().collect::<Vec<_>>(),
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
    let path = home.join(".credentials.json");
    let bytes = serde_json::to_vec_pretty(&serde_json::json!({ "claudeAiOauth": oauth }))
        .map_err(|error| format!("could not encode Claude credential: {error}"))?;
    let temporary = home.join(format!(".credentials.json.{}.tmp", uuid::Uuid::new_v4()));
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|error| format!("could not create {}: {error}", temporary.display()))?;
    file.write_all(&bytes)
        .and_then(|()| file.sync_all())
        .map_err(|error| format!("could not write {}: {error}", temporary.display()))?;
    restrict_permissions(&temporary)?;
    std::fs::rename(&temporary, &path)
        .map_err(|error| format!("could not install {}: {error}", path.display()))?;
    Ok(path)
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
