//! Merge `--config` with command-line flags, then read secret values.
//!
//! Merging and reading are separate steps: `--status` and `--down` need the
//! instance, root and SSH settings but must not fail because a runtime
//! variable a deploy would pass is unset on the operator's machine.

use std::path::{Path, PathBuf};

use super::{
    DeployConfig, DeploySection, EnvSpec, ProviderKeyMode, ProviderKeySpec, ResolvedDeploy,
    ResolvedProviderKey, SshSettings, TokenPolicy, VerificationProfile, load_verification_profile,
    validate_known_hosts,
};
use crate::cli::DeploySettingsArgs;

/// The file and the flags merged; secret values not read yet.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Merged {
    /// `[deploy]` with the target's `[local]`/`[remote]` overlay.
    pub section: DeploySection,
    /// Selected instance.
    pub instance: Option<String>,
    /// Runtime environment sources, unique by name.
    pub env: Vec<EnvSpec>,
    /// SSH transport.
    pub ssh: SshSettings,
    /// Issued-token limits.
    pub tokens: TokenPolicy,
    /// Provider key sources, unique by name.
    pub provider_keys: Vec<ProviderKeySpec>,
    /// Default mode for keys without their own.
    pub provider_key_mode: ProviderKeyMode,
    /// Verification profile.
    pub verification: Option<VerificationProfile>,
    /// Logins to hand over to a remote deployment (issue #681).
    pub seed_credentials: Vec<crate::deploy_seed::SeedProvider>,
}

fn upsert<T>(items: &mut Vec<T>, item: T, name: impl Fn(&T) -> &str) {
    let key = name(&item).to_string();
    if let Some(existing) = items.iter_mut().find(|existing| name(existing) == key) {
        *existing = item;
    } else {
        items.push(item);
    }
}

/// Merge the config file named by `--config` (if any) with the flags.
///
/// # Errors
///
/// Reports an unreadable or invalid file, or an invalid flag value.
pub fn merge(args: &DeploySettingsArgs, remote: bool) -> Result<Merged, String> {
    let file = args
        .config
        .as_deref()
        .map(DeployConfig::load)
        .transpose()?
        .unwrap_or_default();
    let section = file.section_for(remote);
    let cwd = std::env::current_dir().ok();
    let base: Option<&Path> = cwd.as_deref();

    let instance = args.instance.clone().or_else(|| section.instance.clone());
    if let Some(instance) = &instance {
        crate::deploy::instance::validate(instance)?;
    }

    let mut env = file.env;
    for flag in &args.env {
        upsert(&mut env, EnvSpec::parse(flag, base)?, |spec| &spec.name);
    }
    env.sort_by(|left, right| left.name.cmp(&right.name));

    let mut ssh = file.ssh;
    let pin = |value: &Option<PathBuf>, slot: &mut Option<PathBuf>| {
        if value.is_some() {
            slot.clone_from(value);
        }
    };
    if args.ssh_port.is_some() {
        ssh.port = args.ssh_port;
    }
    pin(&args.ssh_identity, &mut ssh.identity_file);
    if args.ssh_known_hosts.is_some() {
        // A pin given on the command line replaces the file's pins outright:
        // merging two trust sets would trust keys neither source chose alone.
        ssh.known_hosts.clear();
        pin(&args.ssh_known_hosts, &mut ssh.known_hosts_file);
    }
    if args.ssh_keepalive.is_some() {
        ssh.keepalive_secs = args.ssh_keepalive;
    }
    if args.deadline.is_some() {
        ssh.deadline_secs = args.deadline;
    }
    if ssh.deadline_secs == Some(0) || ssh.keepalive_secs == Some(0) {
        return Err("SSH deadline and keepalive must be at least one second".to_string());
    }

    let mut tokens = file.tokens;
    if args.token_ttl_hours.is_some() {
        tokens.ttl_hours = args.token_ttl_hours;
    }
    if args.token_max_requests.is_some() {
        tokens.max_requests = args.token_max_requests;
    }
    if args.token_max_tokens.is_some() {
        tokens.max_tokens = args.token_max_tokens;
    }
    if args.token_rate_limit.is_some() {
        tokens.rate_limit_per_minute = args.token_rate_limit;
    }
    if !args.token_allowed_model.is_empty() {
        tokens.allowed_models.clone_from(&args.token_allowed_model);
    }
    if tokens.ttl_hours.is_some_and(|hours| hours <= 0) {
        return Err("the issued token's ttl_hours must be positive".to_string());
    }

    let mut provider_keys = file.provider_keys;
    for flag in &args.provider_key {
        let mut spec = ProviderKeySpec::parse(flag, base)?;
        // A flag replaces the key source but keeps the file's provider
        // template and per-key mode for the same provider.
        if let Some(existing) = provider_keys.iter().find(|key| key.name == spec.name) {
            spec.mode = existing.mode;
            spec.template.clone_from(&existing.template);
        }
        upsert(&mut provider_keys, spec, |spec| &spec.name);
    }

    let verification = match &args.verification_profile {
        Some(path) => Some(load_verification_profile(path)?),
        None => file.verification,
    };

    let seed_credentials =
        crate::deploy_seed::parse_providers(if args.seed_credential.is_empty() {
            &section.seed_credentials
        } else {
            &args.seed_credential
        })?;

    Ok(Merged {
        section,
        instance,
        env,
        ssh,
        tokens,
        provider_keys,
        provider_key_mode: args.provider_key_mode.unwrap_or_default(),
        verification,
        seed_credentials,
    })
}

impl Merged {
    /// Read every secret value. Errors name the source, never a value.
    ///
    /// # Errors
    ///
    /// Reports an unset variable, an unreadable file, or a value with a
    /// newline or NUL byte.
    pub fn read_values(&self) -> Result<ResolvedDeploy, String> {
        let env = self
            .env
            .iter()
            .map(|spec| {
                spec.source
                    .read()
                    .map(|value| (spec.name.clone(), value))
                    .map_err(|error| format!("--env {}: {error}", spec.name))
            })
            .collect::<Result<Vec<_>, _>>()?;
        let provider_keys = self
            .provider_keys
            .iter()
            .map(|spec| {
                let value = spec
                    .source
                    .read()
                    .map_err(|error| format!("--provider-key {}: {error}", spec.name))?;
                if value.trim().is_empty() {
                    return Err(format!("--provider-key {}: the key is empty", spec.name));
                }
                Ok(ResolvedProviderKey {
                    name: spec.name.clone(),
                    mode: spec.mode.unwrap_or(self.provider_key_mode),
                    value,
                    template: spec.template.clone(),
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        Ok(ResolvedDeploy {
            instance: self.instance.clone(),
            env,
            ssh: self.ssh.clone(),
            tokens: self.tokens.clone(),
            provider_keys,
            verification: self.verification.clone(),
        })
    }

    /// The pinned `known_hosts` text, if any pin is configured.
    ///
    /// # Errors
    ///
    /// Reports an unreadable pin file or malformed pinned lines.
    pub fn known_hosts(&self) -> Result<Option<String>, String> {
        let mut lines = self.ssh.known_hosts.clone();
        if let Some(path) = &self.ssh.known_hosts_file {
            let text = std::fs::read_to_string(path)
                .map_err(|error| format!("could not read {}: {error}", path.display()))?;
            lines.extend(
                text.lines()
                    .map(str::trim)
                    .filter(|line| !line.is_empty() && !line.starts_with('#'))
                    .map(str::to_string),
            );
            if lines.is_empty() {
                return Err(format!("{} pins no host key", path.display()));
            }
        }
        if lines.is_empty() {
            return Ok(None);
        }
        validate_known_hosts(&lines)?;
        Ok(Some(lines.join("\n") + "\n"))
    }
}
