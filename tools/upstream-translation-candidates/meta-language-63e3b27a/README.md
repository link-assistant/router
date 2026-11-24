# Current upstream translator source candidate — UNRUN

This is a side-by-side, inactive source copy of
[meta-language PR 201](https://github.com/link-foundation/meta-language/pull/201)
at immutable commit
[`63e3b27a32f22e64033aedbd5e0bbed3dcc0d71f`](https://github.com/link-foundation/meta-language/tree/63e3b27a32f22e64033aedbd5e0bbed3dcc0d71f).
The active `tools/translation/vendor/meta-language` pin is unchanged. No
production compiler imports this candidate, and it is not a runtime or source
proof issuer. Candidate code and upstream tests have **not run**. Source copying,
blob/hash checks and immediate gzip recovery checks are the only validation.

The copy includes **344 complete originals**: all 341 files in upstream
`js/src/**`, plus `LICENSE`, `js/package.json` and `js/package-lock.json`.
Original decoded size is **22,558,503 bytes**; stored source size is
**4,458,469 bytes**. The 58 files with over 1000 lines, over 32,768 bytes, or pristine
upstream whitespace diagnostics are retained whole as deterministic gzip
(level 9, zero timestamp, no filename).
Other originals are exact plain files. The source index is one JSON record per
original module/data file, rather than splitting or minifying implementations.
The upstream CLI's executable mode is retained in the index and plain file.
All pristine originals live under `raw/original/`, the existing source-record
exclusion used by the terminology check. This preserves upstream names and
phrases without rewriting them or extending the scanner exceptions. The initial
plain-source placement had 201 disallowed occurrences across 31 originals; the
complete pre-move index and hit list are retained as verification evidence.
The complete [Unlicense](raw/original/LICENSE) remains inspectable.

This is the complete **repository JavaScript source tree**, not an installed
npm dependency closure, all upstream test corpora, a Rust implementation copy or
a complete offline application. Locked package dependencies remain uninstalled;
separate runtime packages/WASM/grammar services and any optional external inputs
must be qualified before using the affected entry points. No copying contract
changes the declared behavior, authority or limitations of any upstream model.

## Inspect and recover

`members.jsonl` records original repository-relative path, Git mode, Git blob
SHA1, complete decoded length/SHA256/line count, stored relative path,
encoding and stored length/SHA256. `provenance.json` pins that full index,
upstream commit, license and packaging parameters. Recover into a fresh,
explicitly owned directory outside the active vendor tree:

1. Validate the complete index and its pinned digest; require unique safe relative
   paths, exact encoding names, original modes, and the declared complete member
   count. Reject unknown fields/path collisions before writing.
2. Read each stored member under its actual unchanged storage limits. Check its
   complete stored length and SHA256. Decode gzip only when declared, without
   truncation, text decoding, line-ending changes or other normalization.
3. Check the complete decoded length and SHA256 and the original Git blob hash
   (`SHA1("blob " + decimal length + NUL + original bytes)`). Restore exactly the
   indexed original path and executable mode using exclusive writes. A failure
   leaves this candidate unqualified; it must not fall back to altered sources.
4. Only then, in a separately authorized verification window, install the exact
   lockfile dependencies without lifecycle scripts, run actual receiving tests
   and compare complete checked/reparsed programs and emitted outputs. No local
   Rust builds/tests are authorized for issue #759.

These are recovery requirements, not a newly implemented loader. Mixed stored
`.js`/`.gz` paths are deliberately not a directly importable active package.
This candidate lives outside `tools/translation/`, at
`tools/upstream-translation-candidates/meta-language-63e3b27a/`. The existing
compiler-input and export root predicates therefore exclude the entire copy.
Its original location inside `tools/translation/upstream-candidates/` incorrectly
selected 220 files while omitting 127, including the license and compressed
originals; moving the complete copy fixes that placement without new exceptions.
Its existing **4 MiB per-file export bound is unchanged**: the original decoded
`js/src/data/concept-records.lino` is 13,210,130 bytes even though its stored gzip
fits that bound. A future exporter must explicitly support a bounded retained
asset/recovery contract or refuse; it must not raise limits, truncate the asset,
or claim a successful complete export from a partial copy.

## Bounded adapter design

Use the existing separately declared ordered `language` then `repository`
sequences. A future language rule may consume a genuine original parser/source
association, check the exact supported upstream interpretation, and map its
independently checked result into ordinary Router semantic IR. Preserve the
serialized/reparsed checked-meta boundary and fresh source/type/effect joins.
The repository sequence may package imports, filenames, formatting and source
receipts only after that check. It grants no method, trait, layout or body
admission. Additional logical passes compose inside the established phase names.

Do not replace all active vendor modules or enable an upstream profile by a
public Boolean. Upstream `translation/rust.js` explicitly refuses many model
combinations. Its owned-local state domain is String/bool/i32; its scalar-loop
domain is bool/f64. An upstream attached `Clone` spelling, transparent method,
public proof record or successful source reload does not supply Router's
private original trait/owner, Copy, no-Drop, namespace or runtime authority.
Keep unknown cfg, active macros, helper attributes, overlaps and loan refusals.

One actual future adapter target is original
`src/generated_js_first/policy.rs::retry_backoff` (line 89; declaration bytes
2680..3017, SHA256
`9b2e4c622cdf430a03fc46ebe8554b0fdb6419ae7c12084a8dd64d2bbc778d2a`).
The initial source audit recorded a `mutable aggregate` complete-project
refusal; its `js_min` and `js_max` callees were already executable, and ordinary
f64 floor, arithmetic,
comparison and primitive Copy operations already exist. This is **not** a
bool/i32 owned-local-state candidate: actual locals are f64. No matching actual
body was found in the current four mutation/three syntax frontier rows for the
narrower bool/i32 interpretation; mutable collections, references and effects
remain independent blockers there.

Source audit found that Router's existing `extensions/control.mjs` already
checks and emits direct `while`/`routerSet`; its scalar-eligibility predicate
omits float. The preferred next rule is therefore **existing checked control
plus genuine by-value f64 admission**, not a new loop adapter. The separate 171
rule now extends that existing control checker. Complete focused Node and Bun
files have exercised the unchanged original policy parent, IEEE boundaries,
evaluation order and strict TypeScript output; the combined current compiler
and full repository gate still require verification. The rule must preserve
exact original AST,
initial bindings, guard, writes, return order and all source/type/effect joins.
No upstream implementation is called by the active pipeline as a result of
this copy. Its source-copy status remains UNRUN, and focused rule checks do not
establish whole-library admission or runtime parity.

The retained `rust-scalar-loops.js` independently supplies useful bool/f64
proof and ordered-transition machinery for comparison. Its current parser
requires explicit `loop` and parameter state; it does not directly accept the
actual `while` with local mutable state. Its checker/model cannot be grafted
onto rewritten source and treated as original. Future reuse needs a concrete
missing rule and private source proof before implementing another adapter.

Future receiving tests must retain unchanged complete original source, source
and field spans, both full checked/reparsed programs, JS and strict TS outputs,
independent behavior and refusal controls. Include NaN, signed zero, infinities,
ordinary and extreme iteration counts, guard false/early exits, write ordering,
shadowed helpers, changed sources/proofs and nontermination behavior. Neither
this source copy nor passing upstream model tests claims an actual Router gain.
