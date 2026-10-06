//! SSH options, the settings payload, the deadline and `--json` for
//! `router deploy --server` (issues #679, #680, #683).
//!
//! Everything here is additive: without deploy settings the SSH arguments,
//! the remote wrapper and the bytes on stdin are exactly what they were.

use std::ffi::OsString;
use std::io::{BufRead as _, BufReader, Read, Write as _};
use std::path::Path;
use std::process::{Child, ExitStatus};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

use base64::Engine as _;
use link_assistant_router::deploy_config::{
    Merged, ResolvedDeploy, SshSettings, env_fingerprint, value_fingerprint,
};
use serde_json::{Value, json};

/// Exit code when `--deadline` (or `deadline_secs`) expires.
pub const DEADLINE_EXIT: u8 = 12;
/// Prefix of a structured progress line the agent writes to stderr.
pub const EVENT_PREFIX: &str = "ROUTER_DEPLOY_EVENT ";

fn encode(value: &str) -> String {
    base64::engine::general_purpose::STANDARD.encode(value)
}

/// Extra OpenSSH options, inserted before `--`. Empty without settings.
pub fn ssh_options(ssh: &SshSettings, known_hosts: Option<&Path>) -> Vec<OsString> {
    let mut options: Vec<OsString> = Vec::new();
    let mut option = |text: String| {
        options.push("-o".into());
        options.push(text.into());
    };
    if let Some(path) = known_hosts {
        // Pinned keys only: neither the user's nor the global file can vouch
        // for the host, and StrictHostKeyChecking=yes refuses anything else.
        option(format!("UserKnownHostsFile={}", path.display()));
        option("GlobalKnownHostsFile=/dev/null".to_string());
    }
    if let Some(seconds) = ssh.keepalive_secs {
        option(format!("ServerAliveInterval={seconds}"));
        option("ServerAliveCountMax=3".to_string());
    }
    if let Some(deadline) = ssh.deadline_secs {
        option(format!("ConnectTimeout={}", deadline.clamp(1, 30)));
    }
    if ssh.identity_file.is_some() {
        option("IdentitiesOnly=yes".to_string());
    }
    if let Some(identity) = &ssh.identity_file {
        options.push("-i".into());
        options.push(identity.as_os_str().to_owned());
    }
    if let Some(port) = ssh.port {
        options.push("-p".into());
        options.push(port.to_string().into());
    }
    options
}

/// Write the pinned `known_hosts` lines to a private temporary file.
pub fn pinned_known_hosts(text: &str) -> std::io::Result<tempfile::NamedTempFile> {
    // `tempfile` creates the file 0600, so the pin is not world-writable.
    let mut file = tempfile::Builder::new()
        .prefix("router-deploy-known-hosts-")
        .tempfile()?;
    file.write_all(text.as_bytes())?;
    file.flush()?;
    Ok(file)
}

/// The settings line the agent reads after the secret, if one is needed.
///
/// Base64 of newline-separated records. Values are base64 again inside, so
/// no value can start a record of its own. `None` keeps stdin unchanged.
pub fn payload(
    merged: &Merged,
    values: Option<&ResolvedDeploy>,
    json: bool,
    token_secret: &str,
    seeds: &[link_assistant_router::deploy_seed::Seed],
) -> Option<String> {
    let mut lines: Vec<String> = Vec::new();
    if let Some(instance) = &merged.instance {
        lines.push(format!("instance {instance}"));
    }
    if json {
        lines.push("json 1".to_string());
    }
    if let Some(values) = values {
        for (name, value) in &values.env {
            lines.push(format!("env {name} {}", encode(value)));
        }
        if let Some(fingerprint) = env_fingerprint(token_secret, &values.env) {
            lines.push(format!("env-fingerprint {fingerprint}"));
        }
        for key in &values.provider_keys {
            lines.push(format!(
                "key {} {} {} {}",
                key.name,
                key.mode.as_str(),
                encode(&key.value),
                value_fingerprint(token_secret, &key.value)
            ));
            if let Some(template) = &key.template {
                let text = serde_json::to_string(template).unwrap_or_default();
                lines.push(format!("template {} {}", key.name, encode(&text)));
            }
        }
        if let Some(profile) = &values.verification {
            let text = serde_json::to_string(profile).unwrap_or_default();
            lines.push(format!("profile {}", encode(&text)));
        }
        if values.tokens.is_limited() {
            lines.push("tokens 1".to_string());
            for argument in values.tokens.issue_arguments() {
                lines.push(format!("token-arg {}", encode(&argument)));
            }
        }
    }
    for seed in seeds {
        // The document is a secret: it rides the payload on stdin, never argv.
        lines.push(format!(
            "seed {} {} {}",
            seed.provider.as_str(),
            encode(&seed.document),
            seed.fingerprint
        ));
    }
    if lines.is_empty() {
        None
    } else {
        Some(encode(&(lines.join("\n") + "\n")))
    }
}

/// Wait for OpenSSH, killing it when the deadline expires.
///
/// Returns `None` on expiry. Killing the session hangs up the agent, whose
/// HUP handler rolls a pre-cutover candidate back and releases the lease.
pub fn wait(child: &mut Child, deadline: Option<Duration>) -> std::io::Result<Option<ExitStatus>> {
    let Some(deadline) = deadline else {
        return child.wait().map(Some);
    };
    let started = Instant::now();
    loop {
        if let Some(status) = child.try_wait()? {
            return Ok(Some(status));
        }
        if started.elapsed() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Ok(None);
        }
        std::thread::sleep(Duration::from_millis(50));
    }
}

/// Agent output collected for the `--json` document.
#[derive(Default)]
pub struct Collected {
    pub events: Vec<Value>,
    pub output: Vec<String>,
}

/// Read one agent stream: event lines are collected, the rest is either
/// collected (`stdout`) or forwarded to this process's stderr.
/// Where a collected stream's ordinary (non-event) lines go.
#[derive(Clone, Copy)]
pub enum Echo {
    /// Kept for the `--json` document.
    Keep,
    /// Passed through to this process's stdout.
    Stdout,
    /// Passed through to this process's stderr.
    Stderr,
}

pub fn collect<R: Read + Send + 'static>(
    stream: R,
    sink: Arc<Mutex<Collected>>,
    echo: Echo,
) -> JoinHandle<()> {
    let context = crate::operation_context::current();
    std::thread::spawn(move || {
        let collect = || {
            for line in BufReader::new(stream).lines() {
                let Ok(line) = line else { break };
                if let Some(event) = line.strip_prefix(EVENT_PREFIX) {
                    if let Ok(value) = serde_json::from_str::<Value>(event)
                        && let Ok(mut collected) = sink.lock()
                    {
                        collected.events.push(value);
                    }
                } else {
                    match echo {
                        Echo::Keep => {
                            if let Ok(mut collected) = sink.lock() {
                                collected.output.push(line);
                            }
                        }
                        Echo::Stdout => println!("{line}"),
                        Echo::Stderr => eprintln!("{line}"),
                    }
                }
            }
        };
        if let Some(context) = context {
            context.scope(collect);
        } else {
            collect();
        }
    })
}

/// What the `--json` document says about the run.
pub struct Outcome<'a> {
    pub server: &'a str,
    pub mode: &'a str,
    pub exit_code: u8,
    pub ssh_ms: u128,
    pub ssh_exit: Option<i32>,
}

fn by_event<'a>(events: &'a [Value], kind: &'a str) -> impl Iterator<Item = &'a Value> {
    events
        .iter()
        .filter(move |event| event.get("event").and_then(Value::as_str) == Some(kind))
}

fn steps(events: &[Value]) -> Vec<Value> {
    let marks: Vec<(String, i64)> = by_event(events, "step")
        .filter_map(|event| {
            Some((
                event.get("name")?.as_str()?.to_string(),
                event.get("at_ms")?.as_i64()?,
            ))
        })
        .collect();
    marks
        .iter()
        .enumerate()
        .map(|(index, (name, at))| {
            let duration = marks.get(index + 1).map(|(_, next)| next - at);
            json!({"name": name, "started_ms": at, "duration_ms": duration})
        })
        .collect()
}

/// The `link-assistant-router/deploy/v1` document. Never holds a value.
pub fn document(
    merged: &Merged,
    values: Option<&ResolvedDeploy>,
    token_secret: &str,
    collected: &Collected,
    outcome: &Outcome<'_>,
) -> Value {
    let events = &collected.events;
    let mut subprocesses: Vec<Value> = by_event(events, "subprocess")
        .map(|event| {
            let mut event = event.clone();
            if let Some(object) = event.as_object_mut() {
                object.remove("event");
            }
            event
        })
        .collect();
    subprocesses.insert(
        0,
        json!({"program": "ssh", "duration_ms": outcome.ssh_ms, "exit_code": outcome.ssh_exit}),
    );
    let provider_keys: Vec<Value> = values
        .map(|values| values.provider_keys.as_slice())
        .unwrap_or_default()
        .iter()
        .map(|key| {
            let reported = by_event(events, "provider_key")
                .filter(|event| event.get("name").and_then(Value::as_str) == Some(&key.name))
                .last();
            json!({
                "name": key.name,
                "mode": key.mode.as_str(),
                "fingerprint": value_fingerprint(token_secret, &key.value),
                "action": reported.and_then(|event| event.get("action")).cloned()
                    .unwrap_or_else(|| json!("not-reached")),
                "validation": reported.and_then(|event| event.get("validation")).cloned()
                    .unwrap_or(Value::Null),
            })
        })
        .collect();
    let env = values.map_or(&[][..], |values| values.env.as_slice());
    let verification = by_event(events, "verification")
        .last()
        .and_then(|event| event.get("result"))
        .cloned()
        .unwrap_or(Value::Null);
    let token = by_event(events, "token")
        .last()
        .and_then(|event| event.get("action"))
        .cloned()
        .unwrap_or(Value::Null);
    json!({
        "schema": "link-assistant-router/deploy/v1",
        "target": "remote",
        "server": outcome.server,
        "mode": outcome.mode,
        "instance": merged.instance,
        "status": if outcome.exit_code == 0 { "succeeded" } else { "failed" },
        "exit_code": outcome.exit_code,
        "env": {
            "names": env.iter().map(|(name, _)| name).collect::<Vec<_>>(),
            "fingerprint": env_fingerprint(token_secret, env),
        },
        "provider_keys": provider_keys,
        "verification": verification,
        "deploy_token": token,
        "steps": steps(events),
        "subprocesses": subprocesses,
        "timings": {"total_ms": outcome.ssh_ms},
        "output": collected.output,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_settings_add_no_ssh_options_and_no_payload() {
        assert!(ssh_options(&SshSettings::default(), None).is_empty());
        assert_eq!(
            payload(&Merged::default(), None, false, "secret", &[]),
            None
        );
        assert_eq!(
            payload(
                &Merged::default(),
                Some(&ResolvedDeploy::default()),
                false,
                "secret",
                &[]
            ),
            None
        );
    }

    #[test]
    fn ssh_options_carry_port_identity_pin_keepalive_and_connect_timeout() {
        let ssh = SshSettings {
            port: Some(2222),
            identity_file: Some("/keys/deploy".into()),
            keepalive_secs: Some(15),
            deadline_secs: Some(600),
            ..SshSettings::default()
        };
        let options: Vec<String> = ssh_options(&ssh, Some(Path::new("/tmp/pin")))
            .into_iter()
            .map(|option| option.into_string().unwrap())
            .collect();
        for expected in [
            "UserKnownHostsFile=/tmp/pin",
            "GlobalKnownHostsFile=/dev/null",
            "ServerAliveInterval=15",
            "ServerAliveCountMax=3",
            "ConnectTimeout=30",
            "IdentitiesOnly=yes",
            "/keys/deploy",
            "2222",
        ] {
            assert!(
                options.iter().any(|option| option == expected),
                "{expected}: {options:?}"
            );
        }
        assert!(!options.iter().any(|option| option.contains("accept-new")));
    }

    #[test]
    fn the_payload_encodes_values_twice_and_reports_fingerprints() {
        let merged = Merged {
            instance: Some("blue".into()),
            ..Merged::default()
        };
        let values = ResolvedDeploy {
            env: vec![("UPSTREAM_TOKEN".into(), "value with spaces".into())],
            ..ResolvedDeploy::default()
        };
        let encoded = payload(&merged, Some(&values), true, "secret", &[]).unwrap();
        let decoded = String::from_utf8(
            base64::engine::general_purpose::STANDARD
                .decode(encoded)
                .unwrap(),
        )
        .unwrap();
        assert!(decoded.contains("instance blue\n"));
        assert!(decoded.contains("json 1\n"));
        assert!(decoded.contains(&format!(
            "env UPSTREAM_TOKEN {}\n",
            encode("value with spaces")
        )));
        assert!(decoded.contains("env-fingerprint hmac-sha256:"));
        assert!(!decoded.contains("value with spaces"));
    }

    #[test]
    fn step_durations_come_from_consecutive_marks() {
        let events = vec![
            json!({"event":"step","name":"lease","at_ms":100}),
            json!({"event":"step","name":"build","at_ms":350}),
            json!({"event":"step","name":"complete","at_ms":400}),
        ];
        let steps = steps(&events);
        assert_eq!(steps[0]["duration_ms"], 250);
        assert_eq!(steps[1]["duration_ms"], 50);
        assert_eq!(steps[2]["duration_ms"], Value::Null);
    }
}
