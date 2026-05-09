use std::fs;

#[test]
fn dockerfile_builder_uses_supported_rust_toolchain() {
    let dockerfile = fs::read_to_string("Dockerfile").expect("Dockerfile should be readable");
    let builder_tag = rust_builder_tag(&dockerfile).expect("Dockerfile should have a Rust builder");

    assert!(
        builder_tag.contains("bookworm"),
        "Rust builder image should stay on bookworm to match the runtime image"
    );
    assert!(
        rust_builder_tag_tracks_supported_toolchain(builder_tag),
        "Rust builder image `{builder_tag}` should use Rust 1.85+ or track the current Rust 1.x line"
    );
}

#[test]
fn dockerfile_builder_installs_native_tls_build_dependencies() {
    let dockerfile = fs::read_to_string("Dockerfile").expect("Dockerfile should be readable");
    let builder_stage =
        docker_builder_stage(&dockerfile).expect("Dockerfile should have a builder stage");
    let dependency_build = builder_stage
        .find("cargo build --release")
        .expect("builder stage should build dependencies before copying source");
    let setup = &builder_stage[..dependency_build];

    assert!(
        setup.contains("apt-get update"),
        "builder stage should refresh apt metadata before installing native build dependencies"
    );
    assert!(
        setup.contains("--no-install-recommends"),
        "builder stage should avoid recommended packages for a minimal image"
    );
    assert!(
        dockerfile_apt_installs(setup, "pkg-config"),
        "builder stage should install pkg-config so openssl-sys can locate OpenSSL"
    );
    assert!(
        dockerfile_apt_installs(setup, "libssl-dev"),
        "builder stage should install OpenSSL development headers for native TLS crates"
    );
    assert!(
        setup.contains("rm -rf /var/lib/apt/lists/*"),
        "builder stage should clean apt metadata after installing packages"
    );
}

#[test]
fn cargo_lock_package_version_matches_manifest() {
    let manifest = fs::read_to_string("Cargo.toml").expect("Cargo.toml should be readable");
    let lockfile = fs::read_to_string("Cargo.lock").expect("Cargo.lock should be readable");

    let manifest_version =
        package_version(&manifest).expect("Cargo.toml should declare a package version");
    let lockfile_version = lockfile_package_version(&lockfile, "link-assistant-router")
        .expect("Cargo.lock should contain the link-assistant-router package");

    assert_eq!(
        lockfile_version, manifest_version,
        "Cargo.lock package version should stay synced with Cargo.toml so cargo package does not dirty the checkout"
    );
}

#[test]
fn lockfile_package_version_handles_windows_line_endings() {
    let lockfile = "[[package]]\r\nname = \"dependency\"\r\nversion = \"1.1.4\"\r\n\r\n[[package]]\r\nname = \"link-assistant-router\"\r\nversion = \"0.13.0\"\r\n";

    assert_eq!(
        lockfile_package_version(lockfile, "link-assistant-router"),
        Some("0.13.0")
    );
}

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
    assert!(
        readme.contains(
            "https://img.shields.io/docker/v/konard/link-assistant-router?label=docker%20hub"
        ),
        "README should show the Docker Hub image version badge"
    );
}

#[test]
fn release_workflow_publishes_synced_docker_hub_image_after_crate() {
    let workflow = fs::read_to_string(".github/workflows/release.yml")
        .expect("release workflow should be readable");

    assert!(
        workflow.contains("DOCKERHUB_IMAGE: konard/link-assistant-router"),
        "workflow should publish the router image under the konard Docker Hub account"
    );
    assert_eq!(
        workflow
            .matches("password: ${{ secrets.DOCKERHUB_TOKEN }}")
            .count(),
        2,
        "auto and manual release jobs should authenticate to Docker Hub with DOCKERHUB_TOKEN"
    );
    assert_eq!(
        workflow.matches("username: konard").count(),
        2,
        "auto and manual release jobs should publish as the konard Docker Hub user"
    );
    assert_eq!(
        workflow.matches("docker/login-action@v4").count(),
        4,
        "auto and manual release jobs should log in to both GHCR and Docker Hub"
    );
    assert_eq!(
        workflow.matches("docker/metadata-action@v6").count(),
        2,
        "auto and manual release jobs should derive Docker metadata once for both registries"
    );
    assert_eq!(
        workflow.matches("docker/build-push-action@v7").count(),
        2,
        "auto and manual release jobs should push Docker images"
    );

    let auto_publish = workflow
        .find("- name: Publish to Crates.io")
        .expect("auto release should publish the crate");
    let auto_wait = workflow
        .find("- name: Wait for Crate availability on Crates.io")
        .expect("auto release should wait for the crate to be visible");
    let auto_docker = workflow
        .find("- name: Publish Docker images to registries")
        .expect("auto release should publish Docker images");
    let auto_github_release = workflow
        .find("- name: Create GitHub Release")
        .expect("auto release should create a GitHub release");

    assert!(
        auto_publish < auto_wait && auto_wait < auto_docker && auto_docker < auto_github_release,
        "auto release should publish crates.io first, then Docker images, then the GitHub release"
    );

    let manual_release = workflow
        .find("manual-release:")
        .expect("manual release job should exist");
    let manual_section = &workflow[manual_release..];
    let manual_publish = manual_section
        .find("- name: Publish to Crates.io")
        .expect("manual release should publish the crate");
    let manual_wait = manual_section
        .find("- name: Wait for Crate availability on Crates.io")
        .expect("manual release should wait for the crate to be visible");
    let manual_docker = manual_section
        .find("- name: Publish Docker images to registries")
        .expect("manual release should publish Docker images");
    let manual_github_release = manual_section
        .find("- name: Create GitHub Release")
        .expect("manual release should create a GitHub release");

    assert!(
        manual_publish < manual_wait
            && manual_wait < manual_docker
            && manual_docker < manual_github_release,
        "manual release should publish crates.io first, then Docker images, then the GitHub release"
    );
}

#[test]
fn release_scripts_check_all_release_artifacts() {
    let release_check = fs::read_to_string("scripts/check-release-needed.rs")
        .expect("release check script should be readable");
    let wait_for_crate = fs::read_to_string("scripts/wait-for-crate.rs")
        .expect("crate availability wait script should be readable");
    let release_script = fs::read_to_string("scripts/create-github-release.rs")
        .expect("release script should be readable");

    assert!(
        release_check.contains("check_docker_hub_tag"),
        "release-needed check should include Docker Hub tag state"
    );
    assert!(
        release_check.contains("check_github_release"),
        "release-needed check should include GitHub release state"
    );
    assert!(
        wait_for_crate.contains("crates.io/api/v1/crates"),
        "release workflow should have a reusable crates.io availability wait"
    );
    assert!(
        release_script.contains("--docker-hub-url"),
        "GitHub release creation should accept a Docker Hub URL"
    );
    assert!(
        release_script.contains("fn docker_hub_badge")
            && release_script.contains("badge_escape(&image_tag)"),
        "GitHub release notes should include a version-specific Docker image badge"
    );
}

fn rust_builder_tag(dockerfile: &str) -> Option<&str> {
    dockerfile.lines().find_map(|line| {
        let trimmed = line.trim();
        let rest = trimmed.strip_prefix("FROM rust:")?;
        let mut parts = rest.split_whitespace();
        let tag = parts.next()?;
        if parts.next() == Some("AS") && parts.next() == Some("builder") {
            Some(tag)
        } else {
            None
        }
    })
}

fn docker_builder_stage(dockerfile: &str) -> Option<&str> {
    let start = dockerfile.find("FROM rust:")?;
    let rest = &dockerfile[start..];
    let end = rest.find("\nFROM ").unwrap_or(rest.len());
    Some(&rest[..end])
}

fn dockerfile_apt_installs(section: &str, package: &str) -> bool {
    section
        .lines()
        .map(|line| line.trim().trim_end_matches('\\').trim())
        .any(|line| line == package || line.starts_with(&format!("{package} ")))
}

fn rust_builder_tag_tracks_supported_toolchain(tag: &str) -> bool {
    if tag == "1-slim-bookworm" {
        true
    } else {
        let version = tag.split('-').next().unwrap_or_default();
        let mut parts = version.split('.');
        let major = parts.next().and_then(|part| part.parse::<u64>().ok());
        let minor = parts.next().and_then(|part| part.parse::<u64>().ok());

        matches!((major, minor), (Some(1), Some(minor)) if minor >= 85)
            || matches!(major, Some(major) if major > 1)
    }
}

fn package_version(manifest: &str) -> Option<&str> {
    manifest
        .lines()
        .find_map(|line| quoted_value(line.trim(), "version"))
}

fn lockfile_package_version<'a>(lockfile: &'a str, package_name: &str) -> Option<&'a str> {
    let mut in_package = false;
    let mut found_package = false;
    let mut found_version = None;

    for line in lockfile.lines() {
        let trimmed = line.trim();
        if trimmed == "[[package]]" {
            if found_package {
                return found_version;
            }
            in_package = true;
            found_package = false;
            found_version = None;
            continue;
        }

        if !in_package {
            continue;
        }

        if quoted_value(trimmed, "name") == Some(package_name) {
            found_package = true;
            if found_version.is_some() {
                return found_version;
            }
        } else if let Some(version) = quoted_value(trimmed, "version") {
            found_version = Some(version);
            if found_package {
                return found_version;
            }
        }
    }

    found_package.then_some(found_version).flatten()
}

fn quoted_value<'a>(line: &'a str, key: &str) -> Option<&'a str> {
    let rest = line.strip_prefix(key)?.trim_start();
    let rest = rest.strip_prefix('=')?.trim_start();
    rest.strip_prefix('"')?.strip_suffix('"')
}
