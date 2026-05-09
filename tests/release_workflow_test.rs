use std::fs;

#[test]
fn release_workflow_maps_crates_io_token_fallback_to_cargo_native_env() {
    let workflow = fs::read_to_string(".github/workflows/release.yml")
        .expect("release workflow should be readable");

    let mapping =
        "CARGO_REGISTRY_TOKEN: ${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}";
    assert!(
        workflow.contains(mapping),
        "release workflow should support both CARGO_REGISTRY_TOKEN and CARGO_TOKEN secrets"
    );
    assert_eq!(
        workflow.matches(mapping).count(),
        3,
        "global env plus both publish jobs should use Cargo's native token variable"
    );
    assert!(
        !workflow
            .contains("CARGO_TOKEN: ${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}"),
        "workflow should not map fallback secrets only to the non-native CARGO_TOKEN env var"
    );
}

#[test]
fn release_workflow_adds_crates_io_link_to_github_releases() {
    let workflow = fs::read_to_string(".github/workflows/release.yml")
        .expect("release workflow should be readable");
    let release_script = fs::read_to_string("scripts/create-github-release.rs")
        .expect("release script should be readable");

    let crates_url_arg = "--crates-io-url \"https://crates.io/crates/link-assistant-router\"";
    assert_eq!(
        workflow.matches(crates_url_arg).count(),
        2,
        "auto and manual GitHub releases should include the crates.io package URL"
    );
    assert!(
        release_script
            .contains("https://img.shields.io/crates/v/link-assistant-router.svg?label=crates.io"),
        "release notes should render a visible crates.io badge"
    );
}

#[test]
fn readme_exposes_release_status_badges() {
    let readme = fs::read_to_string("README.md").expect("README should be readable");

    assert!(
        readme
            .contains("https://img.shields.io/crates/v/link-assistant-router.svg?label=crates.io"),
        "README should show the crates.io version badge"
    );
    assert!(
        readme.contains("https://img.shields.io/docsrs/link-assistant-router?label=docs.rs"),
        "README should show the docs.rs badge"
    );
}
