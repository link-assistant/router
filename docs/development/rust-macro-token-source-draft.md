# Native attached macro token source draft

All implementation and independent cases are SOURCE only and UNRUN. No local
tests, compilation, compiler/preparer/translator execution or CI feedback review
occurred. Full translation and qualification remain unfinished.

The retained Formal AI Rust lexer actually attaches a macro bang to its ident
token. A source-only copy of the existing Try/dot punctuation-view helper adds
exact identifier/bang splitting for source candidates. It preserves every
original UTF16 coordinate and byte of source, validates changed original slices
when a source string is supplied, retains unchanged token objects and reuses the
original array if no split is needed. It changes no shared/native lexer or CST.
The existing200000 original-token/two-million-source bounds remain; consumers
still apply their own normalized token and whole-source limits.

The generic qualified macro reader, core formatting role/header readers, six
source selectors and additive core macro transport use this view. Native attached
and already-separated forms therefore share the same bounded source grammar.
Unknown macro paths and all semantic/owner/argument checks retain their refusal.
Public token rows, normalization and retained lexer source are DATA only.

Eleven complete source equations retain immutable originals and native-selected
owners, language followed by repository substitutions, complete serialized/
reparsed CST and source inverses. The complete original native lexer is retained
as source DATA; upstream notices/licenses remain in the original vendor closure.
Independent unrun source covers actual lexer shape, coordinates/Unicode/trivia,
unchanged-view identity, mutation refusals, generic/core roles, both macro lanes
and callback Display composition. All earlier independent caller/native cases
remain mandatory, with no cross-operation source/hash/owner/verdict/result cache.
Global namespace, production/native parity, complete reverse/sync, freshness,
receiving qualification and delivery requirements remain OPEN.
