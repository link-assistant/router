//! `router deploy` command surface.
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit. This file resolves defaults and dispatches to either the local
//! transactional coordinator or the remote deployment agent.

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use link_assistant_router::cli::DeployArgs;
use link_assistant_router::config::Config;

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

fn resolved_root(args: &DeployArgs, data_dir: &Path) -> Result<PathBuf, String> {
    let root = args
        .root
        .as_deref()
        .map_or_else(|| default_root(data_dir), PathBuf::from);
    if root.is_absolute() {
        Ok(root)
    } else {
        std::env::current_dir()
            .map(|directory| directory.join(root))
            .map_err(|error| format!("could not resolve deployment root: {error}"))
    }
}

/// Why a run cannot proceed with the secret it was given, if it cannot.
///
/// A deployment signs its own tokens, so it needs a real secret. Without this
/// check the stand-in installed for non-serving commands reaches the container's
/// environment, where its NUL prefix surfaces as an opaque `nul byte found in
/// provided data` from the process API — and if it ever stopped doing so, the
/// deployment would sign tokens nothing can validate. Removal is exempt: it
/// names a container and deletes it, signing nothing.
fn secret_refusal(token_secret: &str, does_not_sign: bool) -> Option<String> {
    if does_not_sign {
        return None;
    }
    link_assistant_router::token_secret::ensure_real(token_secret)
        .err()
        .map(|error| {
            format!(
                "error: {error}\nnote: the deployment signs its own tokens, so pass \
                 TOKEN_SECRET in the environment."
            )
        })
}

pub fn run(config: &Config, args: &DeployArgs) -> ExitCode {
    if args.server.is_some() {
        return crate::deploy_remote::run(args, &config.token_secret);
    }
    if let Some(refusal) = secret_refusal(&config.token_secret, args.down || args.status) {
        eprintln!("{refusal}");
        return ExitCode::from(2);
    }

    let root = match resolved_root(args, &config.data_dir) {
        Ok(root) => root,
        Err(error) => {
            eprintln!("error: {error}");
            return ExitCode::from(2);
        }
    };
    let image = args.image.clone().unwrap_or_else(default_image);
    crate::deploy_local::run(args, &root, &image, &config.token_secret)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args() -> DeployArgs {
        DeployArgs {
            server: None,
            status: false,
            down: false,
            yes: false,
            force_update: false,
            port: link_assistant_router::deploy::DEFAULT_PORT,
            public_port: None,
            image: None,
            build: None,
            root: None,
        }
    }

    #[test]
    fn the_default_image_is_this_binarys_own_version_not_a_moving_tag() {
        let image = default_image();

        // Defaulting to `latest` would make every unqualified run fail the
        // immutable-reference check — or worse, deploy a container that disagrees
        // with the CLI about the API contract.
        assert!(image.ends_with(link_assistant_router::VERSION), "{image}");
        link_assistant_router::deploy::immutable_ref(&image).expect("the default is deployable");
    }

    #[test]
    fn a_relative_root_is_made_stable_before_it_becomes_an_ownership_label() {
        let mut args = args();
        args.root = Some("router-state".to_string());

        let root = resolved_root(&args, Path::new("/tmp/state")).unwrap();

        assert!(root.is_absolute());
        assert!(root.ends_with("router-state"));
    }

    #[test]
    fn the_default_root_lives_under_the_data_directory() {
        let data_dir = std::env::current_dir()
            .unwrap()
            .join("var")
            .join("lib")
            .join("router");
        let root = resolved_root(&args(), &data_dir).unwrap();

        // Under the data directory rather than beside it, so a deployment's own
        // state is not scattered across the filesystem.
        assert_eq!(root, data_dir.join("deploy"));
        // Separate paths: the credential mount is read-only and the request log
        // cannot live on it.
        assert_ne!(root.join("credentials"), root.join("data"));
    }

    #[test]
    fn a_stand_in_secret_is_refused_before_a_container_is_created() {
        let stand_in = link_assistant_router::token_secret::placeholder("cli-command");

        let refusal = secret_refusal(&stand_in, false).expect("a stand-in is refused");

        // The stand-in carries a NUL so it can never be supplied deliberately,
        // which means it reaches the process API and fails there with `nul byte
        // found in provided data` — a message that describes the mechanism and
        // not the mistake. It is caught here instead, and a deployment is never
        // created that would sign tokens nothing can validate.
        assert!(refusal.contains("TOKEN_SECRET"), "{refusal}");
        assert!(
            !refusal.contains("nul byte"),
            "the operator is told what to do, not what the process API said: {refusal}"
        );
        assert!(
            !refusal.contains(&stand_in),
            "the refusal does not echo the secret it rejected"
        );
    }

    #[test]
    fn a_real_secret_passes_and_removal_needs_none() {
        assert!(secret_refusal("a-real-operator-secret", false).is_none());
        // `--down` names a container and deletes it. Demanding a signing secret
        // to tear down a deployment would make a broken one unremovable by the
        // operator who most needs to remove it.
        assert!(
            secret_refusal(
                &link_assistant_router::token_secret::placeholder("cli-command"),
                true
            )
            .is_none()
        );
    }
}
