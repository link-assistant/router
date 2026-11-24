# Receiving source paths and exact imports

[Completed CI run 42488211459](https://github.com/link-assistant/router/actions/runs/42488211459)
at published head `10fd7f0da82df707f90b16eb892e8e520f699654` retained two
fixture setup failures in job 128754637474. The full job log remains in
[the completed-cycle containers](evidence/ci-10fd/).

The Display fixture used `git show HEAD:src/...` after Router's physical source
move. Both lookups now use the existing repository layout helper, retaining the
full HEAD originals and original logical carrier labels. Complete source-body
selection, checked compilation and runtime comparisons are unchanged. The cold
parser fixture expected four imports from the private parser even though the
source-equation API added a fifth. Its exact count is now five; every import is
relocated and the complete source inverse/readback and zero-callback hook
comparisons remain mandatory.

The complete two-file Node 20.20.2 run passes all 16 cases in 114.598 seconds.
Its independent deadline audit passes with zero breaches and a closed process
group. The sampled total cgroup peak is 2,629,902,336 bytes; the resource observer
did not stop it. Installed TypeScript is 5.9.3; the original typed behavior cases
invoke its complete strict compiler.

The same complete two files under Bun 1.4.4 pass 12 cases and fail four Display
cases at Bun's original 5,000 ms default. The sampled total cgroup peak is
2,781,745,152 bytes with no resource stop. The full failed output is retained.
No deadline was raised and there was no unchanged retry. Original Display
performance under Bun and CI's pinned Bun 1.4.3 remain unqualified.

Newly executable production functions: **zero**. Missing owned outputs, strict
parity, generation/freshness, full-gate and current-head CI remain unfinished.
No Rust tool was invoked. These are scoped fixture repairs in
[PR #785](https://github.com/link-assistant/router/pull/785), not a completion claim.
