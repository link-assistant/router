# Registry publisher bootstrap and exact-asset recovery

The GitHub `contents: write`/`id-token: write` permissions do not grant npm
scope ownership or register a PyPI publisher. A signed provenance statement
also does not grant npm publication permission.

For this repository the approved workflow identity is:

| Field | Value |
| --- | --- |
| GitHub owner | `link-assistant` |
| Repository | `router` |
| Workflow filename | `release.yml` (under `.github/workflows/`) |
| GitHub environment | **Unset**; both publishing jobs currently have no environment |
| npm package | `@link-assistant/router` |
| PyPI project | `link-assistant-router` |

Do not enter `pypi` as the environment unless the workflow and publisher
configuration are both changed to use that exact environment. For PyPI,
`invalid-publisher` means the valid OIDC token did not match a configured
publisher. See [PyPI troubleshooting](https://docs.pypi.org/trusted-publishers/troubleshooting/).

## Bootstrap

1. An approved npm scope owner must grant the publisher permission to
   `@link-assistant/router`. If the package does not yet exist, publish the
   already-attested exact tarball with an approved granular token that permits
   public package creation in this scope, then configure the package's trusted
   publisher. A first-publish token may be supplied as the repository secret
   `NPM_TOKEN`; normal releases use OIDC. Restrict/revoke that token after
   bootstrap. Use npm >=11.5.1 and Node >=22.14.0; CI uses Node 24. Configure
   direct `npm publish` permission in the trusted publisher, rather than only
   staged publication. See [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/).
2. The approved PyPI account owner must add a publisher with the fields above.
   If the project does not yet exist, add a [pending publisher](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/)
   with project name `link-assistant-router`. If it exists, add the publisher
   in project Publishing settings. No PyPI API token is required afterward.
3. Configure the repository's approved `CARGO_REGISTRY_TOKEN` (or legacy
   `CARGO_TOKEN`) for Rust publication. It is used only by the final
   publication job, after both registry installation/hash gates pass.

GitHub-only credentials cannot perform steps 1–2. An npm E404 is insufficient
to distinguish a missing package from insufficient scope permissions;
inspect the account's scope/package access instead of guessing an owner.

## Retry an existing release

After publisher configuration is repaired and this workflow is merged, run:

```sh
gh workflow run release.yml --repo link-assistant/router --ref main \
  -f release_mode=retry-registries -f release_version=1.18.2 \
  -f source_run=37578930768 -f bump_type=patch
```

The current approved workflow resolves the old immutable tag and verifies
that the supplied tagged run successfully completed both provenance and
macOS lifecycle gates. It downloads and reverifies the existing release's
attestations, archive checksums and image source identity. It never rebuilds,
reuploads or replaces those assets or changes the tag.

Each registry job checks the exact version before publishing. A 404 permits
publication of the attested distribution. An existing identical version
skips upload; registry network/auth errors or mismatched bytes fail. Python
must have both the exact wheel and source distribution. After publishing,
registry tarball/wheel/sdist bytes and metadata hashes must equal the
attested assets. Ordinary `npm install @link-assistant/router@VERSION` and
`pip install link-assistant-router==VERSION` plus import checks must succeed.

Only then does the final job publish the Rust crate, wait for exact crate
availability, and promote GitHub to stable/latest. Any registry error keeps
that job skipped and the prerelease intact. Do not use `--skip-existing` to
hide a different published distribution or promote a partially delivered
release manually.
