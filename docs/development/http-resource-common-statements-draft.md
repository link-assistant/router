# Common original statement spellings

Loop rules now pass the actual source body nodes through the existing branch
selector. A checked single expression, conditional, return, nearest-loop exit or
empty body can therefore use the same full fragment/state checker as an original
block. Native emission retains the canonical block and the independent inverse
must freshly reproduce every source token. Unsupported declarations, effects,
labels and ownership changes cannot enter through a different body spelling.

Original empty statements are explicit no-ops. They remain in authoritative
JS/TS/CST source while semantic lowering filters only those actual native nodes,
charges their existing cell budget and retains the original statement-count
bounds. No implicit undefined return is introduced. Empty statements sharing
switch labels retain genuine stacked-label semantics; the complete original
case-body bound is checked before filtering. Module empty statements have their
own bounded source census.

Same-domain `==`/`!=` can use the existing native scalar comparison when the whole
checker establishes matching integers/Booleans or scalar text. Mixed-domain
coercion, nullable comparisons, ordinary objects and unproved values remain
refused. Numeric source constraints track the additional operator spellings;
original Option/Result guards still require their exact strict source patterns.

Six complete prior sources and both ordered rule sequences retain full inverses.
The old valid single-return do-body refusal is retained historically, replaced
by an unqualified-effect control and independently covered positively. JS,
strict TS, full native inverse, Unicode/ordering, loop controls, no-op/stacked
labels, forged-meta and refusal source are drafted and unrun. No compiler,
test, experiment, preparer, translator, generation, Rust tool or CI ran.
General effects, implicit void returns, namespace/bootstrap, production parity
and every unfinished bulk requirement remain open.
