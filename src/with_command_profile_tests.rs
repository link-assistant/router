//! Persistent-profile and privacy tests for temporary client launches.

use super::*;

/// The same client twice gets the same directory, which is what makes a
/// session resumable through the router.
#[test]
fn two_runs_of_the_same_client_share_one_profile() {
    let profiles = tempfile::tempdir().expect("profile root");
    let root = Some(profiles.path());
    let first = persistent_profile(ClientKind::Codex, root).expect("first profile");
    let second = persistent_profile(ClientKind::Codex, root).expect("second profile");
    assert_eq!(first, second);
    assert!(first.is_dir());
    assert_ne!(
        first,
        persistent_profile(ClientKind::GeminiCli, root).expect("another client")
    );
}

#[test]
fn registry_order_matches_client_discriminants() {
    for client in ClientKind::ALL {
        assert_eq!(client.integration().kind, client);
    }
}

/// The default label names the client and a run, never the directory the
/// command was run in — a deployment was accumulating a list of every project
/// its users work in, visible to anyone who can list tokens (issue #316).
#[test]
fn the_default_label_carries_no_directory_name() {
    let label = format!("with-{}-{}", ClientKind::ClaudeCode, super::run_suffix());

    assert!(label.starts_with("with-claude-"), "{label}");
    let cwd = std::env::current_dir().expect("cwd");
    let name = cwd
        .file_name()
        .expect("directory name")
        .to_string_lossy()
        .into_owned();
    assert!(
        !label.contains(&name),
        "the working directory's name must not reach the router: {label} contains {name}"
    );
    assert_eq!(super::run_suffix().len(), 4, "a fixed-width run suffix");
    assert_eq!(
        super::run_suffix(),
        super::run_suffix(),
        "stable within one process, so one run has one label"
    );
}
