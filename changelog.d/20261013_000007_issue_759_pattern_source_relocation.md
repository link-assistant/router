Standalone Rust translation now relocates executable subject and pattern spans
alongside ordinary spans. Immutable original-source proofs keep their original
coordinates. This resolves the integrity failure reached in the complete bulk
producer at `src/admin_auth.rs`; the source-link verifier remains unchanged.

The existing Cargo-edition control now places a let-chain after Unicode trivia
and an independent declaration, checks exact source reconstruction and UTF-16
and byte offsets, and exercises emitted JavaScript and independently compiled
strict TypeScript. Changed subject and pattern coordinates must still fail the
original-source integrity check. Both complete successor engines passed 681 of
682 cases: the negative control incorrectly supplied a different synthetic
main shape and failed the source-context guard. Its fixture now uses the exact
supported form and direct original Cargo capture. The full corrected pair and
generation remain pending; native Router and reverse parity remain unfinished.
