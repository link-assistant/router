## What authoritative CI and Cargo facts constrain the design?

### Takeaway
Same-workflow `needs` on a successful native JS prerequisite gives a clear dependency; a separate workflow_run requires explicit source result/revision/trust handling. Bound expensive builds and keep publication writers uncancelled; share compatible caches without promising reuse across incompatible build configurations.

### Cited Findings
- GitHub requires needs dependencies to succeed; failed/skipped prerequisites propagate skipping unless a conditional continues execution. `always()` is appropriate for an aggregate reporter that inspects results, not permission to run Rust after a failed gate. Path-skipped workflows can leave required checks pending. — [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds).
- workflow_run triggers independent of upstream success; its ordinary GITHUB_SHA is the default-branch tip. It can gain secrets/write tokens even after an unprivileged run, so check conclusion and source head SHA/repository/event/artifact trust before executing code. Prefer reusable workflows under the original trigger for straightforward same-revision dependencies. — [workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).
- A concurrency group admits one active run; default pending replacement still happens with cancellation of active work disabled. `cancel-in-progress:true` explicitly cancels active runs. Use one shared repository writer group with false for releases/deploys/tags, separate job/matrix groups for replaceable read-only checks. `queue:max` is available but incompatible with true; it is optional to the required writer policy. — [concurrency documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).
- Cargo supports a common CARGO_TARGET_DIR/--target-dir; dev/test and release/bench artifacts occupy different profile directories, cross-target outputs separate by triple, and --target changes host build-script/proc-macro sharing. The Cargo book also describes sccache as cross-workspace compiled dependency sharing. Cache reuse therefore requires compatible toolchain, flags, features, profile and target; simply sharing a directory cannot erase incompatible compilations. — [Cargo build cache](https://doc.rust-lang.org/cargo/reference/build-cache.html).

### Inferences
- A read-only cancellation policy must not encompass release-writing jobs at workflow scope. Avoid top-level cancel:true when the same workflow includes publishing.
- Gate all paths that compile Rust, including test/coverage/container/setup smoke tools, not only the named main build job. Caller checks need explicit strict refusal/missing-feature semantics.
- Bounded local JS validation and exact-revision coordinator checks can prevent repeated expensive Rust rebuilds while remote CI remains the eventual full validation authority. Budget or disk limits justify reporting blocked readiness, never relabelling incomplete tests as green.

### Gaps
- Disk/CI savings are not quantified by this source audit; parent experiments must supply measured runtime/cache evidence.
