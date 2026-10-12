Reusable original Rust standard method-body extraction, actual primitive
Default macro expansion and shared typed specialization now pass paired Node
and Bun verification. Original Option bodies and selected Default blocks use
the ordinary checker and let/match/literal JavaScript/strict TypeScript emitter,
with actual source identity, ownership and parameter order retained.

Implementation commit `2bf7c3c3d` passed 261 focused cases and 262 unchanged
original-source regression cases in both engines. All fourteen earlier failed
and successful attempts, raw logs, exact source manifests and diagnostic
probes are archived and reopened byte-for-byte in a compact XZ evidence pack.

This bounded profile supports checked scalar or borrowed str Option payloads;
Result unwrap_or retains its earlier bounded contract. Custom/derived Default,
aggregate ownership, destruction, const execution, mutable borrowed-local flow,
complete core translation, corpus admissions and complete runtime parity
remain unproved. No Rust build ran.
