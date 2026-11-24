# Owned primitive vector loop state source draft

Status: SOURCE DRAFT ONLY. All receiving, emitted JS/strict TS, interpreter,
CST/meta, canonical inverse, native oracle, freshness and performance checks
remain UNRUN. No CI feedback was inspected. Full synchronization is OPEN.

Both owned JS/TS caller families retain live outer primitive vector slots in
while, counted-for and shared-slice for-of loops. A per-function source checker
records actual lexical symbols, domains, mutability and availability. Every
condition, normal backedge, break and continue must preserve the original live
outer vector binding. Functional move/rebind updates restore availability only
after their right-hand value has checked. Partial restoration, duplicate moves,
moved break/continue paths and receiver-consuming conditions stay refused.

Loop frames are nested at most 32 deep, close on failure and retain no state
across source operations. These scope DATA checks grant no caller or executable
permission. The complete original private JS/TS caller, type/root and source
checks remain required. Ordinary callbacks still cannot capture owned vectors;
public Vec inputs, arbitrary indexed mutation and broader helper inputs remain
unfinished. The initial rule conservatively rejects some safe terminating
paths if they consume an outer vector instead of restoring its loop invariant.

The native lane now uses its existing complete bounded fixed-point loop walk
for functional vector reassignments. That analysis retains zero-iteration and
break exits, treats continue as a backedge, checks current lexical loan roots
and rejoins every outer slot. No public loop summary or metadata authorizes
movement. The paired 4,096-value resource envelope remains unchanged.

Independent all-domain source cases cover counted ranges, countdown while,
shared-slice copies, stopped loops, extrema and wrong movement at boundaries,
with emitted JS/strict TS, interpreter and CST/meta obligations. Separate
native caller sources and eleven-domain Rust oracle source are drafted for
CI after all eight same-SHA JavaScript gates. Five complete source equations
retain frozen originals, both ordered substitution phases and exact inverses.
