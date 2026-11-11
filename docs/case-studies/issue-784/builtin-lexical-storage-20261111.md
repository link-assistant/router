# Bounded original builder lexical storage

This source draft continues [issue #784](https://github.com/link-assistant/router/issues/784)
in [PR #785](https://github.com/link-assistant/router/pull/785). Cold profiling
identified repeated complete-source Rust lexing in builder import and callback
inventories. The draft reuses lexical data under the existing complete native
host guards. It adds no executable functions or semantic admission.

Each genuine builtin profile owns an independent reader. Its weak keys do not
retain unrelated data reachable from caller pins. Storage admits at most 16
slots, 128000 source characters per entry, 32000 tokens per entry, 200000
logical data cells and 1000000 aggregate characters. Collected keys leave
conservative counters until the next reset. Oversized sources and changed host
operations retain the original complete lexer. Returned tokens remain fresh
mutable data, independent of the frozen private copy.

The macro reader still performs every source hash, original byte/token/depth
check, token projection, delimiter walk, recursive freeze and private snapshot
issuance on every call. Import ownership maps and builder/callback contracts
remain fresh. Compiler-output source access retains its separate original path.
Native legacy RegExp state is compared for every complete pinned Rust source.
Copied profiles, cross-compiler contracts, malformed inputs and original budget
refusals remain covered. Optional scalar diagnostics are off by default and
confirm real hits, misses and conservative limits; they grant no authority.

The six-case receiving file retains complete preimages from
`54965e579a68c643584062abfab271a9cde06cc1`, ordered language and repository
substitutions, full serialized/reparsed CST phases, exact inverses and native
scope checks with the lockfile-installed TypeScript 5.9.3. Those scope checks
are distinct from strict receiving target compilation. The original public
macro function's name, arity and default/options behavior are preserved.
All complete original source trees, builder contracts and observer tapes are
compared independently. Fresh callback identities cannot match across two
invocations, including two unchanged originals: tapes therefore retain full
callback source/name/arity and within-tape identity relationships.

On Node 20.20.2, the final six-case file passes with its independent deadline
audit (11.438 seconds, sampled total cgroup peak 2179694592 bytes). Bun 1.4.4
also passes all six cases (12.593 seconds, peak 2111524864). These final runs
include the public arity regression. The preceding weak-key runs also passed
(Node 10.695 seconds, peak 2156072960; Bun 10.396 seconds, peak 2092785664).
The two original
Node files pass all 17 cases and their audit (44.950 seconds, peak 2429997056).
Those original-file runs preceded the metadata-only arity correction.
Sampled cgroup peaks include other container processes;
they are not child RSS or complete process peaks.

The original complete Bun standard-input file remains failing: lexical storage
alone reached 5869.58 milliseconds against its unchanged 5000-millisecond
deadline. The earlier source reached 7167.94 milliseconds; these single runs
do not establish a reproducible performance gain. A separate alternate freeze
walk passed receiving comparisons but still failed the original deadline at
6156.61 milliseconds. That alternate walk was removed. Its reconstructed full
source is explicitly labeled as reconstructed, not original observed custody.
The full original Bun builder file reported seven passes before the task's
memory guard stopped its provider case at 2873618432 sampled cgroup bytes.
Its remaining two cases are unqualified; it was not repeated unchanged.

The first new Node observer test failed because its tape compared freshly
created callback objects by cross-invocation identity. The corrected recording
keeps their complete source and local alias relationships. A prior malformed
shard CLI invocation ran no cases and remains failed evidence. Neither failure
is hidden by the passing runs.

The four-call CPU diagnostic retains every full result, including shared
warmup. Its cold lexical-storage call took 7393 milliseconds and its later
calls 1268, 983 and 903 milliseconds. These are diagnostic observations, not
qualification of an original test deadline or evidence of a byte-adapter gain.
The separately generated registry proposal for head `54965e57` is now stale
after these source edits and remains uninstalled. A fresh genuine proposal and
receiving qualification are still required.

The complete source and validation packet contains 109 members (1736703
uncompressed bytes), including all attempts, full CPU observations, complete
preimages and Node deadline audits. Its compressed size is 583896 bytes and
its SHA256 is
`0eda5463c6fc5317ffad4c5480f17529d3a3205b7402640a7b63340be6b46e84`.
The [packet receipt](evidence/builtin-lexical-storage-20261111.json.gz)
verifies every complete member and the unchanged selected originals. This
paragraph was added after capture; the packet retains the preceding document.

Canonical and owned profile outputs, strict parity's remaining 441 gaps and
validation error, other original deadline failures and the complete local gate
remain unfinished. No local Rust tool was run. This draft does not establish a
green CI cycle or release readiness.
