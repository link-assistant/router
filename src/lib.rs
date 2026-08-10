//! Link.Assistant.Router — Claude MAX OAuth proxy and token gateway.
//!
//! A Rust-based API gateway that proxies Anthropic (Claude) APIs,
//! supports Claude MAX OAuth sessions, and provides multi-tenant
//! access via custom-issued tokens.

pub mod accounts;
pub mod activitypub;
pub mod admin;
pub mod admin_api;
pub mod admin_auth;
pub mod admin_config;
pub mod admin_ui;
pub mod anthropic_bridge;
pub mod anthropic_stream;
pub mod app_state;
pub mod audit;
pub mod chat_admin;
pub mod chat_commands;
pub mod chat_config;
pub mod claude_identity;
pub mod cli;
pub mod client_command;
pub mod clients;
pub mod config;
pub mod config_defaults;
pub mod crater;
pub mod gemini;
pub mod gonka;
pub mod login;
pub mod login_api;
pub mod login_pty;
pub mod login_url;
pub mod metrics;
pub mod model_routing;
pub mod mpp;
pub mod oauth;
pub mod openai;
pub mod provider_proxy;
pub mod providers;
pub mod proxy;
pub mod refresh;
mod request_routing;
pub mod responses;
pub mod security_headers;
pub mod storage;
pub mod subscription;
pub mod subscription_proxy;
pub mod telegram;
pub mod token;
pub mod token_admin;
pub mod vk;

#[cfg(test)]
mod anthropic_bridge_tests;
#[cfg(test)]
mod proxy_tests;

/// Package version (matches Cargo.toml version).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
