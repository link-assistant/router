# Merged-source delivery

PR checks and a merge do not establish publication. The read-only delivery
checker follows an exact merged SHA and fails until the release containing it
has verified artifacts:

```sh
git fetch origin main --tags
rust-script scripts/check-delivery.rs --source-sha MERGED_SHA --verify-artifacts
```

`target/verification/delivery.json` distinguishes `merged`,
`validated-candidate`, `partial-publication` and `delivered`, and includes run
timestamps/SHAs, workflow state, release identity, source ancestry, asset
digests, immutable image digest and an explicit recovery command. Omitting
`--verify-artifacts` cannot yield delivered. The scheduled/manual
`Merged Source Delivery` workflow saves this report without publishing.

A complete release requires all four platform archives, their SBOMs and
checksums, native executable versions, GitHub provenance/source agreement and
the two runtime image architectures at the recorded digest. Missing/disabled
triggers and failing checks produce actionable failure. A tag alone is
partial publication. A green PR with zero exact-SHA main runs remains merged.

An authorized operator can review the report and dispatch recovery:

```sh
gh workflow run release.yml --repo link-assistant/router --ref main -f release_mode=recover
```

Recovery runs main validation, reuses an existing HEAD version/tag and adds
missing GitHub asset names. Existing asset bytes are retained. Existing
versioned runtime manifests must pass provenance before `latest` is moved to
their immutable digest. Unknown registry inspection errors fail instead of
overwriting. A changed HEAD without an unconsumed release fragment is refused.
Conflicting partial artifact bytes require a reviewed resolution; recovery
does not silently overwrite them. Keep the existing changelog-driven version
process rather than editing Cargo versions in a PR.

GitHub documents suppression of most events created with `GITHUB_TOKEN` and
dispatch exceptions. This is one hypothesis for missing automatic handoff,
not an established cause of #633. Proving supported human/App/token merge
actors and interrupted publication requires an isolated acceptance repository.
The read-only checker and recovery unit tests do not establish those live
actor cases. See [the full requirement analysis](../plans/issue-642.md).
