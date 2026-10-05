//! Runtime environment and token policy for local deployments (issue #679).
//!
//! `router deploy --env NAME` passes a variable to the backend by name: the
//! value travels in the `docker run` (or host process) environment, never in
//! argv, and an HMAC fingerprint of every name and value becomes part of the
//! launch specification, so a changed value reconciles the deployment the
//! way a changed image does. Without `--env` the specification is exactly
//! what it was before passthrough existed.
//!
//! The settings are chosen once per process by `deploy_cli`, before the
//! coordinator runs; a deployment command manages one deployment.

use std::sync::OnceLock;

use link_assistant_router::deploy_config::{TokenPolicy, env_fingerprint};

use super::LABEL_KEY;

/// The backend label holding the runtime environment fingerprint.
pub(super) const LABEL_SUFFIX: &str = "runtime-env";

/// Local settings from `--config` and the deploy flags.
#[derive(Clone, Debug, Default)]
pub struct LocalSettings {
    /// Runtime variables, sorted by name. Values are never printed.
    pub env: Vec<(String, String)>,
    /// Limits for the client token deploy issues.
    pub tokens: TokenPolicy,
}

static SETTINGS: OnceLock<LocalSettings> = OnceLock::new();

/// Choose this process's local settings. Later calls are ignored.
pub fn configure(settings: LocalSettings) {
    let _ = SETTINGS.set(settings);
}

pub(super) fn current() -> &'static LocalSettings {
    static EMPTY: OnceLock<LocalSettings> = OnceLock::new();
    SETTINGS
        .get()
        .unwrap_or_else(|| EMPTY.get_or_init(LocalSettings::default))
}

/// The fingerprint a backend launched now would carry, if any.
pub(super) fn fingerprint(token_secret: &str) -> Option<String> {
    env_fingerprint(token_secret, &current().env)
}

/// Insert `-e NAME` for every variable and the fingerprint label before the
/// image reference (the last two `docker run` arguments: image and `serve`).
pub(super) fn insert(arguments: &mut Vec<String>, settings: &LocalSettings, token_secret: &str) {
    let mut extra = Vec::new();
    for (name, _) in &settings.env {
        extra.extend(["-e".to_string(), name.clone()]);
    }
    if let Some(fingerprint) = env_fingerprint(token_secret, &settings.env) {
        extra.extend([
            "--label".to_string(),
            format!("{LABEL_KEY}.{LABEL_SUFFIX}={fingerprint}"),
        ]);
    }
    let at = arguments.len().saturating_sub(2);
    arguments.splice(at..at, extra);
}

/// Name/value pairs for the `docker run` process environment.
pub(super) fn environment<'a>(
    settings: &'a LocalSettings,
    token_secret: &'a str,
) -> Vec<(&'a str, &'a str)> {
    let mut environment = vec![("TOKEN_SECRET", token_secret)];
    environment.extend(
        settings
            .env
            .iter()
            .map(|(name, value)| (name.as_str(), value.as_str())),
    );
    environment
}

/// Whether a running backend was launched with the current environment.
///
/// A backend without the label and a run without `--env` agree, so a
/// deployment that never used passthrough still converges as before.
pub(super) fn matches(label: Option<&str>, token_secret: &str) -> bool {
    label == fingerprint(token_secret).as_deref()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings() -> LocalSettings {
        LocalSettings {
            env: vec![("UPSTREAM_REGION".into(), "eu-west".into())],
            tokens: TokenPolicy::default(),
        }
    }

    #[test]
    fn names_reach_argv_and_values_only_the_environment() {
        let mut arguments: Vec<String> =
            ["run", "-d", "image:1", "serve"].map(String::from).to_vec();

        insert(&mut arguments, &settings(), "secret");

        let joined = arguments.join(" ");
        assert!(joined.contains("-e UPSTREAM_REGION --label"), "{joined}");
        assert!(!joined.contains("eu-west"), "{joined}");
        assert!(joined.contains(&format!("{LABEL_KEY}.{LABEL_SUFFIX}=hmac-sha256:")));
        assert_eq!(arguments[arguments.len() - 2..], ["image:1", "serve"]);
        let settings = settings();
        let environment = environment(&settings, "secret");
        assert!(environment.contains(&("UPSTREAM_REGION", "eu-west")));
    }

    #[test]
    fn without_passthrough_the_launch_is_unchanged() {
        let mut arguments: Vec<String> = ["run", "image:1", "serve"].map(String::from).to_vec();
        let before = arguments.clone();

        insert(&mut arguments, &LocalSettings::default(), "secret");

        assert_eq!(arguments, before);
        assert_eq!(
            environment(&LocalSettings::default(), "secret"),
            [("TOKEN_SECRET", "secret")]
        );
    }
}
