Default and Clone source contexts now consume genuine complete generated-output
name effects when their enriched namespace resolution is entirely identical to
the original derive context's resolution. This fixes standard-only derives
whose input certificates intentionally leave output type names unresolved.
The resolver retains its complete original graph/profile/external-table and
per-invocation output checks; no public scope flags are copied or edited.

The adapter executes ordered language resolution/equality/output rules and an
empty repository sequence. Any namespace enrichment that changes the complete
binding result keeps the old result and its refusals. Already resolved scopes
short-circuit without additional resolver work. Uncertain scopes may perform
additional fresh resolutions; performance is unmeasured. Input certificates,
source/type/owner checks and existing Default/Clone scope assertions remain.
Eight receiving cases cover the original generated Default and Clone targets,
strict TypeScript, genuine output composition, conservative enrichment, copied
or changed contexts, independent refusals and ordinary manual Default bodies.
Tests are source-only until coordinator receiving; the existing whole bulk
fingerprint-order fixture and its coverage assertions are unchanged.
