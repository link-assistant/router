# Ordinary native BigInt bitwise source draft

All seven reverse source checkers now draft ordinary JavaScript/TypeScript
`&`, `|` and `^` expressions for identical root-free fixed native integer domains.
These BigInt operations preserve each signed/unsigned domain and match Rust's
corresponding primitive result. Actual operand bindings and native types still
come from freshly authenticated runtime declaration symbols under the genuine
explicit primitive context. A spelling or an annotation shape cannot qualify
an operand. Bounded bare literals may join only when their whole value fits the
other actual native operand, under the existing literal parser limits.

Every admitted operator retains its actual native AST span, source, domain and
operation in a private checker's complete function result. Those DATA records
are freshly reconstructed and compared on every ordinary/private/meta entry.
They do not fake imported host-call bindings or permit saved compiler verdicts.
A function with no imported helper call may proceed only if it has such an
actual checked native operation. Functions without either kind of checked
operation preserve their refusal. Runtime preparation freshly checks the entire
program before selecting the same actual primitive runtime module.

The three existing mutable profiles additionally draft native `&=`, `|=` and
`^=` assignments with the actual mutable target symbol, a root-free exact domain
and left-then-right operand evaluation. Other profiles retain immutable locals.
Boolean/number coercion, mixed widths, mutable inputs/consts and unbounded raw
shift or complement semantics remain refused. Shared carrier emission and the
current canonical Rust inverse retain whole-source checking and reproduction.
Ordinary JavaScript logical and legacy source paths keep their prior rules and
result shape when no native operator is selected.

One bounded per-function recorder retains at most 4096 operators and two million
source code units in a linear append path. No cache crosses operations. Sixteen
whole source equations and unrun all-width/seven-profile, mutable/inverse,
generic-alias/public-module, literal/bool/refusal and metadata-tamper cases are
drafted. Existing CI-only primitive bitwise and scalar-flow Rust oracle sources
cover native operation edges and remain unrun. No coverage, performance, full
translation, freshness, synchronization or parity result is established; all
remaining ledger requirements remain open.
