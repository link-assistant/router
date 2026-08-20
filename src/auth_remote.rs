//! Authorize the subscription of the *selected* router, not a local directory.
//!
//! `server use` establishes which router the CLI is talking to, and `with`
//! honours it. `auth` is the other half of that workflow — it exists to give
//! that router a working subscription — but it wrote to a local home instead,
//! so the obvious sequence
//!
//! ```text
//! router server use <url> --token-stdin
//! router auth claude
//! router with claude
//! ```
//!
//! did not do what it reads as: the login printed success while the router it
//! targeted still had no usable credential, and the failure surfaced later as
//! an unrelated-looking 401 (issue #246).
//!
//! The login itself still happens in front of the operator — the browser step
//! cannot be delegated — but the credential is completed on, and stored by,
//! the router being targeted, through the admin login API it already exposes.

use std::process::ExitCode;
use std::time::Duration;

use link_assistant_router::managed_server::ResolvedServer;

/// How long to wait for one HTTP call to the selected router.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// The selected router, when one is configured and reachable.
///
/// `None` means "no selection" — the caller keeps its local behaviour. An
/// unreachable *selected* server is an error rather than a silent fallback:
/// falling back to a local directory is exactly the surprise this fixes.
pub async fn selected_server() -> Result<Option<ResolvedServer>, String> {
    if !has_selection() {
        return Ok(None);
    }
    link_assistant_router::managed_server::resolve(None, None, None)
        .await
        .map(Some)
        .map_err(|error| format!("the selected server is not usable: {error}"))
}

/// Whether the operator has selected a server, without contacting it.
///
/// Only an explicit selection counts. The managed local container is started on
/// demand by `with`, and a plain `auth` must not boot one.
fn has_selection() -> bool {
    if std::env::var_os("LINK_ASSISTANT_ROUTER_URL").is_some_and(|value| !value.is_empty())
        || std::env::var_os("ROUTER_URL").is_some_and(|value| !value.is_empty())
    {
        return true;
    }
    link_assistant_router::managed_server::load_persisted()
        .ok()
        .flatten()
        .is_some()
}

/// Run a provider login against `server`, returning the process exit code.
pub async fn authorize(
    server: &ResolvedServer,
    provider: &str,
    mode: Option<&str>,
    code: Option<String>,
) -> ExitCode {
    match authorize_inner(server, provider, mode, code).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

async fn authorize_inner(
    server: &ResolvedServer,
    provider: &str,
    mode: Option<&str>,
    code: Option<String>,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|error| format!("could not build an HTTP client: {error}"))?;

    let mut body = serde_json::json!({ "provider": provider });
    if let Some(mode) = mode {
        body["mode"] = serde_json::Value::String(mode.to_string());
    }
    let begun: serde_json::Value = send(
        &client,
        server,
        reqwest::Method::POST,
        "/api/login",
        Some(body),
    )
    .await?;

    let login_id = begun
        .get("login_id")
        .and_then(serde_json::Value::as_str)
        .ok_or("the router did not return a login id")?
        .to_string();

    println!("Authorizing {provider} on {}", server.base_url);
    if let Some(url) = begun.get("url").and_then(serde_json::Value::as_str) {
        println!("Open this URL:\n{url}");
    }
    if let Some(user_code) = begun.get("user_code").and_then(serde_json::Value::as_str) {
        println!("Enter this code: {user_code}");
    }

    // A device flow authorizes itself once the human approves it in the
    // browser; only a code flow has something to submit.
    if status_of(&begun) == "authorized" {
        finish(provider, server);
        return Ok(());
    }
    if begun.get("url").is_none() && begun.get("user_code").is_some() {
        return poll_until_authorized(&client, server, &login_id, provider).await;
    }

    let submitted = match code {
        Some(code) => code,
        None => crate::auth_cli::read_code().await?,
    };
    let submitted = submitted.trim();
    if submitted.is_empty() {
        return Err(format!(
            "no authorization code was supplied; the pending login is still open on the router — \
             finish it with `router auth {provider} --flow code --code <CODE>`"
        ));
    }

    let completed: serde_json::Value = send(
        &client,
        server,
        reqwest::Method::POST,
        &format!("/api/login/{login_id}/code"),
        Some(serde_json::json!({ "code": submitted })),
    )
    .await?;
    if status_of(&completed) != "authorized" {
        return Err(format!(
            "the router did not accept the code: it reports `{}`",
            status_of(&completed)
        ));
    }
    finish(provider, server);
    Ok(())
}

/// Wait for a device-flow login the human approves in their browser.
async fn poll_until_authorized(
    client: &reqwest::Client,
    server: &ResolvedServer,
    login_id: &str,
    provider: &str,
) -> Result<(), String> {
    let deadline = std::time::Instant::now() + Duration::from_secs(10 * 60);
    while std::time::Instant::now() < deadline {
        tokio::time::sleep(Duration::from_secs(3)).await;
        let view: serde_json::Value = send(
            client,
            server,
            reqwest::Method::GET,
            &format!("/api/login/{login_id}"),
            None,
        )
        .await?;
        match status_of(&view) {
            "authorized" => {
                finish(provider, server);
                return Ok(());
            }
            "failed" | "expired" | "cancelled" => {
                return Err(format!(
                    "the login ended as `{}` on the router",
                    status_of(&view)
                ));
            }
            _ => {}
        }
    }
    Err("the login was not approved in time".to_string())
}

fn finish(provider: &str, server: &ResolvedServer) {
    println!(
        "{provider} authorization saved on {} ({})",
        server.base_url, server.source
    );
}

fn status_of(view: &serde_json::Value) -> &str {
    view.get("status")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("unknown")
}

/// Report each provider credential as the *selected router* sees it.
pub async fn status(server: &ResolvedServer) -> ExitCode {
    let client = match reqwest::Client::builder().timeout(REQUEST_TIMEOUT).build() {
        Ok(client) => client,
        Err(error) => {
            eprintln!("error: could not build an HTTP client: {error}");
            return ExitCode::from(1);
        }
    };
    match send::<serde_json::Value>(&client, server, reqwest::Method::GET, "/v1/accounts", None)
        .await
    {
        Ok(body) => {
            println!("server: {} ({})", server.base_url, server.source);
            let accounts = body
                .get("accounts")
                .and_then(serde_json::Value::as_array)
                .cloned()
                .unwrap_or_default();
            if accounts.is_empty() {
                println!("no accounts are configured on this router");
                return ExitCode::SUCCESS;
            }
            for account in accounts {
                println!(
                    "{:<16} {:<10} {}",
                    account
                        .get("name")
                        .and_then(serde_json::Value::as_str)
                        .unwrap_or("-"),
                    account
                        .get("credential")
                        .and_then(serde_json::Value::as_str)
                        .unwrap_or("-"),
                    account
                        .get("home")
                        .and_then(serde_json::Value::as_str)
                        .unwrap_or("-"),
                );
            }
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

async fn send<T: serde::de::DeserializeOwned>(
    client: &reqwest::Client,
    server: &ResolvedServer,
    method: reqwest::Method,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<T, String> {
    let url = format!("{}{path}", server.base_url.trim_end_matches('/'));
    let mut request = client.request(method, &url);
    if let Some(token) = server.token.as_deref() {
        request = request.bearer_auth(token);
    }
    if let Some(body) = body {
        request = request.json(&body);
    }
    let response = request
        .send()
        .await
        .map_err(|error| format!("could not reach {url}: {error}"))?;
    let status = response.status();
    let text = response.text().await.unwrap_or_default();
    if !status.is_success() {
        // The most likely cause by far, and the one whose fix is not obvious.
        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(format!(
                "the selected router refused an administrator credential ({status}). Re-select it \
                 with an admin token: `router server use {} --token-stdin`",
                server.base_url
            ));
        }
        return Err(format!("{url} returned {status}: {}", text.trim()));
    }
    serde_json::from_str(&text)
        .map_err(|error| format!("could not read the reply from {url}: {error}"))
}
