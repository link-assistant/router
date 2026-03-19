//! Link.Assistant.Router — Claude MAX OAuth proxy and token gateway.
//!
//! A Rust-based API gateway that proxies Anthropic (Claude) APIs,
//! supports Claude MAX OAuth sessions, and provides multi-tenant
//! access via custom-issued tokens.

pub mod config;
pub mod oauth;
pub mod proxy;
pub mod token;

/// Package version (matches Cargo.toml version).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
