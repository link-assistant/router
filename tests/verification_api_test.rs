//! Verification consumes injected Cargo/vendor results and preserves evidence.
use link_assistant_router::{
    operation_context::{OperationContext, ProcessRunner},
    verification,
};
use std::{
    path::Path,
    process::{ExitStatus, Output},
    sync::{Arc, Mutex},
    time::Duration,
};

fn status(success: bool) -> ExitStatus {
    #[cfg(unix)]
    {
        use std::os::unix::process::ExitStatusExt;
        ExitStatus::from_raw(if success { 0 } else { 256 })
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::ExitStatusExt;
        ExitStatus::from_raw(u32::from(!success))
    }
}

struct FixtureRunner {
    text: String,
    success: bool,
    calls: Mutex<Vec<String>>,
}
impl ProcessRunner for FixtureRunner {
    fn output(
        &self,
        command: &mut std::process::Command,
        deadline: Duration,
    ) -> std::io::Result<Output> {
        let program = command.get_program().to_string_lossy().into_owned();
        self.calls.lock().unwrap().push(program.clone());
        let text = match program.as_str() {
            "cargo" => {
                assert_eq!(deadline, Duration::from_secs(7));
                assert!(command.get_args().any(|arg| arg == "--no-fail-fast"));
                assert!(
                    command
                        .get_envs()
                        .any(|(name, _)| name == "ROUTER_VERIFICATION_SKIPS")
                );
                self.text.clone()
            }
            "git" => "0123456789abcdef0123456789abcdef01234567\n".into(),
            "claude" | "codex" | "opencode" => {
                assert_eq!(deadline, Duration::from_secs(15));
                assert!(command.get_args().any(|arg| arg == "--version"));
                assert!(!command.get_envs().any(|(name, _)| name == "TOKEN_SECRET"));
                "fixture 1.2.3\n".into()
            }
            other => panic!("unexpected dependency {other}; the Router binary must not be spawned"),
        };
        Ok(Output {
            status: status(self.success || program != "cargo"),
            stdout: text.into_bytes(),
            stderr: Vec::new(),
        })
    }
}

fn context(root: &Path, runner: Arc<FixtureRunner>) -> OperationContext {
    let mut context = OperationContext::isolated(root);
    context.environment.retain(|key, _| key == "PATH");
    context.working_directory = Path::new(env!("CARGO_MANIFEST_DIR")).into();
    context.now = chrono::DateTime::from_timestamp(1_800_000_000, 0);
    context.process_deadline = Duration::from_secs(7);
    context.process_runner = Some(runner);
    context
}

fn runner(text: &str, success: bool) -> Arc<FixtureRunner> {
    Arc::new(FixtureRunner {
        text: text.into(),
        success,
        calls: Mutex::default(),
    })
}

#[tokio::test]
async fn selected_area_persists_results_and_requires_complete_parity_explicitly() {
    let home = tempfile::tempdir().unwrap();
    let runner = runner("test result: ok. 2 passed; 0 failed; 0 ignored;\n", true);
    let context = context(home.path(), runner.clone());
    let output = home.path().join("result.json");
    let arguments = vec![
        "--area".into(),
        "deploy-configuration".into(),
        "--output".into(),
        output.to_string_lossy().into_owned(),
    ];
    let result = verification::run(context.clone(), arguments.clone())
        .await
        .unwrap();
    assert_eq!(result.operation, "verify");
    assert_eq!(result.data["generated_at_unix"], 1_800_000_000);
    assert_eq!(
        result.data["commit"],
        "0123456789abcdef0123456789abcdef01234567"
    );
    assert_eq!(result.data["areas"][0]["name"], "deploy-configuration");
    assert_eq!(result.data["areas"][0]["status"], "proven");
    assert_eq!(result.data["areas"][0]["passed"], 6);
    assert_eq!(result.data["complete"], false);
    assert_eq!(result.data["parity"], false);
    let saved: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&output).unwrap()).unwrap();
    assert_eq!(saved, result.data);
    assert!(home.path().join("clients.json").exists());
    assert!(home.path().join("deploy-configuration.log").exists());
    assert_eq!(
        runner
            .calls
            .lock()
            .unwrap()
            .iter()
            .filter(|name| name.as_str() == "cargo")
            .count(),
        3
    );
    let mut strict = arguments;
    strict.push("--require-parity".into());
    let error = verification::run(context, strict).await.unwrap_err();
    assert_eq!(error.result.exit_code, 3);
    assert_eq!(error.result.data["failed"], false);
    assert!(error.to_string().contains("parity was required"));
}

#[tokio::test]
async fn a_failed_compile_remains_failed_and_names_every_unexecuted_target() {
    let home = tempfile::tempdir().unwrap();
    let runner = runner("fixture compiler failure\n", false);
    let output = home.path().join("result.json");
    let error = verification::run(
        context(home.path(), runner),
        vec![
            "--area".into(),
            "deploy-configuration".into(),
            "--output".into(),
            output.to_string_lossy().into_owned(),
        ],
    )
    .await
    .unwrap_err();
    assert_eq!(error.result.exit_code, 1);
    assert_eq!(error.result.data["failed"], true);
    assert_eq!(error.result.data["areas"][0]["status"], "failed");
    assert_eq!(
        error.result.data["targets_not_run"]
            .as_array()
            .unwrap()
            .len(),
        3
    );
    assert!(
        std::fs::read_to_string(home.path().join("deploy-configuration.log"))
            .unwrap()
            .contains("fixture compiler failure")
    );
    assert!(output.exists());
}

#[tokio::test]
async fn complete_catalog_runs_only_injected_dependencies_and_records_host_drift() {
    let home = tempfile::tempdir().unwrap();
    let runner = runner("test result: ok. 1 passed; 0 failed; 0 ignored;\n", true);
    let mut context = context(home.path(), runner.clone());
    context.set_env("TOKEN_SECRET", "must-not-reach-vendor-version-probe");
    context.set_env("ROUTER_REAL_CLIENT_CODEX_HOST_VERSION", "1.2.2");
    context.set_env("ROUTER_REAL_CLIENT_CODEX_SOURCE", "installed");
    let output = home.path().join("result.json");
    let result = verification::run(
        context,
        vec!["--output".into(), output.to_string_lossy().into_owned()],
    )
    .await
    .unwrap();
    assert_eq!(result.data["complete"], true);
    assert_eq!(result.data["failed"], false);
    assert!(result.data["areas"].as_array().unwrap().len() > 5);
    let codex = &result.data["client_preparation"][1];
    if cfg!(target_os = "macos") {
        assert_eq!(result.data["parity"], false);
        assert_eq!(codex["status"], "not-proven");
        assert!(
            !runner
                .calls
                .lock()
                .unwrap()
                .iter()
                .any(|name| name == "codex")
        );
    } else {
        assert_eq!(result.data["parity"], true);
        assert_eq!(codex["observed"], "1.2.3");
        assert_eq!(codex["host_mismatch"], true);
        assert_eq!(codex["host_installed"], "1.2.2");
        assert_eq!(codex["source"], "installed");
        assert_eq!(result.data["targets_not_run"], serde_json::json!([]));
    }
}

#[tokio::test]
async fn invalid_verification_options_fail_before_dependency_execution() {
    let home = tempfile::tempdir().unwrap();
    let runner = runner("", true);
    let context = context(home.path(), runner.clone());
    for arguments in [
        vec!["--area"],
        vec!["--output"],
        vec!["--client"],
        vec!["--unexpected"],
        vec!["--area", "missing-area"],
    ] {
        let error = verification::run(
            context.clone(),
            arguments.into_iter().map(Into::into).collect(),
        )
        .await
        .unwrap_err();
        assert_eq!(error.result.exit_code, 2);
        assert_eq!(error.result.operation, "verify");
    }
    assert!(runner.calls.lock().unwrap().is_empty());
}

#[tokio::test]
async fn listing_and_single_client_preparation_do_not_compile_or_claim_parity() {
    let home = tempfile::tempdir().unwrap();
    let runner = runner("", true);
    let context = context(home.path(), runner.clone());
    let listing = verification::run(context.clone(), vec!["--list".into()])
        .await
        .unwrap();
    assert!(listing.success);
    assert!(runner.calls.lock().unwrap().is_empty());
    assert!(!home.path().join("clients.json").exists());
    let result = verification::run(
        context,
        vec![
            "--prepare-clients".into(),
            "--client".into(),
            "codex".into(),
            "--output".into(),
            home.path()
                .join("result.json")
                .to_string_lossy()
                .into_owned(),
        ],
    )
    .await
    .unwrap();
    assert_eq!(result.data["complete"], false);
    assert_eq!(result.data["parity"], false);
    assert_eq!(result.data["areas"], serde_json::json!([]));
    assert_eq!(
        result.data["client_preparation"].as_array().unwrap().len(),
        1
    );
    assert_eq!(result.data["client_preparation"][0]["client"], "codex");
    assert!(
        !runner
            .calls
            .lock()
            .unwrap()
            .iter()
            .any(|name| name == "cargo")
    );
}

#[tokio::test]
async fn evidence_io_failures_return_typed_errors() {
    let home = tempfile::tempdir().unwrap();
    let runner = runner("test result: ok. 1 passed; 0 failed; 0 ignored;\n", true);
    let context = context(home.path(), runner.clone());
    let file = home.path().join("file");
    std::fs::write(&file, "owned fixture").unwrap();
    let output = file.join("result.json");
    let error = verification::run(
        context.clone(),
        vec!["--output".into(), output.to_string_lossy().into_owned()],
    )
    .await
    .unwrap_err();
    assert_eq!(error.result.exit_code, 2);
    assert!(runner.calls.lock().unwrap().is_empty());
    let directory = home.path().join("output-directory");
    std::fs::create_dir(&directory).unwrap();
    let error = verification::run(
        context.clone(),
        vec![
            "--area".into(),
            "deploy-configuration".into(),
            "--output".into(),
            directory.to_string_lossy().into_owned(),
        ],
    )
    .await
    .unwrap_err();
    assert_eq!(error.result.exit_code, 2);
    assert!(home.path().join("deploy-configuration.log").exists());
    let error = verification::run(
        context,
        vec![
            "--client".into(),
            "unknown-client".into(),
            "--output".into(),
            home.path()
                .join("result.json")
                .to_string_lossy()
                .into_owned(),
        ],
    )
    .await
    .unwrap_err();
    assert_eq!(error.result.exit_code, 2);
}

#[tokio::test]
async fn blocked_client_evidence_returns_a_typed_error_without_running_cargo() {
    let home = tempfile::tempdir().unwrap();
    std::fs::create_dir(home.path().join("clients.json")).unwrap();
    let runner = runner("", true);
    let error = verification::run(
        context(home.path(), runner.clone()),
        vec![
            "--area".into(),
            "deploy-configuration".into(),
            "--output".into(),
            home.path()
                .join("result.json")
                .to_string_lossy()
                .into_owned(),
        ],
    )
    .await
    .unwrap_err();
    assert_eq!(error.result.exit_code, 2);
    assert!(error.to_string().contains("clients.json"));
    assert!(runner.calls.lock().unwrap().is_empty());
}

#[tokio::test]
async fn client_preparation_refusal_preserves_explanations_and_optional_manifest() {
    let home = tempfile::tempdir().unwrap();
    let runner = runner("test result: ok. 1 passed; 0 failed; 0 ignored;\n", true);
    let mut context = context(home.path(), runner);
    context.working_directory = home.path().into();
    context.set_env("ROUTER_REAL_CLIENT_CODEX_VERSION", "9.9.9");
    let result = match verification::run(
        context,
        vec![
            "--output".into(),
            home.path()
                .join("result.json")
                .to_string_lossy()
                .into_owned(),
        ],
    )
    .await
    {
        Ok(result) => result,
        Err(error) => error.result,
    };
    assert_eq!(result.data["router_version"], serde_json::Value::Null);
    assert_eq!(result.data["parity"], false);
    assert_eq!(result.data["failed"], !cfg!(target_os = "macos"));
    assert_eq!(result.exit_code, u8::from(!cfg!(target_os = "macos")));
    let unexecuted = result.data["areas_not_run"].as_array().unwrap();
    assert!(!unexecuted.is_empty());
    for area in unexecuted {
        assert!(area["name"].as_str().is_some());
        assert!(area["reason"].as_str().is_some());
        assert!(area["enable_with"].as_str().is_some());
    }
    assert!(
        !result
            .diagnostics
            .iter()
            .any(|line| line.contains("contract violation"))
    );
    link_assistant_router::contracts::validation::operation(
        "verify",
        &serde_json::to_value(&result).unwrap(),
    )
    .unwrap();
}

#[tokio::test]
async fn relative_verification_evidence_and_metadata_use_the_injected_directory() {
    let home = tempfile::tempdir().unwrap();
    std::fs::write(
        home.path().join("Cargo.toml"),
        "[package]\nversion = \"9.8.7\"\n",
    )
    .unwrap();
    let runner = runner("test result: ok. 1 passed; 0 failed; 0 ignored;\n", true);
    let mut context = context(home.path(), runner);
    context.working_directory = home.path().into();
    let relative = "target/issue-697-relative-root-regression/result.json";
    let result = verification::run(
        context,
        vec![
            "--area".into(),
            "deploy-configuration".into(),
            "--output".into(),
            relative.into(),
        ],
    )
    .await
    .unwrap();
    assert_eq!(result.data["router_version"], "9.8.7");
    let saved: serde_json::Value =
        serde_json::from_slice(&std::fs::read(home.path().join(relative)).unwrap()).unwrap();
    assert_eq!(saved, result.data);
    assert!(
        result.data["areas"][0]["log"]
            .as_str()
            .unwrap()
            .starts_with(home.path().to_str().unwrap())
    );
}

#[tokio::test]
async fn filtered_vendor_proof_preserves_filter_and_never_claims_complete_parity() {
    let home = tempfile::tempdir().unwrap();
    let runner = runner("test result: ok. 1 passed; 0 failed; 0 ignored;\n", true);
    let result = verification::run(
        context(home.path(), runner),
        vec![
            "--area".into(),
            "real-clients".into(),
            "--client".into(),
            "claude".into(),
            "--output".into(),
            home.path()
                .join("result.json")
                .to_string_lossy()
                .into_owned(),
        ],
    )
    .await
    .unwrap();
    assert_eq!(result.data["complete"], false);
    assert_eq!(result.data["parity"], false);
    assert_eq!(
        result.data["client_preparation"].as_array().unwrap().len(),
        1
    );
    assert_eq!(result.data["client_preparation"][0]["client"], "claude");
    let area = &result.data["areas"][0];
    if cfg!(target_os = "macos") {
        assert_eq!(area["ran"], false);
    } else {
        assert_eq!(area["ran"], true);
        for command in area["commands"].as_array().unwrap() {
            assert!(command.as_str().unwrap().contains(" claude -- "));
        }
    }
}

struct UnavailableDependencies;
impl ProcessRunner for UnavailableDependencies {
    fn output(
        &self,
        _command: &mut std::process::Command,
        _deadline: Duration,
    ) -> std::io::Result<Output> {
        Err(std::io::Error::from(std::io::ErrorKind::NotFound))
    }
}

#[tokio::test]
async fn unavailable_dependencies_remain_failed_without_git_metadata() {
    let home = tempfile::tempdir().unwrap();
    let mut context = context(home.path(), runner("", true));
    context.process_runner = Some(Arc::new(UnavailableDependencies));
    let error = verification::run(
        context,
        vec![
            "--area".into(),
            "deploy-configuration".into(),
            "--output".into(),
            home.path()
                .join("result.json")
                .to_string_lossy()
                .into_owned(),
        ],
    )
    .await
    .unwrap_err();
    assert_eq!(error.result.exit_code, 1);
    assert_eq!(error.result.data["commit"], serde_json::Value::Null);
    assert_eq!(error.result.data["failed"], true);
    assert_eq!(error.result.data["areas"][0]["status"], "failed");
    assert_eq!(
        error.result.data["targets_not_run"]
            .as_array()
            .unwrap()
            .len(),
        3
    );
    assert!(
        std::fs::read_to_string(home.path().join("deploy-configuration.log"))
            .unwrap()
            .contains("could not run cargo")
    );
}
