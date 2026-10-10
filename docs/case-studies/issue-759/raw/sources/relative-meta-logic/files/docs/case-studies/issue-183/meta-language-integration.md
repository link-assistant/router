# Official meta-language release integration audit

Audit date: 2026-10-08. The official implementation is consumed from release 1.0.0. Full
language acceptance R101 and R103–R109 remains incomplete.

## Official source integration and registry status

The implementation merged for [upstream issue 195](https://github.com/link-foundation/meta-language/issues/195)
on 2026-10-06 is now consumed at release commit
`a79782093cae3b33606483ac9f3e1d05faf36de0`: the JavaScript runtime is an immutable
source submodule and Rust uses the exact official crates.io release `=1.0.0`.
The release is 17 commits after the previously consumed `679a3b3` source.
The crate's VCS metadata and 343 compared files match this release source.
The [2026-10-08 20:16 UTC registry audit](data/meta-language-release-audit-2026-10-08.json)
confirms npm still exposes only 0.46.0. A matching npm release remains absent;
RML ships the matching official JavaScript release source with provenance.

[Upstream language source](../../UPSTREAM_LANGUAGE_SOURCE.md) documents the
installation, file hashes, licenses, package-consumer behavior and exact API
boundary. The new `rml-upstream-language.mjs` / `upstream_language.rs` interfaces
expose upstream grammar CSTs, scoped bindings, project-context resolution,
structured edits, snapshots and translation contracts directly. The official
shared four-language fixture is exercised in both runtimes, including invalid
input and missing-context/capture refusal. Full semantic translation remains
open: upstream's unsupported-input envelopes do not satisfy that requirement.

RML now uses maintained links-notation 0.25.1 in both runtimes, with its existing
LiNo frontend and structured-links-network corpus checked for compatibility. Existing
RML-specific syntax and portable-natural behavior remain separate from the
newly consumed general-language APIs.

## RML structure schema 1

`js/src/rml-meta-structure.mjs` and `rust/src/meta_language_structure.rs` register
`rml:structure:1` using upstream `LanguageProfile.declareIn` / `declare_in`,
`LinkNetwork`, `LinkMetadata`, and ordered Link references. There is no private
upstream API dependency.

The shared LiNo frontend now exposes the trees it already parsed through
`parseLinoLinkDocument` / `parse_lino_link_document`. Existing text/location
entry points retain their previous result shape. The adapter never reconstructs
source and reparses it to recover the structured forms.

The extension has these node definitions, each prefixed `rml:structure:1:`:

- `document`: ordered form references; term is the schema version
- `form`: syntax-root and source-location references, in that order
- `location`: normalized-source line, code-point column, and length
- `reference`: the exact decoded reference value, with no children
- `link`: optional link name and ordered nested values
- `compound`: the frontend's path-combination distinction and nested values
- `diagnostic`: original parse-error detail and a location reference

Form roles distinguish declarations, theories, rules, assumptions, proofs,
substitutions, and otherwise unknown forms. These roles are syntactic labels,
not claims that a declaration has resolved, a rule is admitted, or a proof has
checked. Bodies, nested binders, references, proof steps, and unknown syntax stay
as ordered nested links-network data. Unknown source is never converted into a proof or
dropped because it does not match a known role. A LiNo-invalid document keeps
its complete source plane plus an E006 diagnostic; it has no parsed-document root.

Two deliberately distinct representations coexist:

1. Source-token links preserve original spelling, comments, whitespace, BOM,
   CRLF, and incomplete input. `reconstructRmlFromMetaLanguage` /
   `reconstruct_rml_from_meta_language` reproduce this plane exactly.
2. Syntax links retain the shared LiNo frontend structure. `rmlStructureOnly` /
   `rml_structure_only` produce a separate network with **zero source tokens**.
   `emitRmlFromStructure` / `emit_rml_from_structure` generate canonical LiNo
   solely from these links, without a source buffer or parser. Canonical output
   retains parsed structure, not original formatting or comments.

`serializeRmlStructure` / `serialize_rml_structure` and matching deserializers
share JSON schema `rml:structure:1`: language plus Link records containing IDs,
ordered references, link type, language, definition, and optional term. This
explicit snapshot was originally introduced because published npm 0.46's
`toLino()` omitted metadata; it remains the versioned RML interchange contract
after source integration. Rust may reindex IDs during import; shared references retain identity.
The snapshot does not preserve the source-token plane. Import retains sharing
when multiple references in the snapshot name one node, but `rmlStructureOnly`
and serialization deliberately project syntax into occurrence trees; they are
not archives of arbitrary links-network identity or cycles. Cycles, dangling references,
duplicated IDs/document roots, unsupported schemas, and over-deep syntax are
rejected. Reconstructing a compact shared acyclic links network is additionally bounded: expanded
nodes may not exceed `max(1024, 4 × syntax-node count)`, and expanded reference
text plus one unit per node may not exceed `max(4096, 4 × stored syntax-term
UTF-16 units including one unit per syntax node)`. These budgets span all forms
in a document and return an explicit expansion-limit error rather than allowing
exponential materialization. They are independent of the preserved source-token
plane. Snapshot input is syntax data, not execution authority.

Stage reports explicitly separate preservation, parsing, resolution,
elaboration, execution, and verification. Parsing syntax does not run any of the
last four stages. Legacy evaluator parity reports still compare executions of
source by the host evaluator; this is not Link-driven elaboration or execution
and is not claimed as R149–R151 closure.

## Identifier rewriting contract

`js/src/rml-js-rename.mjs` and `rust/src/js_rename.rs` implement the same
`lexical-blocks-v1` conservative rename over the lossless JavaScript token CST.

- Supports simple `let`/`const` bindings and standalone nested lexical blocks.
- Selects the top-level binding, or the sole nested binding when there is no
  top-level one; unresolved names are selectable when no binding exists.
- Preserves shadowed declarations/references and lexical temporal-dead-zone
  binding identity; member-access property spellings are not renamed.
- Preserves strings/comments; Unicode including astral identifiers works.
- Locations use UTF-16 offsets and one-based Unicode-code-point columns, with
  CRLF counted once even across comment/trivia token boundaries.
- Any existing target-name identifier in the lexical environment is a capture
  refusal. This is deliberately conservative, including disjoint scopes.
- Multiple nested bindings without a selected top-level binding are ambiguous.
- Function/arrow scopes, object literals/shorthand, destructuring, templates,
  escaped identifiers, regex literals, `var`, imports/exports, and dynamic
  `eval` are unsupported and rejected before edits. No partial rewrite is
  returned for them.

Errors carry `RML_RENAME_CAPTURE`, `RML_RENAME_AMBIGUOUS`,
`RML_RENAME_UNSUPPORTED`, or `RML_RENAME_INVALID`. This is not a complete
JavaScript parser; successful results explicitly report `syntaxValidated: false`
(`syntax_validated` in Rust). The transform assumes otherwise valid input and
must not be used to certify native syntax or full ECMAScript conformance.

## Translation obligations and preservation contracts

`languageTranslationObligation` / `language_translation_obligation` expose the
same versioned unsupported-obligation model for all twelve directed pairs.
For arbitrary full-language inputs they return `status: unsupported`, unchanged `preservedSource`, a null
`targetSource`, and `RML_TRANSLATION_UNIMPLEMENTED` with the pending structure,
binding/type resolution, encoding, and preservation obligations. This is a
refusal interface, not twelve implemented translators.

The separate [portable natural-number translators](portable-natural-translation.md)
now implement all twelve paths for a bounded pure-function fragment through the
registered RML links network. All twelve directed native target paths pass eight
observations each in JavaScript/Rust/Lean/Rocq; three false Rocq observation proofs
are rejected. The full-language and arbitrary-proof gaps remain explicit. No full-language path currently
promises behavior/effect preservation, Rust ownership,
JavaScript host facilities, module linking, type correspondence, Lean/Rocq
universe correspondence, preservation of assumptions, or proof validity.
Native compiler/prover success would be one validation layer, not a proof of
cross-language equivalence. The complete machine-readable per-language and
per-path inventory is `language-coverage.json`; all missing obligations remain
acceptance work.

## Evidence

Shared fixtures:

- `test-corpus/meta-language/rml-structure.json`: roles, quotes, nested syntax,
  indentation, Unicode, normalization, unknown proofs, and invalid source
- `test-corpus/meta-language/structured-snapshot.json`: a JavaScript-produced
  links network consumed without source tokens by Rust
- `test-corpus/meta-language/expansion-cases.json`: shared positive/negative shared-network
  cases, including exponential node expansion, repeated long references, UTF-16
  text accounting, and empty references
- `test-corpus/meta-language/identifier-rewrites.json`: shared positive,
  capture/shadowing, Unicode/location, ambiguous, unsupported, and invalid cases
- `test-corpus/lino-frontend/cases.json`: entire frontend structure/diagnostic
  corpus also consumed through the new network extension

Runtime tests are `meta-language-structure.test.mjs`,
`meta-language-rename.test.mjs`, `meta-language-support.test.mjs` and their Rust
`meta_language_*_tests.rs` mirrors. They test actual upstream links-network substitution
changing emitted syntax, source-free structured links-network serialization, mutation rejection, exact
source preservation, and all twelve unsupported outcomes. They do not establish
full-language grammar, elaboration, native validity, execution equivalence, or
proof equivalence. Final test outcomes belong in the integration run report,
not inferred from these test descriptions.

The release update also runs `upstream-language.test.mjs` and
`upstream_language_tests.rs` against the shared `release-regressions.json`:
default arguments, declaration-scope resolution, Unicode escape decoding and
source-preserving refusals. Registry delivery and those focused regressions do
not close the full-language semantic or proof obligations above.
