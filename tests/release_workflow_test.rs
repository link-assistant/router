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
fn dockerfile_builder_copies_embedded_admin_ui_before_building_source() {
    let dockerfile = fs::read_to_string("Dockerfile").expect("Dockerfile should be readable");
    let builder_stage =
        docker_builder_stage(&dockerfile).expect("Dockerfile should have a builder stage");
    let ui_copy = builder_stage
        .find("COPY ui/dist/ ui/dist/")
        .expect("builder stage should copy the committed admin UI bundle");
    let source_copy = builder_stage
        .find("COPY src/ src/")
        .expect("builder stage should copy the Rust source");

    assert!(
        ui_copy < source_copy,
        "the stable UI bundle should be copied before Rust source to preserve Docker layer caching"
    );
}

#[test]
fn release_workflow_does_not_gate_releases_on_docker_builds() {
    let workflow = read_lf(".github/workflows/release.yml");

    assert!(
        !workflow.contains("docker-build:\n"),
        "CI should not build and discard an image before publishing release artifacts"
    );
    assert!(
        !workflow.contains("needs: [lint, test, build, docker-build]"),
        "release jobs should not wait for an image build"
    );
    assert!(
        workflow.contains(
            "create-github-release:\n    name: Create GitHub Release\n    needs: [auto-release, manual-release]"
        ),
        "GitHub release publication should depend directly on completed crate release jobs"
    );
    assert!(
        workflow.contains(
            "publish-docker-images:\n    name: Build Docker Image (${{ matrix.variant }} / ${{ matrix.arch }})\n    needs: [create-github-release]"
        ),
        "published image builds should begin only after the GitHub release exists"
    );
    assert!(
        workflow.contains("ref: refs/tags/v${{ env.RELEASE_VERSION }}"),
        "follow-up image jobs should build the immutable version tag produced by the release"
    );
}

#[test]
fn release_workflows_detect_missing_github_releases() {
    let release_workflow = read_lf(".github/workflows/release.yml");
    let reconciliation_workflow = read_lf(".github/workflows/verify-releases.yml");
    let verification_command = "rust-script scripts/check-github-releases.rs --repository \"${{ github.repository }}\" --default-branch main";

    assert!(
        release_workflow.contains(&format!(
            "{verification_command} --release-version \"${{{{ env.RELEASE_VERSION }}}}\""
        )),
        "each release run should fail if the version it just published lacks a GitHub Release"
    );
    assert!(
        release_workflow
            .contains("ref: refs/tags/v${{ env.RELEASE_VERSION }}\n          fetch-depth: 0"),
        "the post-release check should fetch the default branch and complete tag history"
    );
    assert!(
        reconciliation_workflow.contains("schedule:")
            && reconciliation_workflow.contains("fetch-depth: 0")
            && reconciliation_workflow.contains(verification_command)
            && !reconciliation_workflow.contains("--historical-orphans warn"),
        "a scheduled reconciliation should fail on any release drift outside release runs"
    );
    assert!(
        release_workflow.contains("rust-script --test scripts/check-github-releases.rs"),
        "CI should exercise the release reconciliation script's regression tests"
    );
}

/// A tag left without a release by an earlier run is unrelated to the version being
/// published now. It must not block that version's Docker images, and whatever the
/// release run does check has to run *before* the release is created, never between
/// release creation and image build. See issue #128.
#[test]
fn historical_orphan_tags_do_not_block_the_current_release() {
    let workflow = read_lf(".github/workflows/release.yml");

    let drift_report = workflow
        .find("- name: Report pre-existing release drift")
        .expect("the release job should report pre-existing orphan tags");
    let create_release = workflow
        .find("- name: Create GitHub Release\n        env:")
        .expect("the release job should create the GitHub release");
    assert!(
        drift_report < create_release,
        "orphan tags should be reported before a release is published, not after"
    );

    let drift_step = &workflow[drift_report..create_release];
    assert!(
        drift_step.contains("--historical-orphans warn"),
        "the pre-release drift report should warn, not fail, on unrelated orphan tags"
    );

    let verification = workflow
        .find("--release-version \"${{ env.RELEASE_VERSION }}\" --historical-orphans warn")
        .expect("the post-release verification should be scoped to the published version");
    assert!(
        create_release < verification,
        "the scoped verification should confirm the release that was just created"
    );
}

#[test]
fn release_workflow_publishes_one_native_image_per_architecture() {
    let workflow = read_lf(".github/workflows/release.yml");

    assert!(
        workflow.contains("strategy:\n      fail-fast: false\n      matrix:\n        include:"),
        "Docker image variants should be separate matrix jobs"
    );
    assert!(
        workflow.contains("runner: ubuntu-latest") && workflow.contains("runner: ubuntu-24.04-arm"),
        "native architecture builds should run concurrently as matrix jobs"
    );
    assert_eq!(
        workflow.matches("variant: runtime").count(),
        2,
        "the runtime variant should have one native matrix leg per architecture"
    );
    assert_eq!(
        workflow.matches("variant: claude-cli").count(),
        0,
        "a second image variant must not return"
    );
    assert_eq!(
        workflow.matches("docker/build-push-action@v7").count(),
        workflow.matches("cache-to: type=gha").count(),
        "every Buildx invocation should persist its cache"
    );
    assert_eq!(
        workflow.matches("docker/build-push-action@v7").count(),
        workflow.matches("cache-from: type=gha").count(),
        "every Buildx invocation should restore its architecture- and target-specific cache"
    );
}

#[test]
fn release_workflow_refreshes_cached_cargo_audit_binary() {
    let workflow = read_lf(".github/workflows/release.yml");

    assert!(
        workflow.contains("cargo install cargo-audit --locked --force"),
        "the audit job should overwrite a cargo-audit binary restored from its cache"
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
fn release_version_bump_updates_and_commits_cargo_lock() {
    let script = read_lf("scripts/version-and-commit.rs");

    assert!(
        script.contains("fn update_cargo_lock"),
        "release versioning must update the root package entry in Cargo.lock"
    );
    assert!(
        script.contains("update_cargo_lock(") && script.contains("&cargo_lock,"),
        "the release path must invoke Cargo.lock synchronization"
    );
    assert!(
        script.contains("release_files.push(&cargo_lock)")
            && script.contains(r#"exec("git", &release_files)"#),
        "the synchronized Cargo.lock must be included in the release commit"
    );
    assert!(
        read_lf(".github/workflows/release.yml")
            .contains("rust-script --test scripts/version-and-commit.rs"),
        "CI must execute the release script's behavioral unit tests"
    );
}

#[test]
fn release_workflow_uses_supported_action_runtimes() {
    let workflow = read_lf(".github/workflows/release.yml");

    for obsolete in [
        "actions/checkout@v4",
        "actions/cache@v4",
        "actions/setup-node@v4",
        "node-version: '20'",
    ] {
        assert!(
            !workflow.contains(obsolete),
            "CI should not use deprecated runtime configuration `{obsolete}`"
        );
    }
    for supported in [
        "actions/checkout@v6",
        "actions/cache@v5",
        "actions/setup-node@v6",
        "node-version: '24'",
    ] {
        assert!(
            workflow.contains(supported),
            "CI should use supported runtime configuration `{supported}`"
        );
    }
}

#[test]
fn dependency_audit_fails_on_warnings() {
    let audit = read_lf(".cargo/audit.toml");

    assert!(
        audit.contains("[output]") && audit.contains(r#"deny = ["warnings"]"#),
        "cargo-audit warnings must fail CI instead of producing a green check"
    );
}

#[test]
fn release_workflow_prevents_silent_lockfile_rewrites() {
    let workflow = read_lf(".github/workflows/release.yml");

    assert!(
        workflow.contains("cargo check --locked"),
        "CI must validate the committed lockfile before another Cargo command can rewrite it"
    );
    for command in [
        "cargo clippy --locked",
        "cargo test --locked",
        "cargo build --locked",
        "cargo package --locked",
    ] {
        assert!(
            workflow.contains(command),
            "CI command `{command}` must fail instead of silently repairing Cargo.lock"
        );
    }
}

#[test]
fn release_workflow_enforces_single_platform_coverage() {
    let workflow = read_lf(".github/workflows/release.yml");

    let coverage = workflow
        .split_once("  coverage:\n")
        .expect("CI must define a dedicated coverage job")
        .1
        .split_once("\n  # === BUILD ===")
        .expect("coverage must run alongside tests before the build job")
        .0;

    assert!(coverage.contains("runs-on: ubuntu-latest"));
    assert!(
        !coverage.contains("matrix."),
        "instrumented coverage should run on exactly one platform"
    );
    assert!(coverage.contains("cargo llvm-cov"));
    assert!(
        coverage.contains("cargo llvm-cov clean --workspace"),
        "coverage must discard stale profiles before collecting a new measurement"
    );
    assert!(coverage.contains("rust-script scripts/check-coverage.rs"));
    assert!(coverage.contains("GITHUB_STEP_SUMMARY"));
    assert!(
        !coverage.contains("continue-on-error: true"),
        "instrumentation and coverage failures must fail closed"
    );
    assert!(
        workflow.contains("needs: [lint, test, coverage]"),
        "the package build must be gated by coverage"
    );
}

#[test]
fn coverage_gate_is_behaviorally_tested_in_ci() {
    let workflow = read_lf(".github/workflows/release.yml");

    assert!(
        workflow.contains("rust-script --test scripts/check-coverage.rs"),
        "CI must test the independent absolute-floor, ratchet, and baseline-update rules"
    );
    assert!(
        fs::metadata("coverage-baseline.txt").is_ok(),
        "the reviewable line-coverage baseline must be committed"
    );
}

#[test]
fn coverage_tool_install_is_idempotent_after_cache_restore() {
    let workflow = read_lf(".github/workflows/release.yml");
    let coverage = workflow
        .split_once("  coverage:\n")
        .expect("CI must define a dedicated coverage job")
        .1
        .split_once("\n  build:\n")
        .expect("coverage must run before the build job")
        .0;

    assert!(
        coverage
            .contains("cargo llvm-cov --version 2>/dev/null | grep -Fqx 'cargo-llvm-cov 0.8.7'"),
        "a restored coverage binary at the pinned version should not be reinstalled"
    );
    assert!(
        coverage.contains("cargo install cargo-llvm-cov --version 0.8.7 --locked --force"),
        "a stale cached coverage binary should be replaced"
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
        1,
        "the shared GitHub release job should include the crates.io package URL"
    );
    assert!(
        release_script
            .contains("https://img.shields.io/crates/v/link-assistant-router.svg?label=crates.io"),
        "release notes should render a visible crates.io badge"
    );
}

#[test]
fn release_script_avoids_unsupported_regex_lookaround() {
    let release_script = fs::read_to_string("scripts/create-github-release.rs")
        .expect("release script should be readable");

    for token in ["(?=", "(?<=", "(?!", "(?<!"] {
        assert!(
            !release_script.contains(token),
            "release script should not use Rust regex look-around token `{token}`"
        );
    }
    assert!(
        release_script.contains(r#"Regex::new(r"(?m)^## \[")"#)
            && release_script.contains("next_section_re.find(body)"),
        "release script should find the next changelog section without look-around"
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
        "Docker build and manifest jobs should authenticate with DOCKERHUB_TOKEN"
    );
    assert_eq!(
        workflow.matches("username: konard").count(),
        2,
        "Docker build and manifest jobs should publish as the konard Docker Hub user"
    );
    assert_eq!(
        workflow.matches("docker/login-action@v4").count(),
        4,
        "Docker build and manifest jobs should log in to both GHCR and Docker Hub"
    );
    assert_eq!(
        workflow.matches("docker/metadata-action@v6").count(),
        1,
        "the shared native matrix should preserve standard OCI image metadata"
    );
    assert_eq!(
        workflow.matches("docker/build-push-action@v7").count(),
        1,
        "all native matrix legs should share one image build step"
    );

    let auto_publish = workflow
        .find("- name: Publish to Crates.io")
        .expect("auto release should publish the crate");
    let auto_wait = workflow
        .find("- name: Wait for Crate availability on Crates.io")
        .expect("auto release should wait for the crate to be visible");
    let docker_build = workflow
        .find("publish-docker-images:")
        .expect("shared native Docker build job should exist");
    let docker_manifests = workflow
        .find("publish-docker-manifests:")
        .expect("shared Docker manifest job should exist");
    let github_release = workflow
        .find("create-github-release:")
        .expect("shared GitHub release job should exist");

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
    assert!(
        auto_publish < auto_wait
            && auto_wait < docker_build
            && manual_publish < manual_wait
            && manual_release + manual_wait < docker_build
            && docker_build < docker_manifests,
        "both release paths should publish crates.io before the shared follow-up jobs"
    );
    assert!(
        workflow[github_release..].contains("needs: [auto-release, manual-release]")
            && workflow[docker_build..].contains("needs: [create-github-release]"),
        "the workflow DAG should publish the GitHub release before native Docker images"
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

/// The runtime has the small fallback runner but no installed vendor package.
#[test]
fn dockerfile_keeps_vendor_clis_out_of_the_single_runtime_image() {
    let dockerfile = read_lf("Dockerfile");

    assert!(
        !dockerfile.contains("AS with-claude-cli"),
        "Dockerfile must not define a second Claude CLI image"
    );
    assert!(
        !dockerfile.contains("@anthropic-ai/claude-code"),
        "the image must not install the vendor CLI"
    );

    let default_stage = dockerfile_stage(&dockerfile, "runtime-base")
        .expect("Dockerfile should define the minimal `runtime-base` stage");
    assert!(
        !default_stage.contains("nodejs")
            && !default_stage.contains("claude-code")
            && default_stage.contains("/usr/local/bin/bun"),
        "the runtime should carry only bun, not Node.js or a vendor CLI"
    );

    // The last stage is what a bare `docker build .` produces, so the minimal
    // image must come last or every default build would ship the CLI.
    let last_stage_name = dockerfile
        .rsplit("\nFROM ")
        .next()
        .and_then(|stage| stage.split_whitespace().nth(2))
        .expect("Dockerfile should end with a named stage");
    assert_eq!(
        last_stage_name, "runtime",
        "the minimal `runtime` stage must be last so a default build does not include the Claude CLI"
    );
}

#[test]
fn release_workflow_publishes_only_the_runtime_image() {
    let workflow = read_lf(".github/workflows/release.yml");

    assert_eq!(
        workflow.matches("target: runtime").count(),
        2,
        "the native build matrix should include the minimal `runtime` stage for both architectures"
    );
    assert_eq!(
        workflow.matches("target: with-claude-cli").count(),
        0,
        "the native matrix must not include a Claude CLI variant"
    );
    assert_eq!(
        workflow.matches(":with-claude-cli\"").count(),
        0,
        "the retired floating Claude CLI tag must not be published"
    );
    assert_eq!(
        workflow
            .matches("${RELEASE_VERSION}-with-claude-cli")
            .count(),
        0,
        "the retired versioned Claude CLI tag must not be published"
    );
}

#[test]
fn release_workflow_publishes_and_verifies_multi_platform_images() {
    let workflow = read_lf(".github/workflows/release.yml");
    let platform_check = read_lf("scripts/check-docker-platforms.rs");

    assert!(
        !workflow.contains("docker/setup-qemu-action"),
        "release images must not use QEMU emulation"
    );
    for snippet in [
        "platform: linux/amd64",
        "runner: ubuntu-latest",
        "platform: linux/arm64",
        "runner: ubuntu-24.04-arm",
        "runs-on: ${{ matrix.runner }}",
        "platforms: ${{ matrix.platform }}",
    ] {
        assert!(
            workflow.contains(snippet),
            "native release matrix should contain `{snippet}`"
        );
    }
    assert_eq!(
        workflow.matches("push-by-digest=true").count(),
        1,
        "the shared matrix step should publish every architecture-specific image by digest"
    );
    assert_eq!(
        workflow.matches("cache-from: type=gha").count(),
        1,
        "every matrix build should reuse its isolated GitHub Actions cache"
    );
    assert_eq!(
        workflow.matches("cache-to: type=gha,mode=max").count(),
        1,
        "every matrix build should populate its isolated GitHub Actions cache"
    );
    assert_eq!(
        workflow.matches("docker buildx imagetools create").count(),
        2,
        "both registries should receive one merged multi-platform manifest"
    );
    assert_eq!(
        workflow
            .matches("rust-script scripts/check-docker-platforms.rs")
            .count(),
        1,
        "the shared manifest job should verify every published image"
    );
    assert!(
        workflow.contains("rust-script --test scripts/check-docker-platforms.rs"),
        "CI should exercise the manifest parser without contacting a registry"
    );

    for platform in ["linux/amd64", "linux/arm64"] {
        assert!(
            platform_check.contains(platform),
            "published-image verification should require {platform}"
        );
    }
    assert!(
        platform_check.contains("unknown/unknown"),
        "published-image verification should explicitly tolerate provenance attestations"
    );
}

/// Read a repository file with line endings normalised to `\n`.
///
/// A Windows checkout may convert these files to CRLF, which would otherwise
/// break the newline-anchored matching below.
fn read_lf(path: &str) -> String {
    fs::read_to_string(path)
        .unwrap_or_else(|e| panic!("{path} should be readable: {e}"))
        .replace("\r\n", "\n")
}

/// Extract the instructions of the named Dockerfile stage.
///
/// Comments are dropped: the block documenting the *next* stage sits inside
/// this stage's text and would otherwise be mistaken for its content.
fn dockerfile_stage(dockerfile: &str, name: &str) -> Option<String> {
    let marker = format!("AS {name}\n");
    let start = dockerfile.find(&marker)? + marker.len();
    let rest = &dockerfile[start..];
    let end = rest.find("\nFROM ").unwrap_or(rest.len());
    Some(
        rest[..end]
            .lines()
            .filter(|line| !line.trim_start().starts_with('#'))
            .collect::<Vec<_>>()
            .join("\n"),
    )
}
