# Option loop exits and streaming callers: source draft

All implementation, receiving cases and native oracle source remain unrun.
Actual absent Option branches can now leave their nearest loop with break or
continue. Original nearest-loop state and local cleanup checks still apply.
Each absent path must end before the successful payload continuation; one
fallthrough path refuses. Source controls inside nested loops or callbacks
cannot select the enclosing loop rule. Labels and controls without a genuine
nearest loop remain refused.

Actual function returns in these branches retain separate return/root/resource
outcomes. Normal Option propagation and complete ordinary fallbacks preserve
their original native syntax. New control arms emit an actual complete native
Option match, reconstruct the full JS proposal and still require fresh checked
meta plus exact complete Rust token reproduction.

This supplies a whole streaming caller draft using actual HTTP pull reads,
owned optional base64 chunks, a JSON collection accumulator, EOF break and
stream release on every function exit. The original transport remains binary;
the caller retains chunk order and does not interpret chunks as decoded UTF8.
Independent unrun receiving source joins all returned base64 chunks and compares
binary/Unicode payloads, empty EOF and post-close behavior. Scalar cases cover
continue, break, absent fallthrough and forged semantic meta.

All seven new independently written native oracle fixtures are registered in
the integration test discovered by the existing complete gated Cargo CI job.
The registration introduces no local Rust command or JavaScript gate bypass.
Native source, execution and parity remain separate obligations. Full original
flow and projection copies retain ordered language/repository substitutions,
native spans, serialized/reparsed lossless CST and complete inverses. Broader
streaming/protocol applications, generic/async iterators, namespace/bootstrap,
production adoption/parity and every other unfinished requirement remain open.
