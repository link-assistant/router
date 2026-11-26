---
bump: patch
---

### Fixed
- The PyPI post-publication check no longer rejects a correct upload. `pypa/gh-action-pypi-publish` leaves `*.publish.attestation` files in `dist/`, and the verifier counted them as distributions. It now selects exactly the wheel and the sdist. On `v1.25.4` this blocked stable promotion even though PyPI accepted both files (issue #805).
- If `@link-assistant/router` has never been published to npm and the `NPM_TOKEN` bootstrap secret is empty, `publish-npm` now stops before `npm publish`. Instead of npm's `ENEEDAUTH`, it shows a `npm first-publish bootstrap required` error listing the steps for the human owner. A new script, `scripts/bootstrap-npm-package.sh`, publishes the attested release tarball for an npm owner without rebuilding it (issue #805).
