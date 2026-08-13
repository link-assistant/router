#![cfg(unix)]

use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::sync::atomic::{AtomicU64, Ordering};

static SANDBOX_SEQUENCE: AtomicU64 = AtomicU64::new(0);

fn script() -> String {
    format!(
        "{}/scripts/verify-ghcr-visibility.sh",
        env!("CARGO_MANIFEST_DIR")
    )
}

fn sandbox(status: &str, body: &str) -> PathBuf {
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("clock must be after the Unix epoch")
        .as_nanos();
    let sequence = SANDBOX_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let dir = std::env::temp_dir().join(format!(
        "router-ghcr-visibility-{}-{nonce}-{sequence}",
        std::process::id()
    ));
    fs::create_dir_all(&dir).expect("sandbox must be created");

    let curl = dir.join("curl");
    fs::write(
        &curl,
        format!(
            "#!/usr/bin/env bash\n\
             printf '%s\\n' \"$*\" >> \"$SANDBOX/calls.log\"\n\
             output=''\n\
             while [ $# -gt 0 ]; do\n\
               if [ \"$1\" = '-o' ]; then output=\"$2\"; fi\n\
               shift\n\
             done\n\
             printf '%s' '{body}' > \"$output\"\n\
             if [ '{status}' = 'transport' ]; then exit 7; fi\n\
             printf '%s' '{status}'\n"
        ),
    )
    .expect("fake curl must be written");
    fs::set_permissions(&curl, fs::Permissions::from_mode(0o755))
        .expect("fake curl must be executable");
    dir
}

fn run(dir: &Path, image: Option<&str>) -> Output {
    let path = format!(
        "{}:{}",
        dir.display(),
        std::env::var("PATH").unwrap_or_default()
    );
    let mut command = Command::new("bash");
    command
        .arg(script())
        .env("PATH", path)
        .env("SANDBOX", dir)
        .env("VERIFY_GHCR_VISIBILITY_DELAY", "0")
        .env_remove("GHCR_IMAGE");
    if let Some(image) = image {
        command.env("GHCR_IMAGE", image);
    }
    command.output().expect("visibility probe must run")
}

fn calls(dir: &Path) -> String {
    fs::read_to_string(dir.join("calls.log")).unwrap_or_default()
}

fn cleanup(dir: &Path) {
    fs::remove_dir_all(dir).expect("sandbox must be removed");
}

fn output_text(output: &Output) -> String {
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

#[test]
fn public_package_passes_without_printing_its_token() {
    let dir = sandbox("200", r#"{"token":"secret-pull-token"}"#);
    let output = run(&dir, Some("ghcr.io/link-assistant/router"));
    let attempts = calls(&dir).lines().count();
    cleanup(&dir);

    let text = output_text(&output);
    assert!(output.status.success(), "{text}");
    assert!(text.contains("is public"), "{text}");
    assert!(!text.contains("secret-pull-token"), "{text}");
    assert_eq!(attempts, 1);
}

#[test]
fn success_without_an_anonymous_token_fails_closed() {
    let dir = sandbox("200", r#"{"expires_in":300}"#);
    let output = run(&dir, Some("ghcr.io/link-assistant/router"));
    cleanup(&dir);

    assert!(!output.status.success());
    assert!(output_text(&output).contains("did not include a pull token"));
}

#[test]
fn private_and_missing_packages_fail_with_distinct_diagnostics() {
    for (status, expected, unexpected) in
        [("401", "PRIVATE", "DENIED"), ("403", "DENIED", "PRIVATE")]
    {
        let dir = sandbox(status, "{}");
        let output = run(&dir, Some("ghcr.io/link-assistant/router"));
        cleanup(&dir);

        let text = output_text(&output);
        assert!(!output.status.success(), "HTTP {status} must fail");
        assert!(text.contains(expected), "{text}");
        assert!(!text.contains(unexpected), "{text}");
    }
}

#[test]
fn transient_server_failures_use_the_bounded_retry_budget() {
    let dir = sandbox("503", "{}");
    let output = run(&dir, Some("ghcr.io/link-assistant/router"));
    let attempts = calls(&dir).lines().count();
    cleanup(&dir);

    assert!(!output.status.success());
    assert_eq!(attempts, 3);
    assert!(output_text(&output).contains("kept failing"));
}

#[test]
fn transport_failures_use_the_bounded_retry_budget() {
    let dir = sandbox("transport", "");
    let output = run(&dir, Some("ghcr.io/link-assistant/router"));
    let attempts = calls(&dir).lines().count();
    cleanup(&dir);

    assert!(!output.status.success());
    assert_eq!(attempts, 3);
    assert!(output_text(&output).contains("last status 000"));
}

#[test]
fn scope_omits_registry_tag_and_digest_and_request_has_no_credentials() {
    for image in [
        "ghcr.io/link-assistant/router:1.2.3",
        "ghcr.io/link-assistant/router@sha256:0123456789abcdef",
    ] {
        let dir = sandbox("200", r#"{"token":"pull-token"}"#);
        let output = run(&dir, Some(image));
        let invocation = calls(&dir);
        cleanup(&dir);

        assert!(output.status.success(), "{}", output_text(&output));
        assert!(
            invocation.contains("scope=repository:link-assistant/router:pull"),
            "{invocation}"
        );
        for credential in ["Authorization", "GITHUB_TOKEN", "--user", "-u "] {
            assert!(!invocation.contains(credential), "{invocation}");
        }
    }
}

#[test]
fn missing_image_and_invalid_bash_are_rejected() {
    let dir = sandbox("200", r#"{"token":"pull-token"}"#);
    let output = run(&dir, None);
    cleanup(&dir);

    assert!(!output.status.success());
    assert!(output_text(&output).contains("GHCR_IMAGE is not set"));
    assert!(
        Command::new("bash")
            .args(["-n", &script()])
            .status()
            .expect("bash must run")
            .success()
    );
}

#[test]
fn release_manifest_job_checks_public_visibility_and_source_metadata() {
    let workflow = fs::read_to_string(".github/workflows/release.yml")
        .expect("release workflow should be readable");
    let manifests = workflow
        .split_once("  publish-docker-manifests:")
        .expect("shared manifest job must exist")
        .1
        .split_once("\n  create-github-release:")
        .expect("manifest job must end before the GitHub release job")
        .0;

    let creation = manifests
        .find("- name: Create multi-platform manifests")
        .expect("manifest job must publish tags");
    let visibility = manifests
        .find("- name: Verify GHCR package is publicly pullable")
        .expect("manifest job must verify anonymous GHCR access");
    assert!(
        creation < visibility,
        "visibility must be checked after publishing"
    );
    assert_eq!(
        manifests
            .matches("bash scripts/verify-ghcr-visibility.sh")
            .count(),
        1
    );
    assert!(manifests.contains("GHCR_IMAGE: ghcr.io/link-assistant/router"));
    assert!(
        workflow
            .contains("org.opencontainers.image.source=https://github.com/link-assistant/router")
    );
}
