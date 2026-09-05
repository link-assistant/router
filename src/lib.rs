//! Link.Assistant.Router — Claude MAX OAuth proxy and token gateway.
//!
//! A Rust-based API gateway that proxies Anthropic (Claude) APIs,
//! supports Claude MAX OAuth sessions, and provides multi-tenant
//! access via custom-issued tokens.

pub mod accounts;
pub mod accounts_cli;
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
mod client_launch;
pub mod client_policy;
pub mod clients;
pub mod codex_identity;
pub mod config;
pub mod config_defaults;
pub mod configure;
pub mod crater;
pub mod credential_acceptance;
pub mod credential_recovery_store;
pub mod credential_status;
pub mod credential_store;
pub mod doctor;
pub mod durable_file;
pub mod entrypoint;
pub mod env_paths;
pub mod gemini;
pub mod gemini_bridge;
pub mod git_proxy;
pub mod github_proxy;
pub mod gonka;
pub mod lefine;
pub mod lino_json;
pub mod log_analysis;
pub mod log_decode;
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
pub mod platform_keychain;
pub mod provider_acceptance;
mod provider_config;
pub mod provider_proxy;
pub mod providers;
pub mod providers_cli;
pub mod proxy;
pub mod refresh;
pub mod refresh_rejections;
pub mod remote_command;
pub mod request_log;
mod request_routing;
pub mod responses;
pub mod route_contract;
pub mod security_headers;
pub mod server_command;
pub mod server_router;
mod sse;
pub mod stop_sequences;
pub mod storage;
pub mod subscription;
pub mod subscription_health;
pub mod subscription_proxy;
pub mod subscription_usage;
pub mod subscription_usage_cli;
pub mod telegram;
pub mod tls;
pub mod tls_cli;
pub mod token;
pub mod token_admin;
mod token_http;
pub mod token_report;
pub mod token_reservation;
pub mod token_secret;
pub mod tokens_remote;
// Unix domain sockets do not exist on Windows, and `tokio::net::UnixListener`
// is gated accordingly.
#[cfg(unix)]
pub mod unix_listener;
pub mod upstream_client;
pub mod usage;
pub mod vendor_cli_refresh;
pub mod vk;
pub mod with_command;
pub mod zai_coding_plan;

#[cfg(test)]
mod anthropic_bridge_tests;
#[cfg(test)]
mod client_policy_tests;
#[cfg(test)]
mod proxy_tests;
#[cfg(test)]
mod route_contract_tests;
#[cfg(test)]
mod sse_regression_tests;
#[cfg(test)]
mod token_admin_tests;
#[cfg(test)]
mod zai_coding_plan_tests;

/// Package version (matches Cargo.toml version).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
