use super::*;

#[test]
fn candidate_launch_health_and_first_cutover_failures_all_roll_back() {
    for failure in ["launch", "health", "relay"] {
        let root = tempfile::tempdir().unwrap();
        let runner = FakeRunner::default();
        {
            let mut world = runner.0.lock().unwrap();
            match failure {
                "launch" => world.fail_backend_runs = 1,
                "health" => world.health_default = false,
                "relay" => world.fail_relay_runs = 1,
                _ => unreachable!(),
            }
        }
        let coordinator = coordinator(runner.clone(), root.path(), "router:1", 8080, false);
        coordinator.create_directories().unwrap();
        let error = coordinator.deploy(&Existing::Absent).unwrap_err();
        assert!(
            error.contains("failed") || error.contains("healthy"),
            "{error}"
        );
        assert!(coordinator.state.current().unwrap().is_none());
        assert_eq!(
            coordinator.state.transaction().unwrap().unwrap().phase,
            Phase::Complete
        );
        assert!(runner.0.lock().unwrap().containers.is_empty());
    }
}

#[test]
fn token_issue_failure_does_not_undo_a_verified_deployment() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    runner.0.lock().unwrap().fail_token_issue = true;
    let coordinator = coordinator(runner.clone(), root.path(), "router:1", 8080, false);
    coordinator.create_directories().unwrap();

    coordinator.deploy(&Existing::Absent).unwrap();

    assert!(coordinator.state.active().unwrap().is_some());
    {
        let mut world = runner.0.lock().unwrap();
        world.fail_token_issue = false;
        world.token_inventory = r#"[{"label":"deploy","revoked":false}]"#.into();
    }
    let issued_before = runner
        .0
        .lock()
        .unwrap()
        .commands
        .iter()
        .filter(|command| command.iter().any(|argument| argument == "issue"))
        .count();
    coordinator.ensure_deploy_token("already-provisioned");
    let issued_after = runner
        .0
        .lock()
        .unwrap()
        .commands
        .iter()
        .filter(|command| command.iter().any(|argument| argument == "issue"))
        .count();
    assert_eq!(issued_after, issued_before);
}

#[test]
fn managed_cutover_failures_restore_the_old_backend() {
    for failure in ["listener", "post-health"] {
        let root = tempfile::tempdir().unwrap();
        let runner = FakeRunner::default();
        let initial = coordinator(runner.clone(), root.path(), "router:1", 8080, false);
        initial.create_directories().unwrap();
        initial.deploy(&Existing::Absent).unwrap();
        let active = initial.state.active().unwrap().unwrap();
        {
            let mut world = runner.0.lock().unwrap();
            if failure == "listener" {
                world.fail_relay_runs = 1;
            } else {
                world.health_results = VecDeque::from([true, false, false]);
                world.health_default = false;
            }
        }
        let port = if failure == "listener" { 9090 } else { 8080 };
        let update = coordinator(runner.clone(), root.path(), "router:2", port, true);
        let error = update
            .deploy(&Existing::Managed(active.clone()))
            .unwrap_err();
        assert!(error.contains("rolled back"), "{error}");
        assert_eq!(
            update.state.current().unwrap().as_deref(),
            Some(active.backend.as_str())
        );
        assert!(
            runner
                .0
                .lock()
                .unwrap()
                .containers
                .contains_key(&active.backend)
        );
    }
}

#[test]
fn a_failed_legacy_cutover_restarts_the_old_front_door() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    {
        let mut world = runner.0.lock().unwrap();
        world.fail_relay_runs = 1;
        world.containers.insert(
            LEGACY.into(),
            Container {
                running: true,
                image_ref: "router:legacy".into(),
                image_id: "sha256:legacy".into(),
                labels: HashMap::from([(LABEL_KEY.into(), "1".into())]),
                mounts: HashMap::from([
                    (
                        "/data/claude".into(),
                        root.path().join("credentials").display().to_string(),
                    ),
                    (
                        "/data/router".into(),
                        root.path().join("data").display().to_string(),
                    ),
                ]),
            },
        );
    }
    let coordinator = coordinator(runner.clone(), root.path(), "router:2", 8080, true);
    coordinator.create_directories().unwrap();

    let error = coordinator.deploy(&Existing::Legacy).unwrap_err();

    assert!(error.contains("legacy migration failed"), "{error}");
    assert!(runner.0.lock().unwrap().containers[LEGACY].running);
    assert!(coordinator.state.current().unwrap().is_none());
}

#[test]
fn legacy_and_empty_rollbacks_restore_only_owned_resources() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let coordinator = coordinator(runner.clone(), root.path(), "router:2", 8080, false);
    coordinator.create_directories().unwrap();
    {
        let mut world = runner.0.lock().unwrap();
        world.containers.insert(
            LEGACY.into(),
            Container {
                running: false,
                image_ref: "router:legacy".into(),
                image_id: "sha256:legacy".into(),
                labels: HashMap::from([(LABEL_KEY.into(), "1".into())]),
                mounts: HashMap::from([
                    (
                        "/data/claude".into(),
                        root.path().join("credentials").display().to_string(),
                    ),
                    (
                        "/data/router".into(),
                        root.path().join("data").display().to_string(),
                    ),
                ]),
            },
        );
        world.containers.insert(
            "candidate".into(),
            managed_container(root.path(), "router:2", "sha256:new"),
        );
    }
    coordinator.state.set_current("candidate").unwrap();
    let legacy = Transaction {
        version: 1,
        phase: Phase::Prepared,
        previous: Some(LEGACY.into()),
        previous_kind: PreviousKind::Legacy,
        previous_port: Some(8080),
        candidate: "candidate".into(),
        image_ref: "router:2".into(),
        image_id: "sha256:new".into(),
        port: 8080,
    };
    coordinator.rollback(&legacy).unwrap();
    let world = runner.0.lock().unwrap();
    assert!(world.containers[LEGACY].running);
    assert!(!world.containers.contains_key("candidate"));
    drop(world);

    let empty = Transaction {
        previous: None,
        previous_kind: PreviousKind::None,
        previous_port: None,
        candidate: "never-created".into(),
        ..legacy
    };
    coordinator.rollback(&empty).unwrap();
}

#[test]
fn ownership_and_durable_record_disagreements_fail_closed() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let coordinator = coordinator(runner.clone(), root.path(), "router:1", 8080, false);
    coordinator.create_directories().unwrap();
    let active = Active {
        version: 1,
        backend: "missing".into(),
        image_ref: "router:1".into(),
        image_id: "sha256:old".into(),
        port: 8080,
    };
    coordinator.state.write_active(&active).unwrap();
    coordinator.state.set_current("different").unwrap();
    assert!(
        coordinator
            .existing()
            .unwrap_err()
            .contains("relay pointer")
    );
    coordinator.state.set_current("missing").unwrap();
    assert!(coordinator.existing().unwrap_err().contains("absent"));

    coordinator.state.clear_deployment_records().unwrap();
    runner.0.lock().unwrap().containers.insert(
        RELAY.into(),
        Container {
            running: true,
            image_ref: "router:1".into(),
            image_id: "sha256:old".into(),
            labels: HashMap::new(),
            mounts: HashMap::new(),
        },
    );
    assert!(
        coordinator
            .existing()
            .unwrap_err()
            .contains("without a durable active")
    );
    assert!(coordinator.remove_relay().unwrap_err().contains("unowned"));
    assert!(
        coordinator
            .remove_backend(RELAY)
            .unwrap_err()
            .contains("unowned")
    );
    assert!(
        coordinator
            .finish_accepted(&Transaction {
                version: 1,
                phase: Phase::Accepted,
                previous: None,
                previous_kind: PreviousKind::None,
                previous_port: None,
                candidate: "missing".into(),
                image_ref: "router:1".into(),
                image_id: "sha256:new".into(),
                port: 8080,
            })
            .unwrap_err()
            .contains("not owned")
    );
}

#[test]
fn dispatcher_reports_and_recovers_an_interrupted_empty_install() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let state = State::new(root.path());
    std::fs::create_dir_all(state.directory()).unwrap();
    let transaction = Transaction {
        version: 1,
        phase: Phase::Prepared,
        previous: None,
        previous_kind: PreviousKind::None,
        previous_port: None,
        candidate: "interrupted".into(),
        image_ref: "router:1.0.0".into(),
        image_id: "sha256:interrupted".into(),
        port: 8080,
    };
    state.write_transaction(&transaction).unwrap();
    let mut args = deploy_args();
    args.status = true;
    assert_ne!(
        run_with_docker(
            &args,
            root.path(),
            "router:1.0.0",
            "integration-test-signing-secret",
            Docker::with_runner(runner.clone()),
        ),
        std::process::ExitCode::SUCCESS
    );

    args.status = false;
    assert_eq!(
        run_with_docker(
            &args,
            root.path(),
            "router:1.0.0",
            "integration-test-signing-secret",
            Docker::with_runner(runner),
        ),
        std::process::ExitCode::SUCCESS
    );
    assert!(state.active().unwrap().is_some());
}

#[test]
fn dispatcher_rejects_a_future_transaction_before_mutation() {
    let root = tempfile::tempdir().unwrap();
    let state = State::new(root.path());
    std::fs::create_dir_all(state.directory()).unwrap();
    state
        .write_transaction(&Transaction {
            version: 2,
            phase: Phase::Prepared,
            previous: None,
            previous_kind: PreviousKind::None,
            previous_port: None,
            candidate: "future".into(),
            image_ref: "router:1.0.0".into(),
            image_id: "sha256:future".into(),
            port: 8080,
        })
        .unwrap();

    let code = run_with_docker(
        &deploy_args(),
        root.path(),
        "router:1.0.0",
        "integration-test-signing-secret",
        Docker::with_runner(FakeRunner::default()),
    );

    assert_ne!(code, std::process::ExitCode::SUCCESS);
}

#[test]
fn an_absent_root_can_be_torn_down_without_creating_it() {
    let parent = tempfile::tempdir().unwrap();
    let root = parent.path().join("absent");
    let coordinator = coordinator(FakeRunner::default(), &root, "router:1", 8080, false);

    coordinator.down().unwrap();

    assert!(!root.exists());
}
