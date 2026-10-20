# Contributing to Router

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Development Setup

Clone `https://github.com/link-assistant/router.git`, then install Node 20 or newer and Bun for the JavaScript development gate. Install package dependencies with:

```bash
npm ci --prefix js
```

Rust, rustfmt, Clippy and rust-script remain tools for the Rust implementation and its CI checks. Install them when working on that surface, rather than compiling the project as the first setup step. Optional pre-commit hooks use `pip install pre-commit` and `pre-commit install`. Local hooks must remain free of Rust execution and automatic build-cache cleanup; obtain Rust results through the gated workflow below and perform authorized cleanup separately.

Disabling a conflicting local hook does not waive CI verification. Rust check failures must still fail CI after every required JavaScript stage passes for the same commit. Gated jobs and steps must not ignore failures with `continue-on-error`; the workflow audit enforces this independently of installed local hooks.

## Development Workflow

Create a feature branch or isolated worktree, implement behavior in JavaScript, add targeted behavioral tests and update documentation. Read [the JavaScript-first workflow](docs/development/javascript-first.md) for the parity boundary and generation limitations. Router's JavaScript operations package and a valid parity inventory do not by themselves establish complete Rust runtime parity.

Run the complete local gate:

```bash
node scripts/check-js-first-local.mjs --stamp /tmp/router-js-first-gate.json
```

It runs the actual JavaScript lint, native Node and Bun tests, type checks, strict parity, forward translation and reverse regeneration checks. A missing or partial parity entry keeps the gate red. Fix all reported failures together. Individual diagnostics include `npm run native:test --prefix js`, `npm run native:test:bun --prefix js`, `npm run typecheck --prefix js`, `node scripts/check-router-parity.mjs` and `node --test scripts/test/*.test.mjs`. These help locate failures but do not replace the complete gate.

Use CI for broader Rust verification after the JavaScript gate. Do not run full local Cargo builds, test suites or Clippy. Only an explicitly necessary targeted exception can use the bounded shared build wrapper after a green stamp for the current SHA and file contents:

```bash
# Preview only: this does not invoke Cargo.
bash scripts/bounded-rust-build.sh -- check --lib
# Explicit exception after the complete gate is green.
bash scripts/bounded-rust-build.sh --execute --gate-stamp /tmp/router-js-first-gate.json -- check --lib
```

For issue #759, do not invoke local Rust tools, including Cargo builds/tests, Clippy, rustfmt, rustc, rust-script or Rust-backed hooks; targeted exceptions are also prohibited. Add Rust regression cases as source and obtain their execution results from CI only after every required JavaScript stage passes for the same commit. A JavaScript test pass does not establish that an unexecuted Rust test passes.

The Rust suite continues to define tiers 1-3, which require no credential. The live credentialed tier (tier 4) is a no-op without a subscription and says so rather than passing quietly — see [docs/testing-tiers.md](docs/testing-tiers.md) for what each tier proves. CI runs the relevant Rust checks; the tier documentation also describes targeted diagnostic commands, which must obey the bounded local exception policy.

Changes to stream or request translators, token and credential code, the proxy, storage or keychain lookup also trigger slower path-filtered workflows: benchmarks against the pull request's base (`benches/`), a one-minute soak (`tests/soak_test.rs`), mutation testing of touched lines (`.cargo/mutants.toml`), the macOS Keychain suite and the upgrade matrix over the last three releases. Translator changes can require updated recorded cassettes in `tests/fixtures/vendor/`; the recording tool is `rust-script scripts/record-vendor-fixtures.rs`. During issue #759 this Rust-backed tool may run only in gated CI. Preserve these checks and require the JavaScript gate before Rust compilation.

For user-facing changes, add a changelog fragment in `changelog.d/` named `YYYYMMDD_HHMMSS_description.md`:

```bash
touch changelog.d/$(date +%Y%m%d_%H%M%S)_my_change.md
```

Use the existing categories, for example:

```markdown
### Added
- Description of new feature

### Fixed
- Description of bug fix
```

Fragments prevent merge conflicts in CHANGELOG.md when multiple PRs are open. Commit focused changes with descriptive messages. In a coordinated agent task, workers draft commits in their own worktrees and one designated push gate owner integrates and publishes the combined change. The owner reviews the full diff, runs the complete gate, pushes one tested head and waits for all CI jobs to complete. Never cancel the current CI run or push speculative fixes; collect the full failure set and repair it in one coordinated batch before the next push.

During active work on issue #759, make reviewable checkpoint commits at least once every six hours. Commit coherent source batches even when the larger translation or parity task is incomplete; record which checks passed, failed or remain unrun. Keep worker commits in their assigned worktrees and integration with the coordinator. Checkpoint commits preserve the existing publication gate and same-commit JavaScript-first CI requirements.

An explicit user request for a draft checkpoint to obtain CI feedback authorizes that checkpoint before the complete local gate is green. The designated push owner still reviews the coherent source batch, collects every completed CI failure before the next push, and records failed and unrun checks against the exact SHA. Such a feedback checkpoint does not establish completion or release readiness. Every required JavaScript CI stage must pass for that same SHA before any Rust job starts; Rust failures then remain fatal. Continue independent source drafting while CI runs without changing its published head.

For active issue #759, the user has given standing authorization for the designated push owner to push the coordinated repair batch and update its draft pull request without another approval request. Wait for the published head's entire CI cycle to finish, collect and handle every failure, and then publish the reviewed fixes promptly for fresh feedback. This authorization preserves the single publisher, honest failed/unrun evidence and same-SHA JavaScript gate before Rust execution.

The user explicitly requested the 2026-10-19 checkpoint push and merge of PR #761, followed by a new continuation pull request. Record the remaining work in [the continuation ledger](docs/development/issue-759-continuation.md), keep issue #759 open, and use normal repository merge protections. This checkpoint rollover does not certify complete translation or parity and does not unlock Rust CI before all required JavaScript stages pass for the same SHA.

## Translation rules and shared regressions

Implement translation as ordered substitution rules over parsed source, checked semantic meta or target syntax. Keep at least two separately declared rule sequences: reusable programming-language rules first, then repository rules for Router's output layout, imports, formatting and quality conventions. Keep language semantics independent of Router paths and declaration names. Repository rules must preserve the meaning established by the checked language rules. Both Rust → meta → JavaScript/TypeScript and JavaScript → meta → Rust/TypeScript must retain the serialized, reparsed meta boundary. See [the rule-layer contract](docs/development/translation-rules.md).

Keep concrete syntax in the meta-language before checked semantics. The `meta-language-concrete-syntax-v1` representation stores the complete source once, with ordered token, trivia and delimiter spans; serialize, parse and reconstruct it before the semantic parser consumes the text. The ordinary source entry requires exact UTF-16 reconstruction. A canonical concrete document can also supply edited source, which must receive fresh native syntax, owner, type and checked semantic-meta validation. Lexical, opaque and error statuses describe the concrete provider, not grammar acceptance; retain their complete source and diagnostics while the existing native parser and semantic checker decide admission. Concrete fidelity grants no type, owner, producer-effect or executable authority.

The reverse semantic entries now require the installed TypeScript compiler even for portable scalar source, because they create a fresh native syntax file before checking semantics. Configure exported bundles to use their actual receiving dependency root before import; missing compiler dependencies are environment errors, not invalid-source diagnostics. No across-call syntax verdict is reused by this new check.

The reverse entry `translateConcreteSyntaxMeta` accepts JavaScript and TypeScript concrete documents and emits only the existing checked common subset. TypeScript annotations and other unsupported constructs remain refusals; this is not a type-erasure shortcut or full TypeScript-to-Rust translation. The native TypeScript syntax path also consumes the identical reconstructed JavaScript, retaining its existing syntax and automatic-semicolon-insertion checks. Focused receiving checks do not establish generated freshness or complete parity; regeneration and the complete same-SHA JavaScript gate are still required before gated Rust CI or release-ready publication; authorized incomplete feedback checkpoints follow the policy above. See the rule-layer contract for concrete-stage bounds and limitations.

For bulk stored or edited CST, use the [explicit bulk transport contracts](docs/development/concrete-syntax-bulk.md). Retain every row, independent concrete validation and whole-call limits across chunk boundaries. Grouped source authentication changes the observer schedule explicitly; it does not replace fresh semantic checks or authorize caller-supplied metadata. Keep the untrusted-document path separate from the private source-origin specialization.

Extend a rule at the shared translation layer when it repairs a class of source constructs. Record its stable identity, prerequisites, order, supported inputs and explicit refusals; add independent positive, negative and boundary fixtures. Exact text substitutions require unique validated anchors against pinned inputs. Semantic substitutions require resolved owners, types, effects and source evidence; matching a familiar name or arbitrary object shape is insufficient. Never grant new semantic authority through a formatting rule, weaken a refusal to inflate coverage, or manually patch generated outputs.

Use complete small JavaScript test files under Node and Bun and strict TypeScript execution for quick feedback while drafting a batch. Use the repository's lockfile-installed compiler and record its actual version; do not downgrade the compiler or strictness to obtain a pass. Read the corresponding Rust and generated bodies, collect related failures together and repair the shared rules before expensive full-corpus regeneration. Add Rust edge cases for the same behavior, including overflow, empty values, Unicode, malformed input, ordering and errors where applicable. Distinguish the Rust oracle, JavaScript behavior, executed TypeScript and synchronization freshness in the evidence. Run the complete JavaScript gate on the final integrated tree before claiming a verified or release-ready batch; authorized feedback checkpoints retain their failed/unrun status under the policy above. Targeted diagnostics do not replace the gate.

Inspect reported case durations as well as command exit codes. A synchronous Node test can block its timeout callback and report a pass after exceeding its declared deadline. Treat that duration breach as a performance failure, retain the complete output, and optimize the shared implementation. Preserve whole files and deadlines; moving work outside a case does not qualify its original workload. Record diagnostic limits separately from test deadlines, and never present a timed-out comparison or a comparison with changed compiler inputs as a measured speed gain.

Before installing a JavaScript source proposal, also run the current engine's
native syntax check over each complete proposed module. A TypeScript parser's
empty syntax diagnostics do not catch every JavaScript early error, including
duplicate lexical declarations. Keep the complete source/CST inverse and the
independent behavioral checks; a native syntax pass does not replace either.
Node uses `--input-type=module --check`; Bun's `--check` selects a different
command. Use its [native JavaScript scanner](https://bun.com/docs/runtime/transpiler)
for complete module syntax, and qualify duplicate-binding rejection and the
absence of proposed-module execution or dependency resolution in both engines.

Track every requested requirement through its source changes, generated artifacts, checks and remaining gaps. While remote CI runs, continue source review and independent draft work in assigned worktrees without changing the published head or starting a second expensive workload. Collect the complete CI results before integrating the next repair batch. A bulk draft or an unexecuted test remains a draft until the corresponding checks pass.

Prioritize common translation blockers using actual project diagnostics. A [shared compatibility core](docs/development/compatibility-core.md) may implement matching Rust and JavaScript library abstractions while leaving their internals untranslated. Bind repository CST rules to qualified owned APIs, check operands through the language rules and retain both meta roundtrips. Test independent shared behavior and actual Router callers; keep application coverage, runtime parity and untranslated library status separate.

Keep work bounded: run one expensive compiler, test or compression workload at a time, reuse existing worktrees and dependencies, check disk space and retain complete failure evidence with lossless compression. Assign that workload explicitly before a worker starts it. Retain actual source versions, full vectors, commands, compiler identities, logs and resource receipts; a digest alone does not preserve the original evidence. When a command becomes slow, measure it before optimizing shared rules; preserve semantics, complete test cases and deadlines. Do not filter failures, raise limits or weaken refusals to obtain a pass. Report executable coverage separately from source preservation, and retain explicit parity limitations until the full checks prove them resolved.

For source-layout changes, select executable filesystem and current Git reads
with the parser, apply ordered CST substitutions and verify complete source
inverses. Preserve frozen historical source bytes, hashes and logical source
identities. Adapt their receiving loaders explicitly; embedded child sources
and immutable historical revisions must keep their own paths and contracts.

Use the [parser-selected reader proposer](docs/development/translation-rule-api.md)
for bulk layout repairs. Source payloads require literal substitution rules so
replacement-template dollar forms survive unchanged. Preserve the original
replacement-rule contract, qualify real legacy and nested receiving folders,
and retain all tracked Rust rows and complete workspace/package Cargo inputs.
An emitted or installed proposal still needs every affected complete test file.

The two reviewed Router Cargo layouts use a stateless exact comparison copied
from the complete historical layout equation. Regenerate its source proposal
with `node tools/translation/prepare-cargo-layout-input-compatibility.mjs --emit`
and check installed freshness with `--check`. Review full source/CST inverses
before installation. Keep raw manifest hashes in evidence, exact lock and
archive checks, and genuine private dependency proofs at every semantic join.
This compatibility does not permit arbitrary TOML normalization or dependency
changes. Its complete behavioral and refusal file belongs to both engines'
mandatory compiler discovery.

The derive-profile adapter is copied by the separate actual producer
`node tools/translation/prepare-derive-profile-layout.mjs --emit`; its `--check`
must reproduce both the adapter and async-trait consumer exactly. Keep the
original dependency-profile hash frozen and authenticate the complete reversible
profile change. Historical URL readers normalize only the known physical crate
prefix before enforcing their original parent association. Do not repin frozen
source hashes or accept arbitrary dependency profiles to repair a layout failure.

Within one project invocation, compose genuine source contexts explicitly when
several consumers need the same original graph. Each consumer must retain its
complete source, profile and private-issuer checks. Do not memoize namespace
verdicts across invocations. Compare large serialized metadata in bounded
fragments while preserving every byte comparison, existing component and
aggregate limits, and independent reconstruction. A storage optimization or a
focused pass still requires a fresh complete producer and gate result.

The owned enclosing resolver is a source-derived wrapper around the existing
genuine resolver inside its existing synchronous retained DATA-cost scope.
Derive it and its parser-selected consumer imports with
`node tools/translation/prepare-owned-enclosing-bindings.mjs --emit`, review
complete source/CST inverses, install the exact proposals and run `--check`.
Keep the legacy resolver body intact and independently compare all binding,
diagnostic, source/profile-refusal and original argument-default behavior.
The scope reuses frozen DATA arithmetic only; it closes before return and
stores no source/owner verdict or encoded result. A synthetic timing comparison
does not qualify the full project or extend any original case deadline.

The explicit owned-definition producers may serialize complete top-level data
fields separately with their fixed Map/BigInt serializer. Preserve native member
keys, omissions, ordered logical bytes, every component and the original storage
limits. Flatten a field only with a complete UTF-16/UTF-8 inverse; retaining both
large wrappers and their component copies can defeat the memory optimization.
This data-storage contract does not establish arbitrary replacer/observer
equivalence or cache any source or semantic verdict.

For the owned UTF-8 field format, derive both complete source copies with
`node tools/translation/prepare-project-meta-utf8-storage.mjs --emit`, review
their serialized/reparsed CST and full inverses, install the exact proposals
and run `--check`. Its fixed serializer copies the actual Map/BigInt JSON
expression and converts the keyed wrapper directly to bytes before returning.
Preserve every field byte, native key argument, omission and original storage
bound. The original string API remains independently checked. The owned bulk
producer reports bounded storage and retention progress before and after each
operation; callback failures must propagate before any generated file is written.
Passing storage fixtures does not establish live-project memory fit or parity.

The explicit retained owned-definition lane uses a separately generated UTF-16
byte-retention format. Derive it with
`node tools/translation/prepare-byte-output-text.mjs --emit`, review its complete
original/edited CST and inverse, install the exact proposal and run `--check`.
It assumes stock Buffer/zlib operations at module birth and refuses later
operation changes. Private immutable compressed strings retain every UTF-16
unit, including lone surrogates; the original chunk and retention budgets stay
fixed. Keep the scalar-cell API and ordinary producer intact. Whole-wire storage
timings do not establish live-project memory fit, observer equivalence, source
authority or a full-gate pass.

Select owned output keys before reading their text. Iterating `[path, text]`
and then filtering can restore unrelated large metadata beside the live compiler.
The retained owned lane derives a described byte map with
`node tools/translation/prepare-described-byte-output-text.mjs --emit`; review
its complete original source/CST and inverse, install the exact proposal and
run `--check`. Its per-plan immutable output descriptions retain the original
UTF-8 byte length and SHA-256 without restoring text during the final census.
Keep surrogate pairs together across measurement chunks and retain lone-surrogate
replacement semantics. These are storage measurements associated with private
immutable cells, not cached source/owner verdicts or cross-invocation permits.
Keep original byte/scalar APIs and all semantic/input checks independent, and
qualify the full producer under its unchanged limits after focused tests pass.

Canonical JSON storage validation must also avoid retaining a second complete
object tree beside the live compiler. Preserve native parse/stringify decisions,
including integer-key ordering, duplicate rejection, Unicode and exact malformed
input errors. Deep or malformed inputs retain the original native fallback;
bounded validation grants no semantic or source authority. Compare complete real
inputs in separate fresh processes and report sampled memory and time separately.

For issue #759, the user's 2026-10-19 instruction supersedes the earlier two-worker limit: existing assignments have finished and the coordinator continues alone, including publication. Do not spawn or resume subagents. Reuse the assigned worktrees; do not clone more repositories. The current owner is recorded in [AGENTS.md](AGENTS.md). Keep the case study below its fixed 500,000,000-byte filesystem allocation and measure allocation without counting shared inodes twice. Preserve complete recovery and continuity evidence before retiring an archive. The user authorized removal of this task's own inactive Rust caches and build directories regardless of age; identify each owned path, check that no worker uses it, and record reclaimed space. Never remove another worker's active directory or lock. Freed space does not authorize a local Rust build.

Use [the reusable translation guidance](docs/development/reusable-translation-guidance/README.md) when copying this workflow to another repository. Copy its contribution and agent guidance separately from the compiler export, preserve the receiving repository's conventions and stricter user constraints, and qualify the receiving project independently. Reused upstream implementations must retain pinned source bytes, notices and licenses; a copied approach or successful export is not evidence of complete translation.

Inspect existing upstream implementations and tests for reusable rules before drafting new translator machinery. Reference comparisons include [formal-ai PR 1188](https://github.com/link-assistant/formal-ai/pull/1188), [meta-language PR 201](https://github.com/link-foundation/meta-language/pull/201), and [relative-meta-logic](https://github.com/link-foundation/relative-meta-logic). Pin the actual reviewed commits. Keep complete source copies outside the active compiler tree until receiving qualification passes; the [retained meta-language candidate](tools/upstream-translation-candidates/meta-language-63e3b27a/README.md) documents its inactive status and recovery requirements. Store pristine third-party source under the existing raw-record convention instead of editing it to satisfy local terminology or formatting rules.

For a discovered upstream or tooling defect, retain a minimal reproducible case, exact source and tool versions, complete failed output and any local workaround. Link that record to the affected requirement. Draft the report for review; external reporting requires the user's authorization and belongs to the designated publication owner.

## Code Style Guidelines

This project uses:

- Native JavaScript tests and TypeScript checks for fast development feedback
- Deterministic translation and regeneration checks for covered generated code
- **rustfmt** for Rust formatting, and CI **Clippy** with pedantic and nursery lints
- The existing Rust test tiers in CI after the complete JavaScript gate

### Code Standards

- Follow JavaScript idioms for development sources and Rust idioms for native or translated Rust
- Use documentation comments (`///`) for all public APIs
- Write tests for all new functionality
- Keep functions focused and reasonably sized
- Keep files under 1000 lines
- Use meaningful variable and function names

For translator orchestration, follow [the rule API and verification boundaries](docs/development/translation-rule-api.md). Additional logical layers compose rules or pipelines within the two required phase names; the API does not admit arbitrary phase names. A successful rule invocation supplies no source-proof or parity authority.

### Terminology: it is a links network, never a graph

The structure this project stores its tokens in is a **links network**: links
whose sources and targets are themselves links. The word *graph* is not used
for it, and CI rejects it.

The distinction is load-bearing rather than stylistic. In a graph you have
vertices joined by edges, and the edge is a relationship *between* two things
that are not themselves edges. In a links network there is no separate kind of
thing to be a vertex: every link is addressable, and a link can be the source
or target of another link. A "point" is just a link whose source and target are
itself. Calling it a graph invites reasoning that quietly does not hold — that
edges are anonymous, that they cannot be referenced, that vertices are a
distinct population to be counted separately.

- **Write:** "links network", or plain **"network"** where the context already
  makes it clear ("the network is parsed once per process").
- **Do not write:** "graph", "the doublets graph", "semantic graph",
  `parse_graph()`, `let graph = ...`.

This applies to **identifiers as well as prose** — variable, function, type and
test names — and to documentation in **every human language**, not only
English.

Other people's names for their own things are fine, and the check allows them:
GraphQL, Git's *object graph*, a build system's *dependency graph*, and
ordinary words that merely contain the letters (paragraph, lexicographic,
geographic). If you hit a genuine case the check does not know about, add it to
`ALLOWED_PHRASES` in `scripts/check-terminology.rs` **with a reason** — the
list is deliberately narrow.

This file, `CHANGELOG.md` and `changelog.d/` may name the word freely, because
their job is to state the rule and to record that the wording changed. They are
the only places that may. Everywhere else — source, `README.md`, the rest of
`docs/`, workflows — is checked, so do not reach for the changelog as a way to
say it elsewhere.

CI runs the terminology check with:

```bash
rust-script scripts/check-terminology.rs
```

This Rust-backed command is not a local diagnostic during issue #759: the user's no-local-Rust instruction includes `rust-script`. Obtain its result from CI after the same-head JavaScript gate passes.

`dev/log/` and captured third-party text under `docs/case-studies/*/raw/` are
excluded as records rather than as wording to fix — editing them would falsify
what was written at the time — and `ui/dist/` is a built bundle.

### Documentation Format

Use Rust documentation comments:

```rust
/// Brief description of the function.
///
/// Longer description if needed.
///
/// # Arguments
///
/// * `arg1` - Description of arg1
/// * `arg2` - Description of arg2
///
/// # Returns
///
/// Description of return value
///
/// # Errors
///
/// Description of when errors are returned
///
/// # Examples
///
/// ```
/// use my_package::example_function;
/// let result = example_function(1, 2);
/// assert_eq!(result, 3);
/// ```
pub fn example_function(arg1: i32, arg2: i32) -> i32 {
    arg1 + arg2
}
```

## Testing Guidelines

- Write tests for all new features
- Maintain or improve test coverage
- Use descriptive test names
- Organize tests in modules when appropriate
- Use `#[cfg(test)]` for test-only code

Example test structure:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    mod my_feature_tests {
        use super::*;

        #[test]
        fn test_basic_functionality() {
            assert_eq!(my_function(), expected_result);
        }

        #[test]
        fn test_edge_case() {
            assert_eq!(my_function(edge_case_input), expected_result);
        }
    }
}
```

## Pull Request Process

1. Run the complete JavaScript gate and review parity and generated diffs
2. Update documentation if needed
3. Add a changelog fragment (see step 5 in Development Workflow)
4. Ensure the PR description clearly describes the changes
5. Link any related issues in the PR description
6. Leave the current CI run intact and wait for every required check to finish
7. Address any review feedback

## Changelog Management

This project uses a fragment-based changelog system similar to [Scriv](https://scriv.readthedocs.io/) (Python) and [Changesets](https://github.com/changesets/changesets) (JavaScript).

### Creating a Fragment

```bash
# Create a new fragment with timestamp
touch changelog.d/$(date +%Y%m%d_%H%M%S)_description.md
```

### Fragment Categories

Use these categories in your fragments:

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed in future
- **Removed**: Features that were removed
- **Fixed**: Bug fixes
- **Security**: Security-related changes

### During Release

Fragments are automatically collected into CHANGELOG.md during the release process. The release workflow:

1. Collects all fragments
2. Updates CHANGELOG.md with the new version entry
3. Removes processed fragment files
4. Bumps the version in Cargo.toml
5. Creates a git tag and GitHub release

## Project Structure

```
.
├── .github/workflows/    # GitHub Actions CI/CD
├── changelog.d/          # Changelog fragments
│   ├── README.md         # Fragment instructions
│   └── *.md              # Individual changelog fragments
├── examples/             # Usage examples
├── scripts/              # JavaScript gate/generation tools and existing Rust/Python helpers
├── src/
│   ├── lib.rs            # Library entry point
│   └── main.rs           # Binary entry point
├── tests/                # Rust integration tests
├── tools/translation/    # Forward test/, reverse js-to-rust/test/, serialization-schema/*.test.mjs
├── .gitignore            # Git ignore patterns
├── .pre-commit-config.yaml  # Pre-commit hooks
├── Cargo.toml            # Project configuration
├── CHANGELOG.md          # Project changelog
├── AGENTS.md             # JavaScript-first and coordination instructions
├── CONTRIBUTING.md       # This file
├── LICENSE               # Unlicense (public domain)
└── README.md             # Project README
```

## Release Process

This project uses semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

Releases are managed through GitHub releases. To trigger a release:

1. Manually trigger the release workflow with a version bump type
2. Or: Update the version in Cargo.toml and push to main

## Getting Help

- Open an issue for bugs or feature requests
- Use discussions for questions and general help
- Check existing issues and PRs before creating new ones

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

Thank you for contributing!

For the explicit checked-definition receiving lane, prepare and review the complete source-derived bulk modules with `node tools/translation/prepare-owned-definition-bulk.mjs --emit`, then run actual canonical and `--profile-matrix` generation using `node scripts/translate-router.mjs --retain-output-text --owned-core-definitions`. Review and install only actual producer outputs. Generate their independent reverse counterparts with `node scripts/regenerate-js-first.mjs --owned-core-definitions --write` and its `--profile-matrix` variant. Every command's `--check` variant and `node scripts/check-owned-definition-typescript.mjs` are mandatory in the existing complete local and same-SHA CI gates. Preserve all ordinary commands, seven local/eight CI stages, strict TypeScript 5.9.3, original deadlines and the requirement for green JavaScript stages before Rust CI. Definition-only sidecars and witnesses do not count as full-module or crate equivalence; retain all original source and main-module refusal accounting. Keep new observed evidence within the 384 MiB monitor bound, using complete verified lossless terminal compression rather than truncation or waived workloads. See the [workflow](docs/development/javascript-first.md) for exact paths, materialization prerequisites and the separate unresolved parity obligations.

### Language source layout

Maintain physical `js/src`, `ts/src` and `rust/src` directories; see
[the language layout and commands](docs/development/language-layout.md).
JavaScript changes and checks run first. Generate TypeScript with the checked
CST/meta producer; keep forward and reverse translation rules in separate
ordered language and repository sequences. Do not hand edit generated files.
The root Cargo manifest is a workspace; package metadata lives in
`rust/Cargo.toml`, and the workspace lockfile remains at root. Refresh shared
Rust assets with `node scripts/sync-rust-assets.mjs --write` and check them
before CI. No Rust tool runs locally during issue #759; every required
JavaScript stage must pass for the same SHA before Rust CI starts, and Rust
failures remain fatal.
