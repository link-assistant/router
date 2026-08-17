//! Foreground provider authorization commands.

use std::process::ExitCode;

use link_assistant_router::cli::{AuthFlow, AuthOp, CLAUDE_AUTH_FLOWS, CODEX_AUTH_FLOWS};
use link_assistant_router::config::Config;
use link_assistant_router::login::{LoginManager, LoginStatus};
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};

pub async fn run(config: &Config, op: &AuthOp) -> ExitCode {
    match op {
        AuthOp::Claude { code, flow, mode } => {
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
        AuthOp::Codex { flow, port } => run_codex(config, *flow, *port).await,
        AuthOp::Status => status(config),
    }
}

fn claude_supports_flow(flow: AuthFlow) -> bool {
    CLAUDE_AUTH_FLOWS.contains(&flow)
}

fn codex_supports_flow(flow: AuthFlow) -> bool {
    CODEX_AUTH_FLOWS.contains(&flow)
}

/// The login mode `LOGIN_CLI_ARGS` selects, mirroring
/// [`crate::login::LoginManager::configured_mode`] for the foreground command.
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

fn status(config: &Config) -> ExitCode {
    let user_home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let now = chrono::Utc::now().timestamp_millis();
    for provider in SubscriptionProvider::ALL {
        let home = match provider {
            SubscriptionProvider::Claude => config.login.claude_code_home.clone(),
            SubscriptionProvider::Codex => config.login.codex_home.clone(),
            SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => {
                provider.resolve_home(&user_home)
            }
        };
        let reader = SubscriptionReader::new(provider, home);
        let value = match reader.read_token() {
            Ok(token) if token.is_expired(now) => "expired",
            Ok(_) => "usable",
            Err(_) => "absent",
        };
        println!(
            "{:<8} {value:<7} {}",
            reader.provider(),
            reader.home().display()
        );
    }
    ExitCode::SUCCESS
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
