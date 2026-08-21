//! Optional TLS termination in the router itself.
//!
//! `gh` builds a custom host's REST base as `https://<host>/api/v3/` with no
//! plaintext option, so reaching the GitHub proxy required a separate TLS
//! terminator in front of the router. For a router deliberately *not* reachable
//! from outside — an internal-only sidecar on a private Docker network — that
//! meant standing up a reverse proxy and a private CA purely to satisfy a
//! client's HTTPS requirement, and the one surface most worth mediating (the
//! one that can delete repositories) was the one that could not be pointed at
//! the router (issue #263).
//!
//! Serving TLS here removes that step. `TLS_SELF_SIGNED=1` additionally
//! generates a certificate for the configured names, so a private-network
//! operator enables HTTPS without a CA at all; the certificate is written where
//! `router tls ca` can print it for clients to trust.
//!
//! Unset means unchanged: the router serves plain HTTP exactly as before.

use std::path::{Path, PathBuf};

/// Where the generated certificate and key live inside the data directory.
const GENERATED_DIRECTORY: &str = "tls";
const GENERATED_CERT: &str = "cert.pem";
const GENERATED_KEY: &str = "key.pem";

/// How the router should serve its main listener.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TlsSetup {
    /// Serve plain HTTP, as the router always has.
    Disabled,
    /// Serve HTTPS from this certificate and key.
    Enabled { cert: PathBuf, key: PathBuf },
}

impl TlsSetup {
    /// Whether this setup serves HTTPS.
    #[must_use]
    pub const fn is_enabled(&self) -> bool {
        matches!(self, Self::Enabled { .. })
    }
}

/// Names a generated certificate is valid for.
///
/// A sidecar is reached by its network alias rather than a public hostname, so
/// the container name must be present or the certificate is useless for the
/// deployment it was generated for. Loopback names are included because an
/// operator debugging from inside the container reaches it that way.
#[must_use]
pub fn generated_subject_names(configured: &str) -> Vec<String> {
    let mut names: Vec<String> = configured
        .split(',')
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .map(str::to_string)
        .collect();
    for fallback in ["localhost", "127.0.0.1"] {
        if !names.iter().any(|name| name == fallback) {
            names.push(fallback.to_string());
        }
    }
    names
}

/// Resolve the TLS setup from the environment.
///
/// An explicit certificate pair wins over generation, so an operator who has a
/// real certificate is never silently served a self-signed one.
///
/// # Errors
///
/// Returns a message when only one half of the pair is set — that is a
/// misconfiguration whose silent fallback to plaintext would be the opposite of
/// what was asked for — or when generation fails.
pub fn from_env(data_dir: &Path) -> Result<TlsSetup, String> {
    let cert = std::env::var("TLS_CERT_FILE")
        .ok()
        .filter(|v| !v.is_empty());
    let key = std::env::var("TLS_KEY_FILE").ok().filter(|v| !v.is_empty());
    match (cert, key) {
        (Some(cert), Some(key)) => Ok(TlsSetup::Enabled {
            cert: PathBuf::from(cert),
            key: PathBuf::from(key),
        }),
        (Some(_), None) => Err("TLS_CERT_FILE is set without TLS_KEY_FILE".to_string()),
        (None, Some(_)) => Err("TLS_KEY_FILE is set without TLS_CERT_FILE".to_string()),
        (None, None) => {
            if !std::env::var("TLS_SELF_SIGNED").is_ok_and(|value| value == "1") {
                return Ok(TlsSetup::Disabled);
            }
            let names = generated_subject_names(
                &std::env::var("TLS_SELF_SIGNED_DNS").unwrap_or_else(|_| "localhost".to_string()),
            );
            let (cert, key) = ensure_generated(data_dir, &names)?;
            Ok(TlsSetup::Enabled { cert, key })
        }
    }
}

/// Paths of the generated certificate pair within `data_dir`.
#[must_use]
pub fn generated_paths(data_dir: &Path) -> (PathBuf, PathBuf) {
    let directory = data_dir.join(GENERATED_DIRECTORY);
    (
        directory.join(GENERATED_CERT),
        directory.join(GENERATED_KEY),
    )
}

/// Generate a self-signed certificate for `names`, reusing an existing one.
///
/// Reused rather than regenerated on every start: clients are told to trust
/// this certificate, and rotating it on restart would break every one of them
/// without saying why.
///
/// # Errors
///
/// Returns a message when the certificate cannot be generated or written.
pub fn ensure_generated(data_dir: &Path, names: &[String]) -> Result<(PathBuf, PathBuf), String> {
    let (cert_path, key_path) = generated_paths(data_dir);
    if cert_path.is_file() && key_path.is_file() {
        return Ok((cert_path, key_path));
    }
    let generated = rcgen::generate_simple_self_signed(names.to_vec())
        .map_err(|error| format!("could not generate a self-signed certificate: {error}"))?;
    let directory = cert_path
        .parent()
        .ok_or_else(|| "generated certificate has no directory".to_string())?;
    std::fs::create_dir_all(directory)
        .map_err(|error| format!("could not create {}: {error}", directory.display()))?;
    crate::durable_file::atomic_write_owner_only(&cert_path, generated.cert.pem().as_bytes())
        .map_err(|error| crate::durable_file::describe_write_failure(&cert_path, &error))?;
    // The private key is written owner-only, like every other secret this
    // crate persists.
    crate::durable_file::atomic_write_owner_only(
        &key_path,
        generated.signing_key.serialize_pem().as_bytes(),
    )
    .map_err(|error| crate::durable_file::describe_write_failure(&key_path, &error))?;
    Ok((cert_path, key_path))
}

/// The generated certificate in PEM form, for a client to trust.
///
/// # Errors
///
/// Returns a message when no certificate has been generated yet.
pub fn read_generated_certificate(data_dir: &Path) -> Result<String, String> {
    let (cert_path, _) = generated_paths(data_dir);
    std::fs::read_to_string(&cert_path).map_err(|error| {
        format!(
            "no generated certificate at {}: {error}; start the router with TLS_SELF_SIGNED=1 first",
            cert_path.display()
        )
    })
}

#[cfg(test)]
#[path = "tls_tests.rs"]
mod tests;
