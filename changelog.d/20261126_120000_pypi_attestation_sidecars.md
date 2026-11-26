---
bump: patch
---

### Fixed
- Release verification of the PyPI package no longer fails after a successful upload because of the `.publish.attestation` sidecar files that `pypa/gh-action-pypi-publish` writes into `dist/`. The verifier now selects only the attested wheel and sdist. It still fails when either is missing, when any other distribution is present, and when PyPI lists a yanked, missing, extra or mismatched distribution (issue #806).
