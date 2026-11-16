# Explicit owned primitive vector entry input source draft

Status: SOURCE DRAFT ONLY. All receiving, emitted JS/strict TS, interpreters,
CST/meta, native inverse/oracles, freshness and performance remain UNRUN. No CI
feedback was inspected. Full translation and synchronization remain OPEN.

An owned vector input requires a leading immutable local result of the actual
paired truncate(input, u64::MAX). This existing operation first validates the
complete primitive vector and its 4,096-value resource bound, then returns it
unchanged because the sentinel cannot shorten any admitted vector. This reuses
the original eight-operation core without adding APIs, pins or native history.
The source prefix is retained in emitted Rust; no native bound is silently lost.

Both owned JS/TS caller families check actual lexical parameter identity,
leading const declarations, exact sentinel, resolved imported operation and its
fresh complete paired ABI/source. Every guard must precede ordinary statements.
Guard locals cannot shadow parameters. The complete original caller then checks
the ordinary by-value call and marks the original input moved. Public metadata,
a source span or a parameter/type hint grants no permission.

Native complete lexical flow admits a public owned primitive Vec only with the
same actual private core call at entry, exact copied u64 sentinel and unshadowed
original parameter. Normal move/rebind/loan checks continue through the whole
function. Unguarded or late inputs, wrong sentinel/width, mutable guard locals,
reused moved parameters and oversized inputs stay refused. JavaScript requires
its frozen dense primitive carrier; Rust's explicit core prefix enforces the
same bound on its typed Vec input. Shared Vec inputs and owned Vec helper
parameters remain separate unfinished contracts.

Independent eleven-domain receiving sources cover identity/count/get/append,
multiple inputs, empty/max/oversized carriers, wrong values and moved originals,
with JS/strict TS, both interpreters, CST/meta and canonical Rust inverse cases.
Separate native receiving and Rust oracle sources are CI obligations after all
eight same-SHA JavaScript gates. Five complete source equations retain original
APIs, both ordered substitution phases, full original CST and exact inverses.
