### Changed

- Pass successful private walk costs through invocation-local scalar results instead of decoding each child cost again, and fold JSON measurement heights locally while retaining the existing checks, quotas, records and callback order. Add paired whole-function controls and reversible historical test-source adapters. This source change has no performance qualification until complete original receiving workloads pass.
