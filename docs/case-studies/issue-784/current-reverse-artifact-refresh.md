# Regenerate the actual reverse artifacts

Published head `4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2` fails
[reverse freshness](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336046):
the actual generator reports eleven stale files at log line 289. Those complete
outputs were regenerated with `node scripts/regenerate-js-first.mjs --write`.
An independent `--check` then verified all 11,949,324 output bytes with zero
changed artifacts. No output was edited manually and no Rust tool ran.

The runtime projection now includes the two existing owned Unicode predicates;
the witness and manifest changes retain current complete source fingerprints.
Write and check each passed in 83.55/83.48 observed seconds, respectively, under
Node 20.20.2 and a 512 MiB heap. Peak sampled total cgroup use was
2,216,378,368/2,228,957,184 bytes; neither invocation reached the memory guard.

The [complete receipt](evidence/current-reverse-artifact-refresh.json.gz)
retains all six command/resource streams plus complete before/after byte and
Git-blob vectors for the eleven committed outputs. This establishes the actual
regeneration check for these contents. It does not qualify the other original
reverse tests, forward generation, strict parity, complete gate or Rust.
[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
