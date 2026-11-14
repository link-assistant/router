#!/usr/bin/env rust-script
//! Forbid the word "graph" for what this project calls a links network.
//!
//! The data structure is a **links network**: links whose sources and targets
//! are themselves links. "Graph" imports vertices-and-edges assumptions that do
//! not hold here — in a links network there is no separate notion of a vertex,
//! and an edge is itself addressable and can be referenced by other links. The
//! wrong word makes the model harder to reason about, so it is rejected in code
//! (identifiers included) and in prose, in every human language.
//!
//! Use "links network", or "network" as a shorthand where the context is clear.
//!
//! A few uses are other people's terminology, not ours, and are allowed:
//! GraphQL as an API name, Git's own "object graph", a build system's
//! "dependency graph", and words that merely contain the letters (paragraph,
//! lexicographic, geographic).
//!
//! The places whose job is to *state* the rule may name the word freely: the
//! contributing guidelines, the changelog, and this script. Everywhere else it
//! is rejected.
//!
//! Usage: rust-script scripts/check-terminology.rs
//!
//! ```cargo
//! [dependencies]
//! walkdir = "2"
//! ```

use std::fs;
use std::path::Path;
use std::process::exit;
use walkdir::WalkDir;

/// Extensions worth scanning: source, docs and configuration we author.
const SCANNED_EXTENSIONS: &[&str] = &[
    ".rs", ".md", ".toml", ".yml", ".yaml", ".json", ".sh", ".ts", ".tsx", ".js", ".jsx", ".html",
    ".css", ".txt",
];

/// Paths where the word may appear, for one of two reasons.
///
/// **Stating the rule.** A rule has to be expressible: `CONTRIBUTING.md`
/// explains why the word is wrong, the changelog records that the wording
/// changed, and this script defines the check. All three must quote what they
/// forbid, so they are the places -- and the only places -- where it is
/// allowed to name it.
///
/// **Records, not prose we own.** `dev/log`, `ci-logs`, `docs/case-studies/*/raw`
/// and `docs/case-studies/*/evidence` hold captured third-party text, CI
/// transcripts and recorded tool output; `ui/dist` is a built bundle. The
/// translation tooling's generated output (`profiles/`, the per-project
/// metadata, generated drafts, source profiles, bulk schema output and the
/// Rust source inventory) is rewritten by its generators from Rust identifiers
/// that are not ours to rename, machine-written `*receipt.json` run receipts
/// are pinned by hash in those inventories, its vendored upstream copies must stay
/// byte-identical, its fixtures are recorded inputs, and `*.mjs.txt` files are
/// byte-exact snapshots of `.mjs` sources, which are not a scanned type.
/// Rewriting any of them would falsify a record or be undone by the next build.
const EXCLUDED_PATHS: &[&str] = &[
    // Where the rule is stated.
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "changelog.d/",
    "scripts/check-terminology.rs",
    // Records and generated output.
    "target",
    ".git/",
    "node_modules",
    "dev/log",
    "ci-logs/",
    "/raw/",
    "/evidence/",
    "receipt.json",
    "ui/dist",
    ".mjs.txt",
    // Translation tooling: generated output, vendored upstream code, fixtures.
    "./profiles/",
    "parity/rust-source-inventory.json",
    "tools/translation/meta/",
    "tools/translation/projects/",
    "tools/translation/generated/",
    "tools/translation/source-profiles/",
    "tools/translation/js-to-rust/generated/",
    "tools/translation/serialization-schema/bulk-generated/",
    "tools/translation/vendor/",
    "tools/translation/fixtures/",
    "tools/translation/test/fixtures/",
];

/// Other people's names for their own things, which we have to spell correctly.
///
/// Matched case-insensitively against the text around each hit.
const ALLOWED_PHRASES: &[&str] = &[
    // API and tool names.
    "graphql",
    "graphiql",
    "graphviz",
    "graphite",
    "langgraph",
    // rustc_resolve's own names: `build_reduced_graph.rs` and `Resolver::graph_root`.
    "reduced_graph",
    "graph_root",
    // Git's own term for its commit/object DAG.
    "object graph",
    // Build and CI vocabulary for things that are not our data structure.
    "dependency graph",
    "workflow graph",
    "module graph",
    "call graph",
    // Ordinary words that merely contain the letters.
    "paragraph",
    "lexicographic",
    "lexicographical",
    "geographic",
    "geographical",
    "geography",
    "cryptographic",
    "cryptographically",
    "cryptography",
    "typographic",
    "orthographic",
    "digraph",
    "telegraph",
    "autograph",
    "photograph",
    "graphic",
    "graphite",
    "grapheme",
    // URLs to other projects' pages.
    "/graphs/",
];

fn is_excluded(path: &Path) -> bool {
    let text = path.to_string_lossy().replace('\\', "/");
    EXCLUDED_PATHS.iter().any(|pattern| text.contains(pattern))
}

fn is_scanned(path: &Path) -> bool {
    path.extension().is_some_and(|extension| {
        let dotted = format!(".{}", extension.to_string_lossy().to_lowercase());
        SCANNED_EXTENSIONS.contains(&dotted.as_str())
    })
}

/// Every byte offset in `line` where a forbidden use of "graph" starts.
///
/// A hit is forbidden unless it falls inside one of [`ALLOWED_PHRASES`]. The
/// window is measured in bytes and clamped to character boundaries, so a line
/// containing multi-byte text cannot panic the check.
fn violations(line: &str) -> Vec<usize> {
    let lowered = line.to_lowercase();
    let mut found = Vec::new();
    let mut search_from = 0;
    while let Some(offset) = lowered[search_from..].find("graph") {
        let at = search_from + offset;
        search_from = at + "graph".len();
        if !is_allowed_at(&lowered, at) {
            found.push(at);
        }
    }
    found
}

/// Does an allowed phrase cover the hit at `at`?
fn is_allowed_at(lowered: &str, at: usize) -> bool {
    ALLOWED_PHRASES.iter().any(|phrase| {
        // Look back far enough for the longest allowed phrase to fit.
        let start = floor_boundary(lowered, at.saturating_sub(phrase.len()));
        let end = ceil_boundary(lowered, (at + "graph".len() + phrase.len()).min(lowered.len()));
        lowered[start..end]
            .match_indices(phrase)
            .any(|(found, _)| start + found <= at && start + found + phrase.len() > at)
    })
}

/// How many bytes of context an offence shows on each side of the hit.
const EXCERPT_CONTEXT: usize = 60;

/// The text around the hit at `at`, for the offence report.
///
/// Only a bounded window is copied: a generated file can hold a single line of
/// tens of megabytes with thousands of hits, and copying the whole line once
/// per hit would need hundreds of gigabytes. The window is clamped to
/// character boundaries, and `…` marks a cut.
fn excerpt(line: &str, at: usize) -> String {
    let start = floor_boundary(line, at.saturating_sub(EXCERPT_CONTEXT));
    let end = ceil_boundary(line, (at + "graph".len() + EXCERPT_CONTEXT).min(line.len()));
    let before = if start > 0 { "…" } else { "" };
    let after = if end < line.len() { "…" } else { "" };
    format!("{before}{}{after}", line[start..end].trim())
}

fn floor_boundary(text: &str, mut index: usize) -> usize {
    while index > 0 && !text.is_char_boundary(index) {
        index -= 1;
    }
    index
}

fn ceil_boundary(text: &str, mut index: usize) -> usize {
    while index < text.len() && !text.is_char_boundary(index) {
        index += 1;
    }
    index
}

fn main() {
    let mut offences: Vec<String> = Vec::new();
    for entry in WalkDir::new(".")
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
    {
        let path = entry.path();
        if is_excluded(path) || !is_scanned(path) {
            continue;
        }
        let Ok(contents) = fs::read_to_string(path) else {
            continue; // Not UTF-8: not prose or code we author.
        };
        for (number, line) in contents.lines().enumerate() {
            for at in violations(line) {
                offences.push(format!(
                    "{}:{}: {}",
                    path.display(),
                    number + 1,
                    excerpt(line, at)
                ));
            }
        }
    }

    if offences.is_empty() {
        println!("Terminology check passed: no forbidden use of \"graph\".");
        return;
    }

    eprintln!(
        "The word \"graph\" is not used for this project's data structure.\n\
         It is a *links network*: links whose sources and targets are themselves\n\
         links, so there is no separate vertex and an edge is itself addressable.\n\
         Write \"links network\", or \"network\" where the context is already clear.\n"
    );
    for offence in &offences {
        eprintln!("  {offence}");
    }
    eprintln!(
        "\n{} occurrence(s). If a hit is somebody else's name for their own thing\n\
         (GraphQL, Git's object graph, a dependency graph), add it to\n\
         ALLOWED_PHRASES in scripts/check-terminology.rs with a reason.\n\
         Only CONTRIBUTING.md and the changelog may name it to explain it.",
        offences.len()
    );
    exit(1);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_uses_are_rejected() {
        assert_eq!(violations("rebuilding the graph is expensive").len(), 1);
        assert_eq!(violations("a Graph of links").len(), 1);
        assert_eq!(violations("fn parse_graph_once()").len(), 1);
        assert_eq!(violations("let graph = store.open();").len(), 1);
    }

    #[test]
    fn the_replacement_wording_passes() {
        assert!(violations("rebuilding the links network is expensive").is_empty());
        assert!(violations("the network is parsed once").is_empty());
    }

    #[test]
    fn other_projects_names_are_allowed() {
        assert!(violations("the GraphQL endpoint").is_empty());
        assert!(violations("the router holds no object graph").is_empty());
        assert!(violations("fell behind the dependency graph").is_empty());
        assert!(violations("View the workflow graph in GitHub Actions").is_empty());
        assert!(violations("compiler/rustc_resolve/src/build_reduced_graph.rs").is_empty());
        assert!(violations("self.r.graph_root").is_empty());
    }

    #[test]
    fn words_that_merely_contain_the_letters_are_allowed() {
        assert!(violations("the first paragraph").is_empty());
        assert!(violations("lexicographic order").is_empty());
        assert!(violations("bypass geographic blocks").is_empty());
        assert!(violations("cryptographically immutable").is_empty());
        assert!(violations("counts scalars, not graphemes").is_empty());
    }

    #[test]
    fn a_line_with_both_reports_only_the_forbidden_one() {
        assert_eq!(violations("the GraphQL graph of links").len(), 1);
    }

    #[test]
    fn multibyte_lines_do_not_panic() {
        assert!(violations("персистентная сеть связей — no offence here").is_empty());
        assert_eq!(violations("схема — the graph is rebuilt").len(), 1);
    }

    /// The rule is stateable where it is stated, and nowhere else.
    #[test]
    fn only_the_places_that_state_the_rule_may_name_it() {
        assert!(is_excluded(Path::new("./CONTRIBUTING.md")));
        assert!(is_excluded(Path::new("./CHANGELOG.md")));
        assert!(is_excluded(Path::new("./changelog.d/20260829_x.md")));
        assert!(is_excluded(Path::new("./scripts/check-terminology.rs")));
        // Everywhere else stays checked, docs included.
        assert!(!is_excluded(Path::new("./src/storage.rs")));
        assert!(!is_excluded(Path::new("./README.md")));
        assert!(!is_excluded(Path::new("./docs/ci-cd/troubleshooting.md")));
        assert!(!is_excluded(Path::new("./.github/workflows/release.yml")));
    }

    #[test]
    fn records_and_generated_output_are_excluded() {
        assert!(is_excluded(Path::new("./dev/log/issues/1/x.log")));
        assert!(is_excluded(Path::new("./docs/case-studies/issue-9/raw/x.md")));
        assert!(is_excluded(Path::new("./ui/dist/assets/react.js")));
        assert!(is_excluded(Path::new("./ci-logs/run-1/job.json")));
        assert!(is_excluded(Path::new("./docs/case-studies/issue-9/evidence/ci-1/job.log.txt")));
        assert!(is_excluded(Path::new("./experiments/issue-9/x-before.mjs.txt")));
        assert!(is_excluded(Path::new("./profiles/neutral-1/tools/x.json")));
        assert!(is_excluded(Path::new("./parity/rust-source-inventory.json")));
        assert!(is_excluded(Path::new("./docs/case-studies/issue-9/current/x/receipt.json")));
        assert!(is_excluded(Path::new("./tools/translation/projects/rust/src/lib.meta.json")));
        assert!(is_excluded(Path::new("./tools/translation/meta/x.json")));
        assert!(is_excluded(Path::new("./tools/translation/vendor/x/a.js")));
        assert!(is_excluded(Path::new("./tools/translation/fixtures/a.json")));
        assert!(is_excluded(Path::new(
            "./tools/translation/serialization-schema/bulk-generated/a.json"
        )));
        // Authored translation docs and sources stay checked.
        assert!(!is_excluded(Path::new("./tools/translation/README.md")));
        assert!(!is_excluded(Path::new("./tools/translation/js-to-rust/README.md")));
        assert!(!is_excluded(Path::new("./docs/case-studies/issue-9/README.md")));
        assert!(!is_excluded(Path::new("./docs/development/x.md")));
        assert!(!is_excluded(Path::new("./rust/src/profiles.rs")));
    }

    #[test]
    fn offences_show_a_bounded_excerpt() {
        let line = format!("{} the graph {}", "x".repeat(10_000), "y".repeat(10_000));
        let at = violations(&line)[0];
        let shown = excerpt(&line, at);
        assert!(shown.contains("the graph"));
        assert!(shown.starts_with('…') && shown.ends_with('…'));
        assert!(shown.len() <= 2 * EXCERPT_CONTEXT + "graph".len() + 2 * '…'.len_utf8());
        assert_eq!(excerpt("a graph", 2), "a graph");
        // Both window ends fall inside two-byte characters and move outwards.
        let wide = format!("{}xgraphy{}", "щ".repeat(100), "ж".repeat(100));
        let at = violations(&wide)[0];
        let expected = format!("…{}xgraphy{}…", "щ".repeat(30), "ж".repeat(30));
        assert_eq!(excerpt(&wide, at), expected);
    }

    #[test]
    fn only_authored_file_types_are_scanned() {
        assert!(is_scanned(Path::new("a.rs")));
        assert!(is_scanned(Path::new("a.md")));
        assert!(!is_scanned(Path::new("a.png")));
        assert!(!is_scanned(Path::new("a.lock")));
    }
}
