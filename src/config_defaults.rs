//! Provider-specific default constructors used by [`crate::config`].
//!
//! Split out of that module to keep it within the repository's per-file line
//! budget; every item here is re-exported from `crate::config`.

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
        supported_clients: Vec::new(),
    }
}
