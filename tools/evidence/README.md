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

The tool hashes each original before, during and after streaming, reopens every complete archive member and checks exact decoded lengths/hashes. Duplicate originals use backward TAR hardlinks. The receipt preserves every original path, length and hash, the immutable source commit and harness hash. XZ preset9 uses a 64 MiB dictionary; that setting is not measured peak memory. Resource claims require independent actual telemetry.

The selected scope is bounded to 8,192 originals, 128 MiB per original, 1 GiB of complete originals and a 16 MiB manifest. The finite deadline is checked between bounded reads and archive operations; use an enclosing process deadline for hard termination. Failed captures keep their output for inspection and issue no successful receipt. System `/tmp` and `/var` aliases on macOS resolve to their real roots; other linked evidence paths are refused.

This tool changes storage only. It does not certify semantic admission, runtime parity, a JavaScript gate or permission to run Rust or publish. Check the destination evidence allocation against the task's fixed budget before installing a packet; keep historical failure packets intact.

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
