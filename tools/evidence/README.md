# Complete evidence packets

`capture-packet.py` creates a verified XZ/TAR packet from an explicit manifest of complete originals. It needs Python 3.9 or newer and Git, with no Rust build, network access or third-party package. Node/Bun behavioral tests cover reopening every original, duplicate hardlinks, changed bytes, linked inputs, escaping names, stale commits and output preservation.

Prepare a JSON object with a `members` array. Each entry contains `path` (a canonical relative TAR member name), `originalPath` (the absolute original filename), `bytes` and its complete `sha256`. Include entire raw failed and passed logs, input vectors, executed harnesses, reviewed source snapshots and reports. Existing outputs are never overwritten; original sources are never removed.

```sh
python3 tools/evidence/capture-packet.py \
  --source-root . --head FULL_IMMUTABLE_GIT_SHA \
  --manifest /tmp/complete-members.json \
  --archive /tmp/new-complete-evidence.tar.xz \
  --receipt /tmp/new-complete-evidence.json --cap-seconds 600
```

The tool hashes each original before, during and after streaming, reopens every complete archive member and checks exact decoded lengths/hashes. Duplicate candidates use backward TAR hardlinks only after comparing every complete byte, both hashes and stable opened-fd/named-path identities. A matching digest alone cannot authorize an alias. The receipt preserves every original path, length and hash, the immutable source commit and harness hash; aliased rows record `fullByteEqualityBeforeHardlink: true`. XZ preset9 uses a 64 MiB dictionary; that setting is not measured peak memory. Resource claims require independent actual telemetry.

The selected scope is bounded to 8,192 originals, 128 MiB per original, 1 GiB of complete originals and a 16 MiB manifest. The finite deadline is checked between bounded reads and archive operations; use an enclosing process deadline for hard termination. Failed captures keep their output for inspection and issue no successful receipt. System `/tmp` and `/var` aliases on macOS resolve to their real roots; other linked evidence paths are refused.

This tool changes storage only. It does not certify semantic admission, runtime parity, a JavaScript gate or permission to run Rust or publish. Check the destination evidence allocation against the task's fixed budget before installing a packet; keep historical failure packets intact.

## Deterministic complete capture shards and index pages

`shard-packets.py shards` plans smaller captures from complete frozen manifest
pages in the same four-field input format. It preserves every declared logical
name and full original path/length/SHA row. It sorts by the exact logical name
and uses deterministic next-fit placement under 64 MiB of **full logical bytes**,
8,192 members and the existing 16 MiB manifest bound. Hash-equal rows still count
in full and remain separate members. `--shard-bytes` may lower the 64 MiB target;
it cannot raise it. An individual original larger than the target refuses and
stays intact for separately qualified storage, rather than being silently
split, dropped or accepted as an oversized shard.

```sh
python3 tools/evidence/shard-packets.py shards \
  --input /private/tmp/frozen-members-1.json \
  --input /private/tmp/frozen-members-2.json \
  --output-directory /private/tmp/new-shard-plan \
  --pending-root /private/tmp/still-running-evidence --cap-seconds 30
```

The fresh output contains complete capture manifests and a full row-to-input
and row-to-manifest ledger. Input metadata is read through validated directory
descriptors and rechecked after planning; duplicate JSON keys, nonfinite values,
boolean byte claims, conflicting logical names, links, changed inputs and
existing output directories refuse. Limits include 128 input pages, 64 MiB of
aggregate input metadata, 131,072 declared rows and 4,096 output shards. Each
input page retains the original 1 GiB logical/8,192-member/128 MiB member limits.
The planner deadline defaults to 30 seconds and cannot exceed 170 seconds.
Partial failed outputs remain available; no successful plan is issued on failure.

Planning does not read or hash original bodies, run a compressor, infer source
authenticity, install evidence, or establish complete latest membership.
`pendingRoots` stays explicitly pending. Run each planned manifest through the
unchanged capture CLI, preserving its original time/resource caps and full
readback. Measure one whole shard before scheduling the rest; smaller logical
size alone does not establish a compression deadline or physical fit. Keep
already verified archive parts immutable and append later frozen roots in new
parts, without recursively archiving an immutable archive and its members again.

`shard-packets.py index-pages` repages explicit **ordinary**
`complete-packet-git-index-v1` inputs after genuine archive witnesses exist.
It emits that same ordinary format in pages of at most 64 archives and 4 MiB,
plus a ledger retaining every input witness occurrence. Conflicting rows for
one archive refuse. Identical repeated rows retain all input provenance; this
is metadata consolidation, not payload alias authority. Capture-slot plans,
ranges, alias chains and foreign Git paths cannot become ordinary witnesses.

```sh
python3 tools/evidence/shard-packets.py index-pages \
  --input /private/tmp/actual-ordinary-index-1.json \
  --input /private/tmp/actual-ordinary-index-2.json \
  --output-directory /private/tmp/new-ordinary-index-pages
```

These plans do not authenticate Git objects. For actual recovery use the
unchanged `packet.py --index PAGE --members-receipt COMPLETE_RECEIPT` with the
page chosen by the complete ledger. Its existing ancestry/blob/full archive and
member checks remain mandatory in both physical states. A shallow checkout
without the declared ancestor still refuses; obtain the genuine published
history explicitly. No digest or planner metadata replaces a complete archive,
original, failed partial, receipt or recovery proof. The fixed case allocation,
full continuity checks and any separately authorized retirement remain unchanged.
Shard page slots are provisional and count only those new captures. Generate
actual pages from all real ordinary witness inputs, including retained old
archives; do not treat an unfilled slot as a witness or omit an old archive.

`storage.py` resolves a CI logical object while preserving its original compressed container and decoded report. `Storage(case_root, repository_root, index=...)` accepts an index path relative to the **case root**, including a custom index location. The `ci-object-batch-index-v1` index maps each CI-relative logical path to original container length/SHA, decoded length/SHA, one case-relative batch archive/member, and a full immutable Git commit/path/blob witness. Archive length/SHA and the exact complete member list are also pinned. Repeated JSON keys, missing/extra targets, links, traversal, nonregular members, inconsistent receipts, incomplete streams and byte-budget violations refuse. Index maps are immutable within each reader.

`read_container(name)` returns the complete original compressed bytes from that exact reachable Git blob; it never recompresses a report. A full local repository containing the declared ancestor commit is required, and lazy fetching is disabled. Missing or shallow Git witnesses refuse. If the old physical path still exists, it must match the Git bytes exactly. `iter_decoded(names)` verifies and streams every complete member of each requested batch, including members that a caller did not request. Every indexed decoded member also joins an independently streamed hash of its exact original Git container before archive acceptance, so a mirrored index/archive mutation refuses. Callers must consume the requested streams completely. No report is expanded onto disk. Before a staged batch archive is installed, the same decoded API can recover and verify the original Git container.

The case CI collectors, migrations, index builder, verifier and summary share this resolver. Their existing current receipt paths, hashes and original metadata remain unchanged. The verifier's default scope remains every current run, direct-job and artifact text manifest plus metadata provenance and remaining physical files. An explicit `--manifest-list` and `--objects-list` test scope keeps full source manifests, counts excluded references and never claims complete archive integrity. Historical artifact-selection snapshots retain old aliases; they are distinct from the current manifest scope.

Physical allocation and original logical-container sizes are separate measures. Removing an old physical object requires a verified logical index and an immutable reachable full-container Git witness first. Install the new archive outside the capped case, activate the index while originals are still present, verify Git fallback, remove only the witnessed old physical objects, and then atomically install the fully verified archive. Repeat the complete current integrity scan and physical measurements before committing archive changes. The storage code does not authorize this migration or deletion; an archive owner applies it between frozen verification jobs. Keep all historical logs, source variants, failed attempts and prior compressed containers recoverable.

A decoded batch may also remain only in reachable Git when every original indexed container has its own verified Git witness. The same resolver then streams those complete original containers and checks every requested decoded length and hash. Before removing a physical batch, verify its full Git blob and record its commit, path, blob, length and SHA256 in a durable witness receipt; repeat complete integrity and CI measurement checks after removal. A full local history remains required. Integrity reports count declared batches separately from physically present batches, and physical allocation measures only present files. Historical batch bytes and all original compressed containers remain recoverable without recompression.

The summary preserves its existing artifact selection counts and byte totals from the unchanged historical receipt sizes, and labels their scope explicitly. `current_text_manifest_measurement` separately measures current logical containers through the resolver; `storage_physical` counts distinct current inodes and allocation. Neither a missing historical alias nor a historical container-size fact is silently replaced. Existing migrated XZ receipts with `original_gzip_sha256` retain the old `compressed_bytes` fact and use their existing `bytes` field for the current container length; other compressed receipts use `compressed_bytes`. Current content hashes are always checked.

`packet.py` recovers a complete non-CI evidence archive from an exact reachable
Git commit, path and blob. A case-relative `complete-packet-git-index-v1` index
maps each archive to its original `bytes`, `sha256`, and `git` witness
(`commit`, `path`, `blob`). Git paths must equal
`docs/case-studies/issue-759/` plus the declared relative archive path. Linked
roots/inputs, missing or foreign witnesses, replacement objects, lazy fetching,
changed physical archives and malformed/duplicate index keys refuse. The reader
stages only bounded compressed bytes and verifies their complete hash before
opening a member stream. TAR decoding stays bounded and streamed; complete
receipt lengths/hashes, exact member names, backward duplicate hardlinks,
compression memory and total decoded budgets are checked. Expanded reports are
never written to disk.

```sh
python3 tools/evidence/packet.py \
  --case-root docs/case-studies/issue-759 --repository-root . \
  --packet raw/current-task/source-variants-batch-v3/complete-evidence.tar.xz \
  --members-receipt docs/case-studies/issue-759/raw/current-task/source-variants-batch-v3/original-capture-receipt.json.gz
```

`--copy-to NEW_FILE` restores the complete original archive after full member
verification and refuses overwriting an existing or linked destination.
Python consumers can use `PacketStore(...).verified_archive(relative_name)` as a
seekable, fully verified compressed stream for original member recovery. A
missing physical archive uses the same unchanged Git bytes; a present archive
must match them. Keep the original capture and installation receipts unchanged.
Before removing a physical archive, preserve its exact commit/path/blob/length/
hash witness, exercise complete member recovery in an absent-file overlay,
verify all existing consumer and CI measurements, and calculate physical
allocation under the fixed case cap. Only the archive owner installs that
reviewed migration between frozen verification jobs. Hash-only claims do not
replace a complete source variant, raw log or original compressed container.

## Complete opaque originals stored as archive byte ranges

The additive `complete-packet-range-index-v1` reader handles an original that is
an exact byte range of a declared complete compressed archive. It never interprets
that range as TAR. In particular, an incomplete failed archive can remain a complete
retained **failed artifact** without becoming a valid packet or member inventory.
The ordinary archive-v1 reader and the CI container reader retain their existing
formats and checks.

A separate case-relative index has exactly `schema` and `ranges`. Each canonical
logical name maps to exactly `archive`, `offset`, `bytes` and `sha256`. `archive`
must directly name an entry in the existing ordinary packet Git index. A range
cannot supply a Git witness, point at another range or add an alias chain. For
example, both a failed original and its independently recovered copy may have
distinct names and the same full offset/length/hash identity. Populate these
fields only from the complete original ledger and retained recovery records.

```json
{
  "schema": "complete-packet-range-index-v1",
  "ranges": {
    "failed/original-v1.tar.xz": {
      "archive": "raw/complete-part-1.tar.xz",
      "offset": 0,
      "bytes": 25372817,
      "sha256": "<complete-original SHA256>"
    },
    "recovered/original-v1.tar.xz": {
      "archive": "raw/complete-part-1.tar.xz",
      "offset": 0,
      "bytes": 25372817,
      "sha256": "<same complete-original SHA256>"
    }
  }
}
```

Use `PacketStore(...).recover_range_object(logical_name, fresh_output,
range_index='packet-range-index.json')`, or the separate CLI mode:

```sh
python3 tools/evidence/packet.py \
  --case-root docs/case-studies/issue-759 --repository-root . \
  --logical-object failed/original-v1.tar.xz \
  --range-index packet-range-index.json --copy-to /private/tmp/fresh-v1.tar.xz
```

The reader authenticates the complete reachable Git archive and any physical
archive using the original reader. The new path stages one private named compressed
file instead of a second spool. The unchanged `archive_range.py` helper then
authenticates the full archive again and checks the slice's complete SHA256 while
writing only a fresh regular output through unlinked directory descriptors. A
present physical logical original must independently match its declared full
length/hash; it never bypasses a missing or bad archive witness. Both logical names
get independent full recovery receipts, including the range-index byte identity,
archive/Git witness and complete helper receipt. Private staging is closed and
removed on completion; failed fresh recovery output is retained without success.

The range index is at most 4 MiB, with at most 8,192 rows and 1 GiB of declared
originals. A source archive is at most 256 MiB and each slice at most 128 MiB.
Duplicate JSON keys, nonfinite numbers, bool sizes, unknown fields, links, escaped
names, nonregular indices, changed paths and out-of-bounds ranges refuse. The
existing shared finite deadline covers index reads, Git staging and the helper;
the helper receives only whole remaining seconds and refuses when none remain.
New staging uses a nonblocking deadline-aware pipe and kills/reaps its process
group on failure, with a bounded five-second cleanup wait. No working deadline,
member limit or packet admission rule is raised.

This source extension does not adopt the two issue-759 V1 aliases or remove any
original. Before adoption, retain the complete joined 153 recovery records and
direct byte comparison, join both rows to the original full ledger, reopen all
4,853 historical and 1,971 reused packet members, verify physical-present/absent
reader behavior, repeat every CI/integrity/measurement continuity check and measure
the final physical allocation under the unchanged 500,000,000-byte case cap.
Preserve original V1, full V2 and fresh recovered files until those controls and
the reviewed installation succeed. Storage receipts grant no semantic or Rust
authority. The complete two-file guidance/range group passes all seven cases
under Node and Bun, including all 23 Python packet controls and the nine unchanged
range-helper controls, on source `d909397cead5b25f8996325bce014b79c14b63fa`.
An additional control on source `bc62cfedc40bfdcedb942d982d19c66edf561766` uses
the real 58,163,080-byte V2 archive in a fresh temporary synthetic Git repository.
The new consumer recovers both complete 25,372,817-byte V1 logical artifacts with
the archive/logical overlay present, then absent, comparing all 50,745,634 output
bytes directly against the preserved original. Both full outputs and joined source,
Git, index and recovery records remain retained; original source hashes and file
identities stay unchanged. The synthetic Git fixture is removed only after success.
This verifies actual artifact recovery, not a durable real-case Git witness or
adoption. Historical member continuity, installation and final packet fit remain
pending; the original V1, V2 and earlier fresh recovery remain intact.

## Exact originals decoded from existing gzip members

The separate `decoded_original.py` lane reconstructs opaque raw bytes with one
fixed operation: gzip decoding of a direct regular member in an ordinary packet.
It accepts no commands, code, codec options, text interpretation or JSON-body
normalization. This does not change ordinary packet, range or CI reader behavior.
The existing CI decoded-member limit remains 128 MiB. This new output-only lane
has the already qualified gzip-proof 512 MiB raw-file bound; packet members stay
at 128 MiB and archives retain all existing member/count/decoded-byte limits.

A separate, strict `complete-packet-gzip-decoded-index-v1` JSON index has exactly
`schema` and `objects`. Each canonical logical name maps to exactly `archive`,
`member`, `codec` (only `gzip`), `gzipBytes`, `gzipSha256`, `bytes`, `sha256` and
`membersReceipt`. The latter has exactly `path`, `bytes` and `sha256` naming a
complete plain JSON `complete-evidence-packet-v1` capture receipt relative to the
case root. Its archive identity, full inventory and totals must match the direct
ordinary archive witness. Both the complete original gzip and raw length/hash
are retained, rather than substituting the original's digest for its body.

```sh
python3 tools/evidence/decoded_original.py \
  --case-root docs/case-studies/issue-759 --repository-root . \
  --logical-original recovered/full-original.raw \
  --copy-to /private/tmp/fresh-original.raw
```

Every archive member is first verified through the unchanged complete packet
verifier. A second fully authenticated compressed stream extracts only the
declared direct regular gzip member. The existing deadline-aware named Git stage
is used for both passes; staging, full verification and gzip decoding share the
170-second internal deadline. The caller must retain the 180-second outer and
1.5 GiB RSS monitor. One private compressed stage exists at a time. The decoder
hashes/counts every gzip byte and every raw byte while writing only a fresh regular
`O_EXCL` output through validated directory descriptors. Both index and capture
receipt identities, stage identity and output path are checked again before a
successful receipt. Failed fresh outputs are retained without success.

The decoded index is at most 4 MiB and 8,192 objects, declaring at most 1 GiB of
raw originals in total; a capture receipt is at most 16 MiB. Duplicate/unknown
keys, booleans or nonfinite sizes, links, escaping names, nonregular sources,
wrong gzip/raw witnesses, decompression overflow and source/path replacement
refuse. Empty encoded input is not a gzip frame and refuses; a genuine gzip frame
may decode to an empty raw original. Source hardlinks are deliberately unsupported in this new lane; existing
ordinary backward-hardlink verification remains unchanged. A present physical
raw or gzip original corroborates the archive and never bypasses its Git witness.
Shallow or missing ancestor witnesses still fail closed without lazy fetching.

The complete two-case wrapper (all 20 Python controls and the CLI) and the four
unchanged legacy packet cases pass under Node and Bun on integrated source
`dd12d1c4da481562058fc0db068566a5e7ab88e9`. Actual artifact controls on source
`d88d9bb270b30be894814c0d7d4622c05e78f336` also recover both large raw originals
with physical archive/raw/gzip overlays present, then absent, using a fresh
synthetic Git repository containing the exact immutable part 1. All four passes
verify every one of its 1,971 members and compare every recovered raw byte to the
retained originals: 1,419,433,434 bytes across four fresh complete outputs. The
Node-object pair takes 26.250 seconds and the Bun-object pair 24.010 seconds;
peak sampled aggregate process-tree RSS is 214,728,704 bytes, within unchanged
170-second internal, 180-second outer and 1.5 GiB bounds. Complete outputs and
source/gzip/raw/Git/resource receipts remain retained; terminal summary SHA256
is `6793a19dc11012212234484500bbb3c8f2890577b048bebce001ec3c87777519`.

These controls do not adopt the issue-759 raw aliases or establish a durable
real-case Git witness. All historical/member/CI/measurement continuity and actual
fixed-cap storage checks remain pending. Multiple decoded-index pages must each
obey the existing 1 GiB declared raw total; repeated logical copies do not bypass
that bound. Keep both full gzip streams, original and recovered raw files,
archives and failed captures until those checks and an explicitly reviewed
storage migration succeed. There is no new semantic, runtime-parity, Rust or
publication authority.

## Prepare real ancestor archive candidates without checking out archive copies

`git_archive_candidate.py` prepares an isolated, reachable candidate using the
existing ordinary packet index and reader. It writes Git objects and one fresh
`refs/evidence/issue-759/...` ref, plus full command/source receipts in a fresh
directory outside the repository. It leaves the current HEAD, real index,
project files and case files unchanged. It does not install a storage migration.
The complete source archives and their capture receipts remain present.

The strict, at most 4 MiB plan has exactly this shape:

```json
{
  "schema": "complete-git-archive-candidate-v1",
  "base": "<current clean full 40-character commit>",
  "ref": "refs/evidence/issue-759/<fresh private candidate name>",
  "index": "packet-git-index.json",
  "archives": [{
    "name": "current/<fresh canonical path>/complete.tar.xz",
    "source": "/absolute/outside-case/complete.tar.xz",
    "bytes": 123,
    "sha256": "<complete original archive SHA256>",
    "receipt": {
      "source": "/absolute/outside-case/full-capture.json",
      "bytes": 456,
      "sha256": "<complete plain capture receipt SHA256>"
    }
  }]
}
```

```sh
python3 tools/evidence/git_archive_candidate.py \
  --repository-root /absolute/existing/assigned-worktree \
  --manifest /private/tmp/reviewed-full-archive-plan.json \
  --output-directory /private/tmp/fresh-archive-candidate \
  --cap-seconds 170
```

Keep the 180-second outer and 1 GiB sampled process-tree RSS monitor. This helper
has no recovery or compression option. Each source stays within the existing
256 MiB compressed bound; at most 64 combined archive witnesses and 1 GiB of
new compressed source bytes are accepted. Full capture inventories use the
unchanged 8,192-member, 128 MiB-member and 1 GiB logical-original bounds. Every
member is verified before any new Git witness is issued. The complete archive is
then written to Git, streamed back, and compared against every source byte,
with full SHA256 and descriptor/path identity checks. There is no second loose
archive spool. Duplicate JSON keys, unknown fields, bool sizes, linked sources,
namespace collisions, external old witness histories and dirty source checkouts
refuse. All old index rows are preserved exactly.

The candidate has two actual commits. **D**, parented to the reviewed source HEAD,
adds the full new archive bytes at their declared case paths. **I**, parented to D,
removes those newly added paths and updates only the bounded packet index.
The helper proves that the complete I tree differs from the original source tree
only at that index. Both commits use the real configured repository/user author
and committer identities and actual timestamps; observations are recorded.
Neither commit is checked out by the helper. A fresh ref makes D's complete
archive blobs reachable through I without placing archive copies in the case.
Git objects, future transfer and recovery still consume real repository/disk
space; this is not a zero-cost or digest-only retention claim.

Until an operator explicitly adopts I in an already assigned worktree, D is not
an ancestor of that checkout's HEAD. The unchanged `PacketStore` must refuse its
new witnesses there. A depth-one receiver must also fail closed until explicit
history retrieval makes every declared witness ancestor available (for example,
the receiving workflow's full-history checkout). Do not add lazy fetching,
replace ancestry, set skip-worktree flags or synthesize an ours merge. The final
tree has real archive deletions and remains clean using ordinary Git behavior.
The complete Python test group uses only small disposable synthetic repositories;
its Node/Bun wrapper is discovered by `tools/translation/test/*.test.mjs` in the
existing JavaScript gate and CI. This first candidate source remains untested.

For issue #759 the next executable sequence is concrete but still pending:

1. Keep immutable part 1 unchanged. Capture every remaining full original,
   including both failed part-2 streams and their complete raw controls, in
   bounded ordinary append packets outside the case. The proposed 192 MiB
   unique-payload partition target is only a producer workload choice; the
   existing hard limits and every original logical row stay unchanged. No
   successful immutable part 2 exists yet.
2. Prepare D/I with those complete archives, existing ancestor witnesses and full
   source receipts. Review the exact candidate tree, commands, sources and ref.
   Keep all earlier physical originals, failed captures and fresh recovery outputs.
3. After explicit coordination, use the candidate in an existing assigned
   checkout and fresh outside-case overlays. Recover every historical 4,853
   member and reused part-1 1,971 member, plus every new member. Exercise both
   physical-present and absent/Git fallback paths. Qualify shallow-history
   failure/recovery explicitly; a source commit name does not replace a blob.
4. Use the qualified fixed-gzip decoder for the large raw originals. Each decoded
   index page stays within 1 GiB declared raw bytes, with full 512 MiB-per-output
   bounds and complete member verification. Retain the plain authenticated
   capture receipt needed by that decoder and compare every recovered byte.
   No gzip re-encoding recipe or JSON-body normalization is needed.
5. Run all three complete CI integrity reads and all three complete measurement
   reads over baseline/present/absent overlays. Compare all historical semantic,
   selection and telemetry fields, allowing only explicitly identified physical
   storage fields to differ. Preserve complete commands, inputs and outputs.
6. Measure the actual proposed case allocation before any install or retirement.
   The last observation is 498,085,888 of 500,000,000 bytes, with 1,914,112 bytes
   headroom. The 116,610,304-byte conditional retirement estimate is available
   only after full recovery and continuity, not an immediate allowance. The
   15,284,926-byte full ledger cannot simply be copied loose into that headroom:
   retain complete control payloads in authenticated packets/Git and measure
   the small active indexes plus required plain receipts. If even these do not
   fit, qualify a selected old archive's recovery before proposing its retirement.

No fit, historical continuity, shallow-checkout recovery or real-case adoption is
established by this source draft. The final integrated HEAD still needs the
complete same-SHA JavaScript gate before publication. Storage migration grants
no translator, runtime-parity or Rust authority.

## Sequential captures with authenticated resume

`capture-shards.py` executes a reviewed finite batch of the existing complete
capture manifests. It starts one child at a time, keeps XZ preset 9 and its
64 MiB dictionary, and makes no packet-reader or recovery-format change. Each
`shard` job retains the 64 MiB logical target. A `whole-original` job contains
exactly one intact original larger than 64 MiB and at most 128 MiB; these objects
are never split or passed through the smaller shard planner. The existing
8,192-member, 1 GiB logical-packet and 256 MiB compressed-archive limits remain.

The closed `complete-evidence-capture-batch-v1` JSON plan has exactly these fields:

- `source`: canonical absolute `root`, actual clean `head`, and `code`, an object
  containing exact `{bytes, sha256}` pins for `capture-shards.py`,
  `capture-packet.py`, `shard-packets.py`, `archive_range.py`, `packet.py` and
  `decoded_original.py` in that root's `tools/evidence` directory.
- `jobs`: ordered `{id, mode, manifest}` entries. Each manifest is an exact
  `{path, bytes, sha256}` pin for a full four-field `members` object. IDs contain
  only lowercase ASCII letters, digits and hyphens. Duplicate IDs and logical
  original names across the complete batch refuse.
- `capSeconds`: an integer from 1 through 3,600. This is the complete batch's
  finite budget, including plan reads, source checks and finalization; it does
  not promise that every selected job will fit.
- `minimumFreeBytes`: an integer between 512 MiB and 16 GiB. Before a new
  compressor or Git staging child, the driver additionally requires headroom
  for one 256 MiB compressed object and 32 MiB of controls. A physical archive
  reuse needs the reserve plus the control allowance. Disk pressure stops the
  batch and retains all outputs; no source or previous capture is removed.
- `pendingRoots`: canonical absolute paths that have not been frozen. They stay
  pending, and every terminal result retains `completeLatestEvidence: false`.

All metadata and body reads retain strict bounds, duplicate-key rejection,
full hashes, opened-file/named-path identity checks and linked-path refusal.
The batch has at most 4,096 jobs, 131,072 original rows and 64 MiB of combined
manifest metadata. Output must be outside case storage and either fresh or the
same validated driver output root. Use the exact reviewed plan's SHA256:

```sh
python3 -B tools/evidence/capture-shards.py \
  --plan /private/tmp/frozen-complete-batch.json \
  --plan-sha256 FULL_PLAN_SHA256 \
  --output-directory /private/tmp/assigned-complete-captures
```

Run the entire driver where aggregate `ps` observation is permitted; it checks
that permission before starting a child. Every job has at most 180 seconds for
capture plus independent authentication. The unchanged capture tool still
receives its 170-second internal bound; the authentication worker receives only
the remaining time, at most 170 seconds. One GiB sampled aggregate RSS includes
the driver and descendants; direct-child `wait4` maximum RSS is also checked.
Sampling can miss transient peaks. The fixed batch signal and child process-group
cleanup enforce termination and reaping. Full raw streams, exact commands,
resource samples, failures and partial archives are retained in fresh files.

An optional `reuse` field on a job contains exactly `archive`, `receipt` and
`provenance`. `receipt` and every `provenance` row are full small-JSON file pins.
The archive has exact `bytes`, `sha256` and `source` fields. A physical source is
`{kind: "file", path: "/absolute/complete.tar.xz"}`. An existing ordinary Git
packet source is `{kind: "packet", caseRoot: "/absolute/case", index:
"packet-git-index.json", name: "archives/complete.tar.xz"}`. Only direct ordinary
archive entries are accepted; range aliases, nested aliases and source-commit
names cannot substitute for archive bytes. Missing physical ordinary archives
use the existing authenticated Git fallback and one temporary compressed spool,
removed by that reader; no payload is copied into the case.

Resume never trusts a prior success marker by itself. It freshly checks the
full archive SHA, decodes every member through unchanged `PacketStore`, hashes
all original bodies before and after, validates strict receipt hardlink fields,
and checks all source/control bytes and identities. Original producer code is
qualified separately: the receipt's actual original source commit must retain
the exact `capture-packet.py` and `archive_range.py` Git blobs/bytes that match
the current pinned producer. That source commit need not be the receiver's
ancestor after a genuine byte-preserving cherry-pick. Its full identity and the
current HEAD are retained without an ancestry claim. Ordinary archive witnesses
still require their actual Git witness commit to be an ancestor of the receiving
HEAD. Missing history or changed producer bytes fail closed.

Completed outputs remain immutable and are not recompressed. Incomplete prior
job directories refuse automatic retry; a separately reviewed new attempt must
use new paths while retaining the failure. After the final batch ledger write,
the driver repeats source, manifest, completed-original and archive identity
checks. A failure there retains that ledger and an explicit finalization refusal
and returns failure. Neither a leftover PASS ledger nor a complete marker is
standalone authority; the fresh complete process result is required.

The additive Python whole-file controls are discovered through the existing
`scripts/test/capture-evidence-packet.test.mjs` JavaScript gate entry. They cover
real tiny captures/resume, full Git fallback with cherry-picked producer source,
changed bytes, disk/deadline termination, malformed bounds/aliases and mutation
at the final ledger boundary. This new driver and its controls are **UNRUN**.
The earlier tool capture and its separate corrected readback remain their own
qualified observations; they do not qualify this new orchestration.

For the retained issue #759 selection, reuse the first 650-member archive
unchanged, then plan the remaining 63 complete shards and six separate intact
oversized originals. The six oversized originals still require their complete
SHA/manifest freeze before execution. Later evidence is additive and pending.
The first archive's measured 12,480,364 compressed bytes is not a global ratio
for the remaining 4,267,245,059 logical bytes. Keep all old failed captures and
full originals. A batch only produces local captures: ordinary D/I Git witness
creation/adoption, full present/absent recovery, three CI and three measurement
continuity reads, shallow-history qualification, actual distinct-inode case fit
and explicit retirement authorization remain separate. Logical Git blobs and
retained working archives both cost disk until qualified cleanup; no 500 MB
case-fit or complete-current-evidence claim is made by this draft.
Use the existing bounded index-page planner before proposing archive adoption:
the ordinary limit remains 64 archives per index, including its old witnesses.
This batch driver neither creates an oversized index nor silently switches an
existing consumer to another page. The later retained case allocation of
499,195,904 bytes is an observation from the genuine part-1 index/receipt
adoption; it does not qualify the remaining captures or authorize more writes.
