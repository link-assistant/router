# Original namespace condition grammar proposal

This source-only batch supplies the missing `if let`, `while let`, and explicit
Rust2024 `&& let` grammar prerequisite for the genuine private NamespaceParser.
It changes no physical parser, Rust application source, existing test body,
deadline, default input profile or emitted runtime. The worker ran no receiving
engine, native parser, generation or Rust command. Application coverage remains
the last receiving measurement; the historical 54 include-frontier functions
are prospective work rather than gains.

The complete retained Rust1.89 `compiler/rustc_parse/src/parser/expr.rs` is the
source input. Its existing compressed archive and original MIT/Apache notices
are pinned without downloads or replacements. The loader serializes/reparses
the whole Rust CST and retains six complete, hash-pinned callback bodies and
their original token trees. It authenticates inputs afresh after Hash callbacks
and at EOF; copied plans and changed source inputs refuse. Captured native
`JSON.parse` descriptors are checked before parser/CST work, independently of
the existing shared guards.

The source proof uses the complete `parse_expr_if` and `parse_expr_while`
condition calls, `parse_expr_cond`'s `NO_STRUCT_LITERAL | ALLOW_LET` restrictions,
`parse_expr_let`'s pattern/equality/initializer route, and the complete
`CondChecker::visit_expr` cases. That visitor permits `Let` through the condition
and logical-And branches, rejects logical-Or, parentheses and other expression
contexts, and checks edition2024 for nested lets. `parse_expr_bottom` retains
the original let dispatch and error paths. The full programs remain available
for review; the callback census itself grants no caller or semantic authority.

The new public entry is `captureOriginalNamespaceConditionalFunction(options,
editionContext = null)`. It is a native-selected complete copy of the original
capture implementation, sharing the same private parser/node/tree/frame maps
after same-file adoption. The original `captureOriginalNamespaceFunction`
function body stays byte-exact. Existing entrypoints retain their prior grammar
and behavior: their condition method immediately delegates to the exact old
`expression(0,false)` call. No old caller silently acquires let syntax.

Only a parser issued through the new entry can construct `LetCondition` nodes.
Those nodes are legal only at an unparenthesized if/while condition root or an
And chain. Logical-Or, negation, call arguments, match guards, ordinary let
initializers and parenthesized let conditions refuse. Nested if/while syntax
gets its own condition boundary; a surrounding condition does not permit lets
inside arbitrary nested expressions. Source-order left/right edges, complete
function coordinates, original opaque macro inputs and private invocation
position/confinement APIs are retained.

The initializer is deliberately conservative. It uses the original parser's
unary threshold13, accepting existing prefix/postfix syntax and parenthesized
binary expressions while refusing unparenthesized binary/cast/range forms.
The retained compiler source calls `prec_let_scrutinee_needs_par`; its external
definition is not available in this source packet, so the proposal does not
invent a complete Rust precedence theorem. Both binding and type semantics
remain unresolved. A future extension must bring its additional source proof.

An And chain containing any let requires the existing private Cargo edition
context and its fresh original full-manifest hash to prove explicit package
edition2024. A copied token, unknown/inherited edition, edition2021 or public
boolean cannot enable it. Plain if-let/while-let require no edition-specific
extension. The source Cargo context is a declared original-input contract; it
does not prove a native Cargo invocation, rustc flags or syntax-context hygiene.

`prepare-original-namespace-conditions.mjs` archives the entire exact physical
parser beforeimage plus the complete authored loader/recipe. Native TypeScript
5.9.3 selects the original class, prefix chain, actual cursor and expression
method bindings, constructor binding, private frame issuer and complete capture
function. The language phase adds the condition grammar and copied factory;
the repository phase binds the existing Cargo context and pinned source plan.
Both full CST phases serialize/reparse, apply actual ordered substitutions and
independently invert to their complete source inputs. Native AST copies and
lexical binding checks cover complete before/after files. Every original input
and archive is re-read at EOF. No cap or old guard is relaxed.

The CLI `--write` installs only a separate receiving copy. The plan separately
contains the full same-physical-file proposal for
`tools/translation/original-namespace-parser.mjs`, marked uninstalled and
requiring receiving qualification. Actual adoption must use that physical
module and issuer. A receiving-copy token is intentionally foreign to the
original physical issuer; a parallel facade cannot feed original consumers.

Eight complete receiving cases keep60-second limits. They cover full native
and CST/inverse equations; if-let/while-let; genuine edition chains and ordered
ASTs; forbidden syntax and unchanged old callers; the complete unchanged actual
`model_routing_resources.rs`; hostile/changed inputs; original confinement APIs;
and independent JS/strictTS observations plus an unexecuted Rust2024 oracle.
The actual `collect_anthropic_file_references` function is a meaningful grammar
target. Its opaque `matches!` stays opaque. The sibling function also contains
unrelated unsupported expression turbofish syntax and remains refused.

This batch does not discharge the actual model/gemini parents' include owner.
Their imports, derives and macro producers still require a genuine name-specific
exclusion proof. It does not refactor Rust, move functions into a child module,
introduce `use super::*`, skip includes or grant Type closure to Bang producers.
The existing original include/binder contract and its refused application
parents remain intact pending that separate owner composition.

Root receiving order:

1. Run `prepare-original-namespace-conditions.mjs --emit`, retaining the complete
   plan; run `--write` and `--check` for the receiving copy.
2. Execute the entire `test/original-namespace-conditions.test.mjs` file under
   Node and Bun, preserving all eight bodies and60-second limits.
3. Execute the unchanged entire `test/original-namespace-parser.test.mjs` and
   `test/literal-include-type-contribution.test.mjs` files under both engines.
4. Only after qualification, review the same-file proposal and original/current
   source-history consumers before explicit default adoption. Re-materialize
   affected source equations; never repin an old original to a new afterimage.

No step above was executed by the worker.

The coordinator materialized only the separate receiving copy after complete
native bindings, both CST phases, full independent inverses and a fresh source
check passed in 22.207 seconds. The three complete receiving files then passed
all 24 cases in Node (84.076 seconds, 778,649,600 bytes sampled aggregate peak RSS)
and Bun (74.539 seconds, 951,762,944 bytes). The unchanged original 5-second and
60-second limits all passed. These results include the new 8, original parser 9
and literal include 7 cases. The physical parser remains unchanged, and actual
include-owner/type/behavior obligations and application coverage remain open.

The coordinator subsequently connected the original Rust oracle's complete
`main` body to Cargo discovery in
[`translation_namespace_source_oracles.rs`](../../rust/tests/translation_namespace_source_oracles.rs).
The same integration target also covers every boolean/Option boundary, empty
and reverse-order while-let iteration, and the literal include fixture's own
all-u8 regression. The Rust package explicitly declares edition2024 and
Rust1.89; its existing gated CI `cargo test --locked --all-features --verbose`
discovers this target. These tests remain uncompiled and unexecuted locally.
They may run only after all eight JavaScript stages pass for the same SHA,
and a Rust failure must fail CI.
