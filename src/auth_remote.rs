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

use crate::managed_server::ResolvedServer;

/// How long to wait for one HTTP call to the selected router.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// How often a device-flow login asks the router whether it was approved.
///
/// Short enough that approval feels immediate, long enough not to hammer the
/// router while a human is reading their browser.
#[cfg(not(test))]
const POLL_INTERVAL: Duration = Duration::from_secs(3);
#[cfg(test)]
const POLL_INTERVAL: Duration = Duration::from_millis(20);

/// The selected router, when one is configured and reachable.
///
/// `None` means "no selection" — the caller keeps its local behaviour. An
/// unreachable *selected* server is an error rather than a silent fallback:
/// falling back to a local directory is exactly the surprise this fixes.
pub async fn selected_server(force_managed: bool) -> Result<Option<ResolvedServer>, String> {
    if force_managed {
        // `--managed` asks for a disposable container, which is what the local
        // path already provides for `auth`.
        return Ok(None);
    }
    if !has_selection() {
        // Nothing was selected, but a router already listening here is a
        // better target than this machine's credential directory: authorizing
        // locally when a live router is one port away lands the subscription
        // somewhere the router in use cannot see (issue #250).
        return Ok(crate::managed_server::discovered_local_router().await);
    }
    crate::managed_server::resolve(None, None, None, false)
        .await
        .map(Some)
        .map_err(|error| format!("the selected server is not usable: {error}"))
}

/// The router an `auth` invocation acts on, given its explicit target flags.
///
/// `None` means "act locally". The precedence is the same one `with` follows,
/// stated in one place so `auth` cannot drift from it again (issues #246,
/// #250): an explicit `--local` or `--managed` keeps the local path, `--server`
/// names one router for a single command, and otherwise the selection — or a
/// router already listening here — is used.
pub async fn target_for(
    local: bool,
    managed: bool,
    server: Option<&str>,
) -> Result<Option<ResolvedServer>, String> {
    if local || managed {
        return Ok(None);
    }
    if let Some(server) = server {
        return crate::managed_server::resolve(Some(server), None, None, false)
            .await
            .map(Some)
            .map_err(|error| format!("{server} is not usable: {error}"));
    }
    selected_server(managed).await
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
    crate::managed_server::load_persisted()
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
        None => read_code().await?,
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
        tokio::time::sleep(POLL_INTERVAL).await;
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
            report_credentials(&body);
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

/// Where the selected router reads `provider`'s credential from.
///
/// `auth status` already asks the same endpoint for exactly this, so a command
/// that cannot act on the remote deployment can still name the directory the
/// credential would have to land in. An error that says only "not from here"
/// leaves the operator to guess the next step; one that names the path is the
/// instruction (issue #291).
///
/// `None` when the router cannot be reached or does not report homes — the
/// refusal is still correct without it, so this never turns into a hard
/// failure of its own.
pub async fn credential_home(server: &ResolvedServer, provider: &str) -> Option<String> {
    let client = reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .ok()?;
    let body: serde_json::Value = send(&client, server, reqwest::Method::GET, "/v1/accounts", None)
        .await
        .ok()?;
    // Single-account deployments report under `credentials`, pooled ones under
    // `accounts`; both carry `name` and `home`.
    ["credentials", "accounts"]
        .into_iter()
        .filter_map(|key| body.get(key).and_then(serde_json::Value::as_array))
        .flatten()
        .find(|entry| {
            entry
                .get("name")
                .and_then(serde_json::Value::as_str)
                .is_some_and(|name| name.eq_ignore_ascii_case(provider))
        })
        .and_then(|entry| entry.get("home").and_then(serde_json::Value::as_str))
        .map(str::to_owned)
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

/// Read one authorization code from standard input.
///
/// Duplicated from the local path rather than shared: the two prompts differ in
/// what they say about where the pending login lives, and the shared half is
/// one `read_line`.
async fn read_code() -> Result<String, String> {
    use std::io::BufRead as _;

    println!("Paste authorization code:");
    tokio::task::spawn_blocking(|| {
        let mut line = String::new();
        std::io::stdin()
            .lock()
            .read_line(&mut line)
            .map(|_| line)
            .map_err(|error| format!("could not read authorization code: {error}"))
    })
    .await
    .map_err(|error| format!("authorization prompt failed: {error}"))?
}

#[cfg(test)]
#[path = "auth_remote_tests.rs"]
mod tests;

/// Print what the router said about its credentials.
///
/// An empty `accounts` array means *no account pool*, which is the ordinary
/// state of a single-subscription deployment rather than a missing credential.
/// Printing "no accounts are configured on this router" for it described a
/// router serving live traffic as unauthorized, and pointed the operator at a
/// re-authentication it did not need (issue #281).
///
/// So the pool is reported when there is one, the per-provider credentials when
/// the router sends them, and the server's own `note` when it explains an empty
/// array — in that order. The last two are what an older router does not send,
/// and falling through to the original sentence keeps this readable against one.
fn report_credentials(body: &serde_json::Value) {
    for line in credential_report(body) {
        println!("{line}");
    }
}

/// [`report_credentials`] as lines, so what it prints can be asserted.
fn credential_report(body: &serde_json::Value) -> Vec<String> {
    let rows = |key: &str| {
        body.get(key)
            .and_then(serde_json::Value::as_array)
            .map(Vec::as_slice)
            .unwrap_or_default()
    };
    let accounts = rows("accounts");
    // `credentials` is the single-account answer; it is absent when a pool is
    // configured, and on a router predating it.
    let entries = if accounts.is_empty() {
        rows("credentials")
    } else {
        accounts
    };
    if !entries.is_empty() {
        return entries
            .iter()
            .map(|entry| {
                let field = |key: &str| {
                    entry
                        .get(key)
                        .and_then(serde_json::Value::as_str)
                        .unwrap_or("-")
                };
                format!(
                    "{:<16} {:<12} {}",
                    field("name"),
                    field("credential"),
                    field("home")
                )
            })
            .collect();
    }
    // The server explains an empty array when it can; that explanation is the
    // answer, and discarding it is what produced the misleading sentence.
    if let Some(note) = body.get("note").and_then(serde_json::Value::as_str) {
        return vec![note.to_string()];
    }
    vec!["no accounts are configured on this router".to_string()]
}
