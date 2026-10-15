# Locked tracing macro source inputs

This profile retains the complete official `tracing` 0.1.44 and `tracing-core`
0.1.36 crate archives, unchanged from their upstream compressed bytes. Their
SHA-256 values match this Router checkout's Cargo.lock. `members.json` inventories
every regular member in original archive order, with byte lengths, hashes, modes
and tar header checksums. The three license files are byte-exact copies of their
archive members, including tracing-core's vendored spin license.

The two archives total 527,102 compressed bytes and contain 121 regular files,
10,073,541 bytes unpacked. Most tracing archive payload is generated test input;
no archive is pruned. Integrity inspection reads archive members without extracting
or executing Rust. Bounds and root Cargo input hashes are recorded in manifest.json.

## Original source route observed by inspection

The following are source locations, not executed expansions or owner proofs:

- `tracing/src/lib.rs:976` loads `macros`; lines 963–967 reexport tracing-core
  metadata; line 995 reexports core `format_args`, `concat`, `file`, `line` and
  `stringify` into `__macro_support`.
- `tracing/src/macros.rs:1896` and `:2452` define `info!` and `error!`. Their plain
  message forwarding arms at 2139 and 2695 call `$crate::event!` with the original
  token sequence and `module_path!()`.
- `event!`'s target/message forwarding at 933 reaches the target event body at
  883. That body contains local use/static/let statements and references
  `callsite2!`, `level_enabled!`, `valueset_all!` and `__tracing_log!`.
- `callsite2!` at 2757 reaches reexported `metadata!` and `fieldset!`. The fieldset
  message fallback at 3219 records the literal field name. `valueset_all!`'s
  message fallback at 2966 forwards original message tokens to core `format_args!`.
- `tracing-core/src/lib.rs:230` defines `metadata!`, which uses `identify_callsite!`
  at 192 and core `file!`, `line!` and `module_path!` reexports at 160.

The log alternatives remain separate: `__tracing_log!` has definitions at 3259
and 3266 for absent/present `log`; `if_log_enabled!` has definitions at 3289,
3304 and 3327 for absent log, log without log-always, and log with log-always.
The present-log route also uses `level_to_log!` at 3233. Its external log paths
are function/value/type references, not additional external macro invocations in
these inspected transcribers. No secondary crate was acquired.

## Unfinished proof boundary

Both libraries declare no_std and a docsrs cfg_attr. The manifests, feature
variants, core macro/prelude identity, `$crate` hygiene, caller argument ASTs and
all transitive macro expansions still require genuine source joins. Reading
these definitions does not choose a rule, prove export absence, or establish
feature activation. The optional tracing-attributes reexport is retained in the
whole source; no instrument invocation was selected.

A later requested-owner proof for the conditional Router unix_listener module
must cover both absent and original-present branches, original standard derive
outputs and every relevant nested expansion. It must retain unknown/custom
outputs and global bang uncertainty. This input profile grants no namespace,
macro execution, logging, I/O or runtime authority and changes no admission rule.
