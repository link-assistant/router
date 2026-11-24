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
or full runtime authority is promoted. Initial paired 21-file checks passed
188/192 in each engine, with all 184 prior cases passing. The four new failures
exposed byte-character parsing. Expanded 24-file repair checks passed 202/209
in both engines; six failures exposed raw-number/checked-literal proof staging,
and one global-name fixture contradicted the preserved reserved-prefix refusal.
The corrected pair passed 208/209 in each engine; the one remaining authored
fixture expected the wrong panic text. Its assertion now requires the actual
RangeError name and exact message. Final 24-file checks pass all 209 cases in
both engines at source head 74aab6e1881348f61ad721f8e89ecf104bf483fb, including
JavaScript execution and strict TypeScript targets. All four complete pairs
and original failure evidence are retained under
docs/case-studies/issue-759/current/source-string-bytes-74aab6e1/.
No producer, corpus gain, Rust build or full parity claim.
