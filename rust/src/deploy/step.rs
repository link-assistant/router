//! The converge step: check the desired state, then act only if it does not hold.
//!
//! Every deployment step answers three questions in order — what did I check,
//! what did I find, and what did I do — because a deployment that fails has to
//! name the step rather than produce a stack trace (issues #570, #572).
//!
//! ## Why converge rather than run
//!
//! A step that acts unconditionally cannot be re-run: it restarts a healthy
//! container, re-mints a token that was fine, and gives an operator no way to
//! ask "what is missing?" without changing something. A step that checks first
//! is idempotent by construction, which is what makes the whole command usable
//! as a test fixture — a test can call it unconditionally, and a converged
//! deployment performs no actions at all.
//!
//! ## Why a skip is not a pass
//!
//! A step that quietly does nothing is indistinguishable from a step that
//! succeeded, and that ambiguity hid a real failure: a deployment with a
//! withdrawn subscription reported itself healthy while being impossible to
//! update. So [`Outcome::Skipped`] carries the reason, and it is printed.

use std::fmt;
use std::time::Duration;

/// What one step did.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Outcome {
    /// The desired state already held; nothing was done.
    ///
    /// A converged deployment is a run made entirely of these.
    AlreadyConverged(String),
    /// The step changed something to reach the desired state.
    Acted(String),
    /// The step could not run, and this is why.
    ///
    /// Never silent: an unmet prerequisite an operator did not ask about is the
    /// difference between "healthy" and "healthy but unable to serve".
    Skipped(String),
}

impl Outcome {
    /// Short tag used in reports and assertions.
    #[must_use]
    pub const fn tag(&self) -> &'static str {
        match self {
            Self::AlreadyConverged(_) => "already",
            Self::Acted(_) => "acted",
            Self::Skipped(_) => "skipped",
        }
    }

    /// What the step observed or did.
    #[must_use]
    pub fn detail(&self) -> &str {
        match self {
            Self::AlreadyConverged(detail) | Self::Acted(detail) | Self::Skipped(detail) => detail,
        }
    }

    /// Whether this outcome changed the deployment.
    ///
    /// The property `--status` relies on: a report must be able to prove it
    /// touched nothing.
    #[must_use]
    pub const fn changed_anything(&self) -> bool {
        matches!(self, Self::Acted(_))
    }
}

/// A step that failed, with everything needed to act on it.
///
/// The shape exists because an exception is not actionable. `expected` and
/// `found` are separate fields so a test can assert on the *shape* of a failure
/// report rather than on a message, and `purpose` explains what the check
/// protects — for the operator who did not write the step.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Failure {
    /// The step's name, so the failure names a step rather than a stack frame.
    pub step: &'static str,
    /// One sentence on what this check is for.
    pub purpose: &'static str,
    /// The state the step required.
    pub expected: String,
    /// The state it actually observed.
    pub found: String,
}

impl fmt::Display for Failure {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "step {} failed\n  expected: {}\n  found:    {}\n  why:      {}",
            self.step, self.expected, self.found, self.purpose
        )
    }
}

/// One step's result, with the time it took.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StepReport {
    pub step: &'static str,
    pub outcome: Result<Outcome, Failure>,
    pub took: Duration,
}

impl StepReport {
    /// The line an operator reads for this step.
    #[must_use]
    pub fn line(&self) -> String {
        let millis = self.took.as_millis();
        match &self.outcome {
            Ok(outcome) => format!(
                "{:<22} {:<8} {} ({millis} ms)",
                self.step,
                outcome.tag(),
                outcome.detail()
            ),
            Err(failure) => format!("{:<22} {:<8} {}", self.step, "failed", failure.expected),
        }
    }

    #[must_use]
    pub const fn failed(&self) -> bool {
        self.outcome.is_err()
    }
}

/// Everything a converge run did, in order.
///
/// Timing is per step because "deployment is slow" is unactionable: it took
/// per-step totals to learn that a cutover spent almost all of its wall clock in
/// one build and seconds everywhere else (issue #572).
#[derive(Debug, Default)]
pub struct Report {
    pub steps: Vec<StepReport>,
}

impl Report {
    /// Record one step, timing it.
    ///
    /// Steps run in order and stop at the first failure: a deployment that
    /// continues past a failed prerequisite produces a second, confusing failure
    /// whose cause is the first one.
    pub fn run(
        &mut self,
        step: &'static str,
        action: impl FnOnce() -> Result<Outcome, Failure>,
    ) -> bool {
        let started = std::time::Instant::now();
        let outcome = action();
        let failed = outcome.is_err();
        self.steps.push(StepReport {
            step,
            outcome,
            took: started.elapsed(),
        });
        !failed
    }

    /// Whether the run converged without failing.
    #[must_use]
    pub fn converged(&self) -> bool {
        self.steps.iter().all(|step| !step.failed())
    }

    /// Whether anything at all was changed.
    #[must_use]
    pub fn changed_anything(&self) -> bool {
        self.steps
            .iter()
            .filter_map(|step| step.outcome.as_ref().ok())
            .any(Outcome::changed_anything)
    }

    /// The failure that stopped the run, if one did.
    #[must_use]
    pub fn failure(&self) -> Option<&Failure> {
        self.steps
            .iter()
            .find_map(|step| step.outcome.as_ref().err())
    }

    /// Steps that skipped, with their reasons.
    #[must_use]
    pub fn skips(&self) -> Vec<(&'static str, &str)> {
        self.steps
            .iter()
            .filter_map(|step| match step.outcome.as_ref().ok()? {
                Outcome::Skipped(reason) => Some((step.step, reason.as_str())),
                _ => None,
            })
            .collect()
    }

    /// Total wall clock across every step.
    #[must_use]
    pub fn total(&self) -> Duration {
        self.steps.iter().map(|step| step.took).sum()
    }

    /// Print the report an operator reads.
    pub fn print(&self) {
        for step in &self.steps {
            println!("{}", step.line());
        }
        if let Some(failure) = self.failure() {
            eprintln!("\n{failure}");
        }
        // Skips are repeated at the end: in a long run the one line that
        // explains why nothing was provisioned scrolls past.
        let skips = self.skips();
        if !skips.is_empty() {
            println!("\nskipped:");
            for (step, reason) in skips {
                println!("  {step}: {reason}");
            }
        }
        println!("\ntotal {} ms", self.total().as_millis());
    }
}
