# Original attribute expression source draft

This implementation and every new regression case are unverified and unrun.
No tests, experiments, diagnostics, translators, preparers, regeneration, local
Rust tools, push or CI ran. Every unfinished requirement in
[the ledger](bulk-draft-requirements.md) remains open.

The new private source entry parses an equality attribute's value directly as an
expression in its original physical source. It uses the existing complete
namespace parser, cursor, positive AST checker and original native source plan.
No synthetic function or different caller domain is used. A complete genuine
source-view item, explicit member index and exact outer attribute span are
required; supported impl/trait member selection retains the actual enclosing
item and member association.

The same private parser first selects a genuine leading outer attribute. Its
ordinary unqualified single-name equality form determines the original value
span. The expression parse requires complete EOF. Every original comment and
whitespace region remains in the full value and physical-file CST; opaque macro
inputs remain opaque. The complete physical source is serialized/reparsed
through the lossless CST extension, and each read rejoins its source/view/item,
member, attribute/value spans, profile, private parser/AST identity, full CST and
current complete native source plan.

The implementation copies the full existing function-frame capture pattern but
uses a distinct private attribute-expression receipt family. These receipts
cannot act as function or invocation-position receipts. Header and expression
node/TT/byte/positive-traversal work share the original bounds rather than
receiving larger budgets. Private per-request AST snapshots are source receipts,
not a source-keyed cache of owners, verdicts or compiler results.

This entry establishes positive original expression syntax only. It does not
resolve the attribute or its value macro, evaluate documentation, load included
files, select a builtin, close global exports or grant type/namespace/runtime
authority. Even an expression block with a macro definition retains its open
effects. Broader field/variant/parameter attribute domains remain unsupported.

Three complete source equations retain original implementations, native JS
source owners, separate ordered language/repository rules and full CST inverses,
following the architecture builtin source-history leaf. Independent unrun cases
cover actual/unknown/literal macro values, original trivia, impl member identity,
complete physical CST, EOF/malformed input, copied/foreign receipts, source and
profile changes, and the unchanged function-family boundary.
Independent stable native oracle source and a shared Unicode documentation file
cover `include_str!`, `concat!` and nested member documentation without local
Rust execution. Their results remain unrun until the gated CI phase.

The builtin doc parser/registry and native visitor confinement join, actual
macro-valued documentation consumers, wider attribute/source domains, all
architecture owner/global/export/producer/type-prefix closure, broader language
and production coverage, parity/freshness, source/CI repairs and receiving-export
qualification remain unfinished. All original gates and fatal same-SHA Rust CI
requirements stay mandatory.
