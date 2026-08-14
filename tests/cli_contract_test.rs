//! Black-box regression coverage for the CLI contract from issue #134.

use std::process::{Command, Output};

const SECRET_ENV: [(&str, &str); 6] = [
    ("TOKEN_SECRET", "secret-leak-probe-token"),
    ("TOKEN_ADMIN_KEY", "secret-leak-probe-admin"),
    ("TELEGRAM_BOT_TOKEN", "secret-leak-probe-telegram"),
    ("VK_BOT_TOKEN", "secret-leak-probe-vk"),
    ("GONKA_PRIVATE_KEY", "secret-leak-probe-gonka"),
    (
        "OPENAI_COMPATIBLE_API_KEY",
        "secret-leak-probe-openai-compatible",
    ),
];

const BOOLEAN_ENV: [&str; 7] = [
    "DISABLE_ANTHROPIC_API",
    "DISABLE_OPENAI_API",
    "DISABLE_METRICS",
    "DISABLE_LOGIN_API",
    "VERBOSE",
    "EXPERIMENTAL_COMPATIBILITY",
    "MPP_ENABLE",
];

fn router(args: &[&str]) -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    command.args(args);
    for (name, _) in SECRET_ENV {
        command.env_remove(name);
    }
    for name in BOOLEAN_ENV {
        command.env_remove(name);
    }
    command
}

fn output(command: &mut Command) -> Output {
    command.output().expect("router CLI should run")
}

#[test]
fn help_never_prints_secret_environment_values() {
    for args in [&["--help"][..], &["auth", "claude", "--help"][..]] {
        let mut command = router(args);
        for (name, value) in SECRET_ENV {
            command.env(name, value);
        }
        let result = output(&mut command);
        assert!(result.status.success());
        let stdout = String::from_utf8_lossy(&result.stdout);
        for (name, value) in SECRET_ENV {
            assert!(
                stdout.contains(&format!("[env: {name}]")),
                "{name}:\n{stdout}"
            );
            assert!(!stdout.contains(value), "{name} leaked in help:\n{stdout}");
        }
    }
}

#[test]
fn boolean_environment_variables_accept_documented_spellings() {
    let home = tempfile::tempdir().expect("isolated CLI home");
    for name in BOOLEAN_ENV {
        for value in ["1", "true", "yes", "on", "0", "false", "no", "off"] {
            let result = output(
                router(&["doctor"])
                    .env("TOKEN_SECRET", "boolean-test-secret")
                    .env("HOME", home.path())
                    .env_remove("CLAUDE_CODE_HOME")
                    .env_remove("XDG_CONFIG_HOME")
                    .env_remove("APPDATA")
                    .env(name, value),
            );
            assert_eq!(
                result.status.code(),
                Some(0),
                "{name}={value}: {}",
                String::from_utf8_lossy(&result.stderr)
            );
            assert!(
                String::from_utf8_lossy(&result.stdout)
                    .contains(home.path().to_string_lossy().as_ref()),
                "{name}={value}: doctor inspected a non-isolated home"
            );
        }
    }
}

#[test]
fn invalid_configuration_enum_values_are_rejected() {
    for flag in ["--storage-policy", "--upstream-provider", "--api-format"] {
        let result =
            output(router(&[flag, "bogus", "doctor"]).env("TOKEN_SECRET", "enum-test-secret"));
        assert_eq!(result.status.code(), Some(2), "{flag} accepted bogus");
        let diagnostics = format!(
            "{}{}",
            String::from_utf8_lossy(&result.stdout),
            String::from_utf8_lossy(&result.stderr)
        );
        assert!(
            diagnostics.contains("Configuration error"),
            "{flag}: {diagnostics}"
        );
    }
}

#[test]
fn revoke_and_expire_reject_unknown_token_ids() {
    for operation in ["revoke", "expire"] {
        let data_dir = tempfile::tempdir().expect("temporary token store");
        let result = output(
            router(&["tokens", operation, "totally-made-up-id"])
                .env("TOKEN_SECRET", "revoke-test-secret")
                .env("DATA_DIR", data_dir.path())
                .env("STORAGE_POLICY", "text"),
        );
        assert_eq!(
            result.status.code(),
            Some(1),
            "{operation} accepted unknown id"
        );
        assert!(
            String::from_utf8_lossy(&result.stderr).contains("totally-made-up-id"),
            "{operation}: {}",
            String::from_utf8_lossy(&result.stderr)
        );
    }
}

#[test]
fn missing_argument_usage_does_not_present_configured_globals_as_required() {
    for args in [
        &["tokens", "revoke"][..],
        &["providers", "add"][..],
        &["clients", "show"][..],
    ] {
        let result = output(
            router(args)
                .env("TOKEN_SECRET", "usage-test-secret")
                .env("ROUTER_PORT", "9000")
                .env("CLAUDE_CODE_HOME", "/tmp/claude-home"),
        );
        assert_eq!(result.status.code(), Some(2));
        let stderr = String::from_utf8_lossy(&result.stderr);
        let usage = stderr.split("Usage:").nth(1).expect("usage line");
        for global in ["--token-secret", "--port", "--claude-code-home"] {
            assert!(
                !usage.contains(global),
                "{global} looks required:\n{stderr}"
            );
        }
    }
}
