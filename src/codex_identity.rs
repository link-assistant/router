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

fn nonempty_env(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
}

/// Match the terminal token used by Codex's terminal-detection crate without
/// executing anything selected through `PATH`.
fn terminal_user_agent() -> String {
    if let Some(program) = nonempty_env("TERM_PROGRAM")
        && !program.eq_ignore_ascii_case("tmux")
    {
        return sanitized_token(
            &nonempty_env("TERM_PROGRAM_VERSION")
                .map_or_else(|| program.clone(), |version| format!("{program}/{version}")),
        );
    }
    for (variable, name) in [
        ("GHOSTTY_RESOURCES_DIR", "Ghostty"),
        ("ITERM_SESSION_ID", "iTerm.app"),
        ("ITERM_PROFILE", "iTerm.app"),
        ("TERM_SESSION_ID", "Apple_Terminal"),
        ("KITTY_WINDOW_ID", "kitty"),
        ("ALACRITTY_SOCKET", "Alacritty"),
        ("GNOME_TERMINAL_SCREEN", "gnome-terminal"),
        ("WT_SESSION", "WindowsTerminal"),
    ] {
        if std::env::var_os(variable).is_some() {
            return name.to_string();
        }
    }
    for (variable, name) in [
        ("WEZTERM_VERSION", "WezTerm"),
        ("KONSOLE_VERSION", "Konsole"),
        ("VTE_VERSION", "VTE"),
    ] {
        if let Some(version) = nonempty_env(variable) {
            return sanitized_token(&format!("{name}/{version}"));
        }
    }
    sanitized_token(&nonempty_env("TERM").unwrap_or_else(|| "unknown".into()))
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
}
