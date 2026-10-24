# Byte-safe streaming source draft

The `sse_push_base64` compatibility interface reuses Router's actual native
`sse::push_blocks`. Pending tails and transport chunks cross the interface as
canonical base64 strings; conversion to UTF8 happens only for complete blocks.
Matching JavaScript framing preserves native LF/CRLF delimiter precedence,
lossy UTF8, BOM, NUL, empty blocks and incomplete tails. Framing does not interpret
data fields, JSON, DONE markers or protocol-specific business events.

The wrapper requires at most 1 MiB combined decoded input and 1,024 blocks, with
stable explicit errors and atomic owned results. Native code counts delimiters
before invoking the original drain-based routine. JavaScript uses one forward
scan. Complete wrapper, original production framer and runtime/declaration bytes
are rejoined together with the actual locked base64 package source. Changed
dependencies refuse in both directions. No public row or stored verdict issues
native binding permission.

Existing private whole-function forward/reverse issuers, checked Option/Result
meta, both independent interpreters and canonical Rust reproduction handle the
interface. Owned-outcome units add logical `src/sse.rs` and
`src/translation_stream_core.rs` mappings to their existing native source list;
the complete receiving root must contain its actual `mod sse;` and public wrapper
module. Eight complete source predecessors and adjacent native root histories
retain ordered language/repository substitutions and full CST inverses.

Independent source covers every byte boundary, invalid UTF8/base64, exact
limits, error atomicity, complete actual callers, strict TypeScript, both
interpreters, three-language units, source tampering and Rust native oracles.
All implementation, translator, compiler, test, experiment and Rust execution is
**unrun**. General transport cancellation/backpressure, HTTP and protocol-state
translation, production adoption and all other unfinished bulk rows remain open.
