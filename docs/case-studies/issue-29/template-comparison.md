# CI/CD Template Comparison

The issue asked for a comparison against these template repositories:

- `link-foundation/js-ai-driven-development-pipeline-template`
- `link-foundation/rust-ai-driven-development-pipeline-template`
- `link-foundation/python-ai-driven-development-pipeline-template`
- `link-foundation/csharp-ai-driven-development-pipeline-template`

Snapshots from those repositories are preserved under `raw/`.

## Findings

| Area | Router before fix | Template comparison | Conclusion |
| --- | --- | --- | --- |
| GitHub release creation | `scripts/create-github-release.rs` used a positive look-ahead in a Rust regex to find the end of a changelog section. | Current Rust template uses a version-heading regex plus a second next-section regex. | Router had drifted from the corrected Rust template. |
| Changelog parser regression coverage | Router had workflow/script structure tests but no test that rejected unsupported Rust regex look-around in the release helper. | Rust template includes changelog parsing coverage for middle, last, missing, dotted, and empty sections. | Router needed a local regression guard for this failure mode. |
| JavaScript template | Not directly comparable because router uses Rust for the release helper. | JS template uses JavaScript `.mjs`; look-ahead syntax is valid in JavaScript regex engines. | The CI failure is not a JS template bug. |
| Python template | Not directly comparable because router uses Rust for the release helper. | Python template release helper does not exercise Rust's `regex` crate. | The CI failure is not a Python template bug. |
| C# template | Uses a JavaScript release helper script. | JavaScript regex semantics differ from Rust's `regex` crate. | The CI failure is not a C# template bug. |

## Upstream Decision

No upstream template issue was opened. The current Rust template already fixed the unsupported look-ahead
parser and includes a case-study entry for the same class of failure. The corrective action for router is
to align its release helper with the fixed Rust template behavior and keep a local regression test.

## Saved Template Inputs

- `raw/rust-template-create-github-release.rs`
- `raw/rust-template-changelog-parsing-test.rs`
- `raw/rust-template-release.yml`
- `raw/js-template-create-github-release.mjs`
- `raw/js-template-release.yml`
- `raw/python-template-create-github-release.py`
- `raw/python-template-release.yml`
- `raw/csharp-template-create-github-release.mjs`
- `raw/csharp-template-release.yml`
- `raw/*-template-file-tree.txt`
