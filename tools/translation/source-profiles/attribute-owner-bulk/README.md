# Whole-owner crypto source DATA

The `node-v20.19.4` directory retains complete official Node source files,
without modification, for the explicit whole-owner candidate. They are not a
compiler verdict, a runtime permit, or an alternate crypto implementation.

| File | Official source | SHA-256 |
| --- | --- | --- |
| `crypto.js` | [Node v20.19.4 lib/crypto.js](https://raw.githubusercontent.com/nodejs/node/v20.19.4/lib/crypto.js) | `9a6dc75b3111a4d9926a58d977da58b80769010287ee5cd5ed9c558d6921615c` |
| `hash.js` | [Node v20.19.4 lib/internal/crypto/hash.js](https://raw.githubusercontent.com/nodejs/node/v20.19.4/lib/internal/crypto/hash.js) | `59b744195f7fec218207f7083ff420350534ebdd1a9674fc4998334c0704f191` |
| `LICENSE.gz` | [Complete Node v20.19.4 LICENSE](https://raw.githubusercontent.com/nodejs/node/v20.19.4/LICENSE) | `42f4c42dcd1d51c0d1283df6178ac66f99e157639a6171e5e77676634c425c35` |

The complete decompressed license has SHA-256
`3716cab1c1ca53b1be9481b6d20bd8e00a4b9561d1b77427fd95e17aad6fc17e`.
Compression preserves every license byte while keeping each source file below
the repository's line bound. The source producer checks both license hashes
and a 512 KiB decompression bound.

The installed TypeScript 5.9.3 parser selects the actual complete `createHash`
and `Hash` declarations and all five actual `Hash.prototype` function
expressions. Generated exports contain immutable primitive strings. No source
profile grants authority to a function with a different identity or descriptor.
The runtime guard separately checks actual captured function source,
descriptors, prototype chains, private native-handle methods, and an empty-input
SHA-256 ABI probe. It rechecks those observations for every operation and its
final boundary. Other engines and unknown Node builds use the original lane.

The private C++ constructor becomes reachable only after the first actual Hash
construction. This qualification shares the existing trusted common-bootstrap
boundary; it does not authenticate arbitrary private native-constructor hooks
installed before that bootstrap. Later constructor-chain and handle-method
changes are checked and refused or routed to the original lane. Receiving
controls and unchanged whole original tests are still required.

The separate `node-v20.20.2` profile retains the complete current official
sources and license. The original 20.19.4 files, generated exports and pins
remain unchanged. The original complete qualification guard is additionally
retained as `node-v20.19.4/attribute-owner-bulk-crypto.mjs.gz`; its decoded
SHA-256 is `9725a02c0c7111635f998cacfe213f529562da6cad41d1348e8702fdfc8831f9`.

| File | Official source | SHA-256 |
| --- | --- | --- |
| `crypto.js` | [Node v20.20.2 lib/crypto.js](https://raw.githubusercontent.com/nodejs/node/v20.20.2/lib/crypto.js) | `9a6dc75b3111a4d9926a58d977da58b80769010287ee5cd5ed9c558d6921615c` |
| `hash.js` | [Node v20.20.2 lib/internal/crypto/hash.js](https://raw.githubusercontent.com/nodejs/node/v20.20.2/lib/internal/crypto/hash.js) | `c5920f63623364cd5dfea5d21d6377f88ea919988ba403f706e7aca6f3dcf050` |
| `LICENSE.gz` | [Complete Node v20.20.2 LICENSE](https://raw.githubusercontent.com/nodejs/node/v20.20.2/LICENSE) | `326ac2f3e528f3c0f7c80c354b1898700c7f4dcc01a67362d6dd95d5aad26c26` |

The complete current decompressed license has SHA-256
`70c7a59521f41ccfe5bb0193677b77a44ed43ad4fe59203fa408afa538214949`.
`node tools/translation/prepare-attribute-owner-node-profile.mjs --check`
reproduces both complete current outputs while checking every original and
current source pin. See the [source and runtime boundaries](../../../../docs/development/current-node-crypto-profile.md).
