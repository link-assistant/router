# Explicit owned ASCII predicates

The production frontier DATA led to a source review of the complete validators
in `client_lifecycle/backup.rs`, `codex_loopback_bridge.rs`, `deploy/instance.rs`,
`deploy_local/staging.rs`, `deploy_local/state.rs`, and `deploy_relay.rs`.
State/AppState first refusals mostly hide HTTP, storage and lock operations;
declaring those types would leave their bodies unsupported. These validators
instead share a finite ASCII byte predicate. The retained frontier is historical
DATA and does not measure this candidate's executable gain.

The explicit owned API is
`crate::translation_core::ascii_chars_in(value: &Str, alphabet: &Str) -> bool`.
Both arguments evaluate once, left to right. Every input UTF-8 byte must be ASCII
and present in the alphabet. Empty input is true, including an empty alphabet.
Non-ASCII alphabet characters have no effect on the admitted ASCII bytes and
never admit non-ASCII input. The Rust implementation delegates to ordinary
library byte iteration; those internals remain intentionally untranslated.

The JavaScript runtime accepts primitive Unicode scalar strings. It validates
both arguments before membership, including the alphabet when input is empty.
Boxed strings, numbers, BigInts, proxies, coercible objects and lone UTF-16
surrogates throw TypeError without coercion. Its captured native operations match
the existing string-iterator runtime's stock-import boundary. This is a pure
operation; it exposes no iterator, callback or mutable storage.

The existing private scalar-call issuer now selects the ASCII contract only from
the actual complete qualified source call and genuine complete owned facade and
primitive leaf. Source links, operand ownership, fresh checker identity and
syntax associations remain mandatory. Both operands must be existing checked
borrowed `str` values. The public registry entry requires private refinement;
an ordinary host node, copied metadata or unqualified spelling cannot select it.
The two Host registry changes replace existing lines and preserve its 999 lines.

`proposeCoreAsciiCorpus` is proposal-only. It reuses the scalar corpus's complete
source/owner/type-position boundaries, then checks every replaced callback and
its lexical binding independently. Its initial domain is an owned-Str parameter
with `.bytes().all(|byte| predicate)`, where the complete predicate uses finite
ASCII class calls, cooked ASCII byte equality, parentheses and disjunction.
The replacement contains the exact ascending ASCII alphabet. Existing length,
empty checks, control flow, messages and all source outside the call remain.

Unknown macros, callbacks, local items, loops, parameter shadowing, deleted
comments, conjunction/negation predicates and unqualified `matches!` predicates
remain unchanged with explicit refusal records. Native byte methods and generic
iterators gain no permission. In particular, the state/relay backend validators
containing bare `matches!` still need a separate source-backed owner/adoption
route. Complete before/after CST transport, ordered language then repository
rules, serialized reparsing and full source inverses are retained for every file.

The complete production modules, actual crate root and Cargo inputs are retained
in `source-profiles/core-ascii/application.json.gz`. Their full bodies include
the two hexadecimal validators and lowercase/digit/hyphen instance/staging
predicates. Other explicit Str/Outcome/Text/format adoptions and original parent
scope checking remain independent obligations. No fixture success or source
selection count establishes these functions executable in the actual crate.

`prepareCoreAsciiSources` starts from complete frozen Root 18977ef source inputs,
after the existing matches/vector facade and identity-boundary Host composition.
Its seven complete source equations include the facade, primitive leaf, source
data, private scalar helper, string runtime, Host registry and TypeScript asset
declarations. Every JavaScript before/after has an actual TypeScript 5.9.3 AST
copy and full native grammar check. Every JavaScript and Rust program has the
ordered, serialized/reparsed CST stages and complete inverse. Rust source is
produced through these equations; no local Rust tool is invoked.

The new six-case JavaScript file covers complete source equations, all 128 ASCII
bytes, Unicode and invalid ABI values, checked JS/strict-TS targets and semantic
roundtrips, source adoption/refusals and complete actual production inputs. Its
last case composes the complete original two hexadecimal validator bodies through
the existing explicit Str/literal-text/Outcome passes and the new ASCII pass,
then checks the original success and error values. The fixture scope is explicit;
this does not replace the separate real-parent production receiving obligation.
`rust/tests/translation_core_ascii.rs` supplies the same boundary vectors,
independent native hexadecimal classification and argument-order oracle for CI.
Neither test file has run in the worker. Only bounded native TS grammar/AST-copy
and CST source checks have passed so far. Root owns runtime qualification and
the mandatory final Host class-birth, source bank and export refreshes.

The follow-up reverse draft checks the actual native TypeScript import symbol,
complete canonical runtime/declaration closure, full owned Rust facade and leaf,
and current receiving Cargo sources. It accepts only this fixed new runtime
operation. Unknown exports, namespace calls, shadowing and nontransparent
reexports keep their refusals. `ownedCoreRuntimeSources` retains its previous
output; `ownedCoreAsciiRuntimeSources` adds the separate explicit closure. With
separate JS/TS roots, its runtime counterparts and declarations are retained at
both roots and checked against the same canonical bytes.

Inputs are the existing owned reverse profile's declared scalar-text inputs or
actual static literals. Static aliases have an additional private fact in the
current lexical traversal; a null public root alone cannot establish a loan.
Existing string-return and conditional loan rules are unchanged. Owned text
temporaries and unrelated parameter types remain outside this new operation.
Rust projection binds both arguments in order and uses the qualified owned Str
alias in ASCII-using signatures, preserving the independently checked result
lifetime. Meta decoding reconstructs every original source/symbol/loan relation.

The separate six-case reverse file covers independent JS and native TS source
entries, complete source/CST/meta roundtrips, strict TS targets, split roots,
actual named reexports, static/input aliases, invalid ABI and lone-surrogate
refusals, changed complete sources and forged meta. The authored
`translation_core_ascii_reverse_oracle.rs` witness is registered in both owned
corpus producers. Its Rust module comes from the actual reverse pipeline and is
kept outside application coverage counts. Its shared scalar cases and all 128
ASCII hexadecimal results are CI-only.

The reverse source equations retain four complete before/after programs with
actual TS 5.9.3 AST copies, native grammar and ordered CST/inverse checks. Worker
verification is limited to those bounded source checks; receiving runtime,
strict target execution, witness generation and Rust remain unrun. This does
not establish strict parity, whole-project coverage, native invocation
conformance or complete bidirectional synchronization.
