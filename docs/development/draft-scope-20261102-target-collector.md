# Fresh native JS/TS scope observations — source draft

L01/L02 remain OPEN. All execution is UNRUN and the complete production-function
denominator remains UNKNOWN. This sibling to the Rust collector drafts fresh
observations for real JavaScript and TypeScript AST nodes; it does not turn
native function declarations into an executable coverage count.

[`draft-scope-20261102-target-collector.mjs`](../../tools/translation/draft-scope-20261102-target-collector.mjs)
obtains the actual pinned TypeScript compiler through the existing
`ownershipCompiler` export. It requires `ownershipCompilerRuntimeNativeCurrent`
and non-null `ownershipCompilerRuntimeOriginData` before consuming source,
checks the exact same private loader/host/physical-source epoch at file and
operation boundaries, and refuses unknown or changed original load origins.
The existing native origin issuer rechecks the entire actual compiler cohort
physical identities, timestamps and directory membership. A public compiler version/path/sys field or detached metadata cannot
replace that private association. The original private guard has a selected export birth snapshot, covering
source creation/traversal and allocator prototypes. It does not qualify every
public AST-kind predicate or checker export used by the broader source helper.
Operation-local whole-export descriptor pins detect lifecycle changes but do
not extend that private birth issuer. This remains an explicit UNPROVED native
export/checker closure gap on every source and the result; public predicate or
helper flags cannot close it. The collector uses no `ownershipSyntax`
source cache and introduces no source/parser/owner/verdict/result cache.

Each complete original source passes through native private CST serialization
and reparsing with exact whole-source equality. Native `createSourceFile` uses
its actual path, complete text and explicit JS/TS/JSX/TSX kind with native parent
nodes. Native grammar refusals remain diagnostics. Real AST child-parent and
SourceFile identity checks, original filename/text checks, cell/depth/size bounds,
whole UTF-16/UTF-8 scalar offsets and closing complete CST joins retain exact
source origin. Failed traversal or closing checks discard that file's pending
observations; a changed host/source epoch refuses the operation entirely.

The original `verifyNativeCopiedSourceBindings` runs on each complete actual
JS/TS source without relaxing its identifier/declaration/initialization refusals.
Its existing finite source-scope profile is not a strict project typecheck or
namespace/type/ownership permission. A refusal stays explicit while purely
syntactic observations may remain marked REFUSED. JSX/TSX syntax can be observed,
but the original binding checker lacks a qualified JSX/TSX profile: that lane
explicitly refuses rather than parsing JSX as ordinary JS or TS.

Observations include declarations, expressions, arrows, methods/signatures,
constructors, getters/setters, classes, namespaces, interfaces/type owners,
object literal owners, imports/exports and decorator producer sites. Their
actual enclosing AST owner path and full spans remain attached. Anonymous
initializers retain the real native variable/property binding name/span where
the parent AST supplies one; these are syntactic bindings, never resolved owners. Comments and
literal strings are never searched for function spellings. Decorator expansion
stays unknown. All roles stay unclassified: native syntax alone cannot decide
production versus tests, generated outputs, declarations or dependency internals.
Imports/exports are syntax observations, not completed binding/export closure.

The [deferred immutable SCM reader](../../scripts/draft-scope-20261102-target-collect.mjs)
selects complete committed source extensions from both physical trees before
requesting sizes and exact original blobs. The pure collector validates claimed
Git content only; the reader establishes immutable revision/path/blob association.
Neither accepts caller compiler objects, SourceFiles, symbol tables or ASTs as
evidence. Both retain false source/namespace/type/owner/executable authority;
denominator/coverage remain null and verification remains UNRUN. The CLI exits 2.

[Independent case source](../../tools/translation/test/draft-scope-20261102-target-collector.test.mjs)
covers actual native nested functions/arrows/class members/accessors, Unicode
byte spans, TypeScript namespace/interface owners, comment/string false positives,
real native binding and grammar refusals, wrong content/Unicode/duplicate/extra
payload refusals, explicit source-domain gaps, and Router's actual native package
export source. [Immutable target-reader cases](../../tools/translation/test/draft-scope-20261102-target-committed.test.mjs)
retain both package-root and physical-source selections and mismatch/mutable-ref
refusals. All parser/CST/scope/receiving execution remains UNRUN.

This bookkeeping tool performs no source rewrite. Source translation rules and
source-edit inverses/native behavior oracle are inapplicable to the collector.
Application translation still requires exactly language then repository sequences,
complete before/after/inverses, serialized/reparsed CST/meta, private semantic
checks, both directions, strict TS, synchronization and actual caller/oracle cases.
Complete module/entrypoint/export/producer closure, source-reviewed roles, native
dependency boundaries and every production entry's real requirement/adoption
mapping remain open. No source-draft closure receipt is proposed.
