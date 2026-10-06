from pathlib import Path
p=Path('.github/workflows/release.yml'); s=p.read_text().replace('          - recover\n', '          - recover\n          - publish\n')
# Prepare the release in the original run, then dispatch the same workflow
# at the immutable tag. Only the tag-context invocation may package/publish.
a=s.index('  create-github-release:'); b=s.index('  publish-release-artifacts:',a)
t=s[a:b]
t=t.replace("(needs.manual-release.result == 'success' && needs.manual-release.outputs.should-release == 'true')", "(needs.manual-release.result == 'success' && needs.manual-release.outputs.should-release == 'true') ||\n        (github.event_name == 'workflow_dispatch' && github.event.inputs.release_mode == 'publish' && startsWith(github.ref, 'refs/tags/v'))")
t=t.replace('release-version: ${{ needs.auto-release.outputs.release-version || needs.manual-release.outputs.release-version }}', 'release-version: ${{ steps.tag-commit.outputs.version }}')
t=t.replace('      contents: write\n', '      contents: write\n      actions: write\n')
t=t.replace('    steps:\n      - uses:', '''    steps:
      - name: Resolve publishing version from tag context
        if: github.event.inputs.release_mode == 'publish'
        shell: bash
        run: echo "RELEASE_VERSION=${GITHUB_REF_NAME#v}" >> "$GITHUB_ENV"
      - uses:''')
t=t.replace('          echo "commit=$commit" >> "$GITHUB_OUTPUT"', '          echo "commit=$commit" >> "$GITHUB_OUTPUT"\n          echo "version=$RELEASE_VERSION" >> "$GITHUB_OUTPUT"')
t=t.replace('      - name: Setup Rust\n', '''      - name: Dispatch publishing with the release tag as source
        if: github.event.inputs.release_mode != 'publish'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: >-
          gh workflow run release.yml --repo "${{ github.repository }}"
          --ref "v${RELEASE_VERSION}" -f release_mode=publish -f bump_type=patch

      - name: Setup Rust
''')
# Initial invocation may create/update a prerelease, but never promote/build.
s=s[:a]+t+s[b:]
s=s.replace("if: always() && !cancelled() && needs.create-github-release.result == 'success'", "if: always() && !cancelled() && needs.create-github-release.result == 'success' && github.ref == format('refs/tags/v{0}', needs.create-github-release.outputs.release-version)")
s=s.replace('--repo "${{ github.repository }}"\n          done', '--repo "${{ github.repository }}" --source-ref "refs/tags/v${RELEASE_VERSION}" --source-digest "${RELEASE_COMMIT}"\n          done')
s=s.replace('run: gh attestation verify "oci://ghcr.io/${{ github.repository }}@${{ steps.build-image.outputs.digest }}" --repo "${{ github.repository }}"', 'run: gh attestation verify "oci://ghcr.io/${{ github.repository }}@${{ steps.build-image.outputs.digest }}" --repo "${{ github.repository }}" --source-ref "refs/tags/v${RELEASE_VERSION}" --source-digest "${RELEASE_COMMIT}"')
s=s.replace('          target: ${{ matrix.target }}\n          platforms:', '          target: ${{ matrix.target }}\n          build-args: ROUTER_SOURCE_COMMIT=${{ env.RELEASE_COMMIT }}\n          platforms:')
# Consumer gate verifies every asset, including checksums/SBOMs, and every
# architecture's recorded digest artifact from the image build jobs.
a=s.index('      - name: Verify every artifact points at the release tag commit')
s=s[:a]+'''      - name: Download architecture digests for strict attestation verification
        uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
        with:
          pattern: runtime-*
          path: image-digests
          merge-multiple: true

      - name: Verify tagged source of every published asset and image architecture
        shell: bash
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          for artifact in published/*; do
            gh attestation verify "$artifact" --repo "${{ github.repository }}" --source-ref "refs/tags/v${RELEASE_VERSION}" --source-digest "${RELEASE_COMMIT}"
          done
          for digest in image-digests/*; do
            gh attestation verify "oci://ghcr.io/${{ github.repository }}@sha256:${digest##*/}" --repo "${{ github.repository }}" --source-ref "refs/tags/v${RELEASE_VERSION}" --source-digest "${RELEASE_COMMIT}"
          done

''' + s[a:]
p.write_text(s)
p=Path('scripts/check-release-provenance.rs'); s=p.read_text(); a=s.index('//! Image labels are'); b=s.index('//! Usage:',a); s=s[:a]+'''//! Publishing is dispatched at the immutable tag, so provenance must name the
//! exact tag ref and commit. The pre-release merge commit is never acceptable.
//!
'''+s[b:]
a=s.index('/// Decide whether an attestation'); b=s.index('fn resolve_tag_commit',a); s=s[:a]+'''/// Only the exact release commit is acceptable; no predecessor exception.
fn attested_commit_is_acceptable(
    commits: &BTreeSet<String>,
    expected: &str,
    _parent: Option<&str>,
) -> bool {
    commits.contains(expected)
}

'''+s[b:]
a=s.index('    // Attestations record'); b=s.index('    for image',a); s=s[:a]+s[b:]; s=s.replace('tag_parent.as_deref()', 'None'); s=s.replace('fn attestation_json(artifact: &Path, repository: &str)', 'fn attestation_json(artifact: &Path, repository: &str, version: &str, commit: &str)'); s=s.replace('            "--format",\n            "json",', '            "--source-ref",\n            &format!("refs/tags/v{version}"),\n            "--source-digest",\n            commit,\n            "--format",\n            "json",'); s=s.replace('attestation_json(path, repository)', 'attestation_json(path, repository, &options.release_version, &expected_commit)'); a=s.index('                    match &tag_parent'); b=s.index('\n                )),',a); s=s[:a]+'                    String::new()'+s[b:]; p.write_text(s)
p=Path('Dockerfile'); s=p.read_text().replace('# Touch files to invalidate cache for source changes', 'ARG ROUTER_SOURCE_COMMIT=unknown\nENV ROUTER_SOURCE_COMMIT=${ROUTER_SOURCE_COMMIT}\n\n# Touch files to invalidate cache for source changes'); p.write_text(s)
