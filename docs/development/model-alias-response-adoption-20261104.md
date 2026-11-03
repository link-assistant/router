# Model-alias response source adoption

SOURCE DRAFT ONLY. Tests/builds/translation trials UNRUN; CI NOT_INSPECTED.
Accounting remains12/70 DRAFTED and58 OPEN. This application source increment
closes no acceptance bundle or executable coverage claim.

The non-streaming successful JSON response branch now moves its already-owned
parsed Value through `translation_state_core::json_rewrite_model_alias` before
its original serialization/fallback. The original response status, compression
refusal, bounded body read, header removal and invalid-JSON fallback remain in
their original positions. The original `rewrite_value(&mut Value, ...)` body/API
and its streaming caller remain present. This avoids adding arbitrary mutable
Json or mem::take admission just to reuse the owned compatibility operation.
It does not qualify the complete async response/HTTP library as translated.

Three new Rust oracle sources exercise the real response entry: successful
JSON rewrite with stale entity headers removed and unrelated metadata retained;
unsuccessful status with body/headers preserved despite compression; and the
original explicit compression policy error. They join the four earlier native
JSON policy oracles in the existing module. Run them only in CI after the full
eight-stage same-SHA JavaScript gate, never through local Rust execution.

The fixed one-row response packet preserves the complete pre-adoption and
post-adoption Rust source, both source hashes, original inverse and separate
language/repository substitution sequences. SHA
`fd2ebbbd9e1d4d6e1f3ad44ce6185602538e5639adb010865a4270917e0c6afe`,
3910 compressed bytes. It extends the original immutable core packet rather
than repinning that packet. Original oracle/body-copy provenance remains intact.

The source proposer reads both packets and actual files in one canonical custody
and closing/failure fence. Every whole phase retains serialized/reparsed CST and
exact inverse. Old oracle `.before`/`.after` remain historical; `laterHistories`
and `currentAfter` expose the precise successor. The uninstalled mutable wrapper
proposal similarly retains its original images while `currentProjection` applies
its original complete function substitution to the actual current file. This
preserves the installed owned response call and all added oracles. A fresh
lexical owner census selects coordinates; it grants no Rust type, ownership,
body or executable authority. Public source/hashes/flags remain DATA.

Source review found none of the five changed state library paths in the earlier
hot successor index or fixed provenance source catalogue. Earlier state producers
patch different compiler files, while contracts/declarations/native capture use
the actual shared row table/current library. No new global history index or
source dispatch layer is needed for these library changes. The existing native
and reverse private checks must still independently qualify the enlarged family.

The full async response, mutable Json wrapper, streaming buffer/backpressure/
cancellation/EOF/error behavior, broader JSON domain and all other open bundles
remain unfinished. New full-source/CST continuation cases are drafted, UNRUN.
