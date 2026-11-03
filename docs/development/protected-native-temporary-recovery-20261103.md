# Native temporary-directory recovery record correction

Source review found that the new temporary-directory route supplied
`createdDirectory` to a collector that records only `recoveryPaths`. The actual
failure path now supplies `recoveryPaths: [created]` and retains the separate
source cause in the supported secondary-error field. This preserves the real
created directory address even when the primary is falsy or frozen and cannot
carry an attached recovery property. No cleanup bypass, source mutation or
native random naming change is introduced.

The original prefix source adapter now retains its historical complete after
and, for newer physical source, requires the original fixed graph's complete
terminal equation. The prior complete prefix cases retain their cases and use
that same whole source-continuation check. The three full before/after/inverse
records remain separate from the immutable original prefix packet, underSHA
`cd4c74e6e5d74fc6db1e598685cef759fb8d2486c1faf30142247a7c6f9ad328`.
Their actual source proposer preserves language/repository stages, whole CST
serialization/reparse and complete inverse records.

An independent failure case uses actual native directory creation and real
Stats, then throws a controlled observation failure when the newly created
entry becomes visible. It retains exactly undefined/null/false/zero/empty-text
or frozen Error as the primary, requires later source checks, checks the real
recovery path in the caller-owned collector and leaves source bytes unchanged.
Only the source read operation faults; no fake Stats or creation callback is
admitted. A second case retains all complete source/CST/inverse records.
Both are UNRUN. Collector record overflow/no-collector recovery limitations
remain explicit: diagnostic DATA is bounded, and the original mutable-error
attachment is only an additional best-effort route.

The shared graph currently has308 earlier equations and still needs these
three new complete source edges before full current-source qualification.
No tests, compiler/translator/preparer, Rust tools/hooks or CI feedback were
run or inspected. Full draft acceptance is unchanged at11/70 DRAFTED,59 OPEN;
whole-project translation, native parity and executable coverage remain open.
