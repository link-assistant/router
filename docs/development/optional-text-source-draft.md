# Optional owning text source draft

All implementation and independent case SOURCE is UNRUN. No local test, parser,
translator, generator or compiler ran; CI feedback is uninspected. Full source
translation, parity, synchronization and delivery remain unfinished.

Ten paired interfaces extend the106 finite Option APIs to116: nine consuming
Option<String>/String constructors, extraction, eager combination/default and
nonempty/nonblank filtering operations, plus a borrowed Option<&str> filter.
Native methods use actual standard Option behavior and retain the original1MiB
text-domain checks. Some-empty stays present except under the explicit filter;
returned nonblank text is never trimmed and owned filtering retains allocation.
The JavaScript runtime reuses its guarded exact tagged carrier validator and the
existing Rust-compatible text trim. Invalid tags, coercion, bounds and eager
operand checks keep their original behavior.

Both original method adopters recognize actual written standard owning String
and optional String inputs/locals, exact closed negated is_empty/trim-is_empty
callbacks, existing consuming methods and empty defaults. Source predicates are
metadata only. Wider callbacks, shared owning-Option inspection, qualified helper
result composition and arbitrary text constructors remain separate obligations.
Forward checking requires a genuine standard Option owner, actual owning String
and by-value bool mode; table rows cannot provide those facts.

The complete HTTP resource reverse lane already has owning optional-text, bool,
borrowed optional-str, eager move and loan contracts. It receives these actual
current interfaces without relaxing its ownership restrictions. Older restricted
reverse lanes explicitly refuse the new optional-text operations until their
own complete move/loan rules exist. They remain separate open obligations.

Complete original native template copies preserve all preceding width functions.
Native source-only constructors can replay an explicitly supplied current Rust
source string without a physical Rust checkout; their results remain DATA.
Default physical-source behavior is unchanged. Generic identity source binding
now composes the exact old whole libraries through two-file width/current source
histories and the complete native width/current history, while retaining the
unchanged native/JavaScript/TypeScript identity-body checks and immutable old
archive. Each operation rechecks original files; no cache survives it. This
avoids replaying the entire compiler history merely for the three library joins.

Sixteen complete compiler equations, ten native copies and independent unrun
runtime/Unicode/Some-empty/bounds/noncoercion/two-API/7-caller/bulk JS/strict TS/
resource reverse/native inverse/move refusal/native pointer/original-history/
no-physical-Rust-checkout/export source are drafted. Every wider requirement
and all receiving/freshness/coverage/parity verification remain OPEN. All eight
same-SHA JavaScript gates before fatal CI-only Rust remain unchanged.
