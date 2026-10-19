//! `router deploy` updates the relay as well as the backend (issue #627).
//!
//! v1.14.3 updated the backend of a v1.14.2 deployment and kept the v1.14.2
//! relay, and status still called the deployment converged. This test deploys
//! `ROUTER_DEPLOY_TEST_PREVIOUS_IMAGE`, updates to `ROUTER_DEPLOY_TEST_IMAGE`
//! while two requests are in flight, and asserts both container images, the
//! continuity of each request, and that one container at most ever publishes
//! the listener. Skipped, visibly, without a runtime or either image.
#![cfg(unix)]

use std::io::{Read as _, Write as _};
use std::process::Command;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::time::{Duration, Instant};

mod common;
#[path = "deploy_docker/harness.rs"]
mod harness;

use harness::{Deployment, ready, token_records};
use link_assistant_router::deploy::RELAY;

fn previous_image(test: &str) -> Option<String> {
    let image = std::env::var("ROUTER_DEPLOY_TEST_PREVIOUS_IMAGE")
        .ok()
        .filter(|value| !value.trim().is_empty());
    if image.is_none() {
        common::tiers::unavailable(
            common::tiers::Tier::Integration,
            test,
            "ROUTER_DEPLOY_TEST_PREVIOUS_IMAGE names no image to update from",
        );
    }
    image
}

fn inspect(container: &str, format: &str) -> String {
    let output = Command::new("docker")
        .args(["inspect", "--format", format, container])
        .output()
        .unwrap();
    assert!(output.status.success(), "inspect {container} failed");
    String::from_utf8_lossy(&output.stdout).trim().to_string()
}

fn current(deployment: &Deployment) -> String {
    std::fs::read_to_string(deployment.root.path().join("state/current"))
        .unwrap_or_default()
        .trim()
        .to_string()
}

/// An HTTP request whose final blank line is withheld, so the connection
/// stays established through the relay until `finish` is called.
fn open_request(port: u16) -> std::net::TcpStream {
    let mut stream = std::net::TcpStream::connect(("127.0.0.1", port)).unwrap();
    stream
        .write_all(b"GET /api/health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n")
        .unwrap();
    stream
}

fn finish(mut stream: std::net::TcpStream) {
    stream.write_all(b"\r\n").unwrap();
    let mut response = String::new();
    stream.read_to_string(&mut response).unwrap();
    assert!(
        response.starts_with("HTTP/1.1 200"),
        "in-flight request was interrupted: {response:?}"
    );
}

#[test]
fn an_update_converges_the_relay_image_without_interrupting_requests() {
    use wait_timeout::ChildExt as _;

    let test = "an_update_converges_the_relay_image_without_interrupting_requests";
    let Some(image) = ready(test) else { return };
    let Some(previous) = previous_image(test) else {
        return;
    };
    let deployment = Deployment::new();
    let first = deployment.deploy(&["--image", &previous]);
    assert!(first.status.success(), "{first:?}");
    let old = current(&deployment);
    assert_eq!(inspect(RELAY, "{{.Config.Image}}"), previous);
    let old_relay_id = inspect(RELAY, "{{.Id}}");
    let tokens_before = token_records(&old);

    // Sample who publishes the listener for the whole update.
    let done = Arc::new(AtomicBool::new(false));
    let most_publishers = Arc::new(AtomicUsize::new(0));
    let sampler = {
        let (done, most_publishers, port) =
            (done.clone(), most_publishers.clone(), deployment.port);
        std::thread::spawn(move || {
            while !done.load(Ordering::Relaxed) {
                let output = Command::new("docker")
                    .args(["ps", "-q", "--filter", &format!("publish={port}")])
                    .output()
                    .unwrap();
                let publishers = String::from_utf8_lossy(&output.stdout)
                    .split_whitespace()
                    .count();
                most_publishers.fetch_max(publishers, Ordering::Relaxed);
                std::thread::sleep(Duration::from_millis(100));
            }
        })
    };

    // One request on the old backend, then one on the candidate after cutover.
    let on_old = open_request(deployment.port);
    let mut update = deployment.command(&["--image", &image]).spawn().unwrap();
    let deadline = Instant::now() + Duration::from_secs(120);
    while current(&deployment).is_empty() || current(&deployment) == old {
        assert!(Instant::now() < deadline, "candidate was never selected");
        std::thread::sleep(Duration::from_millis(100));
    }
    let on_candidate = open_request(deployment.port);
    finish(on_old);
    // The old backend drains; the relay must still wait for the candidate's
    // request instead of rotating underneath it.
    std::thread::sleep(Duration::from_secs(8));
    assert_eq!(
        inspect(RELAY, "{{.Id}}"),
        old_relay_id,
        "relay rotated mid-request"
    );
    assert!(update.try_wait().unwrap().is_none());
    finish(on_candidate);

    let status = update
        .wait_timeout(Duration::from_secs(90))
        .unwrap()
        .expect("update did not finish after requests completed");
    done.store(true, Ordering::Relaxed);
    sampler.join().unwrap();
    assert!(status.success());
    assert!(
        most_publishers.load(Ordering::Relaxed) <= 1,
        "two listeners"
    );

    let backend = current(&deployment);
    assert_eq!(inspect(&backend, "{{.Config.Image}}"), image);
    assert_eq!(inspect(RELAY, "{{.Config.Image}}"), image);
    assert_eq!(
        inspect(RELAY, "{{.Image}}"),
        inspect(&backend, "{{.Image}}")
    );
    assert_eq!(token_records(&backend), tokens_before);
    assert!(deployment.health());

    let report = deployment.deploy(&["--status"]);
    let stdout = String::from_utf8_lossy(&report.stdout);
    assert!(report.status.success(), "{stdout}");
    assert!(
        stdout.contains(&format!("relay_image={image} ")),
        "{stdout}"
    );
    assert!(stdout.contains("version_skew=false"), "{stdout}");
    assert!(stdout.contains("converged=true"), "{stdout}");
}
