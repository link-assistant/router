//! The administrative commands reachable from a chat channel.
//!
//! Split out of [`crate::chat_admin`], which owns *who* may run them; this
//! module owns *what* they do. Every function here assumes the caller has
//! already been authorised.
//!
//! One rule shapes the output: **token values are never echoed back into a
//! chat**. `/tokens` prints ids, labels, expiry, usage and revocation state,
//! matching the web UI; a freshly issued value is sent once, in its own
//! message, marked as a secret so the transport can delete it.

use std::fmt::Write as _;
use std::time::Duration;

use chrono::{TimeZone, Utc};

use crate::admin::AdminClaim;
use crate::chat_admin::Reply;
use crate::storage::TokenRecord;
use crate::token::{ADMIN_SCOPE, IssueRequest, TokenManager};

/// Default TTL of a token issued from chat, in hours.
const DEFAULT_ISSUE_TTL_HOURS: i64 = 24;

/// Cap on how many token records one `/tokens` reply lists, so a long-lived
/// deployment does not produce a message the platform will reject.
const LIST_LIMIT: usize = 30;

/// Read-only facts about the running router, for `/status`.
///
/// A trait rather than a direct dependency on the HTTP state so the chat core
/// can be unit tested without standing up a router.
pub trait RouterStatus: Send + Sync {
    /// Lines describing upstream, accounts and usage.
    fn status_lines(&self) -> Vec<String>;
}

/// Everything an authorised command needs.
pub struct CommandContext<'a> {
    /// Shared admin claim — the same one the web UI uses.
    pub admin: &'a AdminClaim,
    /// Token store behind `/tokens`, `/issue` and `/revoke`.
    pub tokens: &'a TokenManager,
    /// The credential the caller presented, already validated.
    pub credential: &'a str,
    /// How long a secret message survives, for the accompanying warning.
    pub secret_ttl: Duration,
    /// Optional live router facts for `/status`.
    pub status: Option<&'a dyn RouterStatus>,
}

/// Run one authorised command. `None` means "not a command I know".
#[must_use]
pub fn execute(context: &CommandContext<'_>, command: &str, rest: &str) -> Option<Reply> {
    match command {
        "status" => Some(status(context)),
        "tokens" | "list" => Some(list(context)),
        "issue" | "new" => Some(issue(context, rest)),
        "show" => Some(show(context, rest)),
        "rotate-token" | "reissue" => Some(rotate_client_token(context, rest)),
        "revoke" => Some(revoke(context, rest)),
        _ => None,
    }
}

/// `/status` — credential state and, when wired, live router facts.
fn status(context: &CommandContext<'_>) -> Reply {
    let claim = context.admin.status();
    let mut lines = vec![
        format!("Version: {}", crate::VERSION),
        format!(
            "Admin credential: {}",
            if claim.provisioned_by_environment {
                "provisioned by environment".to_string()
            } else if claim.claimed {
                claim.claimed_at.map_or_else(
                    || "claimed".to_string(),
                    |at| format!("claimed at {}", format_unix(cast_secs(at))),
                )
            } else {
                "unclaimed".to_string()
            }
        ),
        format!("Bootstrap open: {}", yes_no(claim.bootstrap_open)),
    ];
    match context.tokens.list_tokens() {
        Ok(records) => {
            let active = records.iter().filter(|r| !r.revoked).count();
            lines.push(format!(
                "Tokens: {} total, {active} active, {} revoked",
                records.len(),
                records.len() - active
            ));
        }
        Err(e) => lines.push(format!("Tokens: unavailable ({e})")),
    }
    if let Some(source) = context.status {
        lines.extend(source.status_lines());
    }
    Reply::plain(lines.join("\n"))
}

/// `/tokens` — ids and labels only. Never values.
fn list(context: &CommandContext<'_>) -> Reply {
    match context.tokens.list_tokens() {
        Ok(records) if records.is_empty() => Reply::plain("No tokens have been issued."),
        Ok(records) => {
            let total = records.len();
            let shown: Vec<String> = records.iter().take(LIST_LIMIT).map(describe).collect();
            let mut text = shown.join("\n");
            if total > LIST_LIMIT {
                let _ = write!(
                    text,
                    "\n\n… and {} more (showing the first {LIST_LIMIT}).",
                    total - LIST_LIMIT
                );
            }
            Reply::plain(text)
        }
        Err(e) => Reply::plain(format!("Could not list tokens: {e}")),
    }
}

/// Lifecycle state of a token, shared by `/tokens` and `/show`.
fn token_state(record: &TokenRecord) -> &'static str {
    if record.revoked {
        "revoked"
    } else if record.expires_at <= Utc::now().timestamp() {
        "expired"
    } else {
        "active"
    }
}

/// One line per token: id, label, expiry, every constraint, revocation.
/// Never the token value.
fn describe(record: &TokenRecord) -> String {
    let usage = record.max_requests.map_or_else(
        || format!("{}", record.used_requests),
        |max| format!("{}/{max}", record.used_requests),
    );
    let state = token_state(record);
    // Every supported constraint is visible here, so an operator can audit a
    // token from chat without reaching for the CLI (issue #194).
    let spend = record.max_tokens.map_or_else(
        || format!("{}", record.used_tokens),
        |max| format!("{}/{max}", record.used_tokens),
    );
    let rpm = record
        .rate_limit_per_minute
        .map_or_else(String::new, |rpm| format!(", {rpm}/min"));
    let account = record
        .account
        .as_deref()
        .map_or_else(String::new, |account| format!(", account `{account}`"));
    let label = if record.label.is_empty() {
        "(no label)"
    } else {
        &record.label
    };
    let scope = if record.scope == ADMIN_SCOPE {
        " [admin]"
    } else {
        ""
    };
    format!(
        "• {id} — {label}{scope}\n  {state}, expires {expires}, \
         requests {usage}, tokens {spend}{rpm}{account}",
        id = record.id,
        expires = format_unix(record.expires_at),
    )
}

/// Constraints parsed from a chat `/issue` or `/rotate-token` command.
///
/// Chat surfaces accept every control the CLI and HTTP APIs accept
/// (issue #194). Positional `<label> [ttl_hours] [max_requests]` is still
/// honoured for the documented short form; anything beyond that is given as
/// `key=value`, which stays readable as the option set grows.
#[derive(Debug, Default, PartialEq, Eq)]
pub(crate) struct IssueOptions {
    pub label: Option<String>,
    pub ttl_hours: Option<i64>,
    pub max_requests: Option<u64>,
    pub max_tokens: Option<u64>,
    pub rate_limit_per_minute: Option<u64>,
    pub account: Option<String>,
}

/// Keys accepted in the `key=value` form, with their documented aliases.
const ISSUE_KEYS: &[(&str, &[&str])] = &[
    ("label", &["label", "name"]),
    ("ttl_hours", &["ttl_hours", "ttl"]),
    ("max_requests", &["max_requests", "requests"]),
    ("max_tokens", &["max_tokens", "tokens"]),
    (
        "rate_limit_per_minute",
        &["rate_limit_per_minute", "rpm", "rate"],
    ),
    ("account", &["account", "pin"]),
];

fn canonical_issue_key(key: &str) -> Option<&'static str> {
    let key = key.to_ascii_lowercase();
    ISSUE_KEYS
        .iter()
        .find(|(_, aliases)| aliases.contains(&key.as_str()))
        .map(|(canonical, _)| *canonical)
}

/// Parse the shared `/issue` and `/rotate-token` argument grammar.
pub(crate) fn parse_issue_options(rest: &str) -> Result<IssueOptions, String> {
    let mut options = IssueOptions::default();
    let mut positional = 0;
    for part in rest.split_whitespace() {
        if let Some((key, value)) = part.split_once('=') {
            let Some(canonical) = canonical_issue_key(key) else {
                let known: Vec<&str> = ISSUE_KEYS.iter().map(|(name, _)| *name).collect();
                return Err(format!(
                    "unknown option `{key}`. Supported: {}.",
                    known.join(", ")
                ));
            };
            if value.is_empty() {
                return Err(format!("{canonical} needs a value, as `{canonical}=…`."));
            }
            match canonical {
                "label" => options.label = Some(value.to_string()),
                "account" => options.account = Some(value.to_string()),
                "ttl_hours" => {
                    options.ttl_hours = Some(parse_number::<i64>(value, "ttl_hours")?);
                }
                "max_requests" => {
                    options.max_requests = Some(parse_number::<u64>(value, "max_requests")?);
                }
                "max_tokens" => {
                    options.max_tokens = Some(parse_number::<u64>(value, "max_tokens")?);
                }
                _ => {
                    options.rate_limit_per_minute =
                        Some(parse_number::<u64>(value, "rate_limit_per_minute")?);
                }
            }
            continue;
        }
        // Positional short form, kept for the documented command shape.
        match positional {
            0 => options.label = Some(part.to_string()),
            1 => options.ttl_hours = Some(parse_number::<i64>(part, "ttl_hours")?),
            2 => options.max_requests = Some(parse_number::<u64>(part, "max_requests")?),
            _ => {
                return Err(
                    "too many positional values. Use `key=value` for the remaining options."
                        .to_string(),
                );
            }
        }
        positional += 1;
    }
    Ok(options)
}

fn parse_number<T: std::str::FromStr>(value: &str, field: &str) -> Result<T, String> {
    value
        .parse::<T>()
        .map_err(|_| format!("{field} must be a whole number."))
}

/// Human-readable summary of the constraints attached to a token.
fn describe_constraints(request: &IssueRequest<'_>) -> String {
    let mut parts = vec![format!("valid {}h", request.ttl_hours)];
    if let Some(max) = request.max_requests {
        parts.push(format!("{max} requests"));
    }
    if let Some(max) = request.max_tokens {
        parts.push(format!("{max} tokens"));
    }
    if let Some(rpm) = request.rate_limit_per_minute {
        parts.push(format!("{rpm}/min"));
    }
    if let Some(account) = request.account {
        parts.push(format!("account `{account}`"));
    }
    parts.join(", ")
}

/// `/issue [label] [ttl_hours] [max_requests] [key=value …]` — mint a client token.
///
/// The value is returned once, in a message marked secret.
fn issue(context: &CommandContext<'_>, rest: &str) -> Reply {
    let options = match parse_issue_options(rest) {
        Ok(options) => options,
        Err(message) => return Reply::plain(message),
    };
    let label = options.label.as_deref().unwrap_or("chat-issued");
    let request = IssueRequest {
        ttl_hours: options.ttl_hours.unwrap_or(DEFAULT_ISSUE_TTL_HOURS),
        label,
        account: options.account.as_deref(),
        max_requests: options.max_requests,
        max_tokens: options.max_tokens,
        rate_limit_per_minute: options.rate_limit_per_minute,
        scope: "",
    };
    // Same bounds as the CLI and HTTP surfaces, rather than chat-only rules.
    if let Err(message) = request.validate() {
        return Reply::plain(message);
    }
    match context.tokens.issue(&request) {
        Ok(token) => Reply::secret(format!(
            "Token issued — label `{label}`, {constraints}.\n\n\
             {token}\n\nThis value is shown once and never appears in /tokens.{note}",
            constraints = describe_constraints(&request),
            note = deletion_note(context.secret_ttl),
        )),
        Err(e) => Reply::plain(format!("Could not issue a token: {e}")),
    }
}

/// `/rotate-token <id> [key=value …]` — reissue a client token.
///
/// Constraints are preserved unless explicitly overridden, and the old value is
/// revoked atomically by [`crate::token::TokenManager::rotate_token`].
fn rotate_client_token(context: &CommandContext<'_>, rest: &str) -> Reply {
    let (id, rest) = rest.split_once(char::is_whitespace).unwrap_or((rest, ""));
    if id.is_empty() {
        return Reply::plain("Usage: /rotate-token <id> [label=… ttl_hours=… max_tokens=…]");
    }
    let options = match parse_issue_options(rest) {
        Ok(options) => options,
        Err(message) => return Reply::plain(message),
    };
    let existing = match context.tokens.store().get(id) {
        Ok(Some(record)) => record,
        Ok(None) => return Reply::plain(format!("No token with id `{id}`.")),
        Err(error) => return Reply::plain(format!("Could not read token `{id}`: {error}")),
    };
    if existing.scope == crate::token::ADMIN_SCOPE {
        return Reply::plain("Use /rotate to rotate the admin credential.");
    }
    match context.tokens.rotate_token_with(
        id,
        &crate::token::RotateOverrides {
            label: options.label.as_deref(),
            ttl_hours: options.ttl_hours,
            max_requests: options.max_requests,
            max_tokens: options.max_tokens,
            rate_limit_per_minute: options.rate_limit_per_minute,
            account: options.account.as_deref(),
        },
    ) {
        Ok(token) => Reply::secret(format!(
            "Token `{id}` rotated; the previous value is revoked.\n\n\
             {token}\n\nThis value is shown once and never appears in /tokens.{note}",
            note = deletion_note(context.secret_ttl),
        )),
        Err(e) => Reply::plain(format!("Could not rotate the token: {e}")),
    }
}

/// `/show <id>` — every constraint, counter, and state for one token.
fn show(context: &CommandContext<'_>, rest: &str) -> Reply {
    let id = rest.trim();
    if id.is_empty() {
        return Reply::plain("Usage: /show <id>");
    }
    match context.tokens.store().get(id) {
        Ok(Some(record)) => Reply::plain(describe_full(&record)),
        Ok(None) => Reply::plain(format!("No token with id `{id}`.")),
        Err(error) => Reply::plain(format!("Could not read token `{id}`: {error}")),
    }
}

/// Full constraint and usage detail for one token, for `/show`.
fn describe_full(record: &crate::storage::TokenRecord) -> String {
    let limit = |used: u64, max: Option<u64>| {
        max.map_or_else(
            || format!("{used}/unlimited"),
            |max| format!("{used}/{max}"),
        )
    };
    format!(
        "`{id}` — {label}{scope}\n\
         state: {state}\n\
         issued: {issued}\n\
         expires: {expires}\n\
         requests: {requests}\n\
         tokens: {tokens} (reserved {reserved})\n\
         rate limit: {rpm}\n\
         account: {account}",
        id = record.id,
        label = record.label,
        scope = if record.scope.is_empty() {
            String::new()
        } else {
            format!(" [{}]", record.scope)
        },
        state = token_state(record),
        issued = format_unix(record.issued_at),
        expires = format_unix(record.expires_at),
        requests = limit(record.used_requests, record.max_requests),
        tokens = limit(record.used_tokens, record.max_tokens),
        reserved = record.reserved_tokens,
        rpm = record
            .rate_limit_per_minute
            .map_or_else(|| "unlimited".to_string(), |rpm| format!("{rpm}/min")),
        account = record.account.as_deref().unwrap_or("(any)"),
    )
}

/// `/revoke <id>` — revoke by token id (the id from `/tokens`, not a value).
fn revoke(context: &CommandContext<'_>, rest: &str) -> Reply {
    let id = rest.split_whitespace().next().unwrap_or_default();
    if id.is_empty() {
        return Reply::plain("Send `/revoke <id>` with an id from /tokens.");
    }
    match context.tokens.revoke_token(id) {
        Ok(()) => Reply::plain(format!("Revoked `{id}`.")),
        Err(e) => Reply::plain(format!("Could not revoke `{id}`: {e}")),
    }
}

/// `/rotate` — replace the admin credential the caller is using.
///
/// Two credential kinds can reach a chat channel and each rotates in its own
/// store: a claimed `la_admin_…` credential lives in the shared claim, an
/// admin-scoped `la_sk_…` JWT lives in the token store. The flat deploy-time
/// key belongs to the deployment and cannot rotate itself.
///
/// # Errors
///
/// Returns a human-readable message when the credential cannot be rotated.
pub fn rotate(context: &CommandContext<'_>) -> Result<String, String> {
    if context.admin.verify(context.credential) && !context.admin.provisioned_by_environment() {
        return context.admin.rotate().map_err(|e| e.to_string());
    }
    if let Ok(claims) = context.tokens.validate_admin_token(context.credential) {
        let ttl_hours = ((claims.exp - claims.iat) / 3600).max(1);
        return context
            .tokens
            .rotate_admin_token(&claims.sub, ttl_hours, &claims.label)
            .map_err(|e| e.to_string());
    }
    Err(
        "This credential is provisioned by the deployment and has nothing to rotate; \
         change TOKEN_ADMIN_KEY where the router is deployed."
            .to_string(),
    )
}

/// Warning appended to every message that carries a secret.
#[must_use]
pub fn deletion_note(secret_ttl: Duration) -> String {
    if secret_ttl.is_zero() {
        String::new()
    } else {
        format!(
            "\n\nI will delete this message in {}s where the platform allows \
             it — copy it now.",
            secret_ttl.as_secs()
        )
    }
}

/// The live router behind `/status`: upstream, account health, usage.
///
/// Deliberately read-only and free of secrets — it repeats what `doctor`,
/// `/v1/accounts` and `/v1/usage` already report.
impl RouterStatus for crate::app_state::AppState {
    fn status_lines(&self) -> Vec<String> {
        let usage = crate::metrics::usage_snapshot(&self.metrics);
        let mut lines = vec![
            format!(
                "Upstream: {} ({})",
                self.upstream_provider.as_str(),
                self.upstream_base_url
            ),
            format!(
                "Requests: {} total, {} errors, {} tokens issued, {} revoked",
                usage.requests_total, usage.errors_total, usage.tokens_issued, usage.tokens_revoked
            ),
        ];
        match self.account_router.as_ref() {
            Some(router) => {
                let health = router.health_snapshot();
                let healthy = health.iter().filter(|account| account.healthy).count();
                lines.push(format!("Accounts: {healthy}/{} healthy", health.len()));
                lines.extend(
                    health
                        .iter()
                        .filter(|account| !account.healthy)
                        .map(|account| {
                            format!(
                                "  ⚠ {}: {}",
                                account.name,
                                account.last_error.as_deref().unwrap_or("unhealthy")
                            )
                        }),
                );
            }
            None => lines.push("Accounts: single-account mode".to_string()),
        }
        lines
    }
}

const fn yes_no(value: bool) -> &'static str {
    if value { "yes" } else { "no" }
}

/// Unix seconds as a human-readable UTC timestamp.
fn format_unix(secs: i64) -> String {
    Utc.timestamp_opt(secs, 0).single().map_or_else(
        || secs.to_string(),
        |dt| dt.format("%Y-%m-%d %H:%M UTC").to_string(),
    )
}

/// Widen a `u64` timestamp for formatting, saturating rather than wrapping.
fn cast_secs(value: u64) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::*;
    use crate::chat_admin::{ChatAdmin, ChatAdminConfig, ChatChannel};

    fn chat() -> ChatAdmin {
        ChatAdmin::new(
            Arc::new(AdminClaim::in_memory(
                Some("env-key".into()),
                Duration::from_secs(60),
            )),
            TokenManager::new("secret-for-chat-command-tests"),
            Some("env-key".into()),
            ChatAdminConfig {
                rate_limit_per_minute: 0,
                ..ChatAdminConfig::default()
            },
        )
    }

    fn signed_in() -> ChatAdmin {
        let chat = chat();
        chat.handle(ChatChannel::Telegram, "1", "/auth env-key");
        chat
    }

    fn say(chat: &ChatAdmin, text: &str) -> Reply {
        chat.handle(ChatChannel::Telegram, "1", text)
    }

    #[test]
    fn issue_returns_the_value_once_and_marks_it_secret() {
        let chat = signed_in();
        let reply = say(&chat, "/issue ci 48 100");
        assert!(reply.secret);
        assert!(reply.text.contains("la_sk_"));
        assert!(reply.text.contains("48h"));
        assert!(reply.text.contains("100 requests"));
    }

    /// Every constraint the CLI and HTTP APIs accept is reachable from chat
    /// through `key=value` options (issue #194).
    #[test]
    fn issue_accepts_every_supported_constraint() {
        let chat = signed_in();
        let reply = say(
            &chat,
            "/issue ci ttl_hours=12 max_requests=5 max_tokens=9000 rpm=3 account=primary",
        );
        assert!(reply.secret, "{}", reply.text);
        assert!(reply.text.contains("12h"), "{}", reply.text);
        assert!(reply.text.contains("5 requests"), "{}", reply.text);
        assert!(reply.text.contains("9000 tokens"), "{}", reply.text);
        assert!(reply.text.contains("3/min"), "{}", reply.text);
        assert!(reply.text.contains("primary"), "{}", reply.text);
    }

    #[test]
    fn issue_reports_unknown_and_malformed_options() {
        let chat = signed_in();
        assert!(
            say(&chat, "/issue ci nonsense=1")
                .text
                .contains("unknown option")
        );
        assert!(
            say(&chat, "/issue ci max_tokens=lots")
                .text
                .contains("max_tokens must be a whole number")
        );
        // The shared bounds apply here exactly as they do on the CLI.
        assert!(
            say(&chat, "/issue ci ttl_hours=0")
                .text
                .contains("ttl_hours must be a positive")
        );
        assert!(
            say(&chat, "/issue ci max_tokens=0")
                .text
                .contains("max_tokens must be greater than zero")
        );
    }

    #[test]
    fn show_reports_every_constraint_for_one_token() {
        let chat = signed_in();
        say(&chat, "/issue audited 24 7 max_tokens=500 rpm=2");
        let id = chat
            .tokens
            .list_tokens()
            .expect("list")
            .into_iter()
            .find(|record| record.label == "audited")
            .expect("issued record")
            .id;

        let reply = say(&chat, &format!("/show {id}"));
        assert!(!reply.secret, "/show must never be a secret reply");
        assert!(reply.text.contains("requests: 0/7"), "{}", reply.text);
        assert!(reply.text.contains("tokens: 0/500"), "{}", reply.text);
        assert!(reply.text.contains("2/min"), "{}", reply.text);
        assert!(reply.text.contains("active"), "{}", reply.text);
        assert!(
            !reply.text.contains(crate::token::TOKEN_PREFIX),
            "/show must not echo a token value"
        );
    }

    #[test]
    fn rotating_a_client_token_preserves_its_constraints() {
        let chat = signed_in();
        say(&chat, "/issue rotating 24 7 max_tokens=500 rpm=2");
        let original = chat
            .tokens
            .list_tokens()
            .expect("list")
            .into_iter()
            .find(|record| record.label == "rotating")
            .expect("issued record");

        let reply = say(&chat, &format!("/rotate-token {}", original.id));
        assert!(reply.secret, "{}", reply.text);
        assert!(reply.text.contains("la_sk_"), "{}", reply.text);

        let records = chat.tokens.list_tokens().expect("list");
        let old = records
            .iter()
            .find(|record| record.id == original.id)
            .expect("old record");
        assert!(old.revoked, "the previous value must be revoked");

        let replacement = records
            .iter()
            .find(|record| record.label == "rotating" && !record.revoked)
            .expect("replacement record");
        assert_eq!(replacement.max_requests, Some(7));
        assert_eq!(replacement.max_tokens, Some(500));
        assert_eq!(replacement.rate_limit_per_minute, Some(2));
    }

    #[test]
    fn rotating_a_client_token_applies_explicit_overrides() {
        let chat = signed_in();
        say(&chat, "/issue changing 24 7 max_tokens=500");
        let original = chat
            .tokens
            .list_tokens()
            .expect("list")
            .into_iter()
            .find(|record| record.label == "changing")
            .expect("issued record");

        say(
            &chat,
            &format!("/rotate-token {} max_tokens=900", original.id),
        );
        let replacement = chat
            .tokens
            .list_tokens()
            .expect("list")
            .into_iter()
            .find(|record| record.label == "changing" && !record.revoked)
            .expect("replacement record");
        assert_eq!(replacement.max_tokens, Some(900), "override applies");
        assert_eq!(
            replacement.max_requests,
            Some(7),
            "unspecified constraints are preserved"
        );
    }

    #[test]
    fn listing_shows_every_constraint() {
        let chat = signed_in();
        say(&chat, "/issue listed 24 7 max_tokens=500 rpm=2");
        let reply = say(&chat, "/tokens");
        assert!(reply.text.contains("requests 0/7"), "{}", reply.text);
        assert!(reply.text.contains("tokens 0/500"), "{}", reply.text);
        assert!(reply.text.contains("2/min"), "{}", reply.text);
    }

    /// The central secrecy rule: listing never re-exposes a token value.
    #[test]
    fn listing_never_echoes_a_token_value() {
        let chat = signed_in();
        let issued = say(&chat, "/issue ci");
        let value = issued
            .text
            .split_whitespace()
            .find(|word| word.starts_with(crate::token::TOKEN_PREFIX))
            .expect("issued value");
        let listed = say(&chat, "/tokens");
        assert!(!listed.text.contains(value));
        assert!(!listed.secret);
        assert!(listed.text.contains("ci"));
        assert!(listed.text.contains("active"));
    }

    #[test]
    fn revoke_marks_the_token_revoked() {
        let chat = signed_in();
        say(&chat, "/issue doomed");
        let listed = say(&chat, "/tokens");
        let id = listed
            .text
            .lines()
            .find_map(|line| line.strip_prefix("• "))
            .and_then(|line| line.split(" — ").next())
            .expect("an id in the listing")
            .to_string();
        assert!(
            say(&chat, &format!("/revoke {id}"))
                .text
                .contains("Revoked")
        );
        assert!(say(&chat, "/tokens").text.contains("revoked"));
    }

    #[test]
    fn revoke_without_an_id_explains_itself() {
        assert!(say(&signed_in(), "/revoke").text.contains("/revoke <id>"));
    }

    #[test]
    fn issue_rejects_a_nonsense_ttl() {
        assert!(
            say(&signed_in(), "/issue ci abc")
                .text
                .contains("ttl_hours must be")
        );
    }

    #[test]
    fn status_reports_the_credential_state() {
        let reply = say(&signed_in(), "/status");
        assert!(reply.text.contains("provisioned by environment"));
        assert!(reply.text.contains("Bootstrap open: no"));
        assert!(!reply.secret);
    }

    #[test]
    fn an_environment_key_cannot_rotate_itself() {
        let reply = say(&signed_in(), "/rotate");
        assert!(reply.text.contains("provisioned by the deployment"));
    }

    #[test]
    fn rotating_a_claimed_credential_replaces_it() {
        let chat = ChatAdmin::new(
            Arc::new(AdminClaim::in_memory(None, Duration::from_secs(60))),
            TokenManager::new("secret-for-rotate-tests"),
            None,
            ChatAdminConfig {
                rate_limit_per_minute: 0,
                ..ChatAdminConfig::default()
            },
        );
        let minted = chat.handle(ChatChannel::Telegram, "1", "/start");
        let token = minted
            .text
            .split_whitespace()
            .find(|word| word.starts_with(crate::admin::ADMIN_TOKEN_PREFIX))
            .expect("candidate")
            .to_string();
        chat.handle(ChatChannel::Telegram, "1", &format!("/confirm {token}"));

        let rotated = chat.handle(ChatChannel::Telegram, "1", "/rotate");
        assert!(rotated.secret);
        let replacement = rotated
            .text
            .split_whitespace()
            .find(|word| word.starts_with(crate::admin::ADMIN_TOKEN_PREFIX))
            .expect("replacement");
        assert!(chat.admin_claim().verify(replacement));
        // The old credential stops working, and the session was rebound to the
        // replacement rather than being silently locked out.
        assert!(!chat.admin_claim().verify(&token));
        assert!(
            chat.handle(ChatChannel::Telegram, "1", "/tokens")
                .text
                .contains("No tokens")
        );
    }

    #[test]
    fn timestamps_render_as_utc() {
        assert_eq!(format_unix(0), "1970-01-01 00:00 UTC");
    }
}
