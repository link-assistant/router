# Owned Unicode predicates source draft

The explicit `strip_unicode_whitespace(&Str) -> Text` and
`has_unicode_control(&Str) -> bool` operations reuse the genuine qualified
scalar-call parser/checker association and the existing borrowed-text/owned-text
ABI. Unknown source bindings, changed facade/leaf sources, copied nodes, wrong
ownership and const contexts retain the original refusal gates. Generic
`chars`, `filter`, `any` and `collect` implementations remain untranslated.

The target validates the entire input as Rust Unicode scalar text before
operating. Stripping uses the existing pinned Rust White_Space table; FEFF,
zero-width spaces, ZWJ, combining marks and NUL are retained. Control detection
uses General_Category=Cc, lifted from the complete pinned Rust Unicode source:
the sole short-offset run covers every scalar and its offsets `[0,32,95,33,0]`
yield ranges U+0000..001F and U+007F..009F. Complete property sources, original
lookup implementation and CSTs remain in the source plan. No JavaScript
Unicode property regexp, coercion or locale-dependent classification is used.

`prepare-core-unicode-predicates.mjs` declares fixed language and repository
source sequences. Its eight rows retain the complete before/language/after
sources, hashes, native TypeScript 5.9.3 copies for JavaScript, serialized and
reparsed CSTs, both stages and complete inverses. It adds to the current
ASCII/matches/vector facade without replacing historical source equations.
The full Rust scalar oracle is emitted by that producer and is CI-only.

The candidate must remain uninstalled until the ASCII producer composition
described below is implemented. Its eventual standalone materialization uses:

```sh
node tools/translation/prepare-core-unicode-predicates.mjs --write
node tools/translation/prepare-core-unicode-predicates.mjs --check
```

Only the integration coordinator executes those commands under the shared
resource lease. Bank/class/exports and current-composer freshness must be
refreshed separately for the final source checkpoint. The producer does not
install application edits or run Rust.

Source review found a concrete integration blocker. The existing
`prepareCoreAsciiAssets` requires the complete physical predecessor
`host-assets.mjs`; `prepareCoreAsciiBaseAssets` requires both that predecessor
and the original Host source. Their emitted helpers freshly check these full
parents, selected string runtime bytes and declarations. This Unicode layer
changes those parents. Appending it to current wrappers alone cannot satisfy
the historical producers: they refuse before reaching the new composition.
Those checks must not be weakened or replaced by a newly asserted hash.

A later source batch must compose the actual native/CST ASCII helper producers
against the complete Unicode after-sources, retain the old historical birth
and physical-source checks explicitly, refresh the selected/base helper DATA,
and then join the current wrappers and original whole receiving cases to that
complete chain. That source-generation work is not implemented here. The
rejected append-only adapter draft is retained with full before/after/inverse
sources outside the checkout at
`/private/tmp/router-unicode-append-only-composition-rejected-20261021-v1.json.gz`.
It was not generated or executed and is not part of the installed compiler.
Keeping this two-function candidate separate avoids adding an unproved
freshness exception to the existing production performance work.

`proposeCoreUnicodePredicatesCorpus` invokes the unchanged scalar source-owner
selector on a fresh complete graph, then selects exact shared-`Str` formal
occurrences of `chars().filter(|ch| !ch.is_whitespace()).collect()` and
`chars().any(char::is_control)`. The latter also requires no competing `char`
type/module/import/extern-crate binding or implicit-prelude uncertainty in the
fresh graph. The generic collection expression must be the complete tail of
a function explicitly returning the genuine owned `Text` alias; nested
collection arguments and other return types retain their original source.
Every other local binder, unrelated callback, item, body macro,
unknown attribute/import/producer or comment inside a replaced expression
keeps the original source. All untouched source bytes and full inverse
coordinates remain in the proposal. No proposal metadata grants admission.

The concrete target functions are
`rust/src/login_pty_backend.rs::compact_terminal_text` and
`rust/src/model_resource.rs::valid_model_id`. The first also needs explicit
owned `Text` return-type adoption through the existing literal-text producer.
The second keeps its actual `contains('/')`, UTF-8 byte length and other
Boolean terms unchanged, subject to fresh existing checker proofs. The new
seven-case receiving file checks complete original bodies in fixture scope,
retains their complete real parents/Cargo separately, and requires actual
JavaScript plus strict TypeScript. Original-parent and whole-corpus admission
remain separate and **UNMEASURED**. `safe_string` has additional Json/Option
and callback ownership prerequisites and is not counted as another gain.

The source-only production mapping at
`/private/tmp/router-production-source-only-adoption-mapping-20261021-v1.json.gz`
retains all 564 physical source inputs and joins all 125 previously qualified
formatting selections to exact complete original functions. Its SHA256 is
`44c6107594c3993228fc86a98b17366a35df4360397de8c9765664c3ea59261a`.
Those selections cover 88 historical format-first functions, zero of the 106
borrowed-str-first functions, zero of the 79 matches-first functions and zero
of the 31 vector-first functions. The historical compiler is stale. Current
three-stage production timed out before a result and provides no coverage
gain. These categories are not added together or substituted for fresh
whole-project checking.

Larger next groups remain 165 distinct mutable/shared-reference first refusals
and 36 assignment-target refusals. They need actual alias/lifetime or owned
record field-update proof, often alongside Json/state/IO prerequisites. The
18 lexical-callable refusals need a real callable capture and invocation
contract. Removing their current guards would not constitute a sound batch.

Reverse executable support for the new runtime exports is not implemented.
The source CST inverse establishes fidelity only; it does not prove reverse
Rust generation, bidirectional runtime equivalence, actual executable coverage
or a complete JavaScript-first gate. No source generation, receiving runtime,
local Rust or complete gate was run for this draft. Syntax-only checks passed.
