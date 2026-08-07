//! Provider-specific default constructors used by [`crate::config`].
//!
//! Split out of that module to keep it within the repository's per-file line
//! budget; every item here is re-exported from `crate::config`.

use std::time::Duration;

/// Default Gonka source URL.
#[must_use]
pub fn default_gonka_source_url() -> String {
    "https://node4.gonka.ai".to_string()
}

/// Default Gonka model ID.
#[must_use]
pub fn default_gonka_model() -> String {
    "Qwen/Qwen3-235B-A22B-Instruct-2507-FP8".to_string()
}

/// Default OpenAI-compatible provider base URL.
#[must_use]
pub fn default_openai_compatible_base_url() -> String {
    "http://localhost:4000/v1".to_string()
}

/// Default OpenAI-compatible provider boot config.
#[must_use]
pub fn default_openai_compatible_config() -> crate::providers::OpenAICompatibleConfig {
    crate::providers::OpenAICompatibleConfig {
        provider_name: "litellm".to_string(),
        base_url: default_openai_compatible_base_url(),
        api_key: None,
        api_key_env: None,
        default_model: None,
        models: Vec::new(),
    }
}

/// Default crater provider config.
#[must_use]
pub fn default_crater_config(actor_base_url: &str) -> crate::crater::CraterConfig {
    let actor = format!("{}/actor/code", actor_base_url.trim_end_matches('/'));
    crate::crater::CraterConfig::new(
        None,
        &actor,
        None,
        Duration::from_secs(1),
        Duration::from_secs(120),
    )
}
