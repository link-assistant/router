# Production PKCE source-adoption draft

This implementation and every added source case are unverified and unrun.
No tests, experiments, diagnostics, translation, regeneration, local Rust tools,
push or CI ran. Every unfinished requirement in
[the ledger](bulk-draft-requirements.md) remains open.

Three actual production calculations in Codex device login, Codex callback login
and Claude login now call the concrete text SHA-256/base64url operation. The
library boundary absorbs the original native digest container and its generic
base64 input; application code borrows the same String or String field once.
The native wrapper performs the same UTF-8 hashing and unpadded URL encoding and
keeps the original unbounded native input behavior. Translation retains its
existing bounded scalar-text domain and must independently qualify full callers.
Original independent SHA/base64 test calculations and their test-only imports
remain in the Codex test source.

The complete pinned production originals and exact substitutions retain actual
enclosing lexical impl items. A finite source recipe recognizes the unchanged
URL encoder around a named Sha256 digest of a local/field `.as_bytes()` input and
records its explicit borrowed text replacement. It refuses different field
paths, arbitrary operand effects, foreign owners and destinations. This is a
source-construction recipe, not source/type/method/ownership admission: full
original bindings, types, effects, native oracle behavior and the actual forward
and reverse compiler still have to qualify the resulting application functions.

The reusable `language` sequence retains original complete call/source intents;
`repository` rules bind the explicit qualified text-core operation and actual
imports. Complete original and output Rust CSTs are serialized/reparsed and
whole source inverses retained. Native text source, actual Cargo manifest and
lockfile guards are freshly read before and after constructing the proposal.
No source/hash/owner/verdict/result cache is introduced across operations.

The previous base64 proposal now joins the complete adjacent Claude file history
instead of refusing the later legitimate source or forgetting its own originals.
Direct ordered descendant proposals retain full source equations, all guard
sources and final input rejoins. The bounded composer refuses nested descendant
plans; further stages must be supplied explicitly in order. Copied proposal data
supplies no private semantic or executable authority. The original base64 stage
and its own CST remain separately reviewable from the current final output.

Four complete compiler source equations retain full originals, native JS owner
spans and both ordered substitution phases, connected after the text SHA-256
source family. Independent unrun cases cover all actual calls and native test
preservation, original/current CSTs, adjacent history, guards, altered source,
wrong fusion operands/owners/targets and getter refusal. Existing forward/reverse
strict-TypeScript, fixed-vector and native SHA edge-case cases remain required.

No newly executable function or percentage is claimed. General namespace and
macro owner/export closure, broader methods/generics/effects/resources, complete
production translation and native parity, all source-history/timing/profile/
reverse repairs, receiving-export qualification and every original gate remain
unfinished source or verification requirements.
