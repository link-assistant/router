#!/usr/bin/env rust-script
//! Run the same verification implementation as the library/CLI.
//! ```cargo
//! [dependencies]
//! link-assistant-router = { path = ".." }
//! ```
fn main() -> std::process::ExitCode {
    link_assistant_router::verification::run_cli(std::env::args().skip(1).collect())
}
