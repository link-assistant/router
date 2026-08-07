//! Configuration for the optional chat admin channels.
//!
//! Kept out of [`crate::config`] for the same reason as
//! [`crate::admin_config`]: that module is at its line budget, and the
//! constructors are re-exported there so callers keep using `config::…`.
//!
//! The whole feature is off unless a bot token is present, so an upgrade adds
//! no new behaviour to an existing deployment.

use std::env;
use std::time::Duration;

use crate::chat_admin::{ChatAdminConfig, DEFAULT_RATE_LIMIT_PER_MINUTE, DEFAULT_SECRET_TTL_SECS};
use crate::config::{ConfigError, parse_u64_env};

/// Build the chat admin configuration from environment variables.
///
/// # Errors
///
/// Returns [`ConfigError::InvalidPort`] when `VK_GROUP_ID` is not a number —
/// the nearest existing variant for "a numeric setting did not parse".
pub fn chat_admin_from_env() -> Result<ChatAdminConfig, ConfigError> {
    let vk_group_id = env::var("VK_GROUP_ID")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(|value| value.parse::<u64>())
        .transpose()
        .map_err(|_| ConfigError::InvalidPort)?;
    Ok(chat_admin_config(
        env::var("TELEGRAM_BOT_TOKEN").ok(),
        env::var("VK_BOT_TOKEN").ok(),
        vk_group_id,
        parse_u64_env("CHAT_ADMIN_SECRET_TTL_SECS", DEFAULT_SECRET_TTL_SECS),
        parse_u64_env(
            "CHAT_ADMIN_RATE_LIMIT_PER_MINUTE",
            u64::from(DEFAULT_RATE_LIMIT_PER_MINUTE),
        ),
    ))
}

/// Assemble a [`ChatAdminConfig`] from explicit values.
///
/// Empty strings are normalised to `None`, so `TELEGRAM_BOT_TOKEN=` in a
/// compose file means "off" rather than "on with an empty token".
#[must_use]
pub fn chat_admin_config(
    telegram_bot_token: Option<String>,
    vk_bot_token: Option<String>,
    vk_group_id: Option<u64>,
    secret_ttl_secs: u64,
    rate_limit_per_minute: u64,
) -> ChatAdminConfig {
    ChatAdminConfig {
        telegram_bot_token: telegram_bot_token.filter(|value| !value.trim().is_empty()),
        vk_bot_token: vk_bot_token.filter(|value| !value.trim().is_empty()),
        vk_group_id,
        secret_ttl: Duration::from_secs(secret_ttl_secs),
        rate_limit_per_minute: u32::try_from(rate_limit_per_minute)
            .unwrap_or(DEFAULT_RATE_LIMIT_PER_MINUTE),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_tokens_means_no_channels() {
        let config = chat_admin_config(None, None, None, 120, 5);
        assert!(!config.telegram_enabled());
        assert!(!config.vk_enabled());
    }

    #[test]
    fn an_empty_token_is_not_a_configured_channel() {
        let config = chat_admin_config(Some(String::new()), Some("   ".into()), Some(1), 120, 5);
        assert!(!config.telegram_enabled());
        assert!(!config.vk_enabled());
    }

    #[test]
    fn each_channel_is_independent() {
        let telegram = chat_admin_config(Some("123:abc".into()), None, None, 120, 5);
        assert!(telegram.telegram_enabled() && !telegram.vk_enabled());
        let vk = chat_admin_config(None, Some("vk1".into()), Some(7), 120, 5);
        assert!(!vk.telegram_enabled() && vk.vk_enabled());
    }

    #[test]
    fn secrets_can_be_kept_by_setting_a_zero_ttl() {
        assert!(
            chat_admin_config(None, None, None, 0, 5)
                .secret_ttl
                .is_zero()
        );
    }
}
