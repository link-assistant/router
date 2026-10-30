//! Independent bounded native dependency oracles. SOURCE ONLY; UNRUN. CI after all JS gates.
use link_assistant_router::{bounded_process, operation_context};
use std::process::Command;
use std::time::Duration;

#[test]
fn invalid_capture_bounds_refuse_before_executable_lookup() {
    for maximum in [0, 8 * 1024 * 1024 + 1] {
        let error = bounded_process::output_limited(&mut Command::new("must-never-be-started"), Duration::from_secs(1), maximum).unwrap_err();
        assert_eq!(error.kind(), std::io::ErrorKind::InvalidInput);
    }
}

#[test]
#[cfg(unix)]
fn exact_cap_is_valid_but_overflow_on_either_pipe_is_fatal() {
    let answer = bounded_process::output_limited(Command::new("sh").args(["-c", "printf 1234; printf 5678 >&2"]), Duration::from_secs(2), 4).expect("exact independent pipe caps");
    assert_eq!(answer.stdout, b"1234");
    assert_eq!(answer.stderr, b"5678");
    for script in ["printf 12345", "printf 12345 >&2", "head -c 100000 /dev/zero; head -c 100000 /dev/zero >&2"] {
        let error = bounded_process::output_limited(Command::new("sh").args(["-c", script]), Duration::from_secs(2), 4).unwrap_err();
        assert_eq!(error.kind(), std::io::ErrorKind::InvalidData);
    }
}

#[test]
#[cfg(unix)]
fn small_output_does_not_waive_the_dependency_deadline() {
    let start = std::time::Instant::now();
    let error = bounded_process::output_limited(Command::new("sh").args(["-c", "printf ok; sleep 30 & wait"]), Duration::from_millis(100), 64).unwrap_err();
    assert_eq!(error.kind(), std::io::ErrorKind::TimedOut);
    assert!(start.elapsed() < Duration::from_secs(2));
}

#[test]
#[cfg(unix)]
fn injected_operation_runner_keeps_deadline_and_independent_output_bounds() {
    use std::os::unix::process::ExitStatusExt as _;
    struct Fixture;
    impl operation_context::ProcessRunner for Fixture {
        fn output(&self, command: &mut Command, deadline: Duration) -> std::io::Result<std::process::Output> {
            assert_eq!(command.get_program(), "docker");
            assert_eq!(deadline, Duration::from_secs(1));
            Ok(std::process::Output { status: std::process::ExitStatus::from_raw(0), stdout: b"12345".to_vec(), stderr: Vec::new() })
        }
    }
    let directory = tempfile::tempdir().expect("isolated state");
    let mut context = operation_context::OperationContext::isolated(directory.path());
    context.process_runner = Some(std::sync::Arc::new(Fixture));
    context.scope(|| {
        let error = operation_context::bounded_output_limited(&mut operation_context::command("docker"), Duration::from_secs(1), 4).unwrap_err();
        assert_eq!(error.kind(), std::io::ErrorKind::InvalidData);
    });
}
