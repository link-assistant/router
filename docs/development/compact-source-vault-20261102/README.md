# Compact complete-source DATA vault: source draft

The existing standalone exporter copies every raw compiler/profile input under
8192 files and64MiB. The source census already exceeded those bounds before
this batch. The new codec/store is an explicit, additive storage contract;
it neither changes those original APIs nor establishes a successful export.
E01 and E03 remain OPEN. All implementation and case sources are UNRUN.

The author streams whole original files into raw or gzip objects, confirms
potential duplicates by complete decoded byte comparison, and retains every
logical path, mode, full content and optional original Git blob. Hashes never
grant source, namespace, type, ownership, parity or compiler authority.
Encoded objects plus metadata have a64MiB bound, logical complete files256MiB,
16384 total paths and8192 per compiler/profile/TypeScript domain. Ordinary
files remain4MiB; the explicit TypeScript package domain permits32MiB files.
These larger decoded/census limits belong only to this new API. They cannot be
reported as preserving the original export or receiving raw-storage contract.
No compression, memory, speed, fit or platform qualification has been measured.

A synchronous decode lease limits all decoded read occurrences to64MiB,
checks complete original object bytes, preserves caught source failures, and
rechecks the entire input on every exit. Readers expire and retained references
are cleared. All independent compiler/source/private issuers must still run
against actual current materialized files; the vault supplies DATA only.

The physical store uses fresh flat directories,4MiB volumes and2048-record
metadata parts. Header, parts and volumes jointly stay within64MiB. Loading
uses bounded no-follow reads, exact identity/mode/time stamps, a complete file
census and full closing rereads. Writing uses exclusive descriptors and tracks
partial files before writing. Cleanup removes only unchanged files under the
same created directory identity, preserving exact primary thrown values.
Positive O_NOFOLLOW/O_NONBLOCK support is required; Windows is not qualified.

The two complete independent case files draft byte/CRLF/binary/empty/mode/Git
blob/CST transport, corruption, aliases, expiry, promises, caught failures,
complete closing, unknown neighbors, symlinks, write failures and partial writes.
They execute no compiler authority from storage metadata. They are source only.

The complete four-file immutable packet is
[complete-source-draft.json.gz](complete-source-draft.json.gz), SHA256
`dc492bd613c98338f92221a88b4c70386f34074d5e32b979d99cbe66da373547`, 36849 decoded/10379 packed bytes.
It is a full source receipt, not test evidence or an installed source-profile
permit. The standalone provenance collector, demand materializer and actual
forward/reverse receiving integration are subsequent requirements.
