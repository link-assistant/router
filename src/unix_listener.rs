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
    resolve(std::env::var("LISTEN_UNIX_SOCKET").ok().as_deref())
}

/// Decide the setup from an already-read setting.
///
/// Split from [`from_env`] so both branches are reachable in a test: this crate
/// forbids `unsafe`, and mutating the process environment is the only other way
/// to drive them.
#[must_use]
pub fn resolve(configured: Option<&str>) -> SocketSetup {
    configured
        .map(str::trim)
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

/// Serve `app` on the configured socket, if one is configured.
///
/// Returns the task serving it so the caller can stop it on shutdown; `None`
/// means no socket was configured and the router listens on TCP only.
///
/// # Errors
///
/// Returns a message when the configured path cannot be bound, since a router
/// that silently skipped the socket it was told to serve would leave `gh` with
/// the certificate problem this exists to avoid.
pub async fn serve_configured(
    app: axum::Router,
) -> Result<Option<tokio::task::JoinHandle<()>>, String> {
    let SocketSetup::Enabled(path) = from_env() else {
        return Ok(None);
    };
    let listener = bind(&path).await?;
    tracing::info!("Listening on unix socket {}", path.display());
    tracing::info!("Point gh at it:\n{}", gh_configuration_hint(&path));
    Ok(Some(tokio::spawn(async move {
        if let Err(error) = axum::serve(listener, app).await {
            tracing::error!("unix socket listener failed: {error}");
        }
    })))
}

/// Serve `app` on `path`, for a caller that already knows where.
///
/// # Errors
///
/// Returns a message when the path cannot be bound.
pub async fn serve_on(
    app: axum::Router,
    path: &Path,
) -> Result<tokio::task::JoinHandle<()>, String> {
    let listener = bind(path).await?;
    Ok(tokio::spawn(async move {
        if let Err(error) = axum::serve(listener, app).await {
            tracing::error!("unix socket listener failed: {error}");
        }
    }))
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
