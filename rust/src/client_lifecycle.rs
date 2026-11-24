//! Local, owner-only lifecycle operations for the eight documented clients.
//!
//! Every destructive operation passes through the same profile inventory and
//! verified backup implementation. Unknown stores fail closed rather than
//! being described as a complete backup.

use std::fs::{self, File, OpenOptions};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use crate::cli::{ClientSelection, ProfileSelection};
use crate::clients::ClientKind;

pub mod active;
pub mod backup;
pub mod maintenance;
pub mod reset;

pub use active::refuse_active;

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

/// Resolves a variable in the environment the profile roots come from: this
/// process's own, or the one captured from a running client (issue #610).
type Lookup<'a> = &'a dyn Fn(&str) -> Option<PathBuf>;

/// The working directory of that same environment, for relative overrides.
type Current<'a> = &'a dyn Fn(&str) -> Result<PathBuf, String>;

fn home_dir(home: Option<&Path>) -> Result<PathBuf, String> {
    home_dir_in(home, &directory)
}

fn home_dir_in(home: Option<&Path>, env: Lookup) -> Result<PathBuf, String> {
    let root = home
        .map(Path::to_path_buf)
        .or_else(|| env("HOME"))
        .or_else(|| env("USERPROFILE"))
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
    Ok(user_config(home, &user_home, &directory).join("link-assistant-router/client-backups"))
}

fn user_config(home: Option<&Path>, root: &Path, env: Lookup) -> PathBuf {
    if home.is_some() {
        root.join(".config")
    } else {
        env("XDG_CONFIG_HOME")
            .or_else(|| env("APPDATA"))
            .unwrap_or_else(|| root.join(".config"))
    }
}

fn user_data(home: Option<&Path>, root: &Path, env: Lookup) -> PathBuf {
    if home.is_some() {
        root.join(".local/share")
    } else {
        env("XDG_DATA_HOME")
            .or_else(|| env("LOCALAPPDATA"))
            .unwrap_or_else(|| root.join(".local/share"))
    }
}

fn store(name: &str, path: PathBuf) -> Store {
    Store {
        name: name.to_string(),
        path,
    }
}

/// The normal stores of `client` and, for the clients Router keeps a
/// persistent profile for, the Router-owned one, resolved in `env`.
fn inventory(
    home: Option<&Path>,
    client: ClientKind,
    env: Lookup,
    current: Current,
) -> Result<(Vec<Store>, Option<Vec<Store>>), String> {
    let root = home_dir_in(home, env)?;
    let config = user_config(home, &root, env);
    let data = user_data(home, &root, env);
    let selected = |name: &str, fallback: PathBuf| {
        if home.is_some() {
            fallback
        } else {
            env(name).unwrap_or(fallback)
        }
    };
    let qwen = |name: &str| crate::env_paths::qwen_directory_in(env, name, &root, || current(name));
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
                env("GEMINI_CLI_HOME")
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
                qwen("QWEN_HOME")?.unwrap_or_else(|| root.join(".qwen"))
            };
            let mut stores = vec![store("home", main.clone())];
            if home.is_none()
                && let Some(runtime) = qwen("QWEN_RUNTIME_DIR")?
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
    let router = if matches!(client, ClientKind::ClaudeCode | ClientKind::GeminiCli) {
        let router_config = if home.is_some() {
            root.join(".config")
        } else {
            crate::env_paths::router_client_config_root_in(env)?
        };
        Some(vec![store(
            "home",
            router_config
                .join("link-assistant-router/clients")
                .join(client.canonical_name())
                .join("home"),
        )])
    } else {
        None
    };
    Ok((normal, router))
}

/// Inventory the known user and Router-owned stores. Optional roots that do
/// not exist are reported as unavailable by the backup plan, not invented.
pub fn profiles(
    home: Option<&Path>,
    client: ClientKind,
    scope: ProfileSelection,
) -> Result<Vec<Profile>, String> {
    let (normal, router) = inventory(home, client, &directory, &|name| {
        crate::operation_context::current_dir()
            .map_err(|error| format!("cannot resolve {name}: {error}"))
    })?;
    let mut result = Vec::new();
    if scope != ProfileSelection::Router {
        result.push(Profile {
            client,
            scope: "normal",
            stores: normal,
        });
    }
    if scope != ProfileSelection::Normal {
        if let Some(stores) = router {
            result.push(Profile {
                client,
                scope: "router",
                stores,
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
    let identity = crate::operation_context::process_output(
        crate::operation_context::command("whoami").args(["/user", "/fo", "csv", "/nh"]),
    )
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
        let status = crate::operation_context::process_output(
            crate::operation_context::command("icacls")
                .arg(path)
                .args(arguments)
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null()),
        )
        .map(|output| output.status)
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
