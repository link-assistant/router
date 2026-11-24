//! Cancellation owns the verification process tree, including PTY children.
#![cfg(unix)]
use link_assistant_router::login_pty::PtySession;
use portable_pty::CommandBuilder;
use std::process::Command;
use std::time::{Duration, Instant};

#[test]
fn aborting_a_pty_cleans_up_a_hup_ignoring_grandchild() {
    let mut command = CommandBuilder::new("sh");
    command.args(["-c", "trap '' HUP; sleep 30 & echo CHILD:$!; wait"]);
    let session = PtySession::spawn(command).unwrap();
    let transcript = session
        .wait_for(
            |text| text.contains("CHILD:"),
            Duration::from_millis(20),
            Duration::from_secs(3),
        )
        .unwrap();
    let pid = transcript
        .split("CHILD:")
        .nth(1)
        .unwrap()
        .split_whitespace()
        .next()
        .unwrap();
    let start = Instant::now();
    drop(session);
    assert!(
        start.elapsed() < Duration::from_secs(3),
        "cleanup was not bounded"
    );
    let status = Command::new("ps")
        .args(["-p", pid, "-o", "stat="])
        .output()
        .unwrap();
    let state = String::from_utf8_lossy(&status.stdout);
    assert!(
        state.trim().is_empty() || state.trim().starts_with('Z'),
        "verification child remains running: {state}"
    );
}
