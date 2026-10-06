//! A separate application consuming the Rust host deployment API (#702).
//! Run with `cargo test --example host_library_consumer`.
#[cfg(unix)]
use link_assistant_router::{cli, operation_context::OperationContext, operations};

#[cfg(unix)]
struct HostGuard(std::path::PathBuf);

#[cfg(unix)]
impl Drop for HostGuard {
    fn drop(&mut self) {
        let pid = std::fs::read_to_string(self.0.join("state/host"))
            .ok()
            .and_then(|record| serde_json::from_str::<serde_json::Value>(&record).ok())
            .and_then(|record| record["pid"].as_u64());
        if let Some(pid) = pid {
            let _ = std::process::Command::new("kill")
                .arg(pid.to_string())
                .status();
        }
    }
}

#[cfg(unix)]
#[tokio::main]
async fn main() {
    // This application does not implement Router's CLI. A mistaken launch
    // with `serve` or `--version` must fail rather than accidentally recurse.
    if std::env::args_os().len() != 1 {
        std::process::exit(73);
    }
    let root = tempfile::tempdir().unwrap();
    let executable = std::env::var_os("ROUTER_BIN")
        .map_or_else(
            || {
                std::env::current_exe()
                    .unwrap()
                    .parent()
                    .unwrap()
                    .parent()
                    .unwrap()
                    .join("router")
            },
            std::path::PathBuf::from,
        )
        .canonicalize()
        .unwrap();
    let port = std::net::TcpListener::bind(("127.0.0.1", 0))
        .unwrap()
        .local_addr()
        .unwrap()
        .port();
    let mut context = OperationContext::isolated(root.path());
    context.set_env("TOKEN_SECRET", "independent-consumer-fixture-secret");
    context.set_env("STORAGE_POLICY", "text");
    context.set_env("ROUTER_BIN", executable.as_os_str());
    let deployment = root.path().join("deploy");
    let _guard = HostGuard(deployment.clone());
    let invoke = |context: &OperationContext, extra: &[&str]| {
        let mut arguments = vec![
            "router".into(),
            "deploy".into(),
            "--root".into(),
            deployment.as_os_str().to_owned(),
            "--port".into(),
            port.to_string().into(),
        ];
        if !extra.contains(&"--down") {
            arguments.extend(["--mode".into(), "host".into()]);
        }
        arguments.extend(extra.iter().map(std::ffi::OsString::from));
        context
            .scope(|| cli::try_parse_arguments(arguments))
            .unwrap()
    };
    let plan = operations::execute(context.clone(), invoke(&context, &["--status"]))
        .await
        .unwrap();
    assert_eq!(
        plan.data["host_router"]["executable"],
        executable.to_str().unwrap()
    );
    assert_eq!(
        plan.data["host_router"]["version"],
        link_assistant_router::VERSION
    );
    assert_eq!(plan.data["status_is_read_only"], true);
    assert!(!deployment.join("state/host").exists());
    // The explicit boundary takes precedence over a conflicting scoped value.
    context.daemon_executable = Some(executable.clone());
    context.set_env("ROUTER_BIN", root.path().join("not-a-router"));
    let applied = operations::execute(context.clone(), invoke(&context, &[]))
        .await
        .unwrap();
    assert!(applied.success);
    let status = operations::execute(context.clone(), invoke(&context, &["--status"]))
        .await
        .unwrap();
    let pid = status.data["host_process"]["pid"].as_u64().unwrap();
    // Arrange cleanup before checking the status, so assertion failures cannot
    // leave a server running with a deleted temporary home.
    let stopped =
        operations::execute(context.clone(), invoke(&context, &["--down", "--yes"])).await;
    assert_eq!(status.data["host_process"]["serving"], true);
    assert_eq!(status.data["converged"], true);
    assert!(pid > 0);
    assert!(stopped.unwrap().success);
    assert!(!deployment.join("state/host").exists());
    assert!(std::net::TcpStream::connect(("127.0.0.1", port)).is_err());
    println!("Independent Rust consumer: plan/apply/status/stop passed");
}

#[cfg(not(unix))]
fn main() {
    println!("Host deployment consumer requires Unix process management");
}
