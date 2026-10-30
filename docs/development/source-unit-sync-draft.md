# Three-language source-unit synchronization draft

The additive `sync-router-units.mjs` CLI drafts complete Rust/JavaScript/
TypeScript unit proposals. Its descriptor declares each unit's three physical
paths, runtime closure directories, metadata path and translation profile.
The initial profiles are `portable`, `portable-project` and `filesystem`; unsupported source still
refuses. This does not replace the existing complete Router synchronizer or
its canonical/platform/owned/reverse gate requirements.
The project profile declares per-language `dependencies` arrays. It captures
all of those physical files and treats an edited dependency as a source change
in that language. See [the pure module draft](module-project-draft.md) for its
complete native-binding/CST path and explicit limits.

Every call reads complete current files and their actual Git baseline blobs.
Automatic direction selection accepts one changed language. Concurrent edits
in more than one language, source deletion, overlapping paths and ambiguous
unchanged multi-language units refuse. An explicit authority can select an
unchanged unit but cannot silently overwrite another edited language. This
uses no persisted source/hash/owner/verdict/result cache.
Commit an installed set of projections to establish the next Git baseline;
uncommitted edits to multiple projections remain a conflict rather than an
implicit authority claim.

For `portable` Rust authority, the canonical scalar inverse can decode the
actual emitter normal form into checked meta and require both fresh Rust
reemission and independently checked JavaScript that reproduces that complete
Rust syntax. It retains original source/CST history and both semantic documents.
Only the specific unsupported-profile refusal falls back to the existing
forward translator. Native/infrastructure errors remain fatal. The whole
three-language baseline/body-edit integration regression is drafted and unrun.
Scalar absence/default envelopes and mutable scalar control flow have later
source rules; general Rust, ownership and broader generic inverses remain open.

The [paired TypeScript API draft](paired-typescript-api-draft.md) preserves
accepted original scalar aliases and optional/required signatures after Rust
authority. Paired source proposes formatting only; the final checked TypeScript
must reproduce the authoritative complete Rust syntax again. Both source
histories enter final synchronization metadata. The complete baseline/Rust-edit
API regression source remains unrun.

Language rules call the actual forward or reverse meta translator. Repository
rules relocate native-selected import literals, retain complete CST/source
inverses, package complete runtime assets and preserve actual before/after
targets. Filesystem reverse inputs require the complete actual runtime source;
an expected runtime string does not replace that physical dependency.

Plans are reviewable source artifacts, not semantic permits. Apply recomputes
the entire translation from fresh sources and refuses any changed or forged
proposal. It checks each target before atomic replacement, retains its original
bytes and attempts rollback on failure without overwriting subsequently changed
files. Source capture, Git batches and retained proposals have fixed byte and
unit bounds. No Rust tool is invoked.
The CLI uses one fresh Node worker to bind `ROUTER_NATIVE_TS_SOURCE_ROOT` to the
receiving repository before importing the compiler. It retains a 1,792 MiB heap
cap and a 120 second child deadline; receiving qualification remains required.

Input guards and whole output readback surround the transaction. Each target
also receives fresh checks immediately before replacement. This avoids rereading
every original input before every output, which would multiply filesystem work
as the number of units grows. Original modes remain on replaced files.

`translator-entrypoints.mjs` gives export, isolated-compiler and portable-Git
packaging one shared list. `prepare-unit-sync-exports.mjs` retains their three
complete original implementations and both native-selected CST/source inverses.
The new CLI is included alongside every original full-gate command; none of
those commands is replaced. These packaging changes are also unqualified.

Example descriptor shape (paths are illustrative):

```json
{
  "schema": "router-source-unit-sync-v1",
  "units": [{
    "id": "identity",
    "profile": "portable",
    "authority": "auto",
    "paths": {
      "Rust": "rust/src/generated/identity.rs",
      "JavaScript": "js/src/identity.mjs",
      "TypeScript": "ts/src/identity.ts"
    },
    "runtimes": {"JavaScript": "js/runtime", "TypeScript": "ts/runtime"},
    "meta": "tools/translation/unit-meta/identity.json"
  }]
}
```

After the entire bulk draft is complete and verification is allowed, prepare
with `node scripts/sync-router-units.mjs --manifest units.json --plan NEW_PLAN`
and install with the same manifest and `--apply PLAN`. Neither command has been
run during drafting. The regression source is also unrun. Full production unit
coverage, additional profiles, native feature parity, receiving qualification
and complete same-SHA CI remain open requirements.

The later [explicit Git baseline draft](explicit-sync-baseline-source-draft.md)
adds optional top-level `baselineRevision` to distinguish already committed
source edits from the last synchronized checkpoint. The original current-HEAD
default remains. Complete source reload/retranslation and conflict/deletion/
apply guards remain mandatory; all new cases and full delivery stay unverified.
