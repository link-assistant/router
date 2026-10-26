# Production base64 core adoption source draft

This batch is entirely unverified. No tests, experiments, diagnostics, translation,
regeneration, local Rust tools, push or CI ran. Every unfinished requirement in
[the ledger](bulk-draft-requirements.md) remains open.

Eleven original calls in nine production files now use seven existing concrete
base64 compatibility operations. The source batch covers deployment transport,
deployment HMAC fingerprint decoding, JWT claim readers, authentication diagnostic
claim reading, provider secret packing/unpacking, document bridge encoding and
decoding, and the fixed 32-byte random login value. A tenth file removes the
parent Engine import no longer needed by its production child. Native test
imports remain configured for tests, and existing independent library calls in
those tests are retained.

Every selected operand remains unchanged at its call boundary. The owned
signature String and packed Vec are consumed; borrowed text/byte operands remain
borrowed; the 32-byte array retains its by-value contract. Existing error mapping,
padding policy, error identity and Display handling remain in the surrounding
source. SHA digest temporaries and other unqualified inputs remain outside this
batch rather than being coerced into a supported ABI.

`prepare-production-core-base64-adoption-sources.mjs` delegates to the reusable
`pinned-rust-source-recipe.mjs`. The compressed profile retains every complete
original file, SHA, exact UTF-16 edit, selected lexical item, operand convention
and proposed complete output SHA. Complete current native facade/leaf guards,
bounded decompression, original lexical token boundaries, ordinary file paths,
nonoverlap, unchanged operands and final input rejoins remain required. The
`language` sequence retains complete source and unchanged-operand call intents;
the `repository` sequence substitutes qualified core paths, imports and
token-preserving formatting.
Both sequences pass complete serialized/reparsed Rust CSTs and retain complete
source inverses. There is no persistent source/hash/verdict/result cache.

This development recipe constructs a source proposal. Its lexer/CST selections
are not native compiler owner proofs, and the proposal cannot issue semantic,
ownership, namespace or executable permission. Existing forward/reverse semantic
rules and the full receiving gates must independently qualify the new complete
callers. `--emit` and `--check` are drafted review interfaces, not commands run
during this phase. Changed originals require an explicit next source recipe.

Independent unrun JavaScript source cases cover the complete batch and inverses,
original-only proposals without writes, argument and owner changes, overlaps,
literal-interior edits, archive/source changes, symlinks and accessor refusal.
Application-relevant Unicode, binary, empty and padding cases join the existing
thirteen-operation behavior/strict-TypeScript/forward/reverse cases. New native
oracle source independently compares borrowed/moved inputs, actual native error
identity and text, and once-only expression evaluation. Rust is CI-only after all
required JavaScript stages pass for the same SHA.

No new executable coverage percentage is established. Broader production caller
lowering, architecture and macro owner/export closure, every other language and
effect domain, source-history/profile/reverse/strict-parity repairs, exported
receiving qualification and all original verification obligations remain open.
