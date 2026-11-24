# Scoped Rust Try/dot token source draft

All implementation and independent case SOURCE remains UNRUN. Full translation,
coverage, parity, synchronization, freshness and receiving qualification remain
unfinished. No local lexer, parser, translator, preparer, generator, test or
compiler was executed, and no CI feedback was inspected.

Source review of the unchanged shared lexer shows that its punctuation list
includes ?. for both source languages. Rust uses a Try operator followed by a
method dot in that position. A reusable candidate-view adapter now splits only
that exact punctuation token into two exact UTF-16 source spans for the shared
field and text selectors. It verifies the original token kind, span and actual
source bytes. Quoted/raw literal contents and already-separated punctuation
remain untouched; all original token objects and authoritative CST stay intact.

The adapter creates a new array only when a compound token occurs. Work stays
bounded by the existing200,000-token source function limit; an oversized original
view returns to the caller's existing refusal guard, and expanded views retain
that same caller guard. No source/AST/owner/verdict cache survives an operation.
The view is source DATA only, with no grammar, namespace, type, ownership, Try
trait or executable authority. Actual whole-function checks remain mandatory.

Both selectors still reconstruct changes through the original serialized/reparsed
lossless CST and full source inverses. Four complete compiler source equations
retain language then repository phases. Independent unrun source covers actual
lexer punctuation, non-ASCII offsets, raw/literal/separated tokens, stale/wrong
span rejection, both adopter APIs, retained final Try, actual consecutive stages
and emitted JS/strict TS. Existing native behavior oracles remain applicable;
no native ABI changed. All eight same-SHA JavaScript gates before fatal CI-only
Rust remain unchanged and every wider ledger requirement stays open.
