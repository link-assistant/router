# Original lexical block source draft

This source-only successor checks actual standalone JS/TS blocks through the
existing lexical fragment checker. Every continuing exit rejoins the incoming
binding set and its complete ownership/resource state. Block locals require
cleanup before a continuing exit; abrupt returns, breaks and continues retain
their enclosing function and nearest-loop boundaries. A complete abrupt scope
cannot acquire a later source continuation. Existing shadowing refusals remain.

The Rust emitter preserves a real block and the canonical native reader and
projection carry that block back to JS/TS. The receiving consumer still checks
the complete proposed source, reparses semantic meta and reproduces every
original Rust syntax token; a native block alone grants no executable authority.
Every previous implementation is retained in full with ordered language and
repository edits and lossless CST/source inverses. No cache or limit is added.

Independent JS, strict TS, native inverse, malformed-state, refusal and Rust
oracle sources are drafted and unrun. No compiler, preparer, translator, test,
experiment, local Rust tool or CI run was executed to validate this change.
General shadowing, exceptions and every unfinished bulk requirement remain open.
