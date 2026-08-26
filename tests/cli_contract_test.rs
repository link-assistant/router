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
                // `--local` because this asserts environment parsing, not
                // targeting: without it a router listening on this machine is
                // adopted and `doctor` refuses, which is correct behaviour for
                // a different question (issue #294).
                router(&["doctor", "--local"])
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

/// The project calls itself `router` everywhere — repository, documentation,
/// conversation — while the installed command was `link-assistant-router`
/// (issue #222). Both names must now resolve, and to the same program.
#[test]
fn both_the_canonical_and_legacy_commands_run() {
    for binary in [
        env!("CARGO_BIN_EXE_router"),
        env!("CARGO_BIN_EXE_link-assistant-router"),
    ] {
        let result = Command::new(binary)
            .arg("--version")
            .output()
            .unwrap_or_else(|error| panic!("{binary} should run: {error}"));
        assert!(result.status.success(), "{binary} exited with failure");
        let version = String::from_utf8_lossy(&result.stdout);
        assert!(
            version.starts_with("router "),
            "{binary} reported {version:?}"
        );
    }
}

/// Both names are one program, so their behaviour must not diverge. `--help` is
/// compared with the usage line removed: that line deliberately echoes the name
/// the user actually typed, so a caller who ran the legacy command is shown a
/// command that works for them. Everything else must be identical, which catches
/// a future change wired into one entry point but not the other.
#[test]
fn the_two_commands_describe_the_same_program() {
    let body = |binary: &str| {
        let out = Command::new(binary)
            .arg("--help")
            .output()
            .unwrap_or_else(|error| panic!("{binary} --help: {error}"));
        String::from_utf8_lossy(&out.stdout)
            .lines()
            .filter(|line| !line.starts_with("Usage:"))
            .collect::<Vec<_>>()
            .join("\n")
    };
    assert_eq!(
        body(env!("CARGO_BIN_EXE_router")),
        body(env!("CARGO_BIN_EXE_link-assistant-router")),
        "the two installed names must describe the same program"
    );
}

/// The usage line reflects the name that was invoked, so a reader copying it
/// gets a command that exists on their machine under that name.
#[test]
fn usage_reflects_the_invoked_name() {
    for (binary, expected) in [
        (env!("CARGO_BIN_EXE_router"), "Usage: router"),
        (
            env!("CARGO_BIN_EXE_link-assistant-router"),
            "Usage: link-assistant-router",
        ),
    ] {
        // Every page, not only the top level. Fourteen subcommands hardcoded
        // `router` in an `override_usage` string, so the name in the usage
        // line depended on which page you were reading — under the other
        // installed name it named a command the reader does not have
        // (issue #315).
        for page in [
            vec!["--help"],
            vec!["configure", "--help"],
            vec!["clients", "setup", "--help"],
            vec!["clients", "show", "--help"],
            vec!["clients", "remove", "--help"],
            vec!["clients", "doctor", "--help"],
            vec!["tokens", "rotate", "--help"],
            vec!["tokens", "revoke", "--help"],
            vec!["tokens", "show", "--help"],
            vec!["providers", "add", "--help"],
            vec!["providers", "show", "--help"],
            vec!["providers", "remove", "--help"],
            vec!["providers", "import", "--help"],
            vec!["auth", "import", "--help"],
            vec!["auth", "clear", "--help"],
        ] {
            let out = Command::new(binary)
                .args(&page)
                .output()
                .unwrap_or_else(|error| panic!("{binary} {page:?}: {error}"));
            let text = String::from_utf8_lossy(&out.stdout);
            assert!(
                text.contains(expected),
                "{binary} {page:?} must name the invoked binary:\n{text}"
            );
        }
    }
}
