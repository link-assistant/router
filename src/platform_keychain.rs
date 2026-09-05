//! The platform secret store a vendor CLI keeps its live subscription in.
//!
//! [`crate::credential_store`] is built on the premise that the credential file
//! is the shared mutable state every holder reads and writes. On macOS that
//! premise does not hold: Claude Code keeps its live credential in the login
//! Keychain and leaves `~/.claude/.credentials.json` behind as a snapshot that
//! nothing rotates. The router read only the file, so it saw a credential that
//! had been dead for hours while the vendor client — on the same account —
//! kept working, and every rung of the recovery ladder from issue #239 was
//! reading a store the vendor client was not writing to (issue #249).
//!
//! The entry holds the same JSON shape the file does, so only *retrieval*
//! differs; parsing is shared with [`crate::subscription`]. Linux and Windows
//! keep their own conventions and have no lookup here yet, which is why this is
//! a per-platform probe with the file as the fallback rather than a macOS
//! special case: [`lookup`] simply reports "no such store" everywhere else, and
//! the file path is unchanged.
//!
//! Secrets are never logged. Only the *name* of the store is, which is the
//! thing an operator staring at a valid-looking file could not previously see.

use crate::subscription::SubscriptionProvider;

/// Which store a credential was read from, for operator-facing messages.
///
/// `doctor` prints this: a file that looks valid while the router reports
/// `rejected` is indistinguishable from a bug until the output names the place
/// the router actually read.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Origin {
    /// A credential file under the provider's home directory.
    File,
    /// A credential file copied from a vendor-owned rotating refresh chain.
    ExternalFile,
    /// A Router reference to the vendor client's writable credential file.
    /// Both processes therefore advance the same rotating refresh chain.
    AdoptedFile,
    /// The platform secret store the vendor CLI uses.
    Keychain,
}

impl Origin {
    /// A short label naming the store.
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::File => "file",
            Self::ExternalFile => "external file",
            Self::AdoptedFile => "adopted file",
            Self::Keychain => "keychain",
        }
    }
}

/// The keychain service name a provider's vendor CLI stores its credential
/// under, when this platform has one at all.
///
/// Only Claude Code is known to do this today. Returning `None` for the rest
/// keeps them on the file path they already use rather than guessing at a
/// service name and reporting a confusing miss.
#[must_use]
pub const fn service_name(provider: SubscriptionProvider) -> Option<&'static str> {
    match provider {
        SubscriptionProvider::Claude if cfg!(target_os = "macos") => {
            Some("Claude Code-credentials")
        }
        _ => None,
    }
}

/// Read the raw credential JSON a vendor CLI keeps in the platform store.
///
/// Returns `None` when this platform or provider has no such store, when the
/// entry is absent, or when the lookup fails for any reason — an unavailable
/// keychain must degrade to the file rather than fail the command.
#[must_use]
pub fn lookup(provider: SubscriptionProvider) -> Option<String> {
    let service = service_name(provider)?;
    read_generic_password(service)
}

/// macOS: ask the Security framework, via the `security` tool, for the entry.
///
/// The CLI rather than a linked framework binding keeps this dependency-free
/// and, more importantly, keeps the router subject to the same keychain access
/// control the vendor client is: if the user has not granted access, this fails
/// and the file remains the source, which is exactly the pre-existing behaviour.
#[cfg(target_os = "macos")]
fn read_generic_password(service: &str) -> Option<String> {
    let output = std::process::Command::new("/usr/bin/security")
        .args(["find-generic-password", "-s", service, "-w"])
        .output()
        .ok()?;
    if !output.status.success() {
        // An absent entry is the ordinary case on a machine that logged in with
        // an older client; it is not worth an operator-facing warning.
        tracing::debug!("no keychain entry for {service}");
        return None;
    }
    let secret = String::from_utf8(output.stdout).ok()?;
    let secret = secret.trim().to_string();
    (!secret.is_empty()).then_some(secret)
}

/// Every other platform: no known vendor keychain, so the file stands alone.
#[cfg(not(target_os = "macos"))]
const fn read_generic_password(_service: &str) -> Option<String> {
    None
}

#[cfg(test)]
#[path = "platform_keychain_tests.rs"]
mod tests;
