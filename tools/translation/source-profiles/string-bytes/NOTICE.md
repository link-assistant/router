This draft reuses the full original Rust 1.89 core str module and iterator
sources with their exact SHA256, compressed and original Git blob identities.
Full MIT OR Apache-2.0 licenses are retained in ../copy-standard/.

The original str::bytes body constructs Bytes(self.as_bytes().iter().copied()).
The original Bytes storage is Copied<slice::Iter<u8>>, and its Iterator
implementation declares Item=u8 and forwards next(). This narrow host contract
registers only an actual checked borrowed str receiver and by-value primitive
u8 items. The compiler still translates each caller's original body and typed
callbacks through the common checked semantic meta and JS/strict-TS emitter.

The standard UTF8 primitive bridge is source-inferred lowering, not an
automatically compiled complete core/str/Iterator implementation. Stored
cursors, custom Deref/receivers, reverse/specialized terminals, ownership
escapes and const execution require independent proofs. No namespace, trait
or full runtime authority is promoted. Source-only draft and cases UNRUN;
no producer, corpus gain, Rust build or full parity claim.
