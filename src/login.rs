//! Login sessions that authorize a deployment without a pre-existing
//! credential file.
//!
//! The router can only *read* Claude Code credentials ([`crate::oauth`]), so a
//! fresh container has nothing to read and no way to produce it: the Claude
//! Code login is interactive, and the machine that would run it is not the
//! machine the router runs on (issue #47).
//!
//! This module closes that gap by driving the Claude Code CLI on a PTY inside
//! the deployment and exposing the *only* irreducibly human step — approving
//! a URL in a browser — as two HTTP calls:
//!
//! 1. [`LoginManager::begin`] spawns the CLI, waits for the authorization URL
//!    to settle on screen, and returns it along with a `login_id`.
//! 2. The human opens the URL, approves, and copies the code back.
//! 3. [`LoginManager::submit_code`] types that code into the *same* PTY and
//!    persists the resulting credential where [`crate::oauth`] reads it.
//!
//! # Why the session outlives the request
//!
//! Between steps 1 and 3 the router is waiting on a human — tens of seconds at
//! best, minutes realistically, possibly on another device. Re-spawning the
//! CLI is not an option, because a second run prints a *different* URL and the
//! code the user is holding no longer matches. So the child process, its PTY,
//! and its terminal state are owned by a registry entry keyed by `login_id`,
//! with their own generous TTL that is independent of any HTTP timeout.
//!
//! Sessions are bounded in both directions: at most
//! [`LoginConfig::max_sessions`] may be pending at once (so repeated `begin`
//! calls cannot spawn unbounded CLI processes), and every session is killed on
//! success, on expiry, or on [`LoginManager::cancel`].

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use chrono::{DateTime, Utc};
use portable_pty::CommandBuilder;
use serde::Serialize;

use crate::login_pty::{Key, PtySession, WaitError};
use crate::login_url::{extract_login_url, extract_token};
use crate::subscription::{SubscriptionProvider, SubscriptionReader};

/// Markers that mean the CLI accepted the code and finished.
const SUCCESS_MARKERS: &[&str] = &[
    "Login successful",
    "successfully authenticated",
    "sk-ant-oat",
];
/// Markers that mean the CLI rejected the code.
const FAILURE_MARKERS: &[&str] = &[
    "Invalid code",
    "invalid_grant",
    "Authentication failed",
    "Login failed",
];

/// Stable text on the first-run screens that block the Claude Code prompt.
///
/// Each marker names the screen whose currently selected safe/default action
/// is accepted with Enter. Unknown screens are deliberately left untouched so
/// a changed onboarding flow times out loudly instead of receiving blind input.
const THEME_PICKER_MARKER: &str = "Choosethetextstylethatlooksbestwithyourterminal";
const WORKSPACE_TRUST_MARKER: &str = "Quicksafetycheck:Isthisaprojectyoucreated";
const LOGIN_METHOD_MARKER: &str = "Selectloginmethod:";
const READY_PROMPT_MARKER: &str = "Tipsforgettingstarted";

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
    /// Directory the resulting credential must land in. This is the same
    /// directory [`crate::oauth::OAuthProvider`] reads.
    pub claude_code_home: PathBuf,
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
            claude_code_home: PathBuf::from("/data/claude"),
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
    /// Current lifecycle state.
    pub status: LoginStatus,
    /// Authorization URL the human must open. Present while pending.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
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
            Self::Spawn(msg) => write!(f, "could not start the login CLI: {msg}"),
            Self::NoUrl(msg) => write!(f, "no authorization URL appeared: {msg}"),
            Self::Storage(msg) => write!(f, "credential directory is unusable: {msg}"),
        }
    }
}

impl std::error::Error for LoginError {}

/// One pending or finished login.
struct Session {
    id: String,
    url: String,
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
            status: state.status.clone(),
            url: (state.status == LoginStatus::AwaitingCode).then(|| self.url.clone()),
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

    /// Start a login: spawn the CLI, wait for its authorization URL, and
    /// register the still-running session so a later request can finish it.
    pub async fn begin(&self) -> Result<LoginView, LoginError> {
        if !self.config.enabled {
            return Err(LoginError::Disabled);
        }
        self.sweep();
        let pending = self.count_pending();
        if pending >= self.config.max_sessions {
            return Err(LoginError::TooManySessions(self.config.max_sessions));
        }
        ensure_writable_dir(&self.config.claude_code_home)?;

        let config = Arc::clone(&self.config);
        let (pty, url) = tokio::task::spawn_blocking(move || spawn_and_wait_for_url(&config))
            .await
            .map_err(|e| LoginError::Spawn(e.to_string()))??;

        let id = uuid::Uuid::new_v4().to_string();
        let session = Arc::new(Session {
            id: id.clone(),
            url,
            deadline: Utc::now()
                + chrono::Duration::from_std(self.config.session_ttl)
                    .unwrap_or_else(|_| chrono::Duration::seconds(900)),
            state: Mutex::new(SessionState {
                status: LoginStatus::AwaitingCode,
                expires_at: None,
                error: None,
                pty: Some(pty),
                settled_at: None,
            }),
        });
        self.lock_sessions().insert(id, Arc::clone(&session));
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

        let pty = {
            let state = session
                .state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            if state.status != LoginStatus::AwaitingCode {
                return Err(LoginError::NotPending(state.status.clone()));
            }
            state.pty.clone().ok_or(LoginError::NotFound)?
        };

        let config = Arc::clone(&self.config);
        let code = code.trim().to_string();
        let outcome =
            tokio::task::spawn_blocking(move || submit_and_finalize(&config, &pty, &code))
                .await
                .map_err(|e| LoginError::Spawn(e.to_string()))?;

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
            let expired = state.status == LoginStatus::AwaitingCode && session.deadline <= now;
            if expired {
                state.status = LoginStatus::Expired;
                state.error = Some("login session expired before a code was submitted".into());
                state.pty = None; // dropping the PTY kills the child
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
        state.settled_at = Some(Utc::now());
    }

    fn release(session: &Arc<Session>) {
        let mut state = session
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        state.pty = None;
        if state.status == LoginStatus::AwaitingCode {
            state.status = LoginStatus::Failed;
            state.error = Some("login session cancelled".into());
        }
    }

    fn count_pending(&self) -> usize {
        self.lock_sessions()
            .values()
            .filter(|session| {
                session
                    .state
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .status
                    == LoginStatus::AwaitingCode
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
enum Outcome {
    Authorized { expires_at: Option<i64> },
    Failed(String),
}

/// Spawn the login CLI and block until its authorization URL has settled.
fn spawn_and_wait_for_url(config: &LoginConfig) -> Result<(Arc<PtySession>, String), LoginError> {
    let mut command = CommandBuilder::new(&config.command);
    for arg in &config.args {
        command.arg(arg);
    }
    // The CLI decides where to write credentials from its environment, so it
    // is pointed at exactly the directory the router reads.
    command.env("CLAUDE_CONFIG_DIR", &config.claude_code_home);
    if let Some(parent) = config.claude_code_home.parent() {
        command.env("HOME", parent);
    }
    command.env("TERM", "xterm-256color");
    if let Ok(path) = std::env::var("PATH") {
        command.env("PATH", path);
    }

    let session =
        Arc::new(PtySession::spawn(command).map_err(|e| LoginError::Spawn(e.to_string()))?);
    let result = if config.args.is_empty() {
        drive_tui_to_login_url(&session, config)
    } else {
        wait_for_login_url(&session, config)
    };
    match result {
        Ok(url) => Ok((session, url)),
        Err(detail) => {
            session.kill();
            Err(LoginError::NoUrl(detail))
        }
    }
}

/// Progress through the known TUI screens without re-reacting to old text in
/// the append-only PTY transcript.
#[derive(Default)]
struct TuiProgress {
    theme_accepted: bool,
    trust_accepted: bool,
    login_sent: bool,
    method_selected: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum TuiAction {
    AcceptTheme,
    AcceptWorkspaceTrust,
    SendLogin,
    SelectLoginMethod,
}

fn next_tui_action(text: &str, progress: &TuiProgress) -> Option<TuiAction> {
    // Ink-based TUIs position words with cursor escapes instead of printing
    // literal spaces. `strip_ansi` intentionally removes those escapes, so a
    // rendered "Select login method:" may arrive as "Selectloginmethod:".
    let compact: String = text.chars().filter(|ch| !ch.is_whitespace()).collect();
    if !progress.theme_accepted && compact.contains(THEME_PICKER_MARKER) {
        Some(TuiAction::AcceptTheme)
    } else if !progress.trust_accepted && compact.contains(WORKSPACE_TRUST_MARKER) {
        Some(TuiAction::AcceptWorkspaceTrust)
    } else if !progress.login_sent && compact.contains(READY_PROMPT_MARKER) {
        Some(TuiAction::SendLogin)
    } else if !progress.method_selected && compact.contains(LOGIN_METHOD_MARKER) {
        Some(TuiAction::SelectLoginMethod)
    } else {
        None
    }
}

/// Drive bare `claude` to the full-scope OAuth URL exposed by its `/login`
/// command. The one timeout covers the whole startup sequence, not each screen.
fn drive_tui_to_login_url(session: &PtySession, config: &LoginConfig) -> Result<String, String> {
    let deadline = Instant::now() + config.url_timeout;
    let mut progress = TuiProgress::default();
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(format!(
                "timed out; last output: {}",
                session.transcript_tail(400)
            ));
        }
        let text = session
            .wait_for(
                |text| {
                    extract_login_url(text).is_some() || next_tui_action(text, &progress).is_some()
                },
                config.idle_settle,
                remaining,
            )
            .map_err(|err| wait_error_detail(session, &err))?;
        if let Some(url) = extract_login_url(&text) {
            return Ok(url);
        }
        match next_tui_action(&text, &progress) {
            Some(TuiAction::AcceptTheme) => {
                session
                    .send_key(Key::Enter)
                    .map_err(|e| format!("could not accept the Claude Code theme screen: {e}"))?;
                progress.theme_accepted = true;
            }
            Some(TuiAction::AcceptWorkspaceTrust) => {
                session.send_key(Key::Enter).map_err(|e| {
                    format!("could not accept the Claude Code workspace trust screen: {e}")
                })?;
                progress.trust_accepted = true;
            }
            Some(TuiAction::SendLogin) => {
                session
                    .send_text("/login")
                    .and_then(|()| session.send_key(Key::Enter))
                    .map_err(|e| format!("could not type /login at the Claude Code prompt: {e}"))?;
                progress.login_sent = true;
            }
            Some(TuiAction::SelectLoginMethod) => {
                session.send_key(Key::Enter).map_err(|e| {
                    format!("could not select the Claude subscription login method: {e}")
                })?;
                progress.method_selected = true;
            }
            None => {
                return Err(format!(
                    "Claude Code reached an unrecognized screen; last output: {}",
                    session.transcript_tail(400)
                ));
            }
        }
    }
}

/// Preserve the existing custom-argument behaviour: wait for whichever login
/// URL the configured command prints without sending TUI input first.
fn wait_for_login_url(session: &PtySession, config: &LoginConfig) -> Result<String, String> {
    let text = session
        .wait_for(
            |text| extract_login_url(text).is_some(),
            config.idle_settle,
            config.url_timeout,
        )
        .map_err(|err| wait_error_detail(session, &err))?;
    extract_login_url(&text).ok_or_else(|| {
        format!(
            "authorization URL disappeared; last output: {}",
            session.transcript_tail(400)
        )
    })
}

fn wait_error_detail(session: &PtySession, err: &WaitError) -> String {
    match err {
        WaitError::Timeout => format!("timed out; last output: {}", session.transcript_tail(400)),
        WaitError::ChildExited(_) => {
            format!("{err}; last output: {}", session.transcript_tail(400))
        }
    }
}

/// Type the code into the live session and decide what happened.
fn submit_and_finalize(config: &LoginConfig, pty: &PtySession, code: &str) -> Outcome {
    if let Err(e) = pty.send_text(code).and_then(|()| pty.send_key(Key::Enter)) {
        return Outcome::Failed(format!("could not send the code to the login process: {e}"));
    }

    // Either the CLI prints a verdict, or it simply exits. Both are handled;
    // the authoritative check is whether a credential exists afterwards.
    let _ = pty.wait_for(
        |text| {
            SUCCESS_MARKERS.iter().any(|m| text.contains(m))
                || FAILURE_MARKERS.iter().any(|m| text.contains(m))
        },
        config.idle_settle,
        config.code_timeout,
    );
    if !pty.is_running() {
        let _ = pty.wait_for_exit(Duration::from_secs(1));
    }

    let transcript = pty.transcript();
    if let Some(credential) = read_credential(&config.claude_code_home) {
        return Outcome::Authorized {
            expires_at: credential.expires_at,
        };
    }
    // `claude setup-token` prints a long-lived token instead of writing a
    // credential file. Persisting it in the layout `crate::oauth` reads is
    // what makes the deployment authorized.
    if let Some(token) = extract_token(&transcript) {
        return match write_credential(&config.claude_code_home, &token) {
            Ok(()) => Outcome::Authorized { expires_at: None },
            Err(e) => Outcome::Failed(format!(
                "login succeeded but the credential could not be saved: {e}"
            )),
        };
    }
    let failure = FAILURE_MARKERS
        .iter()
        .find(|marker| transcript.contains(**marker))
        .map_or_else(
            || {
                format!(
                    "no credential was produced; last output: {}",
                    excerpt(&transcript, code, 400)
                )
            },
            |marker| {
                format!(
                    "login rejected ({marker}); last output: {}",
                    excerpt(&transcript, code, 400)
                )
            },
        );
    Outcome::Failed(failure)
}

/// A credential the router can now read.
struct FoundCredential {
    /// Expiry timestamp in milliseconds, when the credential carries one.
    expires_at: Option<i64>,
}

/// Probe the credential directory the same way the proxy does.
fn read_credential(home: &Path) -> Option<FoundCredential> {
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home);
    reader.read_token().ok().map(|token| FoundCredential {
        expires_at: token.expires_at_ms,
    })
}

/// Write a Claude Code credential file in the nested layout the router reads.
fn write_credential(home: &Path, token: &str) -> std::io::Result<()> {
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
fn excerpt(text: &str, code: &str, limit: usize) -> String {
    let redacted = crate::login_url::redact_value(&crate::login_url::redact_secrets(text), code);
    tail(&redacted, limit)
}

/// Last `limit` characters of `text`, trimmed.
fn tail(text: &str, limit: usize) -> String {
    let trimmed = text.trim();
    let count = trimmed.chars().count();
    if count <= limit {
        return trimmed.to_string();
    }
    trimmed.chars().skip(count - limit).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tui_only_types_into_recognized_screens() {
        let progress = TuiProgress::default();
        let rendered_theme = crate::login_pty::strip_ansi(
            "Choose\x1b[9Gthe\x1b[13Gtext\x1b[18Gstyle\x1b[24Gthat\x1b[29Glooks\x1b[35Gbest\x1b[40Gwith\x1b[45Gyour\x1b[50Gterminal",
        );
        assert_eq!(
            next_tui_action(&rendered_theme, &progress),
            Some(TuiAction::AcceptTheme)
        );
        assert_eq!(
            next_tui_action("A future, unknown onboarding screen", &progress),
            None
        );
    }

    #[test]
    fn login_config_defaults_to_bare_tui() {
        assert!(LoginConfig::default().args.is_empty());
    }

    /// Build a session that already reached `status`, settled `age` ago.
    fn settled_session(id: &str, status: LoginStatus, age: chrono::Duration) -> Arc<Session> {
        Arc::new(Session {
            id: id.to_string(),
            url: "https://claude.ai/oauth/authorize".to_string(),
            deadline: Utc::now() + chrono::Duration::seconds(900),
            state: Mutex::new(SessionState {
                status,
                expires_at: None,
                error: None,
                pty: None,
                settled_at: Some(Utc::now() - age),
            }),
        })
    }

    /// The registry must not grow for the lifetime of the process. A finished
    /// session keeps its entry only long enough for the client to read the
    /// verdict; after that it is forgotten.
    #[test]
    fn finished_sessions_are_evicted_once_their_result_has_been_retained() {
        let manager = LoginManager::new(LoginConfig::default());
        let fresh = settled_session("fresh", LoginStatus::Authorized, chrono::Duration::zero());
        let stale = settled_session(
            "stale",
            LoginStatus::Failed,
            terminal_retention() + chrono::Duration::seconds(1),
        );
        {
            let mut sessions = manager.lock_sessions();
            sessions.insert("fresh".to_string(), fresh);
            sessions.insert("stale".to_string(), stale);
        }

        manager.sweep();

        assert!(
            manager.status("fresh").is_some(),
            "a just-finished login must still be pollable"
        );
        assert!(
            manager.status("stale").is_none(),
            "a long-finished login must not occupy the registry forever"
        );
    }

    /// A session that expires waiting for the human is terminal too, so it
    /// must start the retention clock rather than living on.
    #[test]
    fn an_expired_session_becomes_evictable() {
        let manager = LoginManager::new(LoginConfig::default());
        let session = Arc::new(Session {
            id: "gone".to_string(),
            url: String::new(),
            deadline: Utc::now() - chrono::Duration::seconds(1),
            state: Mutex::new(SessionState {
                status: LoginStatus::AwaitingCode,
                expires_at: None,
                error: None,
                pty: None,
                settled_at: None,
            }),
        });
        manager
            .lock_sessions()
            .insert("gone".to_string(), Arc::clone(&session));

        manager.sweep();
        assert_eq!(
            session.view().status,
            LoginStatus::Expired,
            "the TTL must still expire the session"
        );
        let settled = session
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .settled_at;
        assert!(settled.is_some(), "expiry must start the retention clock");
    }

    /// A failed login quotes the terminal back to the caller. `SUCCESS_MARKERS`
    /// contains `sk-ant-oat` precisely because the token is printed there, so
    /// the excerpt must not carry it — nor the code the human pasted.
    #[test]
    fn a_failure_excerpt_carries_neither_the_token_nor_the_pasted_code() {
        let code = "authcode-9f3a2b7c";
        let transcript =
            format!("Paste code: {code}\nrejected\nleftover token sk-ant-oat01-SECRETVALUE0001\n");
        let text = excerpt(&transcript, code, 400);
        assert!(!text.contains("SECRETVALUE0001"), "{text}");
        assert!(!text.contains(code), "{text}");
        assert!(text.contains("rejected"), "context is still useful: {text}");
    }

    #[test]
    fn write_credential_is_readable_by_the_oauth_reader() {
        let dir = tempfile::tempdir().unwrap();
        write_credential(dir.path(), "sk-ant-oat01-testtoken").unwrap();
        let provider = crate::oauth::OAuthProvider::new(dir.path().to_str().unwrap());
        assert_eq!(provider.get_token().unwrap(), "sk-ant-oat01-testtoken");
    }

    #[test]
    fn ensure_writable_dir_creates_missing_directories() {
        let dir = tempfile::tempdir().unwrap();
        let nested = dir.path().join("a/b/claude");
        ensure_writable_dir(&nested).unwrap();
        assert!(nested.is_dir());
    }

    #[test]
    fn disabled_manager_refuses_to_begin() {
        let manager = LoginManager::new(LoginConfig {
            enabled: false,
            ..LoginConfig::default()
        });
        let result = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(manager.begin());
        assert!(matches!(result, Err(LoginError::Disabled)));
    }
}
