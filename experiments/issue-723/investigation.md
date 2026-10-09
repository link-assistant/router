# Issue 723 investigation

Issue: https://github.com/link-assistant/router/issues/723
Pull request: https://github.com/link-assistant/router/pull/748

The original account state had no credential-adjacent policy. Selection only
supported round-robin, priority and least-used; every reported quota failure
started a cooldown. Model discovery and protocol handlers used native identities
without account-specific projections or an operator header/error policy.

Before implementation, `cargo test --test account_routing_policy_test` reproduced
three failures: the weighted strategy was unrecognized, a `second/model` request
selected `primary` rather than `account-1`, and `disable_cooling` did not keep a
failed account available. The complete output is retained locally in
`experiments/issue-723/reproduction.log`.

Policies now live in `routing-policy.json`, independently of vendor-owned login
files. Missing policies preserve defaults; malformed or unsafe policies fail
closed. Management replacements persist atomically and apply immediately.

A request-local selection retains the visible and exact upstream model identities,
original client headers, selected account and complete credential generation.
Authorization uses the upstream identity before dispatch. A shared bounded policy
loop handles retries before response bytes are returned and preserves strict pins,
account transport isolation, signed-content stripping on account switches, and
exact upstream model selection. Response rewriting changes model metadata only.

## Existing CI failure

Run 37860911937 (2026-10-08T23:42:26Z) tested the prepared placeholder commit
`dc6a51bb3f465db92696b6abc88b8a26f103324f`. The downloaded log
`ci-logs/workflow-37860911937.log`, line 4483, reports:

> No changelog fragment found in this PR. Please add a changelog entry in changelog.d/

The added minor changelog fragment resolves that gate and requests the next minor
release through the repository's release workflow; manually editing package
versions is explicitly prohibited by the version check.

## Local resource limit

The container has a 3 GB memory limit. The pre-existing monolithic library unit-test
binary exceeded it during compilation even with one build job and debug information
disabled. New HTTP regressions therefore use a separate integration target with
real production routes and deterministic local mock upstreams. Build and test output
is kept in ignored `.log` files here. `bounded-unit-rustc.py` provides a one-job,
512-codegen-unit experiment with explicit memory/stack limits, without recompiling
dependencies. CI also verifies the full suite on its larger runner.

## Validation before the implementation commit

The two account-policy targets, operation API and contract inventory targets pass
all 32 tests. Coverage includes 1,000 weighted selections (250/750/0 for weights
1/3/0), prefixes, aliases, forks, exclusions, all credential-copy refusals, all
three error actions, retry overrides, strict pins, model cooldowns, fragmented
UTF-8 SSE, native Gemini discovery, the authorized Gemini-to-Claude bridge and
the Codex bridge. Existing Gemini consumer entitlement restrictions remain in
effect in both automatic and pinned provider configurations.

Strict Clippy (`--all-targets --all-features -- -D warnings`), formatting,
file-size/terminology checks, generated contracts/bindings checks and compatibility
against `origin/main` pass. JavaScript Node and Bun tests, TypeScript checks,
Python binding tests and the existing Python deployment/contract regression
scripts pass. `review-catalog.py` verifies that `accounts.policy` is the only new
CLI operation and all 61 existing operations retain identical definitions.
