use super::*;
use serde_json::Value;

#[test]
fn refresh_fixture_versions_and_contracts_are_current() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../tests/fixtures/clients/oauth-refresh-contracts.json"
    ))
    .unwrap();
    assert_eq!(
        fixture["claude"]["client_version"],
        crate::claude_identity::DEFAULT_CLIENT_VERSION
    );
    assert_eq!(fixture["claude"]["sdk_version"], ANTHROPIC_SDK_VERSION);
    assert_eq!(
        fixture["codex"]["client_version"],
        crate::codex_identity::DEFAULT_CLIENT_VERSION
    );
    assert_eq!(fixture["gemini"]["client_version"], GEMINI_CLI_VERSION);
    assert_eq!(
        fixture["gemini"]["auth_library_version"],
        GOOGLE_AUTH_LIBRARY_VERSION
    );
    assert_eq!(fixture["gemini"]["client_id"], GEMINI_CLIENT_ID);
    assert_eq!(
        fixture["gemini"]["client_secret_parts"]
            .as_array()
            .unwrap()
            .iter()
            .map(Value::as_str)
            .collect::<Option<String>>()
            .unwrap(),
        GEMINI_CLIENT_SECRET
    );
    assert_eq!(fixture["qwen"]["client_version"], QWEN_CODE_VERSION);

    let workflow = include_str!("../.github/workflows/real-clients.yml");
    for (package, version) in [
        (
            "@anthropic-ai/claude-code",
            crate::claude_identity::DEFAULT_CLIENT_VERSION,
        ),
        (
            "@openai/codex",
            crate::codex_identity::DEFAULT_CLIENT_VERSION,
        ),
        ("@google/gemini-cli", GEMINI_CLI_VERSION),
        ("@qwen-code/qwen-code", QWEN_CODE_VERSION),
    ] {
        assert!(workflow.contains(&format!("{package}@{version}")));
    }
}

#[test]
fn provider_contracts_track_supported_official_clients() {
    assert_eq!(
        refresh_config(SubscriptionProvider::Codex).token_url,
        "https://auth.openai.com/oauth/token"
    );
    assert_eq!(
        refresh_config(SubscriptionProvider::Gemini).client_id,
        GEMINI_CLIENT_ID
    );
    assert!(!GEMINI_CLIENT_SECRET.is_empty());
    assert_eq!(
        refresh_config(SubscriptionProvider::Qwen).style,
        BodyStyle::Form
    );
    let claude = refresh_config(SubscriptionProvider::Claude);
    assert_eq!(claude.token_url, CLAUDE_TOKEN_URL);
    assert_eq!(claude.client_id, CLAUDE_CLIENT_ID);
    assert_eq!(claude.style, BodyStyle::Json);
    assert!(CLAUDE_OAUTH_USER_AGENT.contains("/0.112.1 "));
    let codex = refresh_headers(SubscriptionProvider::Codex);
    assert!(codex.iter().any(|(name, value)| {
        name == "originator" && value == crate::codex_identity::ORIGINATOR
    }));
    assert!(codex.iter().any(|(name, value)| {
        name == "user-agent"
            && value.starts_with(&format!(
                "{}/{} (",
                crate::codex_identity::ORIGINATOR,
                crate::codex_identity::DEFAULT_CLIENT_VERSION
            ))
    }));
    assert!(codex.iter().all(|(name, _)| name != "chatgpt-account-id"));
    assert_eq!(
        refresh_headers(SubscriptionProvider::Qwen),
        vec![("accept".into(), "application/json".into())]
    );
}

#[test]
fn gemini_default_and_custom_clients_are_complete_atomic_contracts() {
    let config = refresh_config(SubscriptionProvider::Gemini);
    assert_eq!(
        oauth_client_from(SubscriptionProvider::Gemini, config, |_| None).unwrap(),
        (GEMINI_CLIENT_ID.into(), Some(GEMINI_CLIENT_SECRET.into()))
    );
    let custom = |name: &str| match name {
        GEMINI_CLIENT_ID_ENV => Some("custom-id".into()),
        GEMINI_CLIENT_SECRET_ENV => Some("custom-secret".into()),
        _ => None,
    };
    assert_eq!(
        oauth_client_from(SubscriptionProvider::Gemini, config, custom).unwrap(),
        ("custom-id".into(), Some("custom-secret".into()))
    );
    assert!(
        oauth_client_from(SubscriptionProvider::Gemini, config, |name| {
            (name == GEMINI_CLIENT_ID_ENV).then(|| "partial".into())
        })
        .is_err()
    );
}

async fn capture_refresh(
    provider: SubscriptionProvider,
) -> (String, std::collections::BTreeMap<String, String>, String) {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/token", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let mut raw = Vec::new();
        let mut chunk = [0_u8; 4096];
        loop {
            let read = socket.read(&mut chunk).await.unwrap();
            raw.extend_from_slice(&chunk[..read]);
            let text = String::from_utf8_lossy(&raw);
            let complete = text.split_once("\r\n\r\n").is_some_and(|(head, body)| {
                let length = head.lines().find_map(|line| {
                    let (name, value) = line.split_once(':')?;
                    name.eq_ignore_ascii_case("content-length")
                        .then(|| value.trim().parse::<usize>().ok())
                        .flatten()
                });
                length.is_some_and(|length| body.len() >= length)
            });
            if read == 0 || complete {
                break;
            }
        }
        let body = r#"{"access_token":"fresh","expires_in":3600}"#;
        socket
            .write_all(
                format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                )
                .as_bytes(),
            )
            .await
            .unwrap();
        String::from_utf8(raw).unwrap()
    });
    let previous = SubscriptionToken {
        access_token: "old".into(),
        refresh_token: Some("refresh-value".into()),
        expires_at_ms: Some(1),
        account_id: Some("account-private".into()),
        resource_url: None,
    };
    refresh_at(&reqwest::Client::new(), &url, provider, &previous, 10_000)
        .await
        .unwrap();
    let raw = server.await.unwrap();
    let (head, body) = raw.split_once("\r\n\r\n").unwrap();
    let request_line = head.lines().next().unwrap().to_string();
    let headers = head
        .lines()
        .skip(1)
        .filter_map(|line| line.split_once(':'))
        .map(|(name, value)| (name.to_ascii_lowercase(), value.trim().to_string()))
        .collect();
    (body.to_string(), headers, request_line)
}

#[tokio::test]
async fn every_refresh_wire_contract_matches_the_supported_client() {
    for provider in SubscriptionProvider::ALL {
        let (body, headers, request_line) = capture_refresh(provider).await;
        assert_eq!(request_line, "POST /token HTTP/1.1");
        assert!(headers.keys().all(|name| !name.starts_with("x-router-")));
        assert!(!headers.contains_key("chatgpt-account-id"));
        let fields = if refresh_config(provider).style == BodyStyle::Json {
            serde_json::from_str::<serde_json::Value>(&body)
                .unwrap()
                .as_object()
                .unwrap()
                .clone()
        } else {
            url::form_urlencoded::parse(body.as_bytes())
                .map(|(name, value)| (name.into_owned(), Value::String(value.into_owned())))
                .collect()
        };
        assert_eq!(fields["grant_type"], "refresh_token");
        assert_eq!(fields["refresh_token"], "refresh-value");
        match provider {
            SubscriptionProvider::Claude => {
                assert_eq!(headers["content-type"], "application/json");
                assert_eq!(headers["anthropic-beta"], crate::proxy::OAUTH_BETA_FLAG);
                assert_eq!(headers["user-agent"], CLAUDE_OAUTH_USER_AGENT);
                assert!(!fields.contains_key("client_secret"));
            }
            SubscriptionProvider::Codex => {
                assert_eq!(headers["content-type"], "application/json");
                assert_eq!(headers["originator"], crate::codex_identity::ORIGINATOR);
                assert_eq!(
                    headers["user-agent"],
                    crate::codex_identity::headers(None)["user-agent"]
                );
                assert!(!fields.contains_key("client_secret"));
            }
            SubscriptionProvider::Gemini => {
                assert_eq!(headers["content-type"], "application/x-www-form-urlencoded");
                assert_eq!(headers["x-goog-api-client"], GEMINI_API_CLIENT);
                assert_eq!(headers["user-agent"], GEMINI_AUTH_USER_AGENT);
                assert_eq!(fields["client_id"], GEMINI_CLIENT_ID);
                assert_eq!(fields["client_secret"], GEMINI_CLIENT_SECRET);
            }
            SubscriptionProvider::Qwen => {
                assert_eq!(headers["content-type"], "application/x-www-form-urlencoded");
                assert_eq!(headers["accept"], "application/json");
                assert!(!fields.contains_key("client_secret"));
            }
        }
    }
}
