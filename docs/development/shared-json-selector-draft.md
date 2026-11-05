# Shared JSON source selector and bulk routing draft

Every new implementation and independent case is UNRUN. Source review found that
the source-bound bulk dispatcher used a separate earlier JSON selector copy.
Both actual adopter entry points now forward their six source operands to one
shared current selector implementation. Each retains its original complete input,
Cargo, configuration, native producer, source graph, namespace and import guards.
The selector returns candidate source DATA; it cannot issue semantic or native
authority. The source-bound producer context remains distinct from the ordinary
producer context. This sharing creates no cross-operation cache.

The shared module is a complete inspectable copy of the current implementation,
including its original helper and producer bodies, plus an explicit selector
export. New substitution rules can now reach the ordinary, detached packet and
source-bound bulk paths through that selector. The existing synchronization
facade also exports the original direct proposal/packet APIs and bounded Option
source equations and predicate catalogue. None of those exports installs source.
Existing compiler-input discovery selects these complete tracked root modules,
and export still includes source-profile originals under its independent bounds.

Five complete compiler equations retain original modules and selected function
owners, separate language/repository phases, complete CST/meta and whole inverses.
Independent unrun receiving source compares current candidates, actual bulk
routing, detached packets and source inverses while retaining both outer guard
domains. Refusal cases cover competing bindings, callbacks and source accessors.

No compiler, parser, preparer, translator, exporter, test, experiment, generation,
Rust tool or CI-triggering push ran. Actual source-bank/export production and
receiving qualification, native namespace/effect closure, complete production
translation, reverse/sync, freshness, parity and all complete gates remain open.
