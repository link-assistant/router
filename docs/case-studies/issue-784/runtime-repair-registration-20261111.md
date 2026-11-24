# Runtime repair: genuine isolated registration

For [PR #785](https://github.com/link-assistant/router/pull/785), the original
registration and portable-Git producers reproduce the complete compiler inputs
at source commit `4bfe61770ea34b72bde8b8f34635b8aa2b2b9252`.
The reviewed proposal contains 1945 complete inputs, totaling 58884918 bytes:
four compiler files change, one exact source-history profile is added, and no
input is removed. The installer independently reproduces all seven proposal
outputs and retains all six complete predecessor files in
`history-3927bc31551aa3393e6176fa6b12d1be9e45a15e.json.gz`.
The installed portable fixture contains 495 genuine Git objects. No source,
digest, proof or bootstrap pin was edited independently of its producer.

The original complete receiving files pass in both engines:

| Complete file | Engine | Cases | Elapsed seconds | Peak sampled cgroup bytes |
| --- | --- | --- | --- | --- |
| `portable-git-fixtures.test.mjs` | Node 20.20.2 | 8/8 | 124.563868 | 2661015552 |
| `isolated-project-batch.test.mjs` | Node 20.20.2 | 8/8 | 130.062240 | 2533081088 |
| `portable-git-fixtures.test.mjs` | Bun 1.4.4 | 8/8 | 107.722839 | 2514661376 |
| `isolated-project-batch.test.mjs` | Bun 1.4.4 | 8/8 | 105.972585 | 2536906752 |

Both Node independent deadline audits pass. Every original case, assertion,
source equation, negative control and declared deadline remains present.
Expected negative Git fixtures print `gitattributesMissing` and missing-revision
errors; the corresponding assertions pass. TypeScript is the repository's
lockfile-installed 5.9.3. CI's Bun version is 1.4.3, so these local results do not
qualify its later run.

The first combined Node attempt remains failed: the original resource observer
stops it at 2871140352 sampled cgroup bytes after 13.071794 seconds, before any
case completes. All owned processes are reaped and the interrupted audit is
incomplete. Between attempts, the existing finite file-page adviser releases
only closed, unmapped, single-link, task-owned tracked file pages. It neither
changes file contents nor deletes paths or build caches. Its complete receipt
records observed cgroup use decreasing from 2361229312 to 2015129600 bytes.
The subsequent fresh processes use a 384 MiB Node heap instead of 512 MiB;
the original workload and deadlines remain unchanged. These observations do
not establish a controlled speed or memory improvement.

Complete readback-verified evidence is retained in
[the 38-member receiving packet](evidence/runtime-repair-registration-20261111.json.gz),
[the complete proposal](evidence/runtime-repair-current-registry-proposal.json.xz),
[its independent review](evidence/runtime-repair-current-proposal-review.json.gz)
and [the complete installation receipt](evidence/runtime-repair-current-registration-refresh.json.xz).
Every encoded member is decoded and length/hash checked; all installed files
and the complete retained history also match their receipt bytes. The external
compressed records were moved into this directory without duplicate copies.
Evidence totals 493005356 bytes at capture, below the 500000000-byte allocation;
this does not retract the earlier recorded full-gate evidence overrun.

This batch adds zero executable production functions. The complete gate has not
been rerun on this registration. Source-size admission, original deadline
failures, canonical and profile generation, strict parity and remaining issue
#784 privacy criteria remain unfinished. No Rust tool or build was invoked.
