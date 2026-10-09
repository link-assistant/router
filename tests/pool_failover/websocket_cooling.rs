//! Recorded quota errors over both Codex WebSocket terminal event shapes.
use super::*;
use axum::extract::ws::{Message, WebSocketUpgrade};
use axum::http::HeaderMap;
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::tungstenite::{self, client::IntoClientRequest};

pub async fn vendor_websocket(
    State(vendor): State<Vendor>,
    headers: HeaderMap,
    upgrade: WebSocketUpgrade,
) -> Response {
    let account = headers["authorization"]
        .to_str()
        .unwrap()
        .strip_prefix("Bearer tok-")
        .unwrap()
        .to_string();
    upgrade.on_upgrade(move |mut socket| async move {
        while let Some(Ok(Message::Text(text))) = socket.next().await {
            let body: Value = serde_json::from_str(&text).unwrap();
            vendor
                .seen
                .lock()
                .unwrap()
                .push((account.clone(), "/responses".into(), body.clone()));
            let reply = vendor
                .scripts
                .lock()
                .unwrap()
                .get_mut(&account)
                .and_then(VecDeque::pop_front);
            let events = match reply {
                Some(Reply::Recorded { body, .. }) => body,
                None | Some(Reply::Ok) => codex_stream_from(&account),
                _ => panic!("WebSocket stub requires recorded events"),
            };
            for data in events
                .lines()
                .filter_map(|line| line.strip_prefix("data: "))
            {
                let Ok(mut event) = serde_json::from_str::<Value>(data) else {
                    continue;
                };
                if let Some(lane) = body.get("stream_id") {
                    event["stream_id"] = lane.clone();
                }
                if socket
                    .send(Message::Text(event.to_string().into()))
                    .await
                    .is_err()
                {
                    return;
                }
            }
        }
    })
}

async fn run_turn(pool: &Pool, model: &str) -> Value {
    let url = format!(
        "{}{CODEX_RESPONSES}",
        pool.url.replacen("http://", "ws://", 1)
    );
    let mut request = url.into_client_request().unwrap();
    request.headers_mut().insert(
        "authorization",
        format!("Bearer {}", pool.token).parse().unwrap(),
    );
    request
        .headers_mut()
        .insert("user-agent", "codex_exec/0.153.0".parse().unwrap());
    request
        .headers_mut()
        .insert("originator", "codex_cli_rs".parse().unwrap());
    request.headers_mut().insert(
        "x-codex-turn-metadata",
        "pool-quota-fixture".parse().unwrap(),
    );
    let (mut socket, _) = tokio_tungstenite::connect_async(request).await.unwrap();
    socket.send(tungstenite::Message::Text(json!({"type":"response.create", "stream_id":"child", "model":model, "store":false, "input":"hello"}).to_string().into())).await.unwrap();
    let terminal = tokio::time::timeout(Duration::from_secs(5), async {
        while let Some(message) = socket.next().await {
            if let tungstenite::Message::Text(text) = message.unwrap() {
                let event: Value = serde_json::from_str(&text).unwrap();
                if matches!(
                    event["type"].as_str(),
                    Some("response.completed" | "response.failed" | "error")
                ) {
                    return event;
                }
            }
        }
        panic!("socket closed before its terminal event");
    })
    .await
    .unwrap();
    let _ = socket.close(None).await;
    terminal
}

fn seed_catalogs(pool: &Pool) {
    for account in ACCOUNTS {
        pool.state.model_catalogs.record_success_for_account(
            SubscriptionProvider::Codex,
            account,
            Some(format!("acct_{account}")),
            vec!["gpt-5".into(), "gpt-5-mini".into()],
        );
    }
}

#[tokio::test]
async fn websocket_terminal_quota_cools_the_account_for_both_error_shapes() {
    for failed in [false, true] {
        let pool = Pool::start(Options {
            codex: true,
            ..Default::default()
        })
        .await;
        seed_catalogs(&pool);
        let fixture = if failed {
            let quota = json!({"type":"response.failed", "response":{"error":{"type":"usage_limit_reached", "resets_in_seconds":3600}}});
            format!("data: {quota}\n\n")
        } else {
            include_str!("../fixtures/vendor/openai_responses/terminal-quota.sse").to_string()
        };
        pool.vendor.script(
            "primary",
            [Reply::Recorded {
                status: 200,
                body: fixture,
                reset: false,
            }],
        );
        assert_eq!(
            run_turn(&pool, "gpt-5").await["type"],
            if failed { "response.failed" } else { "error" }
        );
        assert_eq!(
            run_turn(&pool, "gpt-5-mini").await["type"],
            "response.completed"
        );
        assert_eq!(pool.vendor.accounts_seen(), ["primary", "account-1"]);
    }
}

#[tokio::test]
async fn websocket_model_quota_keeps_the_sibling_available() {
    let pool = Pool::start(Options {
        codex: true,
        ..Default::default()
    })
    .await;
    seed_catalogs(&pool);
    let event = json!({"type":"response.failed", "response":{"error":{"code":"rate_limit_exceeded", "resets_in_seconds":3600}}});
    pool.vendor.script(
        "primary",
        [Reply::Recorded {
            status: 200,
            body: format!("data: {event}\n\n"),
            reset: false,
        }],
    );
    assert_eq!(run_turn(&pool, "gpt-5").await["type"], "response.failed");
    assert_eq!(
        run_turn(&pool, "gpt-5-mini").await["type"],
        "response.completed"
    );
    assert_eq!(pool.vendor.accounts_seen(), ["primary", "primary"]);
}
