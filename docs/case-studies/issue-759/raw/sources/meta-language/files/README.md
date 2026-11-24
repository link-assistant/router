# meta-language

A universal, self-describing meta language backed by a links network, implemented
in **both Rust and JavaScript** with guaranteed feature parity between the two.

[![Rust](https://github.com/link-foundation/meta-language/actions/workflows/rust.yml/badge.svg)](https://github.com/link-foundation/meta-language/actions/workflows/rust.yml)
[![JavaScript](https://github.com/link-foundation/meta-language/actions/workflows/js.yml/badge.svg)](https://github.com/link-foundation/meta-language/actions/workflows/js.yml)
[![Crates.io](https://img.shields.io/crates/v/meta-language?label=crates.io&style=flat)](https://crates.io/crates/meta-language)
[![npm](https://img.shields.io/npm/v/meta-language?label=npm&style=flat)](https://www.npmjs.com/package/meta-language)
[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](https://unlicense.org/)

**Website:** <https://link-foundation.github.io/meta-language> — project
description, an interactive WebAssembly demo, and the full
[Rust API documentation](https://link-foundation.github.io/meta-language/api/).

## Vision

[`docs/vision.md`](docs/vision.md) is the authoritative specification of the
target meta-language is built toward: one common language of links for
grammars, syntax trees, semantics and transformations, native merged grammars
for every language, and full JavaScript, Rust, Lean and Rocq translation. It
describes that target, not the current state; the generated
[requirement ledger](docs/issue-195-requirement-ledger.md) reports what is
verified today. Where another document disagrees with the vision, the vision is
the contract.

## Repository layout

No language implementation lives at the repository root. Each language has its own
self-contained folder with its own `src/`, `tests/`, `scripts/`, `README.md`, and
badges, and its own CI/CD workflow.

| Path | Contents |
| --- | --- |
| [`rust/`](rust/README.md) | Rust crate `meta-language` — the reference implementation. Built and tested by [`.github/workflows/rust.yml`](.github/workflows/rust.yml). |
| [`js/`](js/README.md) | JavaScript package `meta-language`. Built and tested by [`.github/workflows/js.yml`](.github/workflows/js.yml). |
| [`parity/`](parity/language-features.json) | Cross-language feature manifest. Every feature must be present in both languages (see [Feature parity](#feature-parity)). |
| [`docs/`](docs) | Shared documentation: the grammar subsystem, fidelity matrices, the project website source, and per-issue case studies. |
| [`.github/`](.github/workflows) | Shared CI/CD workflows (`rust.yml`, `js.yml`). |

Declarative, recursive network translation and its template syntax are
documented in [`docs/translation-rules.md`](docs/translation-rules.md).
The shared executable query-plan IR plus registry-driven GraphQL and SQL
lowering APIs are documented in [`docs/query-plans.md`](docs/query-plans.md).
The versioned JavaScript, Rust, Lean, and Rocq parser/emitter capability and
translation boundaries are documented in
[`docs/four-language-contracts.md`](docs/four-language-contracts.md).
The full issue #195 delivery target is defined by the executable
[`parity/issue-195-requirements.json`](parity/issue-195-requirements.json)
manifest. Its generated evidence report and remaining per-runtime gaps are
tracked in
[`docs/issue-195-requirement-ledger.md`](docs/issue-195-requirement-ledger.md).

## Quick start

### Rust

```bash
cd rust
cargo test --all-features
```

```rust
use meta_language::{LinkNetwork, ParseConfiguration};

let network = LinkNetwork::parse("alpha beta", "plain-text", ParseConfiguration::default());
assert!(network.verify_full_match(None).is_clean());
assert_eq!(network.reconstruct_text(), "alpha beta");
```

See [`rust/README.md`](rust/README.md) for the full API, CLI, grammar subsystem,
and website build instructions.

### JavaScript

```bash
cd js
npm ci
npm test
```

```js
import { LinkNetwork, ParseConfiguration } from 'meta-language';

const network = LinkNetwork.parse('alpha beta', 'txt', ParseConfiguration.default());
console.log(network.reconstructText()); // alpha beta
```

See [`js/README.md`](js/README.md) for the full JavaScript API.

### Arbitrary file formats

Files that do not have a semantic parser can still be stored and transformed
without UTF-8 loss. `LinkNetwork::parse_bytes` in Rust and
`LinkNetwork.parseBytes` in JavaScript represent ordered byte chunks as tokens
and retain the caller-supplied media type or format identifier. Calling
`reconstruct_bytes` or `reconstructBytes` returns the original file exactly.

## Feature parity

The core requirement of this project is that **every feature present in Rust is
also present in JavaScript, and vice versa**. This is encoded as data in
[`parity/language-features.json`](parity/language-features.json) and enforced by
[`js/scripts/check-js-rust-parity.mjs`](js/scripts/check-js-rust-parity.mjs):

- The manifest lists each feature with its Rust and JavaScript implementation
  status and the evidence files that prove it.
- The checker verifies every evidence file exists and that the JavaScript API
  operation registry covers every operation family and API style.
- Both `rust.yml` and `js.yml` run the parity gate, so changing one language
  without mirroring the change in the other fails CI in **both** workflows.

Run the gate locally from either language folder:

```bash
node js/scripts/check-js-rust-parity.mjs            # full check
node js/scripts/check-js-rust-parity.mjs --manifest-only
```

## Case study

The analysis, requirements breakdown, and solution plan for the multi-language
restructuring live in
[`docs/case-studies/issue-163`](docs/case-studies/issue-163).

## License

Released into the public domain under the [Unlicense](https://unlicense.org/).
