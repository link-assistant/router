# Compiler export with physical paired native inputs

The additive `exportPairedCoreTranslatorBundle` draft copies the complete
partitioned exporter and adds the three physical native input files used by the
fresh primitive sequence, primitive owned vector and owned String vector source
readers. Previously, the compiler export selected `tools/translation` and CLI
source only. Its source profiles retained originals but did not create these
actual files at the URLs the fresh readers open. Importing a copied discovery
API without invoking those readers could miss this delivery gap.

The required physical inputs are:

- `rust/src/translation_primitive_sequences_core.rs`
- `rust/src/translation_primitive_vectors_core.rs`
- `rust/src/translation_owned_text_vectors_core.rs`

Each enters the same complete committed Git tree/index comparison, ordinary
physical file/directory checks, bounded descriptor reads, exact original blob
and mode verification, input partitions and every original final source fence.
Every original input must still appear exactly once. All three native inputs
are mandatory in the committed tree. Missing, dirty, staged, linked or replaced
native inputs refuse before destination creation. The copied compiler's fresh
unborn index also enumerates the exact native blobs and original modes.
The complete committed project `LICENSE` is a separate mandatory source input,
retained alongside all previously selected vendor/original-source notices. Its
bytes, mode, index entry, partition row and closing checks have the same guards;
a missing project license refuses before output. The manifest identifies that
source row separately from native source rows. This makes no legal or semantic
claim from a filename: it preserves the actual original license bytes.

The public original `exportTranslatorBundle` and `exportPartitionedTranslatorBundle`
remain unchanged, including their original selections and refusal domains. The
existing `export-router-translator.mjs` CLI selects the additive exporter through
one repository substitution; its options and source-only receipt remain intact.
Three source equations retain the entire original exporter, original CLI and
preparer predecessor, both fixed rule phases and complete inverses.

Original limits remain unchanged: 2,048 files per partition, the existing 8,192
logical input allowance, 4 MiB per file, 64 MiB for complete source plus metadata,
four partitions, original Git time/output bounds and original case/child-process
deadlines. Native inputs count against these allowances; they do not receive a
separate budget or bypass. No across-operation source/hash/result cache is added.
No local exporter, parser, translator, preparer, test or compilation has run.

The manifest separately lists the three native compatibility source rows, with
exact bytes and digests, and retains false native-compilation, caller-binding,
namespace and runtime-parity claims. These are compiler source dependencies,
not a complete compiled Rust application or a native ownership permit. The
receiving project's full actual source graph, Cargo inputs and matching pinned
TypeScript dependency remain mandatory for actual forward/reverse caller work.
This draft does not export Router application root modules or executable state.
Additional fresh-reader families must explicitly extend the input list and their
independent receiving cases; filename spelling is never semantic authority.

Independent UNRUN cases cover exact committed native membership and index rows,
unchanged old export selection, absent/dirty/staged/link source refusals,
exclusion of unrelated application roots, CLI selection, unchanged original
file-count refusal, project-license membership/refusal and native/license members
across the original partition boundary.
A real copied-compiler case invokes all three fresh native readers, constructs
the owned-text receiving source set and reissues its complete source ABI through
the copied modules. It then tampers only with the copied owned-text native file,
requires refusal, restores it and requires a fresh independent operation. This
checks that the copied reader uses its own physical input rather than borrowing
the source repository's Rust file.

That receiving case supplies the existing installed TypeScript dependency via
the documented native-TS source-root setting; no new dependency tree is copied
or installed. Only third-party compiler loading uses that setting. Fresh native
source URLs continue to resolve relative to the copied modules, as the copied
file tamper case requires. The case executes no Rust tool and remains UNRUN.

Actual copied-compiler qualification, original producer/namespace closure,
native root/caller registrations, mutation/helper/loop integration, canonical
inverse/adoption, complete production coverage, parity, freshness and final
delivery remain OPEN. Every required JavaScript stage must pass for the same SHA
before Rust CI, whose failures remain fatal. Source checkpoint publication does
not qualify this exporter or lift the current source-only execution prohibition.
