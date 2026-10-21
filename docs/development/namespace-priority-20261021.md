# Original external trait namespace failures

Status: source diagnosis only; the ten published positive cases remain failing.
No namespace repair, receiving tests, performance qualification or Rust execution
is claimed here. Original test bodies, positive expectations and deadlines remain
unchanged.

The [compressed source receipt](namespace-priority-20261021-source-receipt.json.gz)
retains all ten complete original failure blocks from the completed CI cycle at
`4ed3325bee3156e6c36082c2fbd26d7a53f01535`, the complete cycle receipt, package
identity, exact rejected source spans and compiler/test source hashes inspected
at `e5cfccf20a35042fe81a16e9627f2fe40065535d`. It is diagnostic data and supplies
no executable or namespace authority. Its SHA256 is
`536b9165eff39590f9561e0f7ee1081a633c089105d0ec2eb94ca72fb7d4cd12`.

The published errors comprise six cases in
`external-trait-default-context.test.mjs` and four in
`external-trait-sources.test.mjs`. Nine throw
`original outer item has an unproved attribute producer`; the checked identity
caller reports the same error inside its refused function. The first common
source rejection is the complete pinned `base64` 0.23.1 package's
`src/engine/mod.rs`, SHA256
`6ce97ed46c6548e97e45d5b67ad41a2028ff2353f0311ed32317e9fe3b83532b`:

| Original line | UTF-16 span | Sibling declaration | Actual derives |
| --- | --- | --- | --- |
| 490 | 18105–18517 | `DecodePaddingMode` enum | `Clone, Copy, Debug, PartialEq, Eq` |
| 501 | 18571–18814 | `DecodeMetadata` struct | `PartialEq, Eq, Debug` |

`external-trait-sources.mjs` checks every original outer item before following
the exported `Engine` route. Its `originalNamespace` therefore rejects these
sibling derives before inspecting `Engine`'s members or `Send`/`Sync` owners.
A small native original-source census confirmed those two rejection candidates
in the root and engine files. Root conditional lint alternatives already pass
`originalConditionalNamespaceAttribute`; adding lint spellings does not address
this failure. The sparse worker checkout omits `rust/Cargo.toml`; the census
read its exact `HEAD:rust/Cargo.toml` bytes through Git, keeping the root workspace
manifest separate from the original crate manifest.

The missing proof joins are concrete:

1. Each sibling invocation needs a private original owner and complete enclosing
   output for every actual derive. A registered builtin name alone does not
   authenticate its original ancestor scope or sibling producer effects.
2. `derive-footprints.mjs` requires closed original attribute/import scopes.
   Its ordinary module closure rejects unknown conditional items; the requested
   ancestor path only closes its supported conditional module cases. The source
   plan in `derive-ancestor-attribute-scope.mjs` explicitly retains unresolved
   global bang effects and unknown child contents.
3. The optional external-default context refines one exact root `no_std`
   predicate using `std` only. It deliberately leaves attribute, namespace and
   prelude authority false. It does not resolve every dependency feature,
   target, test flag, tool owner or derive producer.
4. `createToolAttributeContext` requires complete active ancestor type scopes
   before issuing `rustfmt::skip`. The architecture census in
   `primitive-import-roles.mjs` proves a non-trait candidate property and reports
   `namespaceComplete: false`. It cannot prove absence of a competing `rustfmt`
   type prefix in a glob import or supply tool ownership.

A reusable repair needs a privately issued, name-specific export and producer
closure: authenticated complete source views; all unresolved cfg alternatives;
the actual named and glob export routes; independent enclosing-output proofs
for every producer; and original ancestor macro, type and tool owners. The
language sequence must establish that closure before a repository sequence can
join the exact external package/caller. Public metadata, CST reconstruction,
token-name censuses and modeled Cargo input roles cannot supply these proofs.
The old two-argument external-trait route and std-only optional context remain
separate domains; the new modeled library context still refuses the unresolved
namespace.

The earlier packet `router-builtin-enclosing-namespace-717-source-v1` was checked
as a candidate only. Its own final source review scopes its optional Debug
enclosing format separately from the legacy path. Current source already
contains its private backend-dispatch repair. Installing that old packet over
the evolved compiler or promoting its source-only flags would not close the
external ancestor/tool obligations above.

The additive `namespace-feature-gate.mjs` source issuer now retains complete
pinned compiler inputs for feature collection, query feeding before expansion,
the post-expansion gate and procedural internal-feature permissions. It checks
the whole original callback selection and nineteen exact source recipes. Its
private crate-root token enumerates every nested original `cfg_attr` alternative
without evaluating its predicate. This proves only that the requested feature
name does not occur in those original lists. It deliberately leaves the actual
`Features::default` owner, generated-span provenance and attribute gate open.

The source explains why feature syntax absence cannot yet close replacement:
`gate_alt!` accepts either a feature or `span.allows_unstable(feature)`.
`check_allow_internal_unstable` explicitly permits procedural macro functions;
`SyntaxExtension::new` retains that permission and `expn_data` forwards it into
hygiene. Therefore original crate feature lists cannot exclude a privileged
generated `rustc_builtin_macro` attribute by themselves. The new token cannot
be consumed as a namespace certificate, and no existing consumer is changed.

The retained base64 package's own `Cargo.lock` identifies source candidates
`rstest_macros` 0.26.1 and `rstest_reuse` 0.7.0. Their complete archives are kept
with checksums matching that lock, including their original notices. The source
templates are concrete: reuse `template` emits a `macro_rules!` and an import;
`apply` emits the selected template call; `merge_attrs` forwards a merged
`ItemFn`. The rstest entry dispatches to errors or single/parameterized/matrix
function and module renderers. These are candidate producers only. A package's
shipped lock does not prove the dev-dependency owner of the actual compilation.
The existing explicit Cargo unit path still needs typed target/dependency
normalization before it can exclude test-only producers. User `--cfg test` is
legal and cannot be inferred absent from the unchanged two-argument API.

Source checks passed with installed TypeScript 5.9.3: complete native AST copy,
language then repository CST serialization/reparse, and both full inverses.
The original compiler callback/recipe source check passed. Six new complete
controls are drafted with 60000 ms deadlines and remain unrun pending the
coordinator's runtime lease. The original ten positives are unchanged and have
not been repaired by this checkpoint. Cargo normalization is the next join.

The following source step avoids broad normalization for one dimension.
`cargo-normal-library-edge.mjs` privately joins the existing original dependency
and package tokens to seventeen relational Cargo source rules. For any
successful `calc_artifact_deps` library result, its actual target satisfies
`Target::is_lib`. Every `check_or_build_mode` branch returns `Build` or
`Check { test: false }`, including both host outcomes and dual procedural-macro
edges. The interner retains that target and mode; its build-std rewrite also
retains `TargetKind::Lib`. `State::deps` therefore rejects all Development edges
for the selected dependency-library unit. This conclusion needs no inference
about raw `TomlTarget` defaults, target triples, or rustc `cfg(test)`.

The source-namespace token retains both cfg test branches and unresolved child
import diagnostics. It proves neither a native invocation nor whole-crate
validity. Extra invocation flags and environment conformance remain separate
native-build obligations; the declared original source namespace is not
silently enlarged with hypothetical extern inputs. Existing pending normal-unit
APIs remain unchanged. The next namespace composition must use the private
development-edge exclusion to close only actual unavailable child producers,
preserve unrelated Bang traffic, and independently close builtin replacement
and generated attribute effects. Five new whole-file controls are drafted with
60000 ms deadlines and remain unrun. Source-only TypeScript 5.9.3 native copies,
ordered CST boundaries/inverses, complete Cargo callback recipes and grammar
checks passed. This source step alone does not repair the original ten cases.

Both new issuers now refuse cold changed ingress before allocating private
brands and use the captured diagnostic route. The feature issuer separately
pins the actual JSON parser and rechecks guards after every observable hash,
before parsing or reflecting again. Two additional complete controls cover live
and cold JSON replacement and a hash-installed JSON replacement, bringing that
new file to eight unrun cases. Original complete authored source snapshots are
unchanged: source producers retain exact guard substitutions and reconstruct
their parents through complete CST inverses.

`builtin-derive-type-range.mjs` now compiles a separate conditional outer-item
range. Its actual registered callback module declarations select source files,
including the original `#[path]` routes for Eq and PartialEq. Every occurrence
of the callback's output capability in its complete body must be a fourth
argument forwarded to a locally constructed `TraitDef`. Clone, Copy, Debug
and Eq have one such route; PartialEq has two. The common source join checks
the sole generic `push`, all Struct/Enum/Union dispatch alternatives, the
struct and enum return routes, the concrete Impl constructor and the actual
item builder. The reduced-graph source retains Impl associated-item handling
and block scope restoration. This is a conditional range of emitted callback
items, not a claim that a callback ran or that its full generated output was
accepted. Caller AttrLike ownership, generated outer attributes and the global
MacroNS builtin-replacement/hygiene exception remain explicit obligations.

The bounded source check reissued all five ranges from genuine dependencies;
the complete native TypeScript 5.9.3 AST copy and both CST inverses passed.
Six complete 60000 ms controls are drafted and unrun. No production consumer,
original positive, historical fixture, expectation or deadline changed in
this step. The ten original positives therefore remain unqualified. The next
composition must close the actual ancestor producer set before consuming this
range; in particular it cannot promote the architecture trait census, assume
rustc_attrs is unavailable to every standard macro (`alloc::vec` explicitly
permits it), or treat pending format/panic/assert effect plans as complete.

The range now checks whole dispatch and builder bodies. For each complete
struct, enum and constructor body it visits every token tree, rejects all
explicit return/try/yield alternatives, verifies the single normal-result
suffix and its arguments, and checks receiver binding sites. Each entry's
TraitDef receiver must be one root-local constructor binding; every occurrence
must be that declaration or an actual expand/expand_ext receiver, excluding
aliasing, mutation and nested shadow bindings. The concrete Impl constructor
also joins the original ItemKind variant schema and Item payload field.
Complete source checks passed again for all five names. The unchanged original
authored source snapshot remains retained; a separate complete afterimage
records this receiver/return-set change, with both native AST and CST inverses.
These stronger conditional checks still do not select caller attribute owners.

A separate registered-callback lane now covers the eleven generic derive
callbacks without selecting a prelude owner. ConstParamTy's two successive
root-local TraitDef bindings are joined to their actual use sites. Its private
brands cannot enter the existing caller-prelude range API. CoercePointee is
retained separately: for original nongeneric data inputs its complete
immutable visit and dominating generic-parameter guard precede every push.
The coordinator subsequently reported all six earlier range controls passing;
this worker has not executed receiving suites.

The finite producer plan retains eighteen complete compiler source files,
all sixteen selected compiler bodies, twelve LegacyAttr registrations, two
direct Attr registrations, eleven generic derive ranges and the exceptional
derive callback. Explicit rustc_builtin_macro arguments can select another
registered name; they are not assumed equal to the declaration name. Local
procedural registration installs a dummy extension. A foreign
LoadedMacro::ProcMacro remains a separate genuine dependency obligation.
Non-root macro_use extern-crate diagnostics do not stop the original routine
before its global macro-use prelude updates; block restoration alone cannot
close that escape.

The data transfer program checks twenty-three complete bodies or complete
dominating prefixes. It covers every actual builtin Attr callback on original
nongeneric Struct/Enum inputs with no nested cfg/cfg_attr or root Fn token.
Wrong-kind and no-generic early returns, both should_test alternatives,
all cfg_accessible results, the cfg_eval fast path, unchanged original derive
input and the contracts pre-injection failure are retained. These are
conditional source rules: caller conditions, original token origins and
foreign procedural provider exclusion are still false in this source plan.
No resolver consumer or original positive expectation is changed here.

Bounded source checks constructed all registrations and transfer joins.
Complete authored JavaScript copies for all three changed programs passed
native TypeScript 5.9.3 AST copying and the ordered language/repository CST
roundtrips and inverses (3.52 seconds). Eight additional complete 60000 ms
controls are drafted but unrun. Full runtime, original ten positives, native
parity, performance and coverage gains remain unqualified. The complete
receiver-range parent snapshot is preserved; a separate registered-range
afterimage extends its exact source substitution and inverse chain.

The next private input issuer joins actual captured package/dependency inputs,
complete current engine-source hashes and exact declaration spans to the
nongeneric data preconditions. Both original Engine sibling declarations
qualified in a bounded source check. Thirteen complete native parser,
capture/replay and AST-to-token callback bodies are retained. HasTokens and
HasAttrs for the actual Item type are obtained from the complete original
macro definitions and invocations through the opt-in literal grammar; their
complete expanded bodies and the P<T> forwarding implementations must match.
The source relation excludes cfg/inner-attribute replacement ranges, preserves
non-delimiter token kinds in cursor replay and retains the outer data body
as a group. Thus the contracts input has no root Fn token. Missing native
stored tokens may panic; the source issuer does not claim successful native
execution or whole-crate validity.

The private input token cannot select a callback or exclude a foreign
procedural provider. Those remain separate finite-producer composition
obligations; public input reports and metadata copies issue no namespace
permission. The complete authored input program passed native TypeScript
5.9.3 AST copying and both ordered CST roundtrips/inverses (1.39 seconds).
Six new complete 60000 ms controls are drafted and unrun. The original ten
positive bodies, expectations and deadlines remain unchanged.


Final source-library ABI composition (receiving runtime qualification pending)

The consumer now selects a separate private source-library ABI from the complete
pinned core/std Cargo manifests, library roots, original prelude reexports and
six actual defining declarations. Fourteen complete Cargo/metadata callback
bodies retain library-kind normalization, default non-procedural target creation,
proc-macro metadata encoding, root classification and defining-crate dispatch.
The ABI explicitly interprets the original typed optional fields for this source
model. It does not claim native serde execution, installed rmeta observation,
actual command-line units or sysroot conformance. The existing std-only/default
context remains non-authoritative; its false flags are never promoted. This is
the explicit source-library contract boundary, analogous to the existing
primitive source ABI, rather than an assertion about every external build.

The genuine package issuer selects an invocation-local context. Its declared
normal library namespace excludes development dependency edges independently
of injected cfg(test), and all original configuration alternatives and child
import diagnostics remain. Fresh actual data-item captures join the conditional
finite callback transfers. Ordinary local definitions stay Bang, registered
builtin replacement may select any actual registered callback, and same-crate
procedural registrations stay compiler dummy callbacks. A foreign procedural
callback is excluded only in the selected declared source-provider ABI; actual
native binding resolution is not asserted. Child Bang traffic is not treated as
a blanket proof about Type names or whole standard-library exports.

The generic constructor's actual immutable root-attribute binder is followed to
its item-builder argument. Its constructed symbol is joined to the original
ungated macro expansion, complete builtin lookup/map bodies and the collector's
builtin interception bypass. Original copied lint/stability attributes are
separately excluded from these concrete inputs. Twenty-two complete native
fragment, placeholder, associated-item, visitor and scope-restoration callbacks
retain the Impl/associated/body containment relation, with graph-root MacroNS
escapes discharged only through the separate finite source-provider contract.
Public reports and copied flags never select these private joins. Contexts expire
at the end of each synchronous closure invocation; there is no new source,
hash, encoded-result or verdict cache across invocations.

The external trait consumer uses this composition only for genuinely captured
original nongeneric data siblings with exact source spans. It preserves selected
trait/member availability and actual Send/Sync defining sources. It does not
admit the modeled base64 namespace or authorize trait method dispatch. A foreign
or relocated package issuer falls back to the complete old route before any new
reflection or source work, preserving the original observer-domain controls.
All ten original positive bodies, expectations and deadlines are untouched.

All six complete authored original/after programs passed native TypeScript
5.9.3 AST-copy checks and ordered serialized/reparsed language then repository
CST substitutions with complete inverses. Source-only finite/containment joins
also passed. Eight new complete 60000 ms controls are drafted but unrun here.
The original ten, full receiving controls, both engines, native parity and any
coverage or performance improvement remain unqualified until Root executes the
original workloads under the shared lease.


Receiving batch DTk3vU and documentation-input repair

Root ran the six complete files (42 cases) under Node: 30 passed, 12 failed,
with no deadline breach. Every complete failure block was read from
`/private/tmp/router-layout-check-complete-original-external-ten-and-new-source-ABI-six-files-Node-v1/stdout.log.gz`.
Eleven failures have the same source cause: the private data syntax preserves
three variant and two field sugared outer line documentation comments, while
the newly composed producer context required every attribute to be at the data
container. This includes the ten original positives and the new Engine control;
one original negative-route assertion first encounters the same admission error.
The remaining failure is the new ABI full Hash observer: a genuine dependency
issuer supplies the complete project manifest/lock, but the standard-unit join
had not freshly hashed those two strings itself.

The repair adds a separate source-derived outer line documentation relation.
Five complete retained compiler originals and ten whole callback bodies cover
slash/slash lexing, the exact third/fourth slash distinction, native cooking to
an Outer/Line DocComment token, parser construction of AttrKind::DocComment,
native predicate delegation, native token replay and the entire collector bypass.
The actual source hash, span and single raw comment token are joined before this
relation excludes the comment from expansion candidates. Ordinary `////`, inner
`//!`, block comments, normal `#[doc]`, changed spans and non-comment attributes
cannot use this relation. Nested unknown attributes and cfg alternatives retain
their existing refusal; there is no new attribute-name whitelist. No native
execution or whole-package owner authority is claimed by the comment report.

Each standard-unit qualification now freshly hashes and compares both complete
private project input strings against their genuine dependency issuer digests.
A bounded source-input observer confirmed both actual strings pass through Hash
update. All five actual nested comments qualified in a bounded source check.
Seven complete authored programs passed native TypeScript 5.9.3 AST-copy checks
and ordered language/repository serialized CST substitutions and full inverses.
Previous complete original/after source archives are retained; distinct repair
afterimages preserve the earlier programs. Five additional complete 60000 ms
controls are drafted separately. The original ten and the previous eight
controls remain unchanged. No full runtime or test file was executed by this
worker; Root must rerun the full receiving batch before passing claims.
