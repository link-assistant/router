# Original standard Option and Result borrow/callback bodies

The forward compiler selects and completely parses the retained Rust 1.89
Option `as_ref`, `is_none_or`, `is_some_and`, `map_or_else`, and Result `as_ref`
bodies. Checked match, constructor and callback IR supplies both JavaScript
and strict TypeScript output. There are no native per-method body templates.
Existing `unwrap_or`, `unwrap_or_else`, `or_else`, and Default source proofs
retain their existing input envelope and ownership contracts.

`as_ref` requires an existing shared canonical Option/Result place. Its output
reference depths and named lifetimes follow the original receiver, including
nested references. Source-qualified nominal layouts remain distinct. Borrowing
an owned pointee does not authorize moving it or executing Drop. Shared nominal
and array payloads require the immutable target domain at the JS boundary;
shared string/scalar references retain their existing Rust value guards.
No pointer equality or address semantics are admitted.

Predicate and mapping callbacks execute only in the branch selected by the
original standard match. Inputs bind once. By-value payloads require their
existing scalar or privately checked Copy/no-Drop proof; shared references use
the retained original core Copy implementation without pointee Copy authority.
Callback results and free captures are checked independently. Mutable captured
reads/writes, overlapping mutable callback loans, unknown owned Drop, mutable
references, unsupported control transfer, and borrowed lifetime escapes remain
refused. The additions are conservatively unavailable in const functions.

Authority comes from private original parser/declaration associations and
checked source/layout snapshots. Public certificates, changed receiver/body
nodes, cloned callers and changed captured bindings cannot supply it. Fresh
serialized metadata must be reconstructed by compiling the original source
again; metadata alone cannot issue these new source proofs.

A bounded comparison against integration commit `1d80a44078bc170b3dd7fef3a200664fb313341e`
uses unchanged whole `src/request_log/stream_outcome.rs` and `src/chat_admin.rs`,
actual tracked path inventory, actual Cargo inputs and actual source reads.
It admits original `is_streaming_media_type`, `ChatAdminConfig.telegram_enabled`
and `ChatAdminConfig.vk_enabled`: executable function/method counts change from
3/3 to 4/3 and 9/1 to 9/3 respectively. Emitted JS and strict TS independently
exercise absence, token/group policy, Unicode whitespace, case and MIME header
handling. Other methods and whole-corpus parity remain unproved by this batch.
No Rust or Cargo build is part of this evidence.

Complete failed/pass logs, unchanged source snapshots, the reviewed refusal
inventory and input/resource receipts are retained under
`/tmp/router-759-option-borrow-cycle-20261013-v1/` for the parent gate run.
