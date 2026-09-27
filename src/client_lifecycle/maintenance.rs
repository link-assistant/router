//! Conservative local binary maintenance with explicit unsupported results.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode, Stdio};

use serde::Serialize;

use super::{backup_root, clients, lock_operations, profiles, refuse_active};
use crate::cli::MaintenanceArgs;
use crate::clients::ClientKind;

#[derive(Serialize)]
struct Plan {
    client: String,
    operation: String,
    status: String,
    method: String,
    channel: Option<String>,
    binary: Option<String>,
    version_before: Option<String>,
    command: Vec<String>,
    reason: Option<String>,
    preserved_profiles: Vec<String>,
    backup_id: Option<String>,
    version_after: Option<String>,
}

fn binary(name: &str) -> Option<PathBuf> {
    let path = std::env::var_os("PATH")?;
    for directory in std::env::split_paths(&path) {
        let candidate = directory.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
        #[cfg(windows)]
        {
            for extension in ["exe", "cmd", "bat"] {
                let candidate = directory.join(format!("{name}.{extension}"));
                if candidate.is_file() {
                    return Some(candidate);
                }
            }
        }
    }
    None
}

fn version(path: &Path) -> Option<String> {
    let output = Command::new(path)
        .arg("--version")
        .stderr(Stdio::null())
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout).trim().to_owned();
    (!text.is_empty()).then_some(text)
}

fn npm_root() -> Option<PathBuf> {
    let output = Command::new(binary("npm")?)
        .args(["root", "-g"])
        .stderr(Stdio::null())
        .output()
        .ok()?;
    output
        .status
        .success()
        .then(|| PathBuf::from(String::from_utf8_lossy(&output.stdout).trim()))
}

const fn package(client: ClientKind) -> Option<&'static str> {
    match client {
        ClientKind::Codex => Some("@openai/codex"),
        ClientKind::ClaudeCode => Some("@anthropic-ai/claude-code"),
        ClientKind::GeminiCli => Some("@google/gemini-cli"),
        ClientKind::Opencode => Some("opencode-ai"),
        ClientKind::QwenCode => Some("@qwen-code/qwen-code"),
        ClientKind::Cursor | ClientKind::GrokCli | ClientKind::Agent => None,
    }
}

fn valid_channel(client: ClientKind, channel: &str) -> bool {
    match client {
        ClientKind::GeminiCli => matches!(channel, "latest" | "preview" | "nightly"),
        _ => channel == "latest",
    }
}

fn detected_channel(
    home: Option<&Path>,
    client: ClientKind,
    method: &str,
    path: Option<&Path>,
) -> Option<String> {
    if method == "brew" && client == ClientKind::ClaudeCode {
        let path = path?.to_string_lossy();
        return Some(
            if path.contains("claude-code@latest") {
                "latest"
            } else {
                "stable"
            }
            .into(),
        );
    }
    if method == "native" && client == ClientKind::ClaudeCode {
        let configured = profiles(home, client, crate::cli::ProfileSelection::Normal)
            .ok()
            .and_then(|profiles| profiles.into_iter().next())
            .and_then(|profile| {
                profile
                    .stores
                    .first()
                    .map(|store| store.path.join("settings.json"))
            })
            .and_then(|settings| fs::read(settings).ok())
            .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok())
            .and_then(|value| value["autoUpdatesChannel"].as_str().map(str::to_owned));
        return Some(configured.unwrap_or_else(|| "latest".into()));
    }
    if method == "native"
        && matches!(
            client,
            ClientKind::Cursor | ClientKind::Opencode | ClientKind::QwenCode
        )
    {
        return Some("latest".into());
    }
    None
}

fn method_for(client: ClientKind, path: &Path) -> String {
    let resolved = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let text = resolved.to_string_lossy().replace('\\', "/");
    let raw = path.to_string_lossy().replace('\\', "/");
    if let Some(root) = npm_root() {
        let root = fs::canonicalize(&root).unwrap_or(root);
        if resolved.starts_with(&root) {
            return "npm".into();
        }
        #[cfg(windows)]
        if path.parent() == root.parent() {
            return "npm".into();
        }
    }
    if text.contains("/Cellar/") || text.contains("/Caskroom/") {
        return "brew".into();
    }
    if client == ClientKind::ClaudeCode
        && (text.contains("/.local/share/claude/") || raw.ends_with("/.local/bin/claude"))
    {
        return "native".into();
    }
    if client == ClientKind::Cursor && raw.ends_with("/.local/bin/cursor-agent") {
        return "native".into();
    }
    if client == ClientKind::Opencode && text.contains("/.opencode/bin/") {
        return "native".into();
    }
    if client == ClientKind::QwenCode && raw.ends_with("/.local/bin/qwen") {
        return "native".into();
    }
    "unknown".into()
}

fn command_for(
    client: ClientKind,
    operation: &str,
    method: &str,
    channel: Option<&str>,
    path: Option<&Path>,
) -> Result<Vec<String>, String> {
    match method {
        "npm" => {
            let package =
                package(client).ok_or("no verified vendor npm package for this client")?;
            let channel =
                channel.ok_or("npm channel is unknown; select --latest or --channel explicitly")?;
            if !valid_channel(client, channel) {
                return Err("vendor does not document this npm channel".into());
            }
            let mut command = vec![
                "npm".into(),
                "install".into(),
                "-g".into(),
                format!("{package}@{channel}"),
            ];
            if operation == "reinstall" {
                command.push("--force".into());
            }
            Ok(command)
        }
        "native" if client == ClientKind::ClaudeCode => {
            let path = path.ok_or("Claude binary is missing")?;
            if channel.is_some_and(|channel| !matches!(channel, "stable" | "latest")) {
                return Err("Claude native channel must be stable or latest".into());
            }
            let mut command = vec![path.to_string_lossy().into_owned()];
            if operation == "update" {
                if channel.is_some() {
                    return Err("Claude native update follows its configured channel; use reinstall for a new channel".into());
                }
                command.push("update".into());
            } else {
                command.push("install".into());
                if let Some(channel) = channel {
                    command.push(channel.into());
                }
            }
            Ok(command)
        }
        "native" if client == ClientKind::Cursor && operation == "update" && channel.is_none() => {
            Ok(vec![
                path.ok_or("Cursor binary is missing")?
                    .to_string_lossy()
                    .into_owned(),
                "update".into(),
            ])
        }
        "native"
            if client == ClientKind::Opencode && operation == "update" && channel.is_none() =>
        {
            Ok(vec![
                path.ok_or("OpenCode binary is missing")?
                    .to_string_lossy()
                    .into_owned(),
                "upgrade".into(),
            ])
        }
        "native"
            if client == ClientKind::QwenCode && operation == "update" && channel.is_none() =>
        {
            Ok(vec![
                path.ok_or("Qwen binary is missing")?
                    .to_string_lossy()
                    .into_owned(),
                "update".into(),
            ])
        }
        "brew" if channel.is_none() || operation == "install" => {
            if operation == "install"
                && client != ClientKind::ClaudeCode
                && !matches!(channel, None | Some("latest"))
            {
                return Err("this Homebrew formula has no documented alternate channel".into());
            }
            let formula = match client {
                ClientKind::ClaudeCode => {
                    if operation == "install" {
                        if channel == Some("latest") {
                            "claude-code@latest"
                        } else if channel == Some("stable") {
                            "claude-code"
                        } else {
                            return Err("choose --channel stable or --latest for a fresh Claude Homebrew install".into());
                        }
                    } else if path
                        .is_some_and(|path| path.to_string_lossy().contains("claude-code@latest"))
                    {
                        "claude-code@latest"
                    } else {
                        "claude-code"
                    }
                }
                ClientKind::GeminiCli => "gemini-cli",
                ClientKind::Opencode => "opencode",
                ClientKind::QwenCode => "qwen-code",
                _ => return Err("Homebrew formula is not verified for this client".into()),
            };
            let mut command = vec!["brew".into()];
            command.push(
                if operation == "reinstall" {
                    "reinstall"
                } else if operation == "install" {
                    "install"
                } else {
                    "upgrade"
                }
                .into(),
            );
            command.push(formula.into());
            Ok(command)
        }
        "unknown" => Err(
            "install method could not be proved from the selected binary; no command will run"
                .into(),
        ),
        _ => Err("vendor does not document this operation for the detected method/channel".into()),
    }
}

fn plan(home: Option<&Path>, operation: &str, client: ClientKind, args: &MaintenanceArgs) -> Plan {
    let found = binary(client.command());
    let version_before = found.as_deref().and_then(version);
    let method = if operation == "install" && found.is_none() {
        args.method.clone().unwrap_or_else(|| "unknown".into())
    } else {
        found
            .as_deref()
            .map_or_else(|| "unknown".into(), |path| method_for(client, path))
    };
    let requested_channel = args
        .channel
        .clone()
        .or_else(|| args.latest.then(|| "latest".into()));
    let channel = requested_channel
        .clone()
        .or_else(|| detected_channel(home, client, &method, found.as_deref()));
    let preserved_profiles = match args.selection.profile {
        crate::cli::ProfileSelection::Both => vec!["normal".into(), "router (if present)".into()],
        crate::cli::ProfileSelection::Normal => vec!["normal".into()],
        crate::cli::ProfileSelection::Router => vec!["router (if present)".into()],
    };
    let mut result = Plan {
        client: client.canonical_name().into(),
        operation: operation.into(),
        status: "planned".into(),
        method: method.clone(),
        channel: channel.clone(),
        binary: found
            .as_ref()
            .map(|path| path.to_string_lossy().into_owned()),
        version_before,
        command: Vec::new(),
        reason: None,
        preserved_profiles,
        backup_id: None,
        version_after: None,
    };
    if args.method.is_some() && operation != "install" {
        result.status = "unsupported".into();
        result.reason = Some(
            "--method is only for a fresh install; existing methods are detected from the binary"
                .into(),
        );
        return result;
    }
    if operation == "install" && found.is_some() {
        result.status = "unsupported".into();
        result.reason = Some("already installed; use update or reinstall".into());
        return result;
    }
    if operation != "install" && found.is_none() {
        result.status = "unsupported".into();
        result.reason = Some("binary is not installed or not on PATH".into());
        return result;
    }
    if method == "unknown" && operation == "install" {
        result.reason = Some(
            "fresh install requires --method; supported method: npm for documented npm packages"
                .into(),
        );
        result.status = "unsupported".into();
        return result;
    }
    if let Err(error) = refuse_active(client, home) {
        result.status = "blocked".into();
        result.reason = Some(error);
        return result;
    }
    if operation == "reinstall" {
        let scopes = [
            crate::cli::ProfileSelection::Normal,
            crate::cli::ProfileSelection::Router,
        ];
        for scope in scopes {
            if let Ok(profiles) = profiles(home, client, scope) {
                for profile in profiles {
                    if profile.stores.iter().any(|store| store.path.exists()) {
                        result.preserved_profiles.push(profile.scope.into());
                    }
                }
            }
        }
    }
    let command_channel =
        if operation == "reinstall" && method == "native" && client == ClientKind::ClaudeCode {
            channel.as_deref()
        } else {
            requested_channel.as_deref()
        };
    match command_for(
        client,
        operation,
        &method,
        command_channel,
        found.as_deref(),
    ) {
        Ok(command) => {
            if command.first().is_some_and(|executable| {
                !Path::new(executable).is_absolute() && binary(executable).is_none()
            }) {
                result.status = "unsupported".into();
                result.reason = Some(format!("required installer {} is not on PATH", command[0]));
            } else {
                result.command = command;
            }
        }
        Err(error) => {
            result.status = "unsupported".into();
            result.reason = Some(error);
        }
    }
    if client == ClientKind::ClaudeCode && std::env::var_os("DISABLE_UPDATES").is_some() {
        result.status = "blocked".into();
        result.reason = Some("DISABLE_UPDATES is set; unset it for this operation".into());
    }
    result
}

pub fn run(home: Option<&Path>, operation: &str, args: &MaintenanceArgs) -> ExitCode {
    let root = match backup_root(home, None) {
        Ok(root) => root,
        Err(error) => return super::failed(error),
    };
    let _lock = if args.dry_run {
        None
    } else {
        match lock_operations(&root) {
            Ok(lock) => Some(lock),
            Err(error) => return super::failed(error),
        }
    };
    let mut plans = clients(&args.selection)
        .into_iter()
        .map(|client| plan(home, operation, client, args))
        .collect::<Vec<_>>();
    if !args.dry_run {
        for plan in &mut plans {
            if plan.status != "planned" {
                continue;
            }
            let client = ClientKind::from_str_opt(&plan.client).expect("known client");
            if operation == "reinstall" && !args.yes {
                plan.status = "blocked".into();
                plan.reason = Some("reinstall requires --yes after reviewing --dry-run".into());
                continue;
            }
            if operation == "reinstall" {
                let mut selected = Vec::new();
                for scope in [
                    crate::cli::ProfileSelection::Normal,
                    crate::cli::ProfileSelection::Router,
                ] {
                    if let Ok(profiles) = profiles(home, client, scope) {
                        selected.extend(profiles.into_iter().filter(|profile| {
                            profile.stores.iter().any(|store| store.path.exists())
                        }));
                    }
                }
                if selected.is_empty() {
                    plan.status = "blocked".into();
                    plan.reason =
                        Some("no profile is available for verified recovery backup".into());
                    continue;
                }
                match super::backup::create_unlocked(&root, home, &selected, true) {
                    Ok(id) => plan.backup_id = Some(id),
                    Err(error) => {
                        plan.status = "blocked".into();
                        plan.reason = Some(format!("pre-reinstall backup failed: {error}"));
                        continue;
                    }
                }
            }
            let executable = &plan.command[0];
            let executable = binary(executable).unwrap_or_else(|| PathBuf::from(executable));
            let status = Command::new(&executable).args(&plan.command[1..]).status();
            if !status.is_ok_and(|status| status.success()) {
                let after = binary(client.command());
                let after_version = after.as_deref().and_then(version);
                let changed = after
                    .as_ref()
                    .map(|path| path.to_string_lossy().into_owned())
                    != plan.binary
                    || after_version != plan.version_before;
                plan.status = if changed { "partial" } else { "failed" }.into();
                plan.version_after = after_version;
                plan.reason = Some(if changed {
                    "vendor command failed after changing the binary; inspect the installation before retrying"
                } else {
                    "vendor installer/updater failed; the previous binary appears unchanged"
                }.into());
                continue;
            }
            let after = binary(client.command());
            let after_version = after.as_deref().and_then(version);
            if after.is_none() || after_version.is_none() {
                plan.status = "failed".into();
                plan.reason = Some(
                    "installer exited successfully, but binary path/version verification failed"
                        .into(),
                );
                continue;
            }
            plan.binary = after.map(|path| path.to_string_lossy().into_owned());
            plan.version_after = after_version;
            plan.status = if operation == "update" && plan.version_after == plan.version_before {
                "current"
            } else {
                "completed"
            }
            .into();
        }
    }
    if args.json {
        println!(
            "{}",
            serde_json::to_string_pretty(&plans).unwrap_or_default()
        );
    } else {
        for plan in &plans {
            println!(
                "{} {}: {} ({})",
                plan.client, plan.operation, plan.status, plan.method
            );
            if args.dry_run && !plan.command.is_empty() {
                println!("  command: {}", plan.command.join(" "));
            }
            if let Some(reason) = &plan.reason {
                eprintln!("  {reason}");
            }
            if let Some(id) = &plan.backup_id {
                println!("  verified backup: {id}");
            }
        }
    }
    if plans
        .iter()
        .all(|plan| matches!(plan.status.as_str(), "planned" | "completed" | "current"))
    {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(1)
    }
}
