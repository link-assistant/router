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

The first implementation's downstream run 37866564752 tested `71a2e3f`.
Its completed SemVer job log, `ci-logs/semver-37866564752.log`, lines 1352–1403,
reported changed numeric discriminants in `SelectionStrategy` and `RouteId`.
Adding variants within those public enums shifted existing values. The additions
now follow every existing variant, preserving numeric values and existing ordering.
`existing_public_enum_discriminants_remain_stable` reproduced the failure before
this correction; its output is retained in `semver-reproduction.log`.

Run 37868426482 tested `19efccf`; its SemVer job log, lines 1362–1364,
identified the same issue in the field-bearing CLI `AccountOp` enum. The first
report's result limit had omitted these additional variants. `Policy` now follows
`List`, `Pause` and `Resume`, and a failing command-order regression reproduced
the displacement before correction (`cli-order-reproduction.log`).

## Local resource limit

The container has a 3 GB memory limit. The monolithic library unit-test
binary exceeded it during compilation even with one build job and debug information
disabled. New HTTP regressions therefore use a separate integration target with
real production routes and deterministic local mock upstreams. Build and test output
is kept in ignored `.log` files here. The one-job, 512-codegen-unit experiment in
`bounded-unit-rustc.py` also exceeded the container limit despite explicit
memory/stack bounds. All 115 integration targets completed successfully (847
tests, one ignored) after the first review corrections, and all 15 documentation
tests passed. CI verifies the full
unit suite on its larger runner.

## Live edit regression found during review

A deterministic credential-store callback changes `friendly` from `native` to
`other` after the middleware snapshots the model selector. With both models
granted, the first implementation sent the request to `other` and returned 200.
`policy-edit-reproduction.log` captures the failing HTTP assertion. Dispatch now
requires the current resolution to equal the validated upstream selector before
every send, including retries. An invalidation returns the last vendor response,
or an egress error when no attempt has been sent. The regression verifies 502
and no outbound request for the initial-send race.

Catalog review also reproduced native records shadowed by an alias: a principal
granted only `friendly` saw that name in discovery even though dispatch resolved
it to the forbidden `native` model on that account.
`shadowed-model-reproduction.log` preserves the failing assertion. Catalog
projection now verifies that each advertised name resolves to that record's exact
upstream identity and account. The regression also preserves a native model of
the same name on another account. Inference requires live catalog proof before
a declared alias can be treated as a native spelling on that other account;
an unknown spelling cannot bypass the alias's upstream model grant.

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

After the final review corrections, all 35 focused tests and strict Clippy pass.
Formatting, file-size/terminology checks and generated contract/binding compatibility
also pass. The full integration and documentation suites are rerun for the corrected
implementation, with latest-commit CI required before marking the PR ready.
