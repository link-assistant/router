Extend the checked pattern frontend to anonymous tuple callback parameters in
actual by-value standard Option operations. Bindings use the existing checked
irrefutable pattern planner, immutable guards, scalar projections and lexical
closure scopes. The parser consumes bounded original tokens; ordinary scalar
callbacks retain their existing path.

The initial profile refuses iterator reference erasure, aggregate bindings,
named payload aggregates, refutable parameters, annotations, mutable/reference
patterns, move closures and nonlocal exits. Synthetic Node/Bun tests exercise
emitted JavaScript and strictly compiled TypeScript, eager map_or defaults, lazy
callbacks, captures, source owners and proxy/accessor guards. This does not claim
full Router parity or count synthetic fixtures as translated production bodies.
