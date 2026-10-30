# Complete owned-core packet readback source draft

All implementation and regression source in this batch is drafted and unrun.
No test, experiment, diagnostic, translator, regeneration, Rust tool, push or CI
ran. Every unfinished [ledger requirement](bulk-draft-requirements.md) stays open.

The explicit readback API starts from the original bounded gzip packet reader,
which checks complete stored/decoded identities, sizes, bytes, hashes and physical
inventory. It independently captures the actual production source and complete
package/workspace Cargo inputs. Stage names, original paths/profile, source
census, full input rows and every packet association must match those inputs.

For each fixed stage, the API invokes its actual complete copied proposer afresh,
including all private source/tool/derive checks. It compares every complete fresh
metadata, source before/after, input, per-file proposal, module graph and CST
packet to the decoded original packet. Per-file inverse checks, complete stage
source maps, exact two-phase traces, change inventory and final native sources
remain required. Every stored packet must be referenced exactly once; no unknown
or omitted packet can qualify. Whole graph objects are retained for one stage.
There is no new across-invocation source, owner, verdict or result cache.

All serialization and source comparison precedes the final stored-packet,
physical-source and Cargo rejoins. The result grants source/data review only:
semantic admission, application installation and reverse-execution authority
remain false, and executable coverage gain is null. Raw index and storage-index
bytes now both count toward the existing 500 MB task evidence bound.

Four complete source equations retain native owners, ordered language/repository
rules, full CST transport and exact source inverses. Independent unrun cases
require fresh full-stage equality and refuse changed actual Cargo data, forged
producer authority and changed graph source even after every relevant compressed,
raw, index and descriptor hash is consistently rebuilt. All-stage receiving and
resource qualification, architecture/producer bootstrap, broader language/effects,
production adoption/parity and every original CI/freshness gate remain unfinished.
