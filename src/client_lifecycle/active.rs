//! Refuse lifecycle operations while a client may be writing the profile.
//!
//! A client launched outside Router cannot honor Router's lock, so a running
//! one blocks backup, reset, restore and maintenance. It blocks only the
//! profile it can actually write, though: a running `claude` under the normal
//! home must not stop a backup of a separate `--home` fixture (issue #610).
//! Each running process's own environment is resolved through the same
//! inventory as the selected profile, and the two sets of roots are compared.
//! Where a process cannot be inspected the check stays conservative and says
//! exactly which process and profile it could not rule out.

// Windows exposes no other process's environment, so only its image-name
// check is compiled there.
#![cfg_attr(windows, allow(dead_code))]

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;

use super::{Profile, ProfileSelection, home_dir, inventory, profiles};
use crate::clients::ClientKind;

/// The variables [`inventory`] reads to place a profile. Nothing else in a
/// captured environment is kept.
const PROFILE_VARIABLES: &[&str] = &[
    "HOME",
    "USERPROFILE",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "APPDATA",
    "LOCALAPPDATA",
    "CODEX_HOME",
    "CLAUDE_CONFIG_DIR",
    "CURSOR_CONFIG_DIR",
    "GEMINI_CLI_HOME",
    "OPENCODE_CONFIG_DIR",
    "QWEN_HOME",
    "QWEN_RUNTIME_DIR",
];

/// What could be learned about one running client process.
enum Environment {
    /// Its profile variables, with set-but-empty values already dropped.
    Known(HashMap<String, PathBuf>),
    /// Why its profile cannot be established.
    Unknown(String),
}

fn marker_process_alive(pid: u32) -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    {
        match fs::read_to_string(format!("/proc/{pid}/status")) {
            Ok(status) => Ok(!status
                .lines()
                .any(|line| line.starts_with("State:") && line.contains('Z'))),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(error) => Err(format!(
                "cannot inspect Router-launched Claude PID: {error}"
            )),
        }
    }
    #[cfg(all(unix, not(target_os = "linux")))]
    {
        let output = std::process::Command::new("ps")
            .args(["-p", &pid.to_string(), "-o", "pid="])
            .output()
            .map_err(|error| format!("cannot inspect Router-launched Claude PID: {error}"))?;
        Ok(output.status.success() && !output.stdout.is_empty())
    }
    #[cfg(windows)]
    {
        let expected = pid.to_string();
        let output = std::process::Command::new("tasklist")
            .args(["/FI", &format!("PID eq {expected}"), "/NH", "/FO", "CSV"])
            .output()
            .map_err(|error| format!("cannot inspect Router-launched Claude PID: {error}"))?;
        if !output.status.success() {
            return Err("cannot inspect Router-launched Claude PID".into());
        }
        Ok(String::from_utf8_lossy(&output.stdout).lines().any(|line| {
            line.split(',')
                .nth(1)
                .is_some_and(|value| value.trim_matches('"') == expected)
        }))
    }
}

fn refuse_active_claude_marker(home: Option<&Path>) -> Result<(), String> {
    let root = home_dir(home)?;
    let config = if home.is_some() {
        root.join(".config")
    } else {
        crate::env_paths::router_client_config_root()?
    };
    let active = config.join("link-assistant-router/clients/claude/active");
    let entries = match fs::read_dir(active) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => {
            return Err(format!(
                "cannot inspect Router-launched Claude sessions: {error}"
            ));
        }
    };
    for entry in entries {
        let entry = entry.map_err(|error| error.to_string())?;
        let marker = fs::read_to_string(entry.path())
            .map_err(|error| format!("cannot inspect Router-launched Claude marker: {error}"))?;
        let mut seen = false;
        for line in marker.lines() {
            let pid = line
                .parse::<u32>()
                .map_err(|_| "invalid Router-launched Claude marker; inspect it before retrying")?;
            seen = true;
            if marker_process_alive(pid)? {
                return Err("active Router-launched Claude session; close it before backup, reset or restore".into());
            }
        }
        if !seen {
            return Err("empty Router-launched Claude marker; inspect it before retrying".into());
        }
        fs::remove_file(entry.path())
            .map_err(|error| format!("cannot remove stale Claude session marker: {error}"))?;
    }
    Ok(())
}

/// Running processes named like `client`, as PIDs.
#[cfg(unix)]
fn matching_processes(client: ClientKind) -> Result<Vec<String>, String> {
    let output = std::process::Command::new("pgrep")
        .args(["-x", client.command()])
        .stderr(Stdio::null())
        .output()
        .map_err(|error| format!("cannot check active {client} processes: {error}"))?;
    if !output.status.success() && output.status.code() != Some(1) {
        return Err(format!("cannot check active {client} processes"));
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|pid| !pid.is_empty())
        .map(str::to_owned)
        .collect())
}

/// How often an unreadable client is looked at again before it counts.
const SETTLE_ATTEMPTS: usize = 5;
const SETTLE_DELAY: std::time::Duration = std::time::Duration::from_millis(20);

/// The environment of a process that `still_client` keeps naming as the
/// client, once any exec in progress has finished.
///
/// A client that execs another program becomes unreadable before the kernel
/// renames it, so a child that Claude Code is starting briefly looks like an
/// uninspectable `claude` (issue #610). Only a process that stays the client
/// and stays unreadable is reported as unknown; one that is gone or renamed
/// is no longer a client.
fn settle_environment(
    mut read: impl FnMut() -> Option<Environment>,
    mut still_client: impl FnMut() -> Result<bool, String>,
) -> Result<Option<Environment>, String> {
    let mut environment = read();
    for _ in 0..SETTLE_ATTEMPTS {
        if !matches!(environment, Some(Environment::Unknown(_))) {
            break;
        }
        std::thread::sleep(SETTLE_DELAY);
        if !still_client()? {
            return Ok(None);
        }
        environment = read();
    }
    Ok(environment)
}

fn keep_profile_variable(variables: &mut HashMap<String, PathBuf>, name: &str, value: &str) {
    if PROFILE_VARIABLES.contains(&name) && !value.is_empty() {
        variables.insert(name.to_owned(), PathBuf::from(value));
    }
}

/// The launch environment of `pid`, or `None` when it has already exited.
#[cfg(target_os = "linux")]
fn process_environment(pid: &str) -> Option<Environment> {
    if fs::read_to_string(format!("/proc/{pid}/status")).is_ok_and(|status| {
        status
            .lines()
            .any(|line| line.starts_with("State:") && line.contains('Z'))
    }) {
        return None;
    }
    let env = match fs::read(format!("/proc/{pid}/environ")) {
        Ok(env) => env,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return None,
        Err(error) => {
            return Some(Environment::Unknown(format!(
                "cannot read its environment: {error}"
            )));
        }
    };
    let mut variables = HashMap::new();
    for part in env.split(|byte| *byte == 0) {
        let part = String::from_utf8_lossy(part);
        if let Some((name, value)) = part.split_once('=') {
            keep_profile_variable(&mut variables, name, value);
        }
    }
    Some(Environment::Known(variables))
}

/// The launch environment of `pid`, or `None` when it has already exited.
///
/// macOS has no `/proc`; `ps -E` reads the same launch environment through
/// `KERN_PROCARGS2`, which the kernel only exposes for the caller's own
/// processes (issue #610).
#[cfg(all(unix, not(target_os = "linux")))]
fn process_environment(pid: &str) -> Option<Environment> {
    let output = match std::process::Command::new("ps")
        .args(["-E", "-ww", "-o", "command=", "-p", pid])
        .stderr(Stdio::null())
        .output()
    {
        Ok(output) => output,
        Err(error) => {
            return Some(Environment::Unknown(format!(
                "cannot run ps to read its environment: {error}"
            )));
        }
    };
    let text = String::from_utf8_lossy(&output.stdout);
    if !output.status.success() || text.trim().is_empty() {
        return None;
    }
    Some(parse_ps_environment(&text))
}

/// Read the profile variables from one line of `ps -E -o command=`.
///
/// `ps` prints the arguments and then the environment, every entry joined by
/// a single space, so an entry is recognised by its `NAME=` prefix and a word
/// without one continues the previous value (a home such as `/Users/A B`).
/// A profile variable seen twice with different values cannot be attributed
/// and is reported rather than guessed; a missing `HOME` means `ps` could not
/// read the environment at all, as for another user's process.
#[cfg_attr(target_os = "linux", allow(dead_code))]
fn parse_ps_environment(line: &str) -> Environment {
    let mut entries = Vec::<(String, String)>::new();
    for word in line.trim_end_matches(['\r', '\n']).split(' ') {
        let name = word.split_once('=').map(|(name, _)| name).filter(|name| {
            let mut bytes = name.bytes();
            bytes
                .next()
                .is_some_and(|byte| byte.is_ascii_alphabetic() || byte == b'_')
                && bytes.all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
        });
        if let Some(name) = name {
            entries.push((name.to_owned(), word[name.len() + 1..].to_owned()));
        } else if let Some((_, value)) = entries.last_mut() {
            value.push(' ');
            value.push_str(word);
        }
    }
    let mut variables = HashMap::new();
    for (name, value) in &entries {
        if !PROFILE_VARIABLES.contains(&name.as_str()) {
            continue;
        }
        if let Some(previous) = variables.get(name)
            && previous != &PathBuf::from(value)
        {
            return Environment::Unknown(format!("its {name} is ambiguous in the ps output"));
        }
        keep_profile_variable(&mut variables, name, value);
    }
    if variables.contains_key("HOME") {
        Environment::Known(variables)
    } else {
        Environment::Unknown("its environment is not readable".into())
    }
}

/// `path` with its longest existing ancestor resolved, so `/tmp` and
/// `/private/tmp` on macOS, or a symlinked home, compare as the same place.
fn comparable(path: &Path) -> PathBuf {
    let mut missing = Vec::new();
    let mut existing = path;
    loop {
        if let Ok(resolved) = fs::canonicalize(existing) {
            return missing
                .iter()
                .rev()
                .fold(resolved, |resolved, part| resolved.join(part));
        }
        match (existing.parent(), existing.file_name()) {
            (Some(parent), Some(name)) => {
                missing.push(name.to_owned());
                existing = parent;
            }
            _ => return path.to_path_buf(),
        }
    }
}

/// Whether one root contains the other.
fn overlaps(left: &Path, right: &Path) -> bool {
    let (left, right) = (comparable(left), comparable(right));
    left.starts_with(&right) || right.starts_with(&left)
}

/// The first selected store a process with `environment` can write.
fn written_store<'a>(
    profile: &'a Profile,
    environment: &HashMap<String, PathBuf>,
) -> Result<Option<&'a Path>, String> {
    let lookup = |name: &str| environment.get(name).cloned();
    let (normal, router) = inventory(None, profile.client, &lookup, &|name| {
        Err(format!(
            "its {name} is relative to a directory Router cannot see"
        ))
    })?;
    let roots = normal
        .into_iter()
        .chain(router.into_iter().flatten())
        .map(|store| store.path)
        .collect::<Vec<_>>();
    Ok(profile
        .stores
        .iter()
        .find(|store| roots.iter().any(|root| overlaps(root, &store.path)))
        .map(|store| store.path.as_path()))
}

/// Refuse while a running client process may write `profile`.
///
/// Router-launched Claude sessions are tracked by marker, so those are
/// checked first. Other processes are matched by the profile roots their own
/// environment selects; one that cannot be inspected is treated as a writer.
pub fn refuse_active(profile: &Profile, home: Option<&Path>) -> Result<(), String> {
    let client = profile.client;
    if client == ClientKind::ClaudeCode {
        refuse_active_claude_marker(home)?;
    }
    let scope = profile.scope;
    let location = profile
        .stores
        .first()
        .map_or_else(String::new, |store| format!(" at {}", store.path.display()));
    #[cfg(unix)]
    for pid in matching_processes(client)? {
        let environment = settle_environment(
            || process_environment(&pid),
            || Ok(matching_processes(client)?.contains(&pid)),
        )?;
        match environment {
            None => {}
            Some(Environment::Known(environment)) => match written_store(profile, &environment) {
                Ok(None) => {}
                Ok(Some(path)) => {
                    return Err(format!(
                        "{client} is running with the {scope} profile at {} (process {pid}); \
                         close it before backup, reset or restore",
                        path.display()
                    ));
                }
                Err(reason) => {
                    return Err(format!(
                        "{client} is running (process {pid}) and may use the {scope} \
                         profile{location}: {reason}; close it before backup, reset or restore"
                    ));
                }
            },
            Some(Environment::Unknown(reason)) => {
                return Err(format!(
                    "{client} is running (process {pid}) and may use the {scope} \
                     profile{location}: {reason}; close it before backup, reset or restore"
                ));
            }
        }
    }
    #[cfg(windows)]
    {
        let output = std::process::Command::new("tasklist")
            .args(["/FI", &format!("IMAGENAME eq {}.exe", client.command())])
            .stderr(Stdio::null())
            .output()
            .map_err(|error| format!("cannot check active client: {error}"))?;
        if String::from_utf8_lossy(&output.stdout)
            .to_ascii_lowercase()
            .contains(&format!("{}.exe", client.command()))
        {
            return Err(format!(
                "{client} is running and Windows does not expose which profile it uses; \
                 close it before backup, reset or restore of the {scope} profile{location}"
            ));
        }
    }
    Ok(())
}

/// [`refuse_active`] for every profile of `client`: maintenance replaces the
/// binary all of them run, but only a writer of this home's profiles blocks it.
pub fn refuse_active_client(client: ClientKind, home: Option<&Path>) -> Result<(), String> {
    let mut selected = profiles(home, client, ProfileSelection::Normal)?;
    if let Ok(router) = profiles(home, client, ProfileSelection::Router) {
        selected.extend(router);
    }
    for profile in &selected {
        refuse_active(profile, home)?;
    }
    Ok(())
}

#[cfg(test)]
#[path = "active_tests.rs"]
mod tests;
