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

/// One line per token: id, label, expiry, usage, revocation. No value.
fn describe(record: &TokenRecord) -> String {
    let usage = record.max_requests.map_or_else(
        || format!("{}", record.used_requests),
        |max| format!("{}/{max}", record.used_requests),
    );
    let state = if record.revoked {
        "revoked"
    } else if record.expires_at <= Utc::now().timestamp() {
        "expired"
    } else {
        "active"
    };
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
        "• {id} — {label}{scope}\n  {state}, expires {expires}, used {usage}",
        id = record.id,
        expires = format_unix(record.expires_at),
    )
}

/// `/issue <label> [ttl_hours] [max_requests]` — mint a client token.
///
/// The value is returned once, in a message marked secret.
fn issue(context: &CommandContext<'_>, rest: &str) -> Reply {
    let parts: Vec<&str> = rest.split_whitespace().collect();
    let label = parts.first().copied().unwrap_or("chat-issued");
    let ttl_hours = match parts.get(1).map(|value| value.parse::<i64>()) {
        Some(Ok(value)) if value > 0 => value,
        Some(_) => return Reply::plain("ttl_hours must be a positive whole number of hours."),
        None => DEFAULT_ISSUE_TTL_HOURS,
    };
    let max_requests = match parts.get(2).map(|value| value.parse::<u64>()) {
        Some(Ok(value)) => Some(value),
        Some(Err(_)) => return Reply::plain("max_requests must be a whole number."),
        None => None,
    };
    match context.tokens.issue(&IssueRequest {
        ttl_hours,
        label,
        account: None,
        max_requests,
        scope: "",
    }) {
        Ok(token) => Reply::secret(format!(
            "Token issued — label `{label}`, valid {ttl_hours}h{cap}.\n\n\
             {token}\n\nThis value is shown once and never appears in /tokens.{note}",
            cap =
                max_requests.map_or_else(String::new, |max| format!(", capped at {max} requests")),
            note = deletion_note(context.secret_ttl),
        )),
        Err(e) => Reply::plain(format!("Could not issue a token: {e}")),
    }
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
        assert!(reply.text.contains("capped at 100 requests"));
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
