# Current complete proof consumer module graph

The receiving test in [PR #785](https://github.com/link-assistant/router/pull/785)
was applying a historical stateless source projection directly to consumers
that had since adopted the operation-byte bridge. The repair first restores
the registered complete source history. Every original before/after byte and
SHA256 pin remains exact, and unknown complete sources remain refused.

The first complete Node check then exposed a second stale test assumption:
six cases passed, but both genuine proof cases reported zero selected native
calls. The diagnostic module had been relocated without the current consumers'
intermediate byte bridge. The repaired receiving module graph copies that complete
current bridge, redirects its real native import to the existing instrumented
serializer, and redirects the current consumers to that bridge. The original
serializer and production module graph remain unchanged. All relocated modules retain
native-selected import equations, full CST transport and complete inverses.

The complete eight-case Node 20.20.2 run passes in 82.326 seconds. Its independent
audit reports zero breaches of the original per-case 60-second limits and a
closed child process group. Total cgroup sampling peaked at 2,571,984,896 bytes;
the resource observer did not stop it. The earlier six-pass/two-fail run and its
exact first draft remain retained. Bun 1.4.4 passed the first five original
cases, then the aggregate resource guard stopped the whole-file attempt after
61.003 seconds at 2,867,769,344 sampled cgroup bytes. Its owned child closed;
the remaining cases and complete-file Bun qualification remain unfinished.
No assertion or deadline was changed and no unchanged retry was made.
The complete evidence packet in [`evidence/`](evidence/) (SHA256 `08d244a2…f411`)
retains all 26 full observations and unchanged-source Git references, including
the failed first draft. Runtime diagnostic vectors were not exported.

These are receiving-test repairs, with zero newly executable application
functions. They do not qualify missing generated outputs, strict parity,
the complete JavaScript gate, CI-pinned Bun 1.4.3 or Rust execution.
