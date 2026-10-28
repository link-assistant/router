# Native global configuration and undo source draft

SOURCE ONLY; every case, compiler, parser/translator/preparer and implementation
remains UNRUN. No local tests/compilation, experiments or CI feedback inspection.
Full remaining requirement drafting and complete translation are unfinished.

Paired JS/TS runtime modules now implement reversible client configuration and
wire `configure` plus the legacy `with --global`/undo spelling into the native
operation adapter. Both remain explicitly partial. The workflow uses selected
origins, current remote scope/mint/catalog authority, a default 8760-hour durable
credential and only a client token in its private environment. Configuration is
catalog-authenticated again within its transaction; a failure restores config,
marker, environment, credential record and global artifacts before minted-token
cleanup. Already intact configurations require fresh catalog authentication.
Grok retains its environment-only behavior. The all-client path reports/skips
unsupported or uninstalled clients and continues independent failures.

Native-compatible JSON/links notation undo state retains config and marker
existence, exact original bytes, modes, post-configuration hashes, original
marker path and owned setup backup. Backups are exclusively created at mode0600;
restoration reinstates original modes. User-edited configs/markers refuse before
credential withdrawal. The transaction file closure derives every fixed global
artifact from this config and admits a prior setup backup only within the exact
native timestamp/nonce filename namespace. Foreign state paths are refused.
Every operation freshly reads these files; no new source/owner/verdict cache.

Undo restores exact local files first, then attempts recorded minted-token
revocation with current authority before deleting private credential files.
Offline revocation failure reports the issuing Router and token ID and permits
local undo, matching native ordering. Administrator credentials never enter
client metadata. Remote authority and local disk remain separate failure domains;
there is no claim of a cross-authority atomic transaction. Mode-only concurrent
edits, stale partial exclusive writes and full crash recovery still require the
broader resource/transaction qualification. Existing global state is reused only
when intact; changed state refuses until exact undo or the remaining repair
contract is implemented. Existing `clients.setup/remove` global-state refusal
remains pending complete managed-repair/lifecycle integration.

Eleven complete paired implementation equations and three actual complete native
implementation inputs retain two ordered phases, native source owners, serialized/
reparsed CST and full source inverses. Typed-slot templates author matching JS/TS;
canonical generated TypeScript freshness remains deferred. Independent unrun
source covers five client codecs, exact bytes/modes/private backups, marker and
absent-file restoration, edit refusal, state path/JSON/links compatibility,
checkpoint rollback, real configure/legacy alias/catalog rollback/offline undo,
all-client continuation, operation dispatch, strict actual TypeScript, native
restoration/edit oracles and export provenance. Previous complete native source
before oracle extension is retained separately.

Native local discovery, managed daemon/container selection, global repair,
Codex bridge lifecycle/catalog constraints, temporary process/isolation launch,
wider native parity and all production namespace/forward/reverse/sync/freshness/
platform/performance/receiving/CI-repair/delivery obligations remain OPEN.
No current executable coverage or complete source/verified claim is made.
