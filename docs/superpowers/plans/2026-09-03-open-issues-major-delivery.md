# Open Issues Major Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close #192, #390, #391, #392, and #393 in one major-release pull request with canonical
route namespaces, fully live model catalogs, backward-compatible token storage, and ownership-aware
client repair.

**Architecture:** A typed route registry owns network classification and endpoint generation; a
structured catalog cache owns provider metadata and exact model identity; a pure client analysis
layer feeds diagnostics, safe launch overlays, and transactional repair. The storage compatibility
fix uses one decoder-selection function so open and reload behavior cannot diverge.

**Tech Stack:** Rust 2024, Axum, Tokio, Reqwest, Serde/serde_json, toml_edit, Clap/Lino Arguments,
SHA-256, existing durable-file primitives, React/Vite admin UI, GitHub Actions release automation.

**Spec:** `docs/superpowers/specs/2026-09-03-open-issues-major-delivery-design.md`

## Global Constraints

- One branch and one pull request deliver all five issues.
- Production code contains no closed list of commercial model IDs, families, or versions.
- Service kind describes the caller protocol and never chooses the upstream provider by itself.
- Removed routes are local `404` responses before authentication, body parsing, credential lookup,
  or upstream access.
- Dry-run performs zero writes, token mutations, catalog calls, health calls, and inference calls.
- Repair never reads from or writes to vendor authentication stores, third-party private storage,
  shell startup files, client caches, or history.
- Candidate verification uses documented non-inference catalog/health requests only.
- Every red test commit is followed by a focused green implementation commit.
- `changelog.d` declares `bump: major`; release automation owns the version number.

---

### Task 1: Restore pre-0.125.4 token-store reads and decoder diagnostics

**Files:**
- Modify: `src/storage/associative.rs`
- Modify: `src/storage.rs`
- Modify: `src/storage/associative_tests.rs`
- Modify: `src/storage_tests.rs`
- Modify: `tests/associative_storage_test.rs`
- Create: `tests/fixtures/token_stores/v0.125.3-one-record.lino`

**Interfaces:**
- Produces: `fn optional_object_field<'a>(value: &'a LinoValue, key: &str, context: &str)
  -> Result<Option<&'a LinoValue>, String>`.
- Produces: `fn decode_text_records(contents: &str) -> Result<(Vec<TokenRecord>, bool), String>` in
  `storage.rs`; the boolean retains the existing “legacy input needs migration” decision.
- Consumes: existing `associative::decode_text` and `legacy::decode_text` without changing their
  successful formats.

- [ ] **Step 1: Write the missing-field and diagnostic regression tests**

  Add a literal `v0.125.3` fixture whose record omits `client_kind` and `principal_id`. Assert that
  `TextTokenStore::open`, `list_tokens`, and a write/reopen cycle preserve the record with both
  fields equal to `None`. Add malformed input assertions requiring a message containing both
  `associative decoder:` and `legacy decoder:` in that order.

- [ ] **Step 2: Verify the tests fail for the released regression**

  Run:
  `cargo test --locked --test associative_storage_test pre_0_125_4 -- --nocapture`
  and
  `cargo test --locked storage::tests::decoder_errors_preserve_both_causes --lib -- --nocapture`.
  Expected: the fixture fails at `record value is missing client_kind`; the malformed input exposes
  only the legacy error.

- [ ] **Step 3: Commit the red reproduction**

  Run `git add src/storage/associative_tests.rs src/storage_tests.rs tests/associative_storage_test.rs tests/fixtures/token_stores/v0.125.3-one-record.lino`
  and `git commit -m "test: reproduce legacy token store read regression"`.

- [ ] **Step 4: Implement absence-aware optional fields and combined decoding**

  Make `optional_string_field` return `Ok(None)` when `optional_object_field` finds no key, while
  preserving errors for present values other than string/null. Route both `open` and `load_map`
  through `decode_text_records`. When both codecs fail, return:
  `associative decoder: {associative}; legacy decoder: {legacy}`.

- [ ] **Step 5: Verify compatibility and commit green**

  Run `cargo test --locked storage --lib -- --nocapture` and
  `cargo test --locked --test associative_storage_test -- --nocapture`.
  Commit with `git commit -am "fix: read token stores from pre-binding releases"` plus the fixture
  if it was not already staged.

### Task 2: Define the typed canonical route contract

**Files:**
- Create: `src/route_contract.rs`
- Create: `src/route_contract_tests.rs`
- Modify: `src/lib.rs`
- Modify: `src/api_error.rs`
- Modify: `src/metrics.rs`

**Interfaces:**
- Produces:

  ```rust
  pub enum RouteClass { Neutral, Management, Service(ServiceKind) }
  pub enum ServiceKind {
      Anthropic, OpenAi, Codex, Qwen, Gemini, Vertex,
      Bedrock, GitHub, Git, ActivityPub,
  }
  pub enum ListenerKind { Combined, InferenceOnly, Admin, GitHubAdapter }
  pub enum RouteAuth { None, Client, Admin }
  pub struct RouteSpec {
      pub id: RouteId,
      pub method: Method,
      pub template: &'static str,
      pub class: RouteClass,
      pub auth: RouteAuth,
      pub dialect: ApiDialect,
      pub listeners: &'static [ListenerKind],
  }
  pub fn endpoint_base(origin: &str, service: ServiceKind) -> String;
  pub fn route_for_path(path: &str) -> Option<&'static RouteSpec>;
  ```

- Consumes: saved server values as origins only; callers no longer append literal legacy prefixes.

- [ ] **Step 1: Write the inventory and endpoint-builder tests**

  Add literal expectations for every path in #391, every route class, authentication requirement,
  listener eligibility, and client base:
  `anthropic -> /api/services/anthropic`, `codex -> /api/services/codex/v1`,
  `openai -> /api/services/openai/v1`, `qwen -> /api/services/qwen/v1`, and
  `gemini -> /api/services/gemini`. Assert no two specs share method/template/listener and no spec
  is directly below `/api/` except `/api/health`.

- [ ] **Step 2: Verify red and commit the contract tests**

  Run `cargo test --locked route_contract --lib -- --nocapture`.
  Expected: compile failure because `route_contract` and its types do not exist.
  Commit `test: define canonical route namespace contract`.

- [ ] **Step 3: Implement the registry and typed dialect lookup**

  Define the enums/specs as closed exhaustive types, add builders that trim only trailing origin
  slashes, and replace `api_error::dialect_for_path` substring logic with registry lookup plus a
  neutral fallback for unknown paths.

- [ ] **Step 4: Verify green and commit**

  Run `cargo test --locked route_contract --lib -- --nocapture` and
  `cargo test --locked api_error --lib -- --nocapture`.
  Commit `feat: centralize canonical route contracts`.

### Task 3: Assemble canonical combined, inference-only, admin, and GitHub adapter listeners

**Files:**
- Modify: `src/server_router.rs`
- Modify: `src/admin_api.rs`
- Create: `src/github_adapter.rs`
- Modify: `src/main.rs`
- Modify: `src/cli.rs`
- Modify: `src/config.rs`
- Modify: `src/server_command.rs`
- Modify: `src/lib.rs`
- Create: `tests/route_namespace_test.rs`
- Modify: `tests/network_security_audit_test.rs`
- Modify: `tests/admin_endpoints_test.rs`

**Interfaces:**
- Produces: `pub fn router(state: AppState, config: &Config, listener: ListenerKind) -> Router`.
- Produces: configuration fields `inference_only: bool` and optional private GitHub adapter
  listener address, populated by `--inference-only`/`INFERENCE_ONLY=1` and adapter CLI/env settings.
- Consumes: `RouteSpec` exclusively when registering handlers and middleware.

- [ ] **Step 1: Add canonical positive, legacy 404, and listener-isolation tests**

  Use instrumented body extractors and upstream counters. For every removed route, test missing,
  invalid, client, and admin credentials and assert status `404`, body-read count `0`, credential
  lookup count `0`, and upstream count `0`. Assert management is absent from inference-only,
  services are absent from admin, and fixed gh paths exist only on `GitHubAdapter`.

- [ ] **Step 2: Verify red and commit**

  Run `cargo test --locked --test route_namespace_test -- --nocapture`.
  Expected: canonical paths return `404` and legacy paths remain registered.
  Commit `test: require disjoint canonical listener namespaces`.

- [ ] **Step 3: Rebuild listeners from classified route groups**

  Register `/api/health`, canonical management handlers, and each canonical service group. Move
  metrics and subscription health under management authentication. Keep UI assets at `/` only on
  the admin listener. Ensure fallback runs outside all auth layers so unknown paths are never
  authenticated or parsed. Add the private gh adapter without merging it into other routers.

- [ ] **Step 4: Verify all route surfaces and commit**

  Run `cargo test --locked --test route_namespace_test -- --nocapture`,
  `cargo test --locked --test network_security_audit_test -- --nocapture`, and
  `cargo test --locked --test admin_endpoints_test -- --nocapture`.
  Commit `feat: serve disjoint service and management namespaces`.

### Task 4: Move every Router consumer to canonical endpoint builders

**Files:**
- Modify: `src/auth_remote.rs`
- Modify: `src/tokens_remote.rs`
- Modify: `src/providers_cli.rs`
- Modify: `src/managed_server.rs`
- Modify: `src/managed_server/catalog.rs`
- Modify: `src/managed_server/discovery.rs`
- Modify: `src/clients.rs`
- Modify: `src/clients/catalog.rs`
- Modify: `src/clients/json_config.rs`
- Modify: `src/configure.rs`
- Modify: `src/with_command.rs`
- Modify: `src/doctor.rs`
- Modify: `ui/src/api.js`
- Modify: `deploy/k8s/router.yaml`
- Modify: `deploy/akash/deploy.yaml`
- Modify: `docker/tunnel/entrypoint.sh`
- Modify: affected tests under `src/*_tests.rs` and `tests/`

**Interfaces:**
- Consumes: `route_contract::{endpoint_base, management_endpoint, RouteId}`.
- Produces: generated client configuration that treats the saved server value as an origin and
  appends exactly one canonical namespace.

- [ ] **Step 1: Convert existing consumer tests to literal canonical expectations**

  Update remote command, managed server, setup/remove/doctor, UI API, deployment probe, and fixture
  expectations. Add a test that origins with/without a trailing slash yield the same endpoint and
  never duplicate `/v1` or `/api`.

- [ ] **Step 2: Verify red and commit**

  Run `cargo test --locked remote --lib -- --nocapture`,
  `cargo test --locked managed_server --lib -- --nocapture`,
  `cargo test --locked --test clients_cli_test -- --nocapture`, and
  `npm run build --prefix ui`.
  Expected: old literal paths fail the new expectations.
  Commit `test: require canonical paths from every consumer`.

- [ ] **Step 3: Replace literal paths with route-contract builders**

  Route remote auth/tokens/providers/login/usage/accounts through management builders. Route each
  client integration through its service builder. Update the UI and deployment probes. Preserve
  protocol request bodies, streaming, tool translation, quota headers, and provider selection.

- [ ] **Step 4: Verify green and commit**

  Re-run the focused Rust commands and `npm ci --prefix ui && npm run build --prefix ui`. Confirm
  `git diff -- ui/dist` contains only the deterministic endpoint update. Commit
  `feat: migrate clients and management tools to canonical routes`.

### Task 5: Preserve full live catalog records and follow pagination

**Files:**
- Modify: `src/model_catalog.rs`
- Modify: `src/model_catalog_tests.rs`
- Modify: `src/model_routing.rs`
- Modify: `src/model_routing_stored.rs`
- Modify: `src/model_routing_catalog_snapshot.rs`
- Modify: `src/providers.rs`
- Modify: `src/provider_proxy.rs`
- Modify: `src/subscription.rs`
- Modify: `src/auth_import.rs`
- Modify: `src/refresh.rs`
- Modify: `tests/synthetic_catalog_test.rs`
- Create: `tests/catalog_pagination_test.rs`

**Interfaces:**
- Produces:

  ```rust
  pub struct CatalogRecord {
      pub provider: SubscriptionProvider,
      pub account: String,
      pub canonical_id: String,
      pub raw: serde_json::Map<String, serde_json::Value>,
      pub source_order: u64,
      pub fetched_at: i64,
      pub health_generation: String,
      pub protocols: BTreeSet<ClientProtocol>,
  }
  pub struct ExposedModel {
      pub exposed_id: String,
      pub provider: SubscriptionProvider,
      pub account: String,
      pub canonical_id: String,
      pub raw: serde_json::Map<String, serde_json::Value>,
  }
  ```

- Produces: bounded provider-specific pagination iterators with visited-token detection.
- Consumes: credential generation changes from import/refresh/provider mutation for invalidation.

- [ ] **Step 1: Add synthetic metadata, pagination, invalidation, and collision tests**

  Use only invented model IDs such as `future-saffron-91` and `future-cobalt-12`. Serve at least
  three pages for Anthropic/OpenAI and two `nextPageToken` pages for Google. Assert raw unknown
  objects and source order survive, looped tokens fail closed, identical IDs collide, credential
  replacement refreshes immediately, and one rejected account hides only its records.

- [ ] **Step 2: Verify red and commit**

  Run `cargo test --locked --test catalog_pagination_test -- --nocapture` and
  `cargo test --locked --test synthetic_catalog_test -- --nocapture`.
  Expected: only one page is requested and metadata is reconstructed/lost.
  Commit `test: require lossless paginated live catalogs`.

- [ ] **Step 3: Implement structured generations and bounded pagination**

  Store records per provider/account/generation; replace a generation atomically after all pages
  validate. Preserve `raw`, overlay Router fields only in outward projections, detect pagination
  loops, and invalidate on every authoritative credential/provider mutation.

- [ ] **Step 4: Verify routing and commit**

  Run the two focused tests plus `cargo test --locked model_catalog --lib -- --nocapture` and
  `cargo test --locked model_routing --lib -- --nocapture`.
  Commit `feat: retain paginated provider catalog records`.

### Task 6: Finish client-specific catalog projection and z.ai dynamic routing

**Files:**
- Modify: `src/zai_coding_plan.rs`
- Modify: `src/zai_coding_plan_tests.rs`
- Modify: `src/client_policy.rs`
- Modify: `src/model_routing.rs`
- Modify: `src/proxy.rs`
- Modify: `src/proxy_openai.rs`
- Modify: `src/anthropic_bridge.rs`
- Modify: `src/gemini/native.rs`
- Modify: `src/clients/catalog.rs`
- Modify: `src/clients.rs`
- Modify: `src/with_command.rs`
- Modify: `tests/client_fixture_test.rs`
- Modify: `tests/cross_vendor_translation_test.rs`
- Create: `tests/claude_catalog_startup_test.rs`

**Interfaces:**
- Produces: an exact request-scoped map
  `(ClientKind, exposed_id) -> (provider, account, canonical_id, protocol)`.
- Consumes: signed token `client_kind`/`principal_id`, native route identity, structured live catalog,
  provider/client/protocol policy, and exact risk acknowledgements.

- [ ] **Step 1: Add real-shape Claude startup and future z.ai model tests**

  Replay `GET /api/services/anthropic/v1/models?limit=1000` with a valid Claude-bound token and no
  `x-link-assistant-client`. Assert a future GLM record is exposed with preserved metadata, selected
  through non-streaming/SSE/tool/count-token paths, and sent upstream only as its canonical ID.
  Assert generic/forged clients, policy-incompatible protocols, and wrong subscribers make zero
  upstream calls.

- [ ] **Step 2: Verify red and commit**

  Run `cargo test --locked --test claude_catalog_startup_test -- --nocapture` and
  `cargo test --locked zai_coding_plan --lib -- --nocapture`.
  Expected: the startup request is denied without the private header and the future GLM name is
  rejected by `REVIEWED_MODELS`.
  Commit `test: expose future models through native client catalogs`.

- [ ] **Step 3: Remove name policy and authorize native catalog evidence**

  Delete `REVIEWED_MODELS` and provider-store validation based on names. Retain explicit z.ai kind,
  enabled/risk settings, recognized client/protocol matrix, exact unsupported-client override, and
  subscriber ownership. Treat the canonical route plus signed client binding as catalog evidence;
  request headers may add evidence but cannot create authority.

- [ ] **Step 4: Implement reversible projection and launch discovery ownership**

  Build exact request maps without prefix stripping. In Claude `with` and setup, set
  `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1`, remove
  `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, higher-priority credentials, static catalog settings,
  and model-family pins unless explicitly selected. Preserve persistent config byte-for-byte for
  `with` and print the discovery-traffic diagnostic.

- [ ] **Step 5: Verify full policy matrix and commit**

  Run the two focused tests, `cargo test --locked client_policy --lib -- --nocapture`,
  `cargo test --locked --test cross_vendor_translation_test -- --nocapture`, and
  `cargo test --locked --test client_fixture_test -- --nocapture`.
  Commit `feat: route dynamic client catalogs by exact identity`.

### Task 7: Add ownership-aware analysis to list, show, doctor, and with

**Files:**
- Create: `src/clients/analysis.rs`
- Create: `src/clients/analysis_tests.rs`
- Modify: `src/clients.rs`
- Modify: `src/clients/doctor.rs`
- Modify: `src/clients/files.rs`
- Modify: `src/clients/json_config.rs`
- Modify: `src/with_command.rs`
- Modify: `src/cli/client_ops.rs`
- Modify: `src/client_command.rs`
- Modify: `tests/clients_cli_test.rs`
- Modify: `tests/clients_secret_safety_test.rs`
- Create: `tests/client_ownership_test.rs`

**Interfaces:**
- Produces:

  ```rust
  pub enum OwnershipState {
      Unconfigured, Foreign, ManagedIntact, ManagedDrifted, Ambiguous,
  }
  pub struct ClientConfigAnalysis {
      pub client: ClientKind,
      pub state: OwnershipState,
      pub safe_origin: String,
      pub effective_source: ConfigSource,
      pub conflicts: Vec<ConflictKey>,
      pub observed: Vec<ObservedFile>,
  }
  pub fn analyze_client(manager: &ClientManager, client: ClientKind)
      -> Result<ClientConfigAnalysis, ClientError>;
  ```

- Consumes: ambient environment, public client config, managed environment, marker metadata, route
  contract, and per-client precedence descriptions.

- [ ] **Step 1: Add isolated-home state and precedence tests**

  Create exact public config shapes produced by `@z_ai/coding-helper 0.1.1` for Claude, Codex, and
  OpenCode plus arbitrary Qwen drift. Assert all five states, invalid JSON/TOML, missing/corrupt
  markers, higher-priority credentials, disabled discovery, static catalogs, model pins, safe
  source reporting, and secret-free text/JSON output.

- [ ] **Step 2: Verify red and commit**

  Run `cargo test --locked --test client_ownership_test -- --nocapture`.
  Expected: status reports a foreign URL as `configured: true` and has no ownership state.
  Commit `test: define client configuration ownership states`.

- [ ] **Step 3: Implement pure analysis and route all diagnostics through it**

  Add per-client critical-setting descriptors and effective precedence evaluation. Never retain
  secret values in result types. Set legacy `configured` true only for `ManagedIntact`; add the
  explicit state/source/conflict fields to list/show/doctor output. Use the same analysis to build
  non-persistent `with` overlays.

- [ ] **Step 4: Verify diagnostics, launch isolation, and commit**

  Run the ownership test, `cargo test --locked clients --lib -- --nocapture`,
  `cargo test --locked --test clients_cli_test -- --nocapture`, and
  `cargo test --locked --test clients_secret_safety_test -- --nocapture`.
  Commit `feat: diagnose client configuration ownership and drift`.

### Task 8: Implement transactional repair, snapshots, and rollback

**Files:**
- Create: `src/clients/repair.rs`
- Create: `src/clients/repair_snapshot.rs`
- Create: `src/clients/repair_tests.rs`
- Modify: `src/clients.rs`
- Modify: `src/clients/credentials.rs`
- Modify: `src/clients/files.rs`
- Modify: `src/clients/json_config.rs`
- Modify: `src/client_global.rs`
- Modify: `src/cli/client_ops.rs`
- Modify: `src/client_command.rs`
- Modify: `src/token_admin.rs`
- Modify: `src/tokens_remote.rs`
- Modify: `src/audit.rs`
- Create: `tests/client_repair_test.rs`
- Create: `tests/client_repair_failure_test.rs`

**Interfaces:**
- Produces:

  ```rust
  pub struct RepairPlan {
      pub analysis: ClientConfigAnalysis,
      pub changes: Vec<PlannedFileChange>,
      pub token_action: TokenAction,
      pub validation: ValidationAction,
  }
  pub struct RepairResult {
      pub client: ClientKind,
      pub before: OwnershipState,
      pub after: OwnershipState,
      pub backup_id: Option<String>,
      pub changed: bool,
  }
  pub fn plan_repair(manager: &ClientManager, client: ClientKind) -> Result<RepairPlan, ClientError>;
  pub async fn apply_repair(manager: &ClientManager, plan: RepairPlan)
      -> Result<RepairResult, ClientError>;
  pub fn rollback_repair(manager: &ClientManager, client: ClientKind, id: &str)
      -> Result<RepairResult, ClientError>;
  ```

- Consumes: pure analysis, public management token issuance/revocation, non-inference validation,
  `durable_file` atomic writes/locks, and route-contract endpoint builders.

- [ ] **Step 1: Add CLI parsing, dry-run purity, and idempotency tests**

  Assert the three command forms from #393. Capture filesystem hashes/mtimes, token-store records,
  audit events, and upstream counters before/after dry-run. Assert an intact second repair changes
  none of them and `--all` returns one ordered independent result per supported client.

- [ ] **Step 2: Add snapshot and failure-injection tests**

  Assert backup directory `0700`, credential-bearing file copies `0600`, exact bytes/existence/mode/
  SHA-256, secret-free manifest/output, symlink and non-regular refusal, analyze/write race refusal,
  failure between every two writes with full byte/mode restoration, candidate validation before
  overwrite, and revocation rules. Assert vendor auth/private stores stay byte-identical.

- [ ] **Step 3: Add rollback conflict tests**

  Assert opaque-ID validation, successful exact restore, refusal on any post-repair user edit, and
  preservation of the original configure-undo snapshot with only its post-configure hash updated.

- [ ] **Step 4: Verify red and commit**

  Run `cargo test --locked client_repair --lib -- --nocapture`,
  `cargo test --locked --test client_repair_test -- --nocapture`, and
  `cargo test --locked --test client_repair_failure_test -- --nocapture`.
  Expected: CLI forms and repair APIs do not exist.
  Commit `test: define transactional client repair contract`.

- [ ] **Step 5: Implement deterministic planning and private snapshots**

  Build changes only for adapter-declared public paths. Validate path type and preimage hashes,
  serialize a value-free manifest, create private directories/files explicitly, and expose a write
  seam used by failure-injection tests while production calls existing atomic-write primitives.

- [ ] **Step 6: Implement token lifecycle and transactional apply**

  Reuse a proven Router-owned token for intact/drifted states. For foreign state, issue a candidate
  bound to the selected client/subscriber, validate through the public non-inference catalog/health
  route, snapshot, write under a shared lock, re-read analysis, and only then revoke an obsolete
  Router-minted token. On error restore the snapshot and revoke only the unused candidate.

- [ ] **Step 7: Implement rollback and command rendering**

  Validate IDs as a single opaque component, compare current hashes with recorded post-state,
  restore exact bytes/existence/modes, and render stable secret-free text/JSON results. For `--all`,
  continue after per-client failure and return nonzero if any result failed.

- [ ] **Step 8: Verify repair matrix and commit**

  Re-run all three commands from Step 4 plus `cargo test --locked clients --lib -- --nocapture` and
  `cargo test --locked --test clients_token_revocation_test -- --nocapture`.
  Commit `feat: repair client routing with transactional rollback`.

### Task 9: Document the breaking migration and downstream rollout contract

**Files:**
- Create: `changelog.d/2026-09-03-open-issues-major.md`
- Create: `docs/use-cases/client-repair.md`
- Create: `docs/ci-cd/canonical-route-migration.md`
- Modify: `README.md`
- Modify: `docs/use-cases/configure-clients.md`
- Modify: `docs/use-cases/zai-coding-plan.md`
- Modify: `docs/use-cases/self-hosting.md`
- Modify: `docs/ci-cd/release-provenance.md`
- Modify: normative deployment/client/protocol documents that reference removed paths
- Modify: `deploy/k8s/router.yaml`
- Modify: `deploy/akash/deploy.yaml`

**Interfaces:**
- Produces: a `bump: major` fragment and complete old-to-new route table.
- Produces: candidate probe instructions usable by downstream deployments.

- [ ] **Step 1: Write the changelog and migration table**

  Include every removed path group and canonical replacement, listener boundaries, rerun-setup/
  repair instruction, gh adapter constraint, nginx/NPM topology, and explicit statement that
  provider credentials/subscriptions do not require reauthorization.

- [ ] **Step 2: Document live catalogs and repair safety**

  Explain lossless pagination, dynamic future models, signed-client policy, z.ai risk gates without
  name allowlists, ownership states, dry-run, snapshot permissions, rollback conflict behavior, and
  excluded vendor/private files.

- [ ] **Step 3: Record downstream candidate-validation procedure**

  Give downstream consumers a versioned Router image input, `/api/health` probe, selected canonical service probes,
  management non-exposure checks, checksum/provenance verification, and “verify candidate before
  switching running container” order. Do not edit historical raw case-study evidence.

- [ ] **Step 4: Verify docs and commit**

  Run `rust-script scripts/check-terminology.rs`,
  `rust-script --test scripts/check-terminology.rs`, all docs/support tests, and
  `git diff --check`. Commit `docs: publish canonical route and repair migration`.

### Task 10: Complete review, verification, merge, release, and re-audit

**Files:**
- Modify only defects found by review/verification.

**Interfaces:**
- Consumes: all task deliverables and the acceptance criteria in #192, #390, #391, #392, and #393.
- Produces: merged PR, public major release, verified package/assets/images, and a zero-open-issue
  snapshot or an expanded delivery batch if a new issue appears before merge.

- [ ] **Step 1: Run formatting, compile, lint, docs, and focused security checks**

  Run `cargo fmt --all -- --check`, `cargo check --locked --all-targets --all-features`,
  `cargo clippy --locked --all-targets --all-features -- -D warnings`, and
  `RUSTDOCFLAGS='-D warnings' cargo doc --locked --no-deps --all-features`.

- [ ] **Step 2: Run the complete functional suite**

  Run `cargo test --locked --all-features --workspace` with local socket/process permission and
  require zero failures. Run the repository's release-script contract tests, route inventory tests,
  repair failure-injection matrix, and doc tests.

- [ ] **Step 3: Run clean coverage and audits**

  Run `cargo llvm-cov clean --workspace`, the repository's all-feature coverage command, and its
  ratchet check. Run `cargo audit`, `npm ci --prefix ui`, `npm audit --prefix ui`, and
  `npm run build --prefix ui`; confirm no unexplained `ui/dist` drift.

- [ ] **Step 4: Build release/package artifacts locally**

  Run `cargo build --locked --release`, `cargo package --locked --list`, file-size/terminology/
  changelog gates, and `git diff --check`. Confirm the worktree is clean after the final commit.

- [ ] **Step 5: Review every acceptance bullet**

  Compare the final diff and test names line-by-line with all five issue bodies and reopened comments.
  Fix every critical/important gap and repeat affected verification. Because this session forbids
  spawning reviewer agents, perform the review inline and use required GitHub review/CI gates as the
  independent execution environment.

- [ ] **Step 6: Keep the pull request visible and merge only on green**

  Push every milestone commit to `fix/open-issues-192-393`, keep the draft PR body synchronized with
  delivered scope and evidence, rebase/merge current `main` without force-pushing, mark ready only
  after required checks pass, and merge using the repository's permitted merge method.

- [ ] **Step 7: Verify the major release externally**

  Monitor the main-branch release workflow through completion. Verify the tag targets the release
  commit, GitHub assets/checksums/SBOMs are uploaded, crates.io serves the non-yanked version, and
  the public GHCR manifest contains Linux AMD64/ARM64 plus attestations. If release fails, create,
  merge, and verify a focused follow-up PR.

- [ ] **Step 8: Complete the downstream and issue audits**

  Re-query open Router issues immediately before merge and after release. Incorporate any newly open
  issue before completing this delivery. Validate each downstream rollout against the published
  candidate through the consumer's own repository or workflow before claiming it is switched.
