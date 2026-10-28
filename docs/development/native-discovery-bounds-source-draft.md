# Native discovery dependency bounds draft

SOURCE ONLY; all implementation, source construction, compiler, translator and
case execution remains UNRUN. Rust runs only in CI after all eight same-SHA
JavaScript gates. No CI feedback has been inspected during drafting.

The native Rust discovery source now follows the paired JS/TS strategy: probe
conventional ports first, query Docker only afterward, keep at most 64 published
candidates from at most 64KiB, and require exact loopback bind hosts and TCP.
Each accepting socket still requires real Router health. Native discovery uses
a 3-second budget, TCP 150ms, health at most 1 second and Docker at most 1 second
or the remaining budget. No candidate or open port establishes server ownership.

The existing native subprocess implementation is reused through an explicit
limited-output entry point. Its shared reader drains both pipes concurrently
while retaining at most maximum+1 bytes per pipe; any excess is fatal. Existing
output callers retain their original 8MiB truncation behavior. Deadlines, owned
process-group/Windows-job termination, retry boundaries and final child reaping
remain in the existing capture implementation. The operation-context wrapper
preserves injected runners and rejects oversized fixture responses. A runner
must honor its own memory/deadline contract; output receipts cannot bound an
arbitrary injected implementation. Small dependency output is not proof of exit.
Process termination and reader joins still require platform qualification;
configured budgets do not establish hard realtime termination guarantees.

Three complete native source substitutions preserve physical full originals,
explicit repository replacements, language identity and serialized/reparsed CST
inverses. The successor history retains both previous catalogue equations,
forming five native histories. Two compiler equations retain the old history
archive and its pin in complete originals and select the explicit new archive.
Every older native input metadata pin remains unchanged; the generic provenance
reader joins actual current native bytes through those histories and rechecks
all complete inputs afterward. No source/owner/verdict cache or admission bypass
is introduced. History and CST values remain development DATA.

Independent unrun native oracle source covers exact pipe caps, both-pipe overflow,
stalled descendants, invalid limits before process lookup, injected deadline/cap
contracts, strict port hosts, UDP rejection, candidate/listing bounds, expired
probes, unrelated TCP services and valid Router identity. Complete history/export
source cases retain five native full inverses and two compiler equations. Platform,
TLS, daemon crash/cancellation, wider translation/reverse/synchronization/parity,
receiving qualification and delivery all remain OPEN.
