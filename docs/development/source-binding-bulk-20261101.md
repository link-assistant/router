# Complete physical source binding batch: source draft

All new implementation and independent case source are **UNRUN**. No parser,
translator, preparer, compiler, tests, benchmark, CI status/logs or review feedback
were executed or inspected while authoring this addition. No executable coverage,
throughput improvement or broad checklist closure is claimed.

`tools/translation/source-binding-bulk-20261101.mjs` composes a real shared
prerequisite: multiple original module parsers can use one freshly issued complete
namespace closure during a single synchronous source operation. Its input names
an absolute physical root, a complete relative Rust source directory and a crate
entry inside that directory. It discovers all physical `.rs` files recursively,
including unreferenced sibling/candidate modules. No caller file list can omit a
competing `foo.rs`/`foo/mod.rs` candidate within that directory. Directory entries,
source files, depth and both per-file/combined source bytes retain explicit bounds.
Symlinks and malformed UTF8 refuse. The operation does not install dependencies,
write sources, infer Cargo features or read network state.

The two actual pipeline phases are `language`, then `repository`. Each complete
physical Rust source crosses actual CST serialization and reparsing before
`resolveModuleGraph` constructs genuine inline source views and original path
plans. The existing conservative `resolveModuleBindings` then issues its original
private scope set over the complete graph. The operation retains full original
source/CST data, all module graph diagnostics and all binding diagnostics. It
checks `assertResolvedSourceScopeOrigin` and original source module views before
using that closure to call the existing `configureParserSourceScope` for each
selected actual module. Every parser receives its original independent native
maps, visibility restrictions and unresolved namespace/macro flags. A graph
with any original unresolved diagnostics remains inspectable as DATA, but cannot
configure a parser through this complete-graph profile.

This supports shared full-file alias/reexport closure across actual modules,
including namespace-specific renamed type and value imports, while preserving
ambiguity, unknown producer, external namespace, configuration and visibility
refusals. It uses the conservative existing binder intentionally: it does not
invent derive/tool contexts or silently switch into the broader enclosing-owner
admission domain. A configured parser still requires all its original private
body, ownership, type, effect, producer and runtime checks before execution.

Each `configure` call rereads the entire bounded physical source census before
and after parser configuration. `configureMany` instead puts those same complete
fences around one bounded dense batch, keeping every original per-parser
origin/view/namespace check inside the batch. The operation repeats complete closing reads even
when the application callback throws. Caught source failures permanently poison
all active selected operation frames, including nested callers; restoring bytes
does not recover an earlier verdict. The original primary callback exception is
preserved while closing checks still run. Expired configuration closures refuse.
No source/owner/hash/result/verdict/failure cache crosses operations, and original
private graph and scope references are cleared when an operation ends. Retained
full-source evidence is DATA with all authority flags false.

The independently authored receiving source in
`tools/translation/test/source-binding-bulk-20261101.test.mjs` covers multi-file
renamed type/value forwarding, inline whole-file coordinates, independent parser
maps, duplicate alias/producer/external refusals, complete physical changes,
competing-file discovery, closing checks after callback failure, caught nested
source failure, operation expiry, unreferenced source changes, symlinks, malformed
UTF8, byte bounds and synchronous/own-data refusals. All cases remain UNRUN.

## Integration and open scope

The implementation is directly callable as an additive synchronous API; no core
source, translator dispatch, source-profile archive, original issuer or gate
partition was edited. This batch therefore does not itself change production
translation coverage or add a new binding spelling/domain to the original
resolver. The new operation composes existing genuine closure across modules;
it is not a substitute for original caller admission or an application adopter.

For production integration, a source-bound whole-project caller should supply
its actual complete source directory and original compilation profile, then
configure its actual original parser per matching module before running the
unchanged whole-body private checker. Preserve the graph diagnostics and all
binding flags; do not treat a configured parser or public evidence as a successful
binding/type/effect verdict. Supply genuine derive/tool/external namespace closure
through their existing private issuers in a separate reviewed extension if that
larger domain is needed. The current API deliberately accepts no public external
tables, source hashes, caller module arrays or proof flags.

The complete source directory limits this profile: modules whose original path
selection needs files outside it retain original graph refusals; dependency and
Cargo/source/edition configuration closure remain separate obligations. Parent
source changes that are changed and restored entirely between checks cannot be
observed without an actual checked operation boundary. No filesystem snapshot or
concurrent-writer isolation is claimed. A complete host transaction or fresh
whole-source checker still owns the final emission boundary.

Coordinator integration also must register the new full focused case file where
appropriate while retaining every reviewed original CI command, deadline and all
eight same-SHA JavaScript gates before fatal Rust CI. Execution remains deferred.
This supplies source receipts toward B01/B04/R02 only; these broad rows remain
OPEN, as do actual application adoption, measurements and full receiving/gate
qualification.

## Physical identity closure follow-up

The census retains bounded root and declared/canonical ancestor identities,
every source-directory identity and complete child-name list, and every leaf
identity including non-Rust entries. Inside the source directory, device, inode, mode, link count, ownership,
size and nanosecond modification/change times are retained. Stable platform root
aliases are recorded with their exact link target; changing an ancestor alias
refuses even if it still resolves to the same canonical source bytes. All original
identities are closed after traversal and again at every operation check/exit.
Ancestors outside the selected source directory retain stable device/inode/mode/
uid/gid identity and exact symlink targets. Their size/link counts/mtime/ctime are
excluded, allowing unrelated `/tmp`, repository-root and intermediate-directory
churn. Complete names and full identities/timestamps remain required within the
source directory. Replacing or retargeting an ancestor still refuses. This
profile promises no concurrent-writer isolation or retry on an earlier verdict.

Directory iteration now uses bounded `opendirSync` reads, checking each entry
before storing its name; it never allocates an unbounded `readdir` result. Rust
leaves are opened without following symlinks, identity-checked before and after
bounded descriptor reads, and rejoined to their physical path after reading.
Directory identities close before/after traversal. Additional UNRUN source cases
cover byte-identical file replacement with restored mtime, same-name directory
replacement, non-Rust name changes and declared-root alias replacement.

This closure covers the selected physical source directory and the original
module/binding runtime dependencies already enforced by the existing APIs. It
does not claim complete Cargo manifests/lockfiles, external dependency package
sources, target/feature activation, toolchain flags or full repository ownership.
Those inputs still require their own genuine source issuers and final whole
compiler joins before any executable admission.

## Complete parser batching and shared failure protocol

`configureMany([{parser,modulePath}, ...])` shares only this invocation's genuine
complete original graph/scopes. The bounded dense batch accepts no bypass flags
and validates own-data rows without invoking accessors. A private one-parser
helper retains the complete original source-origin, module-view and namespace
checks for every row. Complete physical before/after fences surround the entire
batch, including failure exits; `configure` retains its complete individual
fences. This avoids replaying the source tree separately for every parser in a
full caller batch. No measured throughput improvement is claimed.

Each opened Rust file now allocates its checked exact descriptor size plus one
byte, rather than a maximum-sized buffer for every file. Growth, early EOF,
pre/post descriptor/path identity changes and all byte bounds still refuse.

Private source validation uses the existing `withSourceInputValidation` and
revokes all enclosing original source operations through
`invalidateActiveSourceOperations`. The complete operation participates in
`withSourceFailureOperation`; ordinary application callbacks remain outside
private input validation. Source failures caught and restored in this family
therefore invalidate enclosing existing families too. First observed private
source failures and original primary callback thrown values retain their exact
identity, while complete closing validators still execute. No failure cache
crosses operations.

Additional UNRUN independent source cases cover complete multi-parser batches,
invalid/oversized/accessor batch rows, source changes and primary failures during
parser configuration, harmless outside-scope sibling churn, expiry and caught
cross-family failure after source restoration.
