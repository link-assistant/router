# Complete evidence packets

`capture-packet.py` creates a verified XZ/TAR packet from an explicit manifest of complete originals. It needs Python 3.9 or newer and Git, with no Rust build, network access or third-party package. Node/Bun behavioral tests cover reopening every original, duplicate hardlinks, changed bytes, linked inputs, escaping names, stale commits and output preservation.

Prepare a JSON object with a `members` array. Each entry contains `path` (a canonical relative TAR member name), `originalPath` (the absolute original filename), `bytes` and its complete `sha256`. Include entire raw failed and passed logs, input vectors, executed harnesses, reviewed source snapshots and reports. Existing outputs are never overwritten; original sources are never removed.

```sh
python3 tools/evidence/capture-packet.py \
  --source-root . --head FULL_IMMUTABLE_GIT_SHA \
  --manifest /tmp/complete-members.json \
  --archive /tmp/new-complete-evidence.tar.xz \
  --receipt /tmp/new-complete-evidence.json --cap-seconds 600
```

The tool hashes each original before, during and after streaming, reopens every complete archive member and checks exact decoded lengths/hashes. Duplicate originals use backward TAR hardlinks. The receipt preserves every original path, length and hash, the immutable source commit and harness hash. XZ preset9 uses a 64 MiB dictionary; that setting is not measured peak memory. Resource claims require independent actual telemetry.

The selected scope is bounded to 8,192 originals, 128 MiB per original, 1 GiB of complete originals and a 16 MiB manifest. The finite deadline is checked between bounded reads and archive operations; use an enclosing process deadline for hard termination. Failed captures keep their output for inspection and issue no successful receipt. System `/tmp` and `/var` aliases on macOS resolve to their real roots; other linked evidence paths are refused.

This tool changes storage only. It does not certify semantic admission, runtime parity, a JavaScript gate or permission to run Rust or publish. Check the destination evidence allocation against the task's fixed budget before installing a packet; keep historical failure packets intact.
