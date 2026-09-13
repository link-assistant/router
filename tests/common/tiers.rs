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
#[must_use]
pub fn live_credential(test: &str, variable: &str) -> Option<String> {
    if let Some(value) = protected(variable) {
        return Some(value);
    }
    SKIPPED.fetch_add(1, Ordering::Relaxed);
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
