# Issue #806: PyPI verification false-failed after the 1.25.4 upload

## Timeline

- Release run [45694212338](https://github.com/link-assistant/router/actions/runs/45694212338)
  (`workflow_dispatch` on tag `v1.25.4`, commit `a7cdf3248`) ran job
  `Publish verified Python package` ([139529845233](https://github.com/link-assistant/router/actions/runs/45694212338/job/139529845233)).
- The pre-publication probe reported the version absent, so `pypa/gh-action-pypi-publish`
  uploaded both files. Its log shows the attestation step writing sidecars beside them:

  ```text
  ##[notice]Generating and uploading digital attestations
  /github/workspace/dist/link_assistant_router-1.25.4-py3-none-any.whl.publish.attestation
  /github/workspace/dist/link_assistant_router-1.25.4.tar.gz.publish.attestation
  ```

- The next step, `Verify PyPI hashes and ordinary exact-version install`, failed:

  ```text
  File "/home/runner/work/router/router/scripts/registry-distributions.py", line 95, in main
    raise ValueError("expected the exact attested Python wheel and sdist")
  ```

- `Publish complete stable release` was skipped because `publish-python` had failed.
  `publish-npm` also failed in the same run, with `npm error code ENEEDAUTH`. That
  failure is a separate problem, tracked in issue #805.

## Root cause

`scripts/registry-distributions.py` built the Python asset list with
`args.assets.glob(f"link_assistant_router-{version}*")` and required exactly two
matches. Before the upload, `dist/` held only the wheel and the sdist, so the probe
passed. After the upload, the same glob also matched both `.publish.attestation`
sidecars. That made four matches, and the verifier raised before it compared
anything with PyPI.

## Fix

`python_distribution_assets()` now looks at every file in the directory whose name ends with a
known distribution suffix (`.whl`, `.tar.gz`, `.zip`, and so on). It requires
exactly one `link_assistant_router-{version}-*.whl` and exactly
`link_assistant_router-{version}.tar.gz`, and no other distribution. Files without a
distribution suffix are ignored. These include `.publish.attestation` and any other
sidecar. Any extra distribution still fails closed, because the publish action
uploads every distribution in `packages-dir`. The exact-set, yanked and
byte/sha256 checks against PyPI in `python_identity()` are unchanged.

## Verification

- `python3 experiments/issue-715/test-release-retry.py`, which already runs in the
  release workflow, adds three regressions:
  - The wheel and sdist plus both sidecars are accepted, and a third distribution on
    PyPI is still rejected.
  - Missing, extra, other-version and other-format local distributions are rejected.
  - `main()` is driven exactly as the workflow runs it, with only the network
    replaced. Against the previous script, this test fails with the production error.
- A read-only check against the live registry. The real `v1.25.4` GitHub release
  wheel and sdist were placed in a directory together with `.publish.attestation`
  sidecars:
  - Old script: `ValueError: expected the exact attested Python wheel and sdist`.
  - Fixed script, `--probe`: `present=true`.
  - Fixed script, full mode: `Verified registry hashes and ordinary exact-version python install`
    (pip installs `link-assistant-router==1.25.4` from PyPI and imports `Router`).

## Recovering v1.25.4

PyPI already holds the exact 1.25.4 files with matching hashes. On any retry, the
probe therefore reports `present=true` and the publish action is skipped. No
sidecars are written, so republishing never happens. This applies to both ways of
retrying:

- Re-running the failed job of run 45694212338. This uses the tagged commit, whose
  old script also passes on a directory without sidecars.
- Dispatching `release_mode: retry-registries` with `release_version: 1.25.4` and
  `source_run: 45694212338` from `main`.

`finalize-release` also requires `publish-npm` to succeed. PR #808 (issue #805) made
that job fail early with the exact bootstrap steps, but publishing a package that has
never existed on npm still needs a human npm owner: either the `NPM_TOKEN` secret or
`scripts/bootstrap-npm-package.sh`. After that, a single `retry-registries` dispatch
completes both registries and the stable promotion.

## Relation to PR #808

PR #808 (issue #805) fixed the same sidecar bug independently with
`python_distribution_assets`. This change keeps that name and makes it stricter: any
extra local distribution in the directory (another wheel, another version, a `.zip`)
also fails closed, because the publish action would upload it too.
