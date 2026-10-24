# Contributing to Router

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Development Setup

Clone `https://github.com/link-assistant/router.git`, then install Node 20 or newer and Bun for the JavaScript development gate. Install package dependencies with:

```bash
npm ci --prefix js
```

Rust, rustfmt, Clippy and rust-script remain tools for the Rust implementation and its CI checks. Install them when working on that surface, rather than compiling the project as the first setup step. Optional pre-commit hooks use `pip install pre-commit` and `pre-commit install`. Local hooks must remain free of Rust execution and automatic build-cache cleanup; obtain Rust results through the gated workflow below and perform authorized cleanup separately.

Disabling a conflicting local hook does not waive CI verification. Rust check failures must still fail CI after every required JavaScript stage passes for the same commit. Gated jobs and steps must not ignore failures with `continue-on-error`; the workflow audit enforces this independently of installed local hooks.

Canonical and platform-profile checks and synchronization use `node scripts/translate-router-flat-native-owned-field-meta.mjs --retain-output-text`; add `--check` for freshness and `--profile-matrix` for the declared profiles. Its actual 863-source canonical run passed the existing memory/disk/time bounds; platform-profile qualification remains separate. Keep the separate owned-definition checks, all eight JavaScript stages, original case deadlines and fatal same-SHA Rust verification. See [the storage contract](docs/development/flat-output-translation.md); a successful generation does not establish complete executable coverage or runtime parity.

## Development Workflow

For the active issue #759 drafting phase, the user's latest instruction is to
bulk draft every remaining requirement before running any tests or experiments.
Continue source review, implementation, independent test-source drafting and
documentation together. Defer test execution, benchmarks, compiler diagnostics,
trial translation, freshness regeneration and CI-triggering pushes until the
complete source batch is drafted. Automated source writing may construct the
implementation draft; it does not qualify the generated code. Track work in
[the bulk draft ledger](docs/development/bulk-draft-requirements.md); an unchecked
draft is not a passing gate, a coverage result or completed delivery. Preserve
the existing checks and deadlines for the later verification phase, and never
run Rust tools locally for this task.

Use the [fixed parallel command partitions](docs/development/parallel-javascript-gate.md)
to run complete forward tests, canonical checks and owned-definition checks
independently. Keep all eight same-SHA stages, every full command and original
timeout. Require every matrix member, set `fail-fast: false`, retain failed-test
evidence and reject unreviewed conditions or dynamic member lists. Verify the
actual generated workflow with `node scripts/prepare-parallel-js-gate.mjs --check`;
its native CST/source inverse is not a successful CI result or Rust permission.

Keep complete source banks within the original export budgets. The
[source-compression workflow](docs/development/static-source-compression.md)
uses pinned precompiled C/WebAssembly, complete source/CST inverses and full byte
restoration. Review actual producer proposals, retain upstream licenses and
require `prepare-zopfli-vendor.mjs --check` and
`prepare-strict-static-source-producer.mjs --check` under `tools/translation/`.
Qualify whole Node/Bun files under their original deadlines before regenerating
current banks and receiving exports. Do not raise limits, add result caches or
count compressed source as executable translation.

The [flat semantic storage lane](docs/development/flat-semantic-meta.md) retains
the complete original JSON representation and semantic validations. Generate
its complete siblings with `node tools/translation/prepare-flat-semantic-meta.mjs
--emit`, independently review native selections and full CST inverses, then
require `--check`. Preserve original public APIs, stock native qualification,
64 MiB fields, two-million-object/depth-512 bounds and original receiving
deadlines. A focused pass or retained-document round trip does not qualify the
complete corpus; retry actual generation within the unchanged resource limits.
Keep private issuers, admission and checker dependencies in their original
module. Use `node tools/translation/prepare-project-flat-semantic-entry.mjs
--emit` for the closed storage entry, review its full CST/native inverse and
require `--check`. Existing public entries must retain their original storage
default; callers must never supply a codec. Include real methods and genuine,
copied and fabricated evidence controls when qualifying a new compiler path.

Create a feature branch or isolated worktree, implement behavior in JavaScript, add targeted behavioral tests and update documentation. Read [the JavaScript-first workflow](docs/development/javascript-first.md) for the parity boundary and generation limitations. Router's JavaScript operations package and a valid parity inventory do not by themselves establish complete Rust runtime parity.

Use the [bulk Rust assertion fixtures](docs/development/bulk-rust-assertion-fixtures.md)
for fast feedback on already generated production functions. The runner reads
eligible original literal assertions and executes complete JavaScript and
independently strict-compiled TypeScript modules in Node and Bun. Retain its
excluded-case census; source assertions do not establish successful Rust
execution or replace the complete suites and parity gate.

Keep [independently captured method scopes](docs/development/matches-enclosing-context.md)
consistent with their project's resolver. Rebuild genuine source contexts when
changing namespace modes; do not substitute copied scope metadata or weaken the
exact source-link comparison. Qualify complete generation again after compiler
changes, even when focused source and behavior controls pass.

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

The user's 2026-10-22 instruction authorizes prompt merge of PR #771 once green or at a meaningful completed checkpoint, with remaining requirements tracked in [issue #772](https://github.com/link-assistant/router/issues/772). Use normal merge protections without bypassing required checks. A checkpoint merge does not certify full parity or change the same-SHA JavaScript gate before Rust.

## Translation rules and shared regressions

For [one-operation source preparation](docs/development/single-source-rule-operation.md),
compare all complete canonical phase sources independently, retain the actual
rule IDs and inverses, and keep the original larger-input path when existing
canonical/UTF8 bounds do not fit. Share the established language engine through
an adapter; preserve the batch generator's binding-collision refusal. This does
not qualify or enable the separately parked shared-TypeScript scheduling draft.

For [native-parsed canonical CST construction](docs/development/native-parsed-canonical-cst.md),
preserve the complete original compiler prefix, source authentication, both
independent builds, full canonical-wire comparisons and the legacy validator
fallback. Source-text preflight is equality data and never a reviewed-source,
parser or owner capability. Actual source proposals and history joins require
the complete CST/native reviews. Fixture setup must copy the complete current
dependency set and derive import counts from the native grammar while retaining
all behavior cases, callback assertions, refusals, inverses and original limits.

For [invocation-local source checks](docs/development/invocation-local-source-checks.md),
retain complete canonical wire comparisons, already serialized/reparsed CST
transports, both actual substitution sequences and complete inverses. Native
module batches must preserve original filenames, module isolation and the
original compiler options/diagnostics; scripts use the unchanged checker.
Run final source fingerprints after native checks. Regenerate dependent sources
through their actual producer, preserve every original whole test and deadline,
and retain failed/late attempts. These optimizations grant no semantic authority
or application coverage and create no caches across invocations.

Profile matrices use the [sequential process contract](docs/development/isolated-profile-matrices.md): run every complete profile in a fresh process, preserve all original compiler checks and validate every staged byte plan and current input before publishing profile outputs. Generate the copied producers and CLI branch through `node tools/translation/prepare-isolated-matrix.mjs --emit /tmp/FRESH_PROPOSAL`, independently review complete CST/native-source inverses, and require `--check` freshness. Preserve whole receiving files, original deadlines and matrix, heap, aggregate RSS and disk limits. Remove only the task's identified inactive temporary generated storage after interruption. This changes compiler-context lifetime, grants no new source or semantic authority, and does not certify full translation or parity.

Implement translation as ordered substitution rules over parsed source, checked semantic meta or target syntax. Keep at least two separately declared rule sequences: reusable programming-language rules first, then repository rules for Router's output layout, imports, formatting and quality conventions. Keep language semantics independent of Router paths and declaration names. Repository rules must preserve the meaning established by the checked language rules. Both Rust → meta → JavaScript/TypeScript and JavaScript → meta → Rust/TypeScript must retain the serialized, reparsed meta boundary. See [the rule-layer contract](docs/development/translation-rules.md).

Keep concrete syntax in the meta-language before checked semantics. The `meta-language-concrete-syntax-v1` representation stores the complete source once, with ordered token, trivia and delimiter spans; serialize, parse and reconstruct it before the semantic parser consumes the text. The ordinary source entry requires exact UTF-16 reconstruction. A canonical concrete document can also supply edited source, which must receive fresh native syntax, owner, type and checked semantic-meta validation. Lexical, opaque and error statuses describe the concrete provider, not grammar acceptance; retain their complete source and diagnostics while the existing native parser and semantic checker decide admission. Concrete fidelity grants no type, owner, producer-effect or executable authority.

The reverse semantic entries now require the installed TypeScript compiler even for portable scalar source, because they create a fresh native syntax file before checking semantics. Configure exported bundles to use their actual receiving dependency root before import; missing compiler dependencies are environment errors, not invalid-source diagnostics. No across-call syntax verdict is reused by this new check.

The reverse entry `translateConcreteSyntaxMeta` accepts JavaScript and TypeScript concrete documents and emits only the existing checked common subset. TypeScript annotations and other unsupported constructs remain refusals; this is not a type-erasure shortcut or full TypeScript-to-Rust translation. The native TypeScript syntax path also consumes the identical reconstructed JavaScript, retaining its existing syntax and automatic-semicolon-insertion checks. Focused receiving checks do not establish generated freshness or complete parity; regeneration and the complete same-SHA JavaScript gate are still required before gated Rust CI or release-ready publication; authorized incomplete feedback checkpoints follow the policy above. See the rule-layer contract for concrete-stage bounds and limitations.

For bulk stored or edited CST, use the [explicit bulk transport contracts](docs/development/concrete-syntax-bulk.md). Retain every row, independent concrete validation and whole-call limits across chunk boundaries. Grouped source authentication changes the observer schedule explicitly; it does not replace fresh semantic checks or authorize caller-supplied metadata. Keep the untrusted-document path separate from the private source-origin specialization.

Stored project review validates the complete concrete field and all remaining semantic metadata separately. Each keeps the original two-million-object/depth-512 guard; storage still limits each complete file to 64 MiB and the aggregate to 512 MiB. Every concrete document must serialize, reparse and reconstruct its complete original Rust source, with an exact source-hash and row-census join. The source-derived stored-project reviewer receives every other field and retains independent generated-method checks; the original direct reviewer API remains unchanged. Generate the copied concrete review guard with `node scripts/prepare-project-concrete-review.mjs --emit`, review its complete CST and inverse before installation, and require `--check` freshness. This data validation grants no namespace, executable or runtime authority.

The separate compressed project-storage APIs preserve the complete logical JSON and original decoded-file, decoded-aggregate and physical-storage limits. Generate their complete source copy with `node tools/translation/prepare-compressed-project-meta-storage.mjs --emit`; generate the pinned MIT compressor scope with `node tools/translation/prepare-meta-compression-vendor.mjs --emit`. Review both proposals' complete CST, inverses, native grammar and upstream license before installation, and require both `--check` commands. Compression is deterministic across Node and Bun, validates full byte restoration and cannot admit a source, type or runtime behavior. Integrate producers/readers and regenerate all canonical/profile outputs before claiming the storage extension is active or current.

Prepare the JSON-reader reviewer's profile pin with `python3 -B scripts/prepare-json-reader-review-profile.py --root "$PWD" --emit /tmp/FRESH_PROPOSAL`. Its actual ordered `language` and `repository` sequences retain lossless serialized/reparsed Python tokenize-CST, verify that only the selected native AST literal changes, and prove the complete original/current Cargo and JSON-profile equation. Independently review the full proposal and inverse before installing it, then require the same command with `--check`. Keep the strict source-profile check and run the complete receiving workflow in Node and Bun. Copy this preparation tool with the receiving workflow when adopting it elsewhere; its CST records grant no compiler or runtime authority.

Generate the complete stored-project reviewer copy with `node scripts/prepare-stored-project-review.mjs --emit /tmp/FRESH_PROPOSAL`, independently review every original function, copy equation, native grammar, CST and inverse, and require `--check` after installation. Follow [its contract](docs/development/stored-project-review.md): share private contexts only within one fresh review call, rejoin original sources and sealed dependencies, normalize serialized profiles through the existing profile parser, and preserve all original body and refusal checks. Never reuse this invocation's source or verdict in a later call. Qualify complete receiving files under both engines and the original full-review bound before claiming a performance improvement.

Historical Git tests must carry complete genuine commit, selected tree and source blob bytes when CI cannot access the original revision. Preserve every original source pin, validate all selected paths with native Git and full CST roundtrips, report missing parent ancestry explicitly, and clean task-owned fixture directories. Use a portable fixture rather than substituting current source for missing historical bytes. Qualify every original receiving case and its deadline after adapting the loader.

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

Bulk draft the complete known requirement batch before receiving tests: shared
language rules, repository bindings, compatibility implementations, applicable
reverse mappings and independent regression cases belong together. Resolve
related failures together after that draft. Avoid full regeneration between
individual rule edits. Keep drafted support, callable generated functions and
independently verified behavior separate in progress reports; none alone is an
overall completion percentage.

For the current entire-requirement drafting phase of #759/#772, continue source
review and implementation only until every remaining implementation draft in
[the ledger](docs/development/bulk-draft-requirements.md) exists. Defer tests,
experiments, benchmarks, verification compiler diagnostics, trial translation,
freshness regeneration and CI-triggering pushes. Automated source construction
may write complete originals, rules and implementation drafts; executing those
drafts for validation remains deferred. Draft independent JS/TS regressions and
native Rust oracle source together. This phase overrides the usual receiving
test cadence while preserving every original gate, deadline and JS-first rule.

The [owned collection](docs/development/owned-collections-draft.md) and
[predicate/fold](docs/development/owned-iteration-draft.md) profiles illustrate
complete implementation copies with distinct private issuers and checked meta.
Keep their original sources and language/repository inverses intact. A library
implementation, declaration table or reverse profile does not close forward
caller adoption, production synchronization or whole Router coverage.

For [default-byte source histories](docs/development/default-byte-source-histories.md),
compose complete genuine successor-producer chains and regenerate the receiving
records as one batch. Retain independently pinned originals, every unknown-source
refusal, whole case bodies, full CST inverses and original deadlines. Reuse the
existing bounded source-substitution operation within one preparation call;
preserve its complete original fallback and avoid caches between calls.

Prioritize common translation blockers using actual project diagnostics. A [shared compatibility core](docs/development/compatibility-core.md) may implement matching Rust and JavaScript library abstractions while leaving their internals untranslated. Bind repository CST rules to qualified owned APIs, check operands through the language rules and retain both meta roundtrips. Test independent shared behavior and actual Router callers; keep application coverage, runtime parity and untranslated library status separate.

For continuation #772, follow [the throughput plan](docs/development/translation-throughput-plan.md): qualify a shared operation family once, generate its actual callers and both translation directions together, and recheck whole functions after each prerequisite is removed. Profile shared receiving bottlenecks before expensive retries. A historical first-refusal count is a worklist, never current executable coverage.

Keep work bounded: run one expensive compiler, test or compression workload at a time, reuse existing worktrees and dependencies, check disk space and retain complete failure evidence with lossless compression. Assign that workload explicitly before a worker starts it. Retain actual source versions, full vectors, commands, compiler identities, logs and resource receipts; a digest alone does not preserve the original evidence. When a command becomes slow, measure it before optimizing shared rules; preserve semantics, complete test cases and deadlines. Do not filter failures, raise limits or weaken refusals to obtain a pass. Report executable coverage separately from source preservation, and retain explicit parity limitations until the full checks prove them resolved.

For source-layout changes, select executable filesystem and current Git reads
with the parser, apply ordered CST substitutions and verify complete source
inverses. Preserve frozen historical source bytes, hashes and logical source
identities. Adapt their receiving loaders explicitly; embedded child sources
and immutable historical revisions must keep their own paths and contracts.

Receiving module copies must select real import and `import.meta.url` spans with
the installed native parser. Repeated equal replacements need separate mapped
spans and a complete inverse; do not rewrite embedded strings or comments with
an import-shaped regular expression. Retain serialized/reparsed CST on both
sides and qualify the complete original test files under Node and Bun.

When later source extensions follow a historical terminal kernel, keep the
original producer equation and checksum controls intact. A receiving history
adapter must retain every later byte, the complete native-selected function,
whole-source CST and exact inverse. Historical comparisons have an explicit
scope; runtime comparisons still execute the complete current module. A new
source-data association for a frozen parent must authenticate its own complete
historical/current universes rather than borrowing another test's case identity.

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

Test carriers using the owned core must retain every actual facade child. Use
`node tools/translation/prepare-complete-core-source-fixtures.mjs --emit` and
`--check` for the copied complete-child fixture and its consumer imports. Preserve
explicit wrong, undefined and accessor source fields in refusal fixtures. A
completed source carrier still needs ordinary fresh parsing and semantic checks.

Frozen feature-worklist consumers use a separate receiving adapter for the two
known Cargo profiles. Preserve their raw modules, hashes and function bodies.
The adapter must prove all four Cargo metadata token edits, original/current
archive bytes and the complete CST whitespace inverse. Keep their original
cryptographic and collection-callback comparisons in both engines; accepting a
new raw checksum without that complete equation is insufficient.

Package-only positive feature DATA use the complete existing facts producer,
copied by `node tools/translation/prepare-external-package-defaults.mjs --emit`.
Review and install its source/CST proposal, then require `--check`. Preserve the
original caller-bound producers and fresh complete Cargo parser authentication.
This entry must not invent a project module, prove a dependency unit's test or
target configuration, close a feature key or authorize a namespace. Qualify both
complete original/new test files and their full native Hash input comparisons.

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

An explicitly consuming storage sibling may release only producer-owned
selected metadata after its complete field encoding and original byte check.
Preserve the ordinary non-consuming API, complete logical output bytes, hashes,
validation and original budgets. Check configurable selected fields before
consumption; document that later failures may leave earlier fields consumed.
Generate the complete sibling and genuine consumer import substitutions through
the two CST rule phases. Compare complete retained semantic and concrete fields
in Node and Bun before retrying full generation under unchanged resource limits;
small fixture passes do not establish full-project memory fit or parity.

For this consuming lane, encode selected components first and restore original
property order before complete logical hashes and output. Retain other root
fields as bytes and avoid duplicate root strings while preserving full canonical
validation. Pressure diagnostics must decode stored CST compression envelopes,
join the original logical bytes/digest, and compare every original output byte;
a pass on the envelope alone does not qualify the complete CST or live compiler.

After a synchronous retained-map transfer succeeds, release the producer-owned
root/component text before transferring the next component. Preserve the map's
checked immutable cell or primitive fallback and every original budget. Test
storage, retention and the restored-output census while the same live pressure
remains; releasing pressure before retention misses the pipeline's peak.

Release planner-owned project declaration and source-scope arrays after their
last standalone translation use, before the output census. Verify their actual
native bindings and consumer references; never clear caller-owned arrays or
contexts still needed by a later compiler stage. Preserve every output and
source check. A completed translation phase is not a completed generation.

A complete source-trial set may contain files already in the desired form.
Keep those unchanged members and their complete original bytes in the fresh
source set; do not drop them to satisfy a changed-files predicate. The selected
codec must still change. Changed source must differ in full encoded bytes,
while unchanged source packets retain their original-source association and
reject an added, missing or altered trial payload. Preserve all membership,
source/hash, CST/inverse and native binding checks; packets grant no authority.

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

For issue #759, the user's latest 2026-10-21 instruction requires existing subagents to finish and the coordinator to continue alone, superseding the earlier allowance of up to three subagents. All existing workers have finished; do not spawn or restart workers. The coordinator alone integrates, verifies and publishes, with one resource-intensive workload at a time. Prioritize common rules using source-bound production function counts, retaining overlapping groups and subsequent blockers; count progress only when actual application functions become executable. Do not clone more repositories. The current owner is recorded in [AGENTS.md](AGENTS.md). Keep the case study below its fixed 500,000,000-byte filesystem allocation and measure allocation without counting shared inodes twice. Preserve complete recovery and continuity evidence before retiring an archive. The user authorized removal of this task's own inactive Rust caches and build directories regardless of age; identify each owned path, check that no worker uses it, and record reclaimed space. Never remove another worker's active directory or lock. Freed space does not authorize a local Rust build.

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
├── js/
│   ├── src/              # Native JavaScript implementation and CLI
│   └── test/             # Native JavaScript tests and typed receiving controls
├── ts/
│   └── src/              # TypeScript generated through checked CST/meta rules
├── rust/
│   ├── src/              # Rust library, CLI and compatibility core
│   ├── tests/            # Rust integration tests, executed in gated CI
│   ├── examples/         # Rust usage examples
│   └── Cargo.toml        # Rust package configuration
├── scripts/              # JavaScript gate/generation tools and existing Rust/Python helpers
├── tools/translation/    # Forward test/, reverse js-to-rust/test/, serialization-schema/*.test.mjs
├── .gitignore            # Git ignore patterns
├── .pre-commit-config.yaml  # Pre-commit hooks
├── Cargo.toml            # Root workspace selecting rust/
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

Source-reader substitutions must preserve the distinction between a logical
crate input and a physical workspace input. Use an explicit workspace reader
for the root manifest. Native import and source-span checks establish the
actual filesystem binding; they do not establish which manifest a caller
intends. Preserve full historical parents, original test cases and deadlines
when repairing readers, and verify both nested and legacy receiving layouts.

For later compiler DATA formats, use the actual producer and preserve complete
old/current source, serialized/reparsed CST and inverses. Historical comparison
adapters must identify their exact scope; other tests and production imports
must still execute the current implementation. Keep cold unavailable-host
imports inert. Storage changes must recover every original value without
raising the source graph's existing bounds or adding source, owner, hash,
verdict or encoded-result caches across translation invocations.

For repeated imports in receiving fixtures, reuse the native-parser relocation
helper rather than a globally replaced import-shaped string. Run
`node tools/translation/prepare-receiving-module-relocators.mjs --emit`, review
the complete original/current CST and inverse, install its actual outputs and
require `--check`. Keep reusable function substitutions in the language sequence
and physical helper imports in the repository sequence. Source producers keep
their portable input snapshots under `tools/translation/source-profiles` so the
complete compiler export includes those inputs. Preserve every original case,
callback and deadline; qualify actual current production code separately from
scoped historical source views.

When current application migrations change a historical oracle's parent,
carry complete original Git commit/tree/blob data and preserve its original
source/body pins, test workload and deadline. The portable lexical-parent
fixture is copied by `prepare-lexical-parent-history.mjs` from the already
qualified portable history producer through separate language/repository CST
rules. Its five parents and nine genuine objects supply historical test DATA;
they do not increase current executable coverage or establish runtime parity.
