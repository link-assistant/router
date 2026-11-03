# Borrowed JSON runtime packaging adoption draft

Both original Host runtime asset producers now include the whole observed JSON
tool predicate runtime and its strict declaration. The existing JSON runtime
facade reexports that predicate. Flattening the source `extensions/` directory
requires changing the facade's parent-relative import into a peer-relative
import. The actual producers now perform that narrow relocation; unrelated
asset names retain their complete source bytes. This corrects a missing step
in the frozen worker proposal before adopting its packaging changes.

The dedicated asset packager captures the full current runtime/declaration
sources with the existing source reader and all closing checks. Both are
transported, serialized and reparsed through the original language-specific
CST boundary. No runtime implementation is copied by hand into generated
output. The `unknown` declaration grants no JSON validity, ownership or compiler
permission. Old bounded JSON APIs keep their complete original domains.

The original two-parent proposal and its packet remain unchanged. Its provider
now additionally accepts the complete installed source continuation, keeping
the old before/after/inverse and reporting physical `currentAfter` separately.
A new fixed four-parent packet retains the complete JSON facade, both-producer
module, packager and original proposal-provider source before/after pairs.
It also retains the exact earlier two proposed afterimages, including the
uncorrected flattened import path, for source ancestry rather than installation.
Source substitutions retain exactly `language` then `repository` sequences,
whole CST serialization/reparse and complete inverses. The new packetSHA is
`4e796493d01ef8d87c4be87efde83c2eed3b74b7c251a5bae540526a70c9c640`.

Three independent cases are drafted: actual complete asset producers relocated
outside the checkout, runtime import and lazy/large-input behavior plus legacy
bounded JSON refusal; exact unrelated-asset retention; and complete source
proposal/installation ancestry. All cases, strict target compilation, resource
fit and CI feedback remain UNRUN/NOT_INSPECTED.

This installs packaging only. Genuine serde/Cargo/source/type/namespace owners,
private parser/checker/root-loan/meta/whole-body interpretation, both translation
directions, full caller regeneration and complete receiving qualification remain
open. Earlier handoff statements about uninstalled parents describe their
historical checkpoint. The shared current-source graph still needs this new
four-parent continuation; no freshness or source-terminal qualification is
claimed. Acceptance stays11/70 DRAFTED and59 OPEN, executable coverage UNKNOWN.
