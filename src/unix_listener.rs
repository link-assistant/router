//! Serving the router on a unix domain socket.
//!
//! `gh` builds a custom host's REST base as `https://<host>/api/v3/`, so
//! reaching the router means either serving TLS it trusts or avoiding TLS
//! altogether. Which of those is available depends on the platform, and the
//! difference is not cosmetic (issue #270):
//!
//! - **Linux**: `gh` honours `SSL_CERT_FILE`, because Go's `crypto/x509` reads
//!   it in `root_unix.go`. `router tls ca` plus that variable is a complete
//!   answer, with no socket and no trust-store change.
//! - **macOS**: `root_darwin.go` goes to the Security framework instead and
//!   ignores `SSL_CERT_FILE`, and `gh` has no `--cacert` flag, so a self-signed
//!   certificate cannot be handed to it at all.
//!
//! A socket sidesteps the question on both: `gh` honours `http_unix_socket`,
//! and over a socket it speaks plain HTTP — no CA, no trust store (issue #265).
//! It is the recommended path for a local or sidecar deployment, and the only
//! one that works for `gh` on macOS.
//!
//! The socket is owner-only by default, bounding access at least as tightly as
//! the loopback port it replaces. That default is a floor rather than the whole
//! story: a router in its own container serves clients in *other* containers
//! running as a different uid, which owner-only refuses by construction, so the
//! mode and group are configurable for exactly that case (issue #271).

use std::path::{Path, PathBuf};

/// Who may reach the socket once it is bound.
///
/// Owner-only is the default and the safe floor. Widening it is deliberate:
/// the group form is the one that fits containers, because a sidecar and its
/// task containers can agree on a numeric gid and access is then bounded by
/// that gid rather than by "everyone on the host" (issue #271).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SocketAccess {
    /// Permission bits applied after bind.
    pub mode: u32,
    /// Group to own the socket, by name or numeric gid.
    pub group: Option<String>,
}

impl Default for SocketAccess {
    fn default() -> Self {
        Self {
            // The router holds the operator's credentials, so anything that can
            // reach it can act as them.
            mode: 0o600,
            group: None,
        }
    }
}

/// The widest mode an operator may ask for.
///
/// `0o666` still excludes the execute bits and setuid/setgid, which mean
/// nothing on a socket and would only be a way to smuggle in something else.
const WIDEST_MODE: u32 = 0o666;

impl SocketAccess {
    /// Parse the configured mode and group.
    ///
    /// # Errors
    ///
    /// Returns an operator-readable message when the mode is not octal or is
    /// wider than `0666`. A refusal is deliberate: silently narrowing a mode
    /// the operator asked for would present as the socket simply not working,
    /// which is the failure this setting exists to end.
    pub fn parse(mode: Option<&str>, group: Option<&str>) -> Result<Self, String> {
        let group = group
            .map(str::trim)
            .filter(|group| !group.is_empty())
            .map(str::to_string);
        let Some(configured) = mode.map(str::trim).filter(|mode| !mode.is_empty()) else {
            return Ok(Self {
                group,
                ..Self::default()
            });
        };
        // `0660`, `660` and `0o660` all mean the same thing to an operator.
        let digits = configured
            .strip_prefix("0o")
            .or_else(|| configured.strip_prefix("0O"))
            .unwrap_or(configured);
        let mode = u32::from_str_radix(digits, 8)
            .map_err(|_| format!("LISTEN_UNIX_SOCKET_MODE must be octal, got {configured}"))?;
        if mode > WIDEST_MODE {
            return Err(format!(
                "LISTEN_UNIX_SOCKET_MODE {configured} grants more than 0666"
            ));
        }
        Ok(Self { mode, group })
    }

    /// How the applied access reads in a log line.
    #[must_use]
    pub fn describe(&self) -> String {
        match &self.group {
            Some(group) => format!("mode {:04o}, group {group}", self.mode),
            None => format!("mode {:04o}", self.mode),
        }
    }
}

/// Where the router should listen, in addition to its TCP port.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SocketSetup {
    /// No socket; the router listens on TCP only, as it always has.
    Disabled,
    /// Serve on this path as well, with this access.
    Enabled {
        path: PathBuf,
        access: SocketAccess,
    },
}

impl SocketSetup {
    /// The path this setup serves on, if any.
    #[must_use]
    pub fn path(&self) -> Option<&Path> {
        match self {
            Self::Disabled => None,
            Self::Enabled { path, .. } => Some(path),
        }
    }

    /// The access this setup applies, if it serves at all.
    #[must_use]
    pub fn access(&self) -> Option<&SocketAccess> {
        match self {
            Self::Disabled => None,
            Self::Enabled { access, .. } => Some(access),
        }
    }
}

/// Resolve the socket setup from the `LISTEN_UNIX_SOCKET` family.
///
/// # Errors
///
/// Returns a message when the configured mode cannot be honoured.
pub fn from_env() -> Result<SocketSetup, String> {
    resolve(
        std::env::var("LISTEN_UNIX_SOCKET").ok().as_deref(),
        std::env::var("LISTEN_UNIX_SOCKET_MODE").ok().as_deref(),
        std::env::var("LISTEN_UNIX_SOCKET_GROUP").ok().as_deref(),
    )
}

/// Decide the setup from already-read settings.
///
/// Split from [`from_env`] so both branches are reachable in a test: this crate
/// forbids `unsafe`, and mutating the process environment is the only other way
/// to drive them.
///
/// # Errors
///
/// Returns a message when the mode is not octal or is wider than `0666`.
pub fn resolve(
    configured: Option<&str>,
    mode: Option<&str>,
    group: Option<&str>,
) -> Result<SocketSetup, String> {
    let Some(path) = configured.map(str::trim).filter(|path| !path.is_empty()) else {
        return Ok(SocketSetup::Disabled);
    };
    Ok(SocketSetup::Enabled {
        path: PathBuf::from(path),
        access: SocketAccess::parse(mode, group)?,
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
    let SocketSetup::Enabled { path, access } = from_env()? else {
        return Ok(None);
    };
    let listener = bind(&path, &access).await?;
    // The access is reported, not just applied: an operator who widened it
    // needs to see what was granted, and one who did not needs to see why a
    // client of another uid cannot connect.
    tracing::info!(
        "Listening on unix socket {} ({})",
        path.display(),
        access.describe()
    );
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
    access: &SocketAccess,
) -> Result<tokio::task::JoinHandle<()>, String> {
    let listener = bind(path, access).await?;
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
pub async fn bind(path: &Path, access: &SocketAccess) -> Result<tokio::net::UnixListener, String> {
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
    apply_access(path, access)?;
    Ok(listener)
}

/// Apply the configured access to a freshly bound socket.
///
/// Group first, then mode. The reverse order would briefly leave a `0660`
/// socket owned by the router's own primary group, which is a window — small,
/// but pointless to leave open when ordering costs nothing.
fn apply_access(path: &Path, access: &SocketAccess) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        if let Some(group) = &access.group {
            let gid = resolve_group(group)?;
            std::os::unix::fs::chown(path, None, Some(gid)).map_err(|error| {
                format!("could not set group {group} on {}: {error}", path.display())
            })?;
        }
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(access.mode))
            .map_err(|error| format!("could not restrict {}: {error}", path.display()))?;
    }
    let _ = (path, access);
    Ok(())
}

/// Resolve a group to a gid.
///
/// A numeric gid is taken as-is, which is the form a container deployment
/// uses: the sidecar and the task containers agree on a number, and a name
/// would have to exist identically in both images to mean the same thing.
#[cfg(unix)]
fn resolve_group(group: &str) -> Result<u32, String> {
    if let Ok(gid) = group.parse::<u32>() {
        return Ok(gid);
    }
    group_id_by_name(group)
        .ok_or_else(|| format!("LISTEN_UNIX_SOCKET_GROUP {group} is not a known group"))
}

/// Look a group name up in the local group database.
///
/// Read from `/etc/group` rather than through `getgrnam`, because this crate
/// denies `unsafe` and the safe wrappers for it all mean a new dependency for
/// one lookup. A container image that defines the group in the usual place is
/// served; anything more exotic can give the numeric gid, which is the form
/// that deployment wants anyway.
#[cfg(unix)]
fn group_id_by_name(group: &str) -> Option<u32> {
    let database = std::fs::read_to_string("/etc/group").ok()?;
    database.lines().find_map(|line| {
        let mut fields = line.split(':');
        let name = fields.next()?;
        let _password = fields.next()?;
        let gid = fields.next()?;
        (name == group).then(|| gid.parse().ok())?
    })
}

#[cfg(test)]
#[path = "unix_listener_tests.rs"]
mod tests;
