## Problem

`scripts/install-rust-script.sh` installs rust-script without a version:

```bash
for attempt in 1 2 3; do
  if cargo install rust-script --locked; then
```

`--locked` pins rust-script's *dependencies* to its published `Cargo.lock`, but not rust-script itself. Each CI run gets whatever version was published most recently. A breaking or broken rust-script release (a changed `//! ```cargo` manifest syntax, cache layout or MSRV bump) would therefore fail every job that runs a script, on every branch at once, with no diff in this repository to bisect. The script's own header promises "reproducibly", which this line does not deliver.

Downstream, link-assistant/router pins `cargo install rust-script --version 0.36.0 --locked` and checks the pin in `scripts/check-release-workflow.rs` (found while comparing pipelines for [router#648](https://github.com/link-assistant/router/issues/648)).

## Reproduction (template at e7d4a5b)

```bash
git clone https://github.com/link-foundation/rust-ai-driven-development-pipeline-template.git
cd rust-ai-driven-development-pipeline-template
grep -n 'cargo install rust-script' scripts/install-rust-script.sh
# 16:  if cargo install rust-script --locked; then
```

The resolved version changes whenever crates.io receives a new rust-script release, even though the repository has not changed.

## Workaround

Set the version in the helper by hand: `cargo install rust-script --version 0.36.0 --locked`.

## Suggested fix

```bash
RUST_SCRIPT_VERSION="${RUST_SCRIPT_VERSION:-0.36.0}"
if command -v rust-script >/dev/null 2>&1 \
  && rust-script --version | grep -Fq "$RUST_SCRIPT_VERSION"; then
  echo "rust-script $RUST_SCRIPT_VERSION already present"; exit 0
fi
for attempt in 1 2 3; do
  if cargo install rust-script --version "$RUST_SCRIPT_VERSION" --locked --force; then exit 0; fi
  ...
```

Then extend `rust_script_is_installed_through_the_retrying_locked_helper` to assert `--version`. Dependabot or Renovate can bump the variable with a regex manager. `taiki-e/install-action` with `tool: rust-script@0.36.0` would be a faster alternative that installs a prebuilt binary.
