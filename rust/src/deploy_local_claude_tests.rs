//! `router deploy --claude-credentials` through the coordinator (issue #622).

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use link_assistant_router::cli::ClaudeCredentials;

use super::super::{Provision, claude_share::LABEL_SUFFIX, run_assessed};
use super::*;

const SECRET: &str = "integration-test-signing-secret";

fn shared(home: &Path) -> Provision {
    Provision::Shared {
        home: home.to_path_buf(),
        owner: Some((1000, 1000)),
    }
}

/// Deploy `image`, recording which mode the dispatcher asked to assess.
fn deploy(
    runner: &FakeRunner,
    root: &Path,
    image: &str,
    flag: Option<ClaudeCredentials>,
    home: &Path,
) -> (ExitCode, Option<ClaudeCredentials>) {
    deploy_accepting(runner, root, image, flag, home, false)
}

fn deploy_accepting(
    runner: &FakeRunner,
    root: &Path,
    image: &str,
    flag: Option<ClaudeCredentials>,
    home: &Path,
    accept_loss: bool,
) -> (ExitCode, Option<ClaudeCredentials>) {
    let mut args = deploy_args();
    args.claude_credentials = flag;
    args.accept_access_loss = accept_loss;
    let asked = std::cell::Cell::new(None);
    let code = run_assessed(
        &args,
        root,
        image,
        SECRET,
        Docker::with_runner(runner.clone()),
        &|mode, _data| {
            asked.set(Some(mode));
            match mode {
                ClaudeCredentials::Isolated => Provision::Isolated,
                ClaudeCredentials::Share => shared(home),
            }
        },
        &crate::deploy_local::host_runtime::System::fixture(),
    );
    (code, asked.get())
}

fn backend(runner: &FakeRunner) -> Container {
    let world = runner.0.lock().unwrap();
    world
        .containers
        .iter()
        .find(|(name, _)| name.as_str() != &*RELAY)
        .map(|(_, container)| container.clone())
        .expect("a backend")
}

fn backend_launches(runner: &FakeRunner) -> Vec<Vec<String>> {
    runner
        .0
        .lock()
        .unwrap()
        .commands
        .iter()
        .filter(|command| {
            command.first().map(String::as_str) == Some("run")
                && command
                    .iter()
                    .any(|argument| argument.ends_with(".role=backend"))
        })
        .cloned()
        .collect()
}

#[test]
fn share_mounts_the_host_login_and_an_update_without_the_flag_keeps_it() {
    let root = tempfile::tempdir().unwrap();
    let home = PathBuf::from("/home/operator/.claude");
    let runner = FakeRunner::default();

    let (code, asked) = deploy(
        &runner,
        root.path(),
        "router:1.0.0",
        Some(ClaudeCredentials::Share),
        &home,
    );
    assert_eq!(code, ExitCode::SUCCESS);
    assert_eq!(asked, Some(ClaudeCredentials::Share));
    let first = backend(&runner);
    assert_eq!(
        first.mounts.get("/data/claude").map(String::as_str),
        Some("/home/operator/.claude")
    );
    assert_eq!(
        first.labels.get(&format!("{LABEL_KEY}.{LABEL_SUFFIX}")),
        Some(&"shared:/home/operator/.claude".to_string())
    );
    let launch = backend_launches(&runner).pop().unwrap().join(" ");
    assert!(launch.contains("--user 1000:1000"), "{launch}");
    assert!(!launch.contains(":/data/claude:ro"), "{launch}");

    // A routine image update omits the flag: the shared login must survive.
    let (code, asked) = deploy(&runner, root.path(), "router:2.0.0", None, &home);
    assert_eq!(code, ExitCode::SUCCESS);
    assert_eq!(asked, Some(ClaudeCredentials::Share));
    let second = backend(&runner);
    assert_eq!(second.image_ref, "router:2.0.0");
    assert_eq!(
        second.mounts.get("/data/claude").map(String::as_str),
        Some("/home/operator/.claude")
    );

    // Rerunning the same specification is still an exact no-op.
    let launches = backend_launches(&runner).len();
    let (code, _) = deploy(&runner, root.path(), "router:2.0.0", None, &home);
    assert_eq!(code, ExitCode::SUCCESS);
    assert_eq!(backend_launches(&runner).len(), launches);
}

#[test]
fn switching_mode_replaces_the_backend_instead_of_claiming_convergence() {
    let root = tempfile::tempdir().unwrap();
    let home = PathBuf::from("/home/operator/.claude");
    let runner = FakeRunner::default();

    let (code, asked) = deploy(&runner, root.path(), "router:1.0.0", None, &home);
    assert_eq!(code, ExitCode::SUCCESS);
    assert_eq!(asked, Some(ClaudeCredentials::Isolated));
    let isolated = backend(&runner);
    assert_eq!(
        isolated.mounts.get("/data/claude"),
        Some(&root.path().join("credentials").display().to_string())
    );

    let (code, _) = deploy(
        &runner,
        root.path(),
        "router:1.0.0",
        Some(ClaudeCredentials::Share),
        &home,
    );
    assert_eq!(code, ExitCode::SUCCESS);
    assert_eq!(backend_launches(&runner).len(), 2);
    assert_eq!(
        backend(&runner)
            .mounts
            .get("/data/claude")
            .map(String::as_str),
        Some("/home/operator/.claude")
    );

    let (code, _) = deploy_accepting(
        &runner,
        root.path(),
        "router:1.0.0",
        Some(ClaudeCredentials::Isolated),
        &home,
        true,
    );
    assert_eq!(code, ExitCode::SUCCESS);
    assert_eq!(backend_launches(&runner).len(), 3);
}

#[test]
fn a_refused_share_changes_nothing_and_says_why() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let mut args = deploy_args();
    args.claude_credentials = Some(ClaudeCredentials::Share);

    let code = run_assessed(
        &args,
        root.path(),
        "router:1.0.0",
        SECRET,
        Docker::with_runner(runner.clone()),
        &|_, _| Provision::Refused("the login is in the macOS Keychain".to_string()),
        &crate::deploy_local::host_runtime::System::fixture(),
    );

    assert_eq!(code, ExitCode::from(2));
    let world = runner.0.lock().unwrap();
    assert!(world.containers.is_empty());
    assert!(
        world
            .commands
            .iter()
            .all(|command| command.first().map(String::as_str) != Some("run"))
    );
    drop(world);
    assert!(!root.path().join("state").exists());
}
