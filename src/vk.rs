//! VK admin channel — a long-polling loop over the Bots Long Poll API.
//!
//! Structurally the twin of [`crate::telegram`]: the bot dials out, so no
//! inbound port is opened, and the same two rules hold — private conversations
//! only, and secrets are deleted after a short delay.
//!
//! "Private" is a numeric fact on VK: a community receives multi-user chats at
//! `peer_id = 2000000000 + chat_id`, while a 1:1 conversation has
//! `peer_id == from_id`, a positive user id below that offset. Both conditions
//! are required here — a group message never reaches the command parser.

use std::sync::Arc;
use std::time::Duration;

use reqwest::Client;
use serde_json::Value;

use crate::chat_admin::{ChatAdmin, ChatChannel, Reply};

/// VK API version this channel is written against.
const API_VERSION: &str = "5.199";

/// Seconds the long-poll request is allowed to wait for an event.
const WAIT_SECS: u64 = 25;

/// Backoff after a failure, so an outage does not become a hot loop.
const ERROR_BACKOFF: Duration = Duration::from_secs(5);

/// First `peer_id` that denotes a multi-user chat rather than a person.
const CHAT_PEER_OFFSET: i64 = 2_000_000_000;

/// Run the VK polling loop until the process ends.
///
/// Returns immediately when the channel is not configured (a VK community token
/// *and* the community id are both required to address the long-poll server).
pub async fn run(chat: Arc<ChatAdmin>, client: Client) {
    if !chat.config().vk_enabled() {
        return;
    }
    let (Some(token), Some(group_id)) = (
        chat.config().vk_bot_token.clone(),
        chat.config().vk_group_id,
    ) else {
        return;
    };
    let bot = VkBot {
        client,
        token: token.trim().to_string(),
        group_id,
    };
    tracing::info!("VK admin bot polling for community {group_id} (private chats only)");
    loop {
        let server = match bot.long_poll_server().await {
            Ok(server) => server,
            Err(e) => {
                tracing::warn!("VK: could not obtain a long-poll server: {e}");
                tokio::time::sleep(ERROR_BACKOFF).await;
                continue;
            }
        };
        // The inner loop lives as long as the server credentials do; on
        // `failed` VK asks us to re-fetch them, which the outer loop does.
        if let Err(e) = bot.poll(&chat, server).await {
            tracing::warn!("VK poll ended: {e}");
            tokio::time::sleep(ERROR_BACKOFF).await;
        }
    }
}

/// Long-poll server credentials handed out by `groups.getLongPollServer`.
#[derive(Debug, Clone)]
struct LongPollServer {
    server: String,
    key: String,
    ts: String,
}

/// Minimal VK client: the calls this channel needs.
#[derive(Clone)]
struct VkBot {
    client: Client,
    token: String,
    group_id: u64,
}

impl VkBot {
    async fn long_poll_server(&self) -> Result<LongPollServer, String> {
        let body = self
            .api(
                "groups.getLongPollServer",
                &[("group_id", self.group_id.to_string())],
            )
            .await?;
        let get = |field: &str| {
            body.pointer(&format!("/response/{field}"))
                .and_then(Value::as_str)
                .map(ToString::to_string)
        };
        Ok(LongPollServer {
            server: get("server").ok_or("long-poll response has no server")?,
            key: get("key").ok_or("long-poll response has no key")?,
            ts: get("ts").ok_or("long-poll response has no ts")?,
        })
    }

    /// Poll until VK invalidates the server credentials.
    async fn poll(&self, chat: &Arc<ChatAdmin>, mut server: LongPollServer) -> Result<(), String> {
        loop {
            let body = self
                .client
                .get(&server.server)
                .query(&[
                    ("act", "a_check"),
                    ("key", &server.key),
                    ("ts", &server.ts),
                    ("wait", &WAIT_SECS.to_string()),
                ])
                .timeout(Duration::from_secs(WAIT_SECS + 15))
                .send()
                .await
                .map_err(|e| e.to_string())?
                .json::<Value>()
                .await
                .map_err(|e| e.to_string())?;

            // `failed: 1` means "your ts is stale, here is a fresh one";
            // anything else means the credentials must be re-fetched.
            if let Some(failed) = body.get("failed").and_then(Value::as_i64) {
                if failed == 1
                    && let Some(ts) = body.get("ts").and_then(json_ts)
                {
                    server.ts = ts;
                    continue;
                }
                return Err(format!("long-poll server reported failed={failed}"));
            }
            if let Some(ts) = body.get("ts").and_then(json_ts) {
                server.ts = ts;
            }
            for update in body
                .get("updates")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default()
            {
                self.handle_update(chat, &update).await;
            }
        }
    }

    /// Process one update, dropping everything that is not a private message.
    async fn handle_update(&self, chat: &Arc<ChatAdmin>, update: &Value) {
        if update.get("type").and_then(Value::as_str) != Some("message_new") {
            return;
        }
        let Some(message) = update.pointer("/object/message") else {
            return;
        };
        let Some(peer_id) = message.get("peer_id").and_then(Value::as_i64) else {
            return;
        };
        let from_id = message.get("from_id").and_then(Value::as_i64).unwrap_or(0);
        if !is_private(peer_id, from_id) {
            tracing::debug!("VK: ignoring a message from peer {peer_id}");
            return;
        }
        let Some(text) = message.get("text").and_then(Value::as_str) else {
            return;
        };
        let reply = chat.handle(ChatChannel::Vk, &from_id.to_string(), text);
        self.deliver(chat, peer_id, reply).await;
    }

    /// Send a reply, scheduling deletion when it carries a secret.
    async fn deliver(&self, chat: &Arc<ChatAdmin>, peer_id: i64, reply: Reply) {
        let secret = reply.secret;
        let ttl = chat.config().secret_ttl;
        match self.send(peer_id, &reply.text).await {
            Ok(message_id) => {
                if secret && !ttl.is_zero() && message_id != 0 {
                    let bot = self.clone();
                    tokio::spawn(async move {
                        tokio::time::sleep(ttl).await;
                        if let Err(e) = bot.delete(peer_id, message_id).await {
                            tracing::debug!("VK: could not delete a secret message: {e}");
                        }
                    });
                }
            }
            Err(e) => tracing::warn!("VK: could not send a reply: {e}"),
        }
    }

    async fn send(&self, peer_id: i64, text: &str) -> Result<i64, String> {
        let body = self
            .api(
                "messages.send",
                &[
                    ("peer_id", peer_id.to_string()),
                    ("message", text.to_string()),
                    ("random_id", random_id()),
                ],
            )
            .await?;
        Ok(body
            .get("response")
            .and_then(Value::as_i64)
            .unwrap_or_default())
    }

    /// `messages.delete` with `delete_for_all`, so the secret leaves the user's
    /// history too. Best effort: VK refuses beyond its own time window.
    async fn delete(&self, peer_id: i64, message_id: i64) -> Result<(), String> {
        self.api(
            "messages.delete",
            &[
                ("peer_id", peer_id.to_string()),
                ("message_ids", message_id.to_string()),
                ("delete_for_all", "1".to_string()),
            ],
        )
        .await
        .map(|_| ())
    }

    async fn api(&self, method: &str, params: &[(&str, String)]) -> Result<Value, String> {
        let mut form: Vec<(&str, String)> = params.to_vec();
        form.push(("access_token", self.token.clone()));
        form.push(("v", API_VERSION.to_string()));
        let value: Value = self
            .client
            .post(format!("https://api.vk.com/method/{method}"))
            .form(&form)
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json()
            .await
            .map_err(|e| e.to_string())?;
        if let Some(error) = value.get("error") {
            return Err(error
                .get("error_msg")
                .and_then(Value::as_str)
                .unwrap_or("VK API call failed")
                .to_string());
        }
        Ok(value)
    }
}

/// Whether a VK message belongs to a 1:1 conversation with a real person.
///
/// Three things must hold: the peer is the sender (not a chat), the sender is a
/// user rather than a community (community ids are negative), and the peer is
/// below the multi-user chat offset.
#[must_use]
pub const fn is_private(peer_id: i64, from_id: i64) -> bool {
    peer_id == from_id && from_id > 0 && peer_id < CHAT_PEER_OFFSET
}

/// VK sends `ts` as a string in some responses and a number in others.
fn json_ts(value: &Value) -> Option<String> {
    value
        .as_str()
        .map(ToString::to_string)
        .or_else(|| value.as_i64().map(|ts| ts.to_string()))
}

/// A `random_id` for `messages.send`, which VK uses to deduplicate sends.
fn random_id() -> String {
    uuid::Uuid::new_v4().as_u128().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_one_to_one_conversations_are_accepted() {
        assert!(is_private(123, 123));
    }

    #[test]
    fn multi_user_chats_are_ignored() {
        // A community sees chat #7 as peer 2000000007, with the real author in
        // `from_id` — exactly the case that must never reach the parser.
        assert!(!is_private(CHAT_PEER_OFFSET + 7, 123));
    }

    #[test]
    fn community_and_mismatched_senders_are_ignored() {
        assert!(!is_private(-42, -42), "a community is not a person");
        assert!(!is_private(123, 456), "peer and sender must agree");
        assert!(!is_private(0, 0));
    }

    #[test]
    fn ts_is_read_whether_it_arrives_as_text_or_a_number() {
        assert_eq!(json_ts(&Value::from("42")), Some("42".to_string()));
        assert_eq!(json_ts(&Value::from(42)), Some("42".to_string()));
        assert_eq!(json_ts(&Value::Null), None);
    }

    #[test]
    fn random_ids_differ_between_sends() {
        assert_ne!(random_id(), random_id());
    }
}
