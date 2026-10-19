//! Release publication must wait for all required artifacts (#687).

fn job<'a>(workflow: &'a str, name: &str) -> &'a str {
    let marker = format!("\n  {name}:\n");
    let start = workflow
        .find(&marker)
        .unwrap_or_else(|| panic!("missing job {name}"));
    let rest = &workflow[start + marker.len()..];
    let end = rest
        .match_indices("\n  ")
        .find(|(index, _)| {
            rest[index + 3..].starts_with(|character: char| character.is_ascii_lowercase())
        })
        .map_or(rest.len(), |(index, _)| index);
    &rest[..end]
}

#[test]
fn crate_and_stable_release_wait_for_verified_artifacts() {
    let contents = std::fs::read_to_string(".github/workflows/release.yml")
        .unwrap()
        .replace("\r\n", "\n");
    let workflow = contents.as_str();
    for preparation in ["auto-release", "manual-release", "create-github-release"] {
        assert!(!job(workflow, preparation).contains("scripts/publish-crate.rs"));
        assert!(!job(workflow, preparation).contains("--prerelease=false"));
    }
    assert!(job(workflow, "create-github-release").contains("--prerelease true"));
    let publish = job(workflow, "finalize-release");
    for required in [
        "publish-docker-manifests",
        "publish-release-artifacts",
        "verify-release-provenance",
    ] {
        assert!(publish.contains(&format!("needs.{required}.result == 'success'")));
    }
    assert!(publish.contains("scripts/publish-crate.rs"));
    assert!(publish.contains("--prerelease=false --latest"));
}

#[test]
fn pull_requests_build_the_real_amd64_runtime_without_pushing() {
    let workflow = std::fs::read_to_string(".github/workflows/docker-build.yml").unwrap();
    for input in [
        "Cargo.toml",
        "Dockerfile",
        "benches/**",
        "scripts/docker-cache-targets.py",
    ] {
        assert!(workflow.contains(input), "{input}");
    }
    assert!(workflow.contains("platforms: linux/amd64"));
    assert!(workflow.contains("push: false"));
    assert!(workflow.contains("target: runtime"));
}
