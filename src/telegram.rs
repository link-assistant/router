//! Telegram admin channel — a long-polling loop over the Bot API.
//!
//! Long polling, not webhooks, on purpose: the whole reason to administer a
//! self-hosted router from a phone is to avoid publishing an inbound port. The
//! bot dials out to `api.telegram.org`, so the deployment needs no public
//! surface at all.
//!
//! Two rules are enforced here, before anything is parsed as a command:
//!
//! 1. **private chats only.** `chat.type` must be `private`. Group, supergroup
//!    and channel updates are dropped untouched — administering token issuance
//!    in a group would hand credentials to every member, and group context
//!    (replies, forwards, bot-to-bot traffic) is a parsing hazard on top;
//! 2. **secrets do not linger.** A reply that carries a credential is deleted
//!    after [`ChatAdminConfig::secret_ttl`](crate::chat_admin::ChatAdminConfig),
//!    and the message says so.
//!
//! The transport is deliberately dependency-free — plain `reqwest` against the
//! documented HTTP API rather than a bot framework.

use std::sync::Arc;
use std::time::Duration;

use reqwest::Client;
use serde_json::{Value, json};

use crate::chat_admin::{ChatAdmin, ChatChannel, Reply};

/// Seconds `getUpdates` is allowed to hold the connection open.
const POLL_TIMEOUT_SECS: u64 = 30;

/// Backoff after a failed poll, so a network outage does not become a hot loop.
const ERROR_BACKOFF: Duration = Duration::from_secs(5);

/// Only these update kinds are requested; anything else never reaches us.
const ALLOWED_UPDATES: &str = r#"["message"]"#;

/// Run the Telegram polling loop until the process ends.
///
/// Returns immediately (doing nothing) when no token is configured, so the
/// caller can spawn it unconditionally.
pub async fn run(chat: Arc<ChatAdmin>, client: Client) {
    let Some(token) = chat.config().telegram_bot_token.clone() else {
        return;
    };
    let bot = TelegramBot {
        client,
        base_url: format!("https://api.telegram.org/bot{}", token.trim()),
    };
    match bot.me().await {
        Ok(name) => tracing::info!("Telegram admin bot connected as @{name} (private chats only)"),
        Err(e) => tracing::warn!("Telegram admin bot could not verify its token: {e}"),
    }
    let mut offset: i64 = 0;
    loop {
        match bot.updates(offset).await {
            Ok(updates) => {
                for update in updates {
                    offset = offset.max(update_id(&update) + 1);
                    handle_update(&chat, &bot, &update).await;
                }
            }
            Err(e) => {
                tracing::warn!("Telegram poll failed: {e}");
                tokio::time::sleep(ERROR_BACKOFF).await;
            }
        }
    }
}

/// Process one update, dropping everything that is not a private message.
async fn handle_update(chat: &Arc<ChatAdmin>, bot: &TelegramBot, update: &Value) {
    let Some(message) = update.get("message") else {
        return;
    };
    let Some(chat_id) = message.pointer("/chat/id").and_then(Value::as_i64) else {
        return;
    };
    if !is_private(message) {
        tracing::debug!("Telegram: ignoring a non-private message in chat {chat_id}");
        return;
    }
    // A bot must never take instructions from another bot; nor from a message
    // with no sender (channel posts arrive that way).
    let Some(from) = message.get("from") else {
        return;
    };
    if from.get("is_bot").and_then(Value::as_bool).unwrap_or(false) {
        return;
    }
    let Some(user_id) = from.get("id").and_then(Value::as_i64) else {
        return;
    };
    let Some(text) = message.get("text").and_then(Value::as_str) else {
        return;
    };

    let reply = chat.handle(ChatChannel::Telegram, &user_id.to_string(), text);
    deliver(chat, bot, chat_id, reply).await;
}

/// Send a reply, scheduling deletion when it carries a secret.
async fn deliver(chat: &Arc<ChatAdmin>, bot: &TelegramBot, chat_id: i64, reply: Reply) {
    let secret = reply.secret;
    let ttl = chat.config().secret_ttl;
    match bot.send(chat_id, &reply.text).await {
        Ok(message_id) => {
            if secret && !ttl.is_zero() {
                let bot = bot.clone();
                tokio::spawn(async move {
                    tokio::time::sleep(ttl).await;
                    if let Err(e) = bot.delete(chat_id, message_id).await {
                        tracing::debug!("Telegram: could not delete a secret message: {e}");
                    }
                });
            }
        }
        Err(e) => tracing::warn!("Telegram: could not send a reply: {e}"),
    }
}

/// Whether a message came from a 1:1 conversation.
///
/// Anything other than an explicit `private` chat type is treated as a group —
/// including an absent or unrecognised type, because "unknown" must not fall
/// through to "administer this router".
#[must_use]
pub fn is_private(message: &Value) -> bool {
    message.pointer("/chat/type").and_then(Value::as_str) == Some("private")
}

fn update_id(update: &Value) -> i64 {
    update.get("update_id").and_then(Value::as_i64).unwrap_or(0)
}

/// Minimal Bot API client: the four calls this channel needs.
#[derive(Clone)]
struct TelegramBot {
    client: Client,
    base_url: String,
}

impl TelegramBot {
    /// `getMe` — used once at startup to log the bot identity.
    async fn me(&self) -> Result<String, String> {
        let body = self.call("getMe", &json!({})).await?;
        Ok(body
            .pointer("/result/username")
            .and_then(Value::as_str)
            .unwrap_or("unknown")
            .to_string())
    }

    /// `getUpdates` with a long timeout, returning the raw update objects.
    async fn updates(&self, offset: i64) -> Result<Vec<Value>, String> {
        let body = self
            .call(
                "getUpdates",
                &json!({
                    "offset": offset,
                    "timeout": POLL_TIMEOUT_SECS,
                    "allowed_updates": serde_json::from_str::<Value>(ALLOWED_UPDATES)
                        .unwrap_or(Value::Null),
                }),
            )
            .await?;
        Ok(body
            .get("result")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default())
    }

    /// `sendMessage`, returning the new message id so secrets can be deleted.
    async fn send(&self, chat_id: i64, text: &str) -> Result<i64, String> {
        let body = self
            .call(
                "sendMessage",
                &json!({"chat_id": chat_id, "text": text, "disable_web_page_preview": true}),
            )
            .await?;
        Ok(body
            .pointer("/result/message_id")
            .and_then(Value::as_i64)
            .unwrap_or_default())
    }

    /// `deleteMessage` — best effort; Telegram only lets a bot delete its own
    /// recent messages, and the user may have deleted it already.
    async fn delete(&self, chat_id: i64, message_id: i64) -> Result<(), String> {
        self.call(
            "deleteMessage",
            &json!({"chat_id": chat_id, "message_id": message_id}),
        )
        .await
        .map(|_| ())
    }

    async fn call(&self, method: &str, body: &Value) -> Result<Value, String> {
        let response = self
            .client
            .post(format!("{}/{method}", self.base_url))
            .json(body)
            // A little beyond the long-poll timeout, so the poll itself is not
            // cut short by the client timeout.
            .timeout(Duration::from_secs(POLL_TIMEOUT_SECS + 15))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let value: Value = response.json().await.map_err(|e| e.to_string())?;
        if value.get("ok").and_then(Value::as_bool) == Some(true) {
            Ok(value)
        } else {
            Err(value
                .get("description")
                .and_then(Value::as_str)
                .unwrap_or("Telegram API call failed")
                .to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_private_chats_are_accepted() {
        for kind in ["group", "supergroup", "channel"] {
            let message = json!({"chat": {"id": 1, "type": kind}, "text": "/start"});
            assert!(!is_private(&message), "{kind} must be ignored");
        }
        assert!(is_private(
            &json!({"chat": {"id": 1, "type": "private"}, "text": "/start"})
        ));
    }

    #[test]
    fn a_message_without_a_chat_type_is_not_private() {
        assert!(!is_private(&json!({"chat": {"id": 1}, "text": "/start"})));
        assert!(!is_private(&json!({"text": "/start"})));
    }

    #[test]
    fn the_update_offset_advances_past_the_last_update() {
        assert_eq!(update_id(&json!({"update_id": 41})) + 1, 42);
        assert_eq!(update_id(&json!({})), 0);
    }
}
