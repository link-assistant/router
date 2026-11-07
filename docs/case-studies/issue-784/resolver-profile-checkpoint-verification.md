# Resolver profile and completed CI evidence

All seven workflows for published head
`f3ba507ddc3f48391239c21423cc84ec1a2a275e` have finished. The
[main CI run](https://github.com/link-assistant/router/actions/runs/42406506626)
fails at 2026-11-07 20:30:35 UTC; the six supplemental workflows skip. No
published head changes while that cycle runs. Complete workflow logs, metadata
and all three artifact ZIPs are retained. Every ZIP member is fully read and
CRC/length/hash checked. There is no identified secret or human-only prerequisite
that could justify skipping a required stage.

| Stage | Complete observed result |
| --- | --- |
| Lint, native Node, native Bun | Pass; each native engine runs 259 cases. |
| TypeScript | Fails on the missing genuine owned matrix index at workflow line 1157: `profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json`. |
| Strict parity | Fails: stale `account_routing_policy.rs`, 441 feature gaps and 12345 carried items, workflow lines 7172–7176. |
| Profile matrix | Cancelled at its original 60-minute job limit; workflow line 3112. Complete current generation remains unqualified. |
| Forward translation | Cancelled at its original 60-minute job limit. Its partial complete-file stream contains 10983 lines and 21 failure blocks; no terminal cohort audit exists. |
| Reverse translation | Cancelled at its original 15-minute job limit, workflow line 6213. Its partial stream contains 381 lines; no terminal cohort audit exists. |
| Aggregate and Rust | Aggregate fails; all Rust work correctly remains skipped. |

The forward artifact's `complete-0i48Jp/stdout.raw.tap` retains the full failures:

- Eight actual-gain cases require genuine current generation; original lines
  553–756 retain the expected `translate.mjs` hash `84d99f5f…1ec2` and actual
  hash `cd328961…2dc2`. Historical pins have not been replaced.
- The receiving child reaches its original 20-second bound (line 5443).
  Literal-text adoption and native corpus provenance exceed their original
  60000 ms limits (lines 6095 and 6189).
- Three CSV cases lack declaration or ownership evidence (lines 6246, 6271,
  6305). The first takes 1120020.26926 ms; a declaration repair alone would
  not qualify its original deadline.
- Seven isolated-project cases fail the registered complete-source join or
  dependent assertions (lines 10207–10319). The first differing registered
  compiler is `builtin-clone-ast-route.mjs`, expected `89730634…7df`, actual
  `a6430936…9a2`. A separate full registry census finds 31 changed existing
  inputs; current closure additions are not inferred from that mismatch count.

The complete TypeScript artifact also retains intentional failing deadline
controls. Those negative fixture results are expected checks within their
successful control suite, not additional failures of the real TypeScript job.

The [bounded resolver comparison](ordinary-resolver-allocation.md) does not
qualify its shared-scope candidate; it remains uninstalled. Complete sources,
native TypeScript 5.9.3 selections, both CST phases, inverses, CPU/allocation
profiles and resource receipts remain available with the terminal CI evidence.
These observations establish no executable application gain, green gate,
complete translation, runtime parity or all-tool privacy guarantee. The required
generation, receiving deadlines, strict parity and full same-SHA checks remain
unfinished. No Rust tool has run locally.
