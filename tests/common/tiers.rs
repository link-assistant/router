//! Named test tiers, and honest reporting of the one that can be absent.
//!
//! Router had the pieces of a layered strategy but not the strategy: no stated
//! tier for real clients against real providers, no single way to run them, and
//! no way to tell whether a behavior was proven by a real exchange or only by a
//! mock (issue #567).
//!
//! The failure mode this exists to prevent is not a missing test. It is a
//! missing test that reads as a present one: a suite of four hundred where
//! fifty quietly returned early still prints "400 passed". A tier that
//! no-ops silently is indistinguishable from a tier that passed, so every skip
//! here announces itself and names the credential it wanted.

#![allow(dead_code)]

use std::sync::atomic::{AtomicUsize, Ordering};

/// What a tier is trusted to prove, and what it needs to run.
///
/// The names are the contract: a contributor deciding whether a change is safe,
/// and a downstream project asking "is this path actually proven end to end",
/// both need to know which tier owns a property.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Tier {
    /// Pure logic. No process, no network. Runs everywhere, always.
    Unit,
    /// Router's own surfaces against mocks and fixtures: routing, translation,
    /// token boundaries, storage. Runs in CI on every change.
    Integration,
    /// Actual vendor binaries against a Router mock. Proves launch, argument
    /// construction, generated settings and protocol shape, and spends nothing.
    RealClientOffline,
    /// Real client, real Router, real provider. Proves what only a real
    /// exchange can: that a model answers, that a launch profile produces the
    /// intended presentation, that a catalog pins what the user selected, that
    /// a withdrawal actually withdraws.
    LiveCredentialed,
}

impl Tier {
    /// The tier's stable name, as reported in skip notices and documentation.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::Unit => "tier1-unit",
            Self::Integration => "tier2-integration",
            Self::RealClientOffline => "tier3-real-client-offline",
            Self::LiveCredentialed => "tier4-live-credentialed",
        }
    }
}

/// How many live-tier tests declined to run for want of a credential.
///
/// Counted rather than merely printed so a harness can assert on the number,
/// and so a reader of a passing run can still tell the tier was absent.
static SKIPPED: AtomicUsize = AtomicUsize::new(0);

/// How many live-tier tests have been skipped in this process so far.
#[must_use]
pub fn skipped_live_tests() -> usize {
    SKIPPED.load(Ordering::Relaxed)
}

/// The value of a protected credential variable, if this machine has one.
///
/// An empty variable is unset, not configured: a CI secret that is absent on a
/// fork expands to the empty string, and treating that as a credential turned a
/// skip into a confusing authentication failure.
#[must_use]
pub fn protected(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
}

/// A live-tier credential, or `None` having announced the skip.
///
/// The announcement is the point. A missing credential is a skip rather than an
/// error — a contributor without a subscription must never see red from this
/// tier — but it must not be invisible, so the tier, the test and the variable
/// that would enable it are all named on stderr.
///
/// `cargo test` captures stderr for passing tests, so the notice is surfaced by
/// `--nocapture`; the counter above is what a harness reads without it.
/// Announce a skip for a prerequisite that is not a credential.
///
/// A container runtime is the case this exists for: `router deploy` cannot be
/// exercised without one, and a contributor without Docker must not see red —
/// but a test that silently no-ops reports success for work it never did, which
/// is the failure the visible-skip rule prevents (issue #567).
pub fn unavailable(tier: Tier, test: &str, reason: &str) {
    SKIPPED.fetch_add(1, Ordering::Relaxed);
    record(tier, test, reason);
    eprintln!(
        "SKIP [{tier}] {test}: {reason}; this property is not proven by this run. \
         See docs/testing-tiers.md.",
        tier = tier.name(),
    );
}

#[must_use]
pub fn live_credential(test: &str, variable: &str) -> Option<String> {
    if let Some(value) = protected(variable) {
        return Some(value);
    }
    SKIPPED.fetch_add(1, Ordering::Relaxed);
    record(
        Tier::LiveCredentialed,
        test,
        &format!("{variable} is not set"),
    );
    // Never the value, only the name: this line is written to CI logs.
    eprintln!(
        "SKIP [{tier}] {test}: {variable} is not set; \
         this property is not proven by this run. \
         See docs/testing-tiers.md to run the live tier against a real \
         subscription.",
        tier = Tier::LiveCredentialed.name(),
    );
    None
}

/// The running test's name, as libtest names the thread it runs on.
#[must_use]
pub fn current_test() -> String {
    std::thread::current()
        .name()
        .unwrap_or("unnamed test")
        .to_string()
}

/// Whether an opt-in gate is `1`, having announced the skip when it is not.
///
/// A tier behind a switch rather than a credential (installed vendor clients,
/// a remote router, a billed probe) used to return early without a word, so a
/// green suite could not say which real-client cases never ran (issue #629).
#[must_use]
pub fn opt_in(tier: Tier, variable: &str) -> bool {
    let enabled = std::env::var(variable).as_deref() == Ok("1");
    if !enabled {
        unavailable(tier, &current_test(), &format!("{variable}=1 is not set"));
    }
    enabled
}

/// Append a skip to the file `scripts/verify-contracts.rs` names, as one JSON
/// line, so the verification result lists skipped tests by name. Parallel
/// tests interleave their stderr; one short append each does not.
fn record(tier: Tier, test: &str, reason: &str) {
    use std::io::Write as _;

    let Some(path) = std::env::var_os("ROUTER_VERIFICATION_SKIPS") else {
        return;
    };
    let line = serde_json::json!({"tier": tier.name(), "test": test, "reason": reason});
    let appended = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .and_then(|mut file| file.write_all(format!("{line}\n").as_bytes()));
    if let Err(error) = appended {
        eprintln!("warning: could not record the skip of {test}: {error}");
    }
}
