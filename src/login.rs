//! Login sessions that authorize a deployment without a pre-existing
//! credential file.
//!
//! Claude and Codex authorization run in-process. The legacy Claude Code PTY
//! driver remains available as a compatibility fallback. This module exposes
//! the irreducibly human step
//! — approving a URL in a browser — through provider-aware HTTP sessions:
//!
//! 1. [`LoginManager::begin`] starts the provider flow and returns its URL with
//!    a `login_id` (and, for Codex, a one-time device code).
//! 2. The human opens the URL and approves. Claude's code is submitted through
//!    [`LoginManager::submit_code`]; Codex is completed by background polling.
//! 3. The resulting credential is persisted in that provider's own home.
//!
//! # Why the session outlives the request
//!
//! Between steps 1 and 3 the router is waiting on a human — tens of seconds at
//! best, minutes realistically, possibly on another device. Restarting the
//! authorization is not an option, because a second run creates different PKCE
//! state and the code the user is holding no longer matches. The native state
//! (or the PTY for an explicitly configured compatibility flow) is therefore
//! owned by a registry entry keyed by `login_id`, with a generous TTL that is
//! independent of any HTTP timeout.
//!
//! Sessions are bounded in both directions: at most
//! [`LoginConfig::max_sessions`] may be pending at once (so repeated `begin`
//! calls cannot spawn unbounded CLI processes), and every session is killed on
//! success, on expiry, or on [`LoginManager::cancel`].

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::login_pty::PtySession;
use crate::subscription::{SubscriptionProvider, SubscriptionReader};

/// Markers that mean the CLI accepted the code and finished.
pub(crate) const SUCCESS_MARKERS: &[&str] =
    &["Loginsuccessful", "successfullyauthenticated", "sk-ant-oat"];
/// Markers that mean the CLI rejected the code.
pub(crate) const FAILURE_MARKERS: &[&str] = &[
    "OAutherror",
    "PressEntertoretry",
    "Invalidcode",
    "invalid_grant",
    "Authenticationfailed",
    "Loginfailed",
];

/// Stable text on the first-run screens that block the Claude Code prompt.
///
/// Each marker names the screen whose currently selected safe/default action
/// is accepted with Enter. Unknown screens are deliberately left untouched so
/// a changed onboarding flow times out loudly instead of receiving blind input.
pub(crate) const THEME_PICKER_MARKER: &str = "Choosethetextstylethatlooksbestwithyourterminal";
pub(crate) const WORKSPACE_TRUST_MARKER: &str = "Quicksafetycheck:Isthisaprojectyoucreated";
pub(crate) const LOGIN_METHOD_MARKER: &str = "Selectloginmethod:";
pub(crate) const READY_PROMPT_MARKER: &str = "Tipsforgettingstarted";

/// Settings for the login flow.
#[derive(Clone, Debug)]
pub struct LoginConfig {
    /// Whether the login endpoints are served at all.
    pub enabled: bool,
    /// Program to drive, e.g. `claude`.
    pub command: String,
    /// Arguments passed to that program. Empty selects the default TUI
    /// `/login` flow; `["setup-token"]` selects the narrow-scope alternative.
    pub args: Vec<String>,
    /// Optional disposable package cache exposed only to the fallback runner.
    pub package_cache: Option<PathBuf>,
    /// Directory the resulting credential must land in. This is the same
    /// directory [`crate::oauth::OAuthProvider`] reads.
    pub claude_code_home: PathBuf,
    /// Directory where Codex credentials are written.
    pub codex_home: PathBuf,
    /// Router data directory containing native-login credential locks.
    pub data_dir: PathBuf,
    /// Codex OAuth issuer. Overridable for compatible deployments and tests.
    pub codex_issuer: String,
    /// Loopback callback port registered for the Codex OAuth client.
    pub codex_callback_port: u16,
    /// How long a pending session stays valid while waiting for the human.
    pub session_ttl: Duration,
    /// Maximum number of simultaneously pending sessions.
    pub max_sessions: usize,
    /// How long the terminal must be quiet before its output is considered a
    /// settled frame rather than a mid-repaint one.
    pub idle_settle: Duration,
    /// How long to wait for the authorization URL to appear.
    pub url_timeout: Duration,
    /// How long to wait for the CLI to react to a submitted code.
    pub code_timeout: Duration,
}

impl Default for LoginConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            command: "claude".to_string(),
            args: vec![],
            package_cache: None,
            claude_code_home: PathBuf::from("/data/claude"),
            codex_home: PathBuf::from("/data/codex"),
            data_dir: PathBuf::from("/data"),
            codex_issuer: crate::auth::CODEX_ISSUER.to_string(),
            codex_callback_port: 1455,
            session_ttl: Duration::from_secs(900),
            max_sessions: 4,
            idle_settle: Duration::from_millis(750),
            url_timeout: Duration::from_secs(60),
            code_timeout: Duration::from_secs(120),
        }
    }
}

/// Lifecycle state of a login session.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LoginStatus {
    /// The URL was returned; the router is waiting for the human's code.
    AwaitingCode,
    /// The URL was returned; a provider-owned loopback listener awaits OAuth.
    AwaitingCallback,
    /// A provider-issued user code is waiting for browser approval.
    AwaitingDevice,
    /// A credential is now readable by the router.
    Authorized,
    /// The flow ended without a credential; restarting is required.
    Failed,
    /// The human did not come back before the TTL elapsed.
    Expired,
}

/// Public view of a login session.
#[derive(Clone, Debug, Serialize)]
pub struct LoginView {
    /// Identifier used to address this session.
    pub login_id: String,
    /// Subscription provider being authorized.
    pub provider: SubscriptionProvider,
    /// Current lifecycle state.
    pub status: LoginStatus,
    /// Authorization URL the human must open. Present while pending.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    /// One-time code entered at `url` for a device authorization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_code: Option<String>,
    /// When this *session* stops accepting a code.
    pub session_expires_at: DateTime<Utc>,
    /// When the obtained *credential* expires, when the CLI reports it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,
    /// Human-readable failure reason.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Why a login operation could not be carried out.
#[derive(Debug)]
pub enum LoginError {
    /// The login API is switched off.
    Disabled,
    /// `max_sessions` pending logins already exist.
    TooManySessions(usize),
    /// No session with that id (it may have been cleaned up).
    NotFound,
    /// The session exists but no longer accepts a code.
    NotPending(LoginStatus),
    /// The CLI could not be started.
    Spawn(String),
    /// The CLI started but never produced an authorization URL.
    NoUrl(String),
    /// The credential directory is unusable.
    Storage(String),
}

impl std::fmt::Display for LoginError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Disabled => write!(f, "the login API is disabled"),
            Self::TooManySessions(max) => {
                write!(f, "too many pending logins (limit {max}); cancel one first")
            }
            Self::NotFound => write!(f, "unknown login_id"),
            Self::NotPending(status) => {
                write!(f, "login is not awaiting a code (status: {status:?})")
            }
            Self::Spawn(msg) => write!(f, "could not start the login flow: {msg}"),
            Self::NoUrl(msg) => write!(f, "no authorization URL appeared: {msg}"),
            Self::Storage(msg) => write!(f, "credential directory is unusable: {msg}"),
        }
    }
}

impl std::error::Error for LoginError {}

/// One pending or finished login.
struct Session {
    id: String,
    provider: SubscriptionProvider,
    url: String,
    user_code: Option<String>,
    deadline: DateTime<Utc>,
    state: Mutex<SessionState>,
}

/// Mutable part of a [`Session`].
struct SessionState {
    status: LoginStatus,
    expires_at: Option<i64>,
    error: Option<String>,
    /// Dropped (and thus killed) as soon as the session stops being pending.
    pty: Option<Arc<PtySession>>,
    /// Native Claude PKCE state; no vendor process exists on this path.
    claude_login: Option<crate::claude_auth::ClaudeLogin>,
    /// Provider authorization task; aborting it stops polling or the listener.
    auth_task: Option<tokio::task::JoinHandle<()>>,
    /// When the session reached a terminal state, which starts the clock on
    /// [`TERMINAL_RETENTION`].
    settled_at: Option<DateTime<Utc>>,
}

impl Session {
    fn view(&self) -> LoginView {
        let state = self
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        LoginView {
            login_id: self.id.clone(),
            provider: self.provider,
            status: state.status.clone(),
            url: matches!(
                state.status,
                LoginStatus::AwaitingCode
                    | LoginStatus::AwaitingCallback
                    | LoginStatus::AwaitingDevice
            )
            .then(|| self.url.clone()),
            user_code: (state.status == LoginStatus::AwaitingDevice)
                .then(|| self.user_code.clone())
                .flatten(),
            session_expires_at: self.deadline,
            expires_at: state.expires_at,
            error: state.error.clone(),
        }
    }
}

/// How long a finished session is kept so its outcome can still be polled.
///
/// Long enough that a client which just submitted a code can read the verdict
/// even over a slow link; short enough that the registry cannot be grown into a
/// memory problem by repeated logins.
const TERMINAL_RETENTION_SECS: i64 = 300;

const fn terminal_retention() -> chrono::Duration {
    chrono::Duration::seconds(TERMINAL_RETENTION_SECS)
}

/// Registry of live login sessions.
#[derive(Clone)]
pub struct LoginManager {
    config: Arc<LoginConfig>,
    sessions: Arc<Mutex<HashMap<String, Arc<Session>>>>,
}

impl LoginManager {
    /// Create a manager for the given configuration.
    #[must_use]
    pub fn new(config: LoginConfig) -> Self {
        Self {
            config: Arc::new(config),
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// The configuration this manager was built with.
    #[must_use]
    pub fn config(&self) -> &LoginConfig {
        &self.config
    }

    /// Whether the login API is enabled.
    #[must_use]
    pub fn is_enabled(&self) -> bool {
        self.config.enabled
    }

    /// Start the provider-native Claude login.
    pub async fn begin(&self) -> Result<LoginView, LoginError> {
        self.begin_for(SubscriptionProvider::Claude).await
    }

    /// Start the authorization flow supported by `provider`.
    pub async fn begin_for(&self, provider: SubscriptionProvider) -> Result<LoginView, LoginError> {
        self.begin_with_mode(provider, self.configured_mode()).await
    }

    /// The login mode selected by configuration.
    ///
    /// `LOGIN_CLI_ARGS=setup-token` historically selected the narrow flow by
    /// naming an argument for the vendor CLI. It keeps working, but now selects
    /// the in-process narrow-scope OAuth rather than a subprocess (issue #193).
    #[must_use]
    pub fn configured_mode(&self) -> crate::claude_auth::ClaudeAuthMode {
        if self
            .config
            .args
            .iter()
            .any(|argument| argument == "setup-token")
        {
            crate::claude_auth::ClaudeAuthMode::SetupToken
        } else {
            crate::claude_auth::ClaudeAuthMode::Full
        }
    }

    /// Whether the compatibility backend would be spawned instead of the
    /// in-process OAuth, i.e. an operator pointed `LOGIN_CLI_COMMAND` at their
    /// own program. This is the only path that still needs an external binary.
    #[must_use]
    pub fn uses_external_command(&self) -> bool {
        self.config.command != "claude"
    }

    /// Start the authorization flow for `provider` in an explicit `mode`.
    pub async fn begin_with_mode(
        &self,
        provider: SubscriptionProvider,
        mode: crate::claude_auth::ClaudeAuthMode,
    ) -> Result<LoginView, LoginError> {
        if !self.config.enabled {
            return Err(LoginError::Disabled);
        }
        self.sweep();
        let pending = self.count_pending();
        if pending >= self.config.max_sessions {
            return Err(LoginError::TooManySessions(self.config.max_sessions));
        }
        if provider == SubscriptionProvider::Codex {
            return self.begin_codex().await;
        }
        if provider != SubscriptionProvider::Claude {
            return Err(LoginError::Spawn(format!(
                "{provider} authorization is not implemented; supported providers: claude, codex"
            )));
        }
        ensure_writable_dir(&self.config.claude_code_home)?;

        // Only an operator-supplied compatibility backend spawns a process.
        // Both real login modes run in-process, so the published image needs no
        // vendor binary for either of them (issue #193).
        let (pty, claude_login, url) = if self.uses_external_command() {
            let config = Arc::clone(&self.config);
            let (pty, url) = tokio::task::spawn_blocking(move || {
                crate::login_pty_backend::spawn_and_wait_for_url(&config)
            })
            .await
            .map_err(|e| LoginError::Spawn(e.to_string()))??;
            (Some(pty), None, url)
        } else {
            let login = crate::claude_auth::ClaudeLogin::begin(
                crate::claude_auth::ClaudeAuthConfig::for_mode(
                    self.config.claude_code_home.clone(),
                    self.config.data_dir.clone(),
                    mode,
                ),
            );
            let url = login.authorization_url().to_string();
            (None, Some(login), url)
        };

        let id = uuid::Uuid::new_v4().to_string();
        let session = Arc::new(Session {
            id: id.clone(),
            provider,
            url,
            user_code: None,
            deadline: Utc::now()
                + chrono::Duration::from_std(self.config.session_ttl)
                    .unwrap_or_else(|_| chrono::Duration::seconds(900)),
            state: Mutex::new(SessionState {
                status: LoginStatus::AwaitingCode,
                expires_at: None,
                error: None,
                pty,
                claude_login,
                auth_task: None,
                settled_at: None,
            }),
        });
        self.lock_sessions().insert(id, Arc::clone(&session));
        Ok(session.view())
    }

    async fn begin_codex(&self) -> Result<LoginView, LoginError> {
        let codex_home = self.config.codex_home.clone();
        ensure_writable_dir(&codex_home)?;
        let mut codex_config = crate::auth::CodexAuthConfig::production(
            codex_home,
            self.config.data_dir.clone(),
            self.config.codex_callback_port,
            self.config.session_ttl,
        );
        codex_config.issuer.clone_from(&self.config.codex_issuer);
        let login = crate::auth::CodexDeviceLogin::begin(codex_config)
            .await
            .map_err(LoginError::Spawn)?;
        let id = uuid::Uuid::new_v4().to_string();
        let session = Arc::new(Session {
            id: id.clone(),
            provider: SubscriptionProvider::Codex,
            url: login.verification_url().to_string(),
            user_code: Some(login.user_code().to_string()),
            deadline: Utc::now()
                + chrono::Duration::from_std(self.config.session_ttl)
                    .unwrap_or_else(|_| chrono::Duration::seconds(900)),
            state: Mutex::new(SessionState {
                status: LoginStatus::AwaitingDevice,
                expires_at: None,
                error: None,
                pty: None,
                claude_login: None,
                auth_task: None,
                settled_at: None,
            }),
        });
        self.lock_sessions().insert(id, Arc::clone(&session));
        let task_session = Arc::clone(&session);
        let task = tokio::spawn(async move {
            let outcome = login.complete().await;
            let mut state = task_session
                .state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            match outcome {
                Ok(_) => {
                    state.status = LoginStatus::Authorized;
                    state.error = None;
                }
                Err(error) => {
                    state.status = if Utc::now() >= task_session.deadline {
                        LoginStatus::Expired
                    } else {
                        LoginStatus::Failed
                    };
                    state.error = Some(error);
                }
            }
            state.settled_at = Some(Utc::now());
        });
        session
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .auth_task = Some(task);
        Ok(session.view())
    }

    /// Look up a session's current state.
    #[must_use]
    pub fn status(&self, id: &str) -> Option<LoginView> {
        self.sweep();
        let session = self.lock_sessions().get(id).map(Arc::clone)?;
        Some(session.view())
    }

    /// Feed the human's authorization code to the session's live PTY.
    pub async fn submit_code(&self, id: &str, code: &str) -> Result<LoginView, LoginError> {
        if !self.config.enabled {
            return Err(LoginError::Disabled);
        }
        self.sweep();
        let session = self
            .lock_sessions()
            .get(id)
            .map(Arc::clone)
            .ok_or(LoginError::NotFound)?;

        let (pty, claude_login) = {
            let state = session
                .state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            if state.status != LoginStatus::AwaitingCode {
                return Err(LoginError::NotPending(state.status.clone()));
            }
            (state.pty.clone(), state.claude_login.clone())
        };

        let code = code.trim().to_string();
        let outcome = if let Some(login) = claude_login {
            match login.complete(&code).await {
                Ok(_) => read_credential(&self.config.claude_code_home).map_or_else(
                    || {
                        Outcome::Failed(
                            "native Claude OAuth did not write a readable credential".into(),
                        )
                    },
                    |credential| Outcome::Authorized {
                        expires_at: credential.expires_at,
                    },
                ),
                Err(error) => Outcome::Failed(error),
            }
        } else if let Some(pty) = pty {
            let config = Arc::clone(&self.config);
            tokio::task::spawn_blocking(move || {
                crate::login_pty_backend::submit_and_finalize(&config, &pty, &code)
            })
            .await
            .map_err(|e| LoginError::Spawn(e.to_string()))?
        } else {
            return Err(LoginError::NotFound);
        };

        Self::finish(&session, outcome);
        Ok(session.view())
    }

    /// Terminate a session and forget it. Returns whether it existed.
    #[must_use]
    pub fn cancel(&self, id: &str) -> bool {
        self.lock_sessions().remove(id).is_some_and(|session| {
            Self::release(&session);
            true
        })
    }

    /// Number of sessions still waiting for a code.
    #[must_use]
    pub fn pending_count(&self) -> usize {
        self.sweep();
        self.count_pending()
    }

    /// Expire sessions whose TTL elapsed, killing their processes, and forget
    /// finished ones once their result has had time to be collected.
    ///
    /// Without the first half, an abandoned login would leak one CLI process
    /// per attempt, indefinitely. Without the second, the registry itself would
    /// grow without bound: a finished session releases its PTY but its map
    /// entry used to live as long as the process, so anyone who could call
    /// `begin` repeatedly could grow the map for the lifetime of the router.
    pub fn sweep(&self) {
        let now = Utc::now();
        let sessions: Vec<Arc<Session>> = self.lock_sessions().values().map(Arc::clone).collect();
        let mut evict = Vec::new();
        for session in sessions {
            let mut state = session
                .state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            let expired = matches!(
                state.status,
                LoginStatus::AwaitingCode
                    | LoginStatus::AwaitingCallback
                    | LoginStatus::AwaitingDevice
            ) && session.deadline <= now;
            if expired {
                state.status = LoginStatus::Expired;
                state.error = Some("login session expired before authorization completed".into());
                state.pty = None; // dropping the PTY kills the child
                state.claude_login = None;
                if let Some(task) = state.auth_task.take() {
                    task.abort();
                }
                state.settled_at = Some(now);
            } else if state
                .settled_at
                .is_some_and(|at| now - at >= terminal_retention())
            {
                evict.push(session.id.clone());
            }
            drop(state);
            if expired {
                tracing::info!("login session {} expired", session.id);
            }
        }
        if !evict.is_empty() {
            let mut sessions = self.lock_sessions();
            for id in evict {
                sessions.remove(&id);
            }
        }
    }

    fn finish(session: &Arc<Session>, outcome: Outcome) {
        let mut state = session
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        match outcome {
            Outcome::Authorized { expires_at } => {
                state.status = LoginStatus::Authorized;
                state.expires_at = expires_at;
                state.error = None;
            }
            Outcome::Failed(error) => {
                state.status = LoginStatus::Failed;
                state.error = Some(error);
            }
        }
        state.pty = None;
        state.claude_login = None;
        state.auth_task = None;
        state.settled_at = Some(Utc::now());
    }

    fn release(session: &Arc<Session>) {
        let mut state = session
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        state.pty = None;
        state.claude_login = None;
        if let Some(task) = state.auth_task.take() {
            task.abort();
        }
        if matches!(
            state.status,
            LoginStatus::AwaitingCode | LoginStatus::AwaitingCallback | LoginStatus::AwaitingDevice
        ) {
            state.status = LoginStatus::Failed;
            state.error = Some("login session cancelled".into());
        }
    }

    fn count_pending(&self) -> usize {
        self.lock_sessions()
            .values()
            .filter(|session| {
                let status = session
                    .state
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .status
                    .clone();
                matches!(
                    status,
                    LoginStatus::AwaitingCode
                        | LoginStatus::AwaitingCallback
                        | LoginStatus::AwaitingDevice
                )
            })
            .count()
    }

    fn lock_sessions(&self) -> std::sync::MutexGuard<'_, HashMap<String, Arc<Session>>> {
        self.sessions
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

/// Result of feeding a code to the CLI.
pub(crate) enum Outcome {
    Authorized { expires_at: Option<i64> },
    Failed(String),
}

/// A credential the router can now read.
pub(crate) struct FoundCredential {
    /// Expiry timestamp in milliseconds, when the credential carries one.
    pub(crate) expires_at: Option<i64>,
}

/// Probe the credential directory the same way the proxy does.
pub(crate) fn read_credential(home: &Path) -> Option<FoundCredential> {
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home);
    reader.read_token().ok().map(|token| FoundCredential {
        expires_at: token.expires_at_ms,
    })
}

/// Write a Claude Code credential file in the nested layout the router reads.
pub(crate) fn write_credential(home: &Path, token: &str) -> std::io::Result<()> {
    std::fs::create_dir_all(home)?;
    let path = home.join(".credentials.json");
    let body = serde_json::json!({
        "claudeAiOauth": {
            "accessToken": token,
            "subscriptionType": "max",
        }
    });
    std::fs::write(&path, serde_json::to_vec_pretty(&body)?)?;
    restrict_permissions(&path);
    Ok(())
}

/// Credentials are secrets: keep them owner-only where the platform allows it.
#[cfg(unix)]
fn restrict_permissions(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600));
}

#[cfg(not(unix))]
fn restrict_permissions(_path: &Path) {}

/// Fail early and clearly when the credential directory cannot be written,
/// rather than after the human has already completed a browser login.
fn ensure_writable_dir(home: &Path) -> Result<(), LoginError> {
    std::fs::create_dir_all(home).map_err(|e| {
        LoginError::Storage(format!(
            "{} is not writable ({e}); mount it read-write to use the login API",
            home.display()
        ))
    })?;
    let probe = home.join(".router-login-write-probe");
    std::fs::write(&probe, b"").map_err(|e| {
        LoginError::Storage(format!(
            "{} is not writable ({e}); mount it read-write to use the login API",
            home.display()
        ))
    })?;
    let _ = std::fs::remove_file(&probe);
    Ok(())
}

/// Last `limit` characters of a transcript, safe to return to a client.
///
/// Two kinds of secret live in a login transcript and both are removed before
/// the text is truncated: the account token the CLI prints (recognised by its
/// prefix) and the authorization code the human pasted, which the terminal
/// echoes back and which no pattern could identify — so it is passed in.
pub(crate) fn excerpt(text: &str, code: &str, limit: usize) -> String {
    let redacted = crate::login_url::redact_value(&crate::login_url::redact_secrets(text), code);
    tail(&redacted, limit)
}

/// Last `limit` characters of `text`, trimmed.
pub(crate) fn tail(text: &str, limit: usize) -> String {
    let trimmed = text.trim();
    let count = trimmed.chars().count();
    if count <= limit {
        return trimmed.to_string();
    }
    trimmed.chars().skip(count - limit).collect()
}

#[cfg(test)]
mod tests;
