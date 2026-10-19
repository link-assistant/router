//! Native command execution survives transient executable-file write locks.
#![cfg(target_os = "linux")]

use link_assistant_router::{bounded_process, deploy_image, operation_context::OperationContext};
use std::{
    fs::File,
    io::Write as _,
    os::unix::fs::PermissionsExt as _,
    process::Command,
    time::{Duration, Instant},
};

fn busy_script(directory: &std::path::Path, body: &str) -> (std::path::PathBuf, File) {
    let path = directory.join("docker");
    let mut writer = File::create(&path).unwrap();
    writeln!(writer, "#!/bin/sh\n{body}").unwrap();
    writer
        .set_permissions(std::fs::Permissions::from_mode(0o700))
        .unwrap();
    // Deterministically reproduce a write handle inherited by an unrelated
    // fork before its exec closes it (rust-lang/rust#114554).
    assert_eq!(
        Command::new(&path).spawn().unwrap_err().kind(),
        std::io::ErrorKind::ExecutableFileBusy
    );
    (path, writer)
}

#[test]
fn transient_executable_write_lock_preserves_status_and_both_pipes() {
    let directory = tempfile::tempdir().unwrap();
    let (script, writer) = busy_script(
        directory.path(),
        "echo complete; echo unauthorized >&2; exit 17",
    );
    let release = std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(100));
        drop(writer);
    });
    let result =
        bounded_process::output(Command::new(script).arg("inspect"), Duration::from_secs(2));
    release.join().unwrap();
    let result = result.unwrap();
    assert_eq!(result.status.code(), Some(17));
    assert_eq!(result.stdout, b"complete\n");
    assert_eq!(result.stderr, b"unauthorized\n");
}

#[test]
fn image_preflight_preserves_registry_errors_after_a_transient_write_lock() {
    let directory = tempfile::tempdir().unwrap();
    let (_script, writer) = busy_script(directory.path(), "echo unauthorized >&2; exit 1");
    let mut context = OperationContext::isolated(directory.path());
    context.set_env("PATH", directory.path());
    let release = std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(100));
        drop(writer);
    });
    let result = context
        .scope(|| deploy_image::ensure_default("ghcr.io/link-assistant/router:1.16.0", "1.16.0"));
    release.join().unwrap();
    let error = result.unwrap_err();
    assert!(error.contains("image-unavailable"), "{error}");
    assert!(error.contains("unauthorized"), "{error}");
    assert!(!error.contains("image-unpublished"), "{error}");
}

#[test]
fn persistent_executable_write_lock_obeys_the_process_deadline() {
    let directory = tempfile::tempdir().unwrap();
    let (script, _writer) = busy_script(directory.path(), "exit 0");
    let start = Instant::now();
    let error =
        bounded_process::output(&mut Command::new(script), Duration::from_millis(100)).unwrap_err();
    assert_eq!(error.kind(), std::io::ErrorKind::TimedOut);
    assert!(start.elapsed() < Duration::from_secs(2));
}

#[test]
fn launch_retries_share_the_deadline_with_command_execution() {
    let directory = tempfile::tempdir().unwrap();
    let (script, writer) = busy_script(directory.path(), "/bin/sleep 0.15; echo complete");
    let release = std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(100));
        drop(writer);
    });
    let result = bounded_process::output(&mut Command::new(script), Duration::from_millis(200));
    release.join().unwrap();
    assert_eq!(result.unwrap_err().kind(), std::io::ErrorKind::TimedOut);
}

#[test]
fn launch_and_command_failures_are_not_retried() {
    let directory = tempfile::tempdir().unwrap();
    let error = bounded_process::output(
        &mut Command::new(directory.path().join("absent")),
        Duration::from_secs(2),
    )
    .unwrap_err();
    assert_eq!(error.kind(), std::io::ErrorKind::NotFound);

    let (script, writer) = busy_script(
        directory.path(),
        "echo invocation >> \"$1\"; echo unauthorized >&2; exit 1",
    );
    drop(writer);
    let calls = directory.path().join("calls");
    let result =
        bounded_process::output(Command::new(script).arg(&calls), Duration::from_secs(2)).unwrap();
    assert_eq!(result.status.code(), Some(1));
    assert_eq!(result.stderr, b"unauthorized\n");
    assert_eq!(std::fs::read_to_string(calls).unwrap(), "invocation\n");
}
