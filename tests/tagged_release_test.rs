//! Publishing must attest exactly the immutable release source (#696).
#[test]
fn publishing_runs_in_the_tag_context_and_checks_ref_and_digest() {
    let workflow = include_str!("../.github/workflows/release.yml");
    assert!(workflow.contains("gh workflow run release.yml"));
    assert!(workflow.contains("--ref \"v${RELEASE_VERSION}\""));
    assert!(workflow.contains("github.ref == format('refs/tags/v{0}'"));
    assert!(workflow.contains("--source-ref \"refs/tags/v${RELEASE_VERSION}\""));
    assert!(workflow.contains("--source-digest \"${RELEASE_COMMIT}\""));
}
