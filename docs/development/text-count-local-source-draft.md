# Native text count local source draft

The implementation, complete source equations and independent cases are drafted
and unrun. No current coverage, target/native parity, source-history freshness
or complete translation/synchronization result is claimed.

Both text adopters now recognize actual written usize parameters and their
simple immutable aliases as count candidate DATA. Explicit usize literal locals
are admitted only within u32 bounds, preserving the common 32/64-bit profile
domain. Exact known text len() local initializers supply a usize count candidate;
the original initializer remains intact and still needs independent whole-body
checking. Unsuffixed inference, arbitrary methods, u64-to-usize guesses and
out-of-scope/forward locals remain unsupported.

Actual repeat/replacen calls use the source identifier exactly once through an
explicit native `as u64` count bridge to the existing paired core operation.
No initializer or count expression is duplicated or inlined. The entire source
function and actual primitive/profile identity must still pass all existing
source/type/ownership/emission checks. The source tracker grants no native
width, type, owner or executable authority.

The shared text source selector also records borrowed annotations explicitly:
an initializer or selected result with another candidate domain cannot acquire
that borrowed-text fact. Counts remain separate from text receivers/patterns.
Original source limits, frame/binder/cell bounds, full CST/inverse checks, both
rule phase names, fixed bulk-stage membership and final freshness checks remain.
No cross-operation source/hash/owner/verdict/result cache is introduced.

Three complete equations retain full original helpers, selector and history
edge with native owners and both rule sequences. Independent unrun cases cover
count casts/evaluation, literal bounds, borrowed annotation mismatches, scopes,
UTF-8 length aliases, both APIs, the actual bulk stage, receiving JS and strict
TS, native expected values and whole source/CST inverses. Wider count forms and
all source/native/production/sync/freshness/parity/delivery requirements stay open.
