# Synchronization export source draft

The shared compiler entrypoint list now includes both forward-derived string
source-unit CLIs. The original eight entries remain in order. The source
packaging producer compares every complete pinned original vector against that
exact prefix, so later CLIs do not invalidate the earlier source copy. Full
originals, language/repository substitutions and inverses remain available.

`tools/translation/source-synchronization.mjs` reexports the original portable,
owned-project, single-literal and bulk-literal APIs. It forwards to their actual
implementations and adds no checker hooks, stored permissions or runtime-only
mode. The exporter already selects the complete committed compiler source and
source-profile closure, including matching runtime/declaration files, notices
and licenses. The shared entrypoint list additionally retains every CLI needed
to invoke these source-unit APIs after export. Original export byte/file limits
and complete committed-source/index checks remain unchanged.

A receiving repository supplies its lockfile-installed TypeScript dependency
and complete actual application/native/Cargo inputs. CLI workers bind the
receiving dependency root before loading compiler modules. Do not duplicate
dependency installations while drafting. Shared dependency links belong only
in isolated receiving tests and must be removed with those fixtures. Reusable
contribution guidance remains a separate copy from compiler implementation.

Independent source tests cover old/new CLI order, original packaging histories,
all runtime and rule dependencies, and real JS/TS bulk inverse proposals through
the exported facade in a fresh receiving process. These tests, the exporter,
preparers, compiler and receiving code remain unrun. No export or narrow receiver
case establishes whole Router translation, full receiving qualification, runtime
parity or permission to start Rust. All complete JS stages must still pass for
the same commit before fatal Rust checks run in CI.

The same retained entrypoint prefix now includes the complete forward-project
unit CLI and API. The exported compiler closure includes fresh Git baseline
capture, actual native runtime import mapping, both full inverse checkers and
complete source substitution archives. Independent receiving inventory source
covers every original and added entrypoint; it remains unrun. Packaging the
closure does not qualify arbitrary receiving source or the whole Router.
