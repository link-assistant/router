//! The `doctor` report: what this deployment is and whether it can work.
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit.

use link_assistant_router::config::{Config, StoragePolicy};
use link_assistant_router::subscription::SubscriptionReader;
use std::process::ExitCode;

pub async fn run_doctor(config: &Config) -> ExitCode {
    println!("Link.Assistant.Router v{}", link_assistant_router::VERSION);
    println!("listen_addr            : {}", config.listen_addr);
    println!("upstream_base_url      : {}", config.upstream_base_url);
    println!("upstream_provider      : {:?}", config.upstream_provider);
    println!(
        "openai_provider        : {} ({})",
        config.openai_compatible.provider_name, config.openai_compatible.base_url
    );
    println!(
        "crater_inbox           : {}",
        config.crater.inbox.as_deref().unwrap_or("<unset>")
    );
    println!("crater_actor           : {}", config.crater.actor);
    println!("claude_code_home       : {}", config.claude_code_home);
    println!("routing_mode           : {:?}", config.routing_mode);
    println!("storage_policy         : {:?}", config.storage_policy);
    println!("data_dir               : {}", config.data_dir.display());
    println!("enable_openai_api      : {}", config.enable_openai_api);
    println!("enable_anthropic_api   : {}", config.enable_anthropic_api);
    println!("enable_metrics         : {}", config.enable_metrics);
    println!(
        "additional_account_dirs: {} configured",
        config.additional_account_dirs.len()
    );
    println!(
        "account_routing_strategy: {:?}",
        config.account_routing_strategy
    );
    println!("account_cooldown_secs   : {}", config.account_cooldown_secs);
    println!(
        "account_request_limits  : {:?}",
        config.account_request_limits
    );
    println!(
        "session_affinity_ttl   : {}",
        config.session_affinity_ttl_secs
    );
    println!(
        "admin_key              : {}",
        if config.admin_key.is_some() {
            "set"
        } else {
            "<unset>"
        }
    );
    println!(
        "admin_ui               : {}",
        if config.admin_ui.enabled {
            format!("enabled on {}", config.admin_ui.listen_addr)
        } else {
            "disabled".to_string()
        }
    );
    {
        let claim = link_assistant_router::admin::AdminClaim::load(
            config.admin_key.clone(),
            &config.data_dir,
            config.admin_ui.candidate_ttl,
        );
        let status = claim.status();
        println!(
            "admin_credential       : {}",
            match status.credential_kind {
                link_assistant_router::admin::CredentialKind::Environment =>
                    "provisioned by environment".to_string(),
                link_assistant_router::admin::CredentialKind::Jwt => format!(
                    "claimed admin JWT {} (first-visitor bootstrap closed)",
                    status.token_id.as_deref().unwrap_or("<unknown>")
                ),
                link_assistant_router::admin::CredentialKind::LegacyOpaque =>
                    "claimed (first-visitor bootstrap closed)".to_string(),
                link_assistant_router::admin::CredentialKind::None =>
                    "UNCLAIMED (bootstrap open)".to_string(),
            }
        );
        if status.credential_kind == link_assistant_router::admin::CredentialKind::LegacyOpaque {
            println!(
                "admin_credential_warning: WARNING legacy opaque `la_admin_` credential; \
                 it carries no expiry, scope or revocation. Rotate it into an admin JWT \
                 with POST /api/admin/rotate (or /rotate in the chat admin bot)."
            );
        }
    }
    println!(
        "admin_endpoints        : {}",
        if config.allow_anonymous_admin {
            "OPEN (--allow-anonymous-admin)"
        } else {
            "closed (admin key or admin-scoped token required)"
        }
    );
    println!(
        "telegram_admin_bot     : {}",
        if config.chat_admin.telegram_enabled() {
            "enabled (private chats only)"
        } else {
            "disabled"
        }
    );
    println!(
        "vk_admin_bot           : {}",
        if config.chat_admin.vk_enabled() {
            "enabled (private chats only)"
        } else {
            "disabled"
        }
    );
    println!(
        "login_api              : {}",
        if config.login.enabled {
            "enabled (POST /api/login)"
        } else {
            "disabled"
        }
    );
    println!(
        "login_cli              : {} {}",
        config.login.command,
        config.login.args.join(" ")
    );
    // Whether each auth mode can run here, before any login is attempted.
    for line in link_assistant_router::doctor::login_mode_report(&config.login) {
        println!("{line}");
    }
    // What this deployment discloses upstream, so the property can be checked
    // without reading the source or the request store (issue #332).
    for line in link_assistant_router::doctor::forwarded_header_report() {
        println!("{line}");
    }
    println!(
        "mpp_openai_charge      : {}",
        if config.mpp.is_configured() {
            "enabled"
        } else {
            "disabled"
        }
    );

    // Probe the active pool with its vendor-specific credential layout.
    let (active_provider, primary_home) = config.subscription_pool();
    let primary = SubscriptionReader::new(active_provider, &primary_home);
    match primary.discover_credential_path() {
        Some(path) => {
            let status = primary.read_token().map_or("found, NO TOKEN", |token| {
                if token.is_expired(chrono::Utc::now().timestamp_millis()) {
                    "found, token EXPIRED on disk"
                } else {
                    "found, token OK"
                }
            });
            println!("primary credentials    : {} ({})", path.display(), status);
        }
        None => println!(
            "primary credentials    : {} (MISSING)",
            primary_home.display()
        ),
    }
    for (i, dir) in config.additional_account_dirs.iter().enumerate() {
        let reader = SubscriptionReader::new(active_provider, dir);
        match reader.discover_credential_path() {
            Some(path) => println!(
                "extra account {}        : {} (found)",
                i + 1,
                path.display()
            ),
            None => println!(
                "extra account {}        : {} (MISSING)",
                i + 1,
                dir.display()
            ),
        }
    }

    let user_home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let catalog_error = link_assistant_router::doctor::subscription_catalog_diagnostics_in(
        active_provider,
        &config.claude_code_home,
        &user_home,
        &config.data_dir,
    )
    .await;

    // Probe data dir.
    if config.data_dir.exists() {
        println!("data_dir                : present");
    } else {
        println!("data_dir                : will be created on first write");
    }

    if matches!(
        config.storage_policy,
        StoragePolicy::Text | StoragePolicy::Both
    ) {
        let p = config.data_dir.join("tokens.lino");
        println!(
            "lino store              : {} ({})",
            p.display(),
            if p.exists() { "present" } else { "<empty>" }
        );
    }
    if matches!(
        config.storage_policy,
        StoragePolicy::Binary | StoragePolicy::Both
    ) {
        let p = config.data_dir.join("tokens.bin");
        println!(
            "binary store            : {} ({})",
            p.display(),
            if p.exists() { "present" } else { "<empty>" }
        );
    }
    let p = config.data_dir.join("providers.lenv");
    println!(
        "provider store         : {} ({})",
        p.display(),
        if p.exists() { "present" } else { "<empty>" }
    );

    if catalog_error {
        ExitCode::from(1)
    } else {
        ExitCode::SUCCESS
    }
}
