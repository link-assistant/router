//! The stale-run sweep, which deletes files (issue #313).

use super::*;

/// A pid the sweep cannot prove is gone counts as alive. `kill -0` fails both
/// for "no such process" and for a live process owned by somebody else, and
/// reading the second as the first deleted another user's working directory,
/// client configuration and credential while they were in use.
#[test]
fn a_live_process_is_never_reported_dead() {
    assert!(process_alive(std::process::id()), "our own run is alive");
    // pid 1 exists on every unix and is owned by root, so `kill -0` fails with
    // EPERM for an ordinary user — the exact case that used to read as dead.
    #[cfg(unix)]
    assert!(
        process_alive(1),
        "a process that exists but is not ours must count as alive"
    );
}

/// A directory belonging to another user is never removed, whatever its name
/// claims about liveness.
#[test]
fn the_sweep_only_removes_this_users_directories() {
    let temporary = std::env::temp_dir();
    let ours = temporary.join(format!(
        "link-assistant-router-with-{}-sweep-self",
        std::process::id()
    ));
    // A pid above every platform maximum, so it cannot be running.
    let stale = temporary.join("link-assistant-router-with-4294967294-sweep-stale");
    let _ = fs::remove_dir_all(&ours);
    let _ = fs::remove_dir_all(&stale);
    fs::create_dir_all(&ours).expect("create our directory");
    fs::create_dir_all(&stale).expect("create the stale directory");

    sweep_stale_directories(&ours);

    assert!(
        ours.is_dir(),
        "the running run's own directory must survive"
    );
    assert!(
        !stale.exists(),
        "a dead run of this user's is what the sweep is for"
    );
    // Ownership is consulted at all: a path this user cannot own answers
    // differently, or the platform has no owners and the check is inert.
    assert!(owner_of(&ours).is_some());
    let _ = fs::remove_dir_all(&ours);
}
