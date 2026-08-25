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
