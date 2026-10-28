# Claude activity sessions and verified settings reset draft

SOURCE ONLY; no backup/session/reset, child, test, compiler, parser, translator,
preparer or CI feedback was executed or inspected. Full drafting continues.

Claude persistent runs now register native-shaped parent/child PID markers under
the existing active directory. A short shared OS advisory lock covers preparation,
actual-spawn registration and release, rather than the complete child lifetime.
Concurrent launches retain independent markers and one persistent profile. Reset
refuses live or malformed markers and only removes exact unchanged dead markers.
No PID read from disk is signalled beyond the existing liveness observation.

The actual reset option checks its Claude/profile restrictions and confirmation
before version/server/token preparation. Noninteractive calls require --yes; the
interactive path uses the existing native question. Reset is settings-only:
sessions, projects and credentials remain. A private verified version-one-shaped
backup is published before moving either settings file. The backup stores regular
selected data and original modes, omits native-known credential filenames/cache
paths, rejects live SQLite sidecars and bounds bytes/entries/depth/disk space.
File hashes, complete manifest checksum and full archived inventory are verified;
extra credential-looking archived files cannot hide from inventory verification.

Reset validates settings JSON, rechecks its selected backed-up snapshot, stages
only settings.json/settings.local.json and rolls back exact unchanged originals
on failure. Concurrent replacement or changed staged bytes are preserved together
with the verified recovery archive. Missing/new profiles require no reset archive.
The process supervisor registers the actual spawned child before ending the
profile callback lifetime, and terminal launches forward interruption by default.

Eleven complete source equations retain both language/repository phases/full CST
inverses and six complete native files. Independent unrun JS/strict TS/native
source covers backup fields/modes/omissions, complete-byte and unlisted payload
refusal, SQLite/link/nested destination guards, concurrent markers, active refusal,
settings/session/credential preservation, rollback/replacement conflicts, actual
launcher reset and actual child registration. The native oracle includes the
physical original ProfileSession implementation without expanding its public API.

Full symlink backup/restore, arbitrary external-client process inventory, complete
native backup interoperability, mixed-engine reset lock races, Windows modes/ACLs,
crash/recovery leases and I/O timing remain OPEN. The regular quiet-profile subset
is a draft, not qualified behavior. Wider source namespace/compiler forward/reverse/
sync/freshness, full production parity, receiving and delivery remain OPEN. Rust
remains CI only after all eight same-SHA JavaScript gates; local execution stays
deferred until the user-authorized verification phase after complete drafting.

The subsequent [native reset/session lock draft](native-reset-lock-source-draft.md)
now provides the missing native reset lock through a full original/current source
equation. Cross-engine registration/reset coordination has implementation source;
its execution/timing and all other interoperability obligations remain unqualified.
