# Stream complete literal-text proposal packets

The additive `iterateCoreLiteralTextCorpusPackets` API emits complete primitive
JSON packets for the captured source graph and one whole per-file proposal at a
time. Each proposal retains all original/edited source, serialized/reparsed CST,
selections, refusals, mappings and inverses. The complete source graph stays live;
completed per-file CSTs are serialized before yielding rather than retained in a
corpus-wide proposal list. No new source, owner, hash, verdict or encoded-result
cache is introduced. Input snapshots and final checks remain required.

`prepare-literal-text-packet-stream.mjs --emit` copies the complete actual
materialized literal producer and existing JSON packet helpers through native
TypeScript 5.9.3 spans and separately declared language/repository CST sequences.
`prepare-literal-packet-cli.mjs --emit` similarly copies the complete existing
bounded stream validator and gzip writer, deriving the literal metadata schema
from its actual producer. Both retain complete original/proposed CST and source
inverses; `--check` reproduces every installed byte. All original materialized
API, JSON stream and writer function bodies remain unchanged.

The actual CLI selects the stream only for explicit `literal` plus `gzip`:

```sh
node tools/translation/propose-core-adoption-corpus.mjs \
  --root /path/to/receiving-repository --output /fresh/outside/proposal \
  --sequence literal --packet-storage gzip --progress
```

The separate `proposeCoreLiteralGzipPackets({root, output}, progress)` API uses
the same route. Existing `proposeCoreAdoptionSequence` APIs retain their original
materialized behavior, including explicit gzip storage. Other CLI sequences and
defaults are unchanged. Physical `rust/src` and root-workspace Cargo inputs use
the existing repository layout adapter. Source proposal output never installs
application source or establishes executable admission.

Every original writer bound remains: 64 MiB per packet, 1 GiB complete logical
output and a separate 384 MiB stored gzip limit. Actual receiving monitors also
count their own temporary files and logs. Node retains 2048 MiB old space and a
3 GiB sampled aggregate process limit; disk requires 3 GiB initially free with
a 2 GiB reserve. The production run below has no paired materialized baseline,
so it does not establish a full-corpus speed or memory gain.
The receiving comparisons check every packet according to its declared `json`
or `rust-source` kind, retaining complete byte/digest checks and whole Rust CST
round trips.
Failures keep partial packets and `failure.json`, without a successful index.

All 24 cases in the complete API, CLI and source-freshness receiving files pass
under Node and Bun. Node takes 55.540 seconds at 554,418,176 bytes sampled peak
aggregate RSS; independent deadline audit `complete-f3fI9u` has zero breaches and
errors. Fresh sequential Bun processes take 39.368 seconds at 675,987,456 bytes
sampled peak aggregate RSS. Every case keeps its original deadline and all 2,239
source input vectors remain unchanged. TypeScript is the installed 5.9.3.

These cases compare the entire graph/proposal result and every old/new CLI
packet, including Core files and unreachable-source refusals. They execute fresh
whole-function JavaScript and strict TypeScript with an authored Unicode/NUL
result, round-trip all packets for 256 fixture functions, run the actual cold
CLI within its 20-second child limit, and reject changed inputs, early EOF,
changed physical sources and thrown observers before index publication.

The first integrated Node run retained 22 passes and two test-reader failures:
the helper parsed retained Rust source as JSON. The corrected helper dispatches
by the declared packet kind and still validates and compares every byte. Full
failed and passing streams, actual source proposals and independent reviews are
retained under `router-literal-packet-stream-source-v1` and its bounded monitors.
The earlier complete 19-case API-only Node/Bun passes remain separate evidence.

The two arithmetic-retention candidates described in the
[profile record](derive-profile-20261021.md) failed the original derive deadline
and were restored exactly to the reviewed Git source. They are not part of this
runtime change. The original performance and namespace CI failures remain open.

The actual complete production CLI run at source checkpoint `8765153f6` captures
all 564 physical Rust source files, producing 390 complete proposals and 174
skipped-file records. Its 3,440 packets retain 319,972,394 raw packet bytes;
complete logical output is 321,908,375 bytes and stored output is 57,777,063 bytes.
The producer takes 374.929 seconds. A separate 32.580-second complete readback
checks every packet digest and declared format, original physical source joins,
whole proposal CST, mappings and inverses. The whole monitored operation takes
413.069 seconds at 1,603,534,848 bytes sampled aggregate RSS and 96,686,080 bytes
observed evidence, with all 2,309 source input vectors unchanged. Full source,
commands, streams, partial failed preflight and receipts remain under the
task-owned `router-layout-check-actual-complete-production-literal-gzip-*`
monitors. Storage/CST readback grants no application-equivalence authority.

Only one function is selected: `login_url::redact_value`, with two edits in one
file. Fresh complete-function checker and strict JavaScript/TypeScript probes
admit both the original and proposed forms, including independently authored
Unicode, NUL, overlap and invalid-argument cases. This selection therefore adds
no demonstrated executable coverage. No application source is installed.

The actual isolated compiler snapshot and portable Git fixture are refreshed
from this source checkpoint: 1,232 compiler files plus all 132 TypeScript 5.9.3
files, totaling 47,468,976 source bytes. Independent review compares all compiler
Git/physical bytes, complete bootstrap equations and CST inverses, and all 416
portable Git objects; the four historical source bodies remain exact. All 16
original receiving cases pass in both engines with their original deadlines:
Node takes 72.900 seconds at 930,037,760 bytes sampled aggregate RSS; Bun takes
71.302 seconds at 865,648,640 bytes. Node audit `complete-u0Dtxn` has no breaches
or errors; Bun independently joins every case and all 2,247 unchanged inputs.
This qualifies the isolated snapshot's receiving files, not every exported
compiler workflow or a complete receiving application's synchronization.

The last measured production executable coverage is 155/2,567 (6.04%); a current
full executable inventory has not been regenerated. Selected proposals and
fixture functions do not count as production gains. Independent literal
application review, actual application adoption, complete standalone compiler
export qualification, canonical and three-profile generation,
reverse freshness, strict native parity and the complete JavaScript gate remain
unfinished. The stock Python proposal/review/application controllers currently
support the JSON-reader equation, not this literal route. Extend and qualify
those equations before using them to install a literal proposal. Rust remains
CI-only after all eight JavaScript stages pass for the same SHA; Rust failures
remain fatal. Full Rust/JavaScript/TypeScript synchronization is incomplete.
