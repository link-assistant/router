//! Local, owner-only lifecycle operations for the eight documented clients.
//!
//! Every destructive operation passes through the same profile inventory and
//! verified backup implementation. Unknown stores fail closed rather than
//! being described as a complete backup.

use std::fs::{self, File, OpenOptions};
use std::path::{Path, PathBuf};
use std::process::{ExitCode, Stdio};

use crate::cli::{ClientSelection, ProfileSelection};
use crate::clients::ClientKind;

pub mod backup;
pub mod maintenance;
pub mod reset;

#[derive(Clone, Debug)]
pub struct Store {
    pub name: String,
    pub path: PathBuf,
}

#[derive(Clone, Debug)]
pub struct Profile {
    pub client: ClientKind,
    pub scope: &'static str,
    pub stores: Vec<Store>,
}

#[must_use]
pub fn clients(selection: &ClientSelection) -> Vec<ClientKind> {
    if selection.all {
        ClientKind::ALL.to_vec()
    } else {
        selection.client.into_iter().collect()
    }
}

fn directory(name: &str) -> Option<PathBuf> {
    crate::env_paths::directory(name)
}

fn home_dir(home: Option<&Path>) -> Result<PathBuf, String> {
    let root = home
        .map(Path::to_path_buf)
        .or_else(|| directory("HOME"))
        .or_else(|| directory("USERPROFILE"))
        .ok_or("HOME or USERPROFILE is required to locate client profiles")?;
    crate::env_paths::require_absolute(root, "the client home")
}

pub fn backup_root(home: Option<&Path>, destination: Option<&Path>) -> Result<PathBuf, String> {
    if let Some(destination) = destination {
        if let Ok(suffix) = destination.strip_prefix("~") {
            return Ok(home_dir(home)?.join(suffix));
        }
        return crate::env_paths::require_absolute(destination.to_path_buf(), "backup destination");
    }
    let user_home = home_dir(home)?;
    let config = if home.is_some() {
        user_home.join(".config")
    } else {
        directory("XDG_CONFIG_HOME")
            .or_else(|| directory("APPDATA"))
            .unwrap_or_else(|| user_home.join(".config"))
    };
    Ok(config.join("link-assistant-router/client-backups"))
}

fn user_config(home: Option<&Path>, root: &Path) -> PathBuf {
    if home.is_some() {
        root.join(".config")
    } else {
        directory("XDG_CONFIG_HOME")
            .or_else(|| directory("APPDATA"))
            .unwrap_or_else(|| root.join(".config"))
    }
}

fn user_data(home: Option<&Path>, root: &Path) -> PathBuf {
    if home.is_some() {
        root.join(".local/share")
    } else {
        directory("XDG_DATA_HOME")
            .or_else(|| directory("LOCALAPPDATA"))
            .unwrap_or_else(|| root.join(".local/share"))
    }
}

fn store(name: &str, path: PathBuf) -> Store {
    Store {
        name: name.to_string(),
        path,
    }
}

/// Inventory the known user and Router-owned stores. Optional roots that do
/// not exist are reported as unavailable by the backup plan, not invented.
pub fn profiles(
    home: Option<&Path>,
    client: ClientKind,
    scope: ProfileSelection,
) -> Result<Vec<Profile>, String> {
    let root = home_dir(home)?;
    let config = user_config(home, &root);
    let data = user_data(home, &root);
    let selected = |name: &str, fallback: PathBuf| {
        if home.is_some() {
            fallback
        } else {
            directory(name).unwrap_or(fallback)
        }
    };
    let normal = match client {
        ClientKind::Codex => vec![store("home", selected("CODEX_HOME", root.join(".codex")))],
        ClientKind::ClaudeCode => vec![
            store("home", selected("CLAUDE_CONFIG_DIR", root.join(".claude"))),
            store("legacy-settings", root.join(".claude.json")),
        ],
        ClientKind::Cursor => vec![store(
            "home",
            selected("CURSOR_CONFIG_DIR", root.join(".cursor")),
        )],
        ClientKind::GeminiCli => vec![store(
            "home",
            if home.is_some() {
                root.join(".gemini")
            } else {
                directory("GEMINI_CLI_HOME")
                    .unwrap_or_else(|| root.clone())
                    .join(".gemini")
            },
        )],
        ClientKind::GrokCli => vec![store("home", root.join(".grok"))],
        ClientKind::Opencode => vec![
            store(
                "config",
                selected("OPENCODE_CONFIG_DIR", config.join("opencode")),
            ),
            store("data", data.join("opencode")),
        ],
        ClientKind::QwenCode => {
            let main = if home.is_some() {
                root.join(".qwen")
            } else {
                crate::env_paths::qwen_directory("QWEN_HOME", &root)?
                    .unwrap_or_else(|| root.join(".qwen"))
            };
            let mut stores = vec![store("home", main.clone())];
            if home.is_none()
                && let Some(runtime) = crate::env_paths::qwen_directory("QWEN_RUNTIME_DIR", &root)?
                && !runtime.starts_with(&main)
            {
                stores.push(store("runtime", runtime));
            }
            stores
        }
        ClientKind::Agent => vec![
            store("config", config.join("link-assistant-agent")),
            store("data", data.join("link-assistant-agent")),
        ],
    };
    let mut result = Vec::new();
    if scope != ProfileSelection::Router {
        result.push(Profile {
            client,
            scope: "normal",
            stores: normal,
        });
    }
    if scope != ProfileSelection::Normal {
        if matches!(client, ClientKind::ClaudeCode | ClientKind::GeminiCli) {
            let router_config = if home.is_some() {
                root.join(".config")
            } else {
                crate::env_paths::router_client_config_root()?
            };
            result.push(Profile {
                client,
                scope: "router",
                stores: vec![store(
                    "home",
                    router_config
                        .join("link-assistant-router/clients")
                        .join(client.canonical_name())
                        .join("home"),
                )],
            });
        } else if scope == ProfileSelection::Router {
            return Err(format!("{client} has no persistent Router-owned profile"));
        } else {
            eprintln!("note: {client} has no persistent Router-owned profile");
        }
    }
    for profile in &result {
        for store in &profile.stores {
            if !store.path.is_absolute() {
                return Err(format!(
                    "{client} profile root is relative; set an absolute home or override"
                ));
            }
        }
    }
    Ok(result)
}

pub fn owner_directory(path: &Path) -> Result<(), String> {
    if fs::symlink_metadata(path).is_ok_and(|metadata| metadata.file_type().is_symlink()) {
        return Err(
            "operation directory is a symlink; choose a real private directory".to_string(),
        );
    }
    fs::create_dir_all(path)
        .map_err(|error| format!("cannot create private operation directory: {error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))
            .map_err(|error| format!("cannot make operation directory owner-only: {error}"))?;
    }
    #[cfg(windows)]
    owner_directory_windows(path)?;
    Ok(())
}

#[cfg(windows)]
fn owner_directory_windows(path: &Path) -> Result<(), String> {
    let identity = std::process::Command::new("whoami")
        .args(["/user", "/fo", "csv", "/nh"])
        .output()
        .map_err(|error| format!("cannot identify Windows account: {error}"))?;
    let identity_text = String::from_utf8_lossy(&identity.stdout);
    let sid = parse_windows_sid(&identity_text).ok_or("cannot identify Windows account SID")?;
    if !identity.status.success() {
        return Err("cannot identify Windows account SID".into());
    }
    for arguments in [
        vec!["/reset".to_string()],
        vec!["/inheritance:r".to_string()],
        vec!["/grant:r".to_string(), format!("*{sid}:(OI)(CI)F")],
    ] {
        let status = std::process::Command::new("icacls")
            .arg(path)
            .args(arguments)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|error| format!("cannot make Windows backup directory private: {error}"))?;
        if !status.success() {
            return Err("cannot make Windows backup directory private with icacls".into());
        }
    }
    Ok(())
}

#[cfg(any(windows, test))]
fn parse_windows_sid(output: &str) -> Option<&str> {
    let sid = output.trim().rsplit(',').next()?.trim_matches('"');
    sid.strip_prefix("S-1-")
        .filter(|tail| {
            !tail.is_empty()
                && tail
                    .bytes()
                    .all(|byte| byte.is_ascii_digit() || byte == b'-')
        })
        .map(|_| sid)
}

pub fn lock_operations(root: &Path) -> Result<File, String> {
    owner_directory(root)?;
    let file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(false)
        .open(root.join(".operation.lock"))
        .map_err(|error| format!("cannot open operation lock: {error}"))?;
    file.try_lock()
        .map_err(|_| "another client backup, reset or restore is running".to_string())?;
    Ok(file)
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

/// A conservative process check. The client may be launched outside Router;
/// such a writer cannot honor Router's lock, so refuse while it is present.
pub fn refuse_active(client: ClientKind, home: Option<&Path>) -> Result<(), String> {
    if client == ClientKind::ClaudeCode {
        refuse_active_claude_marker(home)?;
    }
    #[cfg(not(target_os = "linux"))]
    let _ = home;
    #[cfg(target_os = "linux")]
    {
        let selected_home = home.map(Path::to_path_buf).or_else(|| directory("HOME"));
        let output = std::process::Command::new("pgrep")
            .args(["-x", client.command()])
            .stderr(Stdio::null())
            .output()
            .map_err(|error| format!("cannot check active {client} processes: {error}"))?;
        if !output.status.success() && output.status.code() != Some(1) {
            return Err(format!("cannot check active {client} processes"));
        }
        let pids = String::from_utf8_lossy(&output.stdout);
        for pid in pids.lines() {
            if fs::read_to_string(format!("/proc/{pid}/status")).is_ok_and(|status| {
                status
                    .lines()
                    .any(|line| line.starts_with("State:") && line.contains('Z'))
            }) {
                continue;
            }
            let env = match fs::read(format!("/proc/{pid}/environ")) {
                Ok(env) => env,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
                Err(_) => {
                    return Err(format!(
                        "{client} may be running; cannot inspect its profile"
                    ));
                }
            };
            let process_home = env.split(|byte| *byte == 0).find_map(|part| {
                part.strip_prefix(b"HOME=")
                    .map(|value| PathBuf::from(String::from_utf8_lossy(value).into_owned()))
            });
            if process_home == selected_home {
                return Err(format!(
                    "{client} is running; close it before backup, reset or restore"
                ));
            }
        }
    }
    #[cfg(all(unix, not(target_os = "linux")))]
    {
        let status = std::process::Command::new("pgrep")
            .args(["-x", client.command()])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|error| format!("cannot check active {client} processes: {error}"))?;
        if status.success() {
            return Err(format!(
                "{client} is running; close it before backup, reset or restore"
            ));
        }
        if status.code() != Some(1) {
            return Err(format!("cannot check active {client} processes"));
        }
    }
    #[cfg(windows)]
    {
        let output = std::process::Command::new("tasklist")
            .args(["/FI", &format!("IMAGENAME eq {}.exe", client.command())])
            .output()
            .map_err(|error| format!("cannot check active client: {error}"))?;
        if String::from_utf8_lossy(&output.stdout)
            .to_ascii_lowercase()
            .contains(&format!("{}.exe", client.command()))
        {
            return Err(format!(
                "{client} is running; close it before backup, reset or restore"
            ));
        }
    }
    Ok(())
}

pub fn failed(error: impl std::fmt::Display) -> ExitCode {
    eprintln!("error: {error}");
    ExitCode::from(1)
}

#[cfg(test)]
mod windows_sid_tests {
    use super::parse_windows_sid;

    #[test]
    fn accepts_a_whoami_csv_sid_even_when_the_username_contains_a_comma() {
        assert_eq!(
            parse_windows_sid("\"domain\\last, first\",\"S-1-5-21-123\"\r\n"),
            Some("S-1-5-21-123")
        );
        assert_eq!(parse_windows_sid("\"user\",\"S-1-5-invalid\""), None);
    }
}
