//! Real CLI regressions for config/default precedence and home paths (#688).
#![cfg(unix)]

use std::process::{Command, Output};

fn deploy(home: &std::path::Path, arguments: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_router"))
        .arg("deploy")
        .args(arguments)
        .env("HOME", home)
        .env("DATA_DIR", home.join("data"))
        .env("TOKEN_SECRET", "config-parity-test-secret")
        .env_remove("ROUTER_PORT")
        .env("DOCKER_HOST", "unix:///nonexistent/router-config-test.sock")
        .output()
        .unwrap()
}

fn text(output: &Output) -> String {
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

#[test]
fn local_and_deploy_config_ports_reach_the_real_host_planner() {
    let home = tempfile::tempdir().unwrap();
    let config = home.path().join("deploy.toml");
    for section in ["local", "deploy"] {
        std::fs::write(
            &config,
            format!("[{section}]\nmode = \"host\"\nport = 18080\n"),
        )
        .unwrap();
        let output = deploy(
            home.path(),
            &["--config", config.to_str().unwrap(), "--status"],
        );
        let rendered = text(&output);
        assert!(rendered.contains("listener=127.0.0.1:18080"), "{rendered}");
        assert!(!rendered.contains("listener=127.0.0.1:8080"), "{rendered}");

        let explicit = deploy(
            home.path(),
            &[
                "--config",
                config.to_str().unwrap(),
                "--status",
                "--port",
                "28080",
            ],
        );
        assert!(
            text(&explicit).contains("listener=127.0.0.1:28080"),
            "{explicit:?}"
        );
        let default_override = deploy(
            home.path(),
            &[
                "--config",
                config.to_str().unwrap(),
                "--status",
                "--port",
                "8080",
            ],
        );
        assert!(text(&default_override).contains("listener=127.0.0.1:8080"));
        let environment_override = Command::new(env!("CARGO_BIN_EXE_router"))
            .args(["deploy", "--config", config.to_str().unwrap(), "--status"])
            .env("HOME", home.path())
            .env("DATA_DIR", home.path().join("data"))
            .env("ROUTER_PORT", "38080")
            .env("TOKEN_SECRET", "config-parity-test-secret")
            .output()
            .unwrap();
        assert!(
            text(&environment_override).contains("listener=127.0.0.1:38080"),
            "{environment_override:?}"
        );
    }
}

#[test]
fn config_home_root_is_expanded_before_resolving_relative_paths() {
    let home = tempfile::tempdir().unwrap();
    let config_dir = home.path().join("config");
    std::fs::create_dir(&config_dir).unwrap();
    let config = config_dir.join("deploy.toml");
    std::fs::write(
        &config,
        "[local]\nmode = \"host\"\nroot = \"~/Data/router-host\"\n",
    )
    .unwrap();
    let expected = format!(
        "deployment_root={}",
        home.path().join("Data/router-host").display()
    );
    let from_file = deploy(
        home.path(),
        &["--config", config.to_str().unwrap(), "--status"],
    );
    assert!(text(&from_file).contains(&expected), "{from_file:?}");
    let from_flag = deploy(
        home.path(),
        &["--mode", "host", "--root", "~/Data/router-host", "--status"],
    );
    assert!(text(&from_flag).contains(&expected), "{from_flag:?}");
}

#[test]
fn remote_home_roots_expand_on_the_target_without_creating_directories() {
    use std::os::unix::fs::PermissionsExt as _;
    let home = tempfile::tempdir().unwrap();
    // The remote agent requires GNU timeout on its Linux target. This
    // read-only, absent-deployment path never invokes it, so keep the test
    // independent of which host tools are installed (including on macOS).
    let timeout = home.path().join("timeout");
    std::fs::write(&timeout, "#!/bin/sh\nexit 99\n").unwrap();
    std::fs::set_permissions(&timeout, std::fs::Permissions::from_mode(0o700)).unwrap();
    let agent = home.path().join("agent.sh");
    let script = include_str!("../src/deploy/remote_agent.sh").replace(
        "@@DEPLOY_SETTINGS@@",
        include_str!("../src/deploy/remote_settings.sh"),
    );
    std::fs::write(&agent, script).unwrap();
    let root = home.path().join("target-home/Data/router");
    let output = Command::new("sh")
        .arg(&agent)
        .args([
            "status",
            "home-test",
            "1.16.0",
            "example/router:1.16.0",
            "release",
            "",
            "~/Data/router",
            "18080",
            "",
            "example.test",
        ])
        .env("HOME", home.path().join("target-home"))
        .env(
            "PATH",
            format!(
                "{}:{}",
                home.path().display(),
                std::env::var("PATH").unwrap()
            ),
        )
        .env_remove("ROUTER_DEPLOY_PAYLOAD")
        .output()
        .unwrap();
    assert!(
        text(&output).contains(&format!("target root: {}", root.display())),
        "{output:?}"
    );
    assert!(!root.exists());
}

#[test]
fn every_local_section_setting_matches_its_equivalent_flags() {
    use std::os::unix::fs::PermissionsExt as _;
    let home = tempfile::tempdir().unwrap();
    let docker = home.path().join("docker");
    std::fs::write(
        &docker,
        "#!/bin/sh\ncase \"$1\" in info) echo 28; exit 0;; ps) exit 0;; esac\nexit 1\n",
    )
    .unwrap();
    std::fs::set_permissions(&docker, std::fs::Permissions::from_mode(0o700)).unwrap();
    let cases = [
        ("port = 18080", vec!["--port", "18080"]),
        ("instance = \"blue\"", vec!["--instance", "blue"]),
        (
            "image = \"example/router:1.2.3\"",
            vec!["--image", "example/router:1.2.3"],
        ),
        (
            "build = \"/build/context\"",
            vec!["--build", "/build/context"],
        ),
        ("root = \"~/deployment\"", vec!["--root", "~/deployment"]),
        (
            "claude_credentials = \"isolated\"",
            vec!["--claude-credentials", "isolated"],
        ),
        ("public_port = 8443", vec!["--public-port", "8443"]),
    ];
    let config = home.path().join("deploy.toml");
    for section in ["deploy", "local"] {
        for mode in ["container", "host"] {
            for (setting, flags) in &cases {
                // Keep the entire deployment selection in the config; this
                // fixture image makes the comparison independent of registries.
                let image = if setting.starts_with("image") {
                    ""
                } else {
                    "image = \"example/router:1.2.3\"\n"
                };
                std::fs::write(
                    &config,
                    format!("[{section}]\nmode = \"{mode}\"\n{image}{setting}\n"),
                )
                .unwrap();
                let run = |arguments: &[&str]| {
                    Command::new(env!("CARGO_BIN_EXE_router"))
                        .arg("deploy")
                        .args(arguments)
                        .arg("--status")
                        .env("HOME", home.path())
                        .env("DATA_DIR", home.path().join("data"))
                        .env(
                            "PATH",
                            format!(
                                "{}:{}",
                                home.path().display(),
                                std::env::var("PATH").unwrap()
                            ),
                        )
                        .env("TOKEN_SECRET", "config-parity-test-secret")
                        .env_remove("ROUTER_PORT")
                        .env("RUST_LOG", "error")
                        .output()
                        .unwrap()
                };
                let configured = ["--config", config.to_str().unwrap()];
                let mut equivalent = vec!["--mode", mode];
                if !setting.starts_with("image") {
                    equivalent.extend(["--image", "example/router:1.2.3"]);
                }
                equivalent.extend(flags);
                let file = run(&configured);
                let flag = run(&equivalent);
                assert_eq!(
                    file.status.code(),
                    flag.status.code(),
                    "{section} {mode} {setting}"
                );
                assert_eq!(text(&file), text(&flag), "{section} {mode} {setting}");
            }
        }
    }
}
