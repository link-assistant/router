//! Host planning asks only about the selected profile's login presence (#712).
use super::{ClaudeLogin, claude_login_in};

#[test]
fn a_file_profile_ignores_an_unrelated_default_keychain_entry() {
    let home = tempfile::tempdir().unwrap();
    let config = home.path().join("selected-profile");
    std::fs::create_dir(&config).unwrap();
    // Deliberately invalid JSON: presence classification must not read/parse it.
    std::fs::write(config.join(".credentials.json"), b"never read these bytes").unwrap();
    let mut asked = Vec::new();
    let login = claude_login_in(
        Some(config.clone().into_os_string()),
        Some(home.path().as_os_str().to_owned()),
        |service| {
            asked.push(service.to_owned());
            service == "Claude Code-credentials"
        },
    );
    assert_eq!(login, ClaudeLogin::File);
    assert_eq!(
        asked,
        [crate::platform_keychain::claude_service_for(Some(
            config.as_os_str()
        ))]
    );
}

#[test]
fn a_scoped_keychain_entry_precedes_the_file_without_reading_it() {
    let home = tempfile::tempdir().unwrap();
    assert_eq!(
        claude_login_in(
            Some(home.path().as_os_str().to_owned()),
            None,
            |service| service
                == crate::platform_keychain::claude_service_for(Some(home.path().as_os_str()))
        ),
        ClaudeLogin::Keychain
    );
}

#[test]
fn empty_config_falls_back_to_the_default_profile_and_file() {
    let home = tempfile::tempdir().unwrap();
    std::fs::create_dir(home.path().join(".claude")).unwrap();
    std::fs::write(home.path().join(".claude/.credentials.json"), b"presence").unwrap();
    assert_eq!(
        claude_login_in(
            Some("".into()),
            Some(home.path().as_os_str().to_owned()),
            |service| {
                assert_eq!(service, "Claude Code-credentials");
                false
            }
        ),
        ClaudeLogin::File
    );
    assert_eq!(claude_login_in(None, None, |_| false), ClaudeLogin::Absent);
}

#[cfg(target_os = "macos")]
mod process_boundary {
    use super::*;
    use link_assistant_router::operation_context::{OperationContext, ProcessRunner};
    use std::{
        process::{Command, Output},
        sync::{Arc, Mutex},
        time::Duration,
    };

    #[derive(Default)]
    struct Presence(Mutex<Vec<Vec<String>>>);
    impl ProcessRunner for Presence {
        fn output(&self, command: &mut Command, _: Duration) -> std::io::Result<Output> {
            use std::os::unix::process::ExitStatusExt as _;
            let args: Vec<_> = command
                .get_args()
                .map(|s| s.to_string_lossy().into_owned())
                .collect();
            let success = if command.get_program() == "/usr/bin/security" {
                self.0.lock().unwrap().push(args.clone());
                assert!(
                    !args.iter().any(|a| a == "-w" || a == "-g"),
                    "password requested: {args:?}"
                );
                args.last().is_some_and(|s| s == "Claude Code-credentials")
            } else {
                false
            };
            Ok(Output {
                status: std::process::ExitStatus::from_raw(if success { 0 } else { 256 }),
                stdout: Vec::new(),
                stderr: Vec::new(),
            })
        }
    }

    #[test]
    fn host_status_asks_only_about_the_selected_profile_without_password_flags() {
        let root = tempfile::tempdir().unwrap();
        let config = root.path().join("file-profile");
        std::fs::create_dir(&config).unwrap();
        std::fs::write(config.join(".credentials.json"), b"unread credential bytes").unwrap();
        let runner = Arc::new(Presence::default());
        let mut context = OperationContext::isolated(root.path());
        context.set_env("CLAUDE_CONFIG_DIR", config.as_os_str());
        context.process_runner = Some(runner.clone());
        context.scope(|| {
            use crate::deploy_local::host_runtime::{HostRuntime as _, System};
            assert_eq!(System::default().claude_login(), ClaudeLogin::File);
        });
        assert_eq!(
            *runner.0.lock().unwrap(),
            [vec![
                "find-generic-password".to_owned(),
                "-s".to_owned(),
                link_assistant_router::platform_keychain::claude_service_for(Some(
                    config.as_os_str()
                ))
            ]]
        );
    }
}
