# SHA-256 text operation source draft

All implementation and case source in this batch is unverified and unrun.
No tests, compiler diagnostics, experiments, translators, regeneration, local
Rust tools, push or CI ran. Every unfinished requirement in
[the ledger](bulk-draft-requirements.md) remains open.

The existing text-operation family now describes
`sha256_base64_url_no_pad(&str) -> String`, with JavaScript export
`router_text_sha256_base64_url_no_pad`. Rust delegates UTF-8 hashing to its locked
sha2 dependency and URL-safe unpadded encoding to base64. JavaScript delegates
hashing to Node/Bun's native crypto implementation after the existing primitive
Unicode-scalar and one-MiB UTF-8 validation. No dependency is installed and no
SHA-256 implementation is rewritten. Native dependency internals remain
intentionally untranslated.

The native operation accepts all native string lengths. This preserves the
original native hash expression's input behavior; the translated operation
retains the existing bounded text domain. Inputs outside that domain require
separate caller/parity qualification and are not silently declared equivalent.
No Unicode normalization, string coercion, URL padding or allocation of an
application-visible digest container is introduced.

One concrete catalog row joins the existing original-native-source forward
registry, owned JavaScript/TypeScript source checker, canonical native inverse,
emission and independent interpreter paths. Existing text runtime asset
producers and generated declarations carry the new operation. Whole original
functions, source/type/loan/effect issuers, serialized/reparsed checked meta and
all refusals remain mandatory. Adding a catalog row supplies no caller authority.

Six complete JavaScript/TypeScript source equations retain their full originals,
native owner spans, separate language and repository substitutions and complete
CST inverses. The native append has its own complete compressed original and
two-stage private-operation/public-facade source equation. It joins the current
source-history leaf without rerunning or changing ancestor originals. Every
proposal remains DATA; no cross-invocation source/hash/verdict cache is added.

Independent fixed SHA-256/PKCE vector source is shared by JavaScript and Rust.
Unrun receiving cases cover actual forward JavaScript, independently strict
TypeScript, original JS/TS/native reverse source, checked-meta replay, the
independent interpreter, source changes, wrong domains, shadows, detached IR,
Unicode/NUL, malformed surrogates, the existing input bound and native hash-block
boundaries. The existing twenty text operations and their cases remain; the
complete declaration/body census expands to twenty-one. Rust oracles run only
in CI after all required JavaScript stages pass for the same SHA.

Production authentication adoption and its current complete source-history joins
remain a next source batch. Broader caller/language/effect coverage, architecture
and macro closure, current corpus/profile/reverse freshness, strict parity,
receiving-export qualification and the complete original gates remain open.
