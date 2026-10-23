# Keep complete source banks within the original export budget

The complete source bank after the actual formatting adoption contains
21,029,159 decoded bytes. Native level-nine gzip produces 4,198,746 bytes, which
exceeds the unchanged 4,194,304-byte export cap. Preserve this refusal and every
decoded byte rather than increasing the exporter budget.

`gzipStaticSourceStorage` first executes the existing native gzip operation.
When its complete output exceeds that cap, a Buffer input of at most 32 MiB may
use the pinned precompiled Google Zopfli C/WebAssembly implementation. One
iteration and the original block-splitting settings bound that optional work.
Larger inputs retain native gzip behavior. The fallback independently decompresses
the entire result and requires exact input equality, then selects it only when
smaller. The format and existing reader remain ordinary gzip. This operation
adds no source, hash, owner or compiler-result cache.

Complete actual-bank experiments produced identical 3,999,128-byte gzip streams
under Node 20.19.4 and Bun 1.4.3, SHA256
`102cfd3e3e3efa11f3af7c93ce3b83d2286f85b10955587e59edc14994a9ffec`.
Both restored every original byte. Observed wall time and aggregate sampled
peak RSS were 40.017 seconds / 219,037,696 bytes for Node and 38.097 seconds /
188,284,928 bytes for Bun. These are bounded diagnostics, distinct from whole
test qualification and full-gate results.

`prepare-zopfli-vendor.mjs --emit` proposes the complete pinned upstream copy
with separate language and repository substitutions, native syntax, complete
CST round trips and inverse. `prepare-strict-static-source-producer.mjs --emit`
selects the actual storage call in a complete native copy of the original
producer. Its three repository edits rename the explicit strict sibling, bind
the storage helper and insert its import after the shebang. Independently
review and install actual producer outputs, then require both `--check`
commands. Original producer APIs, unknown-existing-output refusals, immutable
historical universes, full physical/Git checks and every limit remain intact.

The [original package and license](../../tools/translation/source-profiles/zopfli/NOTICE.md)
remain inspectable. No compiler or Rust tool runs locally. Source preservation
and compression do not establish executable coverage, runtime parity or a green
same-SHA JavaScript gate. Regenerate and qualify actual receiving compiler
exports and all mandatory translation directions separately.
