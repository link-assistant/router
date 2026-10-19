---
kind: added
---

Add an owned unicode_scalar_count(&Str) -> usize compatibility operation. Rust
uses its ordinary chars().count() library implementation, intentionally left
untranslated; checked JS validates scalar text and returns the existing usize
BigInt ABI. A Unicode scalar differs from a UTF-8 byte, UTF-16 unit or grapheme.
Reuse the existing private raw/relocated source association and checked borrowed
text, ownership and once-only operand rules. No general char iterator is admitted.

Add a generic complete-source CST adoption pass for exact count chains on owned
borrowed-text parameters and selected owned Maybe borrowed-text callbacks. Keep
unknown binders, custom receivers, producers and macro inputs unchanged. Reuse
the reviewed source-backed import-role helper; external candidates require the
actual Cargo manifest and lock, and visible traits/impls stay refused; retain
full sources, serialized/reparsed CST, substitutions, inverses and skip evidence.
The actual application producer remains separate and no app source is hand-edited.

The whole eight-case receiving file preserves 60-second cases and 20-second
strict target children. Add the matching runtime TypeScript declaration. It retains the complete safety_identifier module and
checks five actual validators/callers, Unicode limits, error cases and source
ownership refusals. Native oracle source imports the published compatibility
core and includes the actual private application module. All JS/strict TS/CLI
and native Rust checks are locally UNRUN. Application gains are unclaimed.
The changed Host input row requires the coordinator's actual class-entry tool.
