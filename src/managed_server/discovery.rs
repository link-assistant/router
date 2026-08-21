//! Finding a router that is already listening on this machine.
//!
//! Split from `managed_server.rs` to keep that file within the repository's
//! 1000-line limit.
//!
//! When no server was chosen explicitly, `with` and `auth` used to start a
//! managed Docker container without ever asking whether a router was already
//! running — including one reachable on localhost because an SSH tunnel
//! forwards a remote deployment there. That made the expensive branch the
//! default and split state silently: the new container has its own credential
//! directory and token store (issue #250). The explicit mechanisms — `--server`,
//! the environment variables, and the persisted `server use` selection — are
//! unchanged and still take precedence; this only fills in the default.

use std::net::TcpStream;
use std::time::Duration;

use super::{
    AnyError, DEFAULT_LOCAL_PORT, ResolvedServer, configured_source, load_managed, verify_health,
};

/// Ports a router conventionally listens on locally, most likely first.
///
/// The managed port is probed too: a container this machine started earlier and
/// left running is exactly as reusable as any other local instance.
fn local_candidate_ports() -> Vec<u16> {
    let mut ports = Vec::new();
    let mut push = |port: u16| {
        if port != 0 && !ports.contains(&port) {
            ports.push(port);
        }
    };
    // `ROUTER_PORT` is what a locally started router binds, so it is the most
    // specific thing this machine knows about where one would be.
    if let Some(port) = std::env::var("ROUTER_PORT")
        .ok()
        .and_then(|value| value.trim().parse::<u16>().ok())
    {
        push(port);
    }
    push(DEFAULT_LOCAL_PORT);
    if let Ok(Some(state)) = load_managed() {
        push(state.port);
    }
    // A deployment reached over an SSH tunnel, or a container published on an
    // operator-chosen port, listens somewhere this crate never named — issue
    // #250's own reproduction uses 18878. Rather than guess, ask the machine
    // which ports are actually published; each is still health-checked before
    // it is believed, so a non-router listener is rejected exactly as any other.
    for port in published_container_ports() {
        push(port);
    }
    ports
}

/// Host ports Docker currently publishes to loopback, newest listeners first.
///
/// Best-effort: no Docker, no daemon, or no containers all yield an empty list
/// and leave the conventional ports as the only candidates.
fn published_container_ports() -> Vec<u16> {
    let Ok(output) = std::process::Command::new("docker")
        .args(["ps", "--format", "{{.Ports}}"])
        .stderr(std::process::Stdio::null())
        .output()
    else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }
    let mut ports = Vec::new();
    for mapping in String::from_utf8_lossy(&output.stdout)
        .split(',')
        .map(str::trim)
    {
        // Entries look like `127.0.0.1:18878->8080/tcp`; the host port is what
        // a local caller can reach.
        let Some((host, _)) = mapping.split_once("->") else {
            continue;
        };
        let Some((address, port)) = host.rsplit_once(':') else {
            continue;
        };
        if !address.is_empty() && !address.contains("127.0.0.1") && !address.contains("0.0.0.0") {
            continue;
        }
        if let Ok(port) = port.trim().parse::<u16>()
            && !ports.contains(&port)
        {
            ports.push(port);
        }
    }
    ports
}

/// Find a router already listening on this machine, if there is one.
///
/// `force_managed` short-circuits the whole probe, so `--managed` costs nothing.
///
/// Probing is two-stage on purpose: a TCP connect with a short timeout rules
/// out the common case (nothing is there) in microseconds, so the ordinary
/// no-router path pays no HTTP timeout. Only a port that accepts gets the same
/// `verify_health` handshake every other branch uses, which is what
/// distinguishes a router from any other process that happens to hold the port.
pub(super) async fn discover_local_router(force_managed: bool) -> Option<String> {
    if force_managed {
        return None;
    }
    // A machine that has already recorded managed state has an answer to
    // "which router should this be" that predates any probe: that container.
    // The managed path below already adopts a running one and starts a stopped
    // one, so discovery must stand aside entirely rather than race it --
    // adopting some other listener would silently redirect a workflow already
    // committed to the managed instance, and probing the managed port here
    // would duplicate the health check that path performs.
    if matches!(load_managed(), Ok(Some(_))) {
        return None;
    }
    for port in local_candidate_ports() {
        if !port_accepts(port) {
            continue;
        }
        let base_url = format!("http://127.0.0.1:{port}");
        if verify_health(&base_url).await.is_ok() {
            return Some(base_url);
        }
    }
    None
}

/// Whether something is accepting connections on a local port.
fn port_accepts(port: u16) -> bool {
    let address = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&address, Duration::from_millis(150)).is_ok()
}

/// A router already listening on this machine, when there is one.
///
/// Exposed for callers that have no persisted selection to fall back on and
/// would otherwise act on this machine's own credential directory — `auth`
/// most of all, where landing a subscription in the wrong place is invisible
/// until the router in use fails to serve it (issue #250).
///
/// The token comes from the environment when one is set: a discovered server
/// may be claimed, and a caller holding no credential is reported as a plain
/// authorization failure by the endpoint it tries, naming the remedy.
pub async fn discovered_local_router() -> Option<ResolvedServer> {
    let base_url = discover_local_router(false).await?;
    let token = std::env::var("LINK_ASSISTANT_ROUTER_TOKEN")
        .or_else(|_| std::env::var("LINK_ASSISTANT_TOKEN"))
        .ok();
    Some(ResolvedServer::at(
        base_url,
        token,
        "already-running local server",
    ))
}

/// The effective source, including a router already listening locally.
///
/// `configured_source` stays synchronous and explicit-only; discovery needs to
/// probe, so it lives here. `server status` uses this one so it answers the
/// question an operator actually asks — which router will the next command
/// use? — rather than naming a container that will not be started (issue #250).
pub async fn effective_source() -> Result<String, AnyError> {
    let configured = configured_source()?;
    if configured != "managed local container" {
        return Ok(configured);
    }
    Ok(discover_local_router(false)
        .await
        .map_or(configured, |url| {
            format!("already-running local server: {url}")
        }))
}

#[cfg(test)]
#[path = "discovery_tests.rs"]
mod tests;
