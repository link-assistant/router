These original, licensed inputs belong to the portable compiler source profile
for locked serde_json 1.0.151. They are never installed or built. The root
manifest pins Router's actual Cargo.toml/Cargo.lock, original crates.io archive
checksums, selected macro/serializer/Number/Map members and licenses. An unrelated
repository produces an explicit unsupported dependency-profile diagnostic.

The checked frontend draft uses a private per-translation context derived from
original module bytes and actual separate namespace bindings. Each invocation
retains original tokens/spans and its exact resolved bang owner. The public
source and syntax candidate APIs cannot grant lowering by caller-provided flags.
Unknown type/attribute/bang scopes, roots, traits or macro owners remain refused.
The standard directory pins the actual Rust 1.89 Into/From/prelude/String/str
sources and reexports needed by the original mixed-site literal-key .into().

The features directory retains original normalized package manifests and
licenses from the checksum-locked incoming serde_json dependency subgraph plus serde_core/std
serializer-owner activation.
Activation uses registered default production dependencies, conservatively
unions target conditions and rejects command-line root feature overrides. The
locked jsonschema packages enable float_roundtrip. This construction/Value-copy
profile accommodates that feature without authorizing default numeric parsing;
preserve_order and arbitrary_precision still reject this profile. Feature-source
facts and activation are independently authored, pending focused verification.

The first checked subset is null/bool/string literals, nested unique literal-key
objects, actual source i64/u64/borrowed-str inputs and canonical immutable Value
serialization. Existing checked Option/Result propagation retains its original
nonlocal semantics. Only registered Value get/as_str readers may appear inside
interpolation; arbitrary calls, effects, custom Serialize/Into, scalar floats,
dynamic keys, duplicate keys and const use are refused. The array source profile
adds the original empty alloc::vec! rule: Vec::new constructs zero-capacity RawVec
with no heap allocation or element drop. Only an original empty macro array may
use that checked branch. Nonempty array syntax retains its original spans and
an explicit allocation obligation: the boxed intrinsic allocates before element
initialization, and caller scopes plus the incoming Cargo feature graph do not
prove linked global allocator, OOM or abort behavior. Canonical existing Value
arrays remain covered by their separately pinned Serialize branches.

These are bounded value projection contracts under successful memory-resource
assumptions, not complete application effect contracts. Existing String/key
conversion and Value serialization can allocate and have payload-sensitive drop
behavior; this array draft does not change those adapters or claim that their
effects match a complete linked Rust application. Checked invocation metadata
retains applicationEffectCompleteness=false and the remaining obligations.

New helpers/runtime signatures, runtime assets and all consumed source input
bytes are included in the draft producer fingerprint and portable source bundle.
Global namespace/expansion authority, generated trait behavior and runtime parity
remain false. Only a private parser-issued, checked invocation may obtain the
bounded lowering contract. These hooks and all 24 authored cases are UNRUN; the
whole unchanged bridge child file plus an authored closed root carrier supplies
12 independent expected tool-choice outcomes for the next serial JS/strict-TS
window. The additional whole activitypub/codex files retain their unrelated
namespace, generic, lifetime and allocation prerequisites as negative evidence.
No production function or corpus admission is claimed before that run. Actual
root numeric parse admission remains governed by the independent Cargo parser
capability guard; this future branch must be composed with that guarded baseline.

The separate ../json-roundtrip source-only candidate additionally pins the
original de.rs and complete lexical source members from this same archive. Its
six UNRUN cases exercise a shared exact-rational operation and a separate
bounded runtime branch. They do not change this macro subset or grant actual
root parsing admission. The earlier twenty-four JSON macro cases remain UNRUN.
