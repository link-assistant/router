//! `router deploy` command surface.
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit. The converge engine is in [`link_assistant_router::deploy`]; this file
//! resolves defaults, prints the report, and maps outcomes onto exit codes.

use std::path::PathBuf;
use std::process::ExitCode;

use link_assistant_router::cli::DeployArgs;
use link_assistant_router::config::Config;
use link_assistant_router::deploy::{self, Plan, runtime::Docker};

/// Default image for a local deployment: this binary's own version.
///
/// A deployment of a *different* version than the CLI driving it is the exact
/// disagreement the immutable-reference rule exists to prevent, so the default is
/// pinned to the version that is running rather than to a moving tag.
fn default_image() -> String {
    format!(
        "ghcr.io/link-assistant/router:{}",
        link_assistant_router::VERSION
    )
}

/// Where a local deployment keeps its credential and data directories.
fn default_root(config: &Config) -> PathBuf {
    config.data_dir.join("deploy")
}

pub fn run(config: &Config, args: &DeployArgs) -> ExitCode {
    let runtime = Docker;

    if args.down {
        return match deploy::down(&runtime, args.yes) {
            Ok(message) => {
                println!("{message}");
                ExitCode::SUCCESS
            }
            Err(error) => {
                eprintln!("error: {error}");
                // 2 rather than 1: a refusal for want of consent is a usage
                // answer, not a deployment failure.
                ExitCode::from(2)
            }
        };
    }

    let root = args
        .root
        .as_deref()
        .map_or_else(|| default_root(config), PathBuf::from);
    let mut plan = Plan::local(
        &root,
        &args
            .image
            .as_deref()
            .map_or_else(default_image, str::to_string),
        &config.token_secret,
    );
    plan.port = args.port;
    plan.status_only = args.status;
    plan.build_context = args.build.as_deref().map(PathBuf::from);

    let report = deploy::converge(&runtime, &plan);
    report.print();

    if report.converged() {
        if args.status {
            println!(
                "\n{} on 127.0.0.1:{}",
                if report.skips().is_empty() {
                    "deployment is converged"
                } else {
                    "deployment is up with steps skipped"
                },
                plan.port
            );
        } else {
            println!(
                "\ndeployment is ready: `router with claude --server http://127.0.0.1:{}`",
                plan.port
            );
        }
        ExitCode::SUCCESS
    } else {
        ExitCode::from(1)
    }
}
