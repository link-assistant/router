## Problem

GitHub announced that `ubuntu-latest` moves from Ubuntu 24.04 to **Ubuntu 26.04 between 2026-10-19 and 2026-11-19** ([actions/runner-images#14748](https://github.com/actions/runner-images/issues/14748), GitHub changelog 2026-09-17). Every job on the alias already prints this annotation:

> The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026.

The template still uses the alias 34 times at e7d4a5b. Generated repositories inherit both the warning noise and an unreviewed change of OS, compilers and preinstalled tools on a date this repository does not control. In link-assistant/router the annotation appeared 26 times per CI run ([router#648](https://github.com/link-assistant/router/issues/648), [run 36764352534](https://github.com/link-assistant/router/actions/runs/36764352534)). The JS template already pinned the label in [js#193](https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/193).

## Reproduction

```bash
git clone https://github.com/link-foundation/rust-ai-driven-development-pipeline-template.git
cd rust-ai-driven-development-pipeline-template
grep -c ubuntu-latest .github/workflows/*.yml | grep -v ':0'
# desktop-release.yml:4  links.yml:2  release.yml:21  security.yml:4  workflows.yml:3
```

## Workaround

Replace `ubuntu-latest` with `ubuntu-24.04` (and `macos-latest` with `macos-26` if used) in `runs-on:` and matrix values.

## Suggested fix

Pin the labels as in js#193, and add a workflow-test assertion so the alias cannot come back. For example, in Rust:

```rust
for line in workflow.lines().filter(|l| !l.trim_start().starts_with('#')) {
    assert!(!line.contains("ubuntu-latest"), "pin the runner OS: {line}");
}
```

Move to `ubuntu-26.04` as a deliberate, reviewed change.
