//! Auditable Docker command boundary for the local rolling coordinator.

use std::path::Path;
use std::process::Command;

use super::{LABEL_KEY, NETWORK, RELAY, SPEC_VERSION};

pub(super) struct CommandOutput {
    pub success: bool,
    pub stdout: Vec<u8>,
    pub stderr: Vec<u8>,
}

pub(super) trait CommandRunner: Send + Sync {
    fn run(
        &self,
        arguments: &[String],
        environment: &[(&str, &str)],
    ) -> Result<CommandOutput, String>;
}

struct ProcessRunner;

impl CommandRunner for ProcessRunner {
    fn run(
        &self,
        arguments: &[String],
        environment: &[(&str, &str)],
    ) -> Result<CommandOutput, String> {
        let mut command = Command::new("docker");
        command.args(arguments).envs(environment.iter().copied());
        let output = command.output().map_err(|error| match error.kind() {
            std::io::ErrorKind::NotFound => "Docker is not installed".to_string(),
            _ => error.to_string(),
        })?;
        Ok(CommandOutput {
            success: output.status.success(),
            stdout: output.stdout,
            stderr: output.stderr,
        })
    }
}

pub(super) struct Docker {
    runner: Box<dyn CommandRunner>,
}

impl Default for Docker {
    fn default() -> Self {
        Self {
            runner: Box::new(ProcessRunner),
        }
    }
}

#[cfg(test)]
impl Docker {
    pub(super) fn with_runner(runner: impl CommandRunner + 'static) -> Self {
        Self {
            runner: Box::new(runner),
        }
    }
}

fn compact(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes)
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

impl Docker {
    fn command(
        &self,
        arguments: &[String],
        environment: &[(&str, &str)],
    ) -> Result<CommandOutput, String> {
        self.runner.run(arguments, environment)
    }

    pub(super) fn output(&self, arguments: &[String]) -> Result<String, String> {
        let output = self.command(arguments, &[])?;
        if output.success {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            Err(compact(&output.stderr))
        }
    }

    pub(super) fn available(&self) -> Result<String, String> {
        self.output(&[
            "info".into(),
            "--format".into(),
            "{{.ServerVersion}}".into(),
        ])
    }

    pub(super) fn exists(&self, name: &str) -> bool {
        self.output(&["inspect".into(), name.into()]).is_ok()
    }

    pub(super) fn running(&self, name: &str) -> Result<bool, String> {
        self.output(&[
            "inspect".into(),
            "--format".into(),
            "{{.State.Running}}".into(),
            name.into(),
        ])
        .map(|answer| answer == "true")
    }

    pub(super) fn label(&self, name: &str, key: &str) -> Option<String> {
        self.output(&[
            "inspect".into(),
            "--format".into(),
            format!("{{{{index .Config.Labels {key:?}}}}}"),
            name.into(),
        ])
        .ok()
        .filter(|value| !value.is_empty() && value != "<no value>")
    }

    pub(super) fn image_ref(&self, name: &str) -> Result<String, String> {
        self.output(&[
            "inspect".into(),
            "--format".into(),
            "{{.Config.Image}}".into(),
            name.into(),
        ])
    }

    fn mount_source(&self, name: &str, destination: &str) -> Option<String> {
        self.output(&[
            "inspect".into(),
            "--format".into(),
            format!(
                "{{{{range .Mounts}}}}{{{{if eq .Destination {destination:?}}}}}{{{{.Source}}}}{{{{end}}}}{{{{end}}}}"
            ),
            name.into(),
        ])
        .ok()
        .filter(|source| !source.is_empty())
    }

    pub(super) fn container_image_id(&self, name: &str) -> Result<String, String> {
        self.output(&[
            "inspect".into(),
            "--format".into(),
            "{{.Image}}".into(),
            name.into(),
        ])
    }

    pub(super) fn image_id(&self, image: &str) -> Result<String, String> {
        self.output(&[
            "image".into(),
            "inspect".into(),
            "--format".into(),
            "{{.Id}}".into(),
            image.into(),
        ])
    }

    pub(super) fn ensure_image(&self, image: &str, build: Option<&str>) -> Result<String, String> {
        if let Some(context) = build {
            self.output(&["build".into(), "-t".into(), image.into(), context.into()])?;
        } else if self.image_id(image).is_err() {
            self.output(&["pull".into(), image.into()])?;
        }
        self.image_id(image)
    }

    pub(super) fn start(&self, name: &str) -> Result<(), String> {
        self.output(&["start".into(), name.into()]).map(|_| ())
    }

    pub(super) fn stop(&self, name: &str) -> Result<(), String> {
        self.output(&["stop".into(), name.into()]).map(|_| ())
    }

    pub(super) fn remove(&self, name: &str) -> Result<(), String> {
        if self.exists(name) {
            self.output(&["rm".into(), "-f".into(), name.into()])?;
        }
        Ok(())
    }

    pub(super) fn exec(&self, name: &str, arguments: &[&str]) -> Result<String, String> {
        let mut command = vec!["exec".to_string(), name.to_string()];
        command.extend(arguments.iter().map(|value| (*value).to_string()));
        self.output(&command)
    }

    pub(super) fn token_inventory(&self, name: &str) -> Result<String, String> {
        self.exec(name, &["router", "tokens", "list", "--json"])
    }

    pub(super) fn relay_connection_count(&self, backend: &str) -> Result<String, String> {
        if !self.exists(RELAY) || !self.running(RELAY)? {
            // Restarting or stopping the relay necessarily closes all of the
            // TCP connections it owned, even if its last durable count was
            // nonzero.
            return Ok("0".to_string());
        }
        let path = format!("/deploy-state/connections/{backend}");
        self.exec(
            RELAY,
            &[
                "sh",
                "-c",
                "if [ -e \"$1\" ]; then cat \"$1\"; else printf 0; fi",
                "relay-count",
                &path,
            ],
        )
    }

    pub(super) fn listeners_on(&self, port: u16) -> Result<Vec<String>, String> {
        let answer = self.output(&[
            "ps".into(),
            "--filter".into(),
            format!("publish={port}"),
            "--format".into(),
            "{{.Names}}".into(),
        ])?;
        Ok(answer
            .lines()
            .map(str::trim)
            .filter(|name| !name.is_empty())
            .map(str::to_string)
            .collect())
    }

    pub(super) fn health(&self, from: &str, origin: &str) -> bool {
        let script = format!(
            "const r=await fetch({origin:?}+'/api/health');process.exit(r.status===200?0:1)"
        );
        self.exec(from, &["bun", "-e", &script]).is_ok()
    }

    pub(super) fn create_network(&self, root: &Path) -> Result<(), String> {
        if self
            .output(&["network".into(), "inspect".into(), NETWORK.into()])
            .is_ok()
        {
            if self.network_owned(root) {
                return Ok(());
            }
            return Err(format!("refusing unowned Docker network {NETWORK}"));
        }
        self.output(&[
            "network".into(),
            "create".into(),
            "--label".into(),
            format!("{LABEL_KEY}=1"),
            "--label".into(),
            format!("{LABEL_KEY}.root={}", root.display()),
            "--label".into(),
            format!("{LABEL_KEY}.spec={SPEC_VERSION}"),
            NETWORK.into(),
        ])?;
        Ok(())
    }

    pub(super) fn remove_network(&self, root: &Path) -> Result<(), String> {
        if self.network_owned(root) {
            self.output(&["network".into(), "rm".into(), NETWORK.into()])?;
        }
        Ok(())
    }

    fn network_owned(&self, root: &Path) -> bool {
        let inspect_label = |key: &str| {
            self.output(&[
                "network".into(),
                "inspect".into(),
                "--format".into(),
                format!("{{{{index .Labels {key:?}}}}}"),
                NETWORK.into(),
            ])
            .ok()
        };
        inspect_label(LABEL_KEY).as_deref() == Some("1")
            && inspect_label(&format!("{LABEL_KEY}.root")).as_deref()
                == Some(root.display().to_string().as_str())
            && inspect_label(&format!("{LABEL_KEY}.spec")).as_deref() == Some(SPEC_VERSION)
    }

    pub(super) fn run_backend(
        &self,
        name: &str,
        image: &str,
        root: &Path,
        token_secret: &str,
    ) -> Result<(), String> {
        let arguments = backend_arguments(name, image, root);
        let output = self.command(&arguments, &[("TOKEN_SECRET", token_secret)])?;
        if output.success {
            Ok(())
        } else {
            Err(compact(&output.stderr))
        }
    }

    pub(super) fn run_relay(&self, image: &str, root: &Path, port: u16) -> Result<(), String> {
        self.output(&[
            "run".into(),
            "-d".into(),
            "--name".into(),
            RELAY.into(),
            "--network".into(),
            NETWORK.into(),
            "--restart".into(),
            "unless-stopped".into(),
            "--label".into(),
            format!("{LABEL_KEY}=1"),
            "--label".into(),
            format!("{LABEL_KEY}.root={}", root.display()),
            "--label".into(),
            format!("{LABEL_KEY}.role=relay"),
            "--label".into(),
            format!("{LABEL_KEY}.port={port}"),
            "--label".into(),
            format!("{LABEL_KEY}.spec={SPEC_VERSION}"),
            "-p".into(),
            format!("127.0.0.1:{port}:8080"),
            "-v".into(),
            format!("{}:/deploy-state", root.join("state").display()),
            "-e".into(),
            "ROUTER_DEPLOY_RELAY_STATE=/deploy-state/current".into(),
            "-e".into(),
            "ROUTER_DEPLOY_RELAY_LISTENERS=0.0.0.0:8080,8080".into(),
            image.into(),
            "serve".into(),
        ])?;
        Ok(())
    }

    pub(super) fn owned(&self, name: &str, root: &Path, role: &str) -> bool {
        self.label(name, LABEL_KEY).as_deref() == Some("1")
            && self.label(name, &format!("{LABEL_KEY}.root")).as_deref()
                == Some(root.display().to_string().as_str())
            && self.label(name, &format!("{LABEL_KEY}.role")).as_deref() == Some(role)
    }

    pub(super) fn legacy_owned(&self, name: &str, root: &Path) -> bool {
        let credential_home = root.join("credentials").display().to_string();
        let data_home = root.join("data").display().to_string();
        self.label(name, LABEL_KEY).as_deref() == Some("1")
            && self.label(name, &format!("{LABEL_KEY}.role")).is_none()
            && self.mount_source(name, "/data/claude").as_deref() == Some(credential_home.as_str())
            && self.mount_source(name, "/data/router").as_deref() == Some(data_home.as_str())
    }

    pub(super) fn owned_containers(&self, root: &Path) -> Result<Vec<String>, String> {
        let answer = self.output(&[
            "ps".into(),
            "-a".into(),
            "--filter".into(),
            format!("label={LABEL_KEY}=1"),
            "--filter".into(),
            format!("label={LABEL_KEY}.root={}", root.display()),
            "--format".into(),
            "{{.Names}}".into(),
        ])?;
        Ok(answer
            .lines()
            .map(str::trim)
            .filter(|name| !name.is_empty())
            .map(str::to_string)
            .collect())
    }
}

fn backend_arguments(name: &str, image: &str, root: &Path) -> Vec<String> {
    vec![
        "run".into(),
        "-d".into(),
        "--name".into(),
        name.into(),
        "--network".into(),
        NETWORK.into(),
        "--restart".into(),
        "unless-stopped".into(),
        "--label".into(),
        format!("{LABEL_KEY}=1"),
        "--label".into(),
        format!("{LABEL_KEY}.root={}", root.display()),
        "--label".into(),
        format!("{LABEL_KEY}.role=backend"),
        "--label".into(),
        format!("{LABEL_KEY}.image-ref={image}"),
        "--label".into(),
        format!("{LABEL_KEY}.spec={SPEC_VERSION}"),
        "-v".into(),
        format!("{}:/data/claude:ro", root.join("credentials").display()),
        "-v".into(),
        format!("{}:/data/router", root.join("data").display()),
        "-e".into(),
        "TOKEN_SECRET".into(),
        "-e".into(),
        "DATA_DIR=/data/router".into(),
        "-e".into(),
        "STORAGE_POLICY=text".into(),
        "-e".into(),
        "CLAUDE_CODE_HOME=/data/claude".into(),
        image.into(),
        "serve".into(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn old_and_candidate_use_one_durable_state_and_never_put_the_secret_in_argv() {
        let root = Path::new("/srv/router");
        let arguments = backend_arguments("candidate", "router:1.2.3", root);
        let joined = arguments.join(" ");

        assert!(joined.contains(&format!("{}:/data/router", root.join("data").display())));
        assert!(joined.contains(&format!(
            "{}:/data/claude:ro",
            root.join("credentials").display()
        )));
        assert!(joined.contains("-e TOKEN_SECRET"));
        assert!(!joined.contains("a-secret-value"));
        assert!(!joined.contains("releases/"));
    }
}
