//! The PTY compatibility backend for `LOGIN_CLI_COMMAND`.
//!
//! Split out of [`crate::login`], which owns the session registry and the
//! in-process OAuth that both real login modes use. Nothing here runs in a
//! default deployment: it exists only so an operator can point the router at
//! their own login program, and it is the one path that needs an external
//! binary (issue #193).

use std::sync::Arc;
use std::time::{Duration, Instant};

use portable_pty::CommandBuilder;

use crate::login::{
    FAILURE_MARKERS, LOGIN_METHOD_MARKER, LoginConfig, LoginError, Outcome, READY_PROMPT_MARKER,
    SUCCESS_MARKERS, THEME_PICKER_MARKER, WORKSPACE_TRUST_MARKER, excerpt, read_credential,
    write_credential,
};
use crate::login_pty::{Key, PtySession, WaitError};
use crate::login_url::{extract_login_url, extract_token};

/// Spawn the login CLI and block until its authorization URL has settled.
pub fn spawn_and_wait_for_url(
    config: &LoginConfig,
) -> Result<(Arc<PtySession>, String), LoginError> {
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
    if let Some(cache) = &config.package_cache {
        command.env("BUN_INSTALL_CACHE_DIR", cache);
    }
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
    completed: Vec<TuiAction>,
}

impl TuiProgress {
    fn needs(&self, action: TuiAction) -> bool {
        !self.completed.contains(&action)
    }

    fn complete(&mut self, action: TuiAction) {
        self.completed.push(action);
    }
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
    let compact = compact_terminal_text(text);
    if progress.needs(TuiAction::AcceptTheme) && compact.contains(THEME_PICKER_MARKER) {
        Some(TuiAction::AcceptTheme)
    } else if progress.needs(TuiAction::AcceptWorkspaceTrust)
        && compact.contains(WORKSPACE_TRUST_MARKER)
    {
        Some(TuiAction::AcceptWorkspaceTrust)
    } else if progress.needs(TuiAction::SendLogin) && compact.contains(READY_PROMPT_MARKER) {
        Some(TuiAction::SendLogin)
    } else if progress.needs(TuiAction::SelectLoginMethod) && compact.contains(LOGIN_METHOD_MARKER)
    {
        Some(TuiAction::SelectLoginMethod)
    } else {
        None
    }
}

/// Match terminal text independently of whether a TUI printed spaces or used
/// cursor-positioning escapes that disappeared during ANSI stripping.
fn compact_terminal_text(text: &str) -> String {
    text.chars().filter(|ch| !ch.is_whitespace()).collect()
}

fn contains_marker(compact: &str, markers: &[&str]) -> bool {
    markers.iter().any(|marker| compact.contains(marker))
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
        let action = next_tui_action(&text, &progress);
        match action {
            Some(TuiAction::AcceptTheme) => {
                session
                    .send_key(Key::Enter)
                    .map_err(|e| format!("could not accept the Claude Code theme screen: {e}"))?;
            }
            Some(TuiAction::AcceptWorkspaceTrust) => {
                session.send_key(Key::Enter).map_err(|e| {
                    format!("could not accept the Claude Code workspace trust screen: {e}")
                })?;
            }
            Some(TuiAction::SendLogin) => {
                session
                    .send_text("/login")
                    .and_then(|()| session.send_key(Key::Enter))
                    .map_err(|e| format!("could not type /login at the Claude Code prompt: {e}"))?;
            }
            Some(TuiAction::SelectLoginMethod) => {
                session.send_key(Key::Enter).map_err(|e| {
                    format!("could not select the Claude subscription login method: {e}")
                })?;
            }
            None => {
                return Err(format!(
                    "Claude Code reached an unrecognized screen; last output: {}",
                    session.transcript_tail(400)
                ));
            }
        }
        if let Some(action) = action {
            progress.complete(action);
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
pub fn submit_and_finalize(config: &LoginConfig, pty: &PtySession, code: &str) -> Outcome {
    // The default flow is an Ink TUI. A real terminal wraps pasted text so the
    // controlled input receives it as one transaction instead of racing its
    // repaint one keypress at a time. Preserve raw input for the explicit
    // `setup-token` alternative, whose line reader does not enable this mode.
    let send_result = if config.args.is_empty() {
        pty.send_bracketed_paste(code)
    } else {
        pty.send_text(code)
    };
    if let Err(e) = send_result {
        return Outcome::Failed(format!("could not send the code to the login process: {e}"));
    }
    if let Err(e) = pty.wait_idle(config.idle_settle, config.code_timeout) {
        return Outcome::Failed(format!(
            "login timed out while waiting for the pasted authorization code to settle: {e}"
        ));
    }
    if let Err(e) = pty.send_key(Key::Enter) {
        return Outcome::Failed(format!("could not submit the authorization code: {e}"));
    }

    // Either the CLI prints a verdict, or it simply exits. Both are handled;
    // the authoritative check is whether a credential exists afterwards.
    let verdict = pty.wait_for(
        |text| {
            let compact = compact_terminal_text(text);
            contains_marker(&compact, SUCCESS_MARKERS) || contains_marker(&compact, FAILURE_MARKERS)
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
    let compact = compact_terminal_text(&transcript);
    let failure = if contains_marker(&compact, FAILURE_MARKERS) {
        format!(
            "authorization code was rejected; CLI reported: {}. Request a fresh login URL and code",
            rejection_verdict(&compact)
        )
    } else if matches!(verdict, Err(WaitError::Timeout)) {
        format!(
            "login timed out waiting for the CLI to accept or reject the authorization code; last output: {}",
            excerpt(&transcript, code, 400)
        )
    } else {
        format!(
            "login process ended without producing a credential; last output: {}",
            excerpt(&transcript, code, 400)
        )
    };
    Outcome::Failed(failure)
}

/// Turn the CLI's known compacted verdicts back into readable API text.
fn rejection_verdict(compact: &str) -> String {
    const STATUS_PREFIX: &str = "OAutherror:Requestfailedwithstatuscode";

    if compact.contains("OAutherror:Invalidcode") {
        return "OAuth error: Invalid code. Please make sure the full code was copied".into();
    }
    if let Some(start) = compact.rfind(STATUS_PREFIX) {
        let rest = &compact[start + STATUS_PREFIX.len()..];
        let status: String = rest.chars().take_while(char::is_ascii_digit).collect();
        if !status.is_empty() {
            return format!("OAuth error: Request failed with status code {status}");
        }
    }
    if compact.contains("invalid_grant") {
        return "OAuth error: invalid_grant".into();
    }
    if compact.contains("Authenticationfailed") {
        return "Authentication failed".into();
    }
    if compact.contains("Loginfailed") {
        return "Login failed".into();
    }
    "OAuth error: the CLI rejected the authorization code".into()
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
    fn compacted_oauth_verdicts_are_restored_for_api_errors() {
        assert_eq!(
            rejection_verdict("promptOAutherror:Invalidcode.Pleasemakesurethefullcodewascopied"),
            "OAuth error: Invalid code. Please make sure the full code was copied"
        );
        assert_eq!(
            rejection_verdict("promptOAutherror:Requestfailedwithstatuscode400"),
            "OAuth error: Request failed with status code 400"
        );
    }
}
