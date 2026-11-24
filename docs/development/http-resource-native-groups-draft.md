# Original native expression grouping draft

All implementation and regression source is drafted and unrun. No tests,
experiments, compiler diagnostics, translation, preparation, regeneration, Rust
tools, push or CI ran. Every unfinished [ledger requirement](bulk-draft-requirements.md)
remains open. No measured coverage or parity claim follows from this source.

The original binding reader now retains exact group, unary and binary source
spans. Only parentheses parsed as value groups are selected; call delimiters,
type syntax, patterns and literal contents remain separate. Comparison chains
without actual required original groups refuse before normalization.

The native source normalizer retains one actual group around each unary or
binary operator and removes only extra or nonoperator value groups. Ungrouped
operators receive the emitter's canonical group around their complete original
expression span. Inner required groups remain, preserving the actual parse tree
and short-circuit precedence. All edits go through serialized/reparsed CST and
the complete original source inverse. Fresh whole JS/meta/native reproduction
remains mandatory.

Adjacent control insertions and actual lexical replacements join at their one
shared original start coordinate before the existing disjoint edit check. This
allows outer operator groups, removed value groups and alpha-renamed references
to coexist without discarding source or weakening overlap refusal. Public group
records and control metadata grant no source, semantic or namespace authority.

Three complete source equations retain native class/function owners, both
ordered phases and complete inverses. Independent unrun cases cover Boolean
truth tables, meaningful precedence differences, negation, explicit comparison
groups, raw generic forwarding, changed Some payloads, alpha-renamed scopes,
unchanged canonical/literal source, comments, malformed groups and changed input.
This drafts the raw native grouping prerequisite retained by the preceding
constructor batch. It does not establish that those cases pass.

Architecture and producer closure, wider language/effects and Result domains,
production adoption/parity, complete receiving, original source/timing/profile
and reverse freshness repairs and every CI gate remain unfinished.
