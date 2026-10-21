//! Constant-time helpers kept out of the already dense token lifecycle module.

/// Compare two secrets without leaking their contents through timing.
///
/// Both sides are hashed with SHA-256 first, so comparison always runs over 32
/// bytes and never short-circuits at the first different byte.
#[must_use]
pub fn constant_time_eq(a: &str, b: &str) -> bool {
    use sha2::{Digest, Sha256};

    let left = Sha256::digest(a.as_bytes());
    let right = Sha256::digest(b.as_bytes());
    let mut diff = 0u8;
    for (x, y) in left.iter().zip(right.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}
