# Add an opt-in native JavaScript-first gate and one coordinator push policy

The current template has no reusable strict native JavaScript/parity/regeneration prerequisite for mixed-language Rust pipelines, and no root AGENTS.md defining one coordinator-owned push per validated batch. [router#759](https://github.com/link-assistant/router/issues/759) requires these shared practices.

The proposed additive patch supplies a callable workflow with required real check commands, exact tested revision output and no Rust build. It adds contributor/agent guidance for full-feature inventories, explicit carried-code blockers, pinned deterministic translation, same-revision gate dependencies, bounded builds and uninterrupted release writers. It does not claim to implement a JavaScript port of the Rust-only sample.

Acceptance: a mixed-language caller must show failing/skipped JS or strict parity prevents every Rust job, generated drift fails, all downstream checkouts match tested-sha, and one active writer cannot be cancelled by superseded read-only checks. Configure real repo commands and wire downstream needs before reporting adoption complete.

Existing open issues search: no results at research capture; recheck before creating.

## Reproduction and current workaround

Pinned audited source: [js-ai-driven-development-pipeline-template 0a62b80544ad](https://github.com/link-foundation/js-ai-driven-development-pipeline-template/blob/0a62b80544ad0a01e97feb800cf7494c190abc8d/.github/workflows/release.yml). Inspect jobs and needs in that workflow, then search `git ls-files AGENTS.md` and `rg "JavaScript.first|strict.*parity|single.*push" .github/workflows CONTRIBUTING.md docs`. The release pipeline supplies language checks but no callable native-JS-plus-strict-parity-plus-regeneration prerequisite or root one-pusher policy. Keep incomplete ports labelled blocked; do bounded native JavaScript checks locally before a coordinator push while migrating.

## Concrete fix and testable requirements

Apply the proposed patch, configure actual caller commands and add needs on the gate to all Rust compilation, tests, package, container and publishing paths. Use the output tested-sha for each downstream checkout. Exercise failing and skipped JS, missing/partial/carried parity entries and generated target drift; each must prevent all downstream Rust jobs. An unchanged complete inventory must permit them at exactly the tested revision. Policy must require bulk editing, one pushing coordinator, validated exact candidate revision, and one push after collecting all prior CI failures. Keep active release writer cancellation disabled.

Proposed patch source: `docs/case-studies/issue-759/proposals/js-ai-driven-development-pipeline-template.patch` in the Router research branch. The Router pull request will provide the eventual reviewable file permalink; no attachment is implied.

Minimal caller showing the required dependency (supply actual project commands):

```yaml
jobs:
  javascript-first:
    uses: ./.github/workflows/javascript-first-gate.yml
    with:
      source-sha: ${{ github.sha }}
      javascript-command: npm ci && npm test
      parity-command: node scripts/check-parity.mjs --strict
      translation-command: node scripts/generate-rust.mjs --check
  rust:
    needs: javascript-first
    if: needs.javascript-first.result == 'success'
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          ref: ${{ needs.javascript-first.outputs.tested-sha }}
      # Existing toolchain/setup and Rust steps follow only after this gate.
```

The parity/generator command names above illustrate the caller contract; they are not existing template files and must be replaced by implemented repository tools. A skipped prerequisite must leave rust skipped, and a deliberately failing native JS test must prevent toolchain setup.

The callable gate requires an immutable forty-character source-sha, checks HEAD against it before and after all checks, and uses pinned checkout/setup-node action revisions already established by Router. Release callers must pass the generated candidate source revision rather than infer the default event revision.
