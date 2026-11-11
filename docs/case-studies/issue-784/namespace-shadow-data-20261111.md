# Internal namespace shadow data

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
Internal namespace setup previously rebuilt three alias Maps solely to read
their shadow-name sets, then discarded those Maps. For existing explicitly
opted-in parsers and genuine closed frozen scopes, setup now copies the shadow
names from the private template. Every parser still receives fresh mutable
shadow sets, complete independent namespace Maps and fresh source evidence.
Public, copied, mutable and changed-host inputs retain the original path.

The added regression covers ambiguous imports, complete equality against the
original public setup, independent mutable sets, subsequent setup after set
mutation, and copied-scope fallback. All existing host-observer cases remain.

| Complete receiving files | Node 20.20.2 | Local Bun 1.4.4 |
| --- | --- | --- |
| Immutable namespace paths and scope templates | 16 passed; 13.137781 seconds | 16 passed; 9.101775 seconds |
| Original streamed clone file | 2 passed; 2.495302 seconds | 2 passed; 1.637745 seconds |

Both Node deadline audits pass with their original bounds. The narrow finite
ABBA comparison retained all complete namespace Maps and original source
observations: before 326.786457 ms, after 352.742748 ms, after 317.707269 ms,
before 460.741476 ms. The variance prevents a qualified performance claim.
This change admits no additional application function and does not qualify a
complete CI deadline.

The source experiment pins complete baseline `beda7848b29a499f5cf3d1a7792d7353e62f12ca`,
checks unchanged original public functions, composes four exact ordered language
substitutions with the repository phase, and verifies the complete inverse.
It also checks the serialized/reparsed CST transport. This is source evidence,
not type, ownership or executable authority. It passes in 2.574089 seconds.

The [complete archive](evidence/namespace-resource-repair-20261111.tar.gz) retains
all receiving streams, deadline reports, resource receipts, comparison outputs,
source equations and source snapshots. Every member was read back and hashed.
Its 127342 bytes have SHA-256
`3880f6d4ac6da6b928f1e9786d4142dfd7122aebaba17894ee1011e8b6785e8f`.
The [receipt](evidence/namespace-resource-repair-20261111.json.gz) records its
working source boundary. Full-gate, actual generation, strict parity and all
remaining issue criteria stay unfinished. No Rust tool ran.
