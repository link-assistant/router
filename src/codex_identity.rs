//! Exact HTTP identity used by the supported Codex client.

use axum::http::{HeaderMap, HeaderValue};

pub const DEFAULT_CLIENT_VERSION: &str = "0.153.4";
pub const ORIGINATOR: &str = "codex_cli_rs";

/// The supported Codex version, with the same operator override used by model
/// discovery and inference.
#[must_use]
pub fn client_version() -> String {
    std::env::var("CODEX_CLIENT_VERSION").unwrap_or_else(|_| DEFAULT_CLIENT_VERSION.to_string())
}

fn sanitized_token(value: &str) -> String {
    value.replace(
        |character: char| {
            !(character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.' | '/'))
        },
        "_",
    )
}

#[derive(Default)]
struct TmuxClientInfo {
    termtype: Option<String>,
    termname: Option<String>,
}

fn nonempty<F>(read: &F, name: &str) -> Option<String>
where
    F: Fn(&str) -> Option<String>,
{
    read(name).filter(|value| !value.trim().is_empty())
}

fn versioned(name: &str, version: Option<String>) -> String {
    sanitized_token(
        &version.map_or_else(|| name.to_string(), |version| format!("{name}/{version}")),
    )
}

fn tmux_value(format: &str) -> Option<String> {
    let output = std::process::Command::new("tmux")
        .args(["display-message", "-p", format])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let value = String::from_utf8(output.stdout).ok()?;
    (!value.trim().is_empty()).then(|| value.trim().to_string())
}

fn process_tmux_client_info() -> TmuxClientInfo {
    TmuxClientInfo {
        termtype: tmux_value("#{client_termtype}"),
        termname: tmux_value("#{client_termname}"),
    }
}

fn terminal_user_agent_from<F, T>(read: F, tmux_client_info: T) -> String
where
    F: Fn(&str) -> Option<String>,
    T: FnOnce() -> TmuxClientInfo,
{
    if let Some(program) = nonempty(&read, "TERM_PROGRAM") {
        let under_tmux = program.eq_ignore_ascii_case("tmux")
            && (nonempty(&read, "TMUX").is_some() || nonempty(&read, "TMUX_PANE").is_some());
        if under_tmux {
            let client = tmux_client_info();
            if let Some(termtype) = client.termtype.filter(|value| !value.trim().is_empty()) {
                let mut parts = termtype.split_whitespace();
                let name = parts.next().unwrap_or_default();
                return versioned(name, parts.next().map(str::to_string));
            }
            if let Some(termname) = client.termname.filter(|value| !value.trim().is_empty()) {
                return sanitized_token(&termname);
            }
        }
        return versioned(&program, nonempty(&read, "TERM_PROGRAM_VERSION"));
    }

    if read("WEZTERM_VERSION").is_some() {
        return versioned("WezTerm", nonempty(&read, "WEZTERM_VERSION"));
    }
    if ["ITERM_SESSION_ID", "ITERM_PROFILE", "ITERM_PROFILE_NAME"]
        .iter()
        .any(|name| read(name).is_some())
    {
        return "iTerm.app".to_string();
    }
    if read("TERM_SESSION_ID").is_some() {
        return "Apple_Terminal".to_string();
    }
    let term = nonempty(&read, "TERM");
    if read("KITTY_WINDOW_ID").is_some()
        || term.as_deref().is_some_and(|value| value.contains("kitty"))
    {
        return "kitty".to_string();
    }
    if read("ALACRITTY_SOCKET").is_some() || term.as_deref() == Some("alacritty") {
        return "Alacritty".to_string();
    }
    if read("KONSOLE_VERSION").is_some() {
        return versioned("Konsole", nonempty(&read, "KONSOLE_VERSION"));
    }
    if read("GNOME_TERMINAL_SCREEN").is_some() {
        return "gnome-terminal".to_string();
    }
    if read("VTE_VERSION").is_some() {
        return versioned("VTE", nonempty(&read, "VTE_VERSION"));
    }
    if read("WT_SESSION").is_some() {
        return "WindowsTerminal".to_string();
    }
    sanitized_token(term.as_deref().unwrap_or("unknown"))
}

/// Match the terminal token used by the supported Codex release.
fn terminal_user_agent() -> String {
    terminal_user_agent_from(|name| std::env::var(name).ok(), process_tmux_client_info)
}

fn user_agent_for(os_type: &str, os_version: &str, architecture: &str, terminal: &str) -> String {
    format!(
        "{ORIGINATOR}/{} ({os_type} {os_version}; {architecture}) {terminal}",
        client_version()
    )
}

/// Build the complete native Codex identity, including the operating-system,
/// architecture, and terminal token emitted by the official default client.
#[must_use]
pub fn user_agent() -> String {
    let info = os_info::get();
    user_agent_for(
        &info.os_type().to_string(),
        &info.version().to_string(),
        info.architecture().unwrap_or("unknown"),
        &terminal_user_agent(),
    )
}

/// Build the default headers attached by Codex's shared HTTP client.
#[must_use]
pub fn headers(account_id: Option<&str>) -> HeaderMap {
    let mut headers = HeaderMap::new();
    if let Ok(value) = HeaderValue::from_str(&user_agent()) {
        headers.insert("user-agent", value);
    }
    headers.insert("originator", HeaderValue::from_static(ORIGINATOR));
    if let Some(account_id) = account_id
        && let Ok(value) = HeaderValue::from_str(account_id)
    {
        headers.insert("chatgpt-account-id", value);
    }
    headers
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn detected(pairs: &[(&str, &str)], tmux: TmuxClientInfo) -> String {
        let environment = pairs
            .iter()
            .map(|(name, value)| ((*name).to_string(), (*value).to_string()))
            .collect::<HashMap<_, _>>();
        terminal_user_agent_from(|name| environment.get(name).cloned(), || tmux)
    }

    #[test]
    fn identity_is_versioned_and_account_scoped() {
        let headers = headers(Some("account-42"));
        let user_agent = headers["user-agent"].to_str().unwrap();
        assert!(user_agent.starts_with(&format!("{ORIGINATOR}/{DEFAULT_CLIENT_VERSION} (")));
        assert!(user_agent.contains("; "));
        assert!(
            user_agent
                .split(") ")
                .nth(1)
                .is_some_and(|value| !value.is_empty())
        );
        assert_eq!(headers["originator"], ORIGINATOR);
        assert_eq!(headers["chatgpt-account-id"], "account-42");
        assert_eq!(headers.get_all("originator").iter().count(), 1);
    }

    #[test]
    fn native_user_agent_has_the_official_complete_shape() {
        assert_eq!(
            user_agent_for("Mac OS", "15.6", "aarch64", "WarpTerminal/0.2026"),
            format!(
                "{ORIGINATOR}/{DEFAULT_CLIENT_VERSION} (Mac OS 15.6; aarch64) WarpTerminal/0.2026"
            )
        );
    }

    #[test]
    fn invalid_account_header_is_dropped() {
        let headers = headers(Some("not\na header"));
        assert!(!headers.contains_key("chatgpt-account-id"));
    }

    #[test]
    fn terminal_detection_matches_codex_precedence() {
        assert_eq!(
            detected(
                &[
                    ("TERM_PROGRAM", "iTerm.app"),
                    ("TERM_PROGRAM_VERSION", "3.5.14"),
                    ("WEZTERM_VERSION", "20260904"),
                    ("WT_SESSION", "set"),
                ],
                TmuxClientInfo::default(),
            ),
            "iTerm.app/3.5.14"
        );
        assert_eq!(
            detected(
                &[("WEZTERM_VERSION", "20260904"), ("ITERM_SESSION_ID", "set")],
                TmuxClientInfo::default(),
            ),
            "WezTerm/20260904"
        );
        assert_eq!(
            detected(
                &[("ZELLIJ", "set"), ("TERM", "xterm-256color")],
                TmuxClientInfo::default(),
            ),
            "xterm-256color"
        );
    }

    #[test]
    fn tmux_reports_its_underlying_client_when_codex_can_observe_it() {
        assert_eq!(
            detected(
                &[
                    ("TERM_PROGRAM", "tmux"),
                    ("TERM_PROGRAM_VERSION", "3.6"),
                    ("TMUX", "/tmp/tmux.sock"),
                ],
                TmuxClientInfo {
                    termtype: Some("ghostty 1.2.3".into()),
                    termname: Some("xterm-ghostty".into()),
                },
            ),
            "ghostty/1.2.3"
        );
        assert_eq!(
            detected(
                &[
                    ("TERM_PROGRAM", "tmux"),
                    ("TERM_PROGRAM_VERSION", "3.6"),
                    ("TMUX_PANE", "%1"),
                ],
                TmuxClientInfo::default(),
            ),
            "tmux/3.6"
        );
    }
}
