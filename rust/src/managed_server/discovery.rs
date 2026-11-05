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
    if let Some(port) = crate::operation_context::var("ROUTER_PORT")
        .ok()
        .and_then(|value| value.trim().parse::<u16>().ok())
    {
        push(port);
    }
    push(DEFAULT_LOCAL_PORT);
    if let Ok(Some(state)) = load_managed() {
        push(state.port);
    }
    ports
}

/// Host ports Docker currently publishes to loopback, newest listeners first.
///
/// Best-effort: no Docker, no daemon, or no containers all yield an empty list
/// and leave the conventional ports as the only candidates.
#[cfg(test)]
fn published_container_ports() -> Vec<u16> {
    published_container_ports_with_budget(Duration::from_secs(1))
}

fn published_container_ports_with_budget(budget: Duration) -> Vec<u16> {
    let Ok(output) = crate::operation_context::bounded_output_limited(
        crate::operation_context::command("docker")
            .args(["ps", "--format", "{{.Ports}}"])
            .stderr(std::process::Stdio::null()),
        budget.min(Duration::from_secs(1)),
        65_536,
    ) else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }
    parse_published_ports(&String::from_utf8_lossy(&output.stdout))
}

/// Host ports reachable from this machine, parsed from `docker ps` port output.
///
/// Split out so the parsing is testable without a Docker daemon: the formats
/// below are what decides whether an SSH-tunnelled or operator-published router
/// is found at all, and they are easy to get subtly wrong.
fn parse_published_ports(listing: &str) -> Vec<u16> {
    if listing.len() > 65_536 {
        return Vec::new();
    }
    let mut ports = Vec::new();
    for mapping in listing
        .split([',', '\n'])
        .map(str::trim)
        .filter(|mapping| !mapping.is_empty())
    {
        // Entries look like `127.0.0.1:18878->8080/tcp`; the host port is what
        // a local caller can reach. An entry with no `->` publishes nothing to
        // the host, so there is no local port to try.
        let Some((host, _)) = mapping.split_once("->") else {
            continue;
        };
        let Some((address, port)) = host.rsplit_once(':') else {
            continue;
        };
        // Only bindings a loopback caller can actually reach. A container
        // published to one specific external address is not reachable here.
        if !matches!(address, "" | "127.0.0.1" | "0.0.0.0" | "[::]")
            || !mapping.ends_with("/tcp")
        {
            continue;
        }
        if let Ok(port) = port.trim().parse::<u16>()
            && port != 0
            && !ports.contains(&port)
        {
            ports.push(port);
            if ports.len() == 64 { break; }
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
    let deadline = std::time::Instant::now() + Duration::from_secs(3);
    let conventional = local_candidate_ports();
    for port in &conventional {
        if let Some(base_url) = probe_local_router(*port, deadline).await { return Some(base_url); }
    }
    let remaining = deadline.saturating_duration_since(std::time::Instant::now());
    if remaining.is_zero() { return None; }
    for port in published_container_ports_with_budget(remaining) {
        if !conventional.contains(&port) {
            if let Some(base_url) = probe_local_router(port, deadline).await { return Some(base_url); }
        }
    }
    None
}

async fn probe_local_router(port: u16, deadline: std::time::Instant) -> Option<String> {
    if deadline.saturating_duration_since(std::time::Instant::now()) < Duration::from_millis(150)
        || !port_accepts(port) { return None; }
    let remaining = deadline.saturating_duration_since(std::time::Instant::now());
    if remaining.is_zero() { return None; }
    let base_url = format!("http://127.0.0.1:{port}");
    if matches!(tokio::time::timeout(remaining.min(Duration::from_secs(1)), verify_health(&base_url)).await, Ok(Ok(()))) {
        Some(base_url)
    } else { None }
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
    let token = crate::operation_context::var("LINK_ASSISTANT_ROUTER_TOKEN")
        .or_else(|_| crate::operation_context::var("LINK_ASSISTANT_TOKEN"))
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
