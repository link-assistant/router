The compressed module-resolution and keyword-symbol sources are copied unchanged from Rust 1.89.0 and remain licensed under MIT OR Apache-2.0. Their SHA-256 hashes and original line ranges are recorded in manifest.json. The source profile grants no namespace, attribute-expansion or runtime authority.

Module names use the conservative intersection of the 2021 and 2024 identifier grammars: unprefixed `gen` remains an obligation even in a 2021 crate. Reserved raw names and lone `_` are rejected, while weak keywords remain identifiers. Default external-file names require ASCII. Inline and explicit-path names require NFC XID spelling; this profile does not infer or change the source crate's edition or normalize original tokens.

Graph consumers cap the number of modules, external-file depth and combined inline/file depth independently. Depth limits are checked before adding an edge or reading the next file.
