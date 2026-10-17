Added a bounded private original type-namespace join for named `std::fmt`
imports used by source Display forwarders. Display, Formatter and Result resolve
independently through the actual caller module bindings and pinned original
standard reexports; complete method signatures retain their private source
member association. Unresolved trait aliases retain same-family coherence
obligations; only actual local trait declarations or other pinned fmt traits
prove disjoint owners. Copied/foreign contexts, shadowed owners, unresolved import
or macro effects and unsupported method bodies remain refused. This does not
close ClientKind's clap/schemars outputs or prove its full original runtime.
