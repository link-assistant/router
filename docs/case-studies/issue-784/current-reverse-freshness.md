# Current reverse regeneration

This repair belongs to [PR #785](https://github.com/link-assistant/router/pull/785).
The published file-lock tracing source had ten stale reverse outputs. Running
the actual generator updates both manifests and every affected meta, Rust-text
and TypeScript artifact. No generated output was edited by hand.

The source-constructor graph includes the complete file-lock source; this also
changes Gemini's graph proof and IR header without changing its emitted body.
The scoped census now includes two trivial no-op tracing callbacks instead of
one. This is source enumeration, not a new translation-rule coverage gain.
Top-level translated items remain 75; 726 items remain unsupported. Scoped
translated items become 67, with 645 unsupported and 12 conditional drafts.

The real `node scripts/regenerate-js-first.mjs --check` passes for all
12,054,217 output bytes with zero changed artifacts. Its invocation took
91.086500 s and peaked at 2,092,486,656 sampled cgroup bytes. The unchanged
whole `translator.test.mjs` passes all 12 Node cases and the independent complete
source/deadline audit: 265.733442 s and 2,250,698,752 sampled cgroup bytes.
Neither invocation hit the resource guard.

The [complete check archive](evidence/current-reverse-freshness.tar.xz) and
[receipt](evidence/current-reverse-freshness.receipt.json) preserve full streams,
memory receipts, the complete Node audit, original test source and complete
generated diff. Every archive member is reopened and verified. These checks
used a working draft derived from published `0e2341ac9`; they are not a
same-SHA complete-gate qualification.

Bun's original implicit five-second regeneration deadline remains unresolved.
The earlier CI invocation exceeded it and also reported these stale outputs;
the successful Node check does not qualify Bun. Strict parity, forward and
profile generation, source-size bounds, other original deadlines and universal
client/account privacy also remain unfinished. The complete gate is failed;
no Rust tool ran, and the pull request remains draft and unmerged.
