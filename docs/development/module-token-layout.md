# Native token copies in original module views

On Node 20, freezing spread-created token records can retain substantially more
heap than freezing equivalent object literals. An issue #784 probe used the eight
largest current `rust/src` files, separate 256 MiB processes, explicit GC and
47,824 retained tokens. The complete original view/item digests matched. The
original implementation retained a 14,819,416-byte heap delta; the installed
guarded implementation retained 5,664,408 bytes. These are finite diagnostic heap
deltas, not exact retained-root measurements, a full compiler memory result or
an executable-function coverage gain. A separate Node 26 hypothesis probe did
not show the same material difference.

`source-module-views.mjs` now selects fixed-order `type`, `text`, `start`, `end`
object literals only immediately before its private lexer runs on a primitive
string under `originalStaticSourceIntrinsicsUnchanged()`. The complete lexer,
item boundaries, offsets, freezing, module identities, configuration handling and
all original resource bounds remain unchanged. There is no token cache or shared
token identity between captures. Every customized operation retains the original
spread callback, including enumerable extra properties and symbols. A hook that
restores itself during lexing still uses the qualification taken before lexing.

This uses the existing trusted common-intrinsics bootstrap. It does not claim
equivalence of importing that bootstrap for the first time under hostile hooks.
The added guard observes through the common issuer's captured native operations;
the receiving observer cases initialize that issuer before installing hooks.
Source views and token shapes retain their existing lack of namespace,
attribute-owner, type and executable authority.

`prepare-module-token-layout.mjs` retains the complete source from commit
`007dc7f3a3a882d17ab87d2a53067ebb236f948f` at its original SHA-256. The installed
TypeScript 5.9.3 parser and checker select the actual token callback inside
`originalItems` and join every token/span identifier to its lexical binding.
Language rules introduce the guarded literal copy; repository rules bind the
existing common issuer. Both complete CST phases are serialized, reparsed and
reconstructed, with independent native-span and complete phase inverses.
Unrelated original or current source changes refuse. Regenerate by reviewing
`--emit` and installing its exact `after`; `--check` requires exact freshness.

The five new receiving cases and the entire existing module-view test file pass
under Node 20.20.2 and Bun 1.4.4: 17 cases per engine. Node's independent source
deadline audit passes with installed TypeScript 5.9.3. The new whole-source
comparison checks every one of the 567 tracked `rust/src` Rust files against the
complete pinned original implementation. Other cases retain Unicode and opaque
literal spans, configurations, fresh frozen identity, changed-source refusal,
getter/symbol observations, self-restoring hooks and complete source-producer
refusals. The original receiving file and its bounds are untouched.

The complete profile build, owned-definition generation, forward/reverse
qualification and strict parity remain required. This change alone establishes
none of those results and does not authorize a Rust job or release.
