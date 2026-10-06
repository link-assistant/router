//! Per-instance names for local deployment objects (issue #679).
//!
//! Two deployments on one host used to share the relay container name, the
//! Docker network and the backend prefix, so the second `router deploy`
//! refused (or, with a different root, could not even name) its own relay.
//! An instance name suffixes every such object. Without one the names are the
//! historical ones, so an existing deployment is found exactly as before.
//!
//! Library operations select an instance within their operation context. Native
//! CLI commands keep the historical once-per-process selection.

use std::fmt;
use std::ops::Deref;
use std::sync::OnceLock;

static INSTANCE: OnceLock<String> = OnceLock::new();

/// Longest accepted instance name; Docker names and DNS labels stay short.
pub const MAX_INSTANCE_LEN: usize = 32;

/// Validate an instance name: lowercase letters, digits and inner hyphens.
///
/// # Errors
///
/// Returns an operator-readable reason when the name cannot be part of a
/// container name, network name, DNS label and directory name at once.
pub fn validate(name: &str) -> Result<(), String> {
    let valid = !name.is_empty()
        && name.len() <= MAX_INSTANCE_LEN
        && !name.starts_with('-')
        && !name.ends_with('-')
        && name
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-');
    if valid {
        Ok(())
    } else {
        Err(format!(
            "instance name `{name}` must be 1-{MAX_INSTANCE_LEN} lowercase letters, digits or inner hyphens"
        ))
    }
}

/// Select this process's instance. Must run before any name is read.
///
/// # Errors
///
/// Refuses an invalid name, or a second, different selection.
pub fn select(name: &str) -> Result<(), String> {
    validate(name)?;
    if let Some(context) = crate::operation_context::current() {
        *context
            .deployment_instance
            .lock()
            .expect("deployment instance lock") = Some(name.into());
        return Ok(());
    }
    let selected = INSTANCE.get_or_init(|| name.to_string());
    if selected == name {
        Ok(())
    } else {
        Err(format!(
            "deployment instance is already `{selected}`; one command manages one instance"
        ))
    }
}

/// The selected instance, if any.
#[must_use]
pub fn selected() -> Option<&'static str> {
    INSTANCE.get().map(String::as_str)
}

/// Owned selection from the current operation, or the native CLI selection.
#[must_use]
pub fn selected_name() -> Option<String> {
    crate::operation_context::current().map_or_else(
        || selected().map(str::to_owned),
        |context| {
            context
                .deployment_instance
                .lock()
                .expect("deployment instance lock")
                .clone()
        },
    )
}

/// The historical name with the instance suffix, when one is selected.
#[must_use]
pub fn qualify(base: &str) -> String {
    selected_name().map_or_else(|| base.to_string(), |instance| format!("{base}-{instance}"))
}

/// A deployment object name that carries the selected instance.
pub struct InstanceName {
    base: &'static str,
    /// Appended after the instance, so a prefix stays a prefix.
    trailer: &'static str,
    resolved: OnceLock<String>,
}

impl InstanceName {
    /// A name used as-is (`router-deploy-relay` -> `router-deploy-relay-a`).
    #[must_use]
    pub const fn new(base: &'static str) -> Self {
        Self {
            base,
            trailer: "",
            resolved: OnceLock::new(),
        }
    }

    /// A prefix that keeps its trailing separator
    /// (`router-deploy-backend-` -> `router-deploy-backend-a-`).
    #[must_use]
    pub const fn prefix(base: &'static str) -> Self {
        Self {
            base,
            trailer: "-",
            resolved: OnceLock::new(),
        }
    }

    /// Name resolved within the active operation; never cached process-wide.
    #[must_use]
    pub fn value(&self) -> String {
        format!("{}{}", qualify(self.base), self.trailer)
    }

    /// The resolved name for native CLI callers.
    #[must_use]
    pub fn as_str(&self) -> &str {
        self.resolved
            .get_or_init(|| format!("{}{}", qualify(self.base), self.trailer))
    }
}

impl Deref for InstanceName {
    type Target = str;

    fn deref(&self) -> &str {
        self.as_str()
    }
}

impl AsRef<str> for InstanceName {
    fn as_ref(&self) -> &str {
        self.as_str()
    }
}

impl fmt::Display for InstanceName {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.value())
    }
}

impl fmt::Debug for InstanceName {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::Debug::fmt(&self.value(), formatter)
    }
}

impl PartialEq<str> for InstanceName {
    fn eq(&self, other: &str) -> bool {
        self.as_str() == other
    }
}

impl PartialEq<&str> for InstanceName {
    fn eq(&self, other: &&str) -> bool {
        self.as_str() == *other
    }
}

impl PartialEq<String> for InstanceName {
    fn eq(&self, other: &String) -> bool {
        self.as_str() == other
    }
}

impl PartialEq<InstanceName> for String {
    fn eq(&self, other: &InstanceName) -> bool {
        self == other.as_str()
    }
}

impl PartialEq<InstanceName> for &str {
    fn eq(&self, other: &InstanceName) -> bool {
        *self == other.as_str()
    }
}
