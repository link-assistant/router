# Shared native reset/session lock draft

SOURCE ONLY; no Rust tool, compiler, translator, preparer, application process or
test executed. No CI feedback inspected. Full source drafting continues.

Native Router-owned Claude reset now holds the same profile-operation advisory
lock used by Rust ProfileSession and the paired JS/TS activity/session draft.
The existing outer backup-operation lock remains first in the ordering. The
profile lock covers active-marker inspection, verified backup, settings staging,
rollback and cleanup, so new session registration cannot slip between inspection
and reset. Contention refuses immediately. The state/lock is created even when
the home store is absent, avoiding an unlocked exists/create race. Other clients
and normal profiles keep their existing reset path and lock behavior.

One full native source substitution and two compiler equations retain the complete
original reset implementation, exact current successor and full two-phase CST
inverses. The default successor archive retains every previous step: nine steps
across eight native paths, with the existing two-step operation-context chain.
All older native input metadata pins remain unchanged. The changed reset input
must join its explicit original/current history rather than passing old equality.
No receipt/history/hash or public flag grants source namespace, semantic or
executable authority, and no cross-operation cache is introduced.

Independent unrun native oracle source holds the real profile advisory lock and
calls the actual public reset entry, requiring failure with exact settings bytes
and no staged reset files. Complete source cases retain all history inverses,
changed-path joins and export closure. Execution, mixed-process timing, external
untracked client inventory, full link/backup restore, platform ACLs, complete
forward/reverse/sync/freshness/parity/receiving and delivery remain OPEN. Rust is
CI only after all eight same-SHA JavaScript gates; local execution stays deferred.
