# Schemars candidate source composition

Draft repair for [PR #785](https://github.com/link-assistant/router/pull/785).
The original complete candidate file reproduces the CI failure: its first case
expects two repository edits, but the existing producer correctly combines the
two original import edits and the ordered Clone history into one whole-source
edit. The reproduction completes with one pass and one assertion failure;
its independent deadline audit passes.

The receiving test now checks both original constituent edits, the complete
authored Clone profile and its fixed SHA-256, every ordered substitution and
inverse, the complete composed edit and the existing native source equation.
Both serialized/reparsed CST stages, the original whole inverse, private issuer,
copied-context refusals, changed-input refusals and original 60-second case
limits remain checked. The producer and production source are unchanged.

The complete Schemars candidate and Clone history files pass all six cases in
Node 20.20.2 and Bun 1.4.4 with installed TypeScript 5.9.3. Node's independent
audit records zero breaches, missing finite deadlines or errors. The observed
Node run takes 67.654951 seconds and peaks at 2,703,708,160 sampled cgroup bytes;
Bun takes 56.430821 seconds and peaks at 2,702,557,184 bytes. These are total
cgroup samples, not complete process peaks or controlled performance gains.

The [26-member archive](evidence/current-schemars-candidate-composition.tar.gz)
and [complete receipt](evidence/current-schemars-candidate-composition.json.gz)
preserve both whole source files, the original reproducing test, producer,
profile, all three full runs and both complete independent audit directories.
Every member was independently read back and hashed. The archive is 72,273
bytes, SHA-256 `fcda5e214a519554fb29e10a88baeb812e3b93d5ed551e4780d40c389ba50942`.
All child processes have been reaped; no raw evidence was retired.

The existing compiler selectors exclude test files, so this receiving-only
change does not alter the isolated compiler registration. The current complete
gate remains failed at its memory guard, and strict parity, production
generation, matrices, original performance deadlines and universal tool/account
privacy remain unfinished. No Rust tool or newly executable production-function
gain is claimed.
