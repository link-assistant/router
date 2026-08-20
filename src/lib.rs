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
mod api_error;
pub mod app_state;
pub mod audit;
pub mod auth;
pub mod auth_remote;
pub mod bridge_selection;
pub mod capabilities;
pub mod chat_admin;
pub mod chat_commands;
pub mod chat_config;
pub mod claude_auth;
pub mod claude_identity;
pub mod cli;
pub mod client_command;
pub mod client_global;
pub mod clients;
pub mod config;
pub mod config_defaults;
pub mod crater;
pub mod credential_store;
pub mod doctor;
pub mod durable_file;
pub mod gemini;
pub mod gemini_bridge;
pub mod github_proxy;
pub mod gonka;
pub mod lino_json;
pub mod log_analysis;
pub mod logging;
pub mod login;
pub mod login_api;
pub mod login_pty;
mod login_pty_backend;
pub mod login_url;
pub mod managed_server;
pub mod metrics;
pub mod model_catalog;
pub mod model_routing;
pub mod monitoring_api;
pub mod mpp;
pub mod oauth;
pub mod on_demand_cli;
pub mod openai;
pub mod output_limit;
pub mod provider_proxy;
pub mod providers;
pub mod proxy;
pub mod refresh;
pub mod refresh_rejections;
pub mod request_log;
mod request_routing;
pub mod responses;
pub mod security_headers;
pub mod server_command;
pub mod server_router;
pub mod stop_sequences;
pub mod storage;
pub mod subscription;
pub mod subscription_proxy;
pub mod telegram;
pub mod token;
pub mod token_admin;
mod token_http;
pub mod token_reservation;
pub mod upstream_client;
pub mod usage;
pub mod vendor_cli_refresh;
pub mod vk;
pub mod with_command;

#[cfg(test)]
mod anthropic_bridge_tests;
#[cfg(test)]
mod proxy_tests;

/// Package version (matches Cargo.toml version).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
