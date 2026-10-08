//! Link.Assistant.Router — Claude MAX OAuth proxy and token gateway.
//!
//! A Rust-based API gateway that proxies Anthropic (Claude) APIs,
//! supports Claude MAX OAuth sessions, and provides multi-tenant
//! access via custom-issued tokens.

// Existing renderers use these scoped sinks. A library operation captures them;
// the human CLI adapter renders normally. No global stdout redirection is used.
#[macro_use]
mod operation_output;
extern crate self as link_assistant_router;

pub mod account_http;
pub mod account_limits;
pub mod accounts;
pub mod accounts_cli;
pub mod activitypub;
pub mod admin;
pub mod admin_api;
pub mod admin_auth;
pub mod admin_config;
pub mod admin_recovery;
pub mod admin_ui;
pub mod anthropic_bridge;
pub mod anthropic_stream;
mod api_error;
pub mod app_state;
pub mod audit;
pub mod auth;
pub mod auth_diagnostics;
pub mod auth_remote;
pub mod bounded_process;
mod bridge_controls;
mod bridge_request;
mod bridge_response;
#[cfg(test)]
mod bridge_response_tests;
pub mod bridge_selection;
pub mod capabilities;
pub mod chat_admin;
pub mod chat_commands;
pub mod chat_config;
mod chat_lifecycle;
pub mod claude_auth;
pub mod claude_identity;
mod claude_profile;
pub mod cli;
pub mod client_command;
pub mod client_global;
mod client_launch;
pub mod client_lifecycle;
pub mod client_policy;
mod client_repair_command;
pub mod clients;
mod codex_catalog;
mod codex_cloudflare_cookies;
pub mod codex_identity;
pub mod codex_loopback_bridge;
mod codex_remote_control;
pub mod config;
pub mod config_defaults;
pub mod configure;
pub mod contracts;
pub mod conversation_record;
pub mod conversations;
pub mod crater;
pub mod credential_acceptance;
pub mod credential_recovery_store;
pub mod credential_source;
pub mod credential_status;
pub mod credential_store;
pub mod deploy;
pub mod deploy_config;
pub mod deploy_relay;
pub mod deploy_seed;
pub mod deployment_preservation;
pub mod doctor;
pub mod durable_file;
pub mod emergency_auth;
pub mod emergency_auth_api;
mod encoded_request_body;
pub mod entrypoint;
pub mod env_paths;
pub mod gemini;
pub mod gemini_bridge;
pub mod git_proxy;
pub mod github_proxy;
pub mod gonka;
#[cfg(test)]
mod gonka_timeout_tests;
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
pub mod model_command;
pub mod model_contract;
pub(crate) mod model_evidence;
pub mod model_resource;
#[cfg(test)]
mod model_resource_tests;
pub mod model_routing;
pub mod monitoring_api;
pub mod mpp;
mod native_service;
pub mod oauth;
pub mod on_demand_cli;
pub mod openai;
pub mod operation_context;
pub mod operation_reports;
mod operational_log;
pub mod operations;
pub mod output_limit;
pub mod platform_keychain;
pub mod pool_failover;
pub mod primary_listener;
mod process_adapter;
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
mod resource_capture;
pub(crate) mod response_affinity;
pub mod responses;
pub mod responses_lifecycle;
pub mod responses_websocket;
pub mod route_contract;
pub mod runtime;
mod safety_identifier;
pub mod security_headers;
pub mod server_command;
pub mod server_router;
mod sse;
pub mod stop_sequences;
pub mod storage;
pub mod stream_termination;
mod structured_output;
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
pub mod token_import;
pub mod token_report;
pub mod token_reservation;
pub mod token_secret;
pub mod tokens_remote;
pub mod verification;
// Unix domain sockets do not exist on Windows, and `tokio::net::UnixListener`
// is gated accordingly.
pub mod tunnel_command;
#[cfg(unix)]
pub mod unix_listener;
pub mod upstream_client;
pub mod upstream_guard;
pub mod usage;
pub mod vendor_cli_refresh;
pub mod verification_client;
pub mod vk;
pub mod warmup;
pub mod with_command;
pub mod zai_coding_plan;
pub mod zai_upstream_error;

mod anthropic_nonstream;

#[cfg(test)]
mod admin_recovery_tests;
#[cfg(test)]
mod anthropic_bridge_tests;
#[cfg(test)]
mod bridge_request_tests;
#[cfg(test)]
mod client_policy_tests;
#[cfg(test)]
mod codex_loopback_bridge_tests;
#[cfg(test)]
mod codex_remote_control_tests;
#[cfg(test)]
mod credential_source_tests;
#[cfg(test)]
mod deploy_config_tests;
#[cfg(test)]
mod deploy_tests;
#[cfg(test)]
mod proxy_tests;
#[cfg(test)]
mod resource_lifecycle_tests;
#[cfg(test)]
mod response_affinity_tests;
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

/// Shared operational implementation for `auth_cli`.
pub mod auth_cli;

/// Shared operational implementation for `auth_import`.
pub mod auth_import;

/// Shared operational implementation for `bin_doctor`.
pub mod bin_doctor;

/// Shared operational implementation for `deploy_cli`.
pub mod deploy_cli;

/// Shared operational implementation for `deploy_image`.
pub mod deploy_image;

/// Shared operational implementation for `deploy_local`.
pub mod deploy_local;

/// Shared operational implementation for `deploy_remote`.
pub mod deploy_remote;

/// Shared operational implementation for `logs_cli`.
pub mod logs_cli;

/// Shared operational implementation for `recover_admin_cli`.
pub mod recover_admin_cli;

/// Shared operational implementation for `shutdown`.
pub mod shutdown;

/// Source commit embedded at build time.
pub const SOURCE_COMMIT: &str = env!("ROUTER_SOURCE_COMMIT");

/// Importable request-log operations.
pub mod logs;
