//! Regression coverage for issue #607's local client profile lifecycle.

mod common;

use common::{router, router_with_env};
use std::fs;

#[test]
fn claude_backup_merge_preserves_new_sessions_and_authentication() {
    let home = tempfile::tempdir().expect("home");
    let profile = home.path().join(".claude");
    fs::create_dir_all(profile.join("projects")).expect("profile");
    fs::write(profile.join("projects/old.jsonl"), b"old session").expect("session");
    fs::write(profile.join(".credentials.json"), b"original login").expect("auth");
    fs::write(home.path().join(".claude.json"), b"legacy login").expect("legacy auth");
    fs::write(profile.join("settings.json"), b"{\"theme\":\"dark\"}").expect("settings");

    let created = router(home.path(), &["clients", "backup", "create", "claude"]);
    assert!(
        created.status.success(),
        "{}",
        String::from_utf8_lossy(&created.stderr)
    );
    let id = String::from_utf8(created.stdout).expect("backup id");
    let id = id.trim();
    assert!(!id.is_empty());
    let backup = home
        .path()
        .join(".config/link-assistant-router/client-backups")
        .join(id);
    assert!(!backup.join("data/claude/normal/legacy-settings").exists());

    fs::remove_file(profile.join("projects/old.jsonl")).expect("remove old session");
    fs::write(profile.join("projects/new.jsonl"), b"new session").expect("new session");
    fs::write(profile.join(".credentials.json"), b"new login").expect("new auth");
    for _ in 0..2 {
        let restored = router(home.path(), &["clients", "backup", "restore", id]);
        assert!(
            restored.status.success(),
            "{}",
            String::from_utf8_lossy(&restored.stderr)
        );
    }
    assert_eq!(
        fs::read(profile.join("projects/old.jsonl")).unwrap(),
        b"old session"
    );
    assert_eq!(
        fs::read(profile.join("projects/new.jsonl")).unwrap(),
        b"new session"
    );
    assert_eq!(
        fs::read(profile.join(".credentials.json")).unwrap(),
        b"new login"
    );
    assert_eq!(
        fs::read(home.path().join(".claude.json")).unwrap(),
        b"legacy login"
    );
}

#[test]
fn settings_reset_keeps_claude_sessions_and_authentication() {
    let home = tempfile::tempdir().expect("home");
    let profile = home.path().join(".claude");
    fs::create_dir_all(profile.join("projects")).expect("profile");
    fs::write(profile.join("projects/session.jsonl"), b"session").expect("session");
    fs::write(profile.join(".credentials.json"), b"login").expect("auth");
    fs::write(profile.join("settings.json"), b"{\"theme\":\"dark\"}").expect("settings");

    let reset = router(home.path(), &["clients", "reset", "claude"]);
    assert!(
        reset.status.success(),
        "{}",
        String::from_utf8_lossy(&reset.stderr)
    );
    assert!(!profile.join("settings.json").exists());
    assert_eq!(
        fs::read(profile.join("projects/session.jsonl")).unwrap(),
        b"session"
    );
    assert_eq!(
        fs::read(profile.join(".credentials.json")).unwrap(),
        b"login"
    );
}

#[test]
fn backup_and_merge_cover_all_eight_client_homes() {
    for (client, relative) in [
        ("codex", ".codex"),
        ("claude", ".claude"),
        ("cursor-agent", ".cursor"),
        ("gemini", ".gemini"),
        ("grok", ".grok"),
        ("opencode", ".config/opencode"),
        ("qwen", ".qwen"),
        ("agent", ".config/link-assistant-agent"),
    ] {
        let home = tempfile::tempdir().expect("home");
        let profile = home.path().join(relative);
        fs::create_dir_all(profile.join("sessions")).expect("profile");
        fs::write(profile.join("sessions/old.jsonl"), b"old").expect("old session");
        fs::write(profile.join("auth.json"), b"old login").expect("auth");
        let created = router(home.path(), &["clients", "backup", "create", client]);
        assert!(
            created.status.success(),
            "{client}: {}",
            String::from_utf8_lossy(&created.stderr)
        );
        let id = String::from_utf8(created.stdout).unwrap();
        let store = if matches!(client, "opencode" | "agent") {
            "config"
        } else {
            "home"
        };
        assert!(
            !home
                .path()
                .join(".config/link-assistant-router/client-backups")
                .join(id.trim())
                .join(format!("data/{client}/normal/{store}/auth.json"))
                .exists(),
            "{client} auth was exported"
        );
        fs::remove_file(profile.join("sessions/old.jsonl")).unwrap();
        fs::write(profile.join("sessions/new.jsonl"), b"new").unwrap();
        fs::write(profile.join("auth.json"), b"new login").unwrap();
        let restored = router(home.path(), &["clients", "backup", "restore", id.trim()]);
        assert!(
            restored.status.success(),
            "{client}: {}",
            String::from_utf8_lossy(&restored.stderr)
        );
        assert_eq!(
            fs::read(profile.join("sessions/old.jsonl")).unwrap(),
            b"old"
        );
        assert_eq!(
            fs::read(profile.join("sessions/new.jsonl")).unwrap(),
            b"new"
        );
        assert_eq!(fs::read(profile.join("auth.json")).unwrap(), b"new login");
    }
}

#[test]
fn tampering_and_symlink_escapes_fail_closed() {
    let home = tempfile::tempdir().expect("home");
    let profile = home.path().join(".claude");
    fs::create_dir_all(&profile).unwrap();
    fs::write(profile.join("session.jsonl"), b"original").unwrap();
    let created = router(home.path(), &["clients", "backup", "create", "claude"]);
    assert!(
        created.status.success(),
        "{}",
        String::from_utf8_lossy(&created.stderr)
    );
    let id = String::from_utf8(created.stdout).unwrap();
    let id = id.trim();
    let backed_up = home
        .path()
        .join(".config/link-assistant-router/client-backups")
        .join(id);
    fs::write(
        backed_up.join("data/claude/normal/home/session.jsonl"),
        b"tampered",
    )
    .unwrap();
    let verified = router(home.path(), &["clients", "backup", "verify", id]);
    assert!(!verified.status.success());
    assert!(String::from_utf8_lossy(&verified.stderr).contains("checksum"));

    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(home.path(), profile.join("escape")).unwrap();
        let rejected = router(home.path(), &["clients", "backup", "create", "claude"]);
        assert!(!rejected.status.success());
        assert!(String::from_utf8_lossy(&rejected.stderr).contains("symlink escapes"));
    }
}

#[test]
fn router_owned_claude_profile_resets_independently() {
    let home = tempfile::tempdir().expect("home");
    let normal = home.path().join(".claude");
    let owned = home
        .path()
        .join(".config/link-assistant-router/clients/claude/home");
    for profile in [&normal, &owned] {
        fs::create_dir_all(profile.join("projects")).unwrap();
        fs::write(profile.join("projects/session.jsonl"), b"session").unwrap();
        fs::write(profile.join("settings.json"), b"{\"theme\":\"dark\"}").unwrap();
    }
    let reset = router(
        home.path(),
        &["clients", "reset", "claude", "--profile", "router"],
    );
    assert!(
        reset.status.success(),
        "{}",
        String::from_utf8_lossy(&reset.stderr)
    );
    assert!(!owned.join("settings.json").exists());
    assert!(owned.join("projects/session.jsonl").exists());
    assert!(normal.join("settings.json").exists());
}

#[test]
fn normal_and_router_claude_backups_restore_sessions_independently() {
    let home = tempfile::tempdir().unwrap();
    let normal = home.path().join(".claude");
    let owned = home
        .path()
        .join(".config/link-assistant-router/clients/claude/home");
    for (profile, session) in [(&normal, "normal"), (&owned, "router")] {
        fs::create_dir_all(profile.join("projects")).unwrap();
        fs::write(profile.join("projects/session.jsonl"), session).unwrap();
    }
    let normal_backup = router(home.path(), &["clients", "backup", "create", "claude"]);
    let router_backup = router(
        home.path(),
        &[
            "clients",
            "backup",
            "create",
            "claude",
            "--profile",
            "router",
        ],
    );
    assert!(normal_backup.status.success());
    assert!(router_backup.status.success());
    let normal_id = String::from_utf8(normal_backup.stdout).unwrap();
    let router_id = String::from_utf8(router_backup.stdout).unwrap();
    fs::remove_file(normal.join("projects/session.jsonl")).unwrap();
    fs::remove_file(owned.join("projects/session.jsonl")).unwrap();
    let restored_normal = router(
        home.path(),
        &["clients", "backup", "restore", normal_id.trim()],
    );
    assert!(
        restored_normal.status.success(),
        "{}",
        String::from_utf8_lossy(&restored_normal.stderr)
    );
    assert_eq!(
        fs::read(normal.join("projects/session.jsonl")).unwrap(),
        b"normal"
    );
    assert!(!owned.join("projects/session.jsonl").exists());
    let restored_router = router(
        home.path(),
        &["clients", "backup", "restore", router_id.trim()],
    );
    assert!(
        restored_router.status.success(),
        "{}",
        String::from_utf8_lossy(&restored_router.stderr)
    );
    assert_eq!(
        fs::read(owned.join("projects/session.jsonl")).unwrap(),
        b"router"
    );
}

#[test]
fn overwrite_requires_confirmation_and_keeps_verified_recovery() {
    let home = tempfile::tempdir().unwrap();
    let profile = home.path().join(".claude");
    fs::create_dir_all(&profile).unwrap();
    fs::write(profile.join("session.jsonl"), b"old").unwrap();
    let created = router(home.path(), &["clients", "backup", "create", "claude"]);
    assert!(
        created.status.success(),
        "{}",
        String::from_utf8_lossy(&created.stderr)
    );
    let id = String::from_utf8(created.stdout).unwrap();
    fs::write(profile.join("session.jsonl"), b"new").unwrap();
    let refused = router(
        home.path(),
        &["clients", "backup", "restore", id.trim(), "--overwrite"],
    );
    assert!(!refused.status.success());
    assert_eq!(fs::read(profile.join("session.jsonl")).unwrap(), b"new");
    let restored = router(
        home.path(),
        &[
            "clients",
            "backup",
            "restore",
            id.trim(),
            "--overwrite",
            "--yes",
        ],
    );
    assert!(
        restored.status.success(),
        "{}",
        String::from_utf8_lossy(&restored.stderr)
    );
    assert_eq!(fs::read(profile.join("session.jsonl")).unwrap(), b"old");
    let stderr = String::from_utf8_lossy(&restored.stderr);
    let recovery = stderr
        .lines()
        .find_map(|line| line.strip_prefix("verified recovery backup: "))
        .unwrap();
    let verified = router(home.path(), &["clients", "backup", "verify", recovery]);
    assert!(
        verified.status.success(),
        "{}",
        String::from_utf8_lossy(&verified.stderr)
    );
}

#[test]
fn full_reset_removes_selected_profile_after_complete_backup() {
    let home = tempfile::tempdir().unwrap();
    let profile = home.path().join(".claude");
    fs::create_dir_all(profile.join("projects")).unwrap();
    fs::write(profile.join("projects/session.jsonl"), b"session").unwrap();
    fs::write(profile.join(".credentials.json"), b"login").unwrap();
    fs::write(profile.join("settings.json"), b"{}").unwrap();
    let denied = router(home.path(), &["clients", "reset", "claude", "--full"]);
    assert!(!denied.status.success());
    assert!(profile.join("projects/session.jsonl").exists());
    let result = router(
        home.path(),
        &["clients", "reset", "claude", "--full", "--yes", "--json"],
    );
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    assert!(!profile.join("projects/session.jsonl").exists());
    assert!(!profile.join(".credentials.json").exists());
    let rows: serde_json::Value = serde_json::from_slice(&result.stdout).unwrap();
    let id = rows[0]["backup_id"].as_str().unwrap();
    let verified = router(home.path(), &["clients", "backup", "verify", id]);
    assert!(
        verified.status.success(),
        "{}",
        String::from_utf8_lossy(&verified.stderr)
    );
}

#[test]
fn all_eight_settings_resets_keep_auth_and_sessions() {
    for (client, relative, setting, text) in [
        ("codex", ".codex", "config.toml", "model = 'x'"),
        ("claude", ".claude", "settings.json", "{}"),
        ("cursor-agent", ".cursor", "cli-config.json", "{}"),
        ("gemini", ".gemini", "settings.json", "{}"),
        ("grok", ".grok", "user-settings.json", "{}"),
        ("opencode", ".config/opencode", "opencode.json", "{}"),
        ("qwen", ".qwen", "settings.json", "{}"),
        (
            "agent",
            ".config/link-assistant-agent",
            "opencode.json",
            "{}",
        ),
    ] {
        let home = tempfile::tempdir().unwrap();
        let profile = home.path().join(relative);
        fs::create_dir_all(profile.join("sessions")).unwrap();
        fs::write(profile.join("sessions/one.jsonl"), b"session").unwrap();
        fs::write(profile.join("auth.json"), b"login").unwrap();
        fs::write(profile.join(setting), text).unwrap();
        let reset = router(home.path(), &["clients", "reset", client]);
        assert!(
            reset.status.success(),
            "{client}: {}",
            String::from_utf8_lossy(&reset.stderr)
        );
        assert!(!profile.join(setting).exists(), "{client}");
        assert_eq!(
            fs::read(profile.join("sessions/one.jsonl")).unwrap(),
            b"session"
        );
        assert_eq!(fs::read(profile.join("auth.json")).unwrap(), b"login");
    }
}

#[test]
fn documented_gemini_and_qwen_overrides_are_inventoried() {
    let home = tempfile::tempdir().unwrap();
    let gemini_parent = home.path().join("gemini-parent");
    let gemini = gemini_parent.join(".gemini");
    fs::create_dir_all(&gemini).unwrap();
    fs::write(gemini.join("session.jsonl"), b"gemini session").unwrap();
    let created = router_with_env(
        home.path(),
        &["clients", "backup", "create", "gemini"],
        &[("GEMINI_CLI_HOME", gemini_parent.to_str().unwrap())],
    );
    assert!(
        created.status.success(),
        "{}",
        String::from_utf8_lossy(&created.stderr)
    );
    let id = String::from_utf8(created.stdout).unwrap();
    let saved = home
        .path()
        .join(".config/link-assistant-router/client-backups")
        .join(id.trim())
        .join("data/gemini/normal/home/session.jsonl");
    assert_eq!(fs::read(saved).unwrap(), b"gemini session");

    let qwen = home.path().join("qwen-profile");
    let runtime = home.path().join("qwen-runtime");
    fs::create_dir_all(&qwen).unwrap();
    fs::create_dir_all(&runtime).unwrap();
    fs::write(qwen.join("settings.json"), b"{}").unwrap();
    fs::write(runtime.join("conversation.jsonl"), b"qwen session").unwrap();
    let created = router_with_env(
        home.path(),
        &["clients", "backup", "create", "qwen"],
        &[
            ("QWEN_HOME", qwen.to_str().unwrap()),
            ("QWEN_RUNTIME_DIR", runtime.to_str().unwrap()),
        ],
    );
    assert!(
        created.status.success(),
        "{}",
        String::from_utf8_lossy(&created.stderr)
    );
    let id = String::from_utf8(created.stdout).unwrap();
    let saved = home
        .path()
        .join(".config/link-assistant-router/client-backups")
        .join(id.trim())
        .join("data/qwen/normal/runtime/conversation.jsonl");
    assert_eq!(fs::read(saved).unwrap(), b"qwen session");
}

#[cfg(unix)]
#[test]
fn backup_preserves_internal_symlink_and_private_permissions() {
    use std::os::unix::fs::{PermissionsExt, symlink};
    let home = tempfile::tempdir().unwrap();
    let profile = home.path().join(".claude");
    fs::create_dir_all(profile.join("projects")).unwrap();
    fs::write(profile.join("projects/session.jsonl"), b"session").unwrap();
    symlink("projects/session.jsonl", profile.join("shortcut")).unwrap();
    symlink(
        profile.join("projects/session.jsonl"),
        profile.join("absolute-shortcut"),
    )
    .unwrap();
    let created = router(home.path(), &["clients", "backup", "create", "claude"]);
    assert!(
        created.status.success(),
        "{}",
        String::from_utf8_lossy(&created.stderr)
    );
    let id = String::from_utf8(created.stdout).unwrap();
    let archive = home
        .path()
        .join(".config/link-assistant-router/client-backups")
        .join(id.trim());
    assert_eq!(
        fs::metadata(&archive).unwrap().permissions().mode() & 0o777,
        0o700
    );
    assert_eq!(
        fs::metadata(archive.join("manifest.json"))
            .unwrap()
            .permissions()
            .mode()
            & 0o777,
        0o600
    );
    assert_eq!(
        fs::read_link(archive.join("data/claude/normal/home/absolute-shortcut")).unwrap(),
        std::path::Path::new("projects/session.jsonl")
    );
    fs::remove_file(profile.join("shortcut")).unwrap();
    fs::remove_file(profile.join("absolute-shortcut")).unwrap();
    let restored = router(home.path(), &["clients", "backup", "restore", id.trim()]);
    assert!(
        restored.status.success(),
        "{}",
        String::from_utf8_lossy(&restored.stderr)
    );
    assert_eq!(
        fs::read_link(profile.join("shortcut")).unwrap(),
        std::path::Path::new("projects/session.jsonl")
    );
    assert_eq!(fs::read(profile.join("shortcut")).unwrap(), b"session");
    assert_eq!(
        fs::read(profile.join("absolute-shortcut")).unwrap(),
        b"session"
    );
}

#[cfg(unix)]
#[test]
fn restore_accepts_an_in_scope_link_through_a_home_alias() {
    use std::os::unix::fs::symlink;

    let home = tempfile::tempdir().unwrap();
    let alias_parent = tempfile::tempdir().unwrap();
    let alias = alias_parent.path().join("home-alias");
    symlink(home.path(), &alias).unwrap();
    let profile = home.path().join(".claude");
    fs::create_dir_all(&profile).unwrap();
    fs::write(profile.join("session.jsonl"), "session").unwrap();
    symlink("session.jsonl", profile.join("recent")).unwrap();
    let created = router(&alias, &["clients", "backup", "create", "claude"]);
    assert!(
        created.status.success(),
        "{}",
        String::from_utf8_lossy(&created.stderr)
    );
    let id = String::from_utf8(created.stdout).unwrap();
    fs::remove_file(profile.join("recent")).unwrap();
    let restored = router(&alias, &["clients", "backup", "restore", id.trim()]);
    assert!(
        restored.status.success(),
        "{}",
        String::from_utf8_lossy(&restored.stderr)
    );
    assert_eq!(fs::read(profile.join("recent")).unwrap(), b"session");
}

#[cfg(unix)]
#[test]
fn merge_keeps_both_different_symlinks_and_repeats_idempotently() {
    use std::os::unix::fs::symlink;
    let home = tempfile::tempdir().unwrap();
    let profile = home.path().join(".claude");
    fs::create_dir_all(&profile).unwrap();
    fs::write(profile.join("old.jsonl"), b"old").unwrap();
    fs::write(profile.join("new.jsonl"), b"new").unwrap();
    symlink("old.jsonl", profile.join("recent")).unwrap();
    let created = router(home.path(), &["clients", "backup", "create", "claude"]);
    assert!(
        created.status.success(),
        "{}",
        String::from_utf8_lossy(&created.stderr)
    );
    let id = String::from_utf8(created.stdout).unwrap();
    fs::remove_file(profile.join("recent")).unwrap();
    symlink("new.jsonl", profile.join("recent")).unwrap();
    for _ in 0..2 {
        let restored = router(home.path(), &["clients", "backup", "restore", id.trim()]);
        assert!(
            restored.status.success(),
            "{}",
            String::from_utf8_lossy(&restored.stderr)
        );
    }
    assert_eq!(
        fs::read_link(profile.join("recent")).unwrap(),
        std::path::Path::new("new.jsonl")
    );
    let conflicts = fs::read_dir(&profile)
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .filter(|path| {
            path.file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with("recent.router-conflict-")
        })
        .collect::<Vec<_>>();
    assert_eq!(conflicts.len(), 1);
    assert_eq!(
        fs::read_link(&conflicts[0]).unwrap(),
        std::path::Path::new("old.jsonl")
    );
}

#[test]
fn malformed_settings_stop_reset_before_any_mutation() {
    let home = tempfile::tempdir().unwrap();
    let profile = home.path().join(".claude");
    fs::create_dir_all(&profile).unwrap();
    fs::write(profile.join("settings.json"), b"{invalid").unwrap();
    fs::write(profile.join("session.jsonl"), b"session").unwrap();
    let reset = router(home.path(), &["clients", "reset", "claude"]);
    assert!(!reset.status.success());
    assert!(String::from_utf8_lossy(&reset.stderr).contains("malformed settings"));
    assert_eq!(
        fs::read(profile.join("settings.json")).unwrap(),
        b"{invalid"
    );
    assert!(profile.join("session.jsonl").exists());
}

#[test]
fn backup_refuses_destination_inside_selected_profile() {
    let home = tempfile::tempdir().unwrap();
    let profile = home.path().join(".claude");
    fs::create_dir_all(&profile).unwrap();
    fs::write(profile.join("session.jsonl"), b"session").unwrap();
    let destination = profile.join("backups");
    let result = router(
        home.path(),
        &[
            "clients",
            "backup",
            "create",
            "claude",
            "--destination",
            destination.to_str().unwrap(),
        ],
    );
    assert!(!result.status.success());
    assert!(
        String::from_utf8_lossy(&result.stderr).contains("inside a selected profile"),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    assert!(profile.join("session.jsonl").exists());
    assert!(
        !destination
            .read_dir()
            .unwrap()
            .any(|entry| { entry.unwrap().file_name().to_string_lossy().len() == 32 })
    );
}

#[test]
fn router_owned_claude_active_marker_blocks_lifecycle_mutation() {
    let home = tempfile::tempdir().unwrap();
    let state = home
        .path()
        .join(".config/link-assistant-router/clients/claude");
    let profile = state.join("home");
    fs::create_dir_all(&profile).unwrap();
    fs::create_dir_all(state.join("active")).unwrap();
    fs::write(profile.join("settings.json"), b"{}").unwrap();
    fs::write(
        state.join("active/current.run"),
        format!("{}\n", std::process::id()),
    )
    .unwrap();
    let reset = router(
        home.path(),
        &["clients", "reset", "claude", "--profile", "router"],
    );
    assert!(!reset.status.success());
    assert!(
        String::from_utf8_lossy(&reset.stderr).contains("active Router-launched Claude"),
        "{}",
        String::from_utf8_lossy(&reset.stderr)
    );
    assert_eq!(fs::read(profile.join("settings.json")).unwrap(), b"{}");
    let backup = router(
        home.path(),
        &[
            "clients",
            "backup",
            "create",
            "claude",
            "--profile",
            "router",
        ],
    );
    assert!(!backup.status.success());
    assert!(String::from_utf8_lossy(&backup.stderr).contains("active Router-launched Claude"));
}

#[cfg(windows)]
#[test]
fn windows_router_profile_inventory_uses_the_wrapper_home() {
    let home = tempfile::tempdir().unwrap();
    let profile = home
        .path()
        .join(".config/link-assistant-router/clients/claude/home");
    fs::create_dir_all(&profile).unwrap();
    fs::write(profile.join("session.jsonl"), b"session").unwrap();
    let appdata = home.path().join("Roaming");
    let result = router_with_env(
        home.path(),
        &[
            "clients",
            "backup",
            "create",
            "claude",
            "--profile",
            "router",
        ],
        &[("APPDATA", appdata.to_str().unwrap())],
    );
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let id = String::from_utf8(result.stdout).unwrap();
    let saved = appdata
        .join("link-assistant-router/client-backups")
        .join(id.trim())
        .join("data/claude/router/home/session.jsonl");
    assert_eq!(fs::read(saved).unwrap(), b"session");
}

#[cfg(target_os = "linux")]
#[test]
fn active_client_blocks_backup_without_publishing_an_archive() {
    let home = tempfile::tempdir().unwrap();
    fs::create_dir_all(home.path().join(".claude")).unwrap();
    fs::write(home.path().join(".claude/session.jsonl"), b"session").unwrap();
    let binary = home.path().join("claude");
    std::os::unix::fs::symlink("/bin/sleep", &binary).unwrap();
    let mut writer = std::process::Command::new(&binary)
        .arg("30")
        .env("HOME", home.path())
        .spawn()
        .unwrap();
    std::thread::sleep(std::time::Duration::from_millis(100));
    let blocked = router(home.path(), &["clients", "backup", "create", "claude"]);
    writer.kill().unwrap();
    writer.wait().unwrap();
    assert!(!blocked.status.success());
    assert!(String::from_utf8_lossy(&blocked.stderr).contains("is running"));
    let backup_dir = home
        .path()
        .join(".config/link-assistant-router/client-backups");
    assert!(
        !backup_dir
            .read_dir()
            .unwrap()
            .any(|entry| { entry.unwrap().file_name().to_string_lossy().len() == 32 })
    );
}
