//! Read-only default image preflight before a deployment plan (#687).

use std::ffi::OsStr;
use std::process::Command;
use std::time::Duration;

use link_assistant_router::bounded_process;

/// Verify a cached default image or registry manifest before deployment planning.
pub fn ensure_default(image: &str, version: &str) -> Result<(), String> {
    inspect_with(OsStr::new("docker"), image, version)
}

fn inspect_with(docker: &OsStr, image: &str, version: &str) -> Result<(), String> {
    // An immutable image already cached on the target is usable offline.
    let local = bounded_process::output(
        Command::new(docker).args(["image", "inspect", image]),
        Duration::from_secs(30),
    );
    if local.as_ref().is_ok_and(|output| output.status.success()) {
        return Ok(());
    }
    let output = bounded_process::output(
        Command::new(docker).args(["manifest", "inspect", image]),
        Duration::from_secs(30),
    )
        .map_err(|error| format!("image-unavailable: could not check default image {image}: {error}; pass --image RELEASE_TAG_OR_DIGEST or --build DIR"))?;
    if output.status.success() {
        return Ok(());
    }
    let reason = String::from_utf8_lossy(&output.stderr);
    let lower = reason.to_ascii_lowercase();
    if [
        "manifest unknown",
        "no such manifest",
        "not found",
        "name unknown",
    ]
    .iter()
    .any(|missing| lower.contains(missing))
    {
        Err(format!(
            "image-unpublished: image for {version} is not published ({image}); pass --image RELEASE_TAG_OR_DIGEST or --build DIR"
        ))
    } else {
        Err(format!(
            "image-unavailable: could not verify default image {image}: {}; pass --image RELEASE_TAG_OR_DIGEST or --build DIR",
            reason.trim()
        ))
    }
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt as _;

    fn inspect(body: &str) -> Result<(), String> {
        let directory = tempfile::tempdir().unwrap();
        let docker = directory.path().join("docker");
        std::fs::write(&docker, format!("#!/bin/sh\n{body}\n")).unwrap();
        std::fs::set_permissions(&docker, std::fs::Permissions::from_mode(0o700)).unwrap();
        inspect_with(
            docker.as_os_str(),
            "ghcr.io/link-assistant/router:1.16.0",
            "1.16.0",
        )
    }

    #[test]
    fn a_missing_release_has_a_named_reason_and_an_explicit_image_remedy() {
        let error = inspect("echo 'manifest unknown' >&2; exit 1").unwrap_err();
        assert!(error.contains("image-unpublished"));
        assert!(error.contains("image for 1.16.0 is not published"));
        assert!(error.contains("pass --image"));
    }

    #[test]
    fn an_auth_or_network_failure_is_not_reported_as_an_unpublished_release() {
        let error = inspect("echo 'unauthorized' >&2; exit 1").unwrap_err();
        assert!(error.contains("image-unavailable"));
        assert!(error.contains("unauthorized"));
    }

    #[test]
    fn either_a_cached_image_or_a_published_manifest_is_sufficient() {
        assert!(inspect("[ \"$1\" = image ]").is_ok());
        assert!(inspect("[ \"$1\" = manifest ]").is_ok());
    }
}
