# Intact global backend repair source draft

SOURCE ONLY; all implementation, daemon/process, tests, compilers, translators
and preparers remain UNRUN. No local experiments or CI feedback inspection.
Full requirement drafting and whole production translation remain unfinished.

Paired JS/TS modules now repair an intact global configuration when its owned
backend changes, including a restarted Codex bridge. The original config/marker
existence, exact backup bytes, modes and first setup backup remain unchanged;
only current managed config/marker hashes advance. Current post-configuration
hashes must match before repair, so user edits refuse instead of being silently
absorbed into new undo guards. Both codecs reuse the existing native field and
per-key predecessor logic; successful repair returns its separate safety backup.
The existing transaction snapshots all known global state and restores exact
previous config, marker, environment, credential and undo bytes on failure.

A shared runtime authenticator freshly validates the exact client binding
through the live catalog and returns its current models. Reuse and global
repair additionally require credential metadata client/token ID/principal to
match that authenticated token, plus both recorded origins. An existing token
is retained without a new mint, and post-repair catalog refusal rolls files
back without revoking that already-live credential. Changing Router authority
still requires explicit undo; no unrelated token store or admin inference is
substituted. Live catalog data grants no compiler/source/namespace authority.

Seven complete source equations and three complete actual native implementation
inputs retain source owners, two ordered phases, serialized/reparsed CST and
full inverses. Independent unrun source covers old backup/mode retention, both
edit guards, hash advancement, checkpoint rollback, actual restarted-bridge
configure, no extra mint, authenticated metadata association, post-repair
rollback, native guard/undo oracle, strict TypeScript transitively and export.

Broader managed repair/legacy migration and catalogue constraints, local
selection/discovery/daemon/container/temporary launch/platform/CA lifecycle,
all source namespace/production/reverse/sync/freshness/parity/performance/
receiving/CI-repair/delivery obligations remain OPEN. No current executable
coverage, passing evidence or complete source/verified claim is made.
