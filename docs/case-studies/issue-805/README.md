# Issue 805: `v1.25.4` registry publication fails (npm ENEEDAUTH, PyPI verifier)

Issue: [#805](https://github.com/link-assistant/router/issues/805).
Delivery: [PR #808](https://github.com/link-assistant/router/pull/808).
Research date: 2026-11-26 UTC.

## Symptom

Release run [45694212338](https://github.com/link-assistant/router/actions/runs/45694212338)
(`workflow_dispatch` on tag `v1.25.4`, commit `a7cdf3248580ee2243eb6ba9a7454a52cc134566`)
passed every artifact, provenance and macOS lifecycle gate. Two jobs failed:

| Job | First error |
| --- | --- |
| `Publish verified npm package` ([139529845326](https://github.com/link-assistant/router/actions/runs/45694212338/job/139529845326)) | `npm error code ENEEDAUTH` at `npm publish` |
| `Publish verified Python package` ([139529845233](https://github.com/link-assistant/router/actions/runs/45694212338/job/139529845233)) | `ValueError: expected the exact attested Python wheel and sdist` after a successful upload |

`Publish complete stable release` needs both jobs, so it was skipped. The
crate was not published and the GitHub release is still a prerelease.

The issue reports only the npm failure. Its acceptance criterion says that
`finalize-release` must be able to promote the release, and that job also
needs `publish-python`. So the PyPI failure is fixed here as well.

## Root cause 1: npm first publication has no credential

The job log shows `NODE_AUTH_TOKEN:` empty in the step environment, so
`secrets.NPM_TOKEN` is not configured. On 2026-11-26 the registry still
returned 404 for both the package and the scope listing entry:

```text
$ curl -s -o /dev/null -w "%{http_code}\n" https://registry.npmjs.org/@link-assistant%2frouter
404
$ curl -s https://registry.npmjs.org/-/org/link-assistant/package
{"@link-assistant/agent":"write", ... }   # no @link-assistant/router
```

[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) is
configured in the settings of a package that already exists. A package that
has never been published therefore cannot be created through OIDC. Without
a token, `npm publish` has no credential and reports `ENEEDAUTH`. This is the
same bootstrap blocker as #713, and it is still unresolved.

Only an npm owner of the `@link-assistant` scope can fix this. GitHub-only
credentials cannot create the package. While preparing this PR, `npm whoami`
on the development machine also reported `ENEEDAUTH`, and no `NPM_TOKEN`
secret was visible on the repository.

### Change

- `publish-npm` gains a `Require npm publication authority` step before
  `npm publish`, which runs `scripts/registry-distributions.py npm --publish-preflight`.
  If the package returns 404 and `NPM_TOKEN` is empty, the step fails with a
  GitHub error annotation titled `npm first-publish bootstrap required (issue #805)`.
  The annotation lists the exact steps, including the ready-to-run retry
  command for this run (`-f source_run=<this run id>`). An existing
  package or a configured bootstrap token lets publication continue. Other
  registry errors still fail the step, so they are never read as "missing".
- `scripts/bootstrap-npm-package.sh VERSION [--publish]` is for an npm owner
  who uses `npm login` + MFA instead of a token. It resolves the tag commit,
  downloads `link-assistant-router-VERSION.tgz` from the GitHub release and
  verifies its attestation with `--source-digest`. It checks the manifest
  identity, skips if identical bytes are already published, and runs
  `npm publish --dry-run` unless `--publish` is given. After publishing it
  runs the production byte/integrity/install verifier. It never builds or
  packs anything.

Dry run against the real `v1.25.4` asset, 2026-11-26 (log in
`experiments/issue-805/bootstrap-dry-run.log`):

```text
Release v1.25.4 is tagged at a7cdf3248580ee2243eb6ba9a7454a52cc134566
npm notice package: @link-assistant/router@1.25.4
npm notice integrity: sha512-AGPa01t8olZfC[...]K2OXDAoxJCcvw==
npm warn publish This command requires you to be logged in to https://registry.npmjs.org/ (dry-run)
+ @link-assistant/router@1.25.4
Verified link-assistant-router-1.25.4.tgz. Rerun with --publish after npm login to publish it.
```

`gh attestation verify` accepted the genuine asset (exit 0). When one byte
was appended to the asset, the same check rejected it (exit 1).

## Root cause 2: PyPI attestation files counted as distributions

The Python job log shows that `pypa/gh-action-pypi-publish` generated digital
attestations and wrote them next to the distributions:

```text
/github/workspace/dist/link_assistant_router-1.25.4-py3-none-any.whl.publish.attestation
/github/workspace/dist/link_assistant_router-1.25.4.tar.gz.publish.attestation
Uploading link_assistant_router-1.25.4-py3-none-any.whl  200 OK
Uploading link_assistant_router-1.25.4.tar.gz            200 OK
```

The next step, `registry-distributions.py python`, globbed
`link_assistant_router-1.25.4*`. That matched four files, so it raised
`expected the exact attested Python wheel and sdist`. The probe run before
publication saw only the two downloaded files, so the bug appears only after
a successful upload. `1.25.4` is the first PyPI release of the project
(`https://pypi.org/pypi/link-assistant-router/json` lists only `1.25.4`),
which is why the post-publication path had never run before.

### Change

`python_distribution_assets` now selects exactly one
`link_assistant_router-VERSION-*.whl` and `link_assistant_router-VERSION.tar.gz`.
It ignores other files and still fails when the wheel or the sdist is missing,
when there are two wheels, or when only a different version such as
`1.25.40` is present.

Before/after on the real `v1.25.4` GitHub assets plus the two attestation
file names (`experiments/issue-805/pypi-verifier-before-after.log`):

```text
--- before fix:
ValueError: expected the exact attested Python wheel and sdist
--- after fix:
present=true
```

The full post-publication command (byte and SHA-256 comparison against
PyPI, then `pip install link-assistant-router==1.25.4` and import) also
passes locally. It printed `Verified registry hashes and ordinary
exact-version python install` (`experiments/issue-805/pypi-full-verify.log`).

## Automated regression

`experiments/issue-805/test-registry-bootstrap.py` runs in the release
workflow's `Test release automation` step. It runs offline and checks the
following:

- the preflight's missing-package/no-token refusal and all instructions in
  its message, including the version and source run;
- that the preflight passes with a bootstrap token or an existing package;
- that a registry error is not treated as a missing package;
- the real CLI's `::error` annotation and exit codes, with `urlopen` stubbed
  to return 404;
- Python asset selection with attestation byproducts present, plus the
  missing, ambiguous and wrong-version refusals;
- the workflow order probe → preflight → `npm publish`, and that the
  bootstrap script verifies attestations and contains no build or pack
  command.

## Remaining human actions (blocked for automation)

The issue's npm acceptance criteria need registry-side ownership that this
repository's automation does not have:

1. An npm owner of `@link-assistant` either stores a granular token with
   read and write access to the scope as `NPM_TOKEN`, or runs
   `scripts/bootstrap-npm-package.sh 1.25.4 --publish` after `npm login`.
2. After this PR is merged, retry the existing release without rebuilding:

   ```sh
   gh workflow run release.yml --repo link-assistant/router --ref main \
     -f release_mode=retry-registries -f release_version=1.25.4 \
     -f source_run=45694212338 -f bump_type=patch
   ```

   `prepare-registry-retry` accepts this source run: it is a
   `workflow_dispatch` run on `v1.25.4` at the tag commit, and both of its
   gates succeeded. PyPI is already present with matching bytes, so that job
   skips the upload and runs the fixed verifier.
3. Add the npm trusted publisher (organization `link-assistant`, repository
   `router`, workflow `release.yml`, no environment). Publish the next
   release through OIDC within npm's validation window, then remove
   `NPM_TOKEN` and revoke the token.

Until step 1 is done, `npm install @link-assistant/router@1.25.4` keeps
failing with 404. The release workflow on `main` now fails with the explicit
bootstrap error instead of `ENEEDAUTH`.
