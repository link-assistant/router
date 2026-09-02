# Client-bound subscription entitlements and z.ai Coding Plan implementation plan

> **For Codex:** Use the executing-plans workflow, implement each task test-first, and create a
> visible commit after every red/green milestone.

**Goal:** Close #389 and #390 in PR #388 by enforcing signed client/subscriber entitlements for all
consumer subscriptions and adding a policy-gated z.ai Coding Plan provider with client-specific
catalogs and exact protocol routing.

**Architecture:** Add durable signed client bindings, centralize entitlement/evidence decisions,
filter catalogs and re-check dispatch, retain bridge adapters behind exact runtime overrides, then
add a distinct z.ai provider kind whose health, identities, endpoints, subscriber ownership, and
risk acknowledgements are all explicit.

**Tech stack:** Rust, Axum, Reqwest, Serde, Clap/Lino Arguments, Tokio, Wiremock, existing JSONL
audit and Links token stores.

---

## Task 1: Specify token bindings and the consumer entitlement matrix

**Files:**
- Create: `src/client_policy.rs`
- Modify: `src/lib.rs`
- Test: `src/client_policy_tests.rs`

1. Write table-driven failing tests for every `ClientKind` × `SubscriptionProvider` default row,
   including pending Gemini/Qwen rows, generic/missing identity, supported protocols, fixture
   evidence, User-Agent-only spoofing, and exact override isolation.
2. Run `cargo test client_policy --lib -- --nocapture` and confirm the tests fail because the
   policy module is absent.
3. Commit the red tests: `test: define subscription client entitlement matrix`.
4. Implement normalized client parsing, protocol/evidence classification, explicit matrix rows,
   exact override parsing, stable denial messages, and a decision carrying override-use metadata.
5. Run the focused test and commit green: `feat: enforce explicit subscription entitlement policy`.

## Task 2: Persist immutable token client/subscriber bindings

**Files:**
- Modify: `src/token.rs`
- Modify: `src/storage.rs`
- Modify: `src/storage/associative.rs`
- Modify: `src/storage/legacy.rs`
- Modify: `src/token_admin.rs`
- Modify: `src/server_router.rs`
- Modify: `src/proxy.rs`
- Test: `src/token_tests.rs`
- Test: `src/storage_tests.rs`
- Test: `tests/associative_storage_test.rs`

1. Add failing tests for signed/durable round trips, legacy default absence, stored-claim mismatch,
   ordinary/admin unbound behavior, dedicated client issuance, and rotation preserving bindings.
2. Run focused token/storage tests and commit red: `test: require immutable client token bindings`.
3. Add optional `client_kind` and `principal_id` to claims and records, encode them in every store,
   validate signed/store agreement, preserve them during rotation, and add the admin-only bound
   client-token endpoint. Keep general issuance unbound.
4. Remove the inference-superset assumption from synthetic flat-admin claims.
5. Run focused tests and commit green: `feat: bind managed tokens to client and subscriber`.

## Task 3: Mint and validate bindings in managed client flows

**Files:**
- Modify: `src/managed_server.rs`
- Modify: `src/managed_server/catalog.rs`
- Modify: `src/client_command.rs`
- Modify: `src/configure.rs`
- Modify: `src/with_command.rs`
- Modify: `src/clients/catalog.rs`
- Modify: `src/clients/credentials.rs`
- Test: `src/managed_server_tests.rs`
- Test: `src/client_launch_tests.rs`
- Test: `src/configure_tests.rs`
- Test: `src/with_command_tests.rs`

1. Add failing tests that `with`, `configure`, and `clients setup` request a bound short-lived token,
   send catalog evidence for the same client, and reject supplied mismatched/unbound tokens.
2. Run focused tests and commit red: `test: require managed clients to use bound tokens`.
3. Thread `ClientKind` through issuance/catalog helpers, use the bound-token endpoint, assign the
   trusted primary/account principal, and record the non-secret binding in managed metadata.
4. Run focused tests and commit green: `feat: mint client-bound managed credentials`.

## Task 4: Enforce subscription policy at catalog and dispatch

**Files:**
- Modify: `src/model_routing.rs`
- Modify: `src/model_routing_snapshot.rs`
- Modify: `src/proxy.rs`
- Modify: `src/proxy_openai.rs`
- Modify: `src/subscription_proxy.rs`
- Modify: `src/gemini/native.rs`
- Modify: `src/claude_identity.rs`
- Modify: `src/anthropic_bridge.rs`
- Modify: `src/audit.rs`
- Modify: `src/cli.rs`
- Modify: `src/config.rs`
- Modify: `src/main.rs`
- Test: `tests/subscription_entitlement_test.rs`
- Test: `tests/client_fixture_test.rs`

1. Add integration tests for native success, default cross-client `403` with zero upstream calls,
   missing/generic/admin/legacy denial, spoofing, namespaced endpoints, catalog parity, exact
   overrides, account/principal pins, no fallback, and Claude identity only on allowed routes.
2. Run the new integration test and commit red: `test: deny cross-client subscriptions by default`.
3. Filter catalog snapshots by the central policy and call the same policy immediately before each
   subscription forwarder consumes a budget or constructs an upstream request.
4. Add repeatable exact bridge configuration, startup warnings, normalized client audit fields,
   and separate override audit events. Gate identity synthesis on the policy decision.
5. Run focused unit/integration tests and commit green: `feat: gate consumer subscriptions by client`.

## Task 5: Add the z.ai Coding Plan credential kind and policy controls

**Files:**
- Create: `src/zai_coding_plan.rs`
- Modify: `src/providers.rs`
- Modify: `src/providers_cli.rs`
- Modify: `src/provider_proxy.rs`
- Modify: `src/cli/store_ops.rs`
- Modify: `src/lib.rs`
- Test: `src/zai_coding_plan_tests.rs`
- Test: `src/providers_cli_tests.rs`

1. Add failing tests for explicit kind selection, fixed official origin, encrypted/redacted key,
   required subscriber and intermediary acknowledgement, reviewed model list, safe-client matrix,
   exact unsupported-client acknowledgement, generic-client non-overridability, and no inference
   from key/name shape.
2. Run focused tests and commit red: `test: specify z.ai Coding Plan policy boundary`.
3. Implement the provider kind and validation, redacted fields, exact CLI/API inputs, prominent
   warnings, explicit safe/unsupported client sets, model registry, and quota-health response parser.
4. Run focused tests and commit green: `feat: add policy-gated z.ai Coding Plan credentials`.

## Task 6: Add client-specific z.ai discovery and exact routing

**Files:**
- Modify: `src/model_routing.rs`
- Modify: `src/config.rs`
- Modify: `src/proxy.rs`
- Modify: `src/proxy_openai.rs`
- Modify: `src/provider_proxy.rs`
- Modify: `src/anthropic_bridge.rs`
- Modify: `src/clients.rs`
- Modify: `src/clients/files.rs`
- Modify: `src/with_command.rs`
- Modify: `src/configure.rs`
- Test: `tests/zai_coding_plan_test.rs`

1. Add failing table tests for mixed catalogs, explicit aliases, collisions, stale/built-in/ghost
   refusal, principal mismatch, credential rejection/removal isolation, all three exact endpoints,
   direct/namespaced routes, non-streaming and SSE/tool cycles, and `count_tokens`.
2. Add failing client setup tests for the Claude gateway discovery flag, stable Claude-prefixed ids,
   family/default mappings, and the 2.1.129 diagnostic.
3. Run focused tests and commit red: `test: specify z.ai discovery and protocol routing`.
4. Probe the non-inference quota endpoint before discovery/dispatch, append only client-permitted
   healthy aliases, route exact registry identities to canonical models/endpoints, relay all reply
   shapes, and mark rejected keys unhealthy without affecting other providers.
5. Write Claude managed environment settings and diagnostics, including successful empty catalogs
   and restart/cache guidance.
6. Run focused tests and commit green: `feat: route z.ai Coding Plan by exact client model identity`.

## Task 7: Document the safe defaults and experimental z.ai mode

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/use-cases/README.md`
- Modify: `docs/use-cases/claude-max-in-codex.md`
- Modify: `docs/use-cases/chatgpt-in-claude-code.md`
- Create: `docs/use-cases/zai-coding-plan.md`
- Modify: relevant deployment, client setup, doctor, protocol matrix, and historical #45 evidence docs
- Create: `docs/policy/zai-coding-plan-intermediary-status.md`

1. Document the deny-by-default matrix, exact override syntax/warnings, migration behavior, and
   provider-policy risks while preserving the existing bridge examples as opt-in examples.
2. Document z.ai as experimental/risk-accepted/disabled by default, exact endpoints, supported and
   unsupported adapters, single-subscriber binding, health probe, cache/restart behavior, and the
   lack of written intermediary permission.
3. Add source links and the current clarification status record; update module comments.
4. Run documentation link/terminology checks and commit: `docs: explain subscription and z.ai policy gates`.

## Task 8: Complete verification, review, and delivery

**Files:**
- Modify only defects discovered by verification/review.

1. Run `cargo fmt --all -- --check`.
2. Run `cargo check --locked --all-targets --all-features`.
3. Run `cargo clippy --locked --all-targets --all-features -- -D warnings`.
4. Run `RUSTDOCFLAGS='-Dwarnings' cargo doc --locked --no-deps --all-features`.
5. Run the complete test suite and every repository release-automation test.
6. Run definitive instrumented coverage and the repository coverage gate; add meaningful tests if
   coverage falls rather than weakening the baseline.
7. Run file-size, terminology, secret scanning, `npm ci`, UI tests/build, and verify generated UI
   output has no unexplained diff.
8. Review the complete diff against every acceptance bullet in #385, #387, #389, and #390; repair
   and recommit any gap.
9. Push each visible commit, wait for PR CI, fix failures, mark PR #388 ready, merge it, and verify
   the merge commit contains every delivered change.
10. Monitor the release workflow and published release/artifacts. If delivery fails, create, merge,
    and verify a focused follow-up PR until the release is successful.
11. Re-query open issues immediately before merge and again after release; add any newly opened
    Router issue to the same delivery cycle as instructed.

