# Persistent native client source draft

SOURCE ONLY; implementation and every independent case UNRUN. No local tests,
compilation, parser/translator/preparer execution, experiments or CI feedback
inspection performed. Full requirement drafting and translation remain unfinished.

Claude and Codex persistent setup/removal now use the existing private file
transaction and credential lifecycle rather than their explicit unsupported
branches. One common implementation template constructs real JS and TS modules
through separately retained language and repository source substitutions. Type
slots become explicit TS annotations; repository rules bind actual module paths.
No implementation generator executes during this drafting phase. Canonical TS
meta regeneration is still required after full drafting; changed prior TS files
carry explicit unverified draft headers rather than stale generated hash claims.

The Claude codec preserves first-takeover endpoint/environment predecessors,
user model keys, authorized saved model/default behavior, native gateway model
policy and marked legacy disable-flag migration. Removal restores only values
still owned by its current marker. Router credentials remain in the existing
private environment file, outside the public client settings. Marker writes and
config backups use the existing owner-private atomic file/rollback machinery.

The Codex codec retains provider selection, live Responses/OpenAI-auth behavior,
backend/realtime endpoints, catalog websocket policy and native predecessor
markers. Current OpenAI-auth providers and legacy env-key providers are both
recognized by native status. The TOML editor uses lossless tokens/trivia/UTF16
spans, a serialized/reparsed concrete-syntax representation and actual native
TOML parsing. It applies nonoverlapping field substitutions to normal, dotted,
quoted and inline tables while keeping unrelated values, comments, arrays,
multiline strings, BOM and line endings. Each complete result must independently
parse to precisely the requested field values before a file can be written.
Source plans preserve original full inverses and grant no compiler, ownership or
executable permission. Native TOML parsing remains an explicit external library.

Nine complete JS/TS implementation equations and four complete native Rust
implementation inputs retain source owners, ordered phases, native CST and full
inverses. No new dependency tree or cross-operation cache is introduced. Independent
unrun source covers both clients, ownership/idempotency/user edits, native model
policy, TOML forms/opaque regions/observer and overlap refusal, real private file
transactions, token rollback on failed setup, strict actual TS implementations,
source provenance/export and independent native takeover/removal tests. Native
clients.rs remains at its existing 999 lines; independent Rust cases extend its
separate test module. Rust stays CI only after all eight same-SHA JS gates.

Remote client issuance/proof-of-possession, durable remote revocation, complete
global undo, managed Codex loopback lifecycle, legacy catalog constraints and all
broader native feature parity/source namespace/production translation/full sync/
freshness/performance/receiving/delivery requirements remain OPEN. Native library
input changes still require explicit source-rule reconciliation; this draft is
not a completed general Rust-to-JS client implementation compiler. No passing
checks, executable coverage increase or fully drafted/verified completion is claimed.
