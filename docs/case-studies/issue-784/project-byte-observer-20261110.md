# Project byte-operation observer regression

Published CI job 129670695007 fails the ordinary observer cleanup case with
`Missing expected exception` (log lines 10405–10410). The test depends on
namespace diagnostics that now require the explicit `namespaceProgressObserver`
adapter. Its unwrapped callback consequently never reaches the intended throw.

The regression now requests those diagnostics explicitly for both project
APIs. It retains the original error identity, last callback phase, absence of
module parsing after the error, exactly one nested translation, complete meta
and target equality, strict independently compiled TypeScript targets and the
original 60000 ms case deadlines. Production callback behavior is unchanged.

The original two-case Node file reproduces one failure. After the change,
both complete cases pass in Node 20.20.2 and Bun 1.4.4. Both independent Node
duration audits pass with unchanged limits. Resource observers finish without
reaching the existing guard. These focused checks do not establish a green gate.

The [complete 21-member evidence](evidence/project-byte-observer-20261110.json.gz)
retains before/after source, raw receiving streams, resource records and complete
Node audits. Its 51750 bytes have SHA-256
`34ff26cd84062ece6d0980cb3ba6d9d71dbc4b4a21bc35eff7ac6b54f755f5e2`;
every embedded member was decoded and checked in full. No Rust tool ran and
no executable production-function gain is claimed.
