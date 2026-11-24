# Preserve original failures when source closing also fails

Source review found the same `finally { closeSync(fd); }` precedence bug in
four earlier drafting modules: the complete cross-module owned production owner
reader, scoped macro production owner reader, durable leaf Cargo parser reader,
and bulk source-binding census. The last also had an analogous directory-handle
close. A read/census failure followed by a close failure could replace the
original value, including `undefined`, `null`, zero and frozen errors.

Five exact close sites now use a separate primary-failed Boolean and rethrow
the original value unchanged. Every acquired descriptor/handle is still closed;
a close failure still propagates when it is the sole failure. None of the original
identity, source, count, scope, parser, lifetime, poisoning or resource checks
was weakened. No compiler owner or supported language construct was added. The
new literal/nominal profile workers independently corrected their corresponding
new readers before freezing; this batch preserves their prerequisite copies.

`source-read-close-primary-20261101-history.mjs` retains complete immutable
before/after bytes for all four files in a bounded compressed source archive.
It checks actual current bytes, serializes/reparses complete original and
successor CSTs, applies the declared JavaScript then repository substitution
sequences and returns full sources, complete inverse and trace DATA. Full
archive and physical-source closing are retained, and the new archive reader
uses the existing complete closing fence itself. The archive hash identifies
source DATA; it cannot authenticate namespace/type/ownership or execution.
Old frozen source profiles and original complete cases remain unchanged.

Independent source in `test/source-read-close-primary-20261101.test.mjs` checks
whole sources/CSTs/two-phase traces and invokes all four real APIs in fresh Node
children under descriptor read-and-close faults and close-only faults, plus
actual bulk census directory read-and-close and directory-close-only faults. It uses
all falsy scalar primaries, NaN, negative zero and frozen objects. Actual module
code is imported before fault injection; private native state is not exported or
replaced. The complete file remains in the existing Node/Bun schedules; this
specific child deliberately uses Node's builtin-ESM binding update contract,
with no capability skip and no claim of a separate Bun fault-injection proof.
Existing original Bun operation tests stay mandatory. The original 60-second
case and 20-second child limits are retained. No tests or child were run now.

This is partial Q01/S03/C04 source evidence. Those complete requirements stay
OPEN, with all runtime, receiving/export, freshness and current-SHA gate results
UNRUN/uninspected. No full translation or measured coverage/speed gain follows.
