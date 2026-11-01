# Raw string AST custody correction — source only

The real Rust source parser constructs string expressions as `k: 'str'` in
`vendor/meta-language/translation/rust.js`. The existing formatting source
parser checks that same raw kind. Checked semantic literals have a different
representation. The new forwarded-literal wrapper incorrectly required `lit`
when reading the actual original fragment AST, so its literal-positive path
would refuse before custody could be returned. Empty-input custody is separate.

The wrapper now requires the actual raw `str` node and string value under its
unchanged original parser/method/input/interval/function checks. It retains the
same genuine fragment API and a DATA clone of its AST, source closing, expiry,
shared caught-failure poisoning and unsupported owner/Arguments/transport states.
No checked semantic literal, public kind flag or copied AST can grant custody.

The standard `source-profiles/forwarded-format-arguments-str-20261101/` archive
retains complete original/current wrapper and case files. Its additive producer
transports both complete source equations through CST, verifies every physical
successor and closes all successfully captured inputs under bounded ordinary
size-plus-one/no-follow/nonblocking reads. Descriptor closure uses the existing
complete closing fence too, preserving a primary read failure if close also fails. The earlier engine-copy profile and
its original/current snapshots remain unchanged. No historical engine output is
rewritten to claim this wrapper correction was already present.

The original whole case file is preserved. The literal-positive case explicitly
pins the actual raw AST kind, and a new source-history case retains both full
inverses and the earlier engine history. All implementation, parser/translator/
preparer/interpreter/runtime/receiving and native cases remain **UNRUN**. Source
inspection, not an executed failure or CI feedback, identified the bug. No new
Rust oracle is needed for a raw source-kind correction; the existing immediate
nested-format oracle and all original receiving obligations remain required.
No source/type/runtime authority, broader language admission, performance,
coverage or checklist closure follows from this correction.
