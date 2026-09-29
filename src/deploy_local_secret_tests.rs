//! Issue #625: `TOKEN_SECRET` is part of the launch specification.

use std::path::Path;
use std::process::ExitCode;

use super::status_tests::mutations;
use super::{FakeRunner, LABEL_KEY, deploy_args, run_with_docker};
use crate::deploy_local::docker::Docker;
use crate::deploy_local::secret::fingerprint;

const SECRET_A: &str = "saved-signing-secret-a";
const SECRET_B: &str = "mistaken-signing-secret-b";

fn run(runner: &FakeRunner, root: &Path, image: &str, secret: &str, force: bool) -> ExitCode {
    let mut args = deploy_args();
    args.force_update = force;
    run_with_docker(
        &args,
        root,
        image,
        secret,
        Docker::with_runner(runner.clone()),
    )
}

fn status(runner: &FakeRunner, root: &Path, image: &str, secret: &str) -> ExitCode {
    let mut args = deploy_args();
    args.status = true;
    run_with_docker(
        &args,
        root,
        image,
        secret,
        Docker::with_runner(runner.clone()),
    )
}

fn serving(root: &Path) -> String {
    std::fs::read_to_string(root.join("state/current"))
        .unwrap()
        .trim()
        .to_string()
}

/// A client token issued by a backend signing with `secret`.
fn client_token(secret: &str) -> String {
    let now = chrono::Utc::now().timestamp();
    let claims = link_assistant_router::token::TokenClaims {
        sub: "laptop".into(),
        iat: now,
        exp: now + 3600,
        label: "laptop".into(),
        scope: String::new(),
        github_repos: Vec::new(),
        client_kind: None,
        principal_id: None,
    };
    let jwt = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(secret.as_bytes()),
    )
    .unwrap();
    format!("{}{jwt}", link_assistant_router::token::TOKEN_PREFIX)
}

/// Whether the serving backend would authorize `token`: it verifies with
/// the secret it was started with, exactly as `validate_token` does.
fn authorized(runner: &FakeRunner, root: &Path, token: &str) -> bool {
    let secret = runner.0.lock().unwrap().secrets[&serving(root)].clone();
    jsonwebtoken::decode::<link_assistant_router::token::TokenClaims>(
        token
            .strip_prefix(link_assistant_router::token::TOKEN_PREFIX)
            .unwrap(),
        &jsonwebtoken::DecodingKey::from_secret(secret.as_bytes()),
        &jsonwebtoken::Validation::default(),
    )
    .is_ok()
}

fn installed(root: &Path, image: &str) -> FakeRunner {
    let runner = FakeRunner::default();
    assert_eq!(
        run(&runner, root, image, SECRET_A, false),
        ExitCode::SUCCESS
    );
    runner.0.lock().unwrap().token_inventory = r#"[{"id":"laptop","label":"laptop","issued_at":1,"expires_at":4102444800,"revoked":false}]"#.into();
    runner
}

fn no_secret_in_argv(runner: &FakeRunner) {
    let world = runner.0.lock().unwrap();
    for argument in world.commands.iter().flatten() {
        assert!(
            !argument.contains(SECRET_A) && !argument.contains(SECRET_B),
            "{argument}"
        );
        assert!(!argument.contains("la_sk_"), "{argument}");
    }
}

#[test]
fn a_to_b_to_a_with_a_stable_image_keeps_the_backend_and_its_tokens() {
    let root = tempfile::tempdir().unwrap();
    let runner = installed(root.path(), "router:1");
    let backend = serving(root.path());
    let token = client_token(SECRET_A);
    assert!(authorized(&runner, root.path(), &token));
    assert_eq!(
        runner.0.lock().unwrap().containers[&backend].labels[&format!("{LABEL_KEY}.token-secret")],
        fingerprint(SECRET_A)
    );
    runner.0.lock().unwrap().commands.clear();

    // B is a launch-specification change, not "already converged", and it
    // is refused before anything is touched.
    assert_eq!(
        run(&runner, root.path(), "router:1", SECRET_B, false),
        ExitCode::from(2)
    );
    assert!(mutations(&runner.0.lock().unwrap()).is_empty());
    assert_eq!(serving(root.path()), backend);
    assert!(authorized(&runner, root.path(), &token));
    assert_eq!(
        status(&runner, root.path(), "router:1", SECRET_B),
        ExitCode::SUCCESS
    );

    // A again is the true no-op it always was.
    assert_eq!(
        run(&runner, root.path(), "router:1", SECRET_A, false),
        ExitCode::SUCCESS
    );
    let world = runner.0.lock().unwrap();
    assert!(mutations(&world).is_empty());
    assert_eq!(world.containers.len(), 2);
    drop(world);
    assert_eq!(serving(root.path()), backend);
    assert!(authorized(&runner, root.path(), &token));
    no_secret_in_argv(&runner);
}

#[test]
fn an_update_probes_the_candidate_and_keeps_the_old_backend_when_it_rejects_tokens() {
    let root = tempfile::tempdir().unwrap();
    let runner = installed(root.path(), "router:1");
    let backend = serving(root.path());

    // A candidate that rejects the deployment's tokens never takes traffic.
    runner.0.lock().unwrap().probe_status = Some(401);
    assert_eq!(
        run(&runner, root.path(), "router:2", SECRET_A, false),
        ExitCode::from(1)
    );
    assert_eq!(serving(root.path()), backend);
    let world = runner.0.lock().unwrap();
    assert_eq!(world.probes, 1);
    assert_eq!(world.containers.len(), 2, "the rejected candidate remains");
    assert!(world.containers[&backend].running);
    drop(world);
    assert!(authorized(&runner, root.path(), &client_token(SECRET_A)));

    // The ordinary update passes the probe and cuts over.
    runner.0.lock().unwrap().probe_status = None;
    assert_eq!(
        run(&runner, root.path(), "router:2", SECRET_A, false),
        ExitCode::SUCCESS
    );
    assert_ne!(serving(root.path()), backend);
    assert_eq!(runner.0.lock().unwrap().probes, 2);
    assert!(authorized(&runner, root.path(), &client_token(SECRET_A)));
    no_secret_in_argv(&runner);
}

#[test]
fn a_wrong_secret_needs_force_and_the_saved_secret_recovers_without_an_image_switch() {
    let root = tempfile::tempdir().unwrap();
    let runner = installed(root.path(), "router:1");
    let token = client_token(SECRET_A);

    // An image update with a mistaken secret is refused too.
    assert_eq!(
        run(&runner, root.path(), "router:2", SECRET_B, false),
        ExitCode::from(2)
    );
    assert!(authorized(&runner, root.path(), &token));

    // Forcing it reproduces what v1.14.3 did silently: tokens break.
    assert_eq!(
        run(&runner, root.path(), "router:2", SECRET_B, true),
        ExitCode::SUCCESS
    );
    assert!(!authorized(&runner, root.path(), &token));
    assert_eq!(runner.0.lock().unwrap().probes, 0, "a forced rotation");
    // v1.14.3 backends carry no fingerprint; their environment still tells.
    let stranded = serving(root.path());
    runner
        .0
        .lock()
        .unwrap()
        .containers
        .get_mut(&stranded)
        .unwrap()
        .labels
        .remove(&format!("{LABEL_KEY}.token-secret"));

    // The saved secret is detected as a change on the same image and root;
    // it is applied deliberately, without removing anything by hand.
    assert_eq!(
        run(&runner, root.path(), "router:2", SECRET_A, false),
        ExitCode::from(2)
    );
    assert_eq!(serving(root.path()), stranded);
    assert_eq!(
        run(&runner, root.path(), "router:2", SECRET_A, true),
        ExitCode::SUCCESS
    );
    assert_ne!(serving(root.path()), stranded);
    assert!(authorized(&runner, root.path(), &token));
    assert_eq!(
        run(&runner, root.path(), "router:2", SECRET_A, false),
        ExitCode::SUCCESS
    );
    no_secret_in_argv(&runner);
}
