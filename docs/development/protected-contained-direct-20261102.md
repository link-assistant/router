# Contained native direct-path admission — source proposal

L04 remains OPEN; the complete production/writer denominator is UNKNOWN. All
parser, compiler, CST, test, receiving, platform and resource verification is
UNRUN. Shared active parents are not edited by this proposal.

Source review found a concrete compatibility restriction: the original five
low-level native/mixed/typed/failure-aware copy writers accepted contained native
filesystem names, while the added guard routed them through ordinary policy
labels. POSIX colon, literal backslash and CRLF leaf names, and longer Windows
relative paths, could consequently refuse even when unprotected. The native,
typed and failure-aware native original `localPath` also used a slash-only
parent check; on Windows it could admit `..` plus the native separator. That
containment bug is explicitly repaired, not restored as a supported domain.

## Separate method and actual target association

The proposed additive `allowContainedDirectWrites({root,targets})` keeps policy
JSON grammar unchanged. Targets are actual normalized absolute native addresses,
not ordinary policy labels. A [bounded address capture](../../tools/translation/protected-contained-direct-20261102-paths.mjs)
checks requested root→captured canonical policy root association and native
separator-aware containment. It returns immutable requested/canonical root and
target DATA. Public canonicalRoot/force flags cannot replace the captured root.
These records grant no namespace, owner, type, executable or source permission.

The method reuses the existing actual direct-alias observer on canonical native
targets. Exact protected entries, symlink endpoints, hard-link identities and
policy-self stay vetoed even for identical or empty output bytes. A canonical
root projection preserves existing intermediate/final symlink behavior; it does
not silently switch the original API to physical-containment-only semantics.
Unprotected aliases may still address their original external targets. This is
an explicit receiving-root policy scope, not a global filesystem sandbox.

The actual native writer adapter passes captured canonical targets to the real
filesystem callback. It does not accept caller-supplied capture records as
permission or reread public row/root paths for that callback. The five original
writers retain all original all-row stale checks and actual byte/mode APIs.
Every preflight batch additionally checks the canonical target bytes against
the original row snapshot before any write, so transient requested-root alias
reads cannot justify modifying different canonical source bytes. Each actual
write captures/admit targets again. Duplicate and unprotected hard-link row
order is retained; initial-byte stale expectations are not repeated after our
own earlier writes. Existing mode observations preserve their exact FS failures. Source/admission
failures additionally become sticky in the actual active native writer frames,
including first falsy/frozen primaries; catching canonical stale validation cannot
leave an outer writer healthy. Independent policy closing still runs. Ordinary
filesystem write callback errors keep their original primary/closing behavior.
The original failure-aware invalidation wrappers and all original producer,
source/native binding, CST/meta and source-fence checks remain in place.

## Bounds and explicit remaining domains

Public writer total row count stays uncapped. Preflight uses sequential batches
of at most1024 rows or about1MiB native address DATA, all before first write.
This avoids imposing the method's4096-target call bound on old public plans.
Payload bytes remain the caller's original string/Buffer/TypedArray values.
The separate path-capture DATA bound is16MiB per call, with131072 bytes per native
address; there is no4096-character ordinary-label ceiling. The native address
observation bound covers usual Windows long-path address sizes, while platform
support remains unqualified until its actual receiving case runs. It is an
explicit resource profile, not a claim covering every filesystem/platform.

Existing alias-observer node/walk/raw-byte bounds, ambiguous missing case/Unicode
refusals, followed nonUTF8 link limits and uninspectable endpoints remain OPEN
compatibility limits. Native path strings that reach ADS/device/other special
platform semantics are not broadly qualified by restoring ordinary file names.
Lookup cost grows with batch count and protected names; the path and alias DATA
bounds are separate transient observations, not a total heap/throughput proof.
There is no persistent verdict/source/hash cache and no OS-level atomic lock
between final observation and the pathname operation. Canonical-addressability
is also explicitly unqualified: an unusually deep path accessible only through
a shorter alias may exceed the OS absolute-path limit when projected canonically;
this remains a real compatibility limit, not an all-domain restoration claim.

## Complete source histories and cases

[Seventeen full parent pairs](../../tools/translation/source-profiles/protected-contained-direct-20261102/manifest.json)
start at exact `d01fdcfef5df719869661475c52e3ce41669c29e` physical source/blob origins.
They retain common unit, native adapter, preparer helper, five actual writers,
three finite history modules and six whole prior cases. The [source proposer](../../tools/translation/protected-contained-direct-20261102-history.mjs)
retains complete before/after/inverses and exactly language then repository
CST/meta substitutions. Named successors require full exact predecessors and
actual current physical afterimages. Earlier ACA/51/c122/144/d01 afterimages
remain immutable; currentAfter follows appended contained-native history.
Unknown paths and altered originals cannot inherit a successor through flags
or hashes. The generic/staged policy APIs and their ordinary label grammar stay
separate. The original direct-alias observer itself is unchanged.

[Actual five-writer cases](../../tools/translation/test/protected-contained-direct-20261102.test.mjs)
cover POSIX native names, real protected symlink/hard-link/policy aliases,
preflight before earlier writes, captured-root callback behavior, Windows
containment refusal and conditional long Windows native writes. [Capture cases](../../tools/translation/test/protected-contained-direct-20261102-capture.test.mjs)
retain exact falsy/frozen root failures, own descriptor/inherited iterator
non-invocation, canonical-byte rechecking after a transient alias read and caught
nested canonical-stale/opaque-read failure invalidation in actual shared frames.
[Whole history cases](../../tools/translation/test/protected-contained-direct-20261102-history.test.mjs)
retain all seventeen source equations and genuine existing history joins.
These cases test the original low-level writer domain; they do not claim every
restored filename is accepted by every original compiler/whole-project producer.
All cases remain UNRUN. No completion or source-draft receipt is proposed.
