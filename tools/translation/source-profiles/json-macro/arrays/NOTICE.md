The compressed files contain unchanged original Rust 1.89.0 source from the
official rust-lang/rust repository. manifest.json records each exact source URL,
raw SHA-256, compressed SHA-256 and byte count. The dual MIT/Apache-2.0 license
texts are shared with ../standard and their exact digests are checked. The vec
module input is shared with the existing slice-membership source profile.

The available draft branch is only alloc::vec![] -> Vec::new -> RawVec::new_in:
zero capacity does not allocate or drop an element. The original generic token
matcher selects the actual empty rule; no macro body is copied into a fixture.
The serde_json invocation still needs its private original namespace, Cargo
features and actual source context. A source checksum alone grants no owner.

The boxed intrinsic, compiler THIR/MIR, slice conversion and Global allocator
sources explain the unresolved nonempty frontier. Box storage allocation occurs
before element initialization; slice::into_vec reuses the buffer afterward.
Linked allocator callbacks, allocation failure/abort and payload-sensitive drop
are not certified by the incoming serde_json dependency graph. Nonempty literals
are parsed as original syntax and explicitly refused by the checked lowering.
No thread/runtime/native parity or generated trait implementation is granted.
All five new cases and the earlier nineteen cases remain unexecuted at this
source-only commit. Later value projection checks cannot imply complete
application allocation/OOM/drop equivalence.
