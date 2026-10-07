#!/usr/bin/env rust-script
//! Run the actual sweep unit tests without compiling the unrelated Router modules.
//! ```cargo
//! [dependencies]
//! tempfile = "3"
//! ```

use std::fs;

mod operation_context {
    pub fn command(program: &str) -> std::process::Command {
        std::process::Command::new(program)
    }
    pub fn process_output(
        command: &mut std::process::Command,
    ) -> std::io::Result<std::process::Output> {
        command.output()
    }
}

#[path = "../../src/with_command_sweep.rs"]
mod sweep;
use sweep::{DisposableRunDirectory, owner_of, process_alive, sweep_stale_directories};

#[cfg(test)]
#[path = "../../src/with_command_sweep_tests.rs"]
mod tests;

#[test]
fn the_real_temporary_directory_is_leased_and_removed_on_drop() {
    let prefix = format!("link-assistant-router-with-{}-probe-", std::process::id());
    let run = DisposableRunDirectory::create(&prefix).expect("create actual run");
    let path = run.path().to_owned();
    assert!(path.join(".active.lock").is_file());
    assert!(path.is_dir());
    drop(run);
    assert!(!path.exists());
}

fn main() {}
