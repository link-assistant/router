Source-only, untested draft of reusable tracked Rust module-file selection.
The unchanged Rust 1.89 module resolver is pinned with its source archive,
checksums and licenses. Original module declarations and complete files select
ordinary external candidates or literal path overrides, including physical
parent, inline-directory and path-included sibling rules. Plans grant no
namespace, attribute-expansion or runtime authority. Unsafe paths, unknown
conditions, malformed attributes and unresolved module transformations refuse.
The producer and module graph do not consume this planner yet. No tests,
compiler, corpus producer, Rust build or executable-gain check has run.
