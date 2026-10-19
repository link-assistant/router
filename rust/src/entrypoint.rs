//! Running the asynchronous entry point on a stack this crate controls.
//!
//! `#[tokio::main]` drives the future on the process main thread, whose size
//! the linker fixes — 1 MB on Windows. A debug build of the router's entry
//! future exceeded that, so every subcommand died before doing any work, while
//! the same binary was fine on Linux and macOS with their 8 MB defaults.
//!
//! A thread this crate spawns carries a stack it chooses, which removes the
//! platform difference rather than trimming the future until it happens to fit.

use std::future::Future;
use std::process::ExitCode;

/// Stack for the thread the entry point runs on, and for runtime workers.
const STACK_BYTES: usize = 16 * 1024 * 1024;

/// Run `entry` to completion on a thread with a generous stack.
///
/// # Panics
///
/// Propagates a panic from the entry point, so a failure surfaces exactly as
/// it would have on the main thread.
#[must_use]
pub fn run_on_a_deep_stack<F, Fut>(entry: F) -> ExitCode
where
    F: FnOnce() -> Fut + Send + 'static,
    Fut: Future<Output = ExitCode>,
{
    let worker = std::thread::Builder::new()
        .name("router-main".to_string())
        .stack_size(STACK_BYTES)
        .spawn(move || {
            tokio::runtime::Builder::new_multi_thread()
                .enable_all()
                .thread_stack_size(STACK_BYTES)
                .build()
                .expect("build the tokio runtime")
                .block_on(entry())
        })
        .expect("spawn the entry thread");
    match worker.join() {
        Ok(code) => code,
        Err(panic) => std::panic::resume_unwind(panic),
    }
}

#[cfg(test)]
#[path = "entrypoint_tests.rs"]
mod tests;
