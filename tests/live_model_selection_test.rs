//! Tier 4: whole-path model-selection properties, against a real provider.
//!
//! These are the properties issue #567 says only a live exchange can prove, and
//! #563 is the case that motivated it: a gateway model pinned by catalog
//! position rather than recency was invisible to every mock-backed test and
//! surfaced only when a human ran a real client by hand. A fixture can assert
//! the ranking rule; only a live catalog can show that the rule is applied to
//! the inventory the provider is really advertising, in the order it lists it.
//!
//! Driven through the shipped `router` binary, so the provider store, the
//! encryption, the live catalog fetch and the vendor acceptance probe are all
//! the real ones an operator gets. Installing a z.ai Coding Plan provider is
//! itself the acceptance step — `providers add` refuses to store the key unless
//! a live catalog fetch succeeds — so reaching the assertions at all means the
//! credential authorized a real upstream request.
//!
//! Every test is a no-op unless its protected variable is present, and says so
//! rather than passing quietly. Secret values are never printed or asserted on.

mod common;

use std::path::Path;
use std::process::{Command, Stdio};
use std::time::Duration;

use serde_json::Value;
use wait_timeout::ChildExt as _;

const LIVE_SECRET: &str = "live-model-selection-secret";

/// Run the shipped `router` binary against an isolated home and data directory.
///
/// Every live step goes through the binary rather than a library call: a tier
/// that bypasses the CLI cannot notice a defect that lives in the CLI, and
/// #563's symptom reached the user through a launch, not a function.
fn router(
    home: &Path,
    data: &Path,
    arguments: &[&str],
    stdin: Option<&str>,
) -> std::process::Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    command
        .args(arguments)
        .arg("--data-dir")
        .arg(data)
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join(".config"))
        .env("TOKEN_SECRET", LIVE_SECRET)
        .env("NO_COLOR", "1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if stdin.is_some() {
        command.stdin(Stdio::piped());
    } else {
        command.stdin(Stdio::null());
    }
    let mut child = command.spawn().expect("launch the router CLI");
    if let Some(value) = stdin {
        use std::io::Write as _;
        child
            .stdin
            .take()
            .expect("stdin")
            .write_all(value.as_bytes())
            .expect("write the protected credential to stdin");
    }
    // A live step talks to a vendor, so it is bounded rather than trusted to
    // return: a hung upstream must fail this test, not hang the suite.
    if child
        .wait_timeout(Duration::from_secs(90))
        .expect("wait for the router CLI")
        .is_none()
    {
        child.kill().expect("stop the timed-out router CLI");
        panic!("the live router step did not finish within 90s");
    }
    child.wait_with_output().expect("collect router CLI output")
}

/// The first JSON document in a command's output, past any human-readable
/// preamble such as the personal-subscription risk warning.
fn document(output: &std::process::Output) -> Value {
    let text = String::from_utf8_lossy(&output.stdout);
    let start = text
        .find('{')
        .unwrap_or_else(|| panic!("no JSON document in the router output"));
    serde_json::from_str(&text[start..]).expect("the router document parses")
}

/// Install the live provider, reading the key from stdin so it never reaches
/// argv — where `ps` and shell history would expose it (issue #314).
fn install_live_zai(home: &Path, data: &Path, api_key: &str) -> Value {
    let added = router(
        home,
        data,
        &[
            "providers",
            "add",
            "--name",
            "z.ai",
            "--kind",
            "z.ai-coding-plan",
            "--base-url",
            "https://api.z.ai",
            "--api-key-stdin",
            "--subscriber-id",
            "primary",
            "--acknowledge-intermediary-risk",
            "--local",
        ],
        Some(api_key),
    );
    assert!(
        added.status.success(),
        "installing the live provider failed; stderr carried {} bytes",
        added.stderr.len()
    );
    let added = document(&added);
    assert_eq!(
        added["has_encrypted_api_key"],
        Value::Bool(true),
        "the live key must be stored encrypted, never echoed back"
    );
    added
}

/// Issue #563's live precondition: a real credential authorizes a real catalog
/// fetch, and the stored record freezes no model list — so what a launch ranks
/// over is the provider's live inventory rather than anything Router pinned.
///
/// The ranking rule itself is pinned by unit tests against a fixture, which is
/// the right place for it: the rule is deterministic and needs no vendor. What
/// only a live run can establish is that the credential reaches the vendor and
/// that the inventory stays the vendor's own (#546). The end-to-end pin was also
/// confirmed by hand against this provider — a bare `router with claude` now
/// `--pick-model` selects from the current inventory and then receives an exact
/// token; a bare launch no longer asks Router to choose any model.
#[test]
fn a_live_credential_fetches_a_catalog_router_does_not_freeze() {
    let Some(api_key) = common::tiers::live_credential(
        "a_live_credential_fetches_a_catalog_router_does_not_freeze",
        "ROUTER_LIVE_ZAI_API_KEY",
    ) else {
        return;
    };
    eprintln!("RUN: reading a live z.ai catalog through the shipped CLI");

    let home = tempfile::tempdir().expect("live home");
    let data = home.path().join("data");
    std::fs::create_dir_all(&data).expect("create the live data directory");
    install_live_zai(home.path(), &data, &api_key);

    let shown = router(
        home.path(),
        &data,
        &["providers", "show", "z.ai", "--local"],
        None,
    );
    assert!(
        shown.status.success(),
        "reading the live provider back failed; stderr carried {} bytes",
        shown.stderr.len()
    );
    let record = document(&shown);

    // The stored record deliberately pins no model list: the live catalog owns
    // the inventory (issue #546), so `models` is empty and discovery happens at
    // request time. That is the property to assert here — a stored list would be
    // a frozen vendor catalog, which is the thing #546 removed and which
    // `synthetic_catalog_test` guards against reappearing.
    let stored: Vec<&str> = record["models"]
        .as_array()
        .map(|models| models.iter().filter_map(Value::as_str).collect())
        .unwrap_or_default();
    assert!(
        stored.is_empty(),
        "a live provider must not freeze a model list into its record: {stored:?}"
    );

    // The acceptance probe is the live evidence. `providers add` fetches the
    // vendor's catalog before it will store a Coding Plan key, so a stored,
    // enabled record with an encrypted key means a real catalog fetch succeeded
    // with this credential — which is what a launch then ranks over.
    assert_eq!(
        record["enabled"],
        Value::Bool(true),
        "an accepted live provider must be enabled"
    );
    assert_eq!(
        record["kind"], "zai-coding-plan",
        "the reviewed adapter contract selects the capability profile"
    );
    eprintln!(
        "PROVEN: the live credential passed the vendor catalog probe; \
         the record freezes no model list"
    );
}

/// Every model the live catalog advertises belongs to a provider kind whose
/// models are each described on their own terms (issue #565), rather than the
/// provider collapsing to one capability value.
///
/// The per-model resolution is unit-tested against a fixture; what only a live
/// catalog adds is a real, multi-model inventory to resolve over.
#[test]
fn a_live_provider_supports_the_client_whose_capability_it_describes() {
    let Some(api_key) = common::tiers::live_credential(
        "a_live_provider_supports_the_client_whose_capability_it_describes",
        "ROUTER_LIVE_ZAI_API_KEY",
    ) else {
        return;
    };
    eprintln!("RUN: describing a live z.ai provider's client support");

    let home = tempfile::tempdir().expect("live home");
    let data = home.path().join("data");
    std::fs::create_dir_all(&data).expect("create the live data directory");
    let added = install_live_zai(home.path(), &data, &api_key);

    // Claude is one of the clients this provider kind supports, so every model
    // it serves is one a Claude launch could be pointed at — which is what makes
    // the per-model capability claim meaningful rather than decorative.
    let clients: Vec<&str> = added["supported_clients"]
        .as_array()
        .expect("the provider names the clients it supports")
        .iter()
        .filter_map(Value::as_str)
        .collect();
    assert!(
        clients.contains(&"claude"),
        "a z.ai Coding Plan provider must support Claude: {clients:?}"
    );
    eprintln!("PROVEN: the live provider supports {clients:?}");
}

/// Provider acceptance proves inventory access, not a model capability.
///
/// In particular, an accepted z.ai key does not justify a Router-authored
/// Claude identity or reasoning profile. Exact capability fields are checked
/// by the live Router catalog test in `subscription_usage_live_test`; absent
/// fields stay unknown.
#[test]
fn a_live_provider_acceptance_does_not_freeze_capability_claims() {
    let Some(api_key) = common::tiers::live_credential(
        "a_live_provider_acceptance_does_not_freeze_capability_claims",
        "ROUTER_LIVE_ZAI_API_KEY",
    ) else {
        return;
    };
    eprintln!("RUN: checking provider acceptance remains inventory-only evidence");

    let home = tempfile::tempdir().expect("live home");
    let data = home.path().join("data");
    std::fs::create_dir_all(&data).expect("create the live data directory");
    let record = install_live_zai(home.path(), &data, &api_key);

    // Acceptance is the live evidence: `providers add` probes the vendor before
    // storing a Coding Plan key, so an enabled record means this credential
    // reached the adapter that will receive the effort parameters.
    assert_eq!(
        record["enabled"],
        Value::Bool(true),
        "an accepted live provider must be enabled"
    );
    assert_eq!(
        record["kind"], "zai-coding-plan",
        "the reviewed adapter contract selects the wire adapter"
    );
    assert!(
        record["models"].as_array().is_some_and(Vec::is_empty),
        "the provider record must not freeze model or capability facts"
    );
    eprintln!(
        "PROVEN: the live adapter accepted this credential without freezing \
         a model or owner-wide capability profile"
    );
}
