## Problem

GitHub-hosted runners start every job on a fresh machine, so a tool installed in one job does not exist in any other. Nothing in the template checks that **each job** installs the tools it runs. The existing test `rust_script_is_installed_through_the_retrying_locked_helper` (`tests/unit/ci-cd/workflow_release.rs:693-718`) matches the install snippet against the whole workflow file. It keeps passing when a job's install step is deleted, as long as some other job still installs the tool.

This has already broken a downstream release. In link-assistant/router, `publish-release-artifacts` ran `rust-script scripts/upload-release-assets.rs` without installing rust-script. All four platform legs exited 127 and v1.15.0 shipped with **no binaries**. The router's equivalent file-wide snippet check stayed green ([run 36764352534](https://github.com/link-assistant/router/actions/runs/36764352534), [issue #648](https://github.com/link-assistant/router/issues/648)).

## Reproduction (template at e7d4a5b)

```bash
git clone https://github.com/link-foundation/rust-ai-driven-development-pipeline-template.git
cd rust-ai-driven-development-pipeline-template
# Delete the changelog job's install step (release.yml lines 185-187)
sed -i '185,187d' .github/workflows/release.yml
cargo test --test unit rust_script_is_installed_through_the_retrying_locked_helper
```

Result: `test result: ok. 1 passed`. The workflow is now broken: on a pull request, the `changelog` job runs `rust-script scripts/check-changelog-fragment.rs` on a runner without rust-script, and the step exits 127.

## Workaround

Review `run:` lines by hand per job. Better, run a per-job checker such as router's [`scripts/check-workflow-tools.rs`](https://github.com/link-assistant/router/blob/issue-648-f0f8796b5ed2/scripts/check-workflow-tools.rs), which needs only the standard library. On the tree above it reports:

```
Error: .github/workflows/release.yml: job `changelog` runs rust-script on line 188 but never installs it: run: rust-script scripts/check-changelog-fragment.rs
```

On the pristine template it passes: `every one of 34 jobs in 5 workflows installs the tools it runs`. It already recognises `./scripts/install-rust-script.sh` and `taiki-e/install-action` `tool:` lists, so no false positives.

## Suggested fix

Split each workflow into jobs (the two-space keys under `jobs:`). For every non-preinstalled tool (`rust-script`, `cargo-llvm-cov`, `cargo-audit`, `cargo-cyclonedx`, `sccache` via `RUSTC_WRAPPER`), require an install line **earlier in the same job** than the first non-comment use, and run the check in `workflows.yml`. Version probes (`tool --version`) and lines that install conditionally (`command -v x || cargo install x`) are not uses. The router implementation and its eight unit tests can be copied as-is.
