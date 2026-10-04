//! Server-side request forgery guard for configurable provider base URLs.
//!
//! An API-key provider's base URL is chosen by whoever administers the
//! deployment, and the router then sends credential-bearing requests to it. A
//! base URL pointing at a loopback service, a private network, or a cloud
//! metadata endpoint (`169.254.169.254`) would turn the router into a proxy
//! into its own host network (issue #669).
//!
//! The guard runs at two points:
//!
//! - **Configuration and request time** — [`NetworkPolicy::check_base_url`]
//!   refuses a base URL whose host is a literal address (or a name such as
//!   `localhost`) in a refused range. Literal addresses never reach a DNS
//!   resolver, so they are checked here.
//! - **Dial time** — [`GuardedResolver`] resolves host names for the provider
//!   client and drops every refused address *at connect time*, so a name that
//!   answered with a public address when it was configured and with a private
//!   one later (DNS rebinding) still cannot reach the private one.
//!
//! Local setups that point a provider at a loopback service opt in with
//! `UPSTREAM_ALLOW_PRIVATE_NETWORKS` (see [`NetworkPolicy::parse`]).

use std::fmt;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};

/// Environment variable naming the address classes a provider may use.
pub const ALLOW_PRIVATE_NETWORKS_ENV: &str = "UPSTREAM_ALLOW_PRIVATE_NETWORKS";

/// The class of a refused address.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AddressClass {
    /// `127.0.0.0/8`, `::1`.
    Loopback,
    /// RFC 1918, RFC 6598 shared address space, and IPv6 unique-local.
    Private,
    /// `169.254.0.0/16` (including the metadata endpoint) and `fe80::/10`.
    LinkLocal,
    /// Unspecified, broadcast, multicast and other non-unicast addresses.
    NonUnicast,
}

impl AddressClass {
    /// Stable lowercase name used in errors and in the allow option.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Loopback => "loopback",
            Self::Private => "private",
            Self::LinkLocal => "link-local",
            Self::NonUnicast => "non-unicast",
        }
    }
}

/// Classify an address, or `None` for an ordinary public unicast address.
#[must_use]
pub fn classify(ip: IpAddr) -> Option<AddressClass> {
    match ip {
        IpAddr::V4(v4) => classify_v4(v4),
        IpAddr::V6(v6) => v6
            .to_ipv4_mapped()
            .map_or_else(|| classify_v6(v6), classify_v4),
    }
}

fn classify_v4(ip: Ipv4Addr) -> Option<AddressClass> {
    let [a, b, ..] = ip.octets();
    if ip.is_loopback() {
        Some(AddressClass::Loopback)
    } else if ip.is_link_local() {
        Some(AddressClass::LinkLocal)
    } else if ip.is_private() || (a == 100 && (64..128).contains(&b)) {
        Some(AddressClass::Private)
    } else if ip.is_unspecified() || ip.is_broadcast() || ip.is_multicast() || a == 0 {
        Some(AddressClass::NonUnicast)
    } else {
        None
    }
}

const fn classify_v6(ip: Ipv6Addr) -> Option<AddressClass> {
    let first = ip.segments()[0];
    if ip.is_loopback() {
        Some(AddressClass::Loopback)
    } else if first & 0xffc0 == 0xfe80 {
        Some(AddressClass::LinkLocal)
    } else if first & 0xfe00 == 0xfc00 {
        // Unique-local, which also holds AWS's IPv6 metadata `fd00:ec2::254`.
        Some(AddressClass::Private)
    } else if ip.is_unspecified() || ip.is_multicast() {
        Some(AddressClass::NonUnicast)
    } else {
        None
    }
}

/// A policy installed by the embedding process, taking precedence over
/// [`ALLOW_PRIVATE_NETWORKS_ENV`].
static PROCESS_POLICY: std::sync::OnceLock<NetworkPolicy> = std::sync::OnceLock::new();

/// Install the process-wide policy without touching the environment.
///
/// Embedders and integration tests that run Router in-process use this
/// instead of `std::env::set_var`. Only the first installation takes effect,
/// and it must happen before the first provider request; the result is the
/// policy now in force.
pub fn install_process_policy(policy: NetworkPolicy) -> NetworkPolicy {
    *PROCESS_POLICY.get_or_init(|| policy)
}

/// Which refused address classes a provider base URL may still use.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
#[allow(clippy::struct_excessive_bools)]
pub struct NetworkPolicy {
    /// Allow loopback addresses and `localhost` names.
    pub loopback: bool,
    /// Allow private and unique-local addresses.
    pub private: bool,
    /// Allow link-local addresses, including metadata endpoints.
    pub link_local: bool,
    /// Allow every address (the guard is off).
    pub all: bool,
}

impl NetworkPolicy {
    /// A policy that allows every address.
    #[must_use]
    pub const fn allow_all() -> Self {
        Self {
            loopback: true,
            private: true,
            link_local: true,
            all: true,
        }
    }

    /// Parse a comma-separated list such as `loopback,private`.
    ///
    /// Accepted words are `loopback`, `private`, `link-local` and `all`
    /// (`1`/`true` also mean `all`). Unknown words are ignored rather than
    /// widening the policy; an unset or empty value refuses every class.
    #[must_use]
    pub fn parse(value: Option<&str>) -> Self {
        let mut policy = Self::default();
        for word in value.unwrap_or_default().split(',') {
            match word.trim().to_ascii_lowercase().as_str() {
                "loopback" | "localhost" => policy.loopback = true,
                "private" => policy.private = true,
                "link-local" | "link_local" => policy.link_local = true,
                "all" | "1" | "true" | "yes" => policy = Self::allow_all(),
                _ => {}
            }
        }
        policy
    }

    /// The policy configured in the process environment.
    ///
    /// Unit tests inside this crate drive providers against loopback mocks
    /// and construct a stricter policy explicitly where the guard itself is
    /// under test.
    #[must_use]
    pub fn from_env() -> Self {
        if cfg!(test) {
            return Self::allow_all();
        }
        if let Some(policy) = PROCESS_POLICY.get() {
            return *policy;
        }
        Self::parse(std::env::var(ALLOW_PRIVATE_NETWORKS_ENV).ok().as_deref())
    }

    /// Whether `class` is allowed by this policy.
    #[must_use]
    pub const fn allows(self, class: AddressClass) -> bool {
        if self.all {
            return true;
        }
        match class {
            AddressClass::Loopback => self.loopback,
            AddressClass::Private => self.private,
            AddressClass::LinkLocal => self.link_local,
            AddressClass::NonUnicast => false,
        }
    }

    /// Check one resolved or literal address.
    ///
    /// # Errors
    /// Returns the refused class when the policy does not allow it.
    pub fn check_ip(self, ip: IpAddr) -> Result<(), BlockedAddress> {
        match classify(ip) {
            Some(class) if !self.allows(class) => Err(BlockedAddress {
                host: ip.to_string(),
                class,
            }),
            _ => Ok(()),
        }
    }

    /// Check a provider base URL without resolving it.
    ///
    /// Refuses a literal address in a refused range, and the names that are
    /// loopback by definition (`localhost`, `*.localhost`) or that only ever
    /// name a metadata service.
    ///
    /// # Errors
    /// Returns the refused host and class, or an unparsable URL.
    pub fn check_base_url(self, base_url: &str) -> Result<(), BlockedAddress> {
        let url = url::Url::parse(base_url).map_err(|_| BlockedAddress {
            host: base_url.to_string(),
            class: AddressClass::NonUnicast,
        })?;
        let blocked = |class| BlockedAddress {
            host: url.host_str().unwrap_or_default().to_string(),
            class,
        };
        match url.host() {
            Some(url::Host::Ipv4(ip)) => self.check_ip(IpAddr::V4(ip)),
            Some(url::Host::Ipv6(ip)) => self.check_ip(IpAddr::V6(ip)),
            Some(url::Host::Domain(name)) => {
                let name = name.trim_end_matches('.').to_ascii_lowercase();
                if (name == "localhost" || name.ends_with(".localhost"))
                    && !self.allows(AddressClass::Loopback)
                {
                    Err(blocked(AddressClass::Loopback))
                } else if METADATA_NAMES.contains(&name.as_str())
                    && !self.allows(AddressClass::LinkLocal)
                {
                    Err(blocked(AddressClass::LinkLocal))
                } else {
                    Ok(())
                }
            }
            None => Err(blocked(AddressClass::NonUnicast)),
        }
    }

    /// Keep only the addresses this policy allows.
    ///
    /// # Errors
    /// When every address was refused, names the first refused one.
    pub fn filter(
        self,
        host: &str,
        addrs: Vec<SocketAddr>,
    ) -> Result<Vec<SocketAddr>, BlockedAddress> {
        let mut first_refused = None;
        let allowed: Vec<SocketAddr> = addrs
            .into_iter()
            .filter(|addr| match self.check_ip(addr.ip()) {
                Ok(()) => true,
                Err(error) => {
                    first_refused.get_or_insert(error.class);
                    false
                }
            })
            .collect();
        match (allowed.is_empty(), first_refused) {
            (true, Some(class)) => Err(BlockedAddress {
                host: host.to_string(),
                class,
            }),
            _ => Ok(allowed),
        }
    }
}

/// Host names that only ever name a cloud metadata service.
const METADATA_NAMES: &[&str] = &["metadata.google.internal", "metadata", "instance-data"];

/// A base URL or address refused by the [`NetworkPolicy`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlockedAddress {
    /// The refused host or address.
    pub host: String,
    /// Why it was refused.
    pub class: AddressClass,
}

impl fmt::Display for BlockedAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.class == AddressClass::NonUnicast {
            return write!(
                f,
                "provider base URL host {} is not a unicast address and is refused",
                self.host
            );
        }
        write!(
            f,
            "provider base URL host {} is a {} address; set {}={} to allow it",
            self.host,
            self.class.as_str(),
            ALLOW_PRIVATE_NETWORKS_ENV,
            self.class.as_str()
        )
    }
}

impl std::error::Error for BlockedAddress {}

/// DNS resolver that refuses addresses outside the [`NetworkPolicy`] at
/// connect time, which is what defeats DNS rebinding.
#[derive(Debug, Clone, Copy)]
pub struct GuardedResolver {
    policy: NetworkPolicy,
}

impl GuardedResolver {
    #[must_use]
    pub const fn new(policy: NetworkPolicy) -> Self {
        Self { policy }
    }
}

impl reqwest::dns::Resolve for GuardedResolver {
    fn resolve(&self, name: reqwest::dns::Name) -> reqwest::dns::Resolving {
        let policy = self.policy;
        let host = name.as_str().to_string();
        Box::pin(async move {
            let addrs: Vec<SocketAddr> =
                tokio::net::lookup_host((host.as_str(), 0)).await?.collect();
            let allowed = policy.filter(&host, addrs)?;
            let addrs: reqwest::dns::Addrs = Box::new(allowed.into_iter());
            Ok(addrs)
        })
    }
}

#[cfg(test)]
#[path = "upstream_guard_tests.rs"]
mod tests;
