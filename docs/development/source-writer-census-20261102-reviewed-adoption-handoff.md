# Reviewed adoption writer integration handoff

SOURCE ONLY / UNRUN. Exact source at
`4febb3f8e8e6644e0fb8941d513d7b142bd13a78` is retained in the census whole-source
bank under `tools/translation/apply-reviewed-core-adoption.mjs`. This active
module has not been edited by the census author.

The actual exported entrypoints are `applyReviewedCoreAdoption(input)` and
`recoverReviewedCoreAdoption({application,output,stateSha256})`; the CLI delegates
to them. Existing `options` requires POSIX darwin/linux, physical no-alias roots,
a fresh physical output sibling disjoint from source root and run, a full HEAD
and exact named review options. Existing `file` rejects symlinks for every path
component; target source is existing ordinary Rust files under the actual
repositoryRustLayout production prefix. Preserve that exact original source
domain rather than broadening to arbitrary paths or treating hashes as authority.

Apply checks a clean worktree, selects explicit full reviewed report/plan/index
DATA, awaits `joinInputs`, inspects full packet/CST/language-then-repository
source equations and complete source census, compares every original physical
Rust byte, then creates an external output journal. The language phase durably
retains every before/after, mode and full identity. The repository phase checks
fresh target identity/preimage, durably creates replacement bytes outside root
on the same filesystem, writes intent journal, `fs.renameSync(pending,target)`,
syncs target directory, compares installed bytes, and checkpoints. A final await
and original whole census/diff/report checks remain required. It intentionally
reports `allFilesAtomic:false`; ordinary failure records journal state for
explicit recovery, with no hidden automatic rollback.

Recovery fully reopens independently reviewed inputs and the selected original
state; it accepts current source only as complete original or reviewed after
bytes. It awaits source joins before writing, creates a fresh external output,
and for every after-state target creates same-filesystem original bytes,
renames them onto the exact existing source path, syncs and compares. Already
restored before-state files skip mutation. Full final source census and clean
worktree checks remain required. Mode and fixed before-/after-ordinal saved
paths are checked against the independent source census.

A common policy integration must capture before the first await/producer and
retain/verify through both public operations, every target mutation, journal
failure, cleanup and explicit recovery. Staged replacement needs staged entry
semantics: protect logical and actual directory entries and policy self without
vetoing distinct real hardlink entries solely for equal inode. The external
journal/stage mutation domain is disjoint from source root but its path/identity
and closers must retain the original contract. Charge raw retained policy bytes
to the actual combined384MiB resource domain without rewriting original source
budgets, accepted public inputs or journal/result fields. No semantic/native
permission may come from operational protection. Preserve exact falsy/frozen
primary errors while attempting every original closer; source/admission failures
caught within nested shared operations must stay sticky. All this remains a
source-review handoff, not an implemented or verified repair.
