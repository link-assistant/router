The shared JSON token-tree syntax adapter now distinguishes prefix unary `!`
and infix `||` from macro bangs and closure syntax using original operand
positions. Parenthesized operands recurse through the same bounded scanner;
unknown macros, closures, mutation and effectful syntax remain refused. This
syntax selection grants no owner, type, purity or Serialize authority: the
original semantic parser/checker and existing operand rules still decide those.

The lexical-update Unicode fixture keeps its exact original source, adoption
maps and expected behavior, and now checks executable membership before target
calls. A focused whole eight-case suite covers boolean truth tables,
short-circuit panic behavior, source-field evaluation order, original spans and
malformed/type/owner/effect refusals with existing 60-second/20-second limits.
The original native Rust oracle is unchanged. Source-only checkpoint; no local
engines or Rust were run. Receiving remains Root's work.
