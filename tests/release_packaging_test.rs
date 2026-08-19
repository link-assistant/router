//! The release archive must contain every binary the manifest declares.
//!
//! Split from `release_workflow_test.rs` to keep that file within the
//! repository's 1000-line limit.

fn read_lf(path: &str) -> String {
    std::fs::read_to_string(path)
        .unwrap_or_else(|error| panic!("read {path}: {error}"))
        .replace("\r\n", "\n")
}

/// Every binary the manifest declares must be packaged into the release
/// archive, and must be smoke-tested there.
///
/// `router` was added to `Cargo.toml` in v0.92.0 but not to the packaging step,
/// so it built in CI, passed every test, and was still absent from all eight
/// published archives — reaching only users who install with `cargo install`
/// (issue #222). The packaging list is hand-written, so this asserts it against
/// the manifest rather than against itself.
#[test]
fn every_declared_binary_is_packaged_and_smoke_tested() {
    let manifest = read_lf("Cargo.toml");
    let workflow = read_lf(".github/workflows/release.yml");

    let binaries: Vec<String> = manifest
        .lines()
        .skip_while(|line| !line.starts_with("[[bin]]"))
        .filter_map(|line| {
            line.strip_prefix("name = \"")
                .and_then(|rest| rest.strip_suffix('"'))
                .map(str::to_string)
        })
        .collect();
    assert!(
        binaries.len() >= 3,
        "expected the declared binaries, found {binaries:?}"
    );

    for binary in binaries {
        assert!(
            workflow.contains(&format!("release/{binary}\"")),
            "{binary} is declared in Cargo.toml but never copied into the release package"
        );
        assert!(
            workflow.contains(&format!("dist/package/{binary} ")),
            "{binary} is packaged but never smoke-tested in the published archive"
        );
    }
}
