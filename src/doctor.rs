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

/// Exactly which client headers this deployment relays to a vendor.
///
/// The proxy hides the caller's address, so an operator who checks the egress
/// IP — the obvious check — concluded they were private, while the client's
/// OS, architecture, runtime build and a stable session id travelled on. A
/// privacy property nobody can check is one nobody can rely on, and verifying
/// this one meant hand-parsing the request store (issue #332).
#[must_use]
pub fn forwarded_header_report() -> Vec<String> {
    let mut report = vec![format!(
        "{:<23}: {}",
        "upstream_headers",
        crate::proxy::forwarded_client_headers().join(", ")
    )];
    report.push(format!(
        "{:<23}: {}",
        "upstream_user_agent",
        crate::proxy::router_user_agent()
    ));
    report.push(format!(
        "{:<23}: {}",
        "upstream_dropped",
        concat!(
            "every other client header, including x-stainless-*, ",
            "the client user-agent, accept-language, ",
            "x-claude-code-session-id and any x-forwarded-for"
        )
    ));
    report
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

/// The operator-facing verdict for one credential.
///
/// `expiresAt` is a hint rather than an authority, so an expired-looking token
/// is still probed: the catalog endpoint is what actually knows whether a
/// credential works. That is why "expired" and "rejected" are separate
/// dimensions here, and why a token can be expired on disk yet accepted
/// upstream.
const fn credential_status(was_expired: bool, still_expired: bool, rejected: bool) -> &'static str {
    match (was_expired, still_expired, rejected) {
        (_, true, true) => "found, token EXPIRED and REJECTED",
        (_, true, false) => "found, token EXPIRED on disk but ACCEPTED upstream",
        (true, false, true) => "found, token REJECTED after refresh",
        (false, _, true) => "found, token REJECTED",
        (true, false, false) => "found, token OK (refreshed durably)",
        (false, false, false) => "found, token OK",
    }
}

/// Where a credential was read from, for the operator-facing line.
///
/// An operator looking at a valid-looking file while the router reports
/// `rejected` has no way to see that the two are reading different places, so
/// the store is named rather than implied (issue #249). A keychain credential
/// is described by its entry, since it has no path to print.
fn credential_location(
    provider: SubscriptionProvider,
    origin: crate::platform_keychain::Origin,
    path: &std::path::Path,
) -> String {
    match origin {
        crate::platform_keychain::Origin::Keychain => {
            crate::platform_keychain::service_name(provider).map_or_else(
                || String::from("platform keychain"),
                |service| format!("keychain {service:?}"),
            )
        }
        crate::platform_keychain::Origin::File => path.display().to_string(),
    }
}

/// Report credential and live-catalog health for every provider.
///
/// Expired credentials are refreshed durably before their catalogs are
/// fetched. Returns `true` when a present credential cannot become healthy or
/// cannot fetch its catalog.
/// `data_dir` is where a terminal refusal learned here is
/// recorded, so `accounts list` — which performs no refresh of its own — stops
/// contradicting this command about the same credential (issue #245).
pub async fn subscription_catalog_diagnostics(
    _active_provider: SubscriptionProvider,
    claude_home: &str,
    user_home: &str,
    data_dir: Option<&std::path::Path>,
) -> bool {
    let readers = all_subscription_readers(claude_home, user_home);
    let client = reqwest::Client::new();
    let token_cache = data_dir.map_or_else(
        || {
            let cache = crate::refresh::TokenCache::new();
            cache.register_readers(crate::credential_recovery_store::PRIMARY_ACCOUNT, &readers);
            cache
        },
        |data_dir| crate::refresh::TokenCache::registered_for(&readers, data_dir),
    );
    let now_ms = chrono::Utc::now().timestamp_millis();
    let mut catalog_error = false;
    for reader in readers {
        let provider = reader.provider();
        let label = format!("{provider} subscription");
        let path = reader
            .discover_credential_path()
            .unwrap_or_else(|| reader.home().to_path_buf());
        let origin = reader
            .read_token_from()
            .map_or(crate::platform_keychain::Origin::File, |(_, origin)| origin);
        let disk_token = match token_cache
            .load_authoritative(provider, crate::credential_recovery_store::PRIMARY_ACCOUNT)
            .await
        {
            Ok(Some(token)) => token,
            Ok(None) => {
                println!("{label:<23}: {} (MISSING)", reader.home().display());
                continue;
            }
            Err(_) => {
                println!("{label:<23}: {provider} credential store (found, NO TOKEN)");
                println!(
                    "{:<23}: ERROR (credential is unreadable)",
                    format!("{provider} catalog")
                );
                catalog_error = true;
                continue;
            }
        };
        let was_expired = disk_token.is_expired(now_ms);
        let Ok(token) = token_cache
            .get_fresh_registered(
                &client,
                provider,
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                now_ms,
            )
            .await
        else {
            let location = credential_location(provider, origin, &path);
            println!(
                "{label:<23}: {location} (found, refresh FAILED, store: {})",
                origin.label()
            );
            println!(
                "{:<23}: ERROR (credential refresh failed)",
                format!("{provider} refresh")
            );
            println!(
                "{:<23}: ERROR (credential refresh failed before catalog probe)",
                format!("{provider} catalog")
            );
            catalog_error = true;
            continue;
        };
        // `expiresAt` is a hint, so a still-expired token is probed rather than
        // declared dead: the catalog endpoint is what actually knows.
        let still_expired = token.is_expired(now_ms);
        let catalog = fetch_provider_catalog(&client, provider, &token, None).await;
        let rejected = catalog
            .as_ref()
            .is_err_and(|error| is_credential_rejection(error));
        let status = credential_status(was_expired, still_expired, rejected);
        let location = credential_location(provider, origin, &path);
        println!(
            "{label:<23}: {location} ({status}, store: {})",
            origin.label()
        );
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

/// Data-directory-backed variant of [`subscription_catalog_diagnostics`].
pub async fn subscription_catalog_diagnostics_in(
    active_provider: SubscriptionProvider,
    claude_home: &str,
    user_home: &str,
    data_dir: &std::path::Path,
) -> bool {
    subscription_catalog_diagnostics(active_provider, claude_home, user_home, Some(data_dir)).await
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn one_successful_qwen_catalog() -> (
        String,
        std::sync::Arc<std::sync::atomic::AtomicUsize>,
        tokio::task::JoinHandle<()>,
    ) {
        use std::sync::atomic::{AtomicUsize, Ordering};
        use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("loopback listener");
        let base = format!(
            "http://{}",
            listener.local_addr().expect("listener address")
        );
        let requests = std::sync::Arc::new(AtomicUsize::new(0));
        let observed = std::sync::Arc::clone(&requests);
        let server = tokio::spawn(async move {
            if let Ok(Ok((mut socket, _))) =
                tokio::time::timeout(std::time::Duration::from_millis(500), listener.accept()).await
            {
                let mut buffer = [0_u8; 4096];
                let _ = socket.read(&mut buffer).await;
                observed.fetch_add(1, Ordering::SeqCst);
                let body = r#"{"data":[{"id":"synthetic-model"}]}"#;
                socket
                    .write_all(
                        format!(
                            "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                            body.len()
                        )
                        .as_bytes(),
                    )
                    .await
                    .expect("catalog response");
            }
        });
        (base, requests, server)
    }

    fn config(command: &str, args: &[&str]) -> LoginConfig {
        LoginConfig {
            command: command.to_string(),
            args: args.iter().map(|value| (*value).to_string()).collect(),
            ..LoginConfig::default()
        }
    }

    #[tokio::test]
    async fn refresh_storage_failure_is_a_diagnostic_failure_before_catalog_probe() {
        use std::sync::atomic::Ordering;

        let root = tempfile::tempdir().expect("temp root");
        let user_home = root.path().join("user");
        let qwen_home = user_home.join(".qwen");
        std::fs::create_dir_all(&qwen_home).expect("qwen home");
        let (resource_url, catalog_requests, server) = one_successful_qwen_catalog().await;
        std::fs::write(
            qwen_home.join("oauth_creds.json"),
            serde_json::to_vec(&serde_json::json!({
                "access_token": "expired-access",
                "refresh_token": "refresh-link",
                "expiry_date": 1,
                "resource_url": resource_url,
                "vendor_field": "preserve-me"
            }))
            .expect("serialize credential"),
        )
        .expect("seed qwen credential");
        let blocked_data_dir = root.path().join("not-a-directory");
        std::fs::write(&blocked_data_dir, b"occupied").expect("block recovery directory");

        let failed = subscription_catalog_diagnostics_in(
            SubscriptionProvider::Qwen,
            root.path().join("claude").to_str().expect("claude home"),
            user_home.to_str().expect("user home"),
            &blocked_data_dir,
        )
        .await;
        server.await.expect("catalog server task");

        assert!(failed, "refresh durability failure was reported healthy");
        assert_eq!(
            catalog_requests.load(Ordering::SeqCst),
            0,
            "a catalog success must not hide an unsafe refresh"
        );
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

    /// A keychain credential is described by its entry, not by a file path it
    /// does not have -- naming the store is the diagnosability fix in #249.
    #[test]
    fn a_keychain_credential_is_described_by_its_entry() {
        let location = credential_location(
            SubscriptionProvider::Claude,
            crate::platform_keychain::Origin::Keychain,
            std::path::Path::new("/Users/someone/.claude/.credentials.json"),
        );

        if cfg!(target_os = "macos") {
            assert_eq!(location, "keychain \"Claude Code-credentials\"");
        } else {
            assert_eq!(location, "platform keychain");
        }
        assert!(
            !location.contains(".credentials.json"),
            "a keychain credential must not be reported as a file: {location}"
        );
    }

    /// A provider with no named store still reports a store rather than a path
    /// it did not read, so the line never claims the wrong origin.
    #[test]
    fn a_storeless_provider_reports_a_generic_store() {
        let location = credential_location(
            SubscriptionProvider::Gemini,
            crate::platform_keychain::Origin::Keychain,
            std::path::Path::new("/home/someone/.gemini/oauth_creds.json"),
        );

        assert_eq!(location, "platform keychain");
    }

    /// A file credential keeps reporting its path, which is what every
    /// non-macOS platform and every other provider sees.
    #[test]
    fn a_file_credential_is_described_by_its_path() {
        let location = credential_location(
            SubscriptionProvider::Codex,
            crate::platform_keychain::Origin::File,
            std::path::Path::new("/home/someone/.codex/auth.json"),
        );

        assert_eq!(location, "/home/someone/.codex/auth.json");
    }

    /// A credential that refreshed successfully must say so, rather than being
    /// reported by the expiry that sent it to be refreshed.
    #[test]
    fn a_refreshed_credential_reads_as_ok() {
        assert_eq!(
            credential_status(true, false, false),
            "found, token OK (refreshed durably)"
        );
        assert_eq!(credential_status(false, false, false), "found, token OK");
    }

    /// The case from issue #249: expired on disk and refused upstream.
    #[test]
    fn an_expired_and_refused_credential_says_both() {
        let status = credential_status(true, true, true);

        assert!(status.contains("EXPIRED"), "{status}");
        assert!(status.contains("REJECTED"), "{status}");
    }

    /// An expiry is a hint, so a token the upstream still accepts must not be
    /// reported as dead -- this is what stops `doctor` condemning a credential
    /// the vendor client is happily using.
    #[test]
    fn an_expired_but_accepted_credential_is_not_condemned() {
        let status = credential_status(true, true, false);

        assert!(status.contains("ACCEPTED upstream"), "{status}");
        assert!(!status.contains("REJECTED"), "{status}");
    }

    /// A refusal after a successful refresh is distinct from one before it:
    /// the first means the chain is dead, the second that it never worked.
    #[test]
    fn a_refusal_names_whether_a_refresh_preceded_it() {
        assert_eq!(
            credential_status(true, false, true),
            "found, token REJECTED after refresh"
        );
        assert_eq!(
            credential_status(false, false, true),
            "found, token REJECTED"
        );
    }

    /// The privacy property is checkable without reading the source.
    ///
    /// Verifying what reached the vendor previously meant hand-parsing
    /// `requests.jsonl`, so an operator who checked the egress IP concluded
    /// they were private while the client's machine identity travelled on
    /// (issue #332).
    #[test]
    fn the_report_names_what_is_forwarded_and_what_is_not() {
        let report = forwarded_header_report().join("\n");
        // What travels.
        for forwarded in crate::proxy::forwarded_client_headers() {
            assert!(
                report.contains(forwarded),
                "the report must name {forwarded}: {report}"
            );
        }
        assert!(
            report.contains(crate::proxy::router_user_agent()),
            "the report must name the identity sent upstream: {report}"
        );
        // And what does not, named explicitly rather than left to inference.
        for dropped in [
            "x-stainless",
            "accept-language",
            "x-claude-code-session-id",
            "x-forwarded-for",
        ] {
            assert!(
                report.contains(dropped),
                "the report must say {dropped} is dropped: {report}"
            );
        }
    }
}
