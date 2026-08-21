use std::fs;

fn read_lf(path: &str) -> String {
    fs::read_to_string(path)
        .unwrap_or_else(|error| panic!("failed to read {path}: {error}"))
        .replace("\r\n", "\n")
}

#[test]
fn release_workflow_uses_the_cyclonedx_filename_that_the_generator_creates() {
    let workflow = read_lf(".github/workflows/release.yml");
    assert!(workflow.contains("--override-filename link-assistant-router.cdx\n"));
    assert!(workflow.contains("mv link-assistant-router.cdx.json \\\n"));
    assert!(!workflow.contains("--override-filename link-assistant-router.cdx.json"));
}

#[test]
fn image_attestation_can_persist_artifact_metadata_without_warnings() {
    let workflow = read_lf(".github/workflows/release.yml");
    let image_job = workflow
        .split_once("  publish-docker-images:\n")
        .expect("release workflow should publish Docker images")
        .1
        .split_once("\n  publish-docker-manifests:\n")
        .expect("image publication should precede manifest publication")
        .0;
    assert!(image_job.contains("artifact-metadata: write"));
}

/// Every artifact download must silence the deprecation notice v8 emits.
///
/// v8's bundled unzip chain still calls the deprecated `Buffer()` constructor,
/// so Node 24 prints DEP0005 on each download (upstream
/// actions/download-artifact#484, still open). This was previously handled by
/// pinning v7 and refusing v8 by commit, which also gave up v8's stricter
/// defaults -- a digest mismatch now fails the run rather than warning, which is
/// what should stop a release. Suppressing the notice per step keeps both.
///
/// The artifacts are zips, so `skip-decompress` cannot avoid the extraction
/// path; the env var is the lever that remains.
#[test]
fn artifact_download_avoids_the_known_node_buffer_warning() {
    let workflow = read_lf(".github/workflows/release.yml");

    for (index, _) in workflow.match_indices("actions/download-artifact@") {
        let step = workflow[..index]
            .rfind("      - name:")
            .map_or(&workflow[..index], |start| &workflow[start..index]);
        assert!(
            step.contains("NODE_OPTIONS: --no-deprecation"),
            "an artifact download must silence DEP0005; step was:\n{step}"
        );
    }
    assert!(
        workflow.contains("actions/download-artifact@"),
        "the release workflow should still download artifacts"
    );
}

#[test]
fn release_writers_are_not_cancelled_by_a_new_run() {
    let workflow = read_lf(".github/workflows/release.yml");
    assert!(workflow.contains("cancel-in-progress: ${{ github.event_name == 'pull_request' }}"));
    assert!(!workflow.contains("cancel-in-progress: true"));
}

#[test]
fn lint_builds_and_checks_the_committed_admin_ui_bundle() {
    let workflow = read_lf(".github/workflows/release.yml");
    assert!(workflow.contains("working-directory: ui\n        run: npm ci"));
    assert!(workflow.contains("npm run build 2>&1 | tee /tmp/admin-ui-build.log"));
    assert!(workflow.contains("Admin console build emitted a warning"));
    assert!(workflow.contains("git diff --exit-code -- ui/dist"));
}

#[test]
fn committed_admin_ui_chunks_stay_below_vites_warning_threshold() {
    for entry in fs::read_dir("ui/dist/assets").expect("UI assets should exist") {
        let entry = entry.expect("UI asset should be readable");
        if entry.path().extension().is_some_and(|ext| ext == "js") {
            let size = entry
                .metadata()
                .expect("UI asset metadata should exist")
                .len();
            assert!(
                size <= 500_000,
                "{} is {size} bytes and triggers Vite's 500 kB chunk warning",
                entry.path().display()
            );
        }
    }
}

#[test]
fn archived_development_evidence_is_not_treated_as_product_source() {
    assert!(read_lf("scripts/check-file-size.rs").contains(r#""dev/log""#));
    assert!(read_lf("Cargo.toml").contains(r#"exclude = ["dev/log/**"]"#));
}
