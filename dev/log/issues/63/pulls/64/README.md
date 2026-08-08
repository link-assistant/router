# Issue 63 / Pull Request 64 evidence bundle

This directory preserves the evidence used to diagnose and fix issue 63. The files were captured on 2026-08-08 UTC.

- `github/`: complete issue, pull-request, comment/review-channel, related-work, run metadata, and pre-fix diff snapshots.
- `ci-logs/`: complete GitHub Actions logs, focused warning/error extracts, and local reproductions.
- `research/`: full file trees and CI/CD workflows from the Rust, JavaScript, and Python templates, the Hive Mind best-practices document, template commit history, and a workflow diff.
- `analysis.md`: requirements inventory, event reconstruction, root causes, decisions, and verification plan.
- `online-research.md`: authoritative external sources and evaluated supporting tools.

Empty JSON arrays are intentional: issue 63 and PR 64 had no comments, reviews, or inline review comments when collected.

The final implementation validation is Actions run `31268242910` at SHA
`694f9039ccd8451ebf34778531859f6f557613f8`; its complete log is
`ci-logs/ci-cd-31268242910.log` and its metadata is
`github/ci-run-31268242910.json`.
