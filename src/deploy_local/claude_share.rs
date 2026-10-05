//! Opt-in use of this machine's Claude Code login by a local deployment
//! (issue #622).
//!
//! The backend used to see only `<root>/credentials`, which nothing fills, so
//! Anthropic was silently absent while other providers kept `/api/health`
//! green. A snapshot copy is no answer: the refresh token rotates, and two
//! holders of one chain fork it on the first refresh (#574). `share` therefore
//! mounts the vendor's own directory — a directory, because Router and Claude
//! Code both replace the file by rename — and runs the backend as the file's
//! owner. A rotation by either side is then the other's next read, and the host
//! CLI can still open what Router rewrote.
//!
//! Only a login that lives in that file can be shared. On macOS Claude Code
//! keeps the live credential in the login Keychain, and the file beside it is a
//! snapshot nothing rotates (#249). A container can reach neither, so that case
//! is refused with the reason instead of deploying a credential that dies
//! within hours.
//!
//! Only paths and reasons are printed; credential bytes never are.

use std::path::{Path, PathBuf};

use link_assistant_router::cli::{ClaudeCredentials, DeployArgs};
use link_assistant_router::env_paths::from_value;

/// Claude Code's own credential file inside its home.
const CREDENTIAL_FILE: &str = ".credentials.json";

/// Preserve credential refusals before checking a default container image.
pub fn preflight(args: &DeployArgs, root: &Path) -> Option<std::process::ExitCode> {
    let mode = args.claude_credentials?;
    if args.status || args.down {
        return None;
    }
    refusal(&Provision::assess(mode, &root.join("data")), root)
}

pub(super) fn refusal(provision: &Provision, root: &Path) -> Option<std::process::ExitCode> {
    let Provision::Refused(reason) = provision else {
        return None;
    };
    println!("{}", provision.status_line(root));
    eprintln!("error: --claude-credentials share refused before deployment mutation: {reason}");
    Some(std::process::ExitCode::from(2))
}

/// Backend label recording the credential a container was started with.
pub(super) const LABEL_SUFFIX: &str = "claude-credentials";

/// What the candidate backend will use for Anthropic.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(super) enum Provision {
    /// The deployment's own `<root>/credentials`, read-only.
    Isolated,
    /// The host's Claude Code home, mounted read-write as `owner`.
    Shared {
        home: PathBuf,
        owner: Option<(u32, u32)>,
    },
    /// `share` was requested but cannot be honoured, and why.
    Refused(String),
}

impl Provision {
    /// Decide from the operator's choice and this machine's Claude Code home.
    pub(super) fn assess(mode: ClaudeCredentials, data: &Path) -> Self {
        Self::assess_in(
            mode,
            std::env::var_os("CLAUDE_CONFIG_DIR"),
            std::env::var_os("HOME"),
            data,
            link_assistant_router::platform_keychain::has_entry,
        )
    }

    /// [`Self::assess`] for a given environment and Keychain presence probe.
    ///
    /// The probe is asked about the entry of the home being shared — the one
    /// Claude Code itself would use for that `CLAUDE_CONFIG_DIR` — so another
    /// profile's Keychain login does not condemn a file-backed home (#653).
    pub(super) fn assess_in(
        mode: ClaudeCredentials,
        config_dir: Option<std::ffi::OsString>,
        user_home: Option<std::ffi::OsString>,
        data: &Path,
        has_entry: impl FnOnce(&str) -> bool,
    ) -> Self {
        match mode {
            ClaudeCredentials::Isolated => Self::Isolated,
            ClaudeCredentials::Share => {
                let config_dir = from_value(config_dir);
                let service = link_assistant_router::platform_keychain::claude_service_for(
                    config_dir.as_deref().map(Path::as_os_str),
                );
                let home =
                    config_dir.or_else(|| from_value(user_home).map(|home| home.join(".claude")));
                share(home.as_deref(), || has_entry(&service), data)
            }
        }
    }

    /// The label value that makes a mode change a new launch specification.
    pub(super) fn label(&self) -> String {
        match self {
            Self::Isolated => "isolated".to_string(),
            Self::Shared { home, .. } => format!("shared:{}", home.display()),
            Self::Refused(_) => "refused".to_string(),
        }
    }

    /// The operator-facing `anthropic_credential=` status line.
    pub(super) fn status_line(&self, root: &Path) -> String {
        match self {
            Self::Isolated => {
                let credentials = root.join("credentials");
                let empty = std::fs::read_dir(&credentials)
                    .map_or(true, |mut entries| entries.next().is_none());
                format!(
                    "anthropic_credential=skipped source={} reason={}the host Claude Code login \
                     was not requested; pass --claude-credentials share to use it",
                    credentials.display(),
                    if empty {
                        "the directory is empty and "
                    } else {
                        ""
                    }
                )
            }
            Self::Shared { home, owner } => format!(
                "anthropic_credential=imported method=shared-mount source={} user={} \
                 refresh_tokens_copied=0",
                home.display(),
                owner.map_or_else(
                    || "container-default".to_string(),
                    |(uid, gid)| format!("{uid}:{gid}")
                )
            ),
            Self::Refused(reason) => format!("anthropic_credential=refused reason={reason}"),
        }
    }
}

pub(super) fn share(
    home: Option<&Path>,
    keychain: impl FnOnce() -> bool,
    data: &Path,
) -> Provision {
    let Some(home) = home else {
        return Provision::Refused(
            "HOME and CLAUDE_CONFIG_DIR are unset, so there is no Claude Code home".to_string(),
        );
    };
    let home = match home.canonicalize() {
        Ok(home) if home.is_dir() => home,
        Ok(_) | Err(_) => {
            return Provision::Refused(format!(
                "there is no Claude Code home at {}; run `claude` and log in first",
                home.display()
            ));
        }
    };
    if keychain() {
        return Provision::Refused(format!(
            "Claude Code keeps this login in the macOS Keychain, which a container can neither \
             read nor update; {} holds a snapshot nothing rotates, and copying the Keychain \
             entry would fork its rotating refresh chain. Run `router deploy --mode host` to move this \
             deployment to a host Router that reads the Keychain in place",
            home.join(CREDENTIAL_FILE).display()
        ));
    }
    let file = home.join(CREDENTIAL_FILE);
    let bytes = match std::fs::read(&file) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Provision::Refused(format!(
                "{} holds no Claude Code login ({CREDENTIAL_FILE} is absent); run `claude` and \
                 log in first",
                home.display()
            ));
        }
        Err(error) => {
            return Provision::Refused(format!(
                "{} cannot be read: {}",
                file.display(),
                error.kind()
            ));
        }
    };
    if let Err(reason) = oauth_login(&bytes) {
        return Provision::Refused(format!("{} {reason}", file.display()));
    }
    if let Err(error) = tempfile::NamedTempFile::new_in(&home) {
        return Provision::Refused(format!(
            "{} is not writable ({}); the credential is replaced by rename beside it",
            home.display(),
            error.kind()
        ));
    }
    let owner = owner(&file);
    if let Some((uid, gid)) = owner
        && let Some(stranger) = foreign_entry(data, uid)
    {
        return Provision::Refused(format!(
            "{} belongs to another user (an earlier backend ran as root); the shared backend \
             runs as {uid}:{gid} and could not write it. Run `sudo chown -R {uid}:{gid} {}` first",
            stranger.display(),
            data.display()
        ));
    }
    Provision::Shared { home, owner }
}

/// Accept Claude Code's own OAuth login; the reason names what is missing.
fn oauth_login(bytes: &[u8]) -> Result<(), &'static str> {
    // Parse errors are replaced by a fixed reason: serde's message can quote
    // the input, and the input is a credential.
    let value: serde_json::Value = serde_json::from_slice(bytes).map_err(|_| "is not JSON")?;
    if value.get("_link_assistant_router").is_some() {
        return Err("is a Router pointer, not Claude Code's own login");
    }
    let oauth = value
        .get("claudeAiOauth")
        .ok_or("holds no Claude.ai OAuth login")?;
    let present = |key: &str| {
        oauth
            .get(key)
            .and_then(serde_json::Value::as_str)
            .is_some_and(|value| !value.is_empty())
    };
    if !present("refreshToken") {
        return Err("holds no refresh token, so it would stop working at its first expiry");
    }
    if !present("accessToken") {
        return Err("holds no access token");
    }
    Ok(())
}

#[cfg(unix)]
fn owner(file: &Path) -> Option<(u32, u32)> {
    use std::os::unix::fs::MetadataExt as _;
    std::fs::metadata(file)
        .ok()
        .map(|metadata| (metadata.uid(), metadata.gid()))
}

#[cfg(not(unix))]
const fn owner(_file: &Path) -> Option<(u32, u32)> {
    None
}

/// The first entry under `data` another user owns, if any.
#[cfg(unix)]
pub(super) fn foreign_entry(data: &Path, uid: u32) -> Option<PathBuf> {
    use std::os::unix::fs::MetadataExt as _;
    let mut pending = vec![data.to_path_buf()];
    while let Some(path) = pending.pop() {
        let Ok(metadata) = std::fs::symlink_metadata(&path) else {
            continue;
        };
        if metadata.uid() != uid {
            return Some(path);
        }
        if metadata.is_dir()
            && let Ok(entries) = std::fs::read_dir(&path)
        {
            pending.extend(entries.flatten().map(|entry| entry.path()));
        }
    }
    None
}

#[cfg(not(unix))]
pub(super) const fn foreign_entry(_data: &Path, _uid: u32) -> Option<PathBuf> {
    None
}

#[cfg(test)]
#[path = "claude_share_tests.rs"]
mod tests;
