//! A disposable primary/candidate pair. No workstation deployment or rotating
//! OAuth source is discovered. Explicit gates authorize bounded billed probes.
mod common;

use futures_util::StreamExt as _;
use link_assistant_router::{bounded_process, verification_client};
use serde_json::{Value, json};
use std::path::Path;
use std::process::Command;
use std::time::{Duration, Instant};

struct Stage {
    root: tempfile::TempDir,
    client: tempfile::TempDir,
    name: String,
    image: String,
    port: u16,
}
impl Stage {
    fn new(image: &str) -> Self {
        Self {
            root: tempfile::tempdir().unwrap(),
            client: tempfile::tempdir().unwrap(),
            name: format!("verify-{}", uuid::Uuid::new_v4().simple()),
            image: image.into(),
            port: std::net::TcpListener::bind("127.0.0.1:0")
                .unwrap()
                .local_addr()
                .unwrap()
                .port(),
        }
    }
    fn deploy(&self, extra: &[&str], key: &str) -> std::process::Output {
        self.try_deploy(extra, key)
            .expect("bounded namespace operation")
    }
    fn try_deploy(&self, extra: &[&str], key: &str) -> std::io::Result<std::process::Output> {
        let mut command = Command::new(env!("CARGO_BIN_EXE_router"));
        verification_client::environment(&mut command, self.client.path());
        command
            .args(["deploy", "--staging", &self.name, "--root"])
            .arg(self.root.path())
            .args([
                "--image",
                &self.image,
                "--port",
                &self.port.to_string(),
                "--json",
            ])
            .args(extra)
            .env("ROUTER_STAGING_ZAI_API_KEY", key);
        bounded_process::output(&mut command, Duration::from_secs(150))
    }
    fn origin(&self) -> String {
        format!("http://127.0.0.1:{}", self.port)
    }
    fn token(&self) -> String {
        std::fs::read_to_string(self.root.path().join("client-token")).unwrap()
    }
    fn seed_client(&self, version: &Value) {
        let profile = self
            .client
            .path()
            .join(".config/link-assistant-router/clients/claude/home");
        std::fs::create_dir_all(&profile).unwrap();
        std::fs::write(
            profile.join(".claude.json"),
            json!({"hasCompletedOnboarding":true,
            "lastOnboardingVersion":version,"theme":"dark","projects":{
                self.client.path().display().to_string():{"hasTrustDialogAccepted":true}
            }})
            .to_string(),
        )
        .unwrap();
    }
    fn claude(&self, model: &str, marker: &str) {
        let mut command = Command::new(env!("CARGO_BIN_EXE_with-router"));
        verification_client::environment(&mut command, self.client.path());
        command
            .current_dir(self.client.path())
            .env("LINK_ASSISTANT_ROUTER_TOKEN", self.token())
            .args([
                "--server",
                &self.origin(),
                "--model",
                model,
                "--non-interactive",
                "claude",
                "--verbose",
                "--output-format",
                "stream-json",
                "--max-turns",
                "1",
            ])
            .arg(format!("Reply with exactly {marker}"));
        let output = bounded_process::output(&mut command, Duration::from_secs(120))
            .expect("bounded real Claude request");
        assert!(
            output.status.success(),
            "real Claude request failed; protected output withheld"
        );
        let events: Vec<Value> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter_map(|line| serde_json::from_str(line).ok())
            .collect();
        assert!(
            events
                .iter()
                .any(|event| event["message"]["model"] == model),
            "exact provider response model absent"
        );
        assert!(
            events.iter().any(|event| event["type"] == "result"
                && event["is_error"] == false
                && event["result"]
                    .as_str()
                    .is_some_and(|text| text.contains(marker))),
            "successful real response absent"
        );
    }
    fn picker(&self, flagship: &str, flash: &str) {
        use link_assistant_router::login_pty::{Key, PtySession};
        let mut command = portable_pty::CommandBuilder::new(env!("CARGO_BIN_EXE_with-router"));
        verification_client::safety().expect("safe real picker boundary");
        command.env_clear();
        command.env("PATH", std::env::var_os("PATH").unwrap_or_default());
        command.env("HOME", self.client.path());
        command.env("XDG_CONFIG_HOME", self.client.path().join(".config"));
        command.env("XDG_CACHE_HOME", self.client.path().join(".cache"));
        command.env("LINK_ASSISTANT_ROUTER_TOKEN", self.token());
        command.env("HTTP_PROXY", "http://127.0.0.1:9");
        command.env("HTTPS_PROXY", "http://127.0.0.1:9");
        command.env("NO_PROXY", "127.0.0.1,localhost");
        command.env("TERM", "xterm-256color");
        command.cwd(self.client.path());
        command.args(["--server", &self.origin(), "--interactive", "claude"]);
        let session = PtySession::spawn(command).expect("bounded Claude picker");
        session
            .wait_for(
                |text| text.contains('❯'),
                Duration::from_millis(250),
                Duration::from_secs(30),
            )
            .expect("Claude ready");
        session.send_text("/model").unwrap();
        session.send_key(Key::Enter).unwrap();
        session
            .wait_for(
                |text| text.contains(flagship) && text.contains(flash),
                Duration::from_millis(250),
                Duration::from_secs(30),
            )
            .expect("live GLM picker rows");
    }
}
impl Drop for Stage {
    fn drop(&mut self) {
        // Production removal verifies the journal's exact namespace and UUID.
        // A failed control socket never triggers global prune or recovery.
        if self.root.path().join("staging.json").exists()
            && !self
                .try_deploy(&["--down", "--yes"], "")
                .is_ok_and(|output| output.status.success())
        {
            let root = std::mem::replace(
                &mut self.root,
                tempfile::tempdir().expect("retain failed cleanup"),
            );
            let retained = root.keep();
            eprintln!(
                "staging cleanup refused; retained owned journal at {}",
                retained.display()
            );
        }
    }
}

fn fingerprint_tree(root: &Path) -> std::collections::BTreeMap<std::path::PathBuf, Vec<u8>> {
    fn walk(
        root: &Path,
        path: &Path,
        result: &mut std::collections::BTreeMap<std::path::PathBuf, Vec<u8>>,
    ) {
        if !path.exists() {
            return;
        }
        for entry in std::fs::read_dir(path).unwrap() {
            let entry = entry.unwrap();
            let metadata = entry.file_type().unwrap();
            assert!(
                !metadata.is_symlink(),
                "fixture state must not contain symlinks"
            );
            if metadata.is_dir() {
                walk(root, &entry.path(), result);
            } else {
                result.insert(
                    entry.path().strip_prefix(root).unwrap().into(),
                    sha2::Sha256::digest(std::fs::read(entry.path()).unwrap()).to_vec(),
                );
            }
        }
    }
    use sha2::Digest as _;
    let mut result = std::collections::BTreeMap::new();
    walk(root, root, &mut result);
    result
}
fn request_logs(root: &Path) -> String {
    std::fs::read_dir(root.join("data/requests"))
        .unwrap()
        .filter_map(Result::ok)
        .filter_map(|entry| std::fs::read_to_string(entry.path().join("requests.lino")).ok())
        .collect::<Vec<_>>()
        .join("\n")
}
async fn catalog(http: &reqwest::Client, stage: &Stage) -> Value {
    let response = http
        .get(format!("{}/api/models", stage.origin()))
        .bearer_auth(stage.token())
        .header("x-link-assistant-client", "claude-code")
        .send()
        .await
        .unwrap();
    assert!(
        response.status().is_success(),
        "token-authorized catalog refused"
    );
    response.json().await.unwrap()
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn staging_live_stream_picker_logs_and_primary_state_are_independent() {
    let tier = common::tiers::Tier::LiveCredentialed;
    let name = common::tiers::current_test();
    if !common::tiers::opt_in(tier, "ROUTER_STAGING_LIVE_TESTS") {
        return;
    }
    if !common::tiers::opt_in(tier, "ROUTER_STAGING_DISPOSABLE_HOST") {
        return;
    }
    let Some(key) = common::tiers::live_credential(&name, "ROUTER_STAGING_ZAI_API_KEY") else {
        return;
    };
    let Some(image) = common::tiers::protected("ROUTER_DEPLOY_TEST_IMAGE") else {
        common::tiers::unavailable(tier, &name, "ROUTER_DEPLOY_TEST_IMAGE is not set");
        return;
    };
    if let Err(reason) = verification_client::safety() {
        common::tiers::unavailable(tier, &name, reason);
        return;
    }
    let mut docker = Command::new("docker");
    docker.args(["info", "--format", "{{.ServerVersion}}"]);
    if !bounded_process::output(&mut docker, Duration::from_secs(30))
        .is_ok_and(|out| out.status.success())
    {
        common::tiers::unavailable(tier, &name, "bounded Docker control probe unavailable");
        return;
    }
    let (versions, _) = verification_client::prepare(&["claude"]);
    assert_eq!(
        versions[0]["status"], "prepared",
        "real Claude preparation failed"
    );
    let primary = Stage::new(&image);
    let candidate = Stage::new(&image);
    assert!(
        primary.deploy(&[], &key).status.success(),
        "disposable primary provisioning failed"
    );
    primary.seed_client(&versions[0]["observed"]);
    candidate.seed_client(&versions[0]["observed"]);
    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .unwrap();
    let before_catalog = catalog(&http, &primary).await;
    let rows = before_catalog["data"].as_array().unwrap();
    let flagship = rows
        .iter()
        .find(|row| row["id"] == "glm-5.3" && row["owned_by"] == "z.ai")
        .expect("authorized flagship absent")["id"]
        .as_str()
        .unwrap();
    let flash = rows
        .iter()
        .find(|row| {
            row["owned_by"] == "z.ai"
                && row["id"]
                    .as_str()
                    .is_some_and(|id| id.to_ascii_lowercase().contains("flash"))
        })
        .expect("authorized Flash model absent")["id"]
        .as_str()
        .unwrap();
    primary.claude(flagship, "ROUTER_PRIMARY_CONTINUITY");
    let before_profile = fingerprint_tree(primary.client.path());
    let before_secret = std::fs::read(primary.root.path().join("token-secret")).unwrap();
    let before_token = primary.token();
    let (started_tx, started_rx) = tokio::sync::oneshot::channel();
    let stream_http = http.clone();
    let primary_origin = primary.origin();
    let stream_token = primary.token();
    let stream_model = flagship.to_string();
    let stream = tokio::spawn(async move {
        let started = Instant::now();
        let response = stream_http.post(format!("{primary_origin}/api/services/anthropic/v1/messages"))
            .bearer_auth(stream_token).header("anthropic-version", "2023-06-01")
            .header("x-link-assistant-client", "claude-code")
            .json(&json!({"model":stream_model,"max_tokens":8192,"stream":true,
                "messages":[{"role":"user","content":"Write a long numbered explanation of HTTP streaming, with at least 200 items."}]}))
            .send().await.unwrap();
        assert!(response.status().is_success(), "primary GLM stream refused");
        let mut bytes = response.bytes_stream();
        let mut saved = Vec::new();
        let mut signal = Some(started_tx);
        while let Some(chunk) = bytes.next().await {
            let chunk = chunk.expect("primary GLM stream interrupted");
            if let Some(signal) = signal.take() {
                let _ = signal.send(());
            }
            assert!(
                saved.len() + chunk.len() <= 3 * 1024 * 1024,
                "stream byte budget exceeded"
            );
            saved.extend_from_slice(&chunk);
        }
        let text = String::from_utf8_lossy(&saved);
        assert!(
            text.contains("message_stop"),
            "primary GLM stream did not complete"
        );
        assert!(
            text.contains(&stream_model),
            "primary exact response model absent"
        );
        started.elapsed()
    });
    tokio::time::timeout(Duration::from_secs(60), started_rx)
        .await
        .unwrap()
        .unwrap();
    assert!(
        !stream.is_finished(),
        "primary stream ended before staging began; continuity not proven"
    );
    assert!(
        candidate.deploy(&[], &key).status.success(),
        "candidate provisioning failed"
    );
    assert!(
        !stream.is_finished(),
        "primary stream did not span staging creation; continuity not proven"
    );
    let candidate_catalog = catalog(&http, &candidate).await;
    for model in [flagship, flash] {
        assert!(
            candidate_catalog["data"]
                .as_array()
                .unwrap()
                .iter()
                .any(|row| row["id"] == model)
        );
        candidate.claude(model, "ROUTER_CANDIDATE_ISOLATION");
    }
    candidate.picker(flagship, flash);
    let primary_log = request_logs(primary.root.path());
    let candidate_log = request_logs(candidate.root.path());
    assert!(!primary_log.contains("ROUTER_CANDIDATE_ISOLATION"));
    assert!(candidate_log.contains("ROUTER_CANDIDATE_ISOLATION"));
    assert!(!candidate_log.contains("ROUTER_PRIMARY_CONTINUITY"));
    assert!(
        candidate.deploy(&["--down", "--yes"], "").status.success(),
        "scoped candidate removal failed"
    );
    let duration = stream.await.expect("bounded primary stream task");
    assert!(
        before_token == primary.token(),
        "primary issued token changed"
    );
    assert!(
        before_secret == std::fs::read(primary.root.path().join("token-secret")).unwrap(),
        "primary signing secret changed"
    );
    assert!(
        before_profile == fingerprint_tree(primary.client.path()),
        "primary profile/session/global selection changed"
    );
    assert_eq!(
        before_catalog,
        catalog(&http, &primary).await,
        "primary provider authority changed"
    );
    assert!(
        primary.deploy(&["--status"], "").status.success(),
        "primary control/serving workflow failed"
    );
    assert!(
        primary.deploy(&["--down", "--yes"], "").status.success(),
        "scoped disposable primary removal failed"
    );
    println!(
        "staging continuity proven for disposable pair: stream_ms={} exact_models=2 picker=true logs_isolated=true primary_profile_tokens_catalog_unchanged=true",
        duration.as_millis()
    );
}
