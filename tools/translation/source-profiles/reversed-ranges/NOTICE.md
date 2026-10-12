Full original Rust 1.89.0 Rev, range iterator and range layout sources are
retained with their Git blob and SHA256 identities. The profile reuses the
existing full Iterator trait pin. Rust source is MIT OR Apache-2.0; full
preserved licenses are in ../copy-standard/LICENSE-MIT and LICENSE-APACHE.

Rev::next delegates to next_back. The fixed TrustedStep specialization checks
the range order before changing its end. An inclusive range saves the old end
and either decrements before yielding or marks exhaustion at equality. Fresh
RangeInclusive construction sets exhausted=false. These exact source paths
provide the proposed checked meta transition for a fresh fixed-integer range;
no custom trait owner or adapter reversal is inferred.

The initial 19-file/175-case pair passed 174 cases under each engine. Its sole
failure used the test helper's result argument as the effects runtime; the
corrected endpoint-order fixture awaits retry. Full namespace, trait, advanced
consumption, allocation and runtime parity remain unproved. No producer or
corpus gain is claimed. Original range endpoints and loop/callback bodies remain.
