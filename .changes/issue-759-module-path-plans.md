Add reusable tracked Rust module-file selection through original source views.
The unchanged Rust 1.89 module resolver and keyword source are pinned with
their source archives, checksums and licenses. Original module declarations and complete files select
ordinary external candidates or literal path overrides, including physical
parent, inline-directory and path-included sibling rules. Plans grant no
namespace, attribute-expansion or runtime authority. Unsafe paths, unknown
conditions, malformed attributes and unresolved module transformations refuse.
The module graph consumes private plans while retaining complete original
files and inline view offsets. Explicitly included files give child modules
the same sibling rules as mod.rs. Circular file inclusion and the graph's
module-count, external-file depth and combined inline/file depth bounds retain
diagnostics. Invalid or reserved raw module names, plain strict/reserved names
and non-ASCII default filesystem names refuse before file selection. Weak
keywords remain identifiers; the name profile conservatively intersects the
2021 and 2024 editions. Producer fingerprints cover the helper
and every pinned profile input. The final focused group passes all 163 tests in Node and Bun, including
strict TypeScript execution and all five original deploy path declarations.
Initial failures and complete repair attempts are retained in the case study.
Corpus regeneration and native parity remain pending; no local Rust build ran.
