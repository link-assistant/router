//! Tests for [`crate::managed_server`].

use super::*;

fn model(id: &str, owner: &str) -> RouterModel {
    RouterModel {
        id: id.to_string(),
        owned_by: owner.to_string(),
    }
}

/// Model selection moved to `clients::select_model` so `with`, `clients setup`
/// and `clients doctor` answer "which models suit this client" the same way
/// (issue #301). These cases keep asserting the behaviour they always did,
/// through that one rule.
use crate::clients::{ClientKind, select_model, usable_models};

/// A catalog whose every model belongs to another vendor cannot serve this
/// client, and the router knows it. Substituting one launched Claude Code
/// against an `OpenAI` model, so the client reported an unrecognised model name
/// and the user was pointed at their own tool rather than at the subscription
/// that had lapsed (issue #225).
#[test]
fn a_foreign_owner_is_not_substituted() {
    let catalog = vec![
        model("codex-auto-review", "openai"),
        model("gpt-5.5", "openai"),
    ];
    assert_eq!(select_model(ClientKind::ClaudeCode, &catalog), None);
    // Nothing is written into a client config either, so the two agree.
    assert!(usable_models(ClientKind::ClaudeCode, &catalog).is_empty());
}

/// The case the original fallback defends: with no owner declared, the router
/// cannot tell whether a model suits this client, and a usable model beats
/// refusing.
#[test]
fn an_undeclared_owner_still_falls_back() {
    let catalog = vec![model("mystery-1", ""), model("mystery-2", "")];
    assert_eq!(
        select_model(ClientKind::ClaudeCode, &catalog),
        Some("mystery-1")
    );
}

/// A mixed catalog gives each client a model of its own owner.
#[test]
fn each_client_gets_a_model_of_its_own_owner() {
    let catalog = vec![
        model("gpt-5.5", "openai"),
        model("claude-haiku-4-5", "anthropic"),
    ];
    assert_eq!(
        select_model(ClientKind::ClaudeCode, &catalog),
        Some("claude-haiku-4-5")
    );
    assert_eq!(select_model(ClientKind::Codex, &catalog), Some("gpt-5.5"));
}

/// A client with no dialect constraint accepts anything advertised.
#[test]
fn an_unconstrained_client_accepts_any_model() {
    let catalog = vec![model("gpt-5.5", "openai")];
    assert_eq!(
        select_model(ClientKind::Opencode, &catalog),
        Some("gpt-5.5")
    );
}

/// An empty catalog yields nothing, whatever the client.
#[test]
fn an_empty_catalog_selects_nothing() {
    assert_eq!(select_model(ClientKind::ClaudeCode, &[]), None);
    assert_eq!(select_model(ClientKind::Opencode, &[]), None);
}

/// A partially-declared catalog is treated as knowing its owners: one entry
/// naming a vendor is enough to conclude the client's own is absent.
#[test]
fn a_partially_declared_catalog_does_not_substitute() {
    let catalog = vec![model("gpt-5.5", "openai"), model("mystery", "")];
    assert_eq!(select_model(ClientKind::ClaudeCode, &catalog), None);
}

fn bound_token(client: Option<&str>) -> String {
    use base64::Engine as _;

    let payload = serde_json::json!({
        "sub": "inference-listener-token",
        "client_kind": client,
    });
    format!(
        "la_sk_e30.{}.signature",
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(payload.to_string())
    )
}

fn credential_probe_server(
    management_status: &'static str,
    requests: usize,
) -> (String, std::thread::JoinHandle<Vec<String>>) {
    use std::io::{Read as _, Write as _};

    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("bind probe server");
    let port = listener.local_addr().expect("probe address").port();
    let handle = std::thread::spawn(move || {
        let mut seen = Vec::new();
        for index in 0..requests {
            let (mut stream, _) = listener.accept().expect("accept probe");
            let mut bytes = [0_u8; 4096];
            let count = stream.read(&mut bytes).expect("read probe");
            let request = String::from_utf8_lossy(&bytes[..count]).into_owned();
            seen.push(request.clone());
            let (status, body) = if index == 0 {
                (management_status, r#"{"error":"not exposed"}"#)
            } else {
                (
                    "200 OK",
                    r#"{"object":"list","data":[{"id":"claude-live","owned_by":"anthropic"}]}"#,
                )
            };
            write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            )
            .expect("write probe response");
        }
        seen
    });
    (format!("http://127.0.0.1:{port}"), handle)
}

#[tokio::test]
async fn inference_only_listener_accepts_a_verified_matching_client_token() {
    let (base_url, server) = credential_probe_server("404 Not Found", 2);
    let token = bound_token(Some("claude"));
    let selected = ResolvedServer::at(base_url, Some(token.clone()), "test inference listener");
    let credential = prepare_run_credential(
        &selected,
        ClientKind::ClaudeCode,
        "inference-only-test",
        1,
        false,
    )
    .await
    .expect("matching bound token should launch");
    assert_eq!(credential.token, token);
    assert!(!credential.was_minted());
    assert_eq!(credential.models()[0].id, "claude-live");
    let seen = server.join().expect("probe server");
    assert!(seen[0].starts_with("GET /api/management/tokens "));
    assert!(seen[1].starts_with("GET /api/services/anthropic/v1/models "));
}

#[tokio::test]
async fn inference_only_listener_rejects_an_unbound_or_foreign_client_token() {
    for bound in [None, Some("codex")] {
        let (base_url, server) = credential_probe_server("404 Not Found", 1);
        let selected = ResolvedServer::at(
            base_url,
            Some(bound_token(bound)),
            "test inference listener",
        );
        let error = match prepare_run_credential(
            &selected,
            ClientKind::ClaudeCode,
            "inference-only-test",
            1,
            false,
        )
        .await
        {
            Ok(_) => panic!("non-matching token must fail closed"),
            Err(error) => error,
        };
        assert!(error.to_string().contains("must be bound to `claude`"));
        server.join().expect("probe server");
    }
}

#[tokio::test]
async fn permanent_repair_refuses_a_supplied_ordinary_token() {
    let (base_url, server) = credential_probe_server("401 Unauthorized", 1);
    let selected = ResolvedServer::at(
        base_url,
        Some(bound_token(Some("claude"))),
        "test ordinary token",
    );
    let error = match prepare_repair_credential(&selected, ClientKind::ClaudeCode, "repair-test", 1)
        .await
    {
        Ok(_) => panic!("repair must mint its own bound credential"),
        Err(error) => error,
    };
    assert!(
        error
            .to_string()
            .contains("requires an administrator credential")
    );
    server.join().expect("probe server");
}
