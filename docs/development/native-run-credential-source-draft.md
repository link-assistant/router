# Exact per-run credentials and lease draft

SOURCE ONLY; implementation, parser/translator/preparer/compilers and all cases
remain UNRUN. Full bulk drafting continues without CI feedback inspection.

The existing remote credential implementation now shares one private function
between persistent and per-run preparation. Persistent request flags and record
shape remain their existing contract. Runs request native ephemeral/run-lease,
sliding/fixed TTL, request budget, label and exact model-policy fields. Health is
anonymous; separate inference/management origins and CA selection remain in the
existing bounded transport. Client token payload decoding grants no trust: the
exact client/subscriber binding must pass fresh live catalog authentication.
Only tokens minted by this operation are eligible for its idempotent cleanup.

A shared model-policy layer checks forwarded/wrapper conflicts and widening before
transport. Recognized native thinking suffixes yield their base id; malformed,
unrecognized and u32-overflow suffixes remain literal IDs. Required-model clients
need an explicit id or opt-in picker. Selection and every allowed id must be in
the exact authorized catalog. A picker bootstrap is replaced by a newly minted
selected-model grant, then cleaned before launch. Supplied inference credentials
cannot satisfy a new exact-model minting policy and are never revoked by cleanup.

Minted runs use the native 30-second lease schedule and a bounded 10-second
heartbeat. Status is classified without requiring JSON: 2xx renewed, 404/405
unsupported/stop, 401/403 rejected, 409 refused and other outcomes transient.
Only outcome transitions add bounded notes. Finalization cancels the timer and
in-flight transport before revoking every owned candidate. Cleanup failure reports
the finite TTL backstop without rendering administrator or run credentials.

Seven complete compiler equations retain both ordered phases/full CST inverses
and seven full native original files. Independent unrun JS/strict TS/native cases
cover suffix/policy boundaries, exact mint bodies, two-stage picker replacement,
supplied-token refusal/preservation, catalog/callback/setup cleanup, revocation
failures and status-only body cancellation. Actual long-lived heartbeat scheduling,
platform timing and cancellation pressure still need independent qualification.
The full temporary process dispatcher/profile/bridge composition, complete
forward/reverse/sync/parity, receiving qualification and delivery remain OPEN.
Rust remains CI only after all eight same-SHA JavaScript gates.
