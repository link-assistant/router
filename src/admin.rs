//! Admin credential claim state — the two-phase first-visitor bootstrap.
//!
//! The router can be handed an admin credential at deploy time
//! (`TOKEN_ADMIN_KEY`). When it is not, and the admin UI is enabled, the first
//! visitor may *claim* admin. Claiming is deliberately **two-phase**:
//!
//! 1. `POST /api/admin/bootstrap` mints a *candidate* token and a `claim_id`.
//!    The system stays unclaimed and the candidate is not valid for anything.
//! 2. The client stores the token, reads it back, and calls
//!    `POST /api/admin/bootstrap/confirm` with the `claim_id`, authenticated
//!    with the freshly stored token. Presenting the token is the proof that the
//!    client actually holds it.
//! 3. Only the confirm activates the token and closes bootstrap.
//!
//! A mint that is never confirmed expires (see
//! [`AdminUiConfig::candidate_ttl`]) and leaves the system unclaimed, so an
//! abandoned attempt can never brick a deployment. Only one candidate is
//! outstanding at a time: a second mint discards the first, and the first
//! client to *confirm* wins.
//!
//! Only the SHA-256 of the active token is persisted, so the claim file is not
//! a bearer credential.

use std::fs;
use std::io;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use sha2::{Digest, Sha256};
use uuid::Uuid;

/// Prefix of every router-minted admin credential.
pub const ADMIN_TOKEN_PREFIX: &str = "la_admin_";

/// Name of the claim file inside the router data directory.
pub const CLAIM_FILE_NAME: &str = "admin-claim.json";

/// Default TTL of an unconfirmed bootstrap candidate.
pub const DEFAULT_CANDIDATE_TTL_SECS: u64 = 120;

/// Configuration for the separate, opt-in admin UI listener.
#[derive(Debug, Clone)]
pub struct AdminUiConfig {
    /// Whether the admin UI listener runs at all. Off unless a port is set.
    pub enabled: bool,
    /// Address the admin UI binds to. Defaults to loopback so the UI is not
    /// exposed just because the proxy is bound to `0.0.0.0`.
    pub listen_addr: SocketAddr,
    /// How long an unconfirmed bootstrap candidate stays valid.
    pub candidate_ttl: Duration,
}

impl Default for AdminUiConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            listen_addr: SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 8081),
            candidate_ttl: Duration::from_secs(DEFAULT_CANDIDATE_TTL_SECS),
        }
    }
}

/// Why a bootstrap or confirm attempt was refused.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ClaimError {
    /// The system is already claimed; bootstrap is closed.
    AlreadyClaimed,
    /// An admin credential was provisioned by environment; nothing to claim.
    ProvisionedByEnvironment,
    /// No candidate is outstanding (never minted, expired, or superseded).
    NoCandidate,
    /// The `claim_id` does not match the outstanding candidate.
    ClaimIdMismatch,
    /// The presented token does not match the outstanding candidate.
    TokenMismatch,
    /// The claim state could not be persisted.
    Storage,
}

impl std::fmt::Display for ClaimError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let msg = match self {
            Self::AlreadyClaimed => "admin is already claimed; present the admin token",
            Self::ProvisionedByEnvironment => {
                "an admin credential is provisioned by environment; bootstrap is disabled"
            }
            Self::NoCandidate => "no outstanding bootstrap candidate; start over with a new mint",
            Self::ClaimIdMismatch => "claim_id does not match the outstanding candidate",
            Self::TokenMismatch => "the presented token does not match the outstanding candidate",
            Self::Storage => "failed to persist the admin claim",
        };
        f.write_str(msg)
    }
}

impl std::error::Error for ClaimError {}

/// A freshly minted, not-yet-active admin candidate.
#[derive(Debug, Clone)]
pub struct Candidate {
    /// Identifier the client echoes back on confirm.
    pub claim_id: String,
    /// The candidate token, returned to the client exactly once.
    pub token: String,
    /// Seconds until the candidate expires.
    pub expires_in_secs: u64,
}

/// Public view of the admin credential state, used by `GET /api/admin/status`.
///
/// The flags are independent facts about the same credential, so they are
/// reported as flags rather than collapsed into an enum the client would have
/// to re-expand.
#[allow(clippy::struct_excessive_bools)]
#[derive(Debug, Clone, serde::Serialize)]
pub struct AdminStatus {
    /// Whether an admin credential exists (claimed or provisioned).
    pub claimed: bool,
    /// Whether a fresh bootstrap may be started right now.
    pub bootstrap_open: bool,
    /// Whether the credential came from the environment rather than a claim.
    pub provisioned_by_environment: bool,
    /// Whether an unconfirmed candidate is currently outstanding.
    pub candidate_pending: bool,
    /// Unix seconds at which the claim was confirmed, when it was.
    pub claimed_at: Option<u64>,
}

/// Persisted form of an activated claim. Only the digest is stored.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
struct ClaimFile {
    token_sha256: String,
    claimed_at: u64,
}

#[derive(Debug, Default)]
struct ClaimState {
    /// Digest of the active admin token, once confirmed.
    active_sha256: Option<String>,
    claimed_at: Option<u64>,
    candidate: Option<PendingCandidate>,
}

#[derive(Debug, Clone)]
struct PendingCandidate {
    claim_id: String,
    token_sha256: String,
    expires_at: SystemTime,
}

/// The admin credential: an optional environment-provisioned key plus the
/// claim state machine backed by a file in the data directory.
#[derive(Debug)]
pub struct AdminClaim {
    env_key: Option<String>,
    claim_path: Option<PathBuf>,
    candidate_ttl: Duration,
    state: Mutex<ClaimState>,
}

impl AdminClaim {
    /// Build the claim state, loading any previously confirmed claim from
    /// `<data_dir>/admin-claim.json`.
    ///
    /// A missing or unreadable claim file simply means "unclaimed"; the router
    /// must still start, and bootstrap stays available.
    #[must_use]
    pub fn load(env_key: Option<String>, data_dir: &Path, candidate_ttl: Duration) -> Self {
        let claim_path = data_dir.join(CLAIM_FILE_NAME);
        let stored = fs::read_to_string(&claim_path)
            .ok()
            .and_then(|raw| serde_json::from_str::<ClaimFile>(&raw).ok())
            .filter(|file| !file.token_sha256.is_empty());
        let state = ClaimState {
            claimed_at: stored.as_ref().map(|file| file.claimed_at),
            active_sha256: stored.map(|file| file.token_sha256),
            candidate: None,
        };
        Self {
            env_key: env_key.filter(|key| !key.is_empty()),
            claim_path: Some(claim_path),
            candidate_ttl,
            state: Mutex::new(state),
        }
    }

    /// Build an in-memory claim state that never touches disk (tests, and the
    /// `memory` storage policy).
    #[must_use]
    pub fn in_memory(env_key: Option<String>, candidate_ttl: Duration) -> Self {
        Self {
            env_key: env_key.filter(|key| !key.is_empty()),
            claim_path: None,
            candidate_ttl,
            state: Mutex::new(ClaimState::default()),
        }
    }

    /// Whether an admin credential was provisioned by the environment.
    #[must_use]
    pub const fn provisioned_by_environment(&self) -> bool {
        self.env_key.is_some()
    }

    /// Whether *some* admin credential exists — provisioned or claimed.
    #[must_use]
    pub fn is_claimed(&self) -> bool {
        self.env_key.is_some() || self.locked().active_sha256.is_some()
    }

    /// Public status snapshot.
    #[must_use]
    pub fn status(&self) -> AdminStatus {
        let mut state = self.locked();
        Self::expire_candidate(&mut state);
        let provisioned = self.env_key.is_some();
        let claimed = provisioned || state.active_sha256.is_some();
        AdminStatus {
            claimed,
            bootstrap_open: !claimed,
            provisioned_by_environment: provisioned,
            candidate_pending: state.candidate.is_some(),
            claimed_at: state.claimed_at,
        }
    }

    /// Whether `presented` is the active admin credential.
    ///
    /// A pending candidate does **not** authorise anything except its own
    /// confirm call — that is the whole point of the two-phase claim.
    #[must_use]
    pub fn verify(&self, presented: &str) -> bool {
        if presented.is_empty() {
            return false;
        }
        if let Some(env_key) = self.env_key.as_deref()
            && constant_time_eq(env_key.as_bytes(), presented.as_bytes())
        {
            return true;
        }
        let state = self.locked();
        state.active_sha256.as_deref().is_some_and(|digest| {
            constant_time_eq(digest.as_bytes(), sha256_hex(presented).as_bytes())
        })
    }

    /// Phase 1 — mint a candidate admin token.
    ///
    /// # Errors
    ///
    /// Returns [`ClaimError::AlreadyClaimed`] once a claim is active, and
    /// [`ClaimError::ProvisionedByEnvironment`] when a deploy-time key exists.
    #[allow(clippy::significant_drop_tightening)]
    pub fn begin(&self) -> Result<Candidate, ClaimError> {
        if self.env_key.is_some() {
            return Err(ClaimError::ProvisionedByEnvironment);
        }
        let mut state = self.locked();
        if state.active_sha256.is_some() {
            return Err(ClaimError::AlreadyClaimed);
        }
        let claim_id = Uuid::new_v4().to_string();
        let token = mint_admin_token();
        // Only one candidate outstanding at a time: this overwrites any
        // previous mint, so two simultaneous visitors cannot both confirm.
        state.candidate = Some(PendingCandidate {
            claim_id: claim_id.clone(),
            token_sha256: sha256_hex(&token),
            expires_at: SystemTime::now() + self.candidate_ttl,
        });
        Ok(Candidate {
            claim_id,
            token,
            expires_in_secs: self.candidate_ttl.as_secs(),
        })
    }

    /// Phase 2 — confirm that the client stored the candidate token.
    ///
    /// `presented` must be the candidate token itself; holding it is the proof.
    /// Only this call activates the token and closes bootstrap.
    ///
    /// # Errors
    ///
    /// Fails when the system is already claimed, when no live candidate exists,
    /// when the `claim_id` or token does not match, or when the claim cannot be
    /// persisted.
    #[allow(clippy::significant_drop_tightening)]
    pub fn confirm(&self, claim_id: &str, presented: &str) -> Result<(), ClaimError> {
        if self.env_key.is_some() {
            return Err(ClaimError::ProvisionedByEnvironment);
        }
        let mut state = self.locked();
        if state.active_sha256.is_some() {
            return Err(ClaimError::AlreadyClaimed);
        }
        Self::expire_candidate(&mut state);
        let candidate = state.candidate.clone().ok_or(ClaimError::NoCandidate)?;
        if !constant_time_eq(candidate.claim_id.as_bytes(), claim_id.as_bytes()) {
            return Err(ClaimError::ClaimIdMismatch);
        }
        let digest = sha256_hex(presented);
        if !constant_time_eq(candidate.token_sha256.as_bytes(), digest.as_bytes()) {
            return Err(ClaimError::TokenMismatch);
        }
        let claimed_at = unix_secs();
        self.persist(&digest, claimed_at)
            .map_err(|_| ClaimError::Storage)?;
        state.active_sha256 = Some(digest);
        state.claimed_at = Some(claimed_at);
        state.candidate = None;
        Ok(())
    }

    /// Rotate the claimed admin credential: mint a replacement and retire the
    /// current one in a single step.
    ///
    /// # Errors
    ///
    /// Returns [`ClaimError::ProvisionedByEnvironment`] when the credential
    /// comes from the environment (rotate it at the deployment instead),
    /// [`ClaimError::NoCandidate`] when nothing is claimed yet, and
    /// [`ClaimError::Storage`] when the replacement cannot be persisted.
    #[allow(clippy::significant_drop_tightening)]
    pub fn rotate(&self) -> Result<String, ClaimError> {
        if self.env_key.is_some() {
            return Err(ClaimError::ProvisionedByEnvironment);
        }
        let mut state = self.locked();
        if state.active_sha256.is_none() {
            return Err(ClaimError::NoCandidate);
        }
        let token = mint_admin_token();
        let digest = sha256_hex(&token);
        let claimed_at = unix_secs();
        self.persist(&digest, claimed_at)
            .map_err(|_| ClaimError::Storage)?;
        state.active_sha256 = Some(digest);
        state.claimed_at = Some(claimed_at);
        state.candidate = None;
        Ok(token)
    }

    fn persist(&self, token_sha256: &str, claimed_at: u64) -> io::Result<()> {
        let Some(path) = self.claim_path.as_ref() else {
            return Ok(());
        };
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let file = ClaimFile {
            token_sha256: token_sha256.to_string(),
            claimed_at,
        };
        let body = serde_json::to_string_pretty(&file)?;
        // Write-then-rename so a crash mid-write cannot leave a truncated file
        // that would read back as "unclaimed".
        let tmp = path.with_extension("json.tmp");
        fs::write(&tmp, body)?;
        fs::rename(&tmp, path)
    }

    fn expire_candidate(state: &mut ClaimState) {
        let expired = state
            .candidate
            .as_ref()
            .is_some_and(|candidate| candidate.expires_at <= SystemTime::now());
        if expired {
            state.candidate = None;
        }
    }

    fn locked(&self) -> std::sync::MutexGuard<'_, ClaimState> {
        self.state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

/// Mint a 256-bit admin token with the `la_admin_` prefix.
fn mint_admin_token() -> String {
    let high = Uuid::new_v4().simple().to_string();
    let low = Uuid::new_v4().simple().to_string();
    format!("{ADMIN_TOKEN_PREFIX}{high}{low}")
}

/// Lowercase hex SHA-256 of a string.
#[must_use]
pub fn sha256_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

/// Length-aware constant-time byte comparison.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter()
        .zip(b.iter())
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}

fn unix_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_secs())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn claim() -> AdminClaim {
        AdminClaim::in_memory(None, Duration::from_secs(120))
    }

    #[test]
    fn unclaimed_by_default() {
        let admin = claim();
        assert!(!admin.is_claimed());
        assert!(admin.status().bootstrap_open);
    }

    #[test]
    fn candidate_alone_does_not_authorise() {
        let admin = claim();
        let candidate = admin.begin().expect("mint");
        assert!(!admin.verify(&candidate.token));
        assert!(!admin.is_claimed());
        assert!(admin.status().bootstrap_open);
    }

    #[test]
    fn confirm_activates_and_closes_bootstrap() {
        let admin = claim();
        let candidate = admin.begin().expect("mint");
        admin
            .confirm(&candidate.claim_id, &candidate.token)
            .expect("confirm");
        assert!(admin.verify(&candidate.token));
        assert!(admin.is_claimed());
        assert!(!admin.status().bootstrap_open);
        assert_eq!(admin.begin().unwrap_err(), ClaimError::AlreadyClaimed);
    }

    #[test]
    fn unconfirmed_mint_is_always_recoverable() {
        let admin = claim();
        let abandoned = admin.begin().expect("first mint");
        let second = admin.begin().expect("second mint stays allowed");
        // The abandoned candidate was discarded — only one outstanding.
        assert_eq!(
            admin.confirm(&abandoned.claim_id, &abandoned.token),
            Err(ClaimError::ClaimIdMismatch)
        );
        admin
            .confirm(&second.claim_id, &second.token)
            .expect("second confirms");
        assert!(admin.verify(&second.token));
    }

    #[test]
    fn expired_candidate_leaves_system_unclaimed() {
        let admin = AdminClaim::in_memory(None, Duration::from_secs(0));
        let candidate = admin.begin().expect("mint");
        assert_eq!(
            admin.confirm(&candidate.claim_id, &candidate.token),
            Err(ClaimError::NoCandidate)
        );
        assert!(!admin.is_claimed());
        assert!(admin.status().bootstrap_open);
    }

    #[test]
    fn wrong_token_is_rejected() {
        let admin = claim();
        let candidate = admin.begin().expect("mint");
        assert_eq!(
            admin.confirm(&candidate.claim_id, "la_admin_nope"),
            Err(ClaimError::TokenMismatch)
        );
        assert!(!admin.is_claimed());
    }

    #[test]
    fn environment_key_disables_bootstrap() {
        let admin = AdminClaim::in_memory(Some("env-key".into()), Duration::from_secs(60));
        assert!(admin.is_claimed());
        assert!(admin.verify("env-key"));
        assert!(!admin.verify("other"));
        assert_eq!(
            admin.begin().unwrap_err(),
            ClaimError::ProvisionedByEnvironment
        );
    }

    #[test]
    fn rotate_replaces_the_credential() {
        let admin = claim();
        let candidate = admin.begin().expect("mint");
        admin
            .confirm(&candidate.claim_id, &candidate.token)
            .expect("confirm");
        let replacement = admin.rotate().expect("rotate");
        assert!(admin.verify(&replacement));
        assert!(!admin.verify(&candidate.token));
    }

    #[test]
    fn rotate_requires_an_existing_claim() {
        assert_eq!(claim().rotate().unwrap_err(), ClaimError::NoCandidate);
    }

    #[test]
    fn claim_survives_restart() {
        let dir = tempfile::tempdir().expect("tempdir");
        let ttl = Duration::from_secs(60);
        let admin = AdminClaim::load(None, dir.path(), ttl);
        let candidate = admin.begin().expect("mint");
        admin
            .confirm(&candidate.claim_id, &candidate.token)
            .expect("confirm");

        let reloaded = AdminClaim::load(None, dir.path(), ttl);
        assert!(reloaded.is_claimed());
        assert!(reloaded.verify(&candidate.token));
        assert_eq!(reloaded.begin().unwrap_err(), ClaimError::AlreadyClaimed);
    }

    #[test]
    fn mint_never_persists_anything() {
        let dir = tempfile::tempdir().expect("tempdir");
        let ttl = Duration::from_secs(60);
        let admin = AdminClaim::load(None, dir.path(), ttl);
        let _candidate = admin.begin().expect("mint");
        assert!(!dir.path().join(CLAIM_FILE_NAME).exists());
        assert!(!AdminClaim::load(None, dir.path(), ttl).is_claimed());
    }
}
