# Tuple receiving fixture and actual Core scope

Published `567e1dd0b` translation shard 1 fails the tuple file at job log line
3000: current `response_content_key` names `crate::translation_core::Json`,
but its isolated source fixture supplies no Core edge. The compiler's
missing-owned-facade refusal is correct. The complete current function needs
its qualified source binding before contextual tuple lowering can execute it.

The receiving test keeps that original standalone attempt and explicitly
checks its sole refusal and absent executable. It then authors a scoped fixture
using the actual root's complete `pub mod translation_core;` declaration,
the unchanged original function, and all five complete actual Core sources.
Every source crosses serialized/reparsed lossless CST before ordinary project
checking. The fixture is not a full-crate namespace equivalence claim.

The application must have no refused items. A separate complete golden report
requires the exact **27** existing Core library refusals, including their
messages, spans and source paths. Those untranslated internals retain their
refusals. The original tuple values, integer boundaries, invalid arguments and
unchanged-function source hash assertions remain intact.

The complete eight-case file passes in Node **20.20.2** and Bun **1.4.4** with
the installed TypeScript **5.9.3**. Node's independent original-deadline audit
passes with its child group closed. The repaired case takes **6,543.215 ms**
under Node and **4,830.50 ms** under Bun's unchanged implicit **5,000 ms** limit.
Bun's margin is small; this is not a broad CI performance qualification.
Whole commands take 19.839 and 21.123 seconds; peak sampled cgroup use is
2,182,852,608 and 2,297,012,224 bytes respectively.

The [complete packet](evidence/current-tuple-core.json.gz) retains **47 whole
members / 1,121,145 compressed bytes**, including the published before file,
all current files, full scoped vectors, all failed probes/launch attempts,
streams, resource receipts and independent deadline evidence. Every member is
decoded and length/SHA256 verified. After capture the four evidence roots total
**479,234,690 bytes**. This receiving fix adds **zero** newly executable
production functions; strict parity and the complete gate remain unfinished.
No Rust tool ran.
