//! Admin credential claim state — the two-phase first-visitor bootstrap.
//!
//! The router can be handed an admin credential at deploy time
//! (`TOKEN_ADMIN_KEY`). When it is not, and the admin UI is enabled, the first
//! visitor may *claim* admin. Claiming is deliberately **two-phase**:
//!
//! 1. `POST /api/management/admin/bootstrap` mints a *candidate* token and a `claim_id`.
//!    The system stays unclaimed and the candidate is not valid for anything.
//! 2. The client stores the token, reads it back, and calls
//!    `POST /api/management/admin/bootstrap/confirm` with the `claim_id`, authenticated
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
//! # Credential model
//!
//! The claimed credential is an ordinary admin-scoped `la_sk_…` JWT minted by
//! [`crate::token::TokenManager`] — the same identified, expiring, revocable,
//! rotatable credential the CLI and `TOKEN_ADMIN_KEY` bootstrap paths hand out.
//! The claim file records the JWT's `sub`, never the token itself, so it is not
//! a bearer credential. The candidate JWT is minted *revoked*, which is what
//! keeps phase one inert: it authorises nothing anywhere in the router until
//! phase two reinstates it.
//!
//! Claims written by earlier versions stored a SHA-256 of an opaque
//! `la_admin_…` value instead. Those keep working (see [`AdminClaim::verify`])
//! so an upgrade cannot lock an operator out, and `doctor` warns until the
//! operator rotates them into a JWT with `POST /api/management/admin/rotate`.

use std::fs;
use std::io;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::token::TokenManager;

/// Prefix of the legacy, pre-JWT router-minted admin credential.
pub const ADMIN_TOKEN_PREFIX: &str = "la_admin_";

/// Name of the claim file inside the router data directory.
pub const CLAIM_FILE_NAME: &str = "admin-claim.json";

/// Default TTL of an unconfirmed bootstrap candidate.
pub const DEFAULT_CANDIDATE_TTL_SECS: u64 = 120;

/// Default (and maximum) TTL of a claimed admin JWT, in hours — one year.
pub const DEFAULT_CLAIM_TTL_HOURS: i64 = 24 * 365;

/// Label recorded on the admin JWT minted by a first-visitor claim.
pub const CLAIM_TOKEN_LABEL: &str = "first-visitor-admin";

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

impl From<io::Error> for ClaimError {
    fn from(_: io::Error) -> Self {
        Self::Storage
    }
}

/// A freshly minted, not-yet-active admin candidate.
#[derive(Debug, Clone)]
pub struct Candidate {
    /// Identifier the client echoes back on confirm.
    pub claim_id: String,
    /// The candidate token, returned to the client exactly once.
    pub token: String,
    /// Seconds until the candidate expires.
    pub expires_in_secs: u64,
    /// Lifetime of the credential itself once confirmed, in hours.
    pub ttl_hours: i64,
}

/// Which credential model the active admin credential uses.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CredentialKind {
    /// Nothing is claimed and no key was provisioned.
    None,
    /// A flat `TOKEN_ADMIN_KEY` provisioned at deploy time.
    Environment,
    /// An admin-scoped `la_sk_…` JWT minted by the token manager.
    Jwt,
    /// A pre-JWT opaque `la_admin_…` value; rotate it into a JWT.
    LegacyOpaque,
}

/// Public view of the admin credential state, used by
/// `GET /api/management/admin/status`.
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
    /// Which credential model the active credential uses.
    pub credential_kind: CredentialKind,
    /// `sub` of the active admin JWT, when the credential is one. The token
    /// id is metadata, not a secret — it is what `tokens revoke`/`rotate` take.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_id: Option<String>,
}

/// Persisted form of an activated claim. The token value is never stored.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
struct ClaimFile {
    /// Digest of a legacy opaque credential. Empty for JWT claims.
    #[serde(default)]
    token_sha256: String,
    /// `sub` of the active admin JWT. Empty for legacy claims.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    token_id: String,
    /// TTL the claim was issued with, reused on rotation.
    #[serde(default)]
    ttl_hours: i64,
    claimed_at: u64,
}

impl ClaimFile {
    const fn is_empty(&self) -> bool {
        self.token_sha256.is_empty() && self.token_id.is_empty()
    }
}

#[derive(Debug, Default)]
struct ClaimState {
    /// Digest of the active legacy admin token, once confirmed.
    active_sha256: Option<String>,
    /// `sub` of the active admin JWT, once confirmed.
    active_token_id: Option<String>,
    /// TTL the active credential was issued with.
    ttl_hours: i64,
    claimed_at: Option<u64>,
    candidate: Option<PendingCandidate>,
}

impl ClaimState {
    const fn is_claimed(&self) -> bool {
        self.active_sha256.is_some() || self.active_token_id.is_some()
    }
}

#[derive(Debug, Clone)]
struct PendingCandidate {
    claim_id: String,
    token_sha256: String,
    /// `sub` of the revoked-on-mint admin JWT, when one was minted.
    token_id: Option<String>,
    ttl_hours: i64,
    expires_at: SystemTime,
}

/// The admin credential: an optional environment-provisioned key plus the
/// claim state machine backed by a file in the data directory.
pub struct AdminClaim {
    env_key: Option<String>,
    claim_path: Option<PathBuf>,
    candidate_ttl: Duration,
    /// Mints and validates the admin JWT. Attached after construction because
    /// the token manager and the claim are assembled at different points of
    /// boot; without it the claim falls back to the legacy opaque credential.
    tokens: OnceLock<TokenManager>,
    state: Mutex<ClaimState>,
}

impl std::fmt::Debug for AdminClaim {
    /// Hand-written so neither the environment key nor the token-manager
    /// secret can reach a log line through `{:?}`.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AdminClaim")
            .field("provisioned_by_environment", &self.env_key.is_some())
            .field("claim_path", &self.claim_path)
            .field("candidate_ttl", &self.candidate_ttl)
            .field("jwt_issuer_attached", &self.tokens.get().is_some())
            .finish_non_exhaustive()
    }
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
            .and_then(|raw| crate::lino_json::decode::<ClaimFile>(&raw).ok())
            .filter(|file: &ClaimFile| !file.is_empty());
        Self {
            env_key: env_key.filter(|key| !key.is_empty()),
            claim_path: Some(claim_path),
            candidate_ttl,
            tokens: OnceLock::new(),
            state: Mutex::new(Self::state_from(stored)),
        }
    }

    fn state_from(stored: Option<ClaimFile>) -> ClaimState {
        let Some(file) = stored else {
            return ClaimState::default();
        };
        ClaimState {
            active_sha256: Some(file.token_sha256).filter(|value| !value.is_empty()),
            active_token_id: Some(file.token_id).filter(|value| !value.is_empty()),
            ttl_hours: file.ttl_hours,
            claimed_at: Some(file.claimed_at),
            candidate: None,
        }
    }

    /// Attach the token manager that mints and validates the admin JWT.
    ///
    /// Called once during boot. Without it the claim degrades to the legacy
    /// opaque credential, which is what keeps unit tests that never build a
    /// token manager working.
    pub fn attach_token_manager(&self, tokens: TokenManager) {
        let _ = self.tokens.set(tokens);
    }

    /// Builder form of [`AdminClaim::attach_token_manager`].
    #[must_use]
    pub fn with_token_manager(self, tokens: TokenManager) -> Self {
        self.attach_token_manager(tokens);
        self
    }

    fn issuer(&self) -> Option<&TokenManager> {
        self.tokens.get()
    }

    /// Build an in-memory claim state that never touches disk (tests, and the
    /// `memory` storage policy).
    #[must_use]
    pub fn in_memory(env_key: Option<String>, candidate_ttl: Duration) -> Self {
        Self {
            env_key: env_key.filter(|key| !key.is_empty()),
            claim_path: None,
            candidate_ttl,
            tokens: OnceLock::new(),
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
        let mut state = self.locked();
        self.refresh_from_disk(&mut state);
        self.env_key.is_some() || state.is_claimed()
    }

    /// Whether the claimed credential is still a pre-JWT opaque value.
    ///
    /// `doctor` reports this so an operator knows to rotate it (which mints a
    /// JWT) before the compatibility path is eventually removed.
    #[must_use]
    pub fn uses_legacy_opaque_credential(&self) -> bool {
        let mut state = self.locked();
        self.refresh_from_disk(&mut state);
        self.env_key.is_none() && state.active_token_id.is_none() && state.active_sha256.is_some()
    }

    /// Public status snapshot.
    #[must_use]
    pub fn status(&self) -> AdminStatus {
        let mut state = self.locked();
        self.refresh_from_disk(&mut state);
        Self::expire_candidate(&mut state);
        let provisioned = self.env_key.is_some();
        let claimed = provisioned || state.is_claimed();
        let credential_kind = if provisioned {
            CredentialKind::Environment
        } else if state.active_token_id.is_some() {
            CredentialKind::Jwt
        } else if state.active_sha256.is_some() {
            CredentialKind::LegacyOpaque
        } else {
            CredentialKind::None
        };
        AdminStatus {
            claimed,
            bootstrap_open: !claimed,
            provisioned_by_environment: provisioned,
            candidate_pending: state.candidate.is_some(),
            claimed_at: state.claimed_at,
            credential_kind,
            token_id: state.active_token_id.clone(),
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
        let mut state = self.locked();
        self.refresh_from_disk(&mut state);
        // A JWT claim is authoritative: expiry and revocation must be enforced
        // through the token manager, so the stored digest is *not* consulted as
        // a fallback — that would resurrect a revoked or expired credential.
        if let Some(token_id) = state.active_token_id.as_deref() {
            return self.issuer().is_some_and(|tokens| {
                tokens
                    .validate_admin_token(presented)
                    .is_ok_and(|claims| claims.sub == token_id)
            });
        }
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
        self.begin_with_ttl(None)
    }

    /// Phase 1 with an administrator-chosen TTL, in hours.
    ///
    /// `ttl_hours` is clamped to one hour .. [`DEFAULT_CLAIM_TTL_HOURS`]; `None`
    /// takes the default. The TTL is carried on the minted JWT's `exp`, so
    /// expiry is enforced by the same code path as every other token.
    ///
    /// # Errors
    ///
    /// As [`AdminClaim::begin`], plus [`ClaimError::Storage`] when the admin
    /// JWT cannot be minted.
    #[allow(clippy::significant_drop_tightening)]
    pub fn begin_with_ttl(&self, ttl_hours: Option<i64>) -> Result<Candidate, ClaimError> {
        if self.env_key.is_some() {
            return Err(ClaimError::ProvisionedByEnvironment);
        }
        let mut state = self.locked();
        self.refresh_from_disk(&mut state);
        if state.is_claimed() {
            return Err(ClaimError::AlreadyClaimed);
        }
        let ttl_hours = clamp_ttl(ttl_hours);
        let claim_id = Uuid::new_v4().to_string();
        let (token, token_id) = self.mint_candidate(ttl_hours)?;
        // Only one candidate outstanding at a time: this overwrites any
        // previous mint, so two simultaneous visitors cannot both confirm.
        state.candidate = Some(PendingCandidate {
            claim_id: claim_id.clone(),
            token_sha256: sha256_hex(&token),
            token_id,
            ttl_hours,
            expires_at: SystemTime::now() + self.candidate_ttl,
        });
        Ok(Candidate {
            claim_id,
            token,
            expires_in_secs: self.candidate_ttl.as_secs(),
            ttl_hours,
        })
    }

    /// Mint the candidate credential: an admin JWT when a token manager is
    /// attached, otherwise the legacy opaque value.
    ///
    /// The JWT is revoked immediately after issuance. That is what makes phase
    /// one inert: an abandoned candidate is a revoked token everywhere in the
    /// router — on the admin port and under `/api/management/*` — instead
    /// of a live administrator credential nobody confirmed.
    fn mint_candidate(&self, ttl_hours: i64) -> Result<(String, Option<String>), ClaimError> {
        let Some(tokens) = self.issuer() else {
            return Ok((mint_legacy_admin_token(), None));
        };
        let token = tokens
            .issue_admin_token(ttl_hours, CLAIM_TOKEN_LABEL)
            .map_err(|_| ClaimError::Storage)?;
        let claims = tokens
            .validate_token(&token)
            .map_err(|_| ClaimError::Storage)?;
        tokens
            .revoke_token(&claims.sub)
            .map_err(|_| ClaimError::Storage)?;
        Ok((token, Some(claims.sub)))
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
        self.refresh_from_disk(&mut state);
        if state.is_claimed() {
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
        let file = ClaimFile {
            token_sha256: if candidate.token_id.is_some() {
                String::new()
            } else {
                digest.clone()
            },
            token_id: candidate.token_id.clone().unwrap_or_default(),
            ttl_hours: candidate.ttl_hours,
            claimed_at,
        };
        self.with_claim_lock(|| {
            if self.read_persisted().is_some() {
                return Err(ClaimError::AlreadyClaimed);
            }
            self.persist(&file).map_err(|_| ClaimError::Storage)?;
            self.activate_jwt(candidate.token_id.as_deref())
        })?;
        state.active_sha256 = candidate.token_id.is_none().then_some(digest);
        state.active_token_id = candidate.token_id;
        state.ttl_hours = candidate.ttl_hours;
        state.claimed_at = Some(claimed_at);
        state.candidate = None;
        Ok(())
    }

    /// Turn the confirmed candidate JWT into *the* administrator credential:
    /// reinstate it and retire every other admin token in the same step.
    ///
    /// Retiring the others is what keeps one credential model visible: the
    /// `bootstrap-admin` token printed at startup must not keep working — nor
    /// keep showing as `active` in the token list — once a human has claimed
    /// the router from the browser or a chat.
    fn activate_jwt(&self, token_id: Option<&str>) -> Result<(), ClaimError> {
        let (Some(token_id), Some(tokens)) = (token_id, self.issuer()) else {
            return Ok(());
        };
        tokens
            .reinstate_token(token_id)
            .map_err(|_| ClaimError::Storage)?;
        match tokens.revoke_other_admin_tokens(token_id) {
            Ok(revoked) if !revoked.is_empty() => {
                tracing::info!(
                    "admin claimed: revoked {} superseded admin token(s)",
                    revoked.len()
                );
            }
            Ok(_) => {}
            Err(error) => tracing::warn!("could not retire superseded admin tokens: {error}"),
        }
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
        self.rotate_with_ttl(None)
    }

    /// Rotate with an administrator-chosen TTL, in hours.
    ///
    /// With a token manager attached this mints a fresh admin JWT and revokes
    /// the previous one *by id* in a single step, so the credential the UI
    /// stores and the record the token list shows never disagree. Rotating a
    /// legacy opaque claim is the supported migration: the replacement is a
    /// JWT.
    ///
    /// # Errors
    ///
    /// As [`AdminClaim::rotate`].
    #[allow(clippy::significant_drop_tightening)]
    pub fn rotate_with_ttl(&self, ttl_hours: Option<i64>) -> Result<String, ClaimError> {
        if self.env_key.is_some() {
            return Err(ClaimError::ProvisionedByEnvironment);
        }
        let mut state = self.locked();
        self.refresh_from_disk(&mut state);
        if !state.is_claimed() {
            return Err(ClaimError::NoCandidate);
        }
        let previous_digest = state.active_sha256.clone().unwrap_or_default();
        let previous_id = state.active_token_id.clone().unwrap_or_default();
        let ttl_hours = ttl_hours.map_or_else(
            || {
                if state.ttl_hours > 0 {
                    state.ttl_hours
                } else {
                    DEFAULT_CLAIM_TTL_HOURS
                }
            },
            |requested| clamp_ttl(Some(requested)),
        );
        let (token, token_id) = self.mint_replacement(&previous_id, ttl_hours)?;
        let digest = sha256_hex(&token);
        let claimed_at = unix_secs();
        let file = ClaimFile {
            token_sha256: if token_id.is_some() {
                String::new()
            } else {
                digest.clone()
            },
            token_id: token_id.clone().unwrap_or_default(),
            ttl_hours,
            claimed_at,
        };
        self.with_claim_lock(|| {
            if self.claim_path.is_some() {
                let persisted = self.read_persisted().unwrap_or_default();
                if persisted.token_sha256 != previous_digest || persisted.token_id != previous_id {
                    return Err(ClaimError::AlreadyClaimed);
                }
            }
            self.persist(&file).map_err(|_| ClaimError::Storage)
        })?;
        state.active_sha256 = token_id.is_none().then_some(digest);
        state.active_token_id = token_id;
        state.ttl_hours = ttl_hours;
        state.claimed_at = Some(claimed_at);
        state.candidate = None;
        Ok(token)
    }

    /// Mint the rotation replacement, revoking the outgoing JWT by id.
    fn mint_replacement(
        &self,
        previous_id: &str,
        ttl_hours: i64,
    ) -> Result<(String, Option<String>), ClaimError> {
        let Some(tokens) = self.issuer() else {
            return Ok((mint_legacy_admin_token(), None));
        };
        let token = if previous_id.is_empty() {
            // Migrating a legacy opaque claim: there is no id to revoke, the
            // old value stops working because the claim file no longer holds
            // its digest.
            tokens
                .issue_admin_token(ttl_hours, CLAIM_TOKEN_LABEL)
                .map_err(|_| ClaimError::Storage)?
        } else {
            tokens
                .rotate_admin_token(previous_id, ttl_hours, CLAIM_TOKEN_LABEL)
                .map_err(|_| ClaimError::Storage)?
        };
        let claims = tokens
            .validate_token(&token)
            .map_err(|_| ClaimError::Storage)?;
        Ok((token, Some(claims.sub)))
    }

    fn persist(&self, file: &ClaimFile) -> io::Result<()> {
        let Some(path) = self.claim_path.as_ref() else {
            return Ok(());
        };
        // Links notation, readable: router state is one format rather than two
        // (issue #235). The file name is unchanged so an existing deployment
        // keeps its path; the loader below accepts either encoding.
        let body = crate::lino_json::encode(file)?;
        crate::durable_file::atomic_write_owner_only(path, body.as_bytes())
    }

    fn read_persisted(&self) -> Option<ClaimFile> {
        self.claim_path
            .as_ref()
            .and_then(|path| fs::read_to_string(path).ok())
            .and_then(|raw| crate::lino_json::decode(&raw).ok())
            .filter(|file: &ClaimFile| !file.is_empty())
    }

    fn refresh_from_disk(&self, state: &mut ClaimState) {
        if let Some(file) = self.read_persisted() {
            *state = Self::state_from(Some(file));
        }
    }

    fn with_claim_lock<T>(
        &self,
        operation: impl FnOnce() -> Result<T, ClaimError>,
    ) -> Result<T, ClaimError> {
        let Some(path) = self.claim_path.as_ref() else {
            return operation();
        };
        crate::durable_file::with_exclusive_lock(&path.with_extension("lock"), operation)
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

/// Clamp an administrator-supplied TTL to at most [`DEFAULT_CLAIM_TTL_HOURS`].
fn clamp_ttl(ttl_hours: Option<i64>) -> i64 {
    ttl_hours
        .filter(|hours| *hours > 0)
        .map_or(DEFAULT_CLAIM_TTL_HOURS, |hours| {
            hours.min(DEFAULT_CLAIM_TTL_HOURS)
        })
}

/// Mint a 256-bit legacy admin token with the `la_admin_` prefix.
///
/// Only reached when no token manager is attached (unit tests and embedders
/// that never build one); the router itself always mints a JWT.
fn mint_legacy_admin_token() -> String {
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
#[path = "admin_tests.rs"]
mod tests;
