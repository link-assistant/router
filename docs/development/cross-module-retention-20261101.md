# Cross-module source-operation retention successor: source draft

All new implementation, source/preparer/compiler/parser/translator/test execution
is **UNRUN**. No GC tests, heap experiments, WeakRef lifetime checks, CI feedback
or memory measurements were performed. No measured memory or throughput claim
is made.

The opt-in cross-module operation previously retained every capture-only checker
in a strong Map, including disposable original project trial/receiving checkers
that never attempted cross-module proof. Its strong finalized-entry Set could
also retain such checkers' complete entry trees indirectly.

The successor in `router-core-json-updates.mjs` uses a WeakMap for lookup-only
capture indexes and a WeakSet for lookup-only finalized-entry membership. Capture
alone supplies no additional semantic authority and no closing obligation for
this opt-in proof path. Existing original compiler source checks still apply.
No observation or proof can be created solely by finding a captured checker.

A genuine checker entering an actual cross-module proof attempt joins a separate
strong Set before source/signature/namespace validation. At most 256 distinct
proof checkers can enter one operation; excess attempts refuse before admission.
That Set retains attempted checkers, including failed attempts, and drives the
complete closing traversal of their original captured declarations. Existing
bounded observation rows still strongly retain their actual checker, raw app,
caller and callee identities. Their original raw-node/source/signature joins,
finalization observations, body/entry/loan/cycle checks and closing snapshots are
unchanged. Source failures still poison enclosing selected operations.

No correctness step depends on collection occurring. An actual proof/check has a
live strong checker argument, and observed entries remain strongly reachable for
all required source/signature/flow/finalization checks. No WeakRef or finalizer is
used. On every exit, private indexes and checker/finalization sets are dropped,
observation references are cleared and the parent frame is restored through a
nested `finally`; cleanup does not allocate new weak containers or invoke a Set
method. There is no new cross-operation cache or public override flag. Default
same-module behavior and strict opt-in refusal behavior remain unchanged.

## Complete immutable source chronology

The committed `cross-module-helper-bulk-20261101` archive and every frozen
original/current snapshot remain byte-for-byte untouched. New complete original
and current inputs live under the standard exported
`source-profiles/cross-module-retention-20261101/originals/` directory. The new
pinned native source archive contains exact root, predecessor-driver and legacy
profile-reader before/after equations. Native SourceFile selection retains any
complete leading comment/trivia, and both ordered language/repository sequences,
serialized/reparsed CST, native binding checks, full physical source guards and
whole inverses remain those of the existing failure-aware producer.

The existing cross-module predecessor driver composes this leaf through
`laterPlans`; the original native-helper-syntax-origin predecessor therefore
reaches the current root through its existing chain. The legacy full-source
profile preserves its historical before/after bytes and accepts the new root
only through the exact complete known-descendant native plan. It retains that
source history and still applies complete final DATA occurrence accounting.

Independent UNRUN source cases retain whole immutable-history joins through all
three producers and the legacy profile reader, plus nested scope, exact callback
error and subsequent-operation behavior. Existing full native/JS/strict-TS
cross-module acceptance/refusal, source/semantic inverse and CI-only oracle case
source remains required and UNRUN. No execution evidence or broad closure is
claimed; production/source-export/gate receiving qualification remains open.
