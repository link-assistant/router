//! Real Codex against a z.ai-only catalog whose rows carry no reasoning
//! metadata (issue #628).
//!
//! Router v1.14.3 refused to launch Codex at all here: every authorized GLM row
//! lacked reasoning metadata, so `--version`, an explicit `--model`, and the
//! interactive TUI all stopped before the client started. Each of those paths
//! now runs the real client and, where it infers, proves on the wire that the
//! chosen exact model and the user's configured effort are what Codex sent.

use super::*;

const MAIN: &str = "glm-5.3";
const FLASH: &str = "glm-5.3-flash";
const EFFORT: &str = "xhigh";

fn zai_models() -> Vec<Value> {
    [MAIN, FLASH]
        .into_iter()
        .map(|id| {
            json!({
                "id": id,
                "type": "model",
                "display_name": id,
                "created_at": "2026-09-04T00:00:00Z",
                "owned_by": "z.ai"
            })
        })
        .collect()
}

/// A Codex home whose only preference is the user's reasoning effort.
fn seeded_home() -> tempfile::TempDir {
    let home = tempfile::tempdir().expect("temporary Codex home");
    let codex_home = home.path().join(".codex");
    std::fs::create_dir_all(&codex_home).expect("create Codex home");
    std::fs::write(
        codex_home.join("config.toml"),
        format!(
            "model_reasoning_effort = {EFFORT:?}\n\n[projects.{:?}]\ntrust_level = \"trusted\"\n",
            Path::new(env!("CARGO_MANIFEST_DIR")).to_string_lossy()
        ),
    )
    .expect("seed Codex settings");
    home
}

fn rendered(output: &Output) -> String {
    format!(
        "stdout: {}; stderr: {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

fn wait_for_inference(router: &MockRouter, seen: usize, context: impl Fn() -> String) -> Value {
    let deadline = Instant::now() + Duration::from_secs(30);
    loop {
        let requests = router.inference_requests(CODEX.inference_path);
        if requests.len() > seen {
            return requests[seen].json_body();
        }
        assert!(
            Instant::now() < deadline,
            "Codex never sent an inference request; {}",
            context()
        );
        thread::sleep(Duration::from_millis(50));
    }
}

#[test]
fn current_codex_launches_on_a_zai_only_catalog_without_reasoning_metadata() {
    if !enabled() {
        return;
    }
    assert!(
        command_exists("codex"),
        "codex is required for the real-client gate"
    );
    let working_directory = Path::new(env!("CARGO_MANIFEST_DIR"));
    let router = MockRouter::start_with_models(CODEX, zai_models());

    // `router with codex -- --version` must reach the real client.
    let home = seeded_home();
    let version = run_wrapper_with_options(
        CODEX,
        working_directory,
        home.path(),
        &router.origin,
        None,
        &["--version"],
    );
    assert!(
        version.status.success() && rendered(&version).contains(CODEX_VERSION),
        "`with codex -- --version` must launch Codex {CODEX_VERSION}; {}",
        rendered(&version)
    );

    // An explicit exact model forwarded to Codex, then one real inference.
    let explicit = run_wrapper_with_options(
        CODEX,
        working_directory,
        home.path(),
        &router.origin,
        None,
        &["--model", FLASH, PROMPT],
    );
    assert!(
        explicit.status.success() && rendered(&explicit).contains(ANSWER),
        "`with codex -- --model {FLASH}` must run one real inference; {}",
        rendered(&explicit)
    );
    let body = wait_for_inference(&router, 0, || rendered(&explicit));
    assert_eq!(body["model"], FLASH);
    assert_eq!(
        body["reasoning"]["effort"], EFFORT,
        "a row without metadata must keep the configured reasoning effort"
    );

    // Router's own `--model` selection of the other exact row.
    let selected = run_wrapper_with_options(
        CODEX,
        working_directory,
        home.path(),
        &router.origin,
        Some(MAIN),
        &[PROMPT],
    );
    assert!(
        selected.status.success(),
        "`with --model {MAIN} codex` failed; {}",
        rendered(&selected)
    );
    let body = wait_for_inference(&router, 1, || rendered(&selected));
    assert_eq!(body["model"], MAIN);
    assert_eq!(body["reasoning"]["effort"], EFFORT);
}

#[test]
fn current_codex_tui_starts_on_a_zai_only_catalog_without_reasoning_metadata() {
    if !enabled() {
        return;
    }
    assert!(
        command_exists("codex"),
        "codex is required for the real-client gate"
    );
    let home = seeded_home();
    let router = MockRouter::start_with_models(CODEX, zai_models());
    let mut command = wrapper::isolated_pty_command();
    command.args([
        "--server",
        &router.origin,
        "--token",
        "offline-admin",
        "codex",
    ]);
    command.cwd(Path::new(env!("CARGO_MANIFEST_DIR")));
    command.env("HOME", home.path());
    command.env("XDG_CONFIG_HOME", home.path().join(".config"));
    command.env("CODEX_HOME", home.path().join(".codex"));
    command.env("TERM", "xterm-256color");
    command.env("NO_COLOR", "1");
    command.env("NO_PROXY", "127.0.0.1,localhost");
    command.env("no_proxy", "127.0.0.1,localhost");
    command.env("HTTP_PROXY", "http://127.0.0.1:9");
    command.env("HTTPS_PROXY", "http://127.0.0.1:9");
    command.env("ALL_PROXY", "http://127.0.0.1:9");
    let session = PtySession::spawn(command).expect("start Codex TUI through Router");
    session
        .wait_for(
            |text| text.contains("glm-5.3"),
            Duration::from_millis(250),
            Duration::from_secs(30),
        )
        .unwrap_or_else(|error| {
            panic!(
                "Codex TUI did not start on the z.ai-only catalog: {error}; routes: {:?}; transcript: {}",
                router.routes(),
                session.transcript_tail(2_000)
            )
        });
    session.send_text(PROMPT).expect("type inference prompt");
    session
        .wait_idle(Duration::from_millis(200), Duration::from_secs(3))
        .expect("settle inference prompt");
    session
        .send_key(Key::Enter)
        .expect("submit inference prompt");
    let body = wait_for_inference(&router, 0, || session.transcript_tail(2_000));
    assert!(
        [MAIN, FLASH].contains(&body["model"].as_str().unwrap_or_default()),
        "the interactive session sent an unadvertised model: {}",
        body["model"]
    );
    assert_eq!(
        body["reasoning"]["effort"], EFFORT,
        "interactive startup must keep the configured reasoning effort"
    );
    session.kill();
}
