//! Serving the router on a unix domain socket.
//!
//! `gh` builds a custom host's REST base as `https://<host>/api/v3/` and, as of
//! 2.82, offers no way to trust a certificate: it reads no CA variable, has no
//! `--cacert` flag, and ignores `SSL_CERT_FILE` on macOS. So the self-signed
//! certificate the TLS feature generates cannot be given to the one client the
//! feature exists for, and the only remaining route is the machine-wide OS
//! trust store (issue #265).
//!
//! `gh` does honour `http_unix_socket`, and over a socket it speaks plain HTTP.
//! A socket therefore sidesteps the certificate problem entirely for the local
//! sidecar case: no CA, no trust store, and the socket's file permissions bound
//! who can reach the router at least as tightly as a loopback port does.

use std::path::{Path, PathBuf};

/// Where the router should listen, in addition to its TCP port.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SocketSetup {
    /// No socket; the router listens on TCP only, as it always has.
    Disabled,
    /// Serve on this path as well.
    Enabled(PathBuf),
}

impl SocketSetup {
    /// The path this setup serves on, if any.
    #[must_use]
    pub fn path(&self) -> Option<&Path> {
        match self {
            Self::Disabled => None,
            Self::Enabled(path) => Some(path),
        }
    }
}

/// Resolve the socket setup from `LISTEN_UNIX_SOCKET`.
#[must_use]
pub fn from_env() -> SocketSetup {
    std::env::var("LISTEN_UNIX_SOCKET")
        .ok()
        .filter(|path| !path.is_empty())
        .map_or(SocketSetup::Disabled, |path| {
            SocketSetup::Enabled(PathBuf::from(path))
        })
}

/// The `gh` configuration that points at a socket.
///
/// Emitted for the operator to copy, because the setting lives in `gh`'s own
/// config file rather than an environment variable — which is exactly the step
/// the previous documentation left unstated.
#[must_use]
pub fn gh_configuration_hint(path: &Path) -> String {
    format!(
        "gh config set http_unix_socket {}\n\
         export GH_HOST=router.internal\n\
         export GH_ENTERPRISE_TOKEN=<router token>",
        path.display()
    )
}

/// Bind a unix socket, replacing a stale one left by an earlier run.
///
/// A socket file outlives the process that made it, so a router that crashed
/// leaves a path that `bind` would refuse. Removing it is safe only because
/// nothing is listening: a live socket is detected first and reported, rather
/// than being unlinked out from under a running instance.
///
/// # Errors
///
/// Returns an operator-readable message when the path is in use by a live
/// listener, or when the socket cannot be created.
pub async fn bind(path: &Path) -> Result<tokio::net::UnixListener, String> {
    if path.exists() {
        if tokio::net::UnixStream::connect(path).await.is_ok() {
            return Err(format!(
                "{} is already served by a running instance",
                path.display()
            ));
        }
        std::fs::remove_file(path)
            .map_err(|error| format!("could not replace {}: {error}", path.display()))?;
    }
    if let Some(parent) = path.parent()
        && !parent.as_os_str().is_empty()
    {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("could not create {}: {error}", parent.display()))?;
    }
    let listener = tokio::net::UnixListener::bind(path)
        .map_err(|error| format!("could not listen on {}: {error}", path.display()))?;
    restrict_to_owner(path)?;
    Ok(listener)
}

/// Restrict the socket to its owner.
///
/// The router holds the operator's credentials, so anything that can reach it
/// can act as them. A socket readable by every local account would be a wider
/// door than the loopback port it replaces.
fn restrict_to_owner(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("could not restrict {}: {error}", path.display()))?;
    }
    let _ = path;
    Ok(())
}

#[cfg(test)]
#[path = "unix_listener_tests.rs"]
mod tests;
