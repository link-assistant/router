//! Server selection, managed Docker lifecycle, and per-run token handling.

use std::ffi::OsStr;
use std::fs::{self, File, OpenOptions};
use std::io::{Read as _, Write as _};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use base64::Engine as _;
use fs2::FileExt as _;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::clients::RouterModel;

mod bootstrap;
mod catalog;

use catalog::fetch_models;

const CONFIG_DIRECTORY: &str = "link-assistant-router";
const SERVER_CONFIG: &str = "server.json";
const MANAGED_STATE: &str = "managed-server.json";
const MANAGED_LOCK: &str = "managed-server.lock";
const CONTAINER: &str = "link-assistant-router-managed";
const VOLUME: &str = "link-assistant-router-managed-data";
const IMAGE: &str = "ghcr.io/link-assistant/router:latest";
const MANAGED_LABEL: &str = "com.link-assistant.router.managed=1";

type AnyError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct PersistedServer {
    pub server: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub run_max_requests: Option<u64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct ManagedState {
    port: u16,
    #[serde(default = "managed_secret")]
    token_secret: String,
    #[serde(default)]
    references: Vec<u32>,
    #[serde(default)]
    keep_running: bool,
    #[serde(default)]
    claimed: bool,
}

/// The effective server and the optional lease that controls a managed local one.
pub struct ResolvedServer {
    pub base_url: String,
    pub token: Option<String>,
    pub source: &'static str,
    pub run_max_requests: Option<u64>,
    _lease: Option<ManagedLease>,
}

/// An ordinary token suitable for a wrapped client.
pub struct RunCredential {
    pub token: String,
    available_models: Vec<RouterModel>,
    revocation: Option<Revocation>,
}

impl RunCredential {
    pub(crate) fn models(&self) -> &[RouterModel] {
        &self.available_models
    }
}

struct Revocation {
    base_url: String,
    admin_token: String,
    id: String,
}

struct ManagedLease {
    pid: u32,
}

impl Drop for ManagedLease {
    fn drop(&mut self) {
        if let Err(error) = release_reference(self.pid) {
            eprintln!("warning: could not release managed router reference: {error}");
        }
    }
}

/// Resolve flags, environment, persisted selection, then managed local Docker.
pub async fn resolve(
    explicit_server: Option<&str>,
    explicit_token: Option<String>,
    run_max_requests: Option<u64>,
) -> Result<ResolvedServer, AnyError> {
    let persisted = load_persisted()?;
    let environment_server = std::env::var("LINK_ASSISTANT_ROUTER_URL")
        .or_else(|_| std::env::var("ROUTER_URL"))
        .ok();
    let environment_token = std::env::var("LINK_ASSISTANT_ROUTER_TOKEN")
        .or_else(|_| std::env::var("LINK_ASSISTANT_TOKEN"))
        .ok();
    let (base_url, source) = if let Some(server) = explicit_server {
        (normalize_server(server)?, "flag")
    } else if let Some(server) = environment_server {
        (normalize_server(&server)?, "environment")
    } else if let Some(config) = persisted.as_ref() {
        (normalize_server(&config.server)?, "persisted configuration")
    } else {
        let (state, lease) = acquire_managed()?;
        let base_url = format!("http://127.0.0.1:{}", state.port);
        verify_health(&base_url).await?;
        let token = match explicit_token.or(environment_token) {
            Some(token) => Some(token),
            None if !state.claimed => Some(bootstrap::read_token(CONTAINER)?),
            None => None,
        };
        return Ok(ResolvedServer {
            base_url,
            token,
            source: "managed local container",
            run_max_requests,
            _lease: Some(lease),
        });
    };
    let token = explicit_token.or(environment_token).or_else(|| {
        (source == "persisted configuration")
            .then(|| persisted.as_ref().and_then(|config| config.token.clone()))
            .flatten()
    });
    let budget = run_max_requests.or_else(|| {
        persisted
            .as_ref()
            .and_then(|config| config.run_max_requests)
    });
    verify_health(&base_url).await?;
    Ok(ResolvedServer {
        base_url,
        token,
        source,
        run_max_requests: budget,
        _lease: None,
    })
}

/// Validate an ordinary token or exchange an admin credential for a run token.
pub async fn prepare_run_credential(
    server: &ResolvedServer,
    label: &str,
    ttl_hours: i64,
) -> Result<RunCredential, AnyError> {
    let token = server.token.as_deref().ok_or_else(|| {
        if server.source == "managed local container" {
            format!(
                "{} is claimed and no token is available; pass --token, use --token-stdin, set LINK_ASSISTANT_ROUTER_TOKEN, or issue an ordinary token with `docker exec {CONTAINER} link-assistant-router tokens issue --ttl-hours 24 --label with-router`",
                server.base_url
            )
        } else {
            format!(
                "{} selected from {}, but no token is available; pass --token, use --token-stdin, set LINK_ASSISTANT_ROUTER_TOKEN, or run `link-assistant-router server use <URL> --token-stdin`",
                server.base_url, server.source
            )
        }
    })?;
    let client = http_client()?;
    let list_url = format!("{}/api/tokens/list", server.base_url);
    let list = client.get(&list_url).bearer_auth(token).send().await;
    match list {
        Ok(response) if response.status().is_success() => {
            let issue_url = format!("{}/api/tokens", server.base_url);
            let response = client
                .post(&issue_url)
                .bearer_auth(token)
                .json(&serde_json::json!({
                    "ttl_hours": ttl_hours,
                    "label": label,
                    "max_requests": server.run_max_requests,
                }))
                .send()
                .await
                .map_err(|error| {
                    format!("could not mint a per-run token at {issue_url}: {error}")
                })?;
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            if !status.is_success() {
                return Err(format!(
                    "per-run token minting failed at {issue_url} ({status}): {}",
                    compact(&body)
                )
                .into());
            }
            let value: Value = serde_json::from_str(&body)
                .map_err(|error| format!("token endpoint returned invalid JSON: {error}"))?;
            let run_token = value
                .get("token")
                .and_then(Value::as_str)
                .ok_or("token endpoint response did not contain a token")?
                .to_string();
            let id = token_subject(&run_token)?;
            let mut credential = RunCredential {
                token: run_token,
                available_models: Vec::new(),
                revocation: Some(Revocation {
                    base_url: server.base_url.clone(),
                    admin_token: token.to_string(),
                    id,
                }),
            };
            match fetch_models(&client, &server.base_url, &credential.token).await {
                Ok(models) => {
                    credential.available_models = models;
                    Ok(credential)
                }
                Err(error) => {
                    let _ = cleanup_run_credential(credential).await;
                    Err(error)
                }
            }
        }
        Ok(response) if response.status().as_u16() == 401 || response.status().as_u16() == 403 => {
            let available_models = fetch_models(&client, &server.base_url, token).await?;
            Ok(RunCredential {
                token: token.to_string(),
                available_models,
                revocation: None,
            })
        }
        Ok(response) => Err(format!(
            "could not determine token scope at {list_url}: server returned {}",
            response.status()
        )
        .into()),
        Err(error) => Err(format!("could not inspect token scope at {list_url}: {error}").into()),
    }
}

/// Refuse to launch a client with a model the selected router cannot serve.
pub fn ensure_model_available(credential: &RunCredential, model: &str) -> Result<(), AnyError> {
    if credential
        .available_models
        .iter()
        .any(|item| item.id == model)
    {
        return Ok(());
    }
    if credential.available_models.is_empty() {
        return Err(
            "the router has no available models; authorize a subscription with `link-assistant-router auth <claude|codex|gemini|qwen>` on the router host and retry"
                .into(),
        );
    }
    Err(format!(
        "model `{model}` is not available from the selected router; available models: {}",
        credential
            .available_models
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>()
            .join(", ")
    )
    .into())
}

/// Revoke an automatically minted token. Explicit ordinary tokens are untouched.
pub async fn cleanup_run_credential(credential: RunCredential) -> Result<(), AnyError> {
    let Some(revocation) = credential.revocation else {
        return Ok(());
    };
    let url = format!("{}/api/tokens/revoke", revocation.base_url);
    let response = http_client()?
        .post(&url)
        .bearer_auth(&revocation.admin_token)
        .json(&serde_json::json!({"id": revocation.id}))
        .send()
        .await
        .map_err(|error| format!("could not revoke the per-run token at {url}: {error}"))?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!(
            "per-run token revocation failed at {url} ({})",
            response.status()
        )
        .into())
    }
}

async fn verify_health(base_url: &str) -> Result<(), AnyError> {
    let url = format!("{base_url}/health");
    let response = http_client()?.get(&url).send().await.map_err(|error| {
        let rendered = error.to_string();
        if rendered.to_ascii_lowercase().contains("certificate") {
            format!("TLS certificate validation failed for {url}: {rendered}")
        } else {
            format!("router is unreachable at {url}: {rendered}")
        }
    })?;
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    let router_json = serde_json::from_str::<Value>(&body).is_ok_and(|value| {
        value.get("status").and_then(Value::as_str) == Some("ok")
            || value.get("version").and_then(Value::as_str).is_some()
    });
    if status.is_success() && (body.trim() == "ok" || router_json) {
        Ok(())
    } else {
        Err(format!(
            "{url} did not identify a Link.Assistant.Router ({status}): {}",
            compact(&body)
        )
        .into())
    }
}

fn http_client() -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
}

fn token_subject(token: &str) -> Result<String, AnyError> {
    let payload = token
        .split('.')
        .nth(1)
        .ok_or("router returned a token without a JWT payload")?;
    let decoded = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload)
        .map_err(|error| format!("router returned an invalid JWT payload: {error}"))?;
    let claims: Value = serde_json::from_slice(&decoded)?;
    claims
        .get("sub")
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| "router run token has no subject to revoke".into())
}

pub fn save_persisted(config: &PersistedServer) -> Result<PathBuf, AnyError> {
    if config.server.is_empty() {
        return Err("server URL must not be empty".into());
    }
    let mut config = config.clone();
    config.server = normalize_server(&config.server)?;
    let path = state_directory()?.join(SERVER_CONFIG);
    write_private_json(&path, &config)?;
    Ok(path)
}

pub fn clear_persisted() -> Result<PathBuf, AnyError> {
    let path = state_directory()?.join(SERVER_CONFIG);
    match fs::remove_file(&path) {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(error.into()),
    }
    Ok(path)
}

pub fn load_persisted() -> Result<Option<PersistedServer>, AnyError> {
    let path = state_directory()?.join(SERVER_CONFIG);
    match fs::read_to_string(&path) {
        Ok(source) => Ok(Some(serde_json::from_str(&source).map_err(|error| {
            format!(
                "invalid persisted server configuration {}: {error}",
                path.display()
            )
        })?)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

pub fn configured_source() -> Result<String, AnyError> {
    if let Ok(value) = std::env::var("LINK_ASSISTANT_ROUTER_URL") {
        return Ok(format!("environment: {}", normalize_server(&value)?));
    }
    if let Ok(value) = std::env::var("ROUTER_URL") {
        return Ok(format!("environment: {}", normalize_server(&value)?));
    }
    if let Some(config) = load_persisted()? {
        return Ok(format!(
            "persisted: {} (token {})",
            config.server,
            if config.token.is_some() {
                "set"
            } else {
                "unset"
            }
        ));
    }
    Ok("managed local container".to_string())
}

pub fn managed_status() -> Result<String, AnyError> {
    let lock = lock_state()?;
    let mut state = load_managed()?;
    if let Some(state) = state.as_mut() {
        prune_references(state);
        save_managed(state)?;
    }
    drop(lock);
    let lifecycle =
        docker_container_state().unwrap_or_else(|error| format!("unavailable ({error})"));
    Ok(match state {
        Some(state) => {
            let subscriptions = if lifecycle == "running" {
                docker_subscription_status()
            } else {
                "not queried while stopped".to_string()
            };
            format!(
                "{lifecycle}; administrator={}; container={CONTAINER}; volume={VOLUME}; url=http://127.0.0.1:{}; users={}; subscriptions={subscriptions}",
                if state.claimed {
                    "claimed"
                } else {
                    "unclaimed"
                },
                state.port,
                state.references.len()
            )
        }
        None => format!("absent; container={CONTAINER}; volume={VOLUME}"),
    })
}

/// Explain a managed-container disappearance after a client-side failure.
#[must_use]
pub fn managed_failure_hint() -> Option<String> {
    match docker_container_state() {
        Ok(state) if state != "running" => Some(format!(
            "managed router container is {state}; run `link-assistant-router server start` and retry"
        )),
        Err(error) => Some(format!("managed router state is unavailable: {error}")),
        _ => None,
    }
}

pub fn start_managed() -> Result<String, AnyError> {
    let lock = lock_state()?;
    let mut state = load_or_create_managed()?;
    prune_references(&mut state);
    ensure_container_running(&state)?;
    state.keep_running = true;
    save_managed(&state)?;
    drop(lock);
    Ok(format!("http://127.0.0.1:{}", state.port))
}

/// Explicitly hand the managed bootstrap administrator to its owner.
///
/// Before this transition the wrapper may use the credential only to mint a
/// short-lived ordinary token. Claiming is deliberately one-way: subsequent
/// unattended runs must receive a credential from the user.
pub fn claim_managed() -> Result<String, AnyError> {
    let lock = lock_state()?;
    let Some(mut state) = load_managed()? else {
        return Err(
            "managed router is absent; run `link-assistant-router server start` first".into(),
        );
    };
    if state.claimed {
        return Err(
            "managed router administrator is already claimed; the bootstrap credential is not printed twice"
                .into(),
        );
    }
    let token = bootstrap::read_token(CONTAINER)?;
    state.claimed = true;
    save_managed(&state)?;
    drop(lock);
    Ok(token)
}

pub fn stop_managed() -> Result<(), AnyError> {
    let lock = lock_state()?;
    let Some(mut state) = load_managed()? else {
        return Err("managed router is absent; run `link-assistant-router server start`".into());
    };
    ensure_docker()?;
    match docker_container_state()?.as_str() {
        "running" => docker_checked(["stop", CONTAINER])?,
        "stopped" => {}
        "absent" => {
            return Err(
                "managed router container is absent; run `link-assistant-router server start` to recreate it"
                    .into(),
            );
        }
        other => return Err(format!("unexpected managed container state: {other}").into()),
    }
    state.keep_running = false;
    state.references.clear();
    save_managed(&state)?;
    drop(lock);
    Ok(())
}

pub fn remove_managed(yes: bool) -> Result<(), AnyError> {
    if !yes {
        return Err(format!(
            "refusing to remove {CONTAINER} and volume {VOLUME}: issued tokens, request logs, and any authorized Claude/ChatGPT/Gemini/Qwen subscriptions will be permanently lost; rerun with --yes"
        )
        .into());
    }
    let lock = lock_state()?;
    if load_managed()?.is_none() {
        return Err("managed router is absent; no owned state was removed".into());
    }
    ensure_docker()?;
    match docker_container_state()?.as_str() {
        "running" | "stopped" => docker_checked(["rm", "-f", CONTAINER])?,
        "absent" => {}
        other => return Err(format!("unexpected managed container state: {other}").into()),
    }
    let output = Command::new("docker")
        .args(["volume", "rm", VOLUME])
        .output()?;
    if !output.status.success()
        && !String::from_utf8_lossy(&output.stderr).contains("No such volume")
    {
        return Err(format!(
            "could not remove managed router volume: {}",
            compact(&String::from_utf8_lossy(&output.stderr))
        )
        .into());
    }
    let path = state_directory()?.join(MANAGED_STATE);
    let _ = fs::remove_file(path);
    drop(lock);
    Ok(())
}

#[must_use]
pub fn reap(pid: u32) -> ExitCode {
    while process_alive(pid) {
        thread::sleep(Duration::from_secs(2));
    }
    match release_reference(pid) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("error: could not reap managed router reference {pid}: {error}");
            ExitCode::from(1)
        }
    }
}

fn acquire_managed() -> Result<(ManagedState, ManagedLease), AnyError> {
    let lock = lock_state()?;
    let mut state = load_or_create_managed()?;
    prune_references(&mut state);
    ensure_container_running(&state)?;
    let pid = std::process::id();
    if !state.references.contains(&pid) {
        state.references.push(pid);
    }
    save_managed(&state)?;
    spawn_reaper(pid)?;
    drop(lock);
    Ok((state, ManagedLease { pid }))
}

fn release_reference(pid: u32) -> Result<(), AnyError> {
    let lock = lock_state()?;
    let Some(mut state) = load_managed()? else {
        return Ok(());
    };
    state.references.retain(|reference| *reference != pid);
    prune_references(&mut state);
    if state.references.is_empty() && !state.keep_running {
        match docker_container_state()?.as_str() {
            "running" => docker_checked(["stop", CONTAINER])?,
            "stopped" | "absent" => {}
            other => return Err(format!("unexpected managed container state: {other}").into()),
        }
    }
    save_managed(&state)?;
    drop(lock);
    Ok(())
}

fn spawn_reaper(pid: u32) -> Result<(), AnyError> {
    let current = std::env::current_exe()?;
    let executable = if current
        .file_stem()
        .and_then(|value| value.to_str())
        .is_some_and(|name| name == "link-assistant-router")
    {
        current
    } else {
        current.with_file_name(format!(
            "link-assistant-router{}",
            std::env::consts::EXE_SUFFIX
        ))
    };
    Command::new(executable)
        .args(["server", "reap", &pid.to_string()])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("could not start managed-server crash reaper: {error}").into())
}

fn ensure_container_running(state: &ManagedState) -> Result<(), AnyError> {
    ensure_docker()?;
    match docker_container_state()?.as_str() {
        "running" => return wait_for_health(state.port),
        "stopped" => {
            docker_checked(["start", CONTAINER])?;
        }
        "absent" => {
            let port_mapping = format!("127.0.0.1:{}:8080", state.port);
            let volume = format!("{VOLUME}:/data");
            let output = Command::new("docker")
                .env("TOKEN_SECRET", &state.token_secret)
                .args([
                    "run",
                    "-d",
                    "--name",
                    CONTAINER,
                    "--label",
                    MANAGED_LABEL,
                    "-p",
                    &port_mapping,
                    "-e",
                    "TOKEN_SECRET",
                    "-e",
                    "DATA_DIR=/data/router",
                    "-e",
                    "STORAGE_POLICY=text",
                    "-e",
                    "CLAUDE_CODE_HOME=/data/claude",
                    "-v",
                    &volume,
                    IMAGE,
                    "serve",
                ])
                .output()?;
            check_docker_output(&output)?;
        }
        other => {
            return Err(format!("unexpected managed container state: {other}").into());
        }
    }
    wait_for_health(state.port)
}

fn wait_for_health(port: u16) -> Result<(), AnyError> {
    let deadline = Instant::now() + Duration::from_secs(20);
    while Instant::now() < deadline {
        if tcp_health(port) {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(100));
    }
    let logs = Command::new("docker")
        .args(["logs", "--tail", "20", CONTAINER])
        .output()
        .map(|output| String::from_utf8_lossy(&output.stderr).into_owned())
        .unwrap_or_default();
    Err(format!(
        "managed router container did not become healthy on 127.0.0.1:{port}: {}",
        compact(&logs)
    )
    .into())
}

fn tcp_health(port: u16) -> bool {
    let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_secs(1)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(1)));
    if stream
        .write_all(b"GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
        .is_err()
    {
        return false;
    }
    let mut response = String::new();
    stream.read_to_string(&mut response).is_ok()
        && response.starts_with("HTTP/1.1 200")
        && response.ends_with("ok")
}

fn docker_container_state() -> Result<String, AnyError> {
    let output = Command::new("docker")
        .args([
            "inspect",
            "--format",
            "{{if .State.Running}}running{{else}}stopped{{end}} {{index .Config.Labels \"com.link-assistant.router.managed\"}}",
            CONTAINER,
        ])
        .output();
    let output = match output {
        Ok(output) => output,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Err("Docker is not installed".into());
        }
        Err(error) => return Err(error.into()),
    };
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("No such object") || stderr.contains("No such container") {
            return Ok("absent".into());
        }
        return Err(format!("could not inspect {CONTAINER}: {}", compact(&stderr)).into());
    }
    let rendered = String::from_utf8_lossy(&output.stdout);
    let (state, label) = rendered.trim().split_once(' ').unwrap_or(("", ""));
    if label != "1" {
        return Err(format!(
            "container {CONTAINER} exists but is not owned by this wrapper; rename or remove it before retrying"
        )
        .into());
    }
    Ok(state.to_string())
}

fn docker_subscription_status() -> String {
    let output = Command::new("docker")
        .args(["exec", CONTAINER, "link-assistant-router", "auth", "status"])
        .output();
    match output {
        Ok(output) if output.status.success() => compact(&String::from_utf8_lossy(&output.stdout)),
        Ok(output) => format!(
            "unavailable ({})",
            compact(&String::from_utf8_lossy(&output.stderr))
        ),
        Err(error) => format!("unavailable ({error})"),
    }
}

fn ensure_docker() -> Result<(), AnyError> {
    let output = Command::new("docker")
        .args(["info", "--format", "{{.ServerVersion}}"])
        .output();
    let output = match output {
        Ok(output) => output,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Err("Docker is not installed; install Docker or pass --server <URL>".into());
        }
        Err(error) => return Err(error.into()),
    };
    if output.status.success() {
        return Ok(());
    }
    let stderr = String::from_utf8_lossy(&output.stderr);
    if stderr.to_ascii_lowercase().contains("permission denied") {
        Err("permission denied while connecting to Docker; add this user to the Docker group or pass --server <URL>".into())
    } else {
        Err(format!(
            "the Docker daemon is not running or unreachable; start Docker or pass --server <URL>: {}",
            compact(&stderr)
        )
        .into())
    }
}

fn docker_checked<I, S>(args: I) -> Result<(), AnyError>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    let output = Command::new("docker").args(args).output()?;
    check_docker_output(&output)
}

fn check_docker_output(output: &std::process::Output) -> Result<(), AnyError> {
    if output.status.success() {
        Ok(())
    } else {
        Err(format!(
            "Docker command failed: {}",
            compact(&String::from_utf8_lossy(&output.stderr))
        )
        .into())
    }
}

fn new_managed_state() -> ManagedState {
    ManagedState {
        port: choose_port(),
        token_secret: managed_secret(),
        references: Vec::new(),
        keep_running: false,
        claimed: false,
    }
}

fn load_or_create_managed() -> Result<ManagedState, AnyError> {
    if let Some(state) = load_managed()? {
        return Ok(state);
    }
    let state = new_managed_state();
    // Persist before Docker creation. If creation succeeds but readiness
    // fails, the next attempt must reuse the same port and credentials rather
    // than orphaning an unrecoverable container.
    save_managed(&state)?;
    Ok(state)
}

fn managed_secret() -> String {
    format!(
        "{}_{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    )
}

fn choose_port() -> u16 {
    TcpListener::bind(("127.0.0.1", 8080)).map_or_else(
        |_| {
            TcpListener::bind(("127.0.0.1", 0))
                .and_then(|listener| listener.local_addr())
                .map_or(18080, |address| address.port())
        },
        |_| 8080,
    )
}

fn prune_references(state: &mut ManagedState) {
    state.references.retain(|pid| process_alive(*pid));
}

fn process_alive(pid: u32) -> bool {
    if pid == std::process::id() {
        return true;
    }
    #[cfg(unix)]
    {
        Command::new("kill")
            .args(["-0", &pid.to_string()])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .is_ok_and(|status| status.success())
    }
    #[cfg(windows)]
    {
        Command::new("tasklist")
            .args(["/FI", &format!("PID eq {pid}"), "/NH"])
            .output()
            .is_ok_and(|output| {
                output.status.success()
                    && String::from_utf8_lossy(&output.stdout).contains(&pid.to_string())
            })
    }
}

fn state_directory() -> Result<PathBuf, AnyError> {
    let root = std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")))
        .or_else(|| std::env::var_os("APPDATA").map(PathBuf::from))
        .ok_or("HOME, XDG_CONFIG_HOME, and APPDATA are unset; cannot store server state")?;
    let path = root.join(CONFIG_DIRECTORY);
    fs::create_dir_all(&path)?;
    set_owner_only(&path)?;
    Ok(path)
}

fn lock_state() -> Result<File, AnyError> {
    let path = state_directory()?.join(MANAGED_LOCK);
    let file = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(path)?;
    file.lock_exclusive()?;
    Ok(file)
}

fn load_managed() -> Result<Option<ManagedState>, AnyError> {
    let path = state_directory()?.join(MANAGED_STATE);
    match fs::read_to_string(&path) {
        Ok(source) => Ok(Some(serde_json::from_str(&source).map_err(|error| {
            format!("invalid managed server state {}: {error}", path.display())
        })?)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

fn save_managed(state: &ManagedState) -> Result<(), AnyError> {
    write_private_json(&state_directory()?.join(MANAGED_STATE), state)
}

fn write_private_json(path: &Path, value: &impl Serialize) -> Result<(), AnyError> {
    let temporary = path.with_extension(format!("tmp-{}", uuid::Uuid::new_v4()));
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let mut file = options.open(&temporary)?;
    serde_json::to_writer_pretty(&mut file, value)?;
    file.write_all(b"\n")?;
    file.sync_all()?;
    #[cfg(windows)]
    if path.exists() {
        fs::remove_file(path)?;
    }
    fs::rename(&temporary, path)?;
    set_owner_only(path)?;
    Ok(())
}

fn set_owner_only(path: &Path) -> Result<(), std::io::Error> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        let mode = if path.is_dir() { 0o700 } else { 0o600 };
        fs::set_permissions(path, fs::Permissions::from_mode(mode))?;
    }
    Ok(())
}

fn normalize_server(server: &str) -> Result<String, AnyError> {
    let server = server.trim().trim_end_matches('/');
    if server.starts_with("http://") || server.starts_with("https://") {
        Ok(server.to_string())
    } else {
        Err("server URL must start with http:// or https://".into())
    }
}

fn compact(value: &str) -> String {
    const LIMIT: usize = 240;
    let compact = value.split_whitespace().collect::<Vec<_>>().join(" ");
    if compact.chars().count() <= LIMIT {
        compact
    } else {
        format!("{}…", compact.chars().take(LIMIT).collect::<String>())
    }
}
