This directory contains original crates.io archives for serde_json 1.0.151 and
serde_core 1.0.229, verified against the exact Cargo.lock registry checksums.
Each archive retains its original MIT and Apache-2.0 licenses and copyright
notices; their licensed source member digests are listed in manifest.json.

Only bounded macro, scalar serializer, Value and Map source facts are inspected.
No dependency is installed, built or extracted into a crate tree. These inputs
do not prove a unified Cargo feature set, caller macro owner, generated trait
implementation or complete runtime/namespace behavior. All such authority flags
remain false in this untested source-only draft.

The features directory additionally preserves original normalized manifests and
license texts from checksum-verified crates.io archives for axum, cookie_store,
criterion, jsonschema, jsonschema-value, jsonwebtoken, referencing, reqwest,
schemars, tinytemplate and tracing-subscriber. It also preserves Router's original
manifest. Each source/license digest and original locked archive digest is in
features/manifest.json. These small manifests are a dependency-feature proof
input; no runtime code or arbitrary generated implementation is imported.

The standard directory contains original Rust 1.89 core/std preludes, core
conversion definitions and alloc str definitions, distributed under MIT OR
Apache-2.0. It references byte-pinned original alloc String and std/alloc root
sources already present in the sibling portable profiles. Their source URLs,
original and compressed digests are recorded in standard/manifest.json. Rust's
original licenses are retained in the standard directory. No Rust execution was
used to derive or test these contract adapters.
