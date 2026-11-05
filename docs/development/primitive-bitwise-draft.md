# Eager primitive bitwise source draft

Every new implementation and independent case is UNRUN. The actual Host frontend
now drafts bool and fixed-width integer `&`, `|` and `^` with Rust precedence,
same-domain checked operands, eager left-then-right evaluation and checked meta
proofs. The original cast/shift guards remain; borrowed, owned, generic, custom
trait, float and pointer-width domains gain no permission. Plain portable
frontends do not issue these native Host operations.

Scalar local compound assignments add bitwise and existing checked shifts under
the original immutable/mutable local checks. Source token joining recognizes only
the five exact adjacent written compound punctuators, before issuing the normal
private original-token receipt. Whitespace/comments cannot be joined into an
operator. The positive source parser also retains all compound spellings.
Mutation of fields, indexed places and aggregates remains a separate obligation.

Actual JS/TS emission uses a strict runtime helper with no operand coercion.
Booleans remain booleans, fixed integers retain their signed/unsigned BigInt
domain and both function arguments evaluate before selection. Both runtime asset
declaration paths include matching bool/integer signatures. The bounded constant
evaluator separately checks the same primitive proof and evaluates both operands
in order, using its existing step/value/serialization bounds and no host adapter.

Nine whole compiler/runtime equations retain complete original modules, actual
class/function/import owners, explicit language/repository sequences, CST/meta
and full inverses. Host-contracts stays below the 1000-line file limit by keeping
new checking/runtime logic in the existing small primitive modules. Independent
unrun JS/strict TS and CI-only native sources cover every fixed width, signed
boundaries, bool truth tables, compound operations, const results, effect order,
joint punctuation, coercion and domain refusals.

No parser, compiler, evaluator, runtime, translator, preparer, test, experiment,
generation, Rust tool or CI-triggering push ran. Original runtime equivalence,
whole production caller qualification, matching reverse helper recognition,
source banks/exports/freshness, native namespace closure, synchronization,
parity and all complete gates remain unfinished.
