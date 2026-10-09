use super::*;
use crate::operation_context::OperationContext;

#[test]
fn environment_defaults_and_explicit_settings() {
    let mut context = OperationContext::default();
    context.scope(|| {
        assert_eq!(
            ManagementConfig::from_env().unwrap(),
            ManagementConfig::default()
        );
    });
    context.set_env("MANAGEMENT_ALLOW_REMOTE", "1");
    context.set_env("MANAGEMENT_LOCKOUT_FAILURES", "2");
    context.set_env("MANAGEMENT_LOCKOUT_SECS", "60");
    context.set_env("MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK", "false");
    context.scope(|| {
        assert_eq!(
            ManagementConfig::from_env().unwrap(),
            ManagementConfig {
                allow_remote: true,
                lockout_failures: 2,
                lockout_secs: 60,
                exempt_loopback: false
            }
        );
    });
    // The environment-only Config constructor must use the same settings.
    context.set_env("TOKEN_SECRET", "management-config-test-secret");
    context.scope(|| {
        assert_eq!(
            crate::config::Config::from_env().unwrap().management,
            ManagementConfig::from_env().unwrap()
        );
    });
}

#[test]
fn invalid_environment_settings_name_the_setting_without_its_value() {
    for name in [
        "MANAGEMENT_ALLOW_REMOTE",
        "MANAGEMENT_LOCKOUT_FAILURES",
        "MANAGEMENT_LOCKOUT_SECS",
        "MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK",
    ] {
        let mut context = OperationContext::default();
        context.set_env(name, "private-invalid-value");
        context.scope(|| {
            let error = ManagementConfig::from_env().unwrap_err();
            assert!(error.contains(name));
            assert!(!error.contains("private-invalid-value"));
        });
    }
}

#[test]
fn cli_flags_override_environment_including_disabling_loopback_exemption() {
    use lino_arguments::Parser as _;
    let mut context = OperationContext::default();
    context.set_env("MANAGEMENT_ALLOW_REMOTE", "true");
    context.scope(|| {
        let cli = crate::cli::Cli::try_parse_from([
            "router",
            "--token-secret",
            "management-config-test-secret",
            "--management-allow-remote=false",
            "--management-lockout-failures",
            "3",
            "--management-lockout-secs",
            "0",
            "--management-lockout-exempt-loopback=false",
        ])
        .unwrap();
        assert_eq!(
            cli.into_config().unwrap().management,
            ManagementConfig {
                allow_remote: false,
                lockout_failures: 3,
                lockout_secs: 0,
                exempt_loopback: false
            }
        );
    });
}

#[test]
fn every_published_sample_is_refused_for_both_secret_flags_without_value_disclosure() {
    for secret in [
        "your-secure-secret-here",
        "your-secure-secret",
        "your-router-token-secret",
        "a-long-random-secret",
        "example-shared-signing-secret",
        "test-secret",
        "your-admin-key",
        "your-admin-secret",
        "change-me",
        "changeme",
        "replace-me",
        "admin-secret",
        "unused-by-remote-command",
    ] {
        for (signing, admin, flag) in [
            (secret, None, "TOKEN_SECRET"),
            (
                "management-config-test-secret",
                Some(secret),
                "TOKEN_ADMIN_KEY",
            ),
        ] {
            let error = ManagementConfig::validate_secrets(signing, admin).unwrap_err();
            assert!(error.contains(flag));
            assert!(!error.contains(secret));
        }
    }
    assert!(
        ManagementConfig::validate_secrets(
            "an-independently-generated-signing-secret",
            Some("an-independent-admin-key")
        )
        .is_ok()
    );
}
