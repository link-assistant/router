# Source digest identity and native optimization eligibility

All implementation and independent cases remain UNRUN source drafts. Full
drafting, translation, parity, freshness and qualification stay OPEN.

The existing `originalDeriveHelperCryptoUnchanged` is an optimization-eligibility
predicate: it requires native function spellings before a hashing operation may
be skipped. Its own documented contract retains the complete hashing path for
ordinary JavaScript wrappers. Fresh source readers incorrectly reused that
predicate as a required input-validity guard, conflating full hashing with
permission to avoid it. This finding comes from source review, not CI feedback.

The additive `originalSourceCryptoIntrinsicsUnchanged` instead compares the
original private bootstrap constructor/factory, prototype and update/digest
descriptors, proxy-test function and function-text descriptor. Valid JavaScript
wrappers present at that bootstrap keep their ordinary hashing behavior. Later
function, prototype, accessor or descriptor changes refuse. Identity checks
precede descriptor access to a changed constructor. Relevant descriptor reads
do not invoke their getters. The old optimization predicate and its consumers
remain unchanged.

The impl-namespace, ancestor-namespace and standard-Copy fresh readers select
the new identity guard. Every original complete archive/manifest/license read,
size/hash comparison, decoded-source check, lossless CST transport and closing
input/host fence still executes. No hashing or source check is skipped, no
native-only optimization is newly enabled, and no source/owner/verdict/result
cache crosses operations. The immutable bootstrap intrinsic identities issue no
namespace, type, caller or executable permission.

Five complete source equations retain whole frozen originals, full inverses and
language then repository sequences. Independent unrun cases cover unchanged
bootstrap/legacy eligibility, complete fresh standard sources, valid JavaScript
wrapper bootstrap with an independent SHA-256 vector, later method/descriptor
changes, getter non-invocation and restoration. Mutation cases use isolated
bounded child processes and clean their own temporary files. None of these child
cases, parsers, compilers, preparers, translators or tests was executed locally.

Runtime/platform compatibility, import-cycle behavior, exported receiving and
performance remain unqualified. Native producer closure, wider language/core
families, full canonical/reverse freshness, parity and the full requirement set
remain OPEN. CI feedback remains uninspected during source drafting, and fatal
Rust CI still requires all eight same-SHA JavaScript stages first.
