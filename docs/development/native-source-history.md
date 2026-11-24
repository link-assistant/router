# Explicit complete native source histories

SOURCE ONLY; the implementation, CST/parser/translator/preparer, tests and all
compilers remain UNRUN. No local experiments or CI feedback inspection. This
mechanism does not establish executable coverage or finish production translation.

A pinned native history archive retains every complete original Rust file,
its physical immutable source, current successor, explicit substitutions and
full original/current byte identities. Generic language rules retain Rust source;
repository rules select only the reviewed application integration changes.
The native source constructor runs the ordinary two-phase CST substitution
transaction, serializes/reparses both complete source levels and records exact
inverses. It never invokes Rust, native compilation or arbitrary new phase names.

Current native input provenance can follow an explicit complete original-to-current
chain. Each step composes its own language/repository sequences, retaining every
intermediate version and inverse. Branches, cycles, duplicate/disconnected equations
and unknown source versions refuse. The generic receiving DATA constructor accepts
an explicit archive and pin; actual parent provenance uses its reviewed pinned
default, so caller-supplied DATA cannot replace that input. Unchanged inputs remain unchanged. Unknown bytes,
changed immutable originals, archive tampering and wrong native languages refuse.
Existing provenance loaders still authenticate their original archive first;
their output now distinguishes original bytes/hash/source from the actual current
source and matching full history. Every actual native current source and complete
history input is rechecked after compiler construction callbacks. No original pin
or source guard is silently replaced. No cross-operation source/hash/owner/result
cache is introduced; each operation rereads and reconstructs its input history.

The result is detached development DATA. A history, path, hash, CST, trace,
public flag or copied record grants no type, ownership, source namespace,
macro/effect closure, executable or receiving authority. Existing genuine private
source module, scope, declaration, native ABI and semantic checks still apply to
the freshly reconstructed program. Preserved source is not translated behavior.
Receiving repositories must include and qualify their actual complete inputs.

The initial repository sequence aligns native Codex global takeover with the
paired JS/TS draft. It validates foreign catalogue constraints before backup
creation, removes only the override inside the existing setup/rollback branch,
keeps the exact first backup for undo and bounds native catalogue reads at8MiB.
The two crate-local helper visibilities permit that existing native caller;
no external API or conditional Rust execution path is added. Symlink races,
platform/CA/resource pressure and broader native/receiving qualification remain
OPEN; the source draft alone certifies none of them.

Seven compiler equations, two complete native substitutions and independent
unrun source cover both CST phases/full inverses, old/current/unknown inputs,
original/history mutation refusal, language mismatch, readonly construction,
actual fresh native configure/constraint retirement/undo and oversized/invalid
catalogue preconditions. Rust stays CI only after all eight same-SHA JS gates.
Full source namespace/forward/reverse/sync/freshness/parity/performance/receiving/
CI-repair/delivery requirements remain OPEN. All verification remains deferred.
