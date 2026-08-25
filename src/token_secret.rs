//! The stand-in used when a command will never sign anything.
//!
//! Several commands act on another deployment, or only read local files, and
//! so have no use for this machine's signing secret. Rather than thread an
//! `Option` through every construction site, they install a stand-in — and the
//! stand-in was an ordinary string, which meant a command that turned out to
//! run *locally* after all went on to sign real tokens and encrypt real vendor
//! API keys with a value published in the source (issue #300).
//!
//! Two things fix that. The value now begins with a NUL byte, which no
//! environment variable or command line can carry, so it cannot be supplied
//! deliberately or arrived at by accident. And every place that actually uses
//! the secret — signing, validating, encrypting — refuses it, so the sentinel
//! is inert rather than merely unlikely: reaching a signer with it produces
//! the ordinary "TOKEN_SECRET is required" error, before anything is written.

/// Marks a secret that exists only to satisfy a type, and must never be used.
///
/// The NUL prefix is what makes it unforgeable: `std::env::var` cannot return
/// a value containing one, and neither can argv.
const SENTINEL: &str = "\u{0}link-assistant-router:no-token-secret:";

/// Values that were written into stores before the sentinel existed.
///
/// Kept so a record encrypted under one can be recognised and named, rather
/// than surfacing as an opaque decryption failure (issue #300).
pub const LEGACY_PLACEHOLDERS: [&str; 3] = [
    "unused-by-remote-command",
    "unused-by-auth",
    "unused-by-this-client-command",
];

/// A stand-in secret for a command that will not sign, naming why.
#[must_use]
pub fn placeholder(reason: &str) -> String {
    format!("{SENTINEL}{reason}")
}

/// Whether this secret is a stand-in rather than a real signing key.
#[must_use]
pub fn is_placeholder(secret: &str) -> bool {
    secret.starts_with(SENTINEL) || LEGACY_PLACEHOLDERS.contains(&secret)
}

/// The message a real signing operation gives when handed a stand-in.
///
/// Deliberately the same text a missing `TOKEN_SECRET` produces: from the
/// operator's side that is exactly what happened, and a second wording would
/// only invite the question of which one is the real problem.
#[must_use]
pub fn refusal() -> String {
    "TOKEN_SECRET environment variable is required: this command signs or encrypts on this \
     machine, and no signing secret was supplied"
        .to_string()
}

/// Refuse a stand-in before anything is signed or encrypted.
///
/// # Errors
///
/// Returns [`refusal`] when `secret` is a stand-in.
pub fn ensure_real(secret: &str) -> Result<(), String> {
    if is_placeholder(secret) {
        return Err(refusal());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The value cannot be supplied by an operator, deliberately or otherwise:
    /// no environment variable or command-line argument can carry a NUL.
    #[test]
    fn a_placeholder_cannot_be_expressed_by_a_caller() {
        let placeholder = placeholder("remote-command");
        assert!(placeholder.contains('\u{0}'), "{placeholder:?}");
        assert!(is_placeholder(&placeholder));
        assert!(std::ffi::CString::new(placeholder).is_err());
    }

    /// The defect in issue #300: a command that resolved to local execution
    /// signed tokens and encrypted vendor keys with a value published in the
    /// source. Every stand-in that ever existed is refused, not just today's.
    #[test]
    fn every_placeholder_is_refused_by_a_real_signer() {
        for legacy in LEGACY_PLACEHOLDERS {
            assert!(ensure_real(legacy).is_err(), "{legacy} was accepted");
        }
        assert!(ensure_real(&placeholder("auth")).is_err());
        assert!(ensure_real("a-real-operator-secret").is_ok());
    }
}
