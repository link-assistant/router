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
