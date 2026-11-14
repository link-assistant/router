# Workflow diagnostic source equation

[PR #785](https://github.com/link-assistant/router/pull/785) publishes complete
translation child-compiler diagnostics through an environment field on the
original receiving step. The owning matrix-workflow generator lacked that
field. Current CI run 42529550250, lint job 128880488960, fails at downloaded
log lines 448–477 with `Complete matrix custody workflow source differs`.

The generator's repository rules now derive the exact existing environment
field from the whole historical workflow. Both original CST phases and the
complete inverse remain required. The existing complete-source regression also
refuses omission or disabling of the diagnostic setting. Actual workflow bytes,
commands, deadlines, stage dependencies and fatal failure behavior stay exact.

The complete 37-case Node file reproduces the failure before repair (36 passes,
one failure, 32.799 seconds observed). After repair all 37 pass (32.402 seconds
observed; peak sampled cgroup memory 2,205,696,000 bytes). Node is 20.20.2 with
an inherited 512 MiB old-space limit. No observer guard was reached.

An additional complete Bun 1.4.4 `--smol` run has 36 passes and one failure:
`every JavaScript stage and command is mandatory and cannot skip or ignore
failures` takes 5578.66 ms, exceeding Bun's original implicit 5000 ms deadline.
The workflow-equation case itself passes. This optional engine comparison is
failed and does not qualify the complete Bun control file. CI's lint control
file runs under Node; no deadline was increased or case filtered.

The [whole receiving packet](evidence/current-workflow-equation.json.gz)
retains complete original/current source, all three whole reports and resource
receipts, and every attempted current lint-log response. Its readback verifies
every member's full length and SHA256. The active CI head remains fixed at
`764222b6e6d4f0ce1efb0341396cfb6a87661e85`; this source repair has not yet
received a fresh complete gate or CI cycle. No Rust tool ran.
