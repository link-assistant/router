# Document native JavaScript-first parity and a single coordinator push gate

CI-CD-BEST-PRACTICES.md covers release writers, cancellation, false-green prevention and template selection, but does not specify the [router#759](https://github.com/link-assistant/router/issues/759) native JavaScript-first contract or one coordinator-owned push per validated batch. The proposed patch adds that policy, distinguishes carried source/WASM from behavior parity, requires strict missing-feature rejection and deterministic pinned regeneration, and retains existing cancellation rules for release writers.

Document migration as incomplete until a complete native JS implementation and successful strict readiness gate exist. The template reusable prerequisite needs real caller checks and needs dependencies from every Rust build/test/publish/container path.

Acceptance: review the guidance against GitHub needs/workflow_run semantics, retain active writer cancel-in-progress:false, and update localized counterparts through the repository's normal translation workflow.

Deduplication: no matching open JavaScript-first or push-gate issue was found by the captured searches; recheck before creating.

## Reproduction, workaround and concrete fix

At [the audited source](https://github.com/link-assistant/hive-mind/blob/4b32bc12ceb8c0810bce57cc66160b4d60f8f4a6/docs/CI-CD-BEST-PRACTICES.md), search the file for native JS parity, carried-code rejection and a single coordinator-owned push. Template selection and serialized writers are described; this mixed-language readiness policy is absent. Until adoption, explicitly label incomplete ports blocked and run bounded native JS checks before the coordinator pushes a batch. Apply hive-mind.patch and pair its guidance with the two template gate proposals. Check failure, skip, drift and missing features stop every Rust path; ensure source roundtrip and WASM wrapping are not represented as native execution parity.

Proposed patch source: `docs/case-studies/issue-759/proposals/hive-mind.patch` in the Router research branch. The Router pull request will provide the eventual reviewable file permalink; no attachment is implied.
