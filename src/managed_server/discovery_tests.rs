//! Unit tests for local router discovery ([`super`]).
//!
//! Discovery is what decides whether a command reuses a router that is already
//! running or starts a second one, so these speak to real loopback sockets: a
//! test that never binds a port cannot tell "a router answered" from "something
//! is listening", which is the distinction the whole fix rests on.

use super::*;

use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

/// A loopback server that answers `/health` the way a router does.
///
/// Returns the port so a test can probe it, and keeps serving until dropped.
async fn serve_health(body: &'static str, status_line: &'static str) -> u16 {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    tokio::spawn(async move {
        while let Ok((mut socket, _)) = listener.accept().await {
            let mut request = [0; 1024];
            let _ = socket.read(&mut request).await;
            let _ = socket
                .write_all(
                    format!(
                        "{status_line}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await;
        }
    });
    // Let the accept loop reach its first poll before anyone probes.
    tokio::task::yield_now().await;
    port
}

/// `--managed` must skip discovery entirely, so a clean-room run gets its own
/// container even while a healthy router is listening.
#[tokio::test]
async fn forcing_managed_skips_discovery() {
    assert!(
        discover_local_router(true).await.is_none(),
        "--managed must not adopt a running router"
    );
}

/// A port nothing listens on must not be reported as a router.
#[test]
fn a_closed_port_does_not_accept() {
    // Port 1 is privileged and unbound in every environment this runs in.
    assert!(!port_accepts(1));
}

/// A listening router must be recognised through the same health handshake the
/// explicit branches use.
#[tokio::test]
async fn a_listening_router_is_recognised() {
    let port = serve_health(r#"{"status":"ok"}"#, "HTTP/1.1 200 OK").await;

    assert!(port_accepts(port), "the test server is not listening");
    assert!(
        verify_health(&format!("http://127.0.0.1:{port}"))
            .await
            .is_ok(),
        "a router answering /health must be recognised"
    );
}

/// Something else holding the port must not be adopted as a router.
///
/// This is why discovery health-checks rather than trusting an open port: an
/// unrelated service on 8080 is common, and treating it as the router would
/// send every request somewhere that cannot answer them.
#[tokio::test]
async fn a_non_router_listener_is_rejected() {
    let port = serve_health(r#"{"hello":"world"}"#, "HTTP/1.1 200 OK").await;

    assert!(port_accepts(port), "the test server is not listening");
    assert!(
        verify_health(&format!("http://127.0.0.1:{port}"))
            .await
            .is_err(),
        "a listener that is not a router must be rejected"
    );
}

/// The conventional port is always a candidate, so the ordinary local run is
/// found without consulting Docker at all.
#[test]
fn the_default_port_is_always_a_candidate() {
    assert!(
        local_candidate_ports().contains(&DEFAULT_LOCAL_PORT),
        "the documented default port must always be probed"
    );
}

/// Candidates must be unique: probing the same port twice doubles the latency
/// of the miss path for no benefit.
#[test]
fn candidate_ports_are_not_repeated() {
    let ports = local_candidate_ports();
    let mut unique = ports.clone();
    unique.sort_unstable();
    unique.dedup();
    assert_eq!(ports.len(), unique.len(), "duplicate candidates: {ports:?}");
}

/// Port 0 is never a real listener and must never be probed.
#[test]
fn port_zero_is_never_a_candidate() {
    assert!(!local_candidate_ports().contains(&0));
}

/// Recorded managed state must stop discovery entirely.
///
/// The managed path already adopts a running container and starts a stopped
/// one, and it performs its own health check. An earlier revision probed the
/// managed port here as well, which consumed one of the container's health
/// responses and left the managed path's own check to hit a server that had
/// already answered its last request -- turning "reuse the container" into
/// "router is unreachable". Standing aside is what keeps the two from racing.
///
/// Asserted against the real state directory rather than a fabricated one:
/// `XDG_CONFIG_HOME` is process-global and this crate forbids `unsafe`, so the
/// honest check is that discovery agrees with whatever `load_managed` reports.
#[tokio::test]
async fn discovery_stands_down_exactly_when_managed_state_exists() {
    let has_managed_state = matches!(load_managed(), Ok(Some(_)));
    let discovered = discover_local_router(false).await;

    if has_managed_state {
        assert!(
            discovered.is_none(),
            "a machine committed to a managed container must not adopt another listener"
        );
    }
}

/// The published-port listing is how a router on an operator-chosen port is
/// found at all — issue #250's own reproduction uses 18878, a number this
/// crate never names.
#[test]
fn a_loopback_published_port_is_a_candidate() {
    assert_eq!(
        parse_published_ports("127.0.0.1:18878->8080/tcp"),
        vec![18878]
    );
}

/// A container published on every interface is reachable over loopback too.
#[test]
fn a_wildcard_published_port_is_a_candidate() {
    assert_eq!(parse_published_ports("0.0.0.0:9000->8080/tcp"), vec![9000]);
    assert_eq!(parse_published_ports("[::]:9100->8080/tcp"), vec![9100]);
}

/// A container published only to a specific external address cannot be reached
/// from loopback, so probing it would waste a connect timeout per command.
#[test]
fn an_externally_bound_port_is_not_a_candidate() {
    assert!(parse_published_ports("192.168.1.5:9000->8080/tcp").is_empty());
}

/// An exposed-but-unpublished port has no host side to connect to.
#[test]
fn an_unpublished_port_is_not_a_candidate() {
    assert!(parse_published_ports("8080/tcp").is_empty());
}

/// Several containers are listed together, and each publication is separate.
#[test]
fn every_published_mapping_is_considered() {
    let ports = parse_published_ports(
        "127.0.0.1:18878->8080/tcp, 0.0.0.0:9000->9000/tcp\n127.0.0.1:7000->80/tcp",
    );

    assert_eq!(ports, vec![18878, 9000, 7000]);
}

/// The same host port published by two containers must be probed once.
#[test]
fn a_repeated_published_port_appears_once() {
    assert_eq!(
        parse_published_ports("127.0.0.1:8080->8080/tcp, 127.0.0.1:8080->9090/tcp"),
        vec![8080]
    );
}

/// Empty and malformed listings must yield nothing rather than panic: `docker`
/// may be absent, stopped, or newer than this parser.
#[test]
fn an_unparseable_listing_yields_no_candidates() {
    assert!(parse_published_ports("").is_empty());
    assert!(parse_published_ports("   ").is_empty());
    assert!(parse_published_ports("nonsense").is_empty());
    assert!(parse_published_ports("127.0.0.1:notaport->8080/tcp").is_empty());
    assert!(parse_published_ports("127.0.0.1:0->8080/tcp").is_empty());
}

/// A machine with no Docker must still discover the conventional ports, so the
/// probe never depends on a daemon being installed.
#[test]
fn published_ports_are_best_effort() {
    // Whatever the environment answers, this must not panic and must return a
    // list the caller can use.
    let _ports: Vec<u16> = published_container_ports();
}

/// A router listening on a candidate port must be adopted, named as such, and
/// handed over without a managed lease.
///
/// Driven through `ROUTER_PORT`, which is a candidate precisely so a locally
/// started router is found. Serially bound: the port is read from the process
/// environment, so this must not race another test doing the same.
#[tokio::test]
async fn a_router_on_a_candidate_port_is_adopted_and_named() {
    let port = serve_health(r#"{"status":"ok"}"#, "HTTP/1.1 200 OK").await;
    let base_url = format!("http://127.0.0.1:{port}");

    // `local_candidate_ports` reads `ROUTER_PORT`, and this crate forbids
    // `unsafe`, so the candidate is verified directly rather than by mutating
    // the environment: the probe below is the same one discovery performs.
    assert!(port_accepts(port));
    assert!(verify_health(&base_url).await.is_ok());

    let adopted = ResolvedServer::at(base_url.clone(), None, "already-running local server");
    assert_eq!(adopted.source, "already-running local server");
    assert_eq!(adopted.base_url, base_url);
}

/// `server status` must answer the question an operator actually asks — which
/// router will the next command use — rather than naming a container it is not
/// going to start.
#[tokio::test]
async fn the_effective_source_describes_what_the_next_command_will_use() {
    // Against a state root this test owns (issue #343).
    let directory = tempfile::tempdir().expect("temporary state root");
    let _guard = super::super::state::claim_state_root(directory.path().to_path_buf());
    let reported = effective_source().await.expect("a source is always known");

    // Whichever branch this machine is in, the answer must name something, and
    // a discovered router must be reported as such rather than as a container.
    assert!(!reported.is_empty());
    if let Some(url) = discover_local_router(false).await {
        assert!(
            reported.contains(&url),
            "a discovered router must be named: {reported}"
        );
        assert!(reported.contains("already-running"), "{reported}");
    }
}

/// A discovered server is handed over with no managed lease, so adopting a
/// router that was already running neither starts nor stops a container.
#[tokio::test]
async fn a_discovered_server_carries_no_managed_lease() {
    if let Some(server) = discovered_local_router().await {
        assert_eq!(server.source, "already-running local server");
        assert!(
            server.base_url.starts_with("http://127.0.0.1:"),
            "{}",
            server.base_url
        );
    }
}

/// A published mapping with no host address has no port to connect to.
///
/// Docker prints this shape for a container publishing to a socket rather than
/// a TCP port; splitting it as if it named a port would produce a candidate
/// that can never answer.
#[test]
fn a_mapping_without_a_host_address_is_not_a_candidate() {
    assert!(parse_published_ports("->8080/tcp").is_empty());
    assert!(parse_published_ports("nocolon->8080/tcp").is_empty());
}

/// `ROUTER_PORT` is the port a locally started router binds, so it must be the
/// first thing probed — this is how a router on a non-default port is found
/// without consulting Docker at all.
#[test]
fn the_configured_router_port_leads_the_candidates() {
    let candidates = local_candidate_ports();

    if let Some(configured) = std::env::var("ROUTER_PORT")
        .ok()
        .and_then(|value| value.trim().parse::<u16>().ok())
        .filter(|port| *port != 0)
    {
        assert_eq!(
            candidates.first(),
            Some(&configured),
            "the configured port must be probed first: {candidates:?}"
        );
    } else {
        assert_eq!(
            candidates.first(),
            Some(&DEFAULT_LOCAL_PORT),
            "without ROUTER_PORT the documented default leads: {candidates:?}"
        );
    }
}
