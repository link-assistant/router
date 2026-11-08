# Withdraw the unqualified receiving-helper draft

An additional draft reused the existing bounded complete-metadata receiver in
the ASCII, private-analysis and runtime-import assertion helpers. It retained
every original source assertion, independent import, native copy and inverse.
The two complete files ran together under Node 20.20.2, TypeScript 5.9.3 and the
existing 512 MiB heap, without optional full-vector logging.

All nine cases pass their assertions, but the independent deadline audit fails:

| Original ASCII case | Observed duration | Original limit |
| --- | ---: | ---: |
| Complete current source equations | 112925.226717 ms | 60000 ms |
| Actual runtime imports and scalar cases | 346855.26418 ms | 60000 ms |
| Invalid runtime ABI and surrogates | 76933.006007 ms | 60000 ms |

The observer completes in 639.555 seconds, with a sampled total cgroup peak of
2610466816 bytes and no resource stop. Every owned child closes. This is neither
a paired performance comparison nor a qualified fix. The additional three
helper changes are withdrawn to their exact `8e8de4dfb` originals. Bun receiving
of that withdrawn draft is unrun. Earlier committed receiving changes retain
their separately documented limitations.

The [complete packet](evidence/current-shared-source-receiving-withdrawal.json.gz)
preserves all 18 original members: full streams, observer/audit records, complete
executed and withdrawn helper sources, and their exact Git predecessors. Every
member is decoded and hashed after writing. A finite CPU-profile probe refuses
because the target has already exited; no signal or profiler is started. It
supplies no CPU attribution. Full optional runtime vectors were not captured.

This attempt adds zero executable application functions. Original deadline
failures, complete gate and same-head CI remain unfinished in
[PR #785](https://github.com/link-assistant/router/pull/785).
