//! `router deploy` command surface.
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit. The converge engine is in [`link_assistant_router::deploy`]; this file
//! resolves defaults, prints the report, and maps outcomes onto exit codes.
//!
//! The decisions here — which image and root a run uses when none is named, and
//! which exit code an outcome deserves — are separated from the printing so they
//! can be tested without a container runtime. They are worth testing: defaulting
//! to a moving image tag would defeat the immutable-reference check the converge
//! engine performs, and a refusal that exits `1` is indistinguishable from a
//! deployment failure to a script.

use std::path::{Path, PathBuf};
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
fn default_root(data_dir: &Path) -> PathBuf {
    data_dir.join("deploy")
}

/// The plan a set of flags describes, with defaults filled in.
fn plan_for(args: &DeployArgs, data_dir: &Path, token_secret: &str) -> Plan {
    let root = args
        .root
        .as_deref()
        .map_or_else(|| default_root(data_dir), PathBuf::from);
    let mut plan = Plan::local(
        &root,
        &args
            .image
            .as_deref()
            .map_or_else(default_image, str::to_string),
        token_secret,
    );
    plan.port = args.port;
    plan.status_only = args.status;
    plan.build_context = args.build.as_deref().map(PathBuf::from);
    plan
}

/// Exit code for a removal outcome.
///
/// A refusal for want of consent exits `2`: it is a usage answer, and a script
/// that cannot tell it from `1` cannot tell "you forgot --yes" from "the
/// deployment is broken".
fn down_code(removed: bool) -> ExitCode {
    if removed {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(2)
    }
}

/// The closing line a converged run prints.
fn ready_line(plan: &Plan, skipped: bool) -> String {
    if plan.status_only {
        format!(
            "{} on 127.0.0.1:{}",
            if skipped {
                "deployment is up with steps skipped"
            } else {
                "deployment is converged"
            },
            plan.port
        )
    } else {
        format!(
            "deployment is ready: `router with claude --server http://127.0.0.1:{}`",
            plan.port
        )
    }
}

pub fn run(config: &Config, args: &DeployArgs) -> ExitCode {
    let runtime = Docker;

    if args.down {
        return match deploy::down(&runtime, args.yes) {
            Ok(message) => {
                println!("{message}");
                down_code(true)
            }
            Err(error) => {
                eprintln!("error: {error}");
                down_code(false)
            }
        };
    }

    let plan = plan_for(args, &config.data_dir, &config.token_secret);
    let report = deploy::converge(&runtime, &plan);
    report.print();

    if report.converged() {
        println!("\n{}", ready_line(&plan, !report.skips().is_empty()));
        ExitCode::SUCCESS
    } else {
        ExitCode::from(1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args() -> DeployArgs {
        DeployArgs {
            status: false,
            down: false,
            yes: false,
            port: link_assistant_router::deploy::DEFAULT_PORT,
            image: None,
            build: None,
            root: None,
        }
    }

    #[test]
    fn the_default_image_is_this_binarys_own_version_not_a_moving_tag() {
        let plan = plan_for(&args(), Path::new("/tmp/state"), "secret");

        // Defaulting to `latest` would make every unqualified run fail the
        // immutable-reference check — or worse, deploy a container that disagrees
        // with the CLI about the API contract.
        assert!(
            plan.image.ends_with(link_assistant_router::VERSION),
            "{}",
            plan.image
        );
        deploy::immutable_ref(&plan.image).expect("the default is deployable");
    }

    #[test]
    fn a_named_image_and_root_are_used_verbatim() {
        let mut args = args();
        args.image = Some("ghcr.io/link-assistant/router@sha256:abc".to_string());
        args.root = Some("/srv/router".to_string());
        args.port = 19000;

        let plan = plan_for(&args, Path::new("/tmp/state"), "secret");

        assert_eq!(plan.image, "ghcr.io/link-assistant/router@sha256:abc");
        assert_eq!(plan.credential_home, Path::new("/srv/router/credentials"));
        assert_eq!(plan.data_home, Path::new("/srv/router/data"));
        assert_eq!(plan.port, 19000);
    }

    #[test]
    fn the_default_root_lives_under_the_data_directory() {
        let plan = plan_for(&args(), Path::new("/var/lib/router"), "secret");

        // Under the data directory rather than beside it, so a deployment's own
        // state is not scattered across the filesystem.
        assert_eq!(
            plan.credential_home,
            Path::new("/var/lib/router/deploy/credentials")
        );
        assert_eq!(plan.data_home, Path::new("/var/lib/router/deploy/data"));
        // Separate paths: the credential mount is read-only and the request log
        // cannot live on it.
        assert_ne!(plan.credential_home, plan.data_home);
    }

    #[test]
    fn status_and_build_flags_reach_the_plan() {
        let mut args = args();
        args.status = true;
        args.build = Some("/src/router".to_string());

        let plan = plan_for(&args, Path::new("/tmp/state"), "secret");

        assert!(plan.status_only);
        assert_eq!(
            plan.build_context.as_deref(),
            Some(Path::new("/src/router"))
        );
    }

    #[test]
    fn the_signing_secret_is_passed_through_rather_than_invented() {
        let plan = plan_for(&args(), Path::new("/tmp/state"), "the-deployments-secret");

        // The deployment must sign with the same secret the CLI would, or tokens
        // minted here are rejected there.
        assert_eq!(plan.token_secret, "the-deployments-secret");
    }

    #[test]
    fn a_refused_removal_exits_two_rather_than_one() {
        // `1` means the deployment failed; `2` means the command was not asked
        // correctly. A script that cannot tell them apart cannot retry safely.
        assert_eq!(
            format!("{:?}", down_code(false)),
            format!("{:?}", ExitCode::from(2))
        );
        assert_eq!(
            format!("{:?}", down_code(true)),
            format!("{:?}", ExitCode::SUCCESS)
        );
    }

    #[test]
    fn the_closing_line_tells_the_operator_what_to_do_next() {
        let plan = plan_for(&args(), Path::new("/tmp/state"), "secret");

        let ready = ready_line(&plan, false);
        assert!(
            ready.contains("router with claude"),
            "a converged deploy names the next command: {ready}"
        );
        assert!(ready.contains(&plan.port.to_string()), "{ready}");

        let mut reporting = plan;
        reporting.status_only = true;
        // `--status` reports rather than instructs, and it distinguishes a fully
        // converged deployment from one that came up with steps skipped.
        assert!(ready_line(&reporting, false).contains("converged"));
        assert!(ready_line(&reporting, true).contains("skipped"));
    }
}
