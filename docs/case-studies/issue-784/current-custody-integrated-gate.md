# Canonical custody integrated gate attempt

At committed `743c338d4`, the mandatory complete local JavaScript gate uses
Node 20.20.2, a 128 MiB parent heap and inherited 512 MiB child heaps. Bun is
1.4.4 and the lockfile-installed TypeScript compiler is 5.9.3. The original
gate commands, source selection and all deadlines remain unchanged.

The unchanged container guard stops the attempt after 17.142 seconds at a
sampled 2,879,696,896 bytes. Fingerprinting has discovered 49,313 paths; its
last progress record covers 31,247 files and 610,330,096 bytes. The fingerprint
does not finish. All seven stages are unrun, no green stamp exists and no Rust
tool runs.

This distinct cache experiment advises only closed, owned, tracked large-file
pages asynchronously while original clocks keep running. All six advisers
finish successfully and retain complete receipts. They do not keep the complete
fingerprint below the guard; no cache or performance improvement is claimed.
Every owned child and adviser is reaped.

The [complete packet](evidence/current-custody-integrated-gate.json.gz) retains
the full fingerprint stream, observer, original gate source, all resource and
page-advice receipts, and whole readback. It does not replace the earlier gate
at `e15197054`, whose passed stages and later interruption remain separate.
[PR #785](https://github.com/link-assistant/router/pull/785) stays draft.
