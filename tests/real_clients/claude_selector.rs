use super::*;

struct ExternalTrafficGuard {
    origin: String,
    attempts: Arc<Mutex<Vec<CapturedRequest>>>,
    stop: Arc<AtomicBool>,
    thread: Option<thread::JoinHandle<()>>,
}

impl ExternalTrafficGuard {
    fn start() -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind external traffic guard");
        listener
            .set_nonblocking(true)
            .expect("configure external traffic guard");
        let address = listener
            .local_addr()
            .expect("external traffic guard address");
        let attempts = Arc::new(Mutex::new(Vec::new()));
        let captured = Arc::clone(&attempts);
        let stop = Arc::new(AtomicBool::new(false));
        let stopped = Arc::clone(&stop);
        let thread = thread::spawn(move || {
            while !stopped.load(Ordering::Acquire) {
                match listener.accept() {
                    Ok((mut stream, _)) => {
                        if let Some(request) = read_request(&mut stream) {
                            captured
                                .lock()
                                .expect("capture external attempt")
                                .push(request);
                        }
                        let _ = stream.write_all(
                            b"HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
                        );
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(10));
                    }
                    Err(error) => panic!("accept external traffic attempt: {error}"),
                }
            }
        });
        Self {
            origin: format!("http://{address}"),
            attempts,
            stop,
            thread: Some(thread),
        }
    }
}

impl Drop for ExternalTrafficGuard {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Release);
        let _ = TcpStream::connect(self.origin.trim_start_matches("http://"));
        if let Some(thread) = self.thread.take() {
            thread.join().expect("stop external traffic guard");
        }
    }
}

fn run_split_auth_capture(home: &Path, router: &MockRouter, external_proxy: &str) -> Output {
    let working_directory = Path::new(env!("CARGO_MANIFEST_DIR"));
    let mut command = Command::new(env!("CARGO_BIN_EXE_with-router"));
    command.args([
        "--server",
        &router.origin,
        "--token",
        "offline-admin",
        "--model",
        CLAUDE.model,
        "--extend-global-config",
        "--non-interactive",
        CLAUDE.client,
        PROMPT,
    ]);
    let mut child = command
        .current_dir(working_directory)
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join(".config"))
        .env("CODEX_HOME", home.join(".codex"))
        .env("CI", "1")
        .env("NO_COLOR", "1")
        .env("NO_PROXY", "127.0.0.1,localhost")
        .env("no_proxy", "127.0.0.1,localhost")
        .env("HTTP_PROXY", external_proxy)
        .env("HTTPS_PROXY", external_proxy)
        .env("ALL_PROXY", external_proxy)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("launch Claude split-auth capture");
    let status = child
        .wait_timeout(Duration::from_secs(60))
        .expect("wait for Claude split-auth capture");
    if status.is_none() {
        child.kill().expect("stop timed-out Claude capture");
        let output = child.wait_with_output().expect("collect timed-out output");
        panic!(
            "Claude split-auth capture did not finish; stdout: {}; stderr: {}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }
    child
        .wait_with_output()
        .expect("collect Claude split-auth output")
}

pub fn assert_split_auth_boundary(home: &Path, router: &MockRouter) {
    let claude_home = home.join(".claude");
    std::fs::create_dir_all(&claude_home).expect("create synthetic Claude profile");
    let credentials = b"{\"claudeAiOauth\":{\"accessToken\":\"synthetic-claude-oauth\",\"refreshToken\":\"synthetic-claude-refresh\",\"expiresAt\":4102444800000,\"subscriptionType\":\"max\",\"scopes\":[\"user:inference\",\"user:mcp_servers\",\"user:file_upload\",\"user:profile\",\"user:sessions:claude_code\"]}}\n";
    std::fs::write(claude_home.join(".credentials.json"), credentials)
        .expect("write synthetic Claude login");

    let request_start = router.requests.lock().expect("read Router capture").len();
    let before = router.inference_requests(CLAUDE.inference_path).len();
    let external = ExternalTrafficGuard::start();
    let output = run_split_auth_capture(home, router, &external.origin);
    assert!(
        output.status.success(),
        "Claude split-auth boundary capture failed; stdout: {}; stderr: {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let stderr = String::from_utf8_lossy(&output.stderr);
    for unavailable in [
        "Claude.ai connectors",
        "Remote Control",
        "/schedule",
        "notification preferences",
        "cloud sessions",
        "remote managed settings",
        "organization policy",
    ] {
        assert!(
            stderr.contains(unavailable),
            "the real-client diagnostic omitted {unavailable}: {stderr}"
        );
    }
    assert_eq!(
        std::fs::read(claude_home.join(".credentials.json"))
            .expect("read synthetic Claude login after capture"),
        credentials,
        "Router must leave the released client's stored login byte-identical"
    );

    let requests = router.inference_requests(CLAUDE.inference_path);
    let split_inference = &requests[before..];
    assert!(
        !split_inference.is_empty(),
        "the limitation must not disable Router inference"
    );
    let router_credential = format!("Bearer {}", run_token(CLAUDE));
    for request in split_inference {
        assert_eq!(
            request.header("authorization"),
            Some(router_credential.as_str()),
            "every sampling attempt must carry only the Router credential"
        );
    }
    let capture = {
        let captured = router.requests.lock().expect("read split-auth capture");
        let split_requests = captured[request_start..].to_vec();
        drop(captured);
        let catalog_requests = split_requests
            .iter()
            .filter(|request| request.method == "GET" && request.path == CLAUDE.catalog_path)
            .collect::<Vec<_>>();
        assert!(
            !catalog_requests.is_empty(),
            "Claude must discover its native Router catalog: {split_requests:?}"
        );
        for request in catalog_requests {
            assert_eq!(
                request.header("authorization"),
                Some(router_credential.as_str()),
                "Claude native model discovery must carry only the Router credential"
            );
        }
        format!("{split_requests:?}")
    };
    assert!(
        !capture.contains("synthetic-claude-oauth")
            && !capture.contains("synthetic-claude-refresh"),
        "the stored Claude identity must never reach Router"
    );
    let external_attempts = external
        .attempts
        .lock()
        .expect("read external traffic attempts")
        .clone();
    for attempt in &external_attempts {
        assert_eq!(
            (attempt.method.as_str(), attempt.path.as_str()),
            ("CONNECT", "api.anthropic.com:443"),
            "the offline capture must reject any unexpected external destination: {external_attempts:?}"
        );
        assert!(
            attempt.body.is_empty() && attempt.header("authorization").is_none(),
            "a blocked pre-TLS probe must not expose a request body or credential: {attempt:?}"
        );
    }
}

fn catalog_model(id: &str, owner: &str) -> Value {
    json!({
        "id": id, "type": "model", "display_name": id,
        "created_at": "2026-09-05T00:00:00Z", "owned_by": owner
    })
}

fn seed_home(home: &Path, working_directory: &Path) {
    std::fs::create_dir_all(home).expect("create synthetic Claude profile");
    let mut projects = serde_json::Map::new();
    projects.insert(
        working_directory.to_string_lossy().into_owned(),
        json!({"hasTrustDialogAccepted": true}),
    );
    std::fs::write(
        home.join(".claude.json"),
        json!({
            "hasCompletedOnboarding": true,
            "lastOnboardingVersion": CLAUDE_VERSION,
            "theme": "dark",
            "projects": projects
        })
        .to_string(),
    )
    .expect("seed isolated Claude TUI settings");
}

fn selector_transcript(home: &Path, router: &MockRouter, visible: &[&str]) -> String {
    let working_directory = Path::new(env!("CARGO_MANIFEST_DIR"));
    let profile = home.join(".config/link-assistant-router/clients/claude/home");
    seed_home(&profile, working_directory);
    let mut command = CommandBuilder::new(env!("CARGO_BIN_EXE_with-router"));
    command.args([
        "--server",
        &router.origin,
        "--token",
        "offline-admin",
        "--interactive",
        "claude",
    ]);
    command.cwd(working_directory);
    command.env("HOME", home);
    command.env("XDG_CONFIG_HOME", home.join(".config"));
    command.env("TERM", "xterm-256color");
    command.env("NO_COLOR", "1");
    command.env("NO_PROXY", "127.0.0.1,localhost");
    command.env("no_proxy", "127.0.0.1,localhost");
    command.env("HTTP_PROXY", "http://127.0.0.1:9");
    command.env("HTTPS_PROXY", "http://127.0.0.1:9");
    command.env("ALL_PROXY", "http://127.0.0.1:9");
    let session = PtySession::spawn(command).expect("start Claude TUI through Router");
    session
        .wait_for(
            |text| text.contains('❯'),
            Duration::from_millis(250),
            Duration::from_secs(30),
        )
        .unwrap_or_else(|error| panic!("Claude TUI was not ready: {error}"));
    session.send_text("/model").expect("type /model");
    session
        .wait_idle(Duration::from_millis(200), Duration::from_secs(3))
        .expect("settle /model input");
    session.send_key(Key::Enter).expect("open model selector");
    let transcript = session
        .wait_for(
            |text| {
                let compact = text
                    .chars()
                    .filter(|character| !character.is_whitespace())
                    .collect::<String>();
                compact.contains("Selectmodel") && visible.iter().all(|model| text.contains(model))
            },
            Duration::from_millis(250),
            Duration::from_secs(20),
        )
        .unwrap_or_else(|error| {
            panic!(
                "Claude /model did not settle: {error}; routes: {:?}; transcript: {}",
                router.routes(),
                session.transcript_tail(2_000)
            )
        });
    session.kill();
    transcript
}

fn assert_scenario(models: &[(&str, &str)], visible: &[&str], verify_reset: bool) {
    let router = MockRouter::start_with_models(
        CLAUDE,
        models
            .iter()
            .map(|(id, owner)| catalog_model(id, owner))
            .collect(),
    );
    let home = tempfile::tempdir().expect("temporary Claude home");
    let transcript = selector_transcript(home.path(), &router, visible);
    assert!(
        !home.path().join(".claude").exists() && !home.path().join(".claude.json").exists(),
        "a default Router launch must not create or change the normal Claude tree"
    );
    let compact = transcript
        .chars()
        .filter(|character| !character.is_whitespace())
        .collect::<String>();
    for (model, owner) in models {
        if *owner != "z.ai" {
            continue;
        }
        for (offset, _) in compact.match_indices(model) {
            let before = compact[..offset].chars().rev().take(80).collect::<String>();
            let after = compact[offset + model.len()..]
                .chars()
                .take(80)
                .collect::<String>();
            let nearby = format!("{before}{after}");
            for family in ["CustomOpus", "CustomSonnet", "CustomHaiku"] {
                assert!(
                    !nearby.contains(family),
                    "z.ai model attached to a fake family"
                );
            }
        }
    }
    let selected = models
        .iter()
        .find_map(|(model, owner)| (*owner == "z.ai").then_some(*model))
        .unwrap_or(models[0].0);
    let output = run_wrapper_with_model(
        CLAUDE,
        Path::new(env!("CARGO_MANIFEST_DIR")),
        home.path(),
        &router.origin,
        selected,
    );
    assert!(
        output.status.success(),
        "Claude did not serve the selected exact model"
    );
    let request = router
        .inference_requests(CLAUDE.inference_path)
        .into_iter()
        .last()
        .expect("selected exact model reaches inference");
    let body: Value = serde_json::from_slice(&request.body).expect("Claude inference JSON");
    assert_eq!(body["model"], selected);

    if verify_reset {
        let output = run_wrapper_with_options(
            CLAUDE,
            Path::new(env!("CARGO_MANIFEST_DIR")),
            home.path(),
            &router.origin,
            Some(selected),
            &["--reset-to-default-configuration", PROMPT],
        );
        assert!(
            output.status.success(),
            "Claude did not serve the exact model after resetting its Router profile: {}{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        let request = router
            .inference_requests(CLAUDE.inference_path)
            .into_iter()
            .last()
            .expect("post-reset exact model reaches inference");
        let body: Value =
            serde_json::from_slice(&request.body).expect("post-reset Claude inference JSON");
        assert_eq!(body["model"], selected);
    }

    if models.iter().all(|(_, owner)| *owner == "z.ai") {
        let before = router.inference_requests(CLAUDE.inference_path).len();
        let fallback = run_wrapper_with_options(
            CLAUDE,
            Path::new(env!("CARGO_MANIFEST_DIR")),
            home.path(),
            &router.origin,
            None,
            &[PROMPT],
        );
        assert!(
            fallback.status.success(),
            "Claude default/fallback run failed"
        );

        let session = "11111111-2222-4333-8444-555555555555";
        let initial = run_wrapper_with_options(
            CLAUDE,
            Path::new(env!("CARGO_MANIFEST_DIR")),
            home.path(),
            &router.origin,
            Some(selected),
            &["--session-id", session, PROMPT],
        );
        assert!(initial.status.success(), "Claude resumable run failed");
        let resumed = run_wrapper_with_options(
            CLAUDE,
            Path::new(env!("CARGO_MANIFEST_DIR")),
            home.path(),
            &router.origin,
            None,
            &["--resume", session, PROMPT],
        );
        assert!(resumed.status.success(), "Claude resumed run failed");

        let before_subagent = router.inference_requests(CLAUDE.inference_path).len();
        let subagent = run_wrapper_with_options(
            CLAUDE,
            Path::new(env!("CARGO_MANIFEST_DIR")),
            home.path(),
            &router.origin,
            Some(selected),
            &[SUBAGENT_PROMPT],
        );
        assert!(subagent.status.success(), "Claude subagent run failed");

        let requests = router.inference_requests(CLAUDE.inference_path);
        assert!(
            requests.len() >= before_subagent + 2,
            "the Agent tool did not produce a subagent request"
        );
        for request in &requests[before..] {
            let body: Value =
                serde_json::from_slice(&request.body).expect("Claude routed request JSON");
            let model = body["model"].as_str().expect("exact routed model");
            assert!(
                models.iter().any(|(advertised, _)| *advertised == model),
                "main, resumed, fallback, or subagent request used unadvertised model {model}"
            );
        }
    }
}

#[test]
fn current_claude_model_selector_keeps_exact_provider_models_distinct() {
    if !enabled() {
        return;
    }
    assert!(
        command_exists("claude"),
        "the real-client gate requires claude"
    );
    assert_scenario(&[("future-glm-only", "z.ai")], &["future-glm-only"], false);
    assert_scenario(
        &[
            ("future-glm-alpha", "z.ai"),
            ("future-glm-beta", "z.ai"),
            ("future-glm-gamma", "z.ai"),
        ],
        &["future-glm-alpha", "future-glm-beta", "future-glm-gamma"],
        false,
    );
    assert_scenario(
        &[
            ("future-claude-native", "anthropic"),
            ("future-glm-mixed", "z.ai"),
        ],
        &["future-claude-native", "future-glm-mixed"],
        true,
    );
}
