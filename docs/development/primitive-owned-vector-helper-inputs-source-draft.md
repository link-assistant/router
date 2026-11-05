# Owned primitive vector helper input source draft

Status: SOURCE DRAFT ONLY. All receiving, emitted JS/strict TS, interpreters,
CST/meta, canonical native inverse, native/freshness and performance verification
remain UNRUN. No CI feedback was inspected. Full synchronization is OPEN.

Same-module helpers can consume actual owned primitive vectors when their own
complete source retains the explicit truncate(input, u64::MAX) entry guard.
The shared entry-prefix observer is DATA only: actual unchanged private caller,
callee and operation membership remain conjunctive. The existing JS/TS checked
local-call issuer already moves owned operands; this batch keeps that original
API and adds complete all-domain delegation cases.

Native helper closure checking joins both actual original declaration records,
unchanged parameter/return/body snapshots and same-module ownership. It checks
every owned parameter's actual private bounded prefix before walking the full
callee body. Owned arguments move in evaluation order; copied primitives and
shared slices keep their prior modes. Duplicate consumption, use after call,
wrong primitive domain, missing guards, cycles and cross-module helpers remain
refused. The bounded 128-call/32-frame graph walk is unchanged.

Helpers may return an actual owned primitive Vec, a by-value bool/fixed integer,
or actual standard Option of a copied primitive. Option layout/source identity
is rejoined through the existing private carrier checks. Every return remains
loan-free. Scalar-result helpers are selected only through an actual owned
vector input; arbitrary scalar helper admission is unchanged. Existing complete
emission dependency snapshots and fresh rechecks remain required. No new
cross-operation source, owner, verdict, input or result cache is introduced.

Independent eleven-domain case source covers delegation to identity/count/get
helpers through emitted JS, strict TS, both interpreters, CST/meta and native
inverse, with native complete caller cases for the same operations. Negative
source cases retain moved-original and omitted-boundary refusals. Four complete
source equations preserve frozen originals and exact inverses through both
ordered substitution phases. Shared Vec inputs and broader native source
adoption remain unfinished requirements.
