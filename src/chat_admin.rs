//! Transport-agnostic core of the optional chat admin channels.
//!
//! Telegram and VK differ only in how bytes reach the router; the rules about
//! *who* may administer it must not. This module owns those rules so both
//! transports (see [`crate::telegram`] and [`crate::vk`]) stay thin polling
//! loops:
//!
//! - the bootstrap claim is the **same system-wide state** the web UI uses
//!   ([`crate::admin::AdminClaim`]). A claim confirmed in a browser closes
//!   `/start` for Telegram and VK, and vice versa — a deployment has exactly
//!   one first admin, not one per channel;
//! - the claim keeps the two-phase shape of #50: `/start` mints a *candidate*
//!   that authorises nothing, and only `/confirm <token>` — the user sending
//!   the token back, proving the message arrived — activates it. A message that
//!   failed to deliver therefore cannot lock administration out forever;
//! - after the claim, every other chat user must present an admin credential.
//!   The platform user id only *caches* that credential for the conversation;
//!   it is never an authorisation factor on its own, and every command
//!   re-validates the cached token so a revoked or rotated credential stops
//!   working immediately;
//! - `/start`, credential presentation and token issuance are rate limited, so
//!   the admin-credential prompt is not a free brute-force oracle.
//!
//! Nothing here runs unless a bot token is configured; see [`ChatAdminConfig`].

use std::collections::HashMap;
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::time::{Duration, Instant};

use crate::admin::{AdminClaim, ClaimError};
use crate::chat_commands::{self, CommandContext, RouterStatus};
use crate::token::{TokenManager, constant_time_eq};

/// Default lifetime of a chat message that carries a secret, in seconds.
///
/// Chat transports keep history on the platform *and* on the user's devices.
/// Where the platform lets a bot delete its own message, secrets are deleted
/// after this delay; the message says so, so the user knows to copy it.
pub const DEFAULT_SECRET_TTL_SECS: u64 = 120;

/// Default number of sensitive commands allowed per user per minute.
pub const DEFAULT_RATE_LIMIT_PER_MINUTE: u32 = 5;

/// Window the rate limiter counts over.
const RATE_LIMIT_WINDOW: Duration = Duration::from_secs(60);

/// Configuration of the optional chat admin channels.
///
/// Every field is inert by default: with no bot token set, the corresponding
/// polling loop is never spawned and none of this code runs.
#[derive(Debug, Clone)]
pub struct ChatAdminConfig {
    /// Telegram Bot API token. `None` keeps the Telegram channel off.
    pub telegram_bot_token: Option<String>,
    /// VK community (group) access token. `None` keeps the VK channel off.
    pub vk_bot_token: Option<String>,
    /// VK community id the token belongs to; required for VK long polling.
    pub vk_group_id: Option<u64>,
    /// How long a message carrying a secret survives before the bot deletes it.
    /// Zero disables deletion (the secret then stays in the chat history).
    pub secret_ttl: Duration,
    /// Sensitive commands allowed per user per minute.
    pub rate_limit_per_minute: u32,
}

impl Default for ChatAdminConfig {
    fn default() -> Self {
        Self {
            telegram_bot_token: None,
            vk_bot_token: None,
            vk_group_id: None,
            secret_ttl: Duration::from_secs(DEFAULT_SECRET_TTL_SECS),
            rate_limit_per_minute: DEFAULT_RATE_LIMIT_PER_MINUTE,
        }
    }
}

impl ChatAdminConfig {
    /// Whether the Telegram channel is configured.
    #[must_use]
    pub fn telegram_enabled(&self) -> bool {
        self.telegram_bot_token
            .as_ref()
            .is_some_and(|token| !token.trim().is_empty())
    }

    /// Whether the VK channel is configured. VK long polling addresses a
    /// community, so a group id is as required as the token.
    #[must_use]
    pub fn vk_enabled(&self) -> bool {
        self.vk_bot_token
            .as_ref()
            .is_some_and(|token| !token.trim().is_empty())
            && self.vk_group_id.is_some()
    }
}

/// Which messaging platform a conversation belongs to.
///
/// Sessions are keyed by channel *and* user id: the same numeric id on two
/// platforms is two different people.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ChatChannel {
    Telegram,
    Vk,
}

impl ChatChannel {
    /// Short name used in logs and session keys.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Telegram => "telegram",
            Self::Vk => "vk",
        }
    }
}

impl std::fmt::Display for ChatChannel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// What the bot should send back.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Reply {
    /// Message body.
    pub text: String,
    /// Whether the message carries a secret and should be deleted after
    /// [`ChatAdminConfig::secret_ttl`] where the platform allows it.
    pub secret: bool,
}

impl Reply {
    /// An ordinary, non-secret reply.
    #[must_use]
    pub fn plain(text: impl Into<String>) -> Self {
        Self {
            text: text.into(),
            secret: false,
        }
    }

    /// A reply that carries a credential and must not linger in the history.
    #[must_use]
    pub fn secret(text: impl Into<String>) -> Self {
        Self {
            text: text.into(),
            secret: true,
        }
    }
}

/// Per-conversation state. Deliberately in memory only: a restart drops every
/// binding and each admin simply presents their token again.
#[derive(Debug)]
struct Session {
    /// Credential the user presented, cached for the conversation. Re-validated
    /// on every command, so revocation and rotation take effect at once.
    credential: Option<String>,
    /// `claim_id` of the bootstrap candidate this user minted, if any.
    pending_claim: Option<String>,
    /// Timestamps of recent sensitive commands, for the rate limiter.
    recent: Vec<Instant>,
    /// Last time this conversation sent anything, for idle eviction.
    last_seen: Instant,
}

impl Default for Session {
    fn default() -> Self {
        Self {
            credential: None,
            pending_claim: None,
            recent: Vec::new(),
            last_seen: Instant::now(),
        }
    }
}

/// How long a conversation may sit idle before it is forgotten.
///
/// This bounds a registry that is keyed by an *unauthenticated* identifier:
/// anyone who can message the bot gets an entry, whether or not they ever hold
/// a credential. Forgetting an idle conversation costs an authenticated admin
/// one `/auth`, and costs a stranger their foothold in the map.
const SESSION_IDLE_TTL: Duration = Duration::from_secs(3600);

/// Hard ceiling on conversations kept at once. Reached only under abuse; the
/// least recently active entries are dropped first.
const MAX_SESSIONS: usize = 512;

/// The shared chat administration brain.
///
/// Holds the same [`AdminClaim`] the HTTP layer holds — that is what makes the
/// bootstrap claim system-wide rather than per-channel.
pub struct ChatAdmin {
    admin: Arc<AdminClaim>,
    tokens: TokenManager,
    /// Flat deploy-time key, accepted as a credential exactly as HTTP does.
    admin_key: Option<String>,
    config: ChatAdminConfig,
    /// Optional live router facts for `/status`; absent in unit tests.
    status: Option<Arc<dyn RouterStatus>>,
    sessions: Mutex<HashMap<(ChatChannel, String), Session>>,
}

impl ChatAdmin {
    /// Assemble the chat admin core from the pieces the HTTP layer already has.
    #[must_use]
    pub fn new(
        admin: Arc<AdminClaim>,
        tokens: TokenManager,
        admin_key: Option<String>,
        config: ChatAdminConfig,
    ) -> Self {
        Self {
            admin,
            tokens,
            admin_key: admin_key.filter(|key| !key.is_empty()),
            config,
            status: None,
            sessions: Mutex::new(HashMap::new()),
        }
    }

    /// Attach the live router facts reported by `/status`.
    #[must_use]
    pub fn with_status(mut self, status: Arc<dyn RouterStatus>) -> Self {
        self.status = Some(status);
        self
    }

    /// Configuration this core was built with.
    #[must_use]
    pub const fn config(&self) -> &ChatAdminConfig {
        &self.config
    }

    /// The shared admin claim this core administers.
    #[must_use]
    pub fn admin_claim(&self) -> &AdminClaim {
        &self.admin
    }

    /// Handle one private-chat message and produce the reply.
    ///
    /// Callers must have established that the message came from a 1:1
    /// conversation — group traffic is dropped by the transports before it ever
    /// reaches this function.
    pub fn handle(&self, channel: ChatChannel, user_id: &str, text: &str) -> Reply {
        self.prune(channel, user_id);
        let text = text.trim();
        if text.is_empty() {
            return Reply::plain(HELP);
        }
        let (word, rest) = split_command(text);
        let command = normalise(word);
        match command.as_str() {
            "start" => self.start(channel, user_id),
            "confirm" => self.confirm(channel, user_id, rest),
            "auth" | "login" => self.authenticate(channel, user_id, rest),
            "logout" => self.logout(channel, user_id),
            "help" => Reply::plain(HELP),
            _ => self.dispatch(channel, user_id, text, &command, rest),
        }
    }

    /// Route a non-bootstrap command, once the sender has been recognised.
    fn dispatch(
        &self,
        channel: ChatChannel,
        user_id: &str,
        text: &str,
        command: &str,
        rest: &str,
    ) -> Reply {
        // A bare credential is accepted as if it were `/auth` (and as `/confirm`
        // while a candidate is outstanding), because "send the token back" is
        // exactly what the bot asks the user to do.
        if looks_like_credential(text) {
            if self.has_pending_claim(channel, user_id) {
                return self.confirm(channel, user_id, text);
            }
            return self.authenticate(channel, user_id, text);
        }
        let Some(credential) = self.authorised_credential(channel, user_id) else {
            return self.unauthorised_reply();
        };
        if matches!(command, "issue" | "rotate") && !self.allow(channel, user_id) {
            return Reply::plain(RATE_LIMITED);
        }
        let context = CommandContext {
            admin: &self.admin,
            tokens: &self.tokens,
            credential: &credential,
            secret_ttl: self.config.secret_ttl,
            status: self.status.as_deref(),
        };
        if command == "rotate" {
            return self.rotate(channel, user_id, &context);
        }
        chat_commands::execute(&context, command, rest)
            .unwrap_or_else(|| Reply::plain(format!("Unknown command `{command}`.\n\n{HELP}")))
    }

    /// `/rotate` — replace the caller's admin credential and rebind the chat
    /// session to the replacement, so rotating does not lock the operator out
    /// of the very channel they rotated from.
    fn rotate(&self, channel: ChatChannel, user_id: &str, context: &CommandContext<'_>) -> Reply {
        match chat_commands::rotate(context) {
            Ok(replacement) => {
                if let Some(session) = self.locked().get_mut(&(channel, user_id.to_string())) {
                    session.credential = Some(replacement.clone());
                }
                Reply::secret(format!(
                    "Admin credential rotated. The previous one no longer \
                     works — including in the web UI.\n\n{replacement}{note}",
                    note = chat_commands::deletion_note(self.config.secret_ttl),
                ))
            }
            Err(message) => Reply::plain(message),
        }
    }

    /// `/start` — open, or refuse to reopen, the system-wide bootstrap claim.
    fn start(&self, channel: ChatChannel, user_id: &str) -> Reply {
        if self.authorised_credential(channel, user_id).is_some() {
            return Reply::plain(format!("You are signed in as admin.\n\n{HELP}"));
        }
        if !self.allow(channel, user_id) {
            return Reply::plain(RATE_LIMITED);
        }
        match self.admin.begin() {
            Ok(candidate) => {
                self.locked()
                    .entry((channel, user_id.to_string()))
                    .or_default()
                    .pending_claim = Some(candidate.claim_id);
                Reply::secret(format!(
                    "You may claim administration of this router.\n\n\
                     Copy this token, then send it back to me with /confirm:\n\n\
                     /confirm {token}\n\nThe claim is only final once you \
                     send it back — if this message never reached you, nothing \
                     is locked and you can run /start again. The candidate \
                     expires in {ttl}s.{note}",
                    token = candidate.token,
                    ttl = candidate.expires_in_secs,
                    note = self.deletion_note(),
                ))
            }
            Err(ClaimError::AlreadyClaimed | ClaimError::ProvisionedByEnvironment) => {
                Reply::plain(ALREADY_CLAIMED)
            }
            Err(e) => Reply::plain(format!("Could not start a claim: {e}")),
        }
    }

    /// `/confirm <token>` — phase two of the shared two-phase claim.
    fn confirm(&self, channel: ChatChannel, user_id: &str, token: &str) -> Reply {
        if !self.allow(channel, user_id) {
            return Reply::plain(RATE_LIMITED);
        }
        let token = token.trim();
        if token.is_empty() {
            return Reply::plain("Send `/confirm <token>` with the token I just gave you.");
        }
        let claim_id = self
            .locked()
            .get(&(channel, user_id.to_string()))
            .and_then(|session| session.pending_claim.clone());
        let Some(claim_id) = claim_id else {
            return Reply::plain(
                "No claim is outstanding for this conversation. Send /start first.",
            );
        };
        match self.admin.confirm(&claim_id, token) {
            Ok(()) => {
                {
                    let mut sessions = self.locked();
                    let session = sessions.entry((channel, user_id.to_string())).or_default();
                    session.pending_claim = None;
                    session.credential = Some(token.to_string());
                    drop(sessions);
                }
                Reply::plain(format!(
                    "Administration claimed. Keep that token — it is not shown \
                     again and it is the same credential the web UI uses.\n\n{HELP}"
                ))
            }
            Err(e) => {
                self.forget_claim(channel, user_id);
                Reply::plain(format!("Claim failed: {e}"))
            }
        }
    }

    /// `/auth <token>` — bind an existing admin credential to this chat user.
    fn authenticate(&self, channel: ChatChannel, user_id: &str, token: &str) -> Reply {
        if !self.allow(channel, user_id) {
            return Reply::plain(RATE_LIMITED);
        }
        let token = token.trim();
        if token.is_empty() {
            return Reply::plain("Send `/auth <admin token>`.");
        }
        if !self.credential_valid(token) {
            return Reply::plain("That credential is not valid for administration.");
        }
        self.locked()
            .entry((channel, user_id.to_string()))
            .or_default()
            .credential = Some(token.to_string());
        Reply::plain(format!("Signed in as admin.\n\n{HELP}"))
    }

    /// `/logout` — drop the cached credential for this conversation.
    fn logout(&self, channel: ChatChannel, user_id: &str) -> Reply {
        self.locked().remove(&(channel, user_id.to_string()));
        Reply::plain("Signed out. Send /auth <admin token> to sign in again.")
    }

    /// The credential cached for this conversation, if it is *still* valid.
    ///
    /// Re-validating on every command is what keeps the platform user id from
    /// becoming an authorisation factor: revoke or rotate the credential and
    /// the binding stops working on the next message.
    fn authorised_credential(&self, channel: ChatChannel, user_id: &str) -> Option<String> {
        let cached = self
            .locked()
            .get(&(channel, user_id.to_string()))
            .and_then(|session| session.credential.clone())?;
        if self.credential_valid(&cached) {
            return Some(cached);
        }
        if let Some(session) = self.locked().get_mut(&(channel, user_id.to_string())) {
            session.credential = None;
        }
        None
    }

    /// Whether a presented credential authorises administration.
    ///
    /// Mirrors the HTTP rule minus the anonymous escape hatch:
    /// `--allow-anonymous-admin` opens the proxy port's admin endpoints, and
    /// deliberately does **not** open a chat channel.
    fn credential_valid(&self, token: &str) -> bool {
        if token.is_empty() {
            return false;
        }
        if self.admin.verify(token) {
            return true;
        }
        if self.tokens.validate_admin_token(token).is_ok() {
            return true;
        }
        self.admin_key
            .as_deref()
            .is_some_and(|key| constant_time_eq(token, key))
    }

    fn has_pending_claim(&self, channel: ChatChannel, user_id: &str) -> bool {
        self.locked()
            .get(&(channel, user_id.to_string()))
            .is_some_and(|session| session.pending_claim.is_some())
    }

    fn forget_claim(&self, channel: ChatChannel, user_id: &str) {
        if let Some(session) = self.locked().get_mut(&(channel, user_id.to_string())) {
            session.pending_claim = None;
        }
    }

    fn unauthorised_reply(&self) -> Reply {
        if self.admin.is_claimed() {
            Reply::plain(
                "Administration is already claimed. Send `/auth <admin token>` \
                 with an admin credential to continue.",
            )
        } else {
            Reply::plain(
                "Nobody administers this router yet. Send /start to claim it, or \
                 `/auth <admin token>` if you already hold an admin credential.",
            )
        }
    }

    /// Record one sensitive attempt, and report whether it is within budget.
    fn allow(&self, channel: ChatChannel, user_id: &str) -> bool {
        let limit = self.config.rate_limit_per_minute;
        if limit == 0 {
            return true;
        }
        let now = Instant::now();
        let mut sessions = self.locked();
        let session = sessions.entry((channel, user_id.to_string())).or_default();
        session
            .recent
            .retain(|at| now.duration_since(*at) < RATE_LIMIT_WINDOW);
        let allowed = session.recent.len() < limit as usize;
        if allowed {
            session.recent.push(now);
        }
        drop(sessions);
        allowed
    }

    /// Touch the current conversation and drop the ones that went cold.
    ///
    /// Called on every inbound message, because every inbound message is what
    /// creates entries in the first place: the key is a platform user id, which
    /// nobody has had to authenticate to own.
    fn prune(&self, channel: ChatChannel, user_id: &str) {
        let now = Instant::now();
        let mut sessions = self.locked();
        sessions.retain(|_, session| now.duration_since(session.last_seen) < SESSION_IDLE_TTL);
        sessions
            .entry((channel, user_id.to_string()))
            .or_default()
            .last_seen = now;
        // Under abuse, idle eviction alone is not fast enough: shed the least
        // recently active conversations until the map is back within its cap.
        // Conversations that hold a credential are shed last — a flood of
        // strangers must not sign a real admin out — and the conversation being
        // served right now is never shed.
        while sessions.len() > MAX_SESSIONS {
            let current = (channel, user_id.to_string());
            let Some(oldest) = sessions
                .iter()
                .filter(|(key, _)| **key != current)
                .min_by_key(|(_, session)| (session.credential.is_some(), session.last_seen))
                .map(|(key, _)| key.clone())
            else {
                break;
            };
            sessions.remove(&oldest);
        }
        drop(sessions);
    }

    fn deletion_note(&self) -> String {
        chat_commands::deletion_note(self.config.secret_ttl)
    }

    fn locked(&self) -> MutexGuard<'_, HashMap<(ChatChannel, String), Session>> {
        self.sessions.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

/// Split a message into its first word and the remainder.
fn split_command(text: &str) -> (&str, &str) {
    match text.split_once(char::is_whitespace) {
        Some((word, rest)) => (word, rest.trim()),
        None => (text, ""),
    }
}

/// Normalise a command word: drop the leading slash, drop a `@botname` suffix
/// (Telegram appends it), and lowercase.
fn normalise(word: &str) -> String {
    let word = word.strip_prefix('/').unwrap_or(word);
    let word = word.split_once('@').map_or(word, |(name, _)| name);
    word.to_lowercase()
}

/// Whether a message body is a bare router credential rather than a command.
fn looks_like_credential(text: &str) -> bool {
    !text.contains(char::is_whitespace)
        && (text.starts_with(crate::admin::ADMIN_TOKEN_PREFIX)
            || text.starts_with(crate::token::TOKEN_PREFIX))
}

/// Message shown when the bootstrap claim is closed.
const ALREADY_CLAIMED: &str = "Administration of this router is already claimed \
    (here, through the web UI, or by deployment configuration). Send \
    `/auth <admin token>` with an admin credential.";

/// Message shown when a user exceeds the sensitive-command budget.
const RATE_LIMITED: &str = "Too many attempts. Wait a minute and try again.";

/// Command list, appended to most replies so the channel is self-documenting.
pub const HELP: &str = "Commands:\n\
    /status — credential state, accounts and usage\n\
    /tokens — list issued tokens (ids and labels only, never values)\n\
    /issue <label> [ttl_hours] [max_requests] — issue a token\n\
    /revoke <id> — revoke a token\n\
    /rotate — replace the admin credential\n\
    /auth <token> — sign in with an admin credential\n\
    /logout — forget the credential bound to this chat";

#[cfg(test)]
mod tests {
    use super::*;

    fn core(env_key: Option<String>) -> ChatAdmin {
        ChatAdmin::new(
            Arc::new(AdminClaim::in_memory(
                env_key.clone(),
                Duration::from_secs(120),
            )),
            TokenManager::new("secret-for-chat-admin-tests"),
            env_key,
            ChatAdminConfig {
                rate_limit_per_minute: 0,
                ..ChatAdminConfig::default()
            },
        )
    }

    /// Pull the candidate token out of the `/start` reply.
    fn token_from(reply: &Reply) -> String {
        reply
            .text
            .split_whitespace()
            .find(|word| word.starts_with(crate::admin::ADMIN_TOKEN_PREFIX))
            .expect("the mint reply carries a token")
            .to_string()
    }

    #[test]
    fn start_mints_a_candidate_that_authorises_nothing() {
        let chat = core(None);
        let reply = chat.handle(ChatChannel::Telegram, "1", "/start");
        assert!(reply.secret, "a minted token must not linger in the chat");
        let token = token_from(&reply);
        assert!(!chat.admin.is_claimed(), "a mint alone must not claim");
        assert!(!chat.admin.verify(&token));
        // The listing command is still refused until the claim is confirmed.
        let listed = chat.handle(ChatChannel::Telegram, "1", "/tokens");
        assert!(listed.text.contains("/start"));
    }

    #[test]
    fn confirm_activates_the_claim_and_signs_the_user_in() {
        let chat = core(None);
        let minted = chat.handle(ChatChannel::Telegram, "1", "/start");
        let token = token_from(&minted);
        let reply = chat.handle(ChatChannel::Telegram, "1", &format!("/confirm {token}"));
        assert!(reply.text.contains("Administration claimed"));
        assert!(chat.admin.verify(&token));
        assert!(
            chat.handle(ChatChannel::Telegram, "1", "/tokens")
                .text
                .contains("No tokens")
        );
    }

    #[test]
    fn a_bare_token_is_accepted_as_the_confirmation() {
        let chat = core(None);
        let token = token_from(&chat.handle(ChatChannel::Vk, "7", "/start"));
        let reply = chat.handle(ChatChannel::Vk, "7", &token);
        assert!(reply.text.contains("Administration claimed"));
    }

    #[test]
    fn an_unconfirmed_mint_leaves_the_router_claimable() {
        let chat = core(None);
        let _abandoned = chat.handle(ChatChannel::Telegram, "1", "/start");
        assert!(!chat.admin.is_claimed());
        let second = chat.handle(ChatChannel::Telegram, "2", "/start");
        let token = token_from(&second);
        chat.handle(ChatChannel::Telegram, "2", &format!("/confirm {token}"));
        assert!(chat.admin.verify(&token));
    }

    /// The point of the shared claim: closing it anywhere closes it everywhere.
    #[test]
    fn a_claim_made_in_the_web_ui_closes_start_for_chat() {
        let chat = core(None);
        let candidate = chat.admin.begin().expect("web UI mint");
        chat.admin
            .confirm(&candidate.claim_id, &candidate.token)
            .expect("web UI confirm");
        let reply = chat.handle(ChatChannel::Telegram, "1", "/start");
        assert!(reply.text.contains("already claimed"));
        assert!(!reply.secret);
    }

    #[test]
    fn a_claim_made_in_chat_closes_the_web_ui_bootstrap() {
        let chat = core(None);
        let token = token_from(&chat.handle(ChatChannel::Telegram, "1", "/start"));
        chat.handle(ChatChannel::Telegram, "1", &format!("/confirm {token}"));
        assert_eq!(chat.admin.begin().unwrap_err(), ClaimError::AlreadyClaimed);
        assert!(!chat.admin.status().bootstrap_open);
    }

    #[test]
    fn a_second_chat_user_must_present_a_credential() {
        let chat = core(None);
        let token = token_from(&chat.handle(ChatChannel::Telegram, "1", "/start"));
        chat.handle(ChatChannel::Telegram, "1", &format!("/confirm {token}"));

        assert!(
            chat.handle(ChatChannel::Telegram, "2", "/tokens")
                .text
                .contains("/auth")
        );
        assert!(
            chat.handle(ChatChannel::Telegram, "2", "/auth la_admin_nope")
                .text
                .contains("not valid")
        );
        assert!(
            chat.handle(ChatChannel::Telegram, "2", &format!("/auth {token}"))
                .text
                .contains("Signed in")
        );
        assert!(
            chat.handle(ChatChannel::Telegram, "2", "/tokens")
                .text
                .contains("No tokens")
        );
    }

    #[test]
    fn an_admin_scoped_jwt_is_accepted_as_a_credential() {
        let chat = core(None);
        let jwt = chat
            .tokens
            .issue_admin_token(1, "ops")
            .expect("issue admin jwt");
        assert!(
            chat.handle(ChatChannel::Telegram, "3", &format!("/auth {jwt}"))
                .text
                .contains("Signed in")
        );
        // An ordinary client token is not an admin credential.
        let client = chat.tokens.issue_token(1, "client").expect("issue");
        assert!(
            chat.handle(ChatChannel::Telegram, "4", &format!("/auth {client}"))
                .text
                .contains("not valid")
        );
    }

    /// The binding caches the credential; it never replaces it.
    #[test]
    fn revoking_the_credential_unbinds_the_chat_user() {
        let chat = core(None);
        let jwt = chat.tokens.issue_admin_token(1, "ops").expect("issue");
        chat.handle(ChatChannel::Telegram, "5", &format!("/auth {jwt}"));
        let claims = chat.tokens.validate_token(&jwt).expect("validate");
        chat.tokens.revoke_token(&claims.sub).expect("revoke");
        assert!(
            chat.handle(ChatChannel::Telegram, "5", "/tokens")
                .text
                .contains("/auth")
        );
    }

    #[test]
    fn sessions_do_not_leak_across_channels_or_users() {
        let chat = core(None);
        let jwt = chat.tokens.issue_admin_token(1, "ops").expect("issue");
        chat.handle(ChatChannel::Telegram, "9", &format!("/auth {jwt}"));
        assert!(
            chat.handle(ChatChannel::Vk, "9", "/tokens")
                .text
                .contains("/auth"),
            "the same numeric id on another platform is another person"
        );
    }

    #[test]
    fn logout_forgets_the_binding() {
        let chat = core(None);
        let jwt = chat.tokens.issue_admin_token(1, "ops").expect("issue");
        chat.handle(ChatChannel::Telegram, "6", &format!("/auth {jwt}"));
        chat.handle(ChatChannel::Telegram, "6", "/logout");
        assert!(
            chat.handle(ChatChannel::Telegram, "6", "/tokens")
                .text
                .contains("/auth")
        );
    }

    #[test]
    fn an_environment_provisioned_key_starts_claimed() {
        let chat = core(Some("env-key".into()));
        let reply = chat.handle(ChatChannel::Telegram, "1", "/start");
        assert!(reply.text.contains("already claimed"));
        assert!(
            chat.handle(ChatChannel::Telegram, "1", "/auth env-key")
                .text
                .contains("Signed in")
        );
    }

    #[test]
    fn sensitive_commands_are_rate_limited() {
        let chat = ChatAdmin::new(
            Arc::new(AdminClaim::in_memory(None, Duration::from_secs(120))),
            TokenManager::new("secret-for-rate-limit-tests"),
            None,
            ChatAdminConfig {
                rate_limit_per_minute: 2,
                ..ChatAdminConfig::default()
            },
        );
        assert!(
            !chat
                .handle(ChatChannel::Telegram, "1", "/auth la_admin_wrong")
                .text
                .contains("Too many")
        );
        assert!(
            !chat
                .handle(ChatChannel::Telegram, "1", "/auth la_admin_wrong")
                .text
                .contains("Too many")
        );
        assert!(
            chat.handle(ChatChannel::Telegram, "1", "/auth la_admin_wrong")
                .text
                .contains("Too many")
        );
        // The budget is per user, not global.
        assert!(
            !chat
                .handle(ChatChannel::Telegram, "2", "/auth la_admin_wrong")
                .text
                .contains("Too many")
        );
    }

    /// The session map is keyed by a platform user id, which costs an attacker
    /// nothing to vary. Without a ceiling, messaging the bot from many accounts
    /// would grow the router's memory without bound.
    #[test]
    fn a_flood_of_strangers_cannot_grow_the_session_map_without_bound() {
        let chat = core(None);
        for user in 0..(MAX_SESSIONS * 2) {
            chat.handle(ChatChannel::Telegram, &user.to_string(), "/help");
        }
        assert!(
            chat.locked().len() <= MAX_SESSIONS,
            "session map grew to {}",
            chat.locked().len()
        );
    }

    /// The conversation being served is never the one evicted, even when the
    /// cap is hit while it is being handled.
    #[test]
    fn the_active_conversation_survives_the_cap() {
        let chat = core(Some("env-key".into()));
        chat.handle(ChatChannel::Telegram, "admin", "/auth env-key");
        for user in 0..(MAX_SESSIONS * 2) {
            chat.handle(ChatChannel::Vk, &user.to_string(), "/help");
        }
        // The admin's own next message must still find its session present.
        chat.handle(ChatChannel::Telegram, "admin", "/help");
        assert!(
            chat.locked()
                .get(&(ChatChannel::Telegram, "admin".to_string()))
                .is_some()
        );
    }

    #[test]
    fn telegram_style_command_suffixes_are_understood() {
        assert_eq!(normalise("/start@router_admin_bot"), "start");
        assert_eq!(normalise("STATUS"), "status");
    }

    #[test]
    fn unknown_commands_get_the_help_text() {
        let chat = core(Some("env-key".into()));
        chat.handle(ChatChannel::Telegram, "1", "/auth env-key");
        let reply = chat.handle(ChatChannel::Telegram, "1", "/nonsense");
        assert!(reply.text.contains("Unknown command"));
    }

    #[test]
    fn channels_are_independently_configurable() {
        let mut config = ChatAdminConfig::default();
        assert!(!config.telegram_enabled() && !config.vk_enabled());
        config.telegram_bot_token = Some("123:abc".into());
        assert!(config.telegram_enabled() && !config.vk_enabled());
        config.vk_bot_token = Some("vk-token".into());
        assert!(
            !config.vk_enabled(),
            "VK long polling needs a group id as well as a token"
        );
        config.vk_group_id = Some(42);
        assert!(config.vk_enabled());
    }
}
