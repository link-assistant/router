//! `router deploy --server … --seed-credential <provider>` (issue #681).
//!
//! A stand-in `ssh` runs the real target half — the settings parser and the
//! seed step, cut from the embedded agent — against a temporary "remote"
//! home, so the payload, the receipt and the coordinator's settling of its
//! local mark are all exercised end to end without a server.
#![cfg(unix)]

use std::os::unix::fs::PermissionsExt as _;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

use serde_json::Value;

const SECRET: &str = "deploy-seed-test-signing-secret";
const CLAUDE_REFRESH: &str = "sk-ant-ort01-claude-refresh-never-in-argv";
const CODEX_REFRESH: &str = "codex-refresh-never-in-argv";
const SERVER: &str = "deploy@seed.example";

const SETTINGS: &str = include_str!("../src/deploy/remote_settings.sh");
const AGENT: &str = include_str!("../src/deploy/remote_agent.sh");

/// The agent's seed step, exactly as shipped.
fn seed_step() -> &'static str {
    let start = AGENT
        .find("seed_credentials_step() {")
        .expect("the agent has a seed step");
    let call = "seed_credentials_step || exit 1\n";
    let end = AGENT[start..].find(call).expect("the agent calls it") + start + call.len();
    &AGENT[start..end]
}

struct Harness {
    directory: tempfile::TempDir,
}

impl Harness {
    /// A local home with Claude and Codex logins, and an `ssh` that runs the
    /// target half with `$REMOTE` as the target's home. `deliver=0` makes the
    /// session drop its output and fail after the target acted: a lost
    /// response.
    fn new() -> Self {
        let directory = tempfile::tempdir().unwrap();
        let root = directory.path();
        for path in ["home/.claude", "home/.codex", "remote", "bin"] {
            std::fs::create_dir_all(root.join(path)).unwrap();
        }
        std::fs::write(
            root.join("home/.claude/.credentials.json"),
            format!(
                r#"{{"claudeAiOauth":{{"accessToken":"sk-ant-oat01-access","refreshToken":"{CLAUDE_REFRESH}","expiresAt":4102444800000,"scopes":["user:inference"]}}}}"#
            ),
        )
        .unwrap();
        std::fs::write(
            root.join("home/.codex/auth.json"),
            format!(
                r#"{{"auth_mode":"chatgpt","tokens":{{"id_token":"synthetic-id","access_token":"codex-access","refresh_token":"{CODEX_REFRESH}"}}}}"#
            ),
        )
        .unwrap();
        std::fs::write(
            root.join("target.sh"),
            format!(
                "set -eu\numask 077\n{SETTINGS}\nSTATE=$REMOTE/state\n\
                 claude_home=$REMOTE/.claude\ncodex_home=$REMOTE/.codex\n{}\n",
                seed_step()
            ),
        )
        .unwrap();
        let ssh = root.join("bin/ssh");
        std::fs::write(
            &ssh,
            "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$0.arguments\"\ncat > \"$0.input\"\n\
             ROUTER_DEPLOY_PAYLOAD=$(sed -n 2p \"$0.input\")\nexport ROUTER_DEPLOY_PAYLOAD\n\
             if [ \"$DELIVER\" = 0 ]; then\n\
               sh \"$HARNESS/target.sh\" >/dev/null 2>&1; exit 255\nfi\n\
             exec sh \"$HARNESS/target.sh\"\n",
        )
        .unwrap();
        std::fs::set_permissions(&ssh, std::fs::Permissions::from_mode(0o700)).unwrap();
        Self { directory }
    }

    fn path(&self, name: &str) -> PathBuf {
        self.directory.path().join(name)
    }

    fn deploy(&self, args: &[&str], deliver: bool) -> Output {
        let path = format!(
            "{}:{}",
            self.path("bin").display(),
            std::env::var("PATH").unwrap_or_default()
        );
        Command::new(env!("CARGO_BIN_EXE_router"))
            .arg("deploy")
            .args(args)
            .current_dir(self.directory.path())
            .env("PATH", path)
            .env("HOME", self.path("home"))
            .env("TOKEN_SECRET", SECRET)
            .env("HARNESS", self.directory.path())
            .env("REMOTE", self.path("remote"))
            .env("DELIVER", if deliver { "1" } else { "0" })
            .env_remove("CLAUDE_CODE_HOME")
            .env_remove("CODEX_HOME")
            .output()
            .expect("router runs")
    }

    fn read(&self, name: &str) -> String {
        std::fs::read_to_string(self.path(name)).unwrap_or_default()
    }

    fn json(&self, name: &str) -> Value {
        serde_json::from_str(&self.read(name)).unwrap()
    }
}

fn text(output: &Output) -> String {
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

fn report(output: &Output) -> Value {
    link_assistant_router::contracts::validation::cli_payload(&output.stdout)
        .unwrap_or_else(|_| panic!("{}", text(output)))
}

fn mode(path: &Path) -> u32 {
    std::fs::metadata(path).unwrap().permissions().mode() & 0o777
}

fn handover_state(document: &Value) -> &str {
    document
        .pointer("/_link_assistant_router/handed_over/state")
        .and_then(Value::as_str)
        .unwrap_or("none")
}

#[test]
fn claude_and_codex_are_seeded_over_stdin_once_and_the_sources_are_handed_over() {
    let harness = Harness::new();
    let seed = [
        "--server",
        SERVER,
        "--seed-credential",
        "anthropic",
        "--seed-credential",
        "codex",
        "--json",
    ];
    let first = harness.deploy(&seed, true);
    assert!(first.status.success(), "{}", text(&first));

    // Never in argv; the payload carries the documents base64-encoded twice.
    let arguments = harness.read("bin/ssh.arguments");
    let input = harness.read("bin/ssh.input");
    for secret in [CLAUDE_REFRESH, CODEX_REFRESH, SECRET] {
        assert!(!arguments.contains(secret), "{secret} in argv");
    }
    assert!(!input.contains(CLAUDE_REFRESH) && !input.contains(CODEX_REFRESH));

    let document = report(&first);
    let seeded = document["seed_credentials"].as_array().unwrap();
    assert_eq!(seeded.len(), 2, "{document}");
    for (entry, provider) in seeded.iter().zip(["claude", "codex"]) {
        assert_eq!(entry["provider"], provider);
        assert_eq!(entry["action"], "imported", "{entry}");
        assert_eq!(entry["local_source"], "handed-over", "{entry}");
        assert!(
            entry["fingerprint"]
                .as_str()
                .unwrap()
                .starts_with("hmac-sha256:")
        );
    }
    assert!(!document.to_string().contains(CLAUDE_REFRESH));

    // The target holds the vendor documents, private, without local metadata.
    let remote_claude = harness.json("remote/.claude/.credentials.json");
    assert_eq!(
        remote_claude["claudeAiOauth"]["refreshToken"],
        CLAUDE_REFRESH
    );
    assert!(remote_claude.get("_link_assistant_router").is_none());
    assert_eq!(
        harness.json("remote/.codex/auth.json")["tokens"]["refresh_token"],
        CODEX_REFRESH
    );
    assert_eq!(
        mode(&harness.path("remote/.claude/.credentials.json")),
        0o600
    );
    assert_eq!(mode(&harness.path("remote/.codex")), 0o700);
    assert_eq!(
        harness.read("remote/state/seed-receipts/claude").trim(),
        seeded[0]["fingerprint"]
    );

    // The local sources are marked: this machine no longer refreshes them.
    for local in ["home/.claude/.credentials.json", "home/.codex/auth.json"] {
        let marked = harness.json(local);
        assert_eq!(handover_state(&marked), "handed-over", "{local}");
        assert_eq!(
            marked["_link_assistant_router"]["refresh_owner"],
            "external"
        );
        assert_eq!(
            marked["_link_assistant_router"]["handed_over"]["server"],
            SERVER
        );
    }

    // A re-run is a no-op success: the receipt answers, nothing is rewritten.
    let installed = harness.read("remote/.claude/.credentials.json");
    let again = harness.deploy(&seed, true);
    assert!(again.status.success(), "{}", text(&again));
    for entry in report(&again)["seed_credentials"].as_array().unwrap() {
        assert_eq!(entry["action"], "already-seeded", "{entry}");
        assert_eq!(entry["local_source"], "handed-over");
    }
    assert_eq!(harness.read("remote/.claude/.credentials.json"), installed);

    // Seeding the same chain to a second server would fork it.
    let fork = harness.deploy(
        &[
            "--server",
            "deploy@other.example",
            "--seed-credential",
            "claude",
        ],
        true,
    );
    assert_eq!(fork.status.code(), Some(2), "{}", text(&fork));
    assert!(
        text(&fork).contains("fork its refresh chain"),
        "{}",
        text(&fork)
    );
}

#[test]
fn a_lost_response_stays_pending_and_a_rerun_settles_it_from_the_receipt() {
    let harness = Harness::new();
    let seed = ["--server", SERVER, "--seed-credential", "claude"];
    let lost = harness.deploy(&seed, false);
    assert!(!lost.status.success(), "{}", text(&lost));
    assert!(
        text(&lost).contains("local source pending"),
        "{}",
        text(&lost)
    );
    // The target did install it; locally the source is marked, not lost.
    assert!(harness.path("remote/state/seed-receipts/claude").exists());
    let local = harness.json("home/.claude/.credentials.json");
    assert_eq!(handover_state(&local), "pending");
    assert_eq!(local["_link_assistant_router"]["refresh_owner"], "external");

    let recovered = harness.deploy(&seed, true);
    assert!(recovered.status.success(), "{}", text(&recovered));
    assert!(
        text(&recovered)
            .contains("seed credential claude: target already-seeded; local source handed-over"),
        "{}",
        text(&recovered)
    );
    assert_eq!(
        handover_state(&harness.json("home/.claude/.credentials.json")),
        "handed-over"
    );
}

#[test]
fn a_target_with_its_own_login_keeps_it_and_the_source_is_restored_byte_for_byte() {
    let harness = Harness::new();
    std::fs::create_dir_all(harness.path("remote/.claude")).unwrap();
    std::fs::write(
        harness.path("remote/.claude/.credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"target-own","refreshToken":"target-own-refresh"}}"#,
    )
    .unwrap();
    let original = harness.read("home/.claude/.credentials.json");
    // From the config file this time.
    std::fs::write(
        harness.path("deploy.toml"),
        "[deploy]\nseed_credentials = [\"claude\"]\n",
    )
    .unwrap();
    let output = harness.deploy(
        &["--server", SERVER, "--config", "deploy.toml", "--json"],
        true,
    );
    assert!(output.status.success(), "{}", text(&output));
    let entry = &report(&output)["seed_credentials"][0];
    assert_eq!(entry["action"], "kept-existing", "{entry}");
    assert_eq!(entry["local_source"], "restored");
    assert_eq!(harness.read("home/.claude/.credentials.json"), original);
    assert!(
        harness
            .read("remote/.claude/.credentials.json")
            .contains("target-own-refresh")
    );
    assert!(!harness.path("remote/state/seed-receipts/claude").exists());
}

#[test]
fn seeding_is_refused_locally_for_a_local_target_an_unknown_provider_or_no_login() {
    let harness = Harness::new();
    let local = harness.deploy(&["--seed-credential", "claude"], true);
    assert_eq!(local.status.code(), Some(2), "{}", text(&local));
    assert!(
        text(&local).contains("--seed-credential"),
        "{}",
        text(&local)
    );

    let unknown = harness.deploy(&["--server", SERVER, "--seed-credential", "gemini"], true);
    assert_eq!(unknown.status.code(), Some(2), "{}", text(&unknown));

    std::fs::remove_file(harness.path("home/.codex/auth.json")).unwrap();
    let missing = harness.deploy(&["--server", SERVER, "--seed-credential", "codex"], true);
    assert_eq!(missing.status.code(), Some(2), "{}", text(&missing));
    assert!(
        !harness.path("bin/ssh.arguments").exists(),
        "nothing reached ssh: {}",
        text(&missing)
    );
}
