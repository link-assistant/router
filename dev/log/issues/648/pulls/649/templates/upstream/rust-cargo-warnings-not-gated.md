## Problem

The template makes warnings fatal with `RUSTFLAGS: -Dwarnings` (release.yml:38) and `cargo clippy --all-targets --all-features`. That covers **rustc lints only**. Warnings that Cargo itself emits never change an exit status, for example:

- `warning: file `src/main.rs` found to be present in multiple build targets`
- `warning: unused manifest key: ...`
- `warning: ... is ignored, because ... (profile/feature/edition notices)`

A consumer repository can therefore print the same Cargo warning on every build for months behind a green check. This happened in link-assistant/router: two `[[bin]]` targets shared `src/main.rs` from 2026-08-19 until [router#648](https://github.com/link-assistant/router/issues/648), and every CI build printed the warning without anyone noticing.

## Reproduction

```bash
git clone https://github.com/link-foundation/rust-ai-driven-development-pipeline-template.git
cd rust-ai-driven-development-pipeline-template
cat >> Cargo.toml <<'TOML'

[[bin]]
name = "second-name"
path = "src/main.rs"
TOML
RUSTFLAGS=-Dwarnings cargo clippy --all-targets --all-features; echo "exit=$?"
# warning: Cargo.toml: file `.../src/main.rs` found to be present in multiple build targets:
# warning: `example-sum-package-name` (manifest) generated 1 warning
# exit=0
```

Verified on e7d4a5b: the lint command the template runs in CI exits 0 while Cargo reports the warning.

## Workaround

Check the build output yourself, or add `[lints]`. Note that `[lints]` also covers only rustc and clippy, not Cargo.

## Suggested fix

Add a lint step that fails on any Cargo warning line:

```yaml
- name: Fail on Cargo (manifest) warnings
  shell: bash
  run: |
    cargo check --locked --all-targets --all-features 2>&1 | tee /tmp/cargo-check.log
    if grep -E '^warning' /tmp/cargo-check.log; then
      echo "::error::cargo reported warnings"; exit 1
    fi
```

(`shell: bash` gives `-o pipefail`, so a failing `cargo check` still fails the step.) This is the gate router added in [PR #649](https://github.com/link-assistant/router/pull/649).
