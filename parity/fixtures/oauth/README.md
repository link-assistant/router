# Native OAuth fixture and contract evidence

All credential strings are inert fixtures. Tests use temporary directories,
injected fetch responses and a fixed Unix clock; they never read a user's home,
call live token endpoints, modify a real account, install dependencies or build
Rust. Run `node --test packages/javascript/test/native-oauth.test.mjs`.

The implementation follows local Rust contracts in `subscription.rs`,
`subscription/types.rs`, `refresh.rs`, `refresh_state.rs`,
`credential_recovery_store.rs`, `subscription/external.rs`, `claude_auth.rs` and
`model_catalog.rs`. It implements these six groups:

1. Claude nested and flat JSON access/refresh/expiry/scopes, and Codex auth.json
   nested tokens, account/id_token hints and JWT expiry hints. JWT payloads are
   unverified local metadata; only the provider proves authentication.
2. Claude and Codex JSON refresh grants using the official public clients,
   five-minute early renewal, preserved vendor fields, exact identity headers,
   same-process deduplication and native process locks.
3. Atomic owner-only credential persistence plus the Rust version-one
   refresh-recovery projection and fingerprint. A failed primary write retains
   the successor; a restarted process can reconcile it. If both writes fail,
   access is denied and the same process refuses another uncertain grant.
4. Explicit adopted-file references advance the owning file, while external
   refresh owners, binary storage and platform keychain operations fail closed.
5. Claude PKCE code authorization with a private one-use Rust readable pending
   file, state/expiry checks, full or inference-only scope requests, staged
   credential persistence and authenticated catalog acceptance before promotion.
6. Safe non-destructive file import after positive catalog acceptance, atomic
   source reference or explicitly external-owned snapshot, and candidate bearer
   preparation that preserves account pins and pauses before and after refresh.

Core integration is opt-in through explicit `credential_home`, `oauth.home` or
an account home with an explicitly configured Anthropic/Codex provider. It
never silently adopts the current user's vendor login. Catalogs remain exact
configured models; successful import alone does not invent a routing catalog.
`core.prepareCandidate` refreshes only an account selected for an inference
attempt. `core.catalogFor` isolates account aliases and client compatibility
without mutating account selection order.

Uncovered contracts: vendor Keychain selection/writes; Rust/native mixed-writer
flock interoperability; Gemini/Qwen grants; Codex interactive/device login;
full Rust catalog capability metadata/pagination variants; rotating import
transaction resume, bulk import and credential withdrawal; full refresh
recovery ladder/attribution; exact vendor OS/terminal user-agent rendering;
permanent uncertainty records across process restarts. Claude code-flow
successors rejected at catalog/promotion remain in a private stage, but this
module deliberately does not claim a compatible Rust resume operation.

The neighboring core fixture's Rust adapter has not been run locally; this
OAuth fixture similarly has native behavioral evidence, not an executed full
Rust/native parity certificate.
