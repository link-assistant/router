# Current base64 source-path CPU diagnostic

Finite investigation for [PR #785](https://github.com/link-assistant/router/pull/785).
The current Node reverse shard exceeds the complete base64 vector case's
unchanged 60-second deadline. This diagnostic measures one complete fourteen-
function translation from the actual Rust oracle's JavaScript witness, with
all current runtime sources, Rust facade and primitives, base64 implementation,
actual Rust package manifest and lockfile. It does not execute the whole test
file, its strict target compiler, all independent vectors or all receiver calls.

The fresh source context takes 387.104 ms and the complete translation takes
29,794.868 ms. The observed command completes in 33.255844 seconds with a
sampled total cgroup peak of 1,544,507,392 bytes. CPU samples cover 30.303438
seconds. Inclusive per-function totals overlap: original-source analysis
accounts for about 20.522 seconds across its call sites, source-current checks
14.217 seconds, base64 leaf checks 11.833 seconds, CST transport 8.087 seconds
and private parser authentication 7.186 seconds. Garbage collection has about
2.405 seconds of self samples. These are one diagnostic's sampled costs,
not independent additive phases or controlled performance gains.

The trace points toward repeated complete original-module analysis and source
authentication across independent boundaries. The existing operation scope
already groups item checks within each phase. Sharing a previous semantic
verdict across serialization, reparse or either emitter would require separate
qualification; no such shortcut or production compiler change was introduced.

The [12-member archive](evidence/current-owned-base64-source-profile.tar.gz)
and [complete receipt](evidence/current-owned-base64-source-profile.json.gz)
preserve the full CPU profile, all complete source inputs and translation output,
every timing/resource log and the profiling and retention scripts. Each member
was independently read back and hashed. The archive is 759,436 bytes, SHA-256
`3143a8b2ef5e909b58693bcdd5fc1ff4c59ed59a429a557c36167b6691add9a1`.
The initial diagnostic's incorrect workspace-manifest selection failed before
translation; its full failure and resource receipt are retained separately in
the same archive. The successful diagnostic uses the actual Rust package paths.
Both children have exited and been reaped; raw evidence remains retained.

This is source-path evidence only. Original test deadlines, the full production
producer's heap failure, matrix generation, strict parity and the complete
JavaScript gate remain unresolved. No production executable gain or universal
privacy guarantee is established, and no Rust tool was invoked.
