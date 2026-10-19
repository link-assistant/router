The private independent SHA-256 packs four aligned ASCII code units directly
into one big-endian input word. Unicode, unaligned bytes and short tails retain
the existing scalar encoder; compression rounds, padding, input bounds, native
hash/read observers and every fresh validation checkpoint remain unchanged.

This retains immutable source authentication rather than memoizing digests or
verdicts. The manifest and executor digest change only to pin the complete new
helper. Work arrays remain private and keep the qualified typed-storage option
and ordinary-array fallback.

Eight bounded whole cases retain the complete previous helper, compare it with
the new helper and native crypto over all 64 offsets, SHA padding boundaries,
NUL/all ASCII, Unicode and malformed surrogates. Reversible complete-source
factories observe actual typed and synchronous cold/live fallback storage;
complete source-packet executors compare all 60 native hash inputs and full read
tapes, with a real hash-time intrinsic mutation and restored positive. Those
factories are test instrumentation, not executable or source-owner authority.

Four-character lookahead uses the already-qualified native charCodeAt and
introduces no user callback. Non-ASCII lookahead is not consumed, so surrogate
refusal remains on the original scalar path. There is no measured Node/Bun gain
or claim that this change meets the original five-second regeneration deadline.
No engines or Rust ran in the source worker.
