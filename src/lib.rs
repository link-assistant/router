//! Link.Assistant.Router — Claude MAX OAuth proxy and token gateway.
//!
//! A Rust-based API gateway that proxies Anthropic (Claude) APIs,
//! supports Claude MAX OAuth sessions, and provides multi-tenant
//! access via custom-issued tokens.

pub mod accounts;
pub mod activitypub;
pub mod cli;
pub mod config;
pub mod gonka;
pub mod metrics;
pub mod mpp;
pub mod oauth;
pub mod openai;
pub mod provider_proxy;
pub mod providers;
pub mod proxy;
pub mod storage;
pub mod token;

#[cfg(test)]
mod proxy_tests;

/// Package version (matches Cargo.toml version).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
