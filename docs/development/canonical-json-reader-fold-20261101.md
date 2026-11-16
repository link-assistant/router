# Exact canonical JSON reader source fold

**SOURCE ONLY / UNRUN; no consumer is installed.** This separate selector
recognizes only the actual canonical single-let reader block:

```rust
{ let input = record.get(key);
  if let crate::translation_core::Maybe::Some(payload) = input {
      crate::translation_core::Json::as_str(payload)
  } else { crate::translation_core::Maybe::None } }
```

The corresponding fixed `as_bool` and `as_u64` forms are also source candidates,
as is the canonical language-phase fully qualified core Option/serde owner
spelling. Mixed or unknown owner spellings are not normalized by guesswork.
There is no generic if-let, pattern, callback, borrow or std-owner permission.

For the initial source domain, `record` must be an actual original function
parameter with the explicit borrowed Json source role and `key` a closed
literal or original borrowed str parameter. A local/callback/pattern binder
that could shadow either original parameter causes refusal. Dynamic key
expressions, custom written receiver types, repeated payload evaluation,
extra statements/effects, changed branches and alternative constructors remain
residuals. The source role still proves neither the actual Json/std owner nor
the original get dispatch; only the later original whole-project checker can
issue those genuine implementation/type/loan receipts for the adopted domain.

The selected existing contracts are `json_str_field`, `json_bool_field` and
`json_u64_field`. Receiver and key each occur once in the qualified candidate.
Original root/key/input/payload intervals remain in the proposal. Comments
inside the canonical block are retained before the proposed call; full
physical originals and inverses remain exact. The language/repository source
sequences use the existing layered core substitution and actual serialized /
reparsed CST, not a handwritten source emitter or invented native ABI.

`selectCanonicalJsonReaderFold` supplies candidate edits/residuals only.
`proposeCanonicalJsonReaderFold` retains and transforms the **complete supplied
module** while selecting one actual complete top-level function interval.
Unrelated source items stay intact. The original pattern, trait dispatch,
Option owner, source authority, semantic authority and executable admission
remain explicitly unproved/false. This is an explicit owned API migration,
not original standard/closure equivalence.

Independent case source includes all three scalar forms, actual intervals,
comments, literal/parameter keys, wrong owner/body/argument, dynamic key and
callback/pattern-shadow refusals. It retains the complete actual
`token_report.rs` owner while drafting folds for its scope and revoked blocks;
its other closures, filters/defaults, primitive text, output and static-index
prerequisites remain visible. No row admission, percentage or native/target
receiving result is inferred from these source selections.

All checks and code remain UNRUN: no parser, producer, compiler, translator,
preparer, test or native/runtime experiment was executed. Actual consumers need
separate exact source review, complete original source/dependency/namespace
closing, fresh whole original/adopted checking and paired target/inverse work.
No Sync adopter, old helper, Root/Host/checker, scalar170 snapshot, library,
runtime, public contract or source-issuer API is changed here.
