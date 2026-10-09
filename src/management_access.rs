//! Bounded, instance-wide failed-management-authentication tracking.
use std::collections::BTreeMap;
use std::net::IpAddr;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use crate::management_config::ManagementConfig;

const MAX_CLIENTS: usize = 4096;
const SNAPSHOT: &str = "management-lockouts.lenv";

/// An active ban's diagnostic view. No credential material is retained.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ManagementBan {
    /// Canonical socket peer address.
    pub client_ip: IpAddr,
    /// Wall-clock expiry for diagnostics; enforcement uses monotonic time.
    pub expires_at: u64,
}

#[derive(Debug)]
struct Attempt {
    failures: u32,
    last_failure: Instant,
    banned_at: Option<Instant>,
    expires_at: u64,
}

impl Attempt {
    fn remaining(&self, now: Instant, window: Duration) -> Option<u64> {
        let elapsed = now.saturating_duration_since(self.banned_at?);
        let remaining = window.checked_sub(elapsed)?;
        (!remaining.is_zero()).then(|| {
            remaining
                .as_secs()
                .saturating_add(u64::from(remaining.subsec_nanos() > 0))
        })
    }

    fn expired(&self, now: Instant, window: Duration) -> bool {
        self.banned_at.map_or_else(
            || now.saturating_duration_since(self.last_failure) >= window,
            |_| self.remaining(now, window).is_none(),
        )
    }
}

/// Consecutive failures and bans shared by every management listener.
#[derive(Debug)]
pub struct ManagementAccess {
    config: OnceLock<ManagementConfig>,
    attempts: Mutex<BTreeMap<IpAddr, Attempt>>,
    snapshot: Option<PathBuf>,
}

impl ManagementAccess {
    /// Initialize inert state; reading an admin claim never changes diagnostics.
    #[must_use]
    pub fn new(data_dir: &Path) -> Self {
        Self {
            config: OnceLock::new(),
            attempts: Mutex::new(BTreeMap::new()),
            snapshot: Some(data_dir.join(SNAPSHOT)),
        }
    }

    /// An in-memory tracker with no diagnostic file writes.
    #[must_use]
    pub const fn in_memory() -> Self {
        Self {
            config: OnceLock::new(),
            attempts: Mutex::new(BTreeMap::new()),
            snapshot: None,
        }
    }

    /// Select the instance's policy once, before serving its listeners.
    pub fn configure(&self, config: ManagementConfig) {
        if self.config.set(config).is_ok() {
            self.save(&BTreeMap::new());
        }
    }

    /// Current policy, defaulting to local-only management and local recovery.
    #[must_use]
    pub fn config(&self) -> ManagementConfig {
        self.config.get().copied().unwrap_or_default()
    }

    fn exempt(&self, ip: IpAddr) -> bool {
        let config = self.config();
        config.lockout_failures == 0
            || config.lockout_secs == 0
            || (config.exempt_loopback && ip.is_loopback())
    }

    /// Remaining ban seconds, or a capacity backoff for a new untracked IP.
    pub fn check(&self, ip: IpAddr) -> Option<u64> {
        self.check_at(normalize_ip(ip), Instant::now())
    }

    fn check_at(&self, ip: IpAddr, now: Instant) -> Option<u64> {
        if self.exempt(ip) {
            return None;
        }
        let window = Duration::from_secs(self.config().lockout_secs);
        let mut attempts = self
            .attempts
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if attempts
            .get(&ip)
            .is_some_and(|entry| entry.expired(now, window))
        {
            let was_banned = attempts
                .remove(&ip)
                .is_some_and(|entry| entry.banned_at.is_some());
            if was_banned {
                self.save(&attempts);
            }
        }
        if let Some(entry) = attempts.get(&ip) {
            return entry.remaining(now, window);
        }
        if attempts.len() >= MAX_CLIENTS {
            let previous_len = attempts.len();
            attempts.retain(|_, entry| !entry.expired(now, window));
            if attempts.len() != previous_len {
                self.save(&attempts);
            }
            if attempts.len() >= MAX_CLIENTS {
                return Some(1);
            }
        }
        None
    }

    /// Record a failed credential. Returns a newly-created ban for auditing.
    pub fn failure(&self, ip: IpAddr) -> Option<ManagementBan> {
        self.failure_at(normalize_ip(ip), Instant::now())
    }

    fn failure_at(&self, ip: IpAddr, now: Instant) -> Option<ManagementBan> {
        if self.exempt(ip) {
            return None;
        }
        let config = self.config();
        let window = Duration::from_secs(config.lockout_secs);
        let mut attempts = self
            .attempts
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if !attempts.contains_key(&ip) && attempts.len() >= MAX_CLIENTS {
            return None;
        }
        let entry = attempts.entry(ip).or_insert(Attempt {
            failures: 0,
            last_failure: now,
            banned_at: None,
            expires_at: 0,
        });
        if entry.expired(now, window) {
            entry.failures = 0;
            entry.banned_at = None;
        }
        if entry.banned_at.is_some() {
            return None;
        }
        entry.failures = entry.failures.saturating_add(1);
        entry.last_failure = now;
        if entry.failures < config.lockout_failures {
            return None;
        }
        entry.banned_at = Some(now);
        entry.expires_at = unix_now().saturating_add(config.lockout_secs);
        let ban = ManagementBan {
            client_ip: ip,
            expires_at: entry.expires_at,
        };
        self.save(&attempts);
        drop(attempts);
        Some(ban)
    }

    /// Successful authentication clears failures, never an active ban.
    pub fn success(&self, ip: IpAddr) {
        let mut attempts = self
            .attempts
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let ip = normalize_ip(ip);
        if attempts
            .get(&ip)
            .is_some_and(|entry| entry.banned_at.is_none())
        {
            attempts.remove(&ip);
        }
    }

    /// Snapshot currently active bans from the authoritative in-memory state.
    pub fn active_bans(&self) -> Vec<ManagementBan> {
        let mut attempts = self
            .attempts
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let now = Instant::now();
        let window = Duration::from_secs(self.config().lockout_secs);
        attempts.retain(|_, entry| !entry.expired(now, window));
        let bans = Self::bans(&attempts);
        drop(attempts);
        bans
    }

    fn bans(attempts: &BTreeMap<IpAddr, Attempt>) -> Vec<ManagementBan> {
        attempts
            .iter()
            .filter(|(_, entry)| entry.banned_at.is_some())
            .map(|(&client_ip, entry)| ManagementBan {
                client_ip,
                expires_at: entry.expires_at,
            })
            .collect()
    }

    fn save(&self, attempts: &BTreeMap<IpAddr, Attempt>) {
        let Some(snapshot) = &self.snapshot else {
            return;
        };
        let bans = Self::bans(attempts);
        let result = if bans.is_empty() {
            std::fs::remove_file(snapshot).or_else(|error| {
                if error.kind() == std::io::ErrorKind::NotFound {
                    Ok(())
                } else {
                    Err(error)
                }
            })
        } else {
            crate::lino_json::encode(&bans)
                .map_err(std::io::Error::other)
                .and_then(|text| {
                    crate::durable_file::atomic_write_owner_only(snapshot, text.as_bytes())
                })
        };
        if let Err(error) = result {
            tracing::warn!("could not write management ban diagnostics: {error}");
        }
    }
}

/// Normalize IPv4-mapped IPv6 so one client cannot gain a second identity.
#[must_use]
pub fn normalize_ip(ip: IpAddr) -> IpAddr {
    match ip {
        IpAddr::V6(ip) => ip.to_ipv4_mapped().map_or(IpAddr::V6(ip), IpAddr::V4),
        ip @ IpAddr::V4(_) => ip,
    }
}

fn unix_now() -> u64 {
    u64::try_from(crate::operation_context::now().timestamp()).unwrap_or(0)
}

/// Report unexpired diagnostic snapshots in every selected deployment root.
#[must_use]
pub fn doctor_report(data_dirs: &[PathBuf]) -> String {
    use std::fmt::Write as _;
    let mut report = String::new();
    for dir in data_dirs {
        let bans: Vec<ManagementBan> = std::fs::read_to_string(dir.join(SNAPSHOT))
            .ok()
            .and_then(|text| crate::lino_json::decode(&text).ok())
            .unwrap_or_default();
        for ban in bans.into_iter().filter(|ban| ban.expires_at > unix_now()) {
            let _ = writeln!(
                report,
                "management_ban         : ip={} retry_after={}s data_dir={}",
                ban.client_ip,
                ban.expires_at.saturating_sub(unix_now()),
                dir.display()
            );
        }
    }
    report
}

#[cfg(test)]
#[path = "management_access_tests.rs"]
mod tests;
