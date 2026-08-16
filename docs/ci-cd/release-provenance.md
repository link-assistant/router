# Release provenance: every artifact is built from the tag commit

## The failure this prevents

`v0.77.0` published an image whose OCI metadata disagreed with its own version:

```text
org.opencontainers.image.version  = 0.77.0
org.opencontainers.image.revision = 5d12735630a9d5168e2472e54367ce59dfa86dcb
refs/tags/v0.77.0 -> tag 62cdfbd... -> commit c36818b5386486ab74b88740f683076e4015c750
```

`5d127356` is the merge commit that *triggered* the release run; `c36818b5` is the
`chore: release v0.77.0` commit the automation created during that run. A consumer could
not prove the image content came from the tagged source (issue
[#191](https://github.com/link-assistant/router/issues/191)).

Root cause: `docker/metadata-action` derives `org.opencontainers.image.revision` from the
workflow context (`github.sha`). On a release run that context is frozen at the commit that
started the run, which is always one commit *before* the release commit — even though the
build jobs themselves check out the tag.

## The invariant

1. `create-github-release` resolves `refs/tags/vX.Y.Z^{commit}` (peeling the annotated tag)
   and publishes it as the `release-commit` job output.
2. Every packaging job — both image architectures, all four binary targets, the manifest
   job, and the macOS lifecycle check — checks out that commit by SHA and asserts
   `git rev-parse HEAD` equals it. Only the release-creating job resolves the mutable tag ref.
3. Image labels pin `org.opencontainers.image.revision` to the resolved commit, and each
   build verifies the pushed config carries it before the digest is tagged.
4. `scripts/check-release-provenance.rs` runs after publication and compares the resolved
   tag commit against the labels of **both** platform manifests in both registries, the
   checksum files, and the SLSA provenance attestation of every downloadable archive.
5. The same guard runs daily from `.github/workflows/verify-releases.yml` against the newest
   release, so drift is caught even if a run was patched afterwards.

`scripts/check-release-workflow.rs` asserts these wiring rules statically, and the lint job
runs it on every pull request.

## Checksum files are verifiable where they land

The `*.sha256` assets used to record `dist/…` paths, so the documented
`sha256sum -c link-assistant-router-<version>-<platform>.sha256` failed with
`No such file or directory` in the flat directory `gh release download` creates — the digests
were right, the paths were not. Checksums are now generated from inside `dist/`, so the names
are flat, the packaging job runs `sha256sum -c` immediately, and the post-publication guard
re-runs it on the actually downloaded assets.

## Verifying a release yourself

```bash
VERSION=0.78.0
git fetch --tags
git rev-parse "refs/tags/v${VERSION}^{commit}"

# Image revision, per platform
docker buildx imagetools inspect "ghcr.io/link-assistant/router:${VERSION}" \
  --format '{{json .Image}}' | jq '.[].config.Labels["org.opencontainers.image.revision"]'

# Binaries
gh release download "v${VERSION}" --repo link-assistant/router --dir published
(cd published && sha256sum -c ./*.sha256)
gh attestation verify published/*.tar.gz --repo link-assistant/router
```

## v0.77.0

`v0.77.0` is left as published: replacing an immutable artifact in place would change digests
that users may already have pinned. The next release built by this pipeline carries the
correct revision label and flat checksum files; verify `0.77.0` against
`c36818b5386486ab74b88740f683076e4015c750` manually and prefer a later version when
attestation-based verification is required.
