---
kind: fixed
---

Keep an actual constructor-tag branch around selected statement-match payload
projections. An immutable known constructor still evaluates its subject once
and selects its checked arm, while TypeScript can now narrow the complete Rust
union before reading its fields. Wildcard/binding blocks, enclosing control
flow, mutation and collision avoidance remain unchanged. No casts or compiler
strictness waivers are added.

The unchanged 22-case lifetime-flow regression includes the actual unused-formal
collision plus known Some/None and alias cases; its captured strict compiler
output reported TS7053 for the two previously unguarded Some projections.
The source-only emitter change awaits the actual class-birth producer and
complete receiving. All runtime checks are locally UNRUN; no generated birth
leaf or shared generator INPUTS table was manually edited.
