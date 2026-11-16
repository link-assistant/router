# Fresh original Rust scope observation collector — source draft

L01/L02 remain OPEN and the complete production-function denominator remains
UNKNOWN. All new parser/CST/receiving/case execution is UNRUN. This additive
collector closes a concrete implementation gap in the historical top-level-meta
worklist: nested observations can be freshly issued from the real source parser
rather than interpreting lexical `fn` spellings as production functions.

[`draft-scope-20261102-collector.mjs`](../../tools/translation/draft-scope-20261102-collector.mjs)
requires complete Rust source with immutable physical-origin metadata, checks
whole UTF-8 bytes and the claimed Git content association, and retains the exact
revision/path/blob/mode/byte origin on every observation and refusal. Content
hash agreement is bookkeeping only; the source reader must establish the claimed
immutable tree association. The
[deferred SCM reader](../../scripts/draft-scope-20261102-collect.mjs) selects all
committed `rust/**/*.rs` entries from one explicit full SHA before requesting
sizes, then reads each exact original Git blob. It cannot certify worktree edits.
Neither module accepts a caller-provided parser frame or AST as evidence.

For each complete file inside the original parser's domain, the collector uses
`transportConcreteSyntaxSource` and reparses its complete serialized CST through
`transportConcreteSyntaxMeta`. Genuine `captureSourceModuleViews` records retain
the private inline-parent lineage and complete original source. Actual module
items come from `originalSourceModuleItems`, and function/member selection comes
from `originalDeclarationHeader` and `originalNamespaceFunctionMembers`.
`captureOriginalNamespaceFunction` issues the real private frame;
`originalNamespaceFunctionFacts` checks that exact frame, original item identity,
complete source, member index, source view, module path and compilation profile
before and after AST traversal. Copies of facts or public flags cannot establish
that association. The collector exports observations only; frames stay local.

The real parsed AST supplies nested Function, Closure, local ModuleItem, TraitItem
and ImplItem observations with enclosing owner descriptors and exact original
UTF-16/UTF-8 byte spans. Top-level trait/impl members use the original member
selector; they are not counted by regex or inferred from a historical selected
corpus. Source configuration and inherited module conditions remain attached;
nested attribute configuration stays explicitly unresolved. All roles start
unclassified, including apparent tests. Resolving source syntax does not determine
which Cargo unit/platform/feature is production, generated or test behavior.

OpaqueBang, MacroDefinition and attribute sites retain unknown producer expansion
and original spans. Their token-tree bodies are never walked as executable
functions. Unresolved or thrown original header/configuration inspections retain explicit
opaque item producer-review observations and diagnostics;
external module paths, associated items and parse refusals remain diagnostics.
Source files larger than the existing original namespace parser domain retain an
explicit source-domain diagnostic. No parser bounds or source/private guards are
relaxed. A failed closing private frame join discards that frame's partial output.
AST traversal retains the original parser
cell/depth bounds. The complete original CST is reconsumed at the closing file boundary. No parser,
source, owner, hash, verdict, failure or result cache survives this operation.

The [independent source cases](../../tools/translation/test/draft-scope-20261102-collector.test.mjs)
include trait declarations/default methods, inherent impl methods, inline modules,
local functions and closures; Unicode byte offsets; false functions inside macro
token trees; cfg/test/unknown attributes; missing external modules; physical
blob/revision/path/Unicode refusals; source-domain gaps; and actual Router admin
hardening source with inline tests. [Immutable SCM-reader cases](../../tools/translation/test/draft-scope-20261102-committed-collector.test.mjs)
add selected-tree/blob association, wrong content/UTF-8 and mutable-revision refusals.
All are UNRUN. Existing private issuer clone,
foreign-frame and changed-module association cases remain separate obligations;
the collector does not replace those cases or weaken the original APIs.

The collector is observation DATA and does not rewrite sources, so source
translation rules, source-edit inverses and a native behavior oracle are
inapplicable to this tooling. Application translation still needs exactly
language then repository rule sequences, complete before/after/inverses,
serialized/reparsed CST/meta, fresh private semantic checks, forward JS/strict TS,
reverse Rust, synchronization and actual caller/oracle cases. Every emitted
authority flag stays false and denominator/coverage stay null. The CLI exits 2;
a successful observation run would establish neither inventory closure nor
source-draft acceptance.

Remaining gaps include complete JS/TS native item/entrypoint collection,
source-reviewed generated/test/application/dependency role assignment, actual
Cargo/platform/feature units, producer inputs/expansion/output closure, every
production entry's requirement/adoption mapping, and the original full function
denominator. No checklist count changes and no closure receipt are proposed.
