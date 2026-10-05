//! `router deploy --config`, runtime env passthrough, SSH settings, provider
//! keys and the `--json` document, driven through a stand-in `ssh` so no
//! target is needed (issues #679, #680, #683).
#![cfg(unix)]

use std::os::unix::fs::PermissionsExt as _;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::time::{Duration, Instant};

use base64::Engine as _;

const SECRET: &str = "deploy-config-test-signing-secret";
const PROVIDER_KEY: &str = "sk-provider-value-never-in-argv";
const ENV_VALUE: &str = "runtime-value-never-in-argv";

struct Fake {
    directory: tempfile::TempDir,
}

impl Fake {
    /// A `ssh` on PATH that records its argv and stdin, then runs `body`.
    fn new(body: &str) -> Self {
        let directory = tempfile::tempdir().unwrap();
        let ssh = directory.path().join("ssh");
        std::fs::write(
            &ssh,
            format!(
                "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$0.arguments\"\ncat > \"$0.input\"\n{body}\n"
            ),
        )
        .unwrap();
        std::fs::set_permissions(&ssh, std::fs::Permissions::from_mode(0o700)).unwrap();
        Self { directory }
    }

    fn path(&self) -> &Path {
        self.directory.path()
    }

    fn arguments(&self) -> String {
        std::fs::read_to_string(self.path().join("ssh.arguments")).unwrap()
    }

    fn input(&self) -> Vec<u8> {
        std::fs::read(self.path().join("ssh.input")).unwrap()
    }

    /// The decoded payload line, when the input has one before the agent.
    fn payload(&self) -> Option<String> {
        let input = self.input();
        let text = String::from_utf8_lossy(&input);
        let mut lines = text.lines();
        lines.next()?;
        let second = lines.next()?;
        if second.starts_with("#!") {
            return None;
        }
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(second)
            .expect("payload line is base64");
        Some(String::from_utf8(decoded).unwrap())
    }

    fn deploy(&self, args: &[&str]) -> Output {
        let path = format!(
            "{}:{}",
            self.path().display(),
            std::env::var("PATH").unwrap_or_default()
        );
        Command::new(env!("CARGO_BIN_EXE_router"))
            .arg("deploy")
            .args(args)
            .current_dir(self.path())
            .env("PATH", path)
            .env("TOKEN_SECRET", SECRET)
            .env("HOME", self.path())
            .env("DEPLOY_TEST_PROVIDER_KEY", PROVIDER_KEY)
            .env("DEPLOY_TEST_RUNTIME", ENV_VALUE)
            .output()
            .expect("router runs")
    }

    fn write(&self, name: &str, text: &str) -> PathBuf {
        let path = self.path().join(name);
        std::fs::write(&path, text).unwrap();
        path
    }
}

fn stderr(output: &Output) -> String {
    String::from_utf8_lossy(&output.stderr).into_owned()
}

#[test]
fn without_settings_the_session_is_unchanged() {
    let fake = Fake::new("exit 0");
    let output = fake.deploy(&["--server", "deploy@example.test"]);
    assert!(output.status.success(), "{}", stderr(&output));

    let arguments = fake.arguments();
    for absent in ["UserKnownHostsFile", "ServerAliveInterval", "-p\n", "-i\n"] {
        assert!(!arguments.contains(absent), "{absent} in {arguments}");
    }
    assert!(!arguments.contains("ROUTER_DEPLOY_PAYLOAD"), "{arguments}");
    assert_eq!(fake.payload(), None, "no payload line without settings");
}

#[test]
fn one_config_file_drives_a_remote_deploy_without_values_in_argv() {
    let fake = Fake::new("exit 0");
    let config = fake.write(
        "router-deploy.toml",
        r#"
[deploy]
instance = "blue"

[remote]
server = "deploy@example.test"

[env]
DEPLOY_TEST_RUNTIME = "env"

[ssh]
port = 2222
known_hosts = ["example.test ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExampleOnly"]
keepalive_secs = 15
deadline_secs = 600

[tokens]
ttl_hours = 72
allowed_models = ["glm-4.6"]

[provider_keys.zai]
source = "env:DEPLOY_TEST_PROVIDER_KEY"
mode = "replace"
kind = "anthropic-compatible"
base_url = "https://api.z.ai/api/anthropic"
models = ["glm-4.6"]

[verification]
clients = ["claude"]
providers = ["zai"]
require_client_launch = true
"#,
    );
    let output = fake.deploy(&["--remote", "--config", config.to_str().unwrap()]);
    assert!(output.status.success(), "{}", stderr(&output));

    let arguments = fake.arguments();
    for expected in [
        "deploy@example.test",
        "-p\n2222",
        "GlobalKnownHostsFile=/dev/null",
        "ServerAliveInterval=15",
        "ROUTER_DEPLOY_PAYLOAD",
    ] {
        assert!(
            arguments.contains(expected),
            "{expected} not in {arguments}"
        );
    }
    let input = fake.input();
    let everything = format!("{arguments}{}", String::from_utf8_lossy(&input));
    for secret in [SECRET, PROVIDER_KEY, ENV_VALUE] {
        assert!(
            !everything.contains(secret),
            "a value travelled in plain text"
        );
    }

    let payload = fake.payload().expect("settings travel as a payload line");
    assert!(payload.contains("instance blue"), "{payload}");
    assert!(
        payload
            .lines()
            .any(|line| line.starts_with("env DEPLOY_TEST_RUNTIME "))
    );
    assert!(
        payload
            .lines()
            .any(|line| line.starts_with("key zai replace "))
    );
    assert!(
        payload
            .lines()
            .any(|line| line.starts_with("template zai "))
    );
    assert!(payload.lines().any(|line| line.starts_with("profile ")));
    assert!(payload.contains("tokens 1"), "{payload}");
    assert!(
        payload
            .contains(&base64::engine::general_purpose::STANDARD.encode(PROVIDER_KEY.as_bytes())),
        "the key is encoded inside the stdin payload"
    );
}

#[test]
fn command_line_flags_override_the_config_file() {
    let fake = Fake::new("exit 0");
    let config = fake.write(
        "router-deploy.toml",
        "[remote]\nserver = \"deploy@from-file.test\"\n[ssh]\nport = 2222\n",
    );
    let output = fake.deploy(&[
        "--config",
        config.to_str().unwrap(),
        "--server",
        "deploy@from-flag.test",
        "--ssh-port",
        "2200",
    ]);
    assert!(output.status.success(), "{}", stderr(&output));
    let arguments = fake.arguments();
    assert!(arguments.contains("deploy@from-flag.test"), "{arguments}");
    assert!(!arguments.contains("from-file"), "{arguments}");
    assert!(arguments.contains("-p\n2200"), "{arguments}");
}

#[test]
fn the_json_document_reports_fingerprints_steps_and_validation_but_no_values() {
    let fake = Fake::new(
        r#"printf '%s\n' 'ROUTER_DEPLOY_EVENT {"event":"step","name":"build","at_ms":1000}' >&2
printf '%s\n' 'ROUTER_DEPLOY_EVENT {"event":"subprocess","program":"docker","command":"build","started_ms":1000,"duration_ms":400,"exit_code":0}' >&2
printf '%s\n' 'ROUTER_DEPLOY_EVENT {"event":"provider_key","name":"zai","action":"replaced","validation":{"result":"positive","status":200}}' >&2
printf '%s\n' 'ROUTER_DEPLOY_EVENT {"event":"verification","result":{"status":"passed","failures":[]}}' >&2
printf '%s\n' 'ROUTER_DEPLOY_EVENT {"event":"step","name":"complete","at_ms":1500}' >&2
echo 'deployment is ready'
exit 0"#,
    );
    let output = fake.deploy(&[
        "--server",
        "deploy@example.test",
        "--json",
        "--env",
        "DEPLOY_TEST_RUNTIME",
        "--provider-key",
        "zai=env:DEPLOY_TEST_PROVIDER_KEY",
        "--provider-key-mode",
        "replace",
    ]);
    assert!(output.status.success(), "{}", stderr(&output));
    let stdout = String::from_utf8_lossy(&output.stdout);
    for secret in [SECRET, PROVIDER_KEY, ENV_VALUE] {
        assert!(!stdout.contains(secret), "a value reached the document");
    }
    let document: serde_json::Value = serde_json::from_str(&stdout).expect("one JSON document");
    assert_eq!(document["schema"], "link-assistant-router/deploy/v1");
    assert_eq!(document["status"], "succeeded");
    assert_eq!(document["env"]["names"][0], "DEPLOY_TEST_RUNTIME");
    let fingerprint = document["env"]["fingerprint"].as_str().unwrap();
    assert!(fingerprint.starts_with("hmac-sha256:"), "{fingerprint}");
    let key = &document["provider_keys"][0];
    assert_eq!(key["name"], "zai");
    assert_eq!(key["mode"], "replace");
    assert_eq!(key["action"], "replaced");
    assert_eq!(key["validation"]["result"], "positive");
    assert!(
        key["fingerprint"]
            .as_str()
            .unwrap()
            .starts_with("hmac-sha256:")
    );
    assert_eq!(document["verification"]["status"], "passed");
    assert_eq!(document["steps"][0]["name"], "build");
    assert_eq!(document["steps"][0]["duration_ms"], 500);
    assert_eq!(document["subprocesses"][0]["program"], "ssh");
    assert_eq!(document["subprocesses"][1]["command"], "build");
    assert_eq!(document["output"][0], "deployment is ready");
}

#[test]
fn an_overall_deadline_stops_the_session_with_exit_twelve() {
    let fake = Fake::new("exec sleep 30");
    let started = Instant::now();
    let output = fake.deploy(&["--server", "deploy@example.test", "--deadline", "1"]);
    assert_eq!(output.status.code(), Some(12), "{}", stderr(&output));
    assert!(started.elapsed() < Duration::from_secs(20));
    assert!(stderr(&output).contains("deadline"), "{}", stderr(&output));
}

#[test]
fn configuration_errors_exit_two_without_echoing_values() {
    let fake = Fake::new("exit 0");
    let literal = fake.write(
        "literal.toml",
        "[remote]\nserver = \"deploy@example.test\"\n[env]\nAPI = \"sk-literal-value\"\n",
    );
    let output = fake.deploy(&["--remote", "--config", literal.to_str().unwrap()]);
    assert_eq!(output.status.code(), Some(2));
    assert!(!stderr(&output).contains("sk-literal-value"));

    let missing = fake.deploy(&[
        "--server",
        "deploy@example.test",
        "--provider-key",
        "zai=env:DEPLOY_TEST_UNSET_VARIABLE",
    ]);
    assert_eq!(missing.status.code(), Some(2), "{}", stderr(&missing));
    assert!(!fake.path().join("ssh.arguments").exists(), "ssh never ran");
}

#[test]
fn remote_only_settings_are_refused_for_a_local_deploy() {
    let fake = Fake::new("exit 0");
    for args in [
        &["--provider-key", "zai=env:DEPLOY_TEST_PROVIDER_KEY"][..],
        &["--ssh-port", "2222"][..],
        &["--public-port", "8443"][..],
        &["--json"][..],
    ] {
        let output = fake.deploy(args);
        assert_eq!(
            output.status.code(),
            Some(2),
            "{args:?}: {}",
            stderr(&output)
        );
    }
}
