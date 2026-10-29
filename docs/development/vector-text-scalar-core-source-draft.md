# Reused Unicode and ASCII scalar core source draft

SOURCE ONLY. All implementation, private receipt controls, receiving cases and
source equations are UNRUN. CI feedback is uninspected. Full drafting, actual
coverage, freshness, performance, runtime parity and delivery remain OPEN.

A complete copy of the existing two-operation ASCII/count adapter reuses the
unchanged Rust compatibility functions and full Unicode-validating JavaScript
runtime. Its separate vector/scalar ABI projects count to u64 while the original
API keeps usize. Native conversion is only the actual checked 64-bit count's
lossless usize-to-u64 cast; no dynamic u64-to-usize cast or new Rust library is
introduced. Library arguments bind once in source order.

The original qualified scalar-call parser/checker issues an additional private
receipt tied to the actual checker, parser/call capture, enclosing declaration,
checked node snapshot and complete current facade/leaf. JSON ownership flow may
consume borrowed text only through that genuine receipt, checking every live
root and returning no loan. Metadata copies, names, hash flags and receipts from
another checker/owner cannot grant that permission. Existing JSON flow callbacks
remain optional and retain their prior domain without the new private producer.
No source/hash/owner/verdict/result cache crosses operations.

The paired frontend, meta path, runtime and native ordered comparison reuse both
operations for primitive and JSON families, including Some-borrowed strings.
Private lexical facts admit literal/static text aliases only for these scalar
uses; null roots and public flags cannot establish static loans. Existing general
str return/conditional borrowing rules keep their separate checks. Pure selected
source helpers may call these fixed qualified pure operations; other calls remain
subject to their independent qualification.

Eight complete source equations retain all original modules, including the full
old adapter and private parser/checker, CST inverses and language then repository
phases. Six caller forms draft both authorities, Unicode code points versus UTF16/
graphemes, CR/LF/NUL/combining/ZWJ cases, ASCII vacuous/non-ASCII behavior, static
aliases, live JSON loans, copied-boundary/accessor refusals, full source changes,
invalid unused inputs and repeated synchronization. All are unrun. Other iterators,
operators, general loans/namespaces/traits/ownership/synchronization/receiving/race/
platform/performance and every CI requirement remain OPEN. Eight same-SHA
JavaScript gates still precede fatal CI-only Rust. No local compiler/test ran.
