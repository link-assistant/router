//! The stale-run sweep, which deletes files (issue #313).

use super::*;

/// Each test owns a separate parent: default-parallel tests and other test
/// processes must not sweep a dead-PID fixture before its lease is locked.
struct SweepFixture {
    root: tempfile::TempDir,
    ours: std::path::PathBuf,
}

impl SweepFixture {
    fn new() -> Self {
        let root = tempfile::tempdir().expect("isolated sweep root");
        let ours = root.path().join(format!(
            "link-assistant-router-with-{}-self",
            std::process::id()
        ));
        fs::create_dir(&ours).expect("create our directory");
        Self { root, ours }
    }

    fn dead_run(&self, name: &str) -> std::path::PathBuf {
        // A pid above every platform maximum, so it cannot be running.
        let path = self
            .root
            .path()
            .join(format!("link-assistant-router-with-4294967294-{name}"));
        fs::create_dir(&path).expect("create the stale directory");
        path
    }
}

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
    let fixture = SweepFixture::new();
    let ours = &fixture.ours;
    let stale = fixture.dead_run("stale");

    sweep_stale_directories(ours);

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
    assert!(owner_of(ours).is_some());
}

#[test]
fn the_sweep_keeps_a_leased_directory_even_if_its_name_claims_a_dead_pid() {
    let fixture = SweepFixture::new();
    let leased = fixture.dead_run("lease-active");
    let lease = fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(leased.join(".active.lock"))
        .expect("open lease");
    lease.lock().expect("hold lease");

    sweep_stale_directories(&fixture.ours);
    assert!(leased.is_dir(), "a live lease must prevent cleanup");

    lease.unlock().expect("release lease");
    drop(lease);
    sweep_stale_directories(&fixture.ours);
    assert!(!leased.exists(), "an abandoned lease can be cleaned");
}

#[test]
fn a_concurrent_sweep_cannot_remove_another_fixtures_unlocked_directory() {
    let fixture = SweepFixture::new();
    let leased = fixture.dead_run("lease-not-yet-locked");
    let competitor = SweepFixture::new();
    let competing_stale = competitor.dead_run("stale");

    // Force the problematic ordering rather than depending on scheduling:
    // another fixture sweeps while this one has created no lease yet.
    std::thread::spawn(move || {
        sweep_stale_directories(&competitor.ours);
        assert!(
            !competing_stale.exists(),
            "the competing sweep still cleans"
        );
    })
    .join()
    .expect("competing sweep completes");
    assert!(
        leased.is_dir(),
        "an unrelated sweep cannot reach this fixture"
    );

    sweep_stale_directories(&fixture.ours);
    assert!(
        !leased.exists(),
        "the owning fixture can still clean its stale run"
    );
}
