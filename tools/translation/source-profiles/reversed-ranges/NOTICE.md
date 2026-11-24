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

All eight authored cases passed within the exact 19-file/175-case Node and Bun
pair at source 625d2aa729420b288bc0c092fe1d6bece88dd884. The initial pair's sole
failure and complete corrected retries are retained in
docs/case-studies/issue-759/current/source-reversed-ranges-625d2aa7/.
Full namespace, trait, advanced consumption, allocation and runtime parity
remain unproved. No producer or corpus gain is claimed. Original range
endpoints and loop/callback bodies remain.
