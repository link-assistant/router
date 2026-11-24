# Portable natural-number translation fragment, version 1

This implements twelve directed JavaScript/Rust/Lean/Rocq translations for one
explicit, nontrivial computational fragment. It does **not** complete full
four-language support, translate arbitrary proofs, or close R106–R109. The
full-language requirements remain unchanged.

## Source and target grammar

All four frontends accept named pure functions, positional parameters, natural
literals, variables, addition, multiplication, `<`, `<=`, equality, lazy
conditionals, and acyclic calls to named functions. They accept the source
language's comment syntax and retain the entire original source in the result.

- JavaScript: `function name(x, y) { return expression; }`, with `===` and
  ternary conditionals. Values at the native boundary are `Number`, not BigInt.
- Rust: `fn name(x: u64, y: u64) -> u64 { expression }`, with `==` and
  `if condition { expression } else { expression }`.
- Lean: `def name (x : Nat) (y : Nat) : Nat := expression`, with `=` and
  `if condition then expression else expression`.
- Rocq: `Definition name (x : nat) (y : nat) : nat := expression.`, with
  `<?`, `<=?`, `=?`, and `if condition then expression else expression`.
  Emission includes `Require Import Arith.`. No other imported program is
  silently trusted or discarded.

Portable names use lowercase ASCII letters, digits, and underscores, start with
a letter, and exclude the collected keyword vocabulary of the four languages.
Source whitespace is ASCII space/tab/CR/LF; comments may contain Unicode.
Lean/Rocq source calls refer to preceding functions; JavaScript/Rust forward
references are resolved within the program. Target emission orders dependencies
before callers. Duplicate functions/parameters, parameter/function-name
shadowing, unresolved names, arity/type mismatches, and cyclic calls are rejected. JavaScript return/newline automatic-semicolon
insertion is refused, including newlines inside comments. Lean/Rocq nested
function-call arguments must be parenthesized rather than changing their
left-associative application syntax. Rust conditional expressions preceding
infix operators must also be parenthesized.

## Numeric and observational contract

`PORTABLE_NATURAL_CONTRACT` / `portable_natural_contract()` are shared contract
`rml:portable-natural:1`, also committed in the test corpus.

- Abstract values: integers from 0 through 9,007,199,254,740,991.
- Native representation: JavaScript safe-integer `Number`; Rust `u64`; Lean
  `Nat`; Rocq `nat`.
- Every argument and every evaluated arithmetic intermediate must remain in
  that range. This is an explicit caller/program obligation, not a proven range
  analysis. Targets do not silently add runtime range checks absent from the
  input program.
- The observation is the return value of a named pure function on valid
  arguments. Function arity, lexical parameter binding, call structure,
  conditional branch selection, and in-domain arithmetic are preserved.
- The target environment must not already declare conflicting names. Resource
  exhaustion, stack size, execution time, and allocation are excluded from the
  observation. In particular, Rocq's unary `nat` representation can make large
  values computationally impractical despite equal mathematical meaning.

The RML fragment interpreter checks the numeric domain during evaluation and
reports `RML_PORTABLE_DOMAIN` for out-of-domain arguments/results. It uses finite
fuel (100,000 operations) and reports `RML_PORTABLE_EXHAUSTED` rather than
claiming termination from an exhausted run. It evaluates only the selected
conditional branch. Recursion is rejected instead of claiming a termination
proof or generating an admitted fixpoint.

This contract does not preserve unspecified JavaScript coercions or effects,
Rust ownership/borrowing, module initialization, user extensions, theorem
assumptions, proof universes, or tactics: those constructs are outside the
fragment and receive source-preserving unsupported obligations. There is no
conversion of a theorem into a function, erasure of an axiom, or generated
`sorry`/`Admitted`.

## Shared-network path

Implementations:

- `js/src/rml-portable-natural.mjs`
- `rust/src/portable_natural.rs`

The language-specific parser produces a typed/resolved fragment. The program is
then encoded in the registered RML `rml:structure:1` extension using this form:

```lisp
(portable-natural-v1
  (function rml_square
    (parameters x)
    (body (multiply (variable x) (variable x))))
  (function rml_mix
    (parameters x y)
    (body
      (choose
        (less-equal (variable x) (variable y))
        (add (call rml_square (variable x)) (variable y))
        (add (call rml_square (variable y)) (variable x))))))
```

Each operation, binder name, call, and literal is a nested RML Link.
Emission and execution decode this network, validate its schema/types/bindings,
and consult no original source buffer or source tokens. The ordinary upstream
`SubstitutionRule` can change a Link reference; the tests demonstrate that the
changed links network changes both emitted code and interpreter results. The links network can
be serialized with the shared RML snapshot API and imported by the other runtime.

JavaScript APIs:

```js
import {
  parsePortableNatural,
  emitPortableNatural,
  translatePortableNatural,
  evaluatePortableNatural,
} from './js/src/rml-portable-natural.mjs';

const result = translatePortableNatural(source, 'JavaScript', 'Lean');
// result.status is 'translated-fragment' or 'unsupported'.
// Native target validation and equivalence proof are separate stages.
```

Rust exports the corresponding snake-case functions in `rml::portable_natural`.
`translate_portable_natural` returns `PortableTranslationReport`; the low-level
parse/emission/evaluation functions return typed `PortableError` values.
JavaScript's reference interpreter returns a BigInt so its own arithmetic is
exact before domain checks; that internal value is separate from native
JavaScript input/output representation.

Unsupported source always returns its unchanged `preservedSource` /
`preserved_source`, a null/absent target, and a code, description, stage, and
UTF-16 offset. The generic full-language refusal API remains available separately;
its refusal is not a substitute for this fragment's real translators.

## Preservation reasoning and trust boundary

The program checker admits only natural-number expressions and boolean
comparisons used as conditional guards. Translation is compositional: literals
and bound variables map to corresponding native values; addition/multiplication
agree under the numeric bound; comparisons agree on those naturals; conditionals
choose the same branch; acyclic calls reduce to the same argument/result
observations. Source/target reimports must produce the same normalized RML
operation links network for the conformance corpus.

This is an explicit preservation argument and a tested implementation contract,
not a machine-checked universal equivalence theorem. The tokenizer, restricted
parser, type/name checker, emitter, and fragment evaluator are host code in both
runtimes. Their being represented *over* links does not give them intrinsic Link
authority or establish the full Link-driven closure required by R149–R151.
Neither native compiler success nor finite examples resolve that trust boundary.

## Reproducible evidence

`test-corpus/portable-natural/cases.json` supplies four real source programs,
eight observations, nineteen negative programs, canonical target source in every
language, and the common preservation contract. Adjacent `example.js`, `.rs`,
`.lean`, and `.v` files are runnable source versions. The program combines
multiple functions, arithmetic, calls, equality, ordered comparison, and nested
conditionals; it is not a renamed identity string.

- `node --test js/tests/portable-natural.test.mjs`: 33 tests, including all twelve
  paths, source-network-target-network equality, native JavaScript observations,
  unsupported effects/proofs/recursion, numeric bounds, and links-network edits.
- `node scripts/cargo.mjs test --manifest-path rust/Cargo.toml --test portable_natural_tests`:
  4 corpus tests exercising all twelve paths, exact generated-code and contract
  parity with JavaScript, the same negative corpus, bounds, and links-network edits.
- `node scripts/run-with-cache.mjs -- node scripts/check-portable-native.mjs --require=JavaScript,Rust,Lean,Rocq`:
  native validation and eight observed values for each requested target path.
  Use the cache-owned invocation shown below for final verification. `RUSTC`,
  `LEAN`, `ROCQ` (for `rocq compile`), and `COQC` (the compatibility command)
  select already-installed compiler executables.

The final cache-owned command is:

```sh
node scripts/run-with-cache.mjs -- node scripts/check-portable-native.mjs --require=JavaScript,Rust,Lean,Rocq
```

The recorded 2026-10-07 native run used Node 24.19.0, rustc 1.99.0, Lean 4.28.0,
and Rocq 9.1.1 (OCaml 4.14.2). **All twelve directed native target paths passed,
with eight observations each: 96 observations, no skipped or missing oracles.**
Each of the three incoming Rocq paths additionally rejected a deliberately false
observation proof (`rml_guard 3 5 = 16`, while the correct value is 15). The
rejection must be a proof-unification failure, not a missing-library or timeout
failure. Positive Rocq observations use `Nat.eqb_eq` followed by VM computation
and reflexivity so equality of a large unary natural does not force an enormous
intermediate proof term.

The committed [native receipt](data/portable-native-results.json) includes exact
versions, source hashes, checks, negative checks, and empty skip lists. The
[toolchain provenance](data/portable-native-toolchain.json) identifies the
verified official Rocq image manifest. Both runtimes also passed all twelve
structured reimports and interpreter comparisons, with exact generated-source
parity. These finite oracle observations are validation evidence; arbitrary
production grammar, proof translation, universal behavioral/proof equivalence,
and Link-driven semantic closure remain open.
