//! What the release workflow builds into the runtime image.
//!
//! Split from `release_workflow_test.rs` to keep that file within the
//! repository's 1000-line limit.

use std::fs;

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
