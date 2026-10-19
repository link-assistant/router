---
kind: changed
---

Reduce per-call allocation in the existing qualified deep-data freezer. Its
bounded depth-first planner now returns each child's scalar cost directly to
its parent, removing pending triples and the second child-map walk. Complete
parent descriptor checks, left-to-right children, shared-edge multiplicity,
cycle/depth/cell/node limits, postorder freezing and existing weak scalar
records remain. Unqualified or unsupported data keeps the original freezer.

No source, hash, owner or verdict cache is added. Builtin output reissue and all
source/item hashes and issuer joins remain unchanged. A complete old-helper
oracle and eight bounded cases cover full graphs, aliases, budgets, fallback
callbacks, real Debug/PartialEq proof/hash envelopes and checked JS/strict TS.

The motivating timed profile hit its unchanged 300-second cap. It attributed
25.0% of samples to GC and left 67.9% unaccounted; visible planner/reflection
stacks justify this allocation change but do not establish a speed gain.
All new runtime checks are UNRUN locally; original deadlines remain unchanged.
