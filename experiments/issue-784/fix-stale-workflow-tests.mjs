#!/usr/bin/env node
// Updates the workflow/hook assertions that run 43525097825 (Ubuntu tests,
// commit 30fc936df) reported as stale against deliberate `main` changes:
// 34a48071e removed the local Cargo hooks; 5003ea15b made release.yml finish
// every run, build from the resolved tag commit and call the local manual
// development gate. Each replacement must match exactly once.
import { readFileSync, writeFileSync } from 'node:fs';

const edits = {
  'rust/tests/ci_regressions_test.rs': [
    [`#[test]
fn release_writers_are_not_cancelled_by_a_new_run() {
    let workflow = read_lf(".github/workflows/release.yml");
    assert!(workflow.contains("cancel-in-progress: \${{ github.event_name == 'pull_request' }}"));
    assert!(!workflow.contains("cancel-in-progress: true"));
}
`, `/// A new push must not cancel a run that may already be writing a release.
///
/// Every run completes its Rust stage, because the push gate waits for all of
/// them before it pushes.
#[test]
fn release_writers_are_not_cancelled_by_a_new_run() {
    let workflow = read_lf(".github/workflows/release.yml");
    assert!(workflow.contains("cancel-in-progress: false"));
    assert!(!workflow.contains("cancel-in-progress: true"));
    assert!(!workflow.contains("cancel-in-progress: \${{"));
}
`],
    [`/// Every commit prunes what its build superseded, so the cache cannot grow
/// without bound between manual cleanups.
#[test]
fn each_commit_prunes_superseded_build_artifacts() {
    let hooks = read_lf(".pre-commit-config.yaml");

    assert!(hooks.contains("cargo-sweep"), "{hooks}");
    assert!(
        hooks.contains("stages: [post-commit]"),
        "the sweep must run after the hooks that build, or it prunes their output"
    );
    assert!(
        read_lf(".gitignore").contains("sweep.timestamp"),
        "the sweep marker is local state, not a tracked file"
    );
}

/// The checks above populate \`target/\`; the last pre-commit hook must reclaim
/// that complete cache even when optional pruning tooling is unavailable.
#[test]
fn each_pre_commit_clears_the_rust_build_cache() {
    let hooks = read_lf(".pre-commit-config.yaml");

    assert!(hooks.contains("cargo-clean"), "{hooks}");
    assert!(hooks.contains("scripts/clear-build-cache.sh"), "{hooks}");
    assert!(
        hooks.contains("stages: [pre-commit]"),
        "the full cleanup must run as part of every pre-commit pass"
    );
    assert!(
        read_lf("scripts/clear-build-cache.sh").contains("cargo clean"),
        "the hook must reclaim the complete Cargo build cache"
    );
}
`, `/// Local commits run only the generic pre-commit checks, never Cargo.
///
/// Rust formatting, Clippy, tests and the \`cargo-sweep\`/\`cargo-clean\` cache
/// hooks were removed on purpose: Rust is verified only by the gated CI, so a
/// commit cannot build (or fill) \`target/\` behind the developer's back.
#[test]
fn local_commit_hooks_never_run_cargo() {
    let hooks = read_lf(".pre-commit-config.yaml");

    assert!(!hooks.contains("cargo"), "{hooks}");
    assert!(!hooks.contains("scripts/clear-build-cache.sh"), "{hooks}");
    for generic in ["trailing-whitespace", "end-of-file-fixer", "check-yaml"] {
        assert!(hooks.contains(generic), "{generic} must stay enabled:\\n{hooks}");
    }
}

/// Whoever builds locally can still reclaim the cache by hand.
#[test]
fn manual_build_cache_cleanup_remains_available() {
    assert!(
        read_lf("scripts/clear-build-cache.sh").contains("cargo clean"),
        "the manual cleanup must reclaim the complete Cargo build cache"
    );
    assert!(
        read_lf(".gitignore").contains("sweep.timestamp"),
        "the sweep marker is local state, not a tracked file"
    );
}
`]],
  'rust/tests/release_workflow_test.rs': [
    [`    assert!(workflow.contains("--prerelease=false --latest"));
    assert!(workflow.contains("ref: refs/tags/v\${{ env.RELEASE_VERSION }}"));
}
`, `    assert!(workflow.contains("--prerelease=false --latest"));
    // Packaging jobs build the commit the release tag names, resolved once.
    assert!(workflow.contains("ref: \${{ needs.resolve-release-source.outputs.sha }}"));
    assert!(workflow.contains(r#"git rev-parse --verify "refs/tags/v\${RELEASE_VERSION}^{commit}""#));
}
`],
    [`    assert!(
        release_workflow
            .contains("ref: refs/tags/v\${{ env.RELEASE_VERSION }}\\n          fetch-depth: 0"),
        "the post-release check should fetch the default branch and complete tag history"
    );
`, `    let finalize = release_workflow
        .split_once("\\n  finalize-release:\\n")
        .expect("release workflow should finalize the release")
        .1
        .split_once("\\n\\n")
        .expect("the finalize job should end before the next section")
        .0;
    assert!(
        finalize.contains("fetch-depth: 0")
            && finalize.contains(&format!("{verification_command} --release-version")),
        "the post-release check should fetch the default branch and complete tag history"
    );
`],
    [`    for line in release
        .lines()
        .chain(verify.lines())
        .filter(|line| line.trim_start().starts_with("uses:"))
    {
`, `    // A local reusable workflow (\`uses: ./…\`) is part of the same commit and
    // has no revision to pin.
    for line in release
        .lines()
        .chain(verify.lines())
        .filter(|line| line.trim_start().starts_with("uses:"))
        .filter(|line| !line.trim_start().starts_with("uses: ./"))
    {
`],
    [`        workflow.contains("needs: [lint, test, coverage]"),`, `        workflow.contains("needs: [javascript, lint, test, coverage]"),`],
    [`        fs::metadata("coverage-baseline.txt").is_ok(),`, `        fs::metadata(repository::path("coverage-baseline.txt")).is_ok(),`],
  ],
};

const out = new Map();
for (const [path, pairs] of Object.entries(edits)) {
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of pairs) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`${path}: expected one match, found ${count}: ${from.slice(0, 80)}`);
    text = text.replace(from, () => to);
  }
  out.set(path, text);
}
for (const [path, text] of out) writeFileSync(path, text);
console.log(`applied ${[...Object.values(edits)].flat().length} edits to ${out.size} files`);
