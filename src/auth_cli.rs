//! Foreground provider authorization commands.

use std::process::ExitCode;

use link_assistant_router::cli::{AuthFlow, AuthOp, CLAUDE_AUTH_FLOWS, CODEX_AUTH_FLOWS};
use link_assistant_router::config::Config;
use link_assistant_router::login::{LoginManager, LoginStatus};
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};

/// Let `auth` run without `TOKEN_SECRET`.
///
/// The auth commands neither issue nor validate client tokens, so demanding an
/// unrelated secret only obstructs the operator recovering a subscription — the
/// moment the router is least usable (issue #205). Every other command still
/// requires a real secret, so this substitutes a placeholder for `auth` alone.
#[must_use]
pub fn relax_token_secret_for_auth(
    mut cli: link_assistant_router::cli::Cli,
) -> link_assistant_router::cli::Cli {
    if matches!(
        cli.command.as_ref(),
        Some(link_assistant_router::cli::Command::Auth { .. })
    ) && cli.token_secret.as_deref().is_none_or(str::is_empty)
    {
        cli.token_secret = Some("unused-by-auth".to_string());
    }
    cli
}

pub async fn run(config: &Config, op: &AuthOp) -> ExitCode {
    // Withdrawal is local by construction: it removes files this machine holds,
    // and there is no remote verb for it. Handled before the server dispatch so
    // `auth claude --clear` with a server selected cannot fall through to a
    // remote *authorize*, which is the opposite of what was asked (issue #268).
    if let Some(exit) = run_clear(config, op) {
        return exit;
    }
    // Import is local for the same reason withdrawal is: it reads a directory
    // on this machine and writes this deployment's credential home. Dispatched
    // before the server selection so `--from-claude-home` with a server
    // selected cannot fall through to a remote *authorize* (issue #274).
    if let Some(exit) = crate::auth_import::run_import(config, op).await {
        return exit;
    }
    // `auth` follows the selected server the way `with` does. Writing a local
    // credential while a server is selected made the obvious `server use` →
    // `auth` → `with` sequence silently authorize the wrong router (#246).
    match remote_target(op).await {
        Ok(Some(server)) => return run_remote(config, &server, op).await,
        Ok(None) => {}
        Err(error) => {
            eprintln!("error: {error}");
            return ExitCode::from(1);
        }
    }
    match op {
        AuthOp::Claude {
            code, flow, mode, ..
        } => {
            let mode = match mode.as_deref() {
                Some(value) => {
                    match link_assistant_router::claude_auth::ClaudeAuthMode::parse(value) {
                        Ok(mode) => mode,
                        Err(message) => {
                            eprintln!("error: {message}");
                            return ExitCode::from(2);
                        }
                    }
                }
                None => configured_mode(&config.login),
            };
            run_claude(config, code.clone(), *flow, mode).await
        }
        AuthOp::Codex { flow, port, .. } => run_codex(config, *flow, *port).await,
        AuthOp::Gh {
            from_gh_config,
            token_stdin,
            status,
            ..
        } => run_gh(config, from_gh_config.as_deref(), *token_stdin, *status),
        AuthOp::Status { .. } => status(config).await,
        // `run_import` above returns for every `Import`, so reaching here means
        // clap accepted a shape that dispatch does not know about.
        AuthOp::Import { .. } => {
            eprintln!("error: nothing to import; name a provider or pass --all");
            ExitCode::from(2)
        }
    }
}

/// Store, or report, the GitHub credential the proxy presents upstream.
///
/// The router acts on a caller's behalf against GitHub, so it holds an
/// operator credential of its own. Reading it from a mounted `gh` config lets
/// a deployment reuse an existing login instead of minting a second token
/// (issue #263).
fn run_gh(
    config: &link_assistant_router::config::Config,
    from_gh_config: Option<&str>,
    token_stdin: bool,
    status: bool,
) -> ExitCode {
    use link_assistant_router::github_proxy;

    let stored = github_proxy::stored_credential_path(std::path::Path::new(&config.data_dir));
    if status {
        let source = if stored.is_file() {
            format!("stored at {}", stored.display())
        } else if configured_github_credential(config) {
            "configured from the environment".to_string()
        } else {
            "absent".to_string()
        };
        println!("github credential: {source}");
        return ExitCode::SUCCESS;
    }

    let token = if token_stdin {
        match link_assistant_router::server_command::read_token() {
            Ok(token) => token,
            Err(error) => {
                eprintln!("error: {error}");
                return ExitCode::from(1);
            }
        }
    } else {
        let directory = from_gh_config
            .map(std::path::PathBuf::from)
            .or_else(github_proxy::gh_config_directory);
        let Some(directory) = directory else {
            eprintln!("error: no gh configuration directory; pass --from-gh-config <DIR>");
            return ExitCode::from(1);
        };
        let Some(token) = github_proxy::token_from_gh_config(&directory) else {
            eprintln!(
                "error: no GitHub credential in {}; run `gh auth login` there first",
                directory.display()
            );
            return ExitCode::from(1);
        };
        token
    };

    match github_proxy::store_credential(std::path::Path::new(&config.data_dir), &token) {
        Ok(path) => {
            println!("stored the GitHub credential in {}", path.display());
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

/// Withdraw stored credentials, when this invocation asked to.
///
/// `None` means no `--clear` was requested and the ordinary path should run.
///
/// Each provider reports what was removed and what remains, because a
/// withdrawal that quietly left a credential readable somewhere else is worse
/// than one that never ran: the operator believes the deployment holds no
/// identity when it still does.
fn run_clear(config: &link_assistant_router::config::Config, op: &AuthOp) -> Option<ExitCode> {
    let providers: &[SubscriptionProvider] = match op {
        AuthOp::Claude { clear: true, .. } => &[SubscriptionProvider::Claude],
        AuthOp::Codex { clear: true, .. } => &[SubscriptionProvider::Codex],
        AuthOp::Gh { clear: true, .. } => &[],
        AuthOp::Status {
            clear_all: true, ..
        } => &SubscriptionProvider::ALL,
        _ => return None,
    };
    let clears_github = matches!(
        op,
        AuthOp::Gh { clear: true, .. }
            | AuthOp::Status {
                clear_all: true,
                ..
            }
    );

    let mut failed = false;
    for provider in providers {
        if let Err(error) = clear_provider(config, *provider) {
            eprintln!("error: {error}");
            failed = true;
        }
    }
    if clears_github && let Err(error) = clear_github(config) {
        eprintln!("error: {error}");
        failed = true;
    }
    // Deleting a local file does not revoke anything upstream, and an operator
    // who believes it did has a false sense of cleanup.
    println!(
        "note: this removes local credentials only; a token minted for this \
         deployment is still valid upstream and should be revoked there."
    );
    Some(if failed {
        ExitCode::from(1)
    } else {
        ExitCode::SUCCESS
    })
}

/// Remove one provider's credential files, reporting what went and what stayed.
fn clear_provider(
    config: &link_assistant_router::config::Config,
    provider: SubscriptionProvider,
) -> Result<(), String> {
    let user_home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let reader = SubscriptionReader::new(
        provider,
        crate::auth_import::provider_home(config, provider, &user_home),
    );
    let removed = reader.clear_credentials()?;
    if removed.is_empty() {
        println!("{provider:<8} absent");
    } else {
        for path in removed {
            println!("{provider:<8} removed {}", path.display());
        }
    }
    // The vendor CLI's own store is not the router's to delete: removing it
    // would log the user out of a client the router does not own. Naming it is
    // the honest middle, since the router will still read a credential from
    // there and report the provider as usable.
    if let Some(service) = link_assistant_router::platform_keychain::service_name(provider)
        && link_assistant_router::platform_keychain::lookup(provider).is_some()
    {
        println!(
            "{provider:<8} note: the {service:?} keychain entry still holds a credential; \
             it belongs to the vendor CLI, so remove it there (or with `security \
             delete-generic-password -s {service:?}`) if this deployment should hold none"
        );
    }
    Ok(())
}

/// Whether a GitHub credential is configured for *this* deployment.
///
/// Resolved against `config.data_dir` rather than `DATA_DIR`, so a credential
/// stored through `--data-dir` is seen here exactly as the server sees it at
/// startup (issue #282).
fn configured_github_credential(config: &link_assistant_router::config::Config) -> bool {
    link_assistant_router::github_proxy::GitHubProxyConfig::from_env_with_data_dir(Some(
        config.data_dir.as_path(),
    ))
    .is_ok_and(|github| github.enabled())
}

/// Remove the stored GitHub credential, naming any that remains configured.
fn clear_github(config: &link_assistant_router::config::Config) -> Result<(), String> {
    use link_assistant_router::github_proxy;

    let data_dir = std::path::Path::new(&config.data_dir);
    let path = github_proxy::stored_credential_path(data_dir);
    if github_proxy::clear_credential(data_dir)? {
        println!("github   removed {}", path.display());
    } else {
        println!("github   absent");
    }
    // The proxy resolves a credential from several places, and only one of them
    // is the router's. Saying so prevents "I cleared it and the routes are
    // still mounted" from looking like a bug.
    if configured_github_credential(config) {
        println!(
            "github   note: a credential is still configured from the environment or a \
             mounted gh config, so the GitHub routes stay enabled"
        );
    }
    println!("github   note: the GitHub routes are mounted at startup; restart to withdraw them");
    Ok(())
}

/// The router this `auth` invocation acts on, or `None` for the local one.
async fn remote_target(
    op: &AuthOp,
) -> Result<Option<link_assistant_router::managed_server::ResolvedServer>, String> {
    let target = match op {
        AuthOp::Claude { target, .. }
        | AuthOp::Codex { target, .. }
        | AuthOp::Gh { target, .. }
        | AuthOp::Status { target, .. } => target,
        // `auth import` reads a directory on this machine and writes this
        // deployment's credential home, so it is local by construction — and
        // `run_import` has already returned before this is reached.
        AuthOp::Import { .. } => return Ok(None),
    };
    link_assistant_router::auth_remote::target_for(
        target.local,
        target.managed,
        target.server.as_deref(),
    )
    .await
}

async fn run_remote(
    config: &Config,
    server: &link_assistant_router::managed_server::ResolvedServer,
    op: &AuthOp,
) -> ExitCode {
    match op {
        AuthOp::Claude { code, mode, .. } => {
            link_assistant_router::auth_remote::authorize(
                server,
                "claude",
                mode.as_deref(),
                code.clone(),
            )
            .await
        }
        AuthOp::Codex { .. } => {
            link_assistant_router::auth_remote::authorize(server, "codex", None, None).await
        }
        AuthOp::Status { .. } => link_assistant_router::auth_remote::status(server).await,
        // A read-only query has nothing to store in the wrong place, so it
        // answers — but it names whose credential it is describing, which is
        // exactly what a bare path failed to convey (issue #283).
        AuthOp::Gh { status: true, .. } => {
            println!(
                "note: describing this machine's credential; {} keeps its own, which \
                 `auth gh` cannot read from here",
                server.base_url
            );
            run_gh(config, None, false, true)
        }
        // A GitHub credential can only be stored where the router will read it
        // from, and the router reads it from its own data directory at startup
        // — there is no endpoint that accepts one over HTTP. Acting locally
        // here would store the token on this workstation while reporting
        // success, leaving the deployment that needs one without it and this
        // machine holding a GitHub token it never needed (issue #283). Saying
        // so is the honest answer; `--local` asks for the local store
        // explicitly.
        AuthOp::Gh { .. } => {
            eprintln!(
                "error: a GitHub credential is read from the router's own data directory at \
                 startup, so it cannot be stored on {} from here.\n\
                 note: run `router auth gh` on that deployment (or set GITHUB_PROXY_TOKEN there), \
                 then restart it. Pass --local to act on this machine's data directory instead.",
                server.base_url
            );
            ExitCode::from(1)
        }
        // Never reached: `remote_target` keeps import on the local path.
        AuthOp::Import { .. } => ExitCode::from(1),
    }
}

fn claude_supports_flow(flow: AuthFlow) -> bool {
    CLAUDE_AUTH_FLOWS.contains(&flow)
}

fn codex_supports_flow(flow: AuthFlow) -> bool {
    CODEX_AUTH_FLOWS.contains(&flow)
}

/// The login mode `LOGIN_CLI_ARGS` selects, mirroring
/// [`link_assistant_router::login::LoginManager::configured_mode`] for the
/// foreground command.
fn configured_mode(
    login: &link_assistant_router::login::LoginConfig,
) -> link_assistant_router::claude_auth::ClaudeAuthMode {
    if login.args.iter().any(|argument| argument == "setup-token") {
        link_assistant_router::claude_auth::ClaudeAuthMode::SetupToken
    } else {
        link_assistant_router::claude_auth::ClaudeAuthMode::Full
    }
}

async fn run_claude(
    config: &Config,
    code: Option<String>,
    flow: AuthFlow,
    mode: link_assistant_router::claude_auth::ClaudeAuthMode,
) -> ExitCode {
    if !claude_supports_flow(flow) {
        eprintln!("error: Claude does not support {flow:?}; use --flow code or --flow cli");
        return ExitCode::from(1);
    }
    let mut login_config = config.login.clone();
    // Disabling HTTP login routes must not disable this local CLI command.
    login_config.enabled = true;
    if flow == AuthFlow::Cli {
        if code.is_some() {
            eprintln!("error: --code requires --flow code; the CLI fallback starts its own login");
            return ExitCode::from(2);
        }
        return run_claude_cli_fallback(config, login_config, code).await;
    }
    let has_code = code.is_some();
    match complete_native_claude(config, code, mode).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) if flow == AuthFlow::Auto && !has_code => {
            eprintln!("native Claude OAuth failed: {error}");
            eprintln!("Trying a disposable Claude Code CLI fallback…");
            run_claude_cli_fallback(config, login_config, None).await
        }
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

async fn complete_native_claude(
    config: &Config,
    code: Option<String>,
    mode: link_assistant_router::claude_auth::ClaudeAuthMode,
) -> Result<(), String> {
    let auth_config = link_assistant_router::claude_auth::ClaudeAuthConfig::for_mode(
        config.login.claude_code_home.clone(),
        mode,
    );
    let submitted = if let Some(code) = code {
        code
    } else {
        let login = link_assistant_router::claude_auth::ClaudeLogin::begin_persisted(
            auth_config.clone(),
            config.login.session_ttl,
        )?;
        println!("Open this URL:\n{}", login.authorization_url());
        read_code().await?
    };
    if submitted.trim().is_empty() {
        return Err(
            "no authorization code was supplied; the pending login was kept for `router auth claude --flow code --code <CODE>`"
                .to_string(),
        );
    }
    let login = link_assistant_router::claude_auth::ClaudeLogin::resume(auth_config)?;
    login.complete(submitted.trim()).await?;
    println!(
        "Claude authorization saved in {}",
        config.login.claude_code_home.display()
    );
    Ok(())
}

async fn complete_claude_cli(
    config: &Config,
    manager: &LoginManager,
    code: Option<String>,
) -> Result<(), String> {
    let begun = match manager.begin().await {
        Ok(view) => view,
        Err(error) => return Err(error.to_string()),
    };
    println!("Open this URL:\n{}", begun.url.as_deref().unwrap_or(""));
    let submitted = match code {
        Some(code) => code,
        None => match read_code().await {
            Ok(code) => code,
            Err(error) => return Err(error),
        },
    };
    match manager.submit_code(&begun.login_id, submitted.trim()).await {
        Ok(view) if view.status == LoginStatus::Authorized => {
            println!(
                "Claude authorization saved in {}",
                config.login.claude_code_home.display()
            );
            Ok(())
        }
        Ok(view) => Err(view
            .error
            .unwrap_or_else(|| "authorization failed".to_string())),
        Err(error) => Err(error.to_string()),
    }
}

async fn run_claude_cli_fallback(
    config: &Config,
    login_config: link_assistant_router::login::LoginConfig,
    code: Option<String>,
) -> ExitCode {
    let (_disposable, fallback_config) =
        match link_assistant_router::on_demand_cli::DisposableCli::claude(&login_config) {
            Ok(value) => value,
            Err(error) => {
                eprintln!("error: {error}");
                return ExitCode::from(1);
            }
        };
    match complete_claude_cli(config, &LoginManager::new(fallback_config), code).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

async fn read_code() -> Result<String, String> {
    println!("Paste authorization code:");
    tokio::task::spawn_blocking(|| {
        let mut line = String::new();
        std::io::stdin()
            .read_line(&mut line)
            .map(|_| line)
            .map_err(|error| format!("could not read authorization code: {error}"))
    })
    .await
    .map_err(|error| format!("authorization prompt failed: {error}"))?
}

async fn run_codex(config: &Config, flow: AuthFlow, port: u16) -> ExitCode {
    if !codex_supports_flow(flow) {
        eprintln!("error: Codex does not support {flow:?}; use --flow device or --flow loopback");
        return ExitCode::from(1);
    }
    if matches!(flow, AuthFlow::Auto | AuthFlow::Device) {
        return run_codex_device(config, port).await;
    }
    if !matches!(port, 1455 | 1457) {
        eprintln!("error: Codex OAuth registers loopback ports 1455 and 1457 only");
        return ExitCode::from(2);
    }
    let mut settings = link_assistant_router::auth::CodexAuthConfig::production(
        config.login.codex_home.clone(),
        port,
        config.login.session_ttl,
    );
    settings.issuer.clone_from(&config.login.codex_issuer);
    let login = match link_assistant_router::auth::CodexLogin::bind(settings).await {
        Ok(login) => login,
        Err(error) => {
            eprintln!("error: {error}");
            return ExitCode::from(1);
        }
    };
    println!("Open this URL:\n{}", login.authorization_url());
    println!("Waiting for the browser callback on port {}…", login.port());
    match login.complete().await {
        Ok(path) => {
            println!("Codex authorization saved in {}", path.display());
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

async fn run_codex_device(config: &Config, port: u16) -> ExitCode {
    let mut settings = link_assistant_router::auth::CodexAuthConfig::production(
        config.login.codex_home.clone(),
        port,
        config.login.session_ttl,
    );
    settings.issuer.clone_from(&config.login.codex_issuer);
    let login = match link_assistant_router::auth::CodexDeviceLogin::begin(settings).await {
        Ok(login) => login,
        Err(error) => {
            eprintln!("error: {error}");
            return ExitCode::from(1);
        }
    };
    println!(
        "Open this URL:\n{}\nEnter this one-time code:\n{}",
        login.verification_url(),
        login.user_code()
    );
    println!("Waiting for device authorization…");
    match login.complete().await {
        Ok(path) => {
            println!("Codex authorization saved in {}", path.display());
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

/// Report each provider credential's state, verified against the vendor.
///
/// The verdict used to come entirely from the stored `exp` claim, so a
/// credential the vendor had already invalidated printed `usable` while every
/// request through it returned `401` (issue #205). A local timestamp cannot
/// answer this question: only the vendor can. Each credential is therefore
/// probed, and the answer says plainly whether it was checked or merely read.
async fn status(config: &Config) -> ExitCode {
    let user_home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let now = chrono::Utc::now().timestamp_millis();
    let client = reqwest::Client::new();
    let token_cache = link_assistant_router::refresh::TokenCache::new();

    for provider in SubscriptionProvider::ALL {
        let reader = SubscriptionReader::new(
            provider,
            crate::auth_import::provider_home(config, provider, &user_home),
        );
        let value = match reader.read_token() {
            Ok(disk_token) => {
                // Refresh first when the stored expiry says to, exactly as the
                // proxy would, so the probe reflects what a real request sees.
                let token = token_cache
                    .get_fresh(&client, provider, disk_token, now)
                    .await;
                match link_assistant_router::model_catalog::fetch_provider_catalog(
                    &client, provider, &token, None,
                )
                .await
                {
                    Ok(_) => "usable",
                    Err(error)
                        if link_assistant_router::model_catalog::is_credential_rejection(
                            &error,
                        ) =>
                    {
                        "rejected"
                    }
                    // The credential may well be fine; the probe could not say.
                    Err(_) => "unverified",
                }
            }
            Err(_) => "absent",
        };
        println!(
            "{:<8} {value:<10} {}",
            reader.provider(),
            reader.home().display()
        );
    }
    ExitCode::SUCCESS
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A duration an operator reads at a glance, at each boundary.
    ///
    /// Truncating to whole hours reported 119 minutes as "1 hours", which
    /// understates a credential enough to matter when the question is whether
    /// to re-authenticate now.
    #[test]
    fn a_remaining_lifetime_reads_in_the_largest_useful_unit() {
        assert_eq!(crate::auth_import::humanize_minutes(0), "0 minutes");
        assert_eq!(crate::auth_import::humanize_minutes(45), "45 minutes");
        // Below the hour threshold minutes stay minutes, so a credential with
        // an hour left is not rounded into sounding like a day.
        assert_eq!(crate::auth_import::humanize_minutes(89), "89 minutes");
        assert_eq!(crate::auth_import::humanize_minutes(90), "1 hours");
        assert_eq!(crate::auth_import::humanize_minutes(60 * 47), "47 hours");
        assert_eq!(crate::auth_import::humanize_minutes(60 * 48), "2 days");
        assert_eq!(
            crate::auth_import::humanize_minutes(60 * 24 * 30),
            "30 days"
        );
    }

    /// The import report says the two things that decide what to do next: how
    /// long the credential lasts, and whether it can be renewed at all.
    #[test]
    fn an_imported_credential_describes_its_lifetime_and_renewability() {
        let now = chrono::Utc::now().timestamp_millis();
        let renewable = link_assistant_router::subscription::SubscriptionToken {
            access_token: "a".into(),
            refresh_token: Some("r".into()),
            expires_at_ms: Some(now + 6 * 3_600_000),
            account_id: None,
            resource_url: None,
        };
        let described = crate::auth_import::describe_credential(&renewable);
        assert!(described.contains("expires in"), "{described}");
        assert!(described.contains("refresh token present"), "{described}");

        // Without a refresh token the credential dies at expiry and no recovery
        // rung can save it, which is worth saying rather than implying.
        let terminal = link_assistant_router::subscription::SubscriptionToken {
            refresh_token: None,
            expires_at_ms: Some(now - 3_600_000),
            ..renewable.clone()
        };
        let described = crate::auth_import::describe_credential(&terminal);
        assert!(described.contains("EXPIRED"), "{described}");
        assert!(described.contains("cannot be renewed"), "{described}");

        let undated = link_assistant_router::subscription::SubscriptionToken {
            expires_at_ms: None,
            ..renewable
        };
        assert!(
            crate::auth_import::describe_credential(&undated).contains("no recorded expiry"),
            "an unknown expiry must not be reported as an expired one"
        );
    }

    #[test]
    fn provider_flow_support_matrix_matches_the_oauth_implementations() {
        let cases = [
            (AuthFlow::Auto, true, true),
            (AuthFlow::Device, false, true),
            (AuthFlow::Code, true, false),
            (AuthFlow::Loopback, false, true),
            (AuthFlow::Cli, true, false),
        ];

        for (flow, claude_supported, codex_supported) in cases {
            assert_eq!(claude_supports_flow(flow), claude_supported, "{flow:?}");
            assert_eq!(codex_supports_flow(flow), codex_supported, "{flow:?}");
        }
    }

    /// Recovering a subscription must not require an unrelated secret
    /// (issue #205); every other command still does.
    #[test]
    fn auth_runs_without_a_token_secret_but_other_commands_still_need_one() {
        use link_assistant_router::cli::Cli;
        use lino_arguments::Parser as _;

        let relaxed = relax_token_secret_for_auth(
            Cli::try_parse_from(["bin", "auth", "status"]).expect("parses auth"),
        );
        assert!(
            relaxed.into_config().is_ok(),
            "auth must not demand TOKEN_SECRET"
        );

        // A secret the operator did supply is never overwritten.
        let supplied = relax_token_secret_for_auth(
            Cli::try_parse_from(["bin", "--token-secret", "real-secret", "auth", "status"])
                .expect("parses auth"),
        );
        assert_eq!(supplied.token_secret.as_deref(), Some("real-secret"));

        // Serving still requires a real secret.
        let serving = relax_token_secret_for_auth(
            Cli::try_parse_from(["bin", "serve"]).expect("parses serve"),
        );
        assert!(
            serving.into_config().is_err(),
            "serve must still demand TOKEN_SECRET"
        );
    }
}
