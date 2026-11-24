# Vendored tree-sitter grammars

These WebAssembly grammars are compiled from exactly the generated parsers the
Rust crate links (`rust/Cargo.lock` crates or `rust/vendor`), so both
runtimes parse with the same grammar revision. They are rebuilt by
`node js/scripts/build-vendored-grammars.mjs` with tree-sitter CLI
0.27.0 and verified against `grammar-lock.json` by
`--check`. Each file is a zero-mtime gzip of the `.wasm` whose SHA-256 is
listed; the parser digest is of the generated `src/parser.c` (after the
listed patch, if any).

The tree-sitter oracles of the languages a native grammar parses are
development files this package does not ship (`js/oracles/grammars` in the
repository).

| File | Source | parser.c SHA-256 | wasm SHA-256 | License |
| --- | --- | --- | --- | --- |
| `bash.wasm.gz` | crate `tree-sitter-bash` 0.25.1 | `5ad30bb1a260c76df5397490b8bd97e272e62ed9c99be36fa53da959d7667e7f` | `f0270796c32f9acfc180e6068d6bef6614b983107b679a247fb63b200c6346e7` | [`bash.LICENSE`](bash.LICENSE) |
| `csharp.wasm.gz` | crate `tree-sitter-c-sharp` 0.23.5 | `0a2651e49de7c7237c535c41a132a7ec0424da79d12f197f1df3edd7d6ea4427` | `a4b053f6fdedfc9c94876b415441ea953c0046ef83d45e0cbc4d9b8938ae6cbc` | [`csharp.LICENSE`](csharp.LICENSE) |
| `elixir.wasm.gz` | crate `tree-sitter-elixir` 0.3.5 | `d1c2000b477e873e44e485f55809e3af7e2bfce83fa4d58cfa3a9f83660e7d79` | `33f71c86131d02eab80841e4142005ccaa54bcc06bcc3a7e8dc6a9a8a0ca5e94` | [`elixir.LICENSE`](elixir.LICENSE) |
| `elm.wasm.gz` | crate `tree-sitter-elm` 5.9.4 | `7c993bdabb63c6c6424fc0b433073c9000446a0e3de189d8a2ab93b33636369d` | `30e2708c30704223fa0351428d4e81aef32acd9121a7ea35606ddc9fa45bc319` | [`elm.LICENSE`](elm.LICENSE) |
| `haskell.wasm.gz` | crate `tree-sitter-haskell` 0.24.1 | `a136b31118c6767f3a9fbbb245adc559370eabd914b72b90438395542327a089` | `ea89cb1199b1ca2102e273b27239e795baff17248128a9bcd3c3825ac17d8cc0` | [`haskell.LICENSE`](haskell.LICENSE) |
| `kotlin.wasm.gz` | crate `tree-sitter-kotlin-ng` 1.1.0 | `9ff65161845b9e9c9d62c12e9a4e4b8d8628bdc31c681ec7e6b4bd3bd6444cb3` | `5d44eef5c02b4546f01ddc376ed237294b18604f727b192a832a5ce08a040e8f` | [`kotlin.LICENSE`](kotlin.LICENSE) |
| `markdown.wasm.gz` | crate `tree-sitter-md-025` 0.5.6 (`tree-sitter-markdown`) | `0f51c93b5d79d08bc74088d91a9aafb7e40ad7e2f169164865c01d392277bb07` | `479b27880bce5dc9501d8cfa7f427eb2f5ffcb143ef5863fa02296da02c830e9` | [`markdown.LICENSE`](markdown.LICENSE) |
| `markdown_inline.wasm.gz` | crate `tree-sitter-md-025` 0.5.6 (`tree-sitter-markdown-inline`) | `0c6aaec9097b10118b34601047c3b4d3d565defe48e95d133f714b592795fd2c` | `3e1db657850e83e19e2769157c24eac7b590d8bc869c2753201417c40298b388` | [`markdown_inline.LICENSE`](markdown_inline.LICENSE) |
| `matlab.wasm.gz` | crate `tree-sitter-matlab` 1.3.1 | `d13d9cfa1cead80c000e21ed37833df31d910fe531a5cb11165a850c384a4960` | `2fd8f9f251c59a0242a8899d6725a8edc47ff477371497ba2025f9ee8cc8a57c` | [`matlab.LICENSE`](matlab.LICENSE) |
| `ocaml.wasm.gz` | crate `tree-sitter-ocaml` 0.26.0 (`grammars/ocaml`) | `f76cc46f96f9ed152354743539cc642dcb6a67343795dd9d548fc4d0b0ebce74` | `bfa3eef92b9d3cc1117aa486d46ecb06c98a3a28c1747660aaa5851df5e4530c` | [`ocaml.LICENSE`](ocaml.LICENSE) |
| `ocaml_interface.wasm.gz` | crate `tree-sitter-ocaml` 0.26.0 (`grammars/interface`) | `62634bd351247bd2152eb15438f5bea3f0a1ccce4291f318aa86a79d29bf111e` | `3ce03850c36618e3530292372aae9156a45b5a923210a87c285539d7f13b0354` | [`ocaml_interface.LICENSE`](ocaml_interface.LICENSE) |
| `perl.wasm.gz` | crate `ts-parser-perl` 2.0.0 | `1317bdaae2f50f5f82b6dbc7176425e9cee64a0dbfbb82aa17959aaefc54f199` | `af4e99e2379e9ae0228357a15f0d3b6037846b8a328deafb70dfa7a13b58b140` | [`perl.LICENSE`](perl.LICENSE) |
| `php.wasm.gz` | crate `tree-sitter-php` 0.24.2 (`php`) | `59ad8e5e4fde3fe60687a488ab8420612840cc966b83739af1b3a4317ed27ec6` | `a100e693f0133e5f559a5d90daf4ba9c12607162108c80368f2dfcbac0ec8bff` | [`php.LICENSE`](php.LICENSE) |
| `ruby.wasm.gz` | crate `tree-sitter-ruby` 0.23.1 | `4ce468358b6f4e25a35c8cf6bc0eaf60665bc22d602f8c939323c2347255cd15` | `2a06cd2fa165a2913f6598b92c9d3d3132ecfbf3fa7ffa8ca93b31efb2bfb58d` | [`ruby.LICENSE`](ruby.LICENSE) |
| `scala.wasm.gz` | crate `tree-sitter-scala` 0.26.2 | `9f6d03fa6c63d2d855b6f9e0368046a58568587eefc38b5e38bdb001e8ec68db` | `c2d92c43913a24efa76528c6aff75c97c0964798c4d360c7dc1951b04058fe52` | [`scala.LICENSE`](scala.LICENSE) |
| `swift.wasm.gz` | crate `tree-sitter-swift` 0.7.4 with [`tree-sitter-swift-wasm.patch`](../../../../js/scripts/grammar-patches/tree-sitter-swift-wasm.patch) | `1d332e60ec28e6b398db36e06bf05414061dfbbd3e981b33ff1edfd5159e3e08` | `5b54286c25842ea5c60a659f4f3276af7419d877f8946ef4b8d26b86849f1708` | [`swift.LICENSE`](swift.LICENSE) |
| `yaml.wasm.gz` | crate `tree-sitter-yaml` 0.7.2 | `8a3baaab33fb63cf9a89f97ec61dbb3ab0d4ef69be9f0f229092c79d129617c9` | `f89cf2a8ccd4f29292e502f1c37efb4f1dead281246605e0a890c697d4db88c7` | [`yaml.LICENSE`](yaml.LICENSE) |

Every grammar is distributed under its upstream license (MIT unless the
linked license file states otherwise).
