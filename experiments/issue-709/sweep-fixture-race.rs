#!/usr/bin/env rust-script
//! Deterministic reproduction of the fixture's pre-lock setup window (#708).
//! ```cargo
//! [dependencies]
//! tempfile = "3"
//! ```

use std::process::{Command, Output};

// This probe needs only the process adapter used by the actual sweep module.
mod operation_context {
    use super::{Command, Output};
    pub fn command(program: &str) -> Command {
        Command::new(program)
    }
    pub fn process_output(command: &mut Command) -> std::io::Result<Output> {
        command.output()
    }
}

#[path = "../../src/with_command_sweep.rs"]
mod sweep;

fn main() {
    let fixture = tempfile::Builder::new()
        .prefix("link-assistant-router-with-4294967294-race-")
        .tempdir()
        .expect("fixture directory before its lease exists");
    let prefix = format!("link-assistant-router-with-{}-probe-", std::process::id());
    let competitor = sweep::DisposableRunDirectory::create(&prefix).expect("concurrent run");
    assert!(
        !fixture.path().exists(),
        "the old fixture is vulnerable during setup"
    );
    assert!(competitor.path().exists(), "the live run must survive");
    println!(
        "Reproduced: a concurrent real sweep removes a dead-PID fixture before it locks its lease."
    );
}
