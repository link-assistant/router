# Native JavaScript storage draft

The native runtime now supports memory, text, binary and dual token stores. The
default configuration is dual, matching `StoragePolicy::Both`. Binary writes
encode the associative token schema from `src/storage/associative.rs`, using
the doublets 0.5 `#[repr(C)]` header and eight-word link records. Strings share
byte-sequence suffixes, each physical pair is unique, and both search indexes
contain valid subtree sizes. Files contain only the allocated links; native
writes do not allocate the Rust library's large mapping reserve.

The binary reader reads the header and allocated extent, rather than the whole
preallocated file. Legacy `LARTOK01` length-prefixed JSON is accepted and
migrates on mutation. A dual store records its transaction journal before
installing text and binary projections and removes the journal only after both
writes succeed. Reads replay an interrupted journal and otherwise preserve the
binary file's modification time. Mutations reconcile revoked records and the
maximum observed usage and reservations, following `merge_safer_record`.

Resource ownership persists in `response-affinities.lino` with Rust's version 1
document, namespace, owner and tagged destination fields. IDs are scoped to
managed client and principal, parent IDs disambiguate child resources, and an
upstream account identity change cannot silently rebind an existing resource.
The store applies the same 30-day lifetime and 10,000-record default capacity.

Node does not expose operating-system advisory locks. The native adapter uses
Python 3's standard library to hold `flock` on Unix and `LockFileEx` on Windows,
with bounded acquisition and a pipe whose closure releases the lock. Python 3
is required for durable native stores; `ROUTER_LOCK_PYTHON` selects its executable.
The same `.lock` paths coordinate native transactions with the Rust stores.
This is an explicit OS adapter dependency; no Rust executable or native build
is launched. Memory stores have no Python dependency. Existing OAuth directory
locks still require migration to the corresponding Rust credential lock paths.

Independent Node fixtures validate physical header offsets, points, duplicate
pairs, both tree indexes and sizes, legacy migration, restart persistence,
journal replay, revocation reconciliation, shared reader/exclusive writer
contention, resource identity isolation and invocation state isolation. The
same fixtures run in Bun. The generated TypeScript snapshot must be regenerated
after this batch is integrated.

This batch does not establish complete storage or Router parity. Rust execution
remains forbidden before the complete JavaScript gate passes. In particular,
cross-runtime file round trips and Windows locking have not been executed in
this batch, and token integers outside JavaScript's exact safe-integer range
remain a limitation. These limitations must stay in the strict parity census.

Implementation sources are the checked-in Rust storage, affinity and durable-file
modules, plus the locally cached unmodified `doublets-0.5.0` header, link-part and
source/target tree definitions. Their layout was inspected without compiling or
changing the user's Cargo cache.
