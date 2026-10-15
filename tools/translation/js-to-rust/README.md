# JavaScript-first executable translation

`packages/javascript/portable/**/*.mjs` is authoritative. Regenerate with
`node scripts/regenerate-js-first.mjs`; verify with the same command and
`--check`. Both Rust and strict TypeScript are emitted after serializing and
reparsing the checked AST as a Links Notation document. The generated IR is
`generated/policy.lino`. No function names or implementations are hard-coded in
the translator. Adding an annotated portable function automatically adds both
target functions; fixtures must independently specify its expected behavior.

The small frontend, lexer, checker, Links serialization and construct-map
snapshot comes from the public formal-ai PR #1188, pinned and hashed in
`provenance.json`. The executable/carry boundary of meta-language PR #201 was
reviewed too. This adapter extends the reused AST for local mutation, while
loops, primitive string concatenation and UTF-16 string lengths. It does not
use carried source as an executable target implementation.

Supported syntax: JSDoc `number`, `boolean`, `string` functions, closed primitive
constant expressions, arithmetic/remainder and strict equality/comparisons,
boolean short circuit operators, conditional expressions, sibling function
calls, const/let locals, assignment to let locals, braced if/else, while and
returns. Supported calls are two-argument Math.min/max, Math.abs/floor/ceil/
sqrt/trunc, Number.isFinite/isNaN and string startsWith/endsWith/includes/trim.
Effectful or dependent defaults, imports, async/await, classes, general collection values, callbacks,
templates, exceptions, for loops, coercive operators and unknown calls are
refused explicitly. Minimal examples live in `parity/fixtures/js-first/unsupported.json`.
Source positions use UTF-16 offsets. Names must round-trip between JavaScript
camelCase and Rust snake_case; shadowing is conservatively refused.

The number encoding is binary64, including NaN and signed zeros. Math.min/max
use generated runtime helpers because Rust's f64 min/max discard NaN.
Arguments must have their annotated primitive types. The shared string domain
is Unicode scalar strings; Rust String cannot represent JavaScript unpaired
surrogate inputs. String lengths explicitly count UTF-16 units. The fixture
IR interpreter has an iteration limit for tests; generated target loops have
the source's termination behavior.

The manifest `parity/js-first-translation.json` records source/target hashes,
the supported subset, independent fixture provenance and refusals for every
top-level item discovered in `packages/javascript/native/**/*.mjs`. That census
updates on regeneration as native source evolves. The manifest explicitly
states that the whole native implementation is not translated. Native I/O,
stateful services and protocol glue remain separate code.

Constants may use camelCase or upper-case names, arithmetic, same-type string
concatenation, boolean operators, comparisons and conditionals over literals.
Their initializer AST survives the Links round trip; Rust constants use the
computed primitive value because owned string operations are not const Rust
expressions. Signed zero, NaN and infinities have explicit encodings. Free names,
calls, collections and coercive mixed-type operands remain refused. Each member
of a multiple-const declaration is counted separately with its own source span;
an unsupported sibling remains visible and strict module translation fails.

Pure identifier-parameter arrows and ordinary functions can infer a primitive
return contract from their complete checked bodies. Unannotated parameters
retain an unknown caller domain; a proven `typeof` condition refines string,
number or boolean operations only along the matching short-circuit or branch
edge. Rust receives `JsValue` with all eight native JavaScript `typeof` tags;
string/number/boolean variants carry data, while null, boxed values and other
objects share the opaque object tag. BigInt, symbols and functions keep their
opaque tags. These projections support only type observation and guarded
primitive operations, never object identity, property reads or coercion hooks.
The existing Unicode scalar string boundary still applies. TypeScript emits
`unknown` parameters and genuine `typeof` narrowing. JavaScript function-object
identity, constructor/prototype behavior and browser exotic values are outside
this native pure-call contract.

Literal-array `includes` is supported solely for closed primitive elements and
the default start index. Its SameValueZero comparison preserves NaN membership
and equal signed zeros without coercing unknown arguments. Arrays remain
refused as returned values, mutable state or other collection operations. Rust
trim uses the explicit ECMAScript whitespace codepoints, including BOM and
excluding NEL; a fixture checks the emitted ranges over every Unicode scalar.
JavaScript, the IR evaluator and strict-compiled TypeScript execute independent
all-type fixtures. Generated Rust is inspected but not locally compiled or
executed; those checks do not establish native Rust runtime parity.

Closed returns may also be a primitive paired with exactly one absence kind:
`string | null`, `number | undefined`, and the analogous primitive forms.
Meta nodes and TypeScript retain null and undefined separately. Rust uses
distinct `JsNullable<T>::Null/Value` and `JsOptional<T>::Undefined/Value` tags,
and distinct marker types for standalone null/undefined returns. A union
containing both null and undefined is refused. Boolean control contexts
(`if`, `while`, `?:`) lower primitive
truthiness explicitly, preserving NaN and both signed zeros as false and
nonempty strings as true. Returned mixed-type `&&`/`||` payloads and unknown
truthiness remain refused.

Unshadowed `Number.isSafeInteger`, `Number.isFinite` and `Number.isNaN` accept
unknown values without coercion. Only their true edge proves a number payload;
TypeScript records that proof with a number assertion because its standard
Number signatures do not narrow unknown inputs. Module imports and declarations
are checked for builtin ownership before partial admission, so a refused import
cannot silently turn a custom `Number` into the standard builtin. Shadowed
undefined identifiers also remain refused. Independent goldens exercise actual
native function spans for string/null filtering, nonempty strings, exact
nonnegative integers and admin TTL clipping.
Inferred sibling signatures must be available before checking a call; forward
references without an explicit result contract remain refused. Nullable inputs,
unknown truthiness and nullable collection arguments also remain limitations.

Guarded string observations also cover default-UTF8 `Buffer.byteLength` and
`[...string].length` codepoint counts. They preserve UTF8 bytes, UTF16 length
and codepoints as separate operations. A shadowed Buffer owner, other encodings
or unknown iterable/string-coercion inputs remain refused.

Stateless regex tests support exactly one character class, optionally anchored
over the complete input, with no flags or only `u`. The meta document contains
numeric ranges, negation, anchor and Unicode/UTF16 mode; it carries no regex
source. Rust matches Unicode scalars or UTF16 units directly, and TypeScript
emits a canonical class literal. Escaped surrogate pairs in Unicode patterns
retain their ECMAScript meaning. Quantifiers, captures, other flags, mutable
regex state and coercive test arguments remain refused. Independent fixtures
exercise actual native ID validation, pinned Rust whitespace and codepoint
counting, including a full Unicode scalar comparison for the whitespace class.

Private module `new Map([...])` and `new Set([...])` declarations can become
read-only tables when their entries are closed primitive expressions and every
reference is a direct `get`, `has` or `size` read. A complete TypeScript syntax
AST audit checks module ownership, including template substitutions and binding
contexts; the native table extension reuses the existing TypeScript dependency.
Portable kernels without table candidates remain dependency-free. Missing
ownership syntax support retains a refusal.

Exported tables, aliases, mutation, getter/prototype/iterator manipulation,
constructor shadowing, direct eval and other collection operations remain
refused. The proof conservatively rejects ambiguous scopes and references.
Maps require homogeneous primitive values; keys and Set elements may mix
strings, numbers and booleans. Raw duplicate entries and source order remain
in meta. Primitive reads use SameValueZero, including NaN and equal signed
zeros; Map lookup keeps the last value while size counts unique keys. Objects,
boxed primitives, symbols and BigInt keys never invoke coercion hooks and do
not match closed primitive entries. No table identity or mutable reference
escapes the checked fragment. TypeScript preserves real Map/Set construction
with read-only types; Rust emits immutable data and typed primitive readers.

Identity returns, strict comparisons of unknown payloads with primitive
literals, identifier-key record literals, bounded fresh arrays and final rest
parameters form a separate lossless payload capability. Meta retains each
field, entry, rest parameter and exact structural return contract. TypeScript
keeps unknown inputs and exact output records; the IR evaluator preserves
input references and allocates each source record/array afresh.

The Rust draft uses `JsPayload<'a>`: strings borrow UTF-16 units, including lone
surrogates, and object/function/BigInt/symbol payloads borrow opaque `dyn Any`
references. Null and undefined have distinct tags. These values cannot outlive
their borrowed inputs. Only generated record/array allocations use
`Rc<RefCell<...>>`, so aliases share their fresh container and retain mutation
identity; an original argument container remains its borrowed opaque payload.
Existing `JsValue` scalar observers keep their earlier API. Calls between the
two capabilities, including inferred calls, remain refused before emission.
Property reads, getters, prototype setters, spreads, dynamic record keys,
coercion, arbitrary reference comparisons and source calls to rest functions
remain unsupported. Rust text/signature inspection is distinct from Rust
compilation or runtime verification.

Closed primitive parameter defaults trigger only for omitted or explicit
undefined arguments. They retain the original parameter order; null, NaN,
signed zero and other supplied falsy values bypass the default. Unknown
parameters keep their complete caller domain and payload identity. Rust uses
the payload Undefined sentinel or an Option for a typed primitive parameter.
Effectful, dependent, getter and allocation defaults remain refused.

A bounded private Error factory can acquire a UTF-16 message contract when a
complete source syntax audit proves every reference is a direct call and every
message argument produces a primitive string before the helper starts. This
contract is inferred from actual private call syntax, never from a helper name
or a public unannotated parameter. Constructor ownership checks reject shadowed
or modified Error/Object intrinsics, escaping aliases, dynamic evaluation and
prototype or reflection capabilities. Argument effects are not translated by
this proof; a caller needs its own complete supported body.

The admitted factory shape constructs a fresh Error and assigns checked literal
own fields. Special setter keys, getters, spreads and property observations
remain refused. Meta retains the message and exact field contracts. The IR and
strict TypeScript produce actual Error objects with the original message
property descriptor, Error prototype, field order and retained payload aliases.
The Rust draft instead exposes an explicit `JsErrorProjection`: an owned UTF-16
message and the retained typed own fields in a fresh `Rc<RefCell<...>>`. That
projection preserves generated aliases and borrowed payload lifetimes; it does
not model Error stack, prototype, reflection or throw behavior. Such observers
and incompatible scalar/payload calls are refused before emission. Rust text
inspection establishes the projection API, not Rust execution parity.

Zero-input functions may construct `Response.json` from bounded closed literal
JSON trees and closed valid status options. A complete syntax audit checks
Response, JSON and Object intrinsic ownership; shadowing, mutation, aliases,
dynamic evaluation and prototype/reflection access retain refusals. The JSON
nodes store UTF-16 units for both keys and strings, so lone surrogates survive
meta and become escaped JSON bytes. Meta retains duplicate fields and source
order; targets preserve final duplicate values and ECMAScript integer-key
ordering. Nonliteral values, getters, spreads, serialization hooks, magic
prototype keys, unknown options and throwing/bodyless statuses remain refused.

JavaScript, the independent IR evaluator and strict TypeScript produce actual
Response objects. Fixtures check their class, host descriptors, fresh body and
headers, cloning and single-use consumption against the original sources. The
Rust draft exposes only a fresh `JsonResponseProjection` with status, owned
`body_utf8` bytes and `default_content_type: HostDefault`. Its separately
qualified `content_type_for(JsonResponseHost::Node20)` returns
`application/json`; the observed Bun 1.4.3 qualification returns
`application/json;charset=utf-8`. Source function arity stays unchanged, and
emission never consults the ambient host to choose a header. The host difference
is retained in independent Node/Bun goldens rather than erased. This API has
`runtimeParity: false`: headers, streams, body consumption, cloning, property
observers and projection/payload crossings are not implemented in Rust and
remain refused in source lowering. Rust text inspection is not runtime proof.

Scoped pure helper discovery uses the complete original TypeScript syntax AST
and lexical binding symbols. `analyzeJavaScript(source, {sourcePath})` retains
its existing top-level `program`, `items` and `diagnostics`, and adds a separate
`scopedFunctions` inventory and executable `program`. In the current 52 native
modules, the top-level denominator stays 788 declarations (73 translated).
The scoped denominator is 705 additional arrow functions, function expressions
and function declarations (52 full-domain translations and nine conditional private drafts
in 27 modules): it excludes top-level function declarations and top-level
variable initializer arrows/function expressions already represented by the
top-level inventory. It includes other callbacks, local functions and immediate
functions. Method and accessor bodies themselves are excluded; their nested
functions are included. Every admitted or refused scoped body records its original UTF-16
span, complete enclosing source scopes, source path/hash, original owner and
capture diagnostics. Synthetic names derive from the source path/hash and span.
An admitted isolated body does not admit its containing function or module.

Each scoped program is serialized and checked independently. Parameters retain
`unknown` in strict TypeScript; the Rust boundary uses `JsPayload<'a>`, with
borrowed UTF-16 string units and opaque object/function/BigInt/Symbol references.
Proven `typeof` and noncoercive Number guards narrow only the matching branch.
UTF-16 trim returns a borrowed slice, preserving lone surrogates; unmatched
branches retain the original payload identity. Optional string returns own their
UTF-16 units and distinguish undefined from null. Primitive truthiness is
observed only after proof; unknown and BigInt truthiness remain refused.
Boolean-left mixed short circuits retain their actual Boolean/string/payload
result. Primitive length, codepoint iteration, UTF-8 byte length and bounded
string predicates observe UTF-16 without property reads on opaque values.
Caller-owned payloads must outlive borrowed returns. Generated record/array
allocations remain fresh and only those generated containers share Rc/RefCell
aliases. Rust signatures and text are inspected without Rust compilation.

Nine further scoped bodies have explicitly conditional private producer
contracts inferred from their genuine original AST call sites and lexical
symbols. Their typed input domains are draft assumptions under genuine unchanged
standard producer and callback intrinsics. Lookup stability across producer
effects is unproved; this does not preserve the full original callback signature
for arbitrary executions of the refused parents. An inline
callback on a fresh standard string split receives UTF-16 strings only when
its receiver has a dominating string guard, a source string literal, or a
genuine unshadowed String result. Separators must be fixed primitives or owned
noncapturing RegExp literals: capturing separators may produce undefined slots
and are refused. Aliased arrays, custom Symbol.split, unproved receivers and
separator values remain refused. Each pipeline step needs an independently
checked original callback under the same capability; an additional serialized type witness may prove an
identity map's string result while retaining that callback's existing full-domain
public draft signature. Genuine Object.entries producers supply fresh two-slot
entries with a UTF-16 key and arbitrary lossless value. Omitted destructuring
slots and the original one-argument arity are preserved. The Rust projection
uses JsEntry with a borrowed UTF-16 key and JsPayload value; strict TypeScript
uses a string/unknown tuple. Values retain identity, including symbols, large
BigInts, functions, boxed values and opaque references. These contracts are
sealed to the original callback body, not accepted from caller metadata.

Producer calls, coercion, getters and containing methods/functions are still
refused parents. Independent original-JavaScript fixtures demonstrate opaque
String coercion and Object.entries getter hooks replacing split/map intrinsics
before the callback runs, producing out-of-contract inputs and TypeErrors. Proving their result shape does not translate or remove their
effects. Intrinsic shadows, namespace assignments (including synthetic checker
symbols), prototype/constructor/Reflect access, callback escape, alias mutation,
dynamic scopes and effects in callback bodies remain explicit refusals. All
previous 73 top-level and 34 scoped programs retain their original contracts.
The added callback drafts expose conditional private inputs explicitly;
unqualified and public callers remain refused. Meta serializes a
`conditional-inputs` capability, both targets label the conditional draft, and
scoped census fields retain `fullDomainTranslatedItems: 52` separately from
`conditionalPrivateBodyDraftItems: 9`. The combined 61 definitions are not a
61-body full-domain or runtime parity claim.

Ordinary JavaScript function completion now lowers to an explicit undefined
return in the existing checked IR. This includes empty blocks, pure local
bindings and bare return statements, with original-source ASI gaps preserving
comments and all four ECMAScript line terminators. Empty statements and a
trailing function declaration semicolon are accepted. Declared nonundefined
return contracts still refuse fallthrough; unsupported expression statements,
effects and unreachable unsupported statements are not discarded. Meta bodies
without an explicit return remain invalid. Null, undefined and Rust unit remain
separate; these changes use the existing JsUndefined target without Rust
compilation. All 18 original synchronous empty callbacks have independent
source/IR/strict TypeScript goldens; both original asynchronous empty callbacks
remain refused with their source owners and spans retained. Their containing
functions and modules remain refused. Identifier continuation excludes the
lexer's existing ECMAScript whitespace set without broadening identifier names.

The explicit `{lossless:true}` option selects the same checked boundary for
other pure functions. The default top-level API is unchanged; scalar-string
input bridges, scalar-string membership, static-table crossings, captures,
this/arguments/new.target, async/generators, accessors, effects, dynamic scope,
unknown properties/coercion, intrinsic mutation and escaping intrinsic owners
remain refused. `includeScoped:false` disables supplemental discovery.

Run `node --test tools/translation/js-to-rust/test/*.test.mjs`. The tests execute
58 authored fixtures against authoritative JavaScript, an independent IR
evaluator and strict-compiled TypeScript; they also check ordinary source
mutations, serialization, refusal propagation and source/target drift.
Generated Rust embeds the same fixture assertions for the later gated Rust CI
stage. Local Rust compilation is not required or run. Generated Rust items
carry `#[rustfmt::skip]` so regeneration remains a Node-only operation while
the crate's formatting check stays deterministic. No npm runtime dependencies
or large upstream checkout are needed.

Public module `translator.mjs` exports:

- `analyzeJavaScript(source, options)` returns `{fragment, program, items, diagnostics, scopedFunctions}`
  with partial item coverage and explicit refusals.
- `translateJavaScript(source)` returns the same fields plus `{meta, rust,
  typescript}` and rejects any refused source item.
- `parseMeta(text)` checks the serialized Links document.
- `emitRust(program)` and `emitTypeScript(program)` emit checked IR.
- `TranslationError` has a `diagnostic` containing `kind`, `message`, `span`
  and a compact source `example`.

## Complete native TypeScript draft

The separate `native-typescript.mjs` adapter translates every native JavaScript
module, the portable policy, and the package index/testing wrappers. It uses
the official TypeScript compiler syntax AST, serializes each node's kind and
children plus lexical leaf tokens, reparses that serialized document, and
emits TypeScript. The meta files contain no opaque file or function-body
source field. The compiler version, source/meta/target hashes, node counts,
explicit `any` counts and output asset hashes are recorded in
`generated/native-typescript/manifest.json`.

JavaScript and TypeScript share the runtime language, so this target uses
identity lowering. JSDoc primitive parameter contracts become types; unannotated dynamic parameters and discovered class fields retain explicit
`any` draft annotations. The official compiler infers closed primitive/container
return types and reliable const-local types. Nullable, undefined, evolving and
object locals remain explicit gaps where a source invariant is unavailable.
Closed containers include builtin Map/ReadonlyMap and Set/ReadonlySet with
recursively supported key/value or element types. Empty dynamic containers and
containers holding unsupported object types retain explicit `any` gaps. A
source-defined class with the same name cannot acquire a builtin type hint.
Public parameter contracts narrow only when JSDoc explicitly states a type;
default expressions do not narrow the caller domain. Inferred counts and the
remaining explicit `any` counts are recorded separately. Class fields added for typing use `declare` and emit no
runtime property. Strict compilation checks every generated module without
`ts-nocheck`, `ts-ignore` or `ts-expect-error`. Passing strict compilation does
not mean those dynamic types have been inferred or proved.

Each module must also pass an independent structural runtime AST comparison
after type erasure. Only relative `.mjs` module extensions intentionally become
`.js`; neutral parentheses are normalized while optional-chain boundaries are
retained. Evaluation order, receiver binding, async/await and literal data are
checked. Independent executable fixtures cover grouped optional chains,
getters evaluated once, method calls, defaults, short circuiting, regex,
BigInt and raw template data.

Regenerate and check with:

```sh
node scripts/regenerate-native-typescript.mjs
node scripts/regenerate-native-typescript.mjs --check
node scripts/check-native-typescript.mjs
node --test tools/translation/js-to-rust/test/native-typescript.test.mjs
node scripts/check-native-typescript.mjs --out-dir packages/typescript/dist
```

The existing JavaScript package's TypeScript/Ajv dependencies are reused during
repository checks. The generated package records its own dependencies and
contains exact catalog/schema asset copies. Local dependency symlinks and
`dist` output are ignored. `--check` detects stale, missing and unexpected
generated TypeScript, meta and asset files. Cross-worktree development can
pass `--source-root <assembled-repository>` to both scripts and set
`ROUTER_NATIVE_TS_SOURCE_ROOT` for the test.

The runtime test runs the same independently authored native expectations
against original JavaScript in Node, compiled TypeScript in Node, and compiled
TypeScript in Bun when installed. It exercises auth and budgets, provider
storage, HTTP/SSE/Responses, OAuth and managed resources. Compiled JavaScript
is the execution artifact, including managed-server subprocesses; direct
TypeScript source execution is not covered. Shared fixtures temporarily alias
compiled `.js` files to `.mjs` paths and never load original runtime modules
or a Rust fallback. Native feature/endpoint coverage limitations remain those
of the JavaScript draft. This complete TypeScript target does not expand the
bounded Rust translator's supported native I/O or service constructs.

Anchored stateless regular sequences are drafted as explicit character ranges and bounded repetition states. `+`, `*`, `?`, `{m}`, `{m,n}` and `{m,}` retain their Boolean matching meaning without a backtracking engine. The network has at most 64 atoms and 4,096 states; finite bounds and unbounded-repeat minimums are at most 512. UTF16 units are observed without `u`; Unicode codepoints (including lone surrogates) are observed with `u`. ECMAScript `\s`, `\d` and `\w` classes have explicit ranges. Stateful flags, groups, alternatives, lookarounds, backreferences, mixed literal/escaped surrogate spellings and non-string coercion remain refused. Previous one-class IR and targets retain their existing representation. Source-owned scoped predicates do not admit their enclosing parent; Rust projections remain uncompiled drafts.

Closed primitive collection captures use a privately reissued original lexical environment. A fresh original AST/checker binds each captured identifier to its exact preceding private `const` array or unshadowed `new Set` literal. The whole original module must retain the collection without aliases, writes, exports or identity escapes; only checked read/iteration shapes are permitted. Computed initializers, destructuring, mutable bindings, coercion, effectful defaults, unknown globals and unsafe intrinsic access remain refused. A serialized source proof is reparsed and reissued before its body can be checked or emitted; caller capture maps and public type assertions supply no authority.

The body lowers to explicit primitive membership over the source literals, retaining one argument evaluation, literal order, duplicates and SameValueZero equality for finite numbers (including both signed zeros), booleans and strings. NaN and unsupported literal initializers remain refused. TypeScript uses direct strict comparisons and Rust uses lossless `JsPayload` primitive comparisons. The zero-argument factory has no public captured-data parameter; Rust's empty environment has no borrowed environment lifetime. Its call arguments retain their existing lossless payload/UTF16 lifetime, including private Object.entries key tuples when that genuine original producer contract is reissued.

All captured-container bodies are **conditional private body drafts**. Original `has`/`includes` method lookup stability is unproved when parent/imported effects can change host intrinsics. `conditionalCaptures` is separate from conditional producer inputs, and either qualification contributes only to conditional coverage. Original parent creation/effects and unqualified callers remain refused. Getter and string-coercion counterexamples are retained alongside independent original-JavaScript, IR and strict-TypeScript goldens. These capabilities do not increase full-domain coverage or establish Rust runtime parity.

Source-bound lexical creation and calls reconstruct the complete enclosing
function from its original UTF16 source, declaration span and private lexical
bindings. Only exact const-local arrows with immutable enclosing parameter
captures and direct calls at their original positions are admitted. Caller
capture maps and copied compiler graphs supply no authority. Calls before
initialization, aliases, mutation, hoisting, defaults, unknown callees, receiver
effects and escaping function references remain refused. Creation reads retained
captures once; direct arguments are evaluated once in source order. The IR
interpreter creates a fresh callable, TypeScript creates its callable through the
checked factory, and Rust exposes the corresponding environment and call method.
Function-object identity, reflection and arbitrary function payload conversion
are outside the Rust projection.

Dense iteration and the interpreter's callable argument-list plumbing avoid
Array iterator lookups that the source does not perform. The interpreter captures
its trusted host Reflect.apply primitive when its module loads; this is internal
invocation infrastructure, not a proved capability of the original source or an
extra source Function.prototype.apply lookup.

Dense owned literal `some` is an explicitly ordered, short-circuit IR operation.
Its one-parameter callback cannot observe the omitted index and array arguments,
and arbitrary unknown values keep their payload identity. `conditionalCalls`
requires the original standard Array.prototype.some lookup and checked primitive
intrinsics to remain unchanged; parent or imported effects do not prove that
capability. Coverage counts each body once when any input, capture or call
qualification is present. The targets consume reparsed, privately reissued
complete source/body proofs. Rust remains uncompiled.

The original resources `terminates` helper is still refused: an unknown input
can supply an effectful custom `includes` method, its JSON.stringify caller can
produce undefined or throw, and its dynamic decoder caller does not establish a
privately proved string-only source contract. The lexical-call prerequisite does
not admit that helper's I/O parents or narrow its public input domain.

Imported Error construction has a separate `conditionalConstructors` lane.
Complete original source records privately bind each actual named import,
constructor declaration, closed argument/default and ordered field assignment.
The complete enclosing function is reparsed and checked again before either
target is emitted. Constructor meta additionally requires the genuine original
producer graph at `parseMeta(text, {constructorGraph})`; a self-consistent foreign
source envelope cannot replace that graph. Arbitrary coercions, effectful
arguments/defaults, copied issuer handles and known source mutation/reflection
are refused. Public input parameters retain their unknown payload domain.

Private weak associations let freshly issued proofs and genuine parsed/checked
parents retain their original graph syntax and checker. Every recheck still
validates complete source strings, original callsite/import/class/effects,
source hashes and exact expected proof/body/signature. Persisted copies and
foreign objects reconstruct their graphs; mutable parent IR never supplies
cache authority. No parser/checker graph is exposed to metadata or callers.

Qualified normal and throw completions stay distinct. TypeScript requires an
explicit output module path and imports the actual corresponding native class;
it never emits a lookalike Error class. The original native TypeScript producer
uses erasable `declare` fields. Rust emits `Result<T, SourceErrorProjection>`:
the projection retains a UTF-16 message, ordered primitive own fields and a fresh
shared allocation identity, without representing JavaScript Error class identity,
stack or prototypes. These properties are not available as scalar observations.

`evaluateWithOriginalConstructors` is an explicitly opted-in receiving-environment
operation. Its opaque runtime binds every exact freshly reissued constructor proof,
including the complete source graph and callsite; matching path/export names do
not permit a foreign graph or recipe. Multiple proved callsites remain distinct.
The receiving runtime additionally registers each exact freshly checked enclosing
function. An explicit fourth runtime argument to `evaluate` validates that parent
before either a normal return or a throw; missing, changed and foreign parents
cannot reuse the runtime. Existing three-argument evaluation retains its ordinary
callback behavior and does not perform these receiving-environment checks.
It checks the complete source-byte graph and executes only constructor
owners and their original relative import closure, including its actual ESM cycle
order. Ordinary analysis and evaluation never import that graph. Copied module
maps, external/dynamic bootstrap imports, linked paths and observed changed bytes
at a cached module filename are refused. This API does not promise dynamic module
reload convergence or harmless original module initialization.

Constructor, builtin Error, inherited-prototype and collection-intrinsic lookup
stability remain explicit conditions. Host callsite diagnostic values (stack and
Bun line/column/sourceURL provenance) are not preserved; the explicit
`hostDiagnosticLocationsPreserved: false` qualification retains that boundary.
Behavioral vectors retain their complete raw values while comparing exact own-key
order, descriptor flags/types, class/prototype, message and assigned own fields.
Absence of known writes does not prove
outside-module prototype closure. Conditional constructor drafts have separate
counts; they admit neither their unqualified callers nor whole native parity.

Only the new constructor-proof IR words use a licensed copy of the percent
encoder with an optional native byte loop. Ordinary IR keeps the unchanged
upstream encoder. The constructor adapter always calls the actual `Buffer.from`
once; it does not assume that anonymous or bound native-looking functions are
pure. Only afterward does it qualify the actual byte view/iterator, named native
operations, live global String, and every internal flag/source/lastIndex of its
own private regular expression. Otherwise the copied original loop consumes the
same bytes with the original callback, error and IteratorClose order. Its private
regular-expression object has a different identity from the upstream instance.
The initial host global and descriptor/apply/function-source bootstrap use the same trusted host
infrastructure boundary as the other private source helpers; feature-global
qualification is lazy and adds no initialization to ordinary encoding. This
optimization never skips a JSON serializer, source hash, body or proof check.

If a replaced Buffer producer returns a noniterable, the copied adapter preserves
one producer call and a TypeError, but native diagnostic expression text and
stack locations can name its saved bytes instead of the upstream call expression
(`nativeDiagnosticExpressionTextPreserved: false`). Complete host diagnostics
are retained separately; they are not rewritten to resemble another expression.

The initial host-global reference belongs to that bootstrap boundary (Bun marks
its own global wrapper as a proxy). Replacing it before module initialization is
outside this claim. This does not admit caller-supplied roots: every derived
feature prototype and public byte value still rejects proxies before probing.
