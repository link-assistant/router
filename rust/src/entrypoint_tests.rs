//! Unit tests for [`crate::entrypoint`].

use super::*;

/// The entry point runs off the process main thread, so its stack is one this
/// crate chose rather than one the linker fixed.
///
/// Windows fixes the main thread at 1 MB, which a debug build of the router's
/// entry future exceeded — every subcommand died before doing any work, while
/// Linux and macOS were fine on their 8 MB defaults.
#[test]
fn the_entry_point_runs_on_a_named_thread_of_its_own() {
    let code = run_on_a_deep_stack(|| async {
        let thread = std::thread::current();
        assert_eq!(
            thread.name(),
            Some("router-main"),
            "the entry point must not run on the process main thread"
        );
        std::process::ExitCode::SUCCESS
    });

    assert_eq!(
        format!("{code:?}"),
        format!("{:?}", std::process::ExitCode::SUCCESS)
    );
}

/// A deep call chain completes, where the platform's main-thread stack would
/// decide the outcome instead.
#[test]
fn a_deep_call_chain_completes() {
    fn descend(depth: u32) -> u32 {
        // Each frame holds a kilobyte, so the chain needs far more than a
        // 1 MB stack to finish.
        let ballast = [0u8; 1024];
        if depth == 0 {
            return u32::from(ballast[0]);
        }
        descend(depth - 1)
    }

    let code = run_on_a_deep_stack(|| async {
        assert_eq!(descend(3_000), 0);
        std::process::ExitCode::SUCCESS
    });

    assert_eq!(
        format!("{code:?}"),
        format!("{:?}", std::process::ExitCode::SUCCESS)
    );
}
