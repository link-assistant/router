Original normalized Cargo manifests, licenses and source branches are copied
from checksum-verified crates.io archives, with original member and archive
hashes in manifest.json. The 13-node incoming serde_json feature graph plus
serde_core/std activation is intentionally not a complete package graph.

serde_json 1.0.151 and serde_core 1.0.229 are MIT OR Apache-2.0; their original
licenses are retained as compressed inputs. Other consumed manifests retain
their actual archive license files when present. serde_json's lexical sources
retain their original rust-lexical attribution comments. These inputs are
portable compiler source evidence, never installed or built dependencies.

This profile proves only whether the existing default numeric decoder is
available under the exact locked default production feature selection. It
neither implements the selected float_roundtrip lexical branch nor changes
Number constructors/readers/serialization. The exact midpoint example is a
mathematical/source-derived expectation, not an observed Rust execution.
