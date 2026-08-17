//! Subscription diagnostics shared by the `doctor` CLI command.

use crate::claude_auth::ClaudeAuthMode;
use crate::login::LoginConfig;
use crate::model_catalog::{fetch_provider_catalog, is_credential_rejection};
use crate::subscription::{SubscriptionProvider, all_subscription_readers};

/// One line per Claude login mode, saying whether it can run here and which
/// scopes it would request.
///
/// Issue #193: an operator must be able to see *before* starting a login that
/// the mode they intend to use is actually available in this image, rather than
/// discovering a missing binary from an HTTP 502.
#[must_use]
pub fn login_mode_report(login: &LoginConfig) -> Vec<String> {
    // Both real modes are in-process OAuth, so neither depends on a binary.
    // Only an operator-supplied compatibility backend can be unavailable.
    let uses_external = login.command != "claude";
    let selected = if login.args.iter().any(|argument| argument == "setup-token") {
        ClaudeAuthMode::SetupToken
    } else {
        ClaudeAuthMode::Full
    };

    let mut lines = Vec::new();
    for mode in [ClaudeAuthMode::Full, ClaudeAuthMode::SetupToken] {
        let marker = if mode == selected { " (default)" } else { "" };
        let availability = if uses_external {
            let resolved = resolve_in_path(&login.command);
            resolved.map_or_else(
                || {
                    format!(
                        "UNAVAILABLE — LOGIN_CLI_COMMAND `{}` is not in PATH",
                        login.command
                    )
                },
                |path| format!("via {}", path.display()),
            )
        } else {
            "available (in-process OAuth)".to_string()
        };
        lines.push(format!(
            "login_mode {:<12}: {availability}{marker}; scopes: {}",
            mode.name(),
            mode.scopes()
        ));
    }
    lines
}

/// Locate an executable on `PATH`, as the process spawner would.
fn resolve_in_path(command: &str) -> Option<std::path::PathBuf> {
    let candidate = std::path::Path::new(command);
    if candidate.is_absolute() {
        return candidate.is_file().then(|| candidate.to_path_buf());
    }
    std::env::var_os("PATH").and_then(|paths| {
        std::env::split_paths(&paths)
            .map(|directory| directory.join(command))
            .find(|path| path.is_file())
    })
}

/// Report credential and live-catalog health for every provider.
///
/// Expired credentials are refreshed in memory before their catalogs are
/// fetched. Returns `true` when a present credential cannot become healthy or
/// cannot fetch its catalog.
pub async fn subscription_catalog_diagnostics(
    _active_provider: SubscriptionProvider,
    claude_home: &str,
    user_home: &str,
) -> bool {
    let readers = all_subscription_readers(claude_home, user_home);
    let client = reqwest::Client::new();
    let token_cache = crate::refresh::TokenCache::new();
    let now_ms = chrono::Utc::now().timestamp_millis();
    let mut catalog_error = false;
    for reader in readers {
        let provider = reader.provider();
        let label = format!("{provider} subscription");
        let Some(path) = reader.discover_credential_path() else {
            println!("{label:<23}: {} (MISSING)", reader.home().display());
            continue;
        };
        let disk_token = match reader.read_token() {
            Ok(token) => token,
            Err(error) => {
                println!("{label:<23}: {} (found, NO TOKEN: {error})", path.display());
                println!(
                    "{:<23}: ERROR (credential is unreadable)",
                    format!("{provider} catalog")
                );
                catalog_error = true;
                continue;
            }
        };
        let was_expired = disk_token.is_expired(now_ms);
        let token = token_cache
            .get_fresh(&client, provider, disk_token, now_ms)
            .await;
        // `expiresAt` is a hint, so a still-expired token is probed rather than
        // declared dead: the catalog endpoint is what actually knows.
        let still_expired = token.is_expired(now_ms);
        let catalog = fetch_provider_catalog(&client, provider, &token, None).await;
        let rejected = catalog
            .as_ref()
            .is_err_and(|error| is_credential_rejection(error));
        let status = match (was_expired, still_expired, rejected) {
            (_, true, true) => "found, token EXPIRED and REJECTED",
            (_, true, false) => "found, token EXPIRED on disk but ACCEPTED upstream",
            (true, false, true) => "found, token REJECTED after refresh",
            (false, _, true) => "found, token REJECTED",
            (true, false, false) => "found, token OK (refreshed in memory)",
            (false, false, false) => "found, token OK",
        };
        println!("{label:<23}: {} ({status})", path.display());
        if let Some(error) = token_cache.last_refresh_error(provider) {
            println!("{:<23}: {error}", format!("{provider} refresh"));
        }

        match catalog {
            Ok(models) => println!(
                "{:<23}: OK ({} live model(s))",
                format!("{provider} catalog"),
                models.len()
            ),
            Err(error) => {
                println!("{:<23}: ERROR ({error})", format!("{provider} catalog"));
                catalog_error = true;
            }
        }
    }
    catalog_error
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(command: &str, args: &[&str]) -> LoginConfig {
        LoginConfig {
            command: command.to_string(),
            args: args.iter().map(|value| (*value).to_string()).collect(),
            ..LoginConfig::default()
        }
    }

    /// Both in-process modes are always available, and the report names the
    /// scopes each would request before a login is attempted (issue #193).
    #[test]
    fn both_native_modes_are_reported_available() {
        let report = login_mode_report(&config("claude", &[])).join("\n");
        assert!(report.contains("login_mode full"), "{report}");
        assert!(report.contains("login_mode setup-token"), "{report}");
        assert_eq!(
            report.matches("available (in-process OAuth)").count(),
            2,
            "{report}"
        );
        assert!(report.contains("user:inference"), "{report}");
        assert!(report.contains("org:create_api_key"), "{report}");
    }

    /// The default marker follows `LOGIN_CLI_ARGS`.
    #[test]
    fn the_configured_mode_is_marked_as_the_default() {
        let full = login_mode_report(&config("claude", &[]));
        assert!(full[0].contains("(default)"), "{full:?}");
        assert!(!full[1].contains("(default)"), "{full:?}");

        let narrow = login_mode_report(&config("claude", &["setup-token"]));
        assert!(!narrow[0].contains("(default)"), "{narrow:?}");
        assert!(narrow[1].contains("(default)"), "{narrow:?}");
    }

    /// An operator-supplied backend that is absent is reported as unavailable
    /// rather than failing later with an HTTP 502.
    #[test]
    fn a_missing_external_command_is_reported_unavailable() {
        let report = login_mode_report(&config("definitely-not-on-path-98765", &[])).join("\n");
        assert!(report.contains("UNAVAILABLE"), "{report}");
        assert!(report.contains("definitely-not-on-path-98765"), "{report}");
    }

    /// An absolute path that exists resolves; one that does not is reported.
    #[test]
    fn an_absolute_command_path_is_probed_directly() {
        let existing = std::env::current_exe().expect("test binary path");
        let report = login_mode_report(&config(&existing.to_string_lossy(), &[])).join("\n");
        assert!(report.contains("via "), "{report}");
        assert!(!report.contains("UNAVAILABLE"), "{report}");

        let missing = login_mode_report(&config("/nonexistent/router/login-cli", &[])).join("\n");
        assert!(missing.contains("UNAVAILABLE"), "{missing}");
    }

    #[test]
    fn resolve_in_path_finds_a_real_executable() {
        // `sh` exists on every platform this test runs on.
        assert!(
            resolve_in_path("sh").is_some() || cfg!(windows),
            "sh should be resolvable"
        );
        assert!(resolve_in_path("definitely-not-on-path-98765").is_none());
    }
}
