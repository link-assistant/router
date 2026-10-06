//! Downstreams call the public facades with isolated roots and injected dependencies.
use link_assistant_router::{
    cli::{Command, DeployArgs},
    deploy,
    operation_context::{OperationContext, ProcessRunner},
};
use std::{path::Path, process::Output, sync::Arc, time::Duration};

struct NoDependencies;
impl ProcessRunner for NoDependencies {
    fn output(
        &self,
        command: &mut std::process::Command,
        _deadline: Duration,
    ) -> std::io::Result<Output> {
        Err(std::io::Error::other(format!(
            "fixture dependency unavailable: {}",
            command.get_program().to_string_lossy()
        )))
    }
    fn spawn(&self, _command: &mut std::process::Command) -> std::io::Result<std::process::Child> {
        panic!("a refused deployment must not start a background process");
    }
}

fn context(root: &Path) -> OperationContext {
    let mut context = OperationContext::isolated(root);
    context.environment.retain(|key, _| key == "PATH");
    context.set_env("HOME", root);
    context.set_env("TOKEN_SECRET", "deployment-api-fixture-secret");
    context.process_runner = Some(Arc::new(NoDependencies));
    context.working_directory = root.into();
    context
}

fn arguments(context: &OperationContext, extra: &[&str]) -> DeployArgs {
    let mut args = vec!["router", "deploy", "--image", "fixture:v1.0.0"];
    args.extend(extra);
    let cli = context
        .scope(|| {
            link_assistant_router::cli::try_parse_arguments(
                args.into_iter().map(Into::into).collect(),
            )
        })
        .unwrap();
    let Some(Command::Deploy(args)) = cli.command else {
        panic!("deploy command")
    };
    args
}

fn command(context: &OperationContext, arguments: &[&str]) -> Command {
    context
        .scope(|| {
            link_assistant_router::cli::try_parse_arguments(
                std::iter::once("router")
                    .chain(arguments.iter().copied())
                    .map(Into::into)
                    .collect(),
            )
        })
        .unwrap()
        .command
        .unwrap()
}

#[tokio::test]
async fn monitoring_import_and_recovery_facades_share_isolated_state() {
    let home = tempfile::tempdir().unwrap();
    let mut context = context(home.path());
    context.set_env("STORAGE_POLICY", "text");
    let Command::Logs { op } = command(&context, &["logs", "summary"]) else {
        panic!("logs command")
    };
    let summary = link_assistant_router::logs::read(context.clone(), op)
        .await
        .unwrap();
    assert_eq!(summary.operation, "logs.summary");
    assert_eq!(summary.data["exchanges"], 0);

    let report = link_assistant_router::doctor::report(context.clone())
        .await
        .unwrap();
    assert_eq!(report.operation, "doctor");
    assert!(
        !serde_json::to_string(&report)
            .unwrap()
            .contains("deployment-api-fixture-secret")
    );

    let missing = home.path().join("missing-vendor-home");
    let Command::Auth { op } = command(
        &context,
        &["auth", "import", "codex", missing.to_str().unwrap()],
    ) else {
        panic!("auth command")
    };
    let refused = link_assistant_router::auth::import::import(context.clone(), op)
        .await
        .unwrap_err();
    assert_eq!(refused.result.operation, "auth.import");
    assert!(!refused.result.success);

    let client = link_assistant_router::operations::request(
        context.clone(),
        command(&context, &["tokens", "issue", "--label", "client-kept"]),
    )
    .await
    .unwrap();
    assert!(client.success);
    let before = link_assistant_router::operations::request(
        context.clone(),
        command(&context, &["tokens", "list"]),
    )
    .await
    .unwrap();
    let Command::Tokens { op } = command(&context, &["tokens", "recover-admin"]) else {
        panic!("recovery command")
    };
    let recovered = link_assistant_router::admin::recover(context.clone(), op)
        .await
        .unwrap();
    assert_eq!(recovered.operation, "tokens.recover-admin");
    let after = link_assistant_router::operations::request(
        context.clone(),
        command(&context, &["tokens", "list"]),
    )
    .await
    .unwrap();
    let tokens = after.data.as_array().unwrap();
    assert_eq!(tokens.len(), 2);
    assert!(
        tokens.contains(&before.data[0]),
        "recovery must preserve the existing client record"
    );
    for result in [summary, report, recovered] {
        link_assistant_router::contracts::validation::operation(
            &result.operation,
            &serde_json::to_value(&result).unwrap(),
        )
        .unwrap();
    }
}

#[test]
fn local_plans_resolve_injected_roots_modes_and_instances_without_processes() {
    let home = tempfile::tempdir().unwrap();
    let context = context(home.path());
    let args = arguments(
        &context,
        &["--instance", "project", "--mode", "host", "--port", "8123"],
    );
    let plan = deploy::local::plan(&context, &args).unwrap();
    assert_eq!(plan.root, home.path().join("router-data/deploy-project"));
    assert_eq!(plan.image, "fixture:v1.0.0");
    assert_eq!(plan.mode, "host");
    assert_eq!(plan.port, 8123);
    assert!(!plan.root.exists());

    let relative = arguments(&context, &["--root", "relative"]);
    assert_eq!(
        deploy::local::plan(&context, &relative).unwrap().root,
        home.path().join("relative")
    );
    let expanded = arguments(&context, &["--root", "~/project"]);
    assert_eq!(
        deploy::local::plan(&context, &expanded).unwrap().root,
        home.path().join("project")
    );
    let mut default = arguments(&context, &[]);
    default.image = None;
    let mut native_root = context;
    native_root.data_dir = None;
    let plan = deploy::local::plan(&native_root, &default).unwrap();
    assert_eq!(plan.mode, "container");
    assert_eq!(
        plan.image,
        format!(
            "ghcr.io/link-assistant/router:{}",
            link_assistant_router::VERSION
        )
    );
    assert!(plan.root.starts_with(home.path()));
}

#[test]
fn invalid_local_plans_return_typed_errors_before_mutation() {
    let home = tempfile::tempdir().unwrap();
    let context = context(home.path());
    for (extra, reason) in [
        (vec!["--server", "user@fixture"], "remote target"),
        (vec!["--instance", "bad/name"], "instance"),
        (vec!["--image", "fixture:latest"], "latest"),
    ] {
        // Replace the default image rather than pass the flag twice.
        let mut args = arguments(&context, if extra[0] == "--image" { &[] } else { &extra });
        if extra[0] == "--image" {
            args.image = Some(extra[1].into());
        }
        let error = deploy::local::plan(&context, &args).unwrap_err();
        assert!(error.to_string().contains(reason), "{error}");
    }
    assert!(!home.path().join("router-data").exists());
}

#[tokio::test]
async fn every_deployment_facade_preserves_status_and_refusals_without_spawning() {
    let home = tempfile::tempdir().unwrap();
    let context = context(home.path());
    let apply = deploy::local::apply(context.clone(), arguments(&context, &[])).await;
    let status = deploy::local::status(context.clone(), arguments(&context, &[])).await;
    let host = deploy::host::apply(context.clone(), arguments(&context, &["--status"])).await;
    let host_status = deploy::host::status(context.clone(), arguments(&context, &[])).await;
    let remote = deploy::remote::apply(context.clone(), arguments(&context, &[])).await;
    let remote_status = deploy::remote::status(context.clone(), arguments(&context, &[])).await;
    let staging =
        deploy::staging::apply(context.clone(), "bad/name", arguments(&context, &[])).await;
    let restore = deploy::checkpoint::restore(
        context.clone(),
        arguments(&context, &[]),
        &home.path().join("missing"),
        false,
    )
    .await;
    for response in [host, host_status] {
        let report = response.unwrap();
        assert_eq!(report.data["mode"], "host");
        assert_eq!(report.data["status"], "planned");
        assert_eq!(report.data["status_is_read_only"], true);
        assert_eq!(report.data["blockers"], serde_json::json!([]));
    }
    for response in [apply, status, remote, remote_status, staging, restore] {
        let error = response.unwrap_err();
        assert_eq!(error.result.operation, "deploy");
        assert!(!error.result.success);
        assert_ne!(error.result.exit_code, 0);
        link_assistant_router::contracts::validation::operation(
            "deploy",
            &serde_json::to_value(&error.result).unwrap(),
        )
        .unwrap();
        assert!(!error.to_string().is_empty());
    }
}

#[test]
fn checkpoint_facade_captures_project_state_and_excludes_oauth() {
    let home = tempfile::tempdir().unwrap();
    let context = context(home.path());
    let root = home.path().join("deployment");
    std::fs::create_dir_all(root.join("data/projects")).unwrap();
    std::fs::write(root.join("data/projects/project.json"), "project state").unwrap();
    std::fs::write(root.join("data/projects/auth.json"), "oauth bytes").unwrap();
    let snapshot =
        deploy::checkpoint::capture(&context, &root, &[], "checkpoint-fixture-secret").unwrap();
    let manifest: serde_json::Value =
        serde_json::from_slice(&std::fs::read(snapshot.join("manifest.json")).unwrap()).unwrap();
    assert_eq!(manifest["schema"], "link-assistant-router/data-backup/v1");
    assert!(manifest["files"]["projects/project.json"].is_string());
    assert!(manifest["files"].get("projects/auth.json").is_none());
    assert_eq!(
        std::fs::read_to_string(snapshot.join("projects/project.json")).unwrap(),
        "project state"
    );
    assert!(!snapshot.join("projects/auth.json").exists());
}
