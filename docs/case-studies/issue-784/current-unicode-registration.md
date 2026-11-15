# Current compiler registration and shallow checkout regression

[PR #785](https://github.com/link-assistant/router/pull/785) remains unfinished.
The actual isolated registration producer captures all 1,817 selected physical
inputs at source `ca0c519ccd0ee0f23bddfeb14d2f4b40a61e7cfa`: 57,801,245 bytes.
The actual installer verifies these bytes, preserves the complete previous
registry, derives both bootstrap copies through the original CST phases and
inverses, and regenerates the genuine 468-object portable Git fixture. The
concrete source profile remains unchanged. No output hash was manually repinned.

The current CI's portable metadata case fails with `not a tree object` because
it assumes the pinned compiler commit is available in the runner's shallow
checkout. The regression now uses the existing authentic Git fixture
materializer, explicitly verifies that HEAD is unavailable, and passes the
genuine registered source commit to both original producer invocations. The
complete deterministic proposal, roundtrip, manifest, installed packet and
source assertions remain. No HEAD fallback or synthetic replacement commit is
introduced. The original 60-second deadline is unchanged.

Both complete eight-case files pass in each engine: 16 Node cases and 16 Bun
cases. Node 20.20.2 uses a 384 MiB parent heap; Bun 1.4.4 uses `--smol`.
The original Node deadline audit passes with no breaches. Complete observations:

| Check | Seconds | Peak sampled total cgroup bytes | Result |
| --- | ---: | ---: | --- |
| Node, both whole files | 210.692 | 2,707,030,016 | 16 pass, independent deadlines pass |
| Bun, both whole files | 180.135 | 2,633,719,808 | 16 pass |

Installed TypeScript is 5.9.3. CI's Bun version remains independently pinned to
1.4.3; the local result does not qualify that version or the full CI cohort.

The [complete receiving packet](evidence/current-unicode-registration-receiving.json.gz)
retains every probe, install and receiving stream, all resource receipts, the
whole Node audit and the test's full before/after source. Its two complete
external containers retain the actual
[proposal](evidence/current-unicode-registry-proposal.json.xz) and
[installation](https://github.com/link-assistant/router/blob/79f375ed1d9690ab8336e06a28331c2871092eb0/docs/case-studies/issue-784/evidence/current-unicode-registration-refresh.json.xz?raw=true), including
all original sources, proposed outputs, checked phases and inverses. Containers
were moved without duplicating bytes and were fully hashed before and after.

These are registration and receiving results. Newly executable production
functions: zero. Strict parity, the complete gate, all other CI failures and
universal client/account privacy remain unqualified. No Rust tool was run.
