//! Tests for [`crate::managed_server`].

use super::*;

fn model(id: &str, owner: &str) -> RouterModel {
    RouterModel {
        id: id.to_string(),
        owned_by: owner.to_string(),
    }
}

fn credential(models: Vec<RouterModel>) -> RunCredential {
    RunCredential {
        token: "la_sk_test".to_string(),
        available_models: models,
        revocation: None,
    }
}

/// A catalog whose every model belongs to another vendor cannot serve this
/// client, and the router knows it. Substituting one launched Claude Code
/// against an `OpenAI` model, so the client reported an unrecognised model name
/// and the user was pointed at their own tool rather than at the subscription
/// that had lapsed (issue #225).
#[test]
fn a_foreign_owner_is_not_substituted() {
    let catalog = credential(vec![
        model("codex-auto-review", "openai"),
        model("gpt-5.5", "openai"),
    ]);
    assert_eq!(catalog.select_model("anthropic"), None);
    // The owners are reported so the error can name what the catalog holds.
    assert_eq!(catalog.advertised_owners(), vec!["openai"]);
}

/// The case the original fallback defends: with no owner declared, the router
/// cannot tell whether a model suits this client, and a usable model beats
/// refusing.
#[test]
fn an_undeclared_owner_still_falls_back() {
    let catalog = credential(vec![model("mystery-1", ""), model("mystery-2", "")]);
    assert_eq!(catalog.select_model("anthropic"), Some("mystery-1"));
    assert!(catalog.advertised_owners().is_empty());
}

/// A mixed catalog gives each client a model of its own owner.
#[test]
fn each_client_gets_a_model_of_its_own_owner() {
    let catalog = credential(vec![
        model("gpt-5.5", "openai"),
        model("claude-haiku-4-5", "anthropic"),
    ]);
    assert_eq!(catalog.select_model("anthropic"), Some("claude-haiku-4-5"));
    assert_eq!(catalog.select_model("openai"), Some("gpt-5.5"));
    assert_eq!(catalog.advertised_owners(), vec!["anthropic", "openai"]);
}

/// A client with no dialect constraint accepts anything advertised.
#[test]
fn an_unconstrained_client_accepts_any_model() {
    let catalog = credential(vec![model("gpt-5.5", "openai")]);
    assert_eq!(catalog.select_model(""), Some("gpt-5.5"));
}

/// An empty catalog yields nothing, whatever the owner.
#[test]
fn an_empty_catalog_selects_nothing() {
    let catalog = credential(Vec::new());
    assert_eq!(catalog.select_model("anthropic"), None);
    assert_eq!(catalog.select_model(""), None);
}

/// A partially-declared catalog is treated as knowing its owners: one entry
/// naming a vendor is enough to conclude the client's own is absent.
#[test]
fn a_partially_declared_catalog_does_not_substitute() {
    let catalog = credential(vec![model("gpt-5.5", "openai"), model("mystery", "")]);
    assert_eq!(catalog.select_model("anthropic"), None);
}
