//! Library operations use the same contracts without a Router subprocess.
use link_assistant_router::{
    cli::Command,
    contracts,
    operation_context::{OperationContext, ProcessRunner},
    operations,
};
use std::{ffi::OsStr, process::Output, sync::Arc, time::Duration};

#[tokio::test]
async fn isolated_roots_and_clock_apply_to_token_operations() {
    let first = tempfile::tempdir().unwrap();
    let second = tempfile::tempdir().unwrap();
    let mut context = OperationContext::isolated(first.path());
    context.set_env("TOKEN_SECRET", "operation-test-secret");
    context.set_env("STORAGE_POLICY", "text");
    context.now = chrono::DateTime::from_timestamp(1_800_000_000, 0);
    let cli = context
        .scope(|| {
            link_assistant_router::cli::try_parse_arguments(vec![
                "router".into(),
                "tokens".into(),
                "issue".into(),
                "--label".into(),
                "isolated".into(),
            ])
        })
        .unwrap();
    let issued = operations::execute(context.clone(), cli).await.unwrap();
    contracts::validation::operation("tokens.issue", &serde_json::to_value(&issued).unwrap())
        .unwrap();
    let cli = context
        .scope(|| {
            link_assistant_router::cli::try_parse_arguments(vec![
                "router".into(),
                "tokens".into(),
                "list".into(),
            ])
        })
        .unwrap();
    let listed = operations::execute(context, cli).await.unwrap();
    assert_eq!(listed.data[0]["issued_at"], 1_800_000_000);
    let mut other = OperationContext::isolated(second.path());
    other.set_env("TOKEN_SECRET", "operation-test-secret");
    other.set_env("STORAGE_POLICY", "text");
    let cli = other
        .scope(|| {
            link_assistant_router::cli::try_parse_arguments(vec![
                "router".into(),
                "tokens".into(),
                "list".into(),
            ])
        })
        .unwrap();
    assert_eq!(
        operations::execute(other, cli).await.unwrap().data,
        serde_json::json!([])
    );
}
struct Boundary;
impl ProcessRunner for Boundary {
    fn output(
        &self,
        command: &mut std::process::Command,
        deadline: Duration,
    ) -> std::io::Result<Output> {
        assert_eq!(deadline, Duration::from_secs(15));
        assert!(
            command
                .get_envs()
                .any(|(name, _)| name == OsStr::new("PATH"))
        );
        assert!(
            !command
                .get_envs()
                .any(|(name, _)| name == OsStr::new("HOST_CREDENTIAL"))
        );
        #[cfg(unix)]
        {
            use std::os::unix::process::ExitStatusExt;
            Ok(Output {
                status: std::process::ExitStatus::from_raw(0),
                stdout: b"fixture 1.2.3\n".to_vec(),
                stderr: vec![],
            })
        }
        #[cfg(windows)]
        {
            use std::os::windows::process::ExitStatusExt;
            Ok(Output {
                status: std::process::ExitStatus::from_raw(0),
                stdout: b"fixture 1.2.3\n".to_vec(),
                stderr: vec![],
            })
        }
    }
}
#[test]
fn verification_does_not_restore_sanitized_credentials() {
    let mut context = OperationContext::default();
    context.set_env("HOST_CREDENTIAL", "secret");
    context.process_runner = Some(Arc::new(Boundary));
    context.scope(|| {
        let home = tempfile::tempdir().unwrap();
        let mut command = link_assistant_router::operation_context::command("fixture");
        link_assistant_router::verification_client::environment(&mut command, home.path());
        link_assistant_router::operation_context::bounded_output(
            &mut command,
            Duration::from_secs(15),
        )
        .unwrap();
    });
}
#[tokio::test]
async fn result_validation_rejects_unknown_fields_and_routes() {
    let result = operations::request(OperationContext::default(), Command::Version)
        .await
        .unwrap();
    let mut value = serde_json::to_value(result).unwrap();
    value["data"]["surprise"] = true.into();
    assert!(contracts::validation::operation("version", &value).is_err());
    assert!(
        contracts::validation::http(
            &axum::http::Method::GET,
            "/undocumented",
            200,
            &serde_json::json!({})
        )
        .is_err()
    );
    let health = serde_json::json!({"status":"ok","version":link_assistant_router::VERSION});
    assert!(
        contracts::validation::http(&axum::http::Method::GET, "/api/health", 200, &health).is_err()
    );
}

#[test]
fn deployment_instances_are_scoped_to_each_library_context() {
    let first = OperationContext::default();
    let second = OperationContext::default();
    first.scope(|| {
        link_assistant_router::deploy::instance::select("integration-a").unwrap();
        assert_eq!(
            link_assistant_router::deploy::instance::qualify("relay"),
            "relay-integration-a"
        );
    });
    second.scope(|| {
        link_assistant_router::deploy::instance::select("integration-b").unwrap();
        assert_eq!(
            link_assistant_router::deploy::instance::qualify("relay"),
            "relay-integration-b"
        );
    });
    first.scope(|| {
        assert_eq!(
            link_assistant_router::deploy::instance::qualify("relay"),
            "relay-integration-a"
        );
    });
}

struct RefuseBackground;
impl ProcessRunner for RefuseBackground {
    fn output(
        &self,
        _command: &mut std::process::Command,
        _deadline: Duration,
    ) -> std::io::Result<Output> {
        panic!("background launch must use its injected spawn boundary");
    }
    fn spawn(&self, command: &mut std::process::Command) -> std::io::Result<std::process::Child> {
        assert_eq!(command.get_program(), "fixture-server");
        Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "fixture denied launch",
        ))
    }
}
#[test]
fn background_dependencies_use_the_injected_runner() {
    let mut context = OperationContext::default();
    context.process_runner = Some(Arc::new(RefuseBackground));
    let error = context.scope(|| {
        link_assistant_router::operation_context::spawn_process(
            &mut link_assistant_router::operation_context::command("fixture-server"),
        )
        .unwrap_err()
    });
    assert_eq!(error.kind(), std::io::ErrorKind::PermissionDenied);
}

struct RefuseDocker;
impl ProcessRunner for RefuseDocker {
    fn output(
        &self,
        command: &mut std::process::Command,
        deadline: Duration,
    ) -> std::io::Result<Output> {
        assert_eq!(command.get_program(), "docker");
        assert_eq!(deadline, Duration::from_secs(30));
        Err(std::io::Error::other(
            "fixture Docker dependency unavailable",
        ))
    }
}

#[tokio::test]
async fn deployment_uses_injected_docker_dependency() {
    let home = tempfile::tempdir().unwrap();
    let mut context = OperationContext::isolated(home.path());
    context.process_runner = Some(Arc::new(RefuseDocker));
    let cli = context
        .scope(|| {
            link_assistant_router::cli::try_parse_arguments(vec![
                "router".into(),
                "deploy".into(),
                "--status".into(),
                "--mode".into(),
                "container".into(),
            ])
        })
        .unwrap();
    let error = operations::execute(context, cli).await.unwrap_err();
    assert!(
        error
            .result
            .diagnostics
            .iter()
            .any(|line| line.contains("fixture Docker dependency unavailable"))
    );
}
