Owned-definition generation now derives an explicit UTF-8 metadata planner and
fixed JSON field serializer from the complete original sources. This reduces
large keyed-string lifetimes while preserving complete output bytes and storage
limits, and adds bounded progress around planning and retention. All 22 complete
Node and Bun receiving cases pass. Full-project memory, performance, forward
freshness and runtime parity remain open; Rust execution remains CI-only after
every required JavaScript stage passes for the same SHA.
