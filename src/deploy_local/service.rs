//! `router deploy --mode host --install-service` (issue #684).
//!
//! A host deployment is a detached process: it does not survive a reboot or a
//! logout, and nothing restarts it after a crash. `--install-service` writes a
//! launchd agent (`~/Library/LaunchAgents`) or a systemd user unit
//! (`~/.config/systemd/user`) that starts the same executable on the same
//! data directory and port at login, and restarts it when it fails.
//!
//! The signing secret is written to a `0600` file under the deployment's
//! state directory and reaches the Router through `TOKEN_SECRET_FILE`, so it
//! is never in the unit, in the service manager's view of it, or in argv.
//! `launchctl` and `systemctl` are found on `PATH`.
//!
//! The unit is enabled, not started: the process the deploy just started
//! keeps serving, and the service manager takes over at the next login or
//! boot. A later deploy stops a service-started process before it starts its
//! own on the stable port, then rewrites the unit for what it deployed.

use std::fmt::Write as _;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Overrides the platform's service manager (`systemd` or `launchd`).
pub const MANAGER_ENV: &str = "LINK_ASSISTANT_ROUTER_SERVICE_MANAGER";

const RECORD: &str = "service.json";
const SECRET: &str = "token-secret";

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Manager {
    Systemd,
    Launchd,
}

impl Manager {
    fn detect() -> Result<Self, String> {
        match crate::operation_context::var(MANAGER_ENV).ok().as_deref() {
            Some("systemd") => Ok(Self::Systemd),
            Some("launchd") => Ok(Self::Launchd),
            Some(other) => Err(format!(
                "{MANAGER_ENV} must be `systemd` or `launchd`, not `{other}`"
            )),
            None if cfg!(target_os = "macos") => Ok(Self::Launchd),
            None => Ok(Self::Systemd),
        }
    }

    const fn as_str(self) -> &'static str {
        match self {
            Self::Systemd => "systemd",
            Self::Launchd => "launchd",
        }
    }
}

/// What `--install-service` wrote, so it can be replaced or removed.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct Record {
    pub manager: Manager,
    /// The systemd unit name or the launchd label.
    pub name: String,
    pub unit: PathBuf,
    pub secret: PathBuf,
}

/// Everything a unit says, none of it secret.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Unit {
    pub root: PathBuf,
    pub executable: PathBuf,
    pub port: u16,
    pub data_dir: PathBuf,
    pub secret_file: PathBuf,
    pub log: PathBuf,
}

fn home() -> Result<PathBuf, String> {
    crate::operation_context::var_os("HOME")
        .filter(|home| !home.is_empty())
        .map(PathBuf::from)
        .ok_or_else(|| "HOME is not set; the service location is unknown".to_string())
}

fn names(manager: Manager) -> (String, String) {
    let qualify = link_assistant_router::deploy::instance::qualify;
    match manager {
        Manager::Systemd => {
            let name = format!("{}.service", qualify("link-assistant-router"));
            (name.clone(), name)
        }
        Manager::Launchd => {
            let label = qualify("com.link-assistant.router");
            (label.clone(), format!("{label}.plist"))
        }
    }
}

fn unit_path(manager: Manager, file: &str) -> Result<PathBuf, String> {
    Ok(match manager {
        Manager::Systemd => crate::operation_context::var_os("XDG_CONFIG_HOME")
            .filter(|path| !path.is_empty())
            .map_or_else(
                || home().map(|home| home.join(".config")),
                |path| Ok(PathBuf::from(path)),
            )?
            .join("systemd")
            .join("user")
            .join(file),
        Manager::Launchd => home()?.join("Library").join("LaunchAgents").join(file),
    })
}

/// The marker naming the root a unit belongs to, so another root's unit of
/// the same name is never overwritten.
fn marker(root: &Path) -> String {
    format!("root={}", root.display())
}

/// Escape a path for a systemd setting that takes a bare path, such as
/// `WorkingDirectory=` or `StandardOutput=append:`: those do not unquote, so
/// only specifiers are escaped.
fn systemd_path(path: &Path) -> String {
    path.display().to_string().replace('%', "%%")
}

/// Whether a unit file was written for `root`. The marker is matched with its
/// closing parenthesis, so `/srv/r` does not claim the unit of `/srv/r2`.
fn written_for(existing: &str, root: &Path) -> bool {
    existing.contains(&format!("({})", marker(root)))
        || existing.contains(&format!("({})", xml(&marker(root)).replace("--", "- -")))
}

/// Quote a value for a systemd `Environment=` or `ExecStart=` word.
fn systemd_quote(value: &str) -> String {
    format!(
        "\"{}\"",
        value
            .replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('%', "%%")
    )
}

fn xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn environment(unit: &Unit) -> [(&'static str, String); 5] {
    [
        ("ROUTER_HOST", "127.0.0.1".to_string()),
        ("ROUTER_PORT", unit.port.to_string()),
        ("DATA_DIR", unit.data_dir.display().to_string()),
        ("STORAGE_POLICY", "text".to_string()),
        (
            link_assistant_router::token_secret::FILE_ENV,
            unit.secret_file.display().to_string(),
        ),
    ]
}

/// The systemd user unit for `unit`.
#[must_use]
pub fn systemd_unit(unit: &Unit) -> String {
    let mut text = format!(
        "# Written by `router deploy --install-service` ({}).\n\
         # The signing secret is read from TOKEN_SECRET_FILE; it is not in this file.\n\
         [Unit]\n\
         Description=Link.Assistant.Router host deployment\n\
         After=network-online.target\n\n\
         [Service]\n\
         Type=simple\n\
         WorkingDirectory={}\n",
        marker(&unit.root),
        systemd_path(&unit.data_dir),
    );
    for (name, value) in environment(unit) {
        let _ = writeln!(
            text,
            "Environment={}",
            systemd_quote(&format!("{name}={value}"))
        );
    }
    let log = systemd_path(&unit.log);
    let _ = write!(
        text,
        "ExecStart={} serve\n\
         Restart=on-failure\n\
         RestartSec=5\n\
         StandardOutput=append:{log}\n\
         StandardError=append:{log}\n\n\
         [Install]\n\
         WantedBy=default.target\n",
        systemd_quote(&unit.executable.display().to_string()),
    );
    text
}

/// The launchd agent for `unit`, labelled `label`.
#[must_use]
pub fn launchd_plist(unit: &Unit, label: &str) -> String {
    let mut environment_entries = String::new();
    for (name, value) in environment(unit) {
        let _ = writeln!(
            environment_entries,
            "      <key>{name}</key>\n      <string>{}</string>",
            xml(&value)
        );
    }
    let log = xml(&unit.log.display().to_string());
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n\
         <!-- Written by router deploy install-service ({}). The signing secret is read from TOKEN_SECRET_FILE. -->\n\
         <plist version=\"1.0\">\n\
         <dict>\n\
         \x20 <key>Label</key>\n  <string>{}</string>\n\
         \x20 <key>ProgramArguments</key>\n  <array>\n    <string>{}</string>\n    <string>serve</string>\n  </array>\n\
         \x20 <key>WorkingDirectory</key>\n  <string>{}</string>\n\
         \x20 <key>EnvironmentVariables</key>\n  <dict>\n{environment_entries}  </dict>\n\
         \x20 <key>RunAtLoad</key>\n  <true/>\n\
         \x20 <key>KeepAlive</key>\n  <dict>\n    <key>SuccessfulExit</key>\n    <false/>\n  </dict>\n\
         \x20 <key>StandardOutPath</key>\n  <string>{log}</string>\n\
         \x20 <key>StandardErrorPath</key>\n  <string>{log}</string>\n\
         </dict>\n\
         </plist>\n",
        xml(&marker(&unit.root)).replace("--", "- -"),
        xml(label),
        xml(&unit.executable.display().to_string()),
        xml(&unit.data_dir.display().to_string()),
    )
}

fn run(program: &str, args: &[&str]) -> Result<(), String> {
    let output = crate::operation_context::process_output(
        crate::operation_context::command(program).args(args),
    )
    .map_err(|error| format!("could not run {program}: {error}"))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(format!(
            "`{program} {}` failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&output.stderr).trim()
        ))
    }
}

fn launchd_domain() -> Result<String, String> {
    let output =
        crate::operation_context::process_output(crate::operation_context::command("id").arg("-u"))
            .map_err(|error| format!("could not run id -u: {error}"))?;
    let uid = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if uid.is_empty() || !uid.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err("could not determine the user id for launchctl".to_string());
    }
    Ok(format!("gui/{uid}"))
}

fn record_path(root: &Path) -> PathBuf {
    root.join("state").join(RECORD)
}

/// The installed service of `root`, if any.
#[must_use]
pub fn installed(root: &Path) -> Option<Record> {
    let bytes = std::fs::read(record_path(root)).ok()?;
    serde_json::from_slice(&bytes).ok()
}

/// Write the unit and the secret file for the host deployment of `root`, and
/// enable the unit with its service manager.
///
/// # Errors
///
/// When the deployment is not in host mode, another root owns the unit name,
/// a file cannot be written, or the service manager refuses.
pub fn install(root: &Path, token_secret: &str) -> Result<Record, String> {
    link_assistant_router::token_secret::ensure_real(token_secret)?;
    let host = super::state::State::new(root)
        .host()?
        .ok_or("--install-service supervises a host deployment; deploy with --mode host first")?;
    let manager = Manager::detect()?;
    let (name, file) = names(manager);
    let path = unit_path(manager, &file)?;
    if let Ok(existing) = std::fs::read_to_string(&path)
        && !written_for(&existing, root)
    {
        return Err(format!(
            "{} belongs to another deployment; remove it with `router deploy --uninstall-service --root DIR` for that root, or use --instance",
            path.display()
        ));
    }
    let state = root.join("state");
    let secret = state.join(SECRET);
    let unit = Unit {
        root: root.to_path_buf(),
        executable: PathBuf::from(&host.executable),
        port: host.port,
        data_dir: root.join("data"),
        secret_file: secret.clone(),
        log: state.join("host.log"),
    };
    for value in [&unit.executable, &unit.data_dir, &unit.secret_file] {
        if value.to_string_lossy().contains(['\n', '\r', '\0']) {
            return Err(format!("{} cannot be written into a unit", value.display()));
        }
    }
    let write = |path: &Path, bytes: &[u8]| {
        link_assistant_router::durable_file::atomic_write_owner_only(path, bytes).map_err(|error| {
            link_assistant_router::durable_file::describe_write_failure(path, &error)
        })
    };
    write(&secret, format!("{token_secret}\n").as_bytes())?;
    let text = match manager {
        Manager::Systemd => systemd_unit(&unit),
        Manager::Launchd => launchd_plist(&unit, &name),
    };
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("could not create {}: {error}", parent.display()))?;
    }
    write(&path, text.as_bytes())?;
    let record = Record {
        manager,
        name: name.clone(),
        unit: path.clone(),
        secret,
    };
    let encoded = serde_json::to_vec_pretty(&record).map_err(|error| error.to_string())?;
    write(&record_path(root), &encoded)?;
    match manager {
        Manager::Systemd => {
            run("systemctl", &["--user", "daemon-reload"])?;
            run("systemctl", &["--user", "enable", &name])?;
        }
        Manager::Launchd => {
            let domain = launchd_domain()?;
            run("launchctl", &["enable", &format!("{domain}/{name}")])?;
        }
    }
    println!(
        "host_service=installed manager={} name={name} unit={}",
        manager.as_str(),
        path.display()
    );
    if manager == Manager::Systemd {
        println!(
            "note: a systemd user unit starts at login; run `loginctl enable-linger` to start it at boot without one"
        );
    }
    Ok(record)
}

/// Stop a service-started Router so a deploy can start its own on the port.
/// A service that is not running is not an error.
pub fn stop(record: &Record) {
    let _ = match record.manager {
        Manager::Systemd => run("systemctl", &["--user", "stop", &record.name]),
        Manager::Launchd => launchd_domain().and_then(|domain| {
            run(
                "launchctl",
                &["bootout", &format!("{domain}/{}", record.name)],
            )
        }),
    };
}

/// Disable and remove the service of `root`; `Ok(false)` when none was
/// installed.
///
/// # Errors
///
/// When a file cannot be removed or the service manager refuses to disable.
pub fn uninstall(root: &Path) -> Result<bool, String> {
    let Some(record) = installed(root) else {
        return Ok(false);
    };
    stop(&record);
    match record.manager {
        Manager::Systemd => run("systemctl", &["--user", "disable", &record.name])?,
        Manager::Launchd => {
            let domain = launchd_domain()?;
            run(
                "launchctl",
                &["disable", &format!("{domain}/{}", record.name)],
            )?;
        }
    }
    for path in [&record.unit, &record.secret, &record_path(root)] {
        match std::fs::remove_file(path) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(format!("could not remove {}: {error}", path.display())),
        }
    }
    if record.manager == Manager::Systemd {
        run("systemctl", &["--user", "daemon-reload"])?;
    }
    println!(
        "host_service=uninstalled manager={} name={}",
        record.manager.as_str(),
        record.name
    );
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unit() -> Unit {
        Unit {
            root: PathBuf::from("/srv/router 50%"),
            executable: PathBuf::from("/opt/router/bin/router"),
            port: 18080,
            data_dir: PathBuf::from("/srv/router 50%/data"),
            secret_file: PathBuf::from("/srv/router 50%/state/token-secret"),
            log: PathBuf::from("/srv/router 50%/state/host.log"),
        }
    }

    #[test]
    fn the_systemd_unit_names_the_secret_file_and_quotes_paths() {
        let text = systemd_unit(&unit());
        assert!(
            text.contains("ExecStart=\"/opt/router/bin/router\" serve"),
            "{text}"
        );
        assert!(
            text.contains("Environment=\"ROUTER_HOST=127.0.0.1\""),
            "{text}"
        );
        assert!(text.contains("Environment=\"ROUTER_PORT=18080\""), "{text}");
        assert!(
            text.contains("Environment=\"TOKEN_SECRET_FILE=/srv/router 50%%/state/token-secret\""),
            "{text}"
        );
        assert!(text.contains("Restart=on-failure"), "{text}");
        // WorkingDirectory= takes a bare path; quotes would stop the unit
        // from loading.
        assert!(
            text.contains("WorkingDirectory=/srv/router 50%%/data\n"),
            "{text}"
        );
        assert!(
            text.contains("StandardOutput=append:/srv/router 50%%/state/host.log\n"),
            "{text}"
        );
        assert!(!text.contains("TOKEN_SECRET="), "{text}");
    }

    #[test]
    fn the_launchd_agent_restarts_on_failure_and_escapes_xml() {
        let mut unit = unit();
        unit.root = PathBuf::from("/srv/a&b--c");
        let text = launchd_plist(&unit, "com.link-assistant.router");
        assert!(text.contains("<key>KeepAlive</key>"), "{text}");
        assert!(
            text.contains("<key>SuccessfulExit</key>\n    <false/>"),
            "{text}"
        );
        assert!(text.contains("<string>serve</string>"), "{text}");
        assert!(text.contains("/srv/a&amp;b- -c"), "{text}");
        assert!(
            !text.contains("<!-- Written by router deploy install-service (root=/srv/a&amp;b--c")
        );
    }

    #[test]
    fn a_unit_belongs_only_to_the_exact_root_it_names() {
        let mut unit = unit();
        unit.root = PathBuf::from("/srv/r2");
        let systemd = systemd_unit(&unit);
        assert!(written_for(&systemd, Path::new("/srv/r2")));
        assert!(!written_for(&systemd, Path::new("/srv/r")));
        unit.root = PathBuf::from("/srv/a--b2");
        let plist = launchd_plist(&unit, "com.link-assistant.router");
        assert!(written_for(&plist, Path::new("/srv/a--b2")));
        assert!(!written_for(&plist, Path::new("/srv/a--b")));
    }
}
