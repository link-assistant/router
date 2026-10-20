# Explicit canonical-table decoder candidate

The complete original CatalogRecord test remains over its unchanged 60-second
deadline. The earlier negative-budget default trial did not qualify: its v6
CatalogRecord case took 88,028.170667 ms. Production therefore retains the
original serializer and metadata codec. This separate source draft targets
the metadata decoder's final full graph re-encoding; it has no default install
and makes no performance claim.

`prepare-builtin-canonical-table.mjs` reads and pins the actual complete original
5339-byte codec at SHA-256
`930c5f69c73f4016dd2ea839bf669f858c436fd999beae12b3dd32713b527cb4`.
Installed TypeScript 5.9.3 selects its complete decoder declaration. The reusable
language phase adds entry eligibility and a positive-only canonical-table
equation; the repository phase binds the separate candidate/support module.
Complete source is serialized, reparsed and reconstructed through CST in both
phases and the whole inverse. Native declaration comparisons retain exact
original encoder and seal bodies and restore the complete decoder body after
removing its two additions. The original physical codec remains unchanged.

The copied decoder still parses, validates, reconstructs and freezes every
original node in its original order. At its final check, the candidate walks
the already parsed table, rather than the reconstructed value graph. A positive
result requires all of the following:

- First-reachable DFS postorder exactly matches every table index, with no
  unreachable table row or unused field name.
- First field occurrences have the exact original field-name indices, including
  fields encountered before descending into each child.
- Every referenced table identity is unique under original native JSON node
  encoding; long string nodes have the original eight-unit minimum and inline
  strings stay below it.
- Object fields match the actual reconstructed object's native key order,
  including integer-key reordering and own `__proto__` fields.
- The original depth limit is charged before every occurrence, including a
  repeated reference; the table has the original bounded cell/byte domain.
- Native final JSON of the complete original parsed table equals the complete
  input text byte for byte, excluding alternate escapes, numeric spelling,
  whitespace and other noncanonical representations.

These facts establish the same original canonical re-encoding equation. Only
a positive result skips the old re-encode. Any uncertainty or failed condition
returns to the complete original encoder, retaining its exact error branches
and metadata. The helper copies the original final `Buffer.byteLength` error
tail on success. Hash calls, arguments, digests, seal behavior and all original
decoder freeze calls remain intact. All traversal maps and state arrays are
created and discarded within one call; no input, source, owner, digest, bytes,
verdict or arithmetic cache survives an invocation.

Eligibility is captured after the original input byte-length call and before
the original `JSON.parse`, then checked again at the canonical boundary and
before the final byte-length operation. Fresh guards cover the actual global
owners and descriptors for JSON parse/stringify, Number predicates, Math.max,
Buffer.byteLength, Object keys/entries/fromEntries/freeze and native Array,
Map/Set constructors, methods, iterators, species, prototype/numeric domains
and inherited `toJSON`. A hook during input byte-length processing or any
changed freeze/collection/predicate operation retains the original full path.

Node v20.19.4 implements Buffer.byteLength as a JavaScript core wrapper. Its
complete actual 727-byte function source is retained as unevaluated profile
DATA at `51032cadaa4115e69a79440bd42f795984f30ad91991d02adfd2e2ebb38436a7`.
The Node lane requires that exact source, the immutable `node:buffer` import
identity, descriptor identity and scalar UTF-8 probes. Bun has a separately
qualified native-function/probe lane. This shares the existing intrinsic
issuer's trusted common-bootstrap assumption: it rejects ordinary cold
replacements but cannot authenticate a deliberately identical-source
counterfeit JavaScript closure. It does not establish hostile whole-compiler
bootstrap equivalence. An unknown runtime wrapper conservatively falls back.

The eight complete 60-second receiving cases cover full values/aliases/frozen
descriptors, noncanonical and malformed tables, original depth/cell/byte
boundaries, complete JSON/freeze/Hash observations, every listed operation
hook, intrinsic changes during byte-length and freeze callbacks, mutable inputs
and repeated 256-node graphs. Actual candidate-selection counters distinguish
successful optimization from fallback. The complete original codec, native
consumer and twelve-case derive files remain required receiving checks.

Only the already-started small source preparation, native lexical binding/CST
checks and syntax checks ran in this worker. No new receiving process, profile,
full gate, Rust tool or performance cohort ran. Root owns the shared resource
lease and must qualify the complete original deadline before production use.
