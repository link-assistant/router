//! `auth status`: what each credential is, and which store is real.
//!
//! Split from `auth_cli.rs` to keep that file within the repository's 1000-line
//! limit. The table is two questions an operator asks together: is this
//! credential accepted by the vendor, and is this deployment following the
//! vendor client's own store or holding a copy that will drift (issue #574).

use std::process::ExitCode;

use link_assistant_router::config::Config;
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};

use super::stored_api_key_providers;

/// Report each provider credential's state, verified against the vendor.
///
/// The verdict used to come entirely from the stored `exp` claim, so a
/// credential the vendor had already invalidated printed `usable` while every
/// request through it returned `401` (issue #205). A local timestamp cannot
/// answer this question: only the vendor can. Each credential is therefore
/// probed, and the answer says plainly whether it was checked or merely read.
pub(super) async fn status(config: &Config) -> ExitCode {
    let user_home = config.client_home.to_string_lossy().into_owned();
    let client = reqwest::Client::new();
    let readers: Vec<_> = SubscriptionProvider::ALL
        .into_iter()
        .map(|provider| {
            SubscriptionReader::new(
                provider,
                crate::auth_import::provider_home(config, provider, &user_home),
            )
        })
        .collect();
    let token_cache =
        link_assistant_router::refresh::TokenCache::registered_for(&readers, &config.data_dir);
    let reports =
        link_assistant_router::credential_status::evaluate(&client, &token_cache, &readers, None)
            .await;
    let refresh_failed = reports.iter().any(|report| {
        report.state
            == link_assistant_router::credential_status::CredentialAcceptanceState::RefreshFailed
    });
    // Which store is real. Two holders of one rotating chain is the failure in
    // issue #574, and an operator could not previously tell "following, current"
    // from "a copy taken at time T" — nor see that a followed home had been
    // removed, which is the state that looks healthy and is not.
    let sources = link_assistant_router::credential_source::report(&readers);
    for report in reports {
        if let Some(detail) = report.detail.as_deref() {
            eprintln!(
                "error: {} refresh failed: {detail}; credential state was not reported usable",
                report.provider
            );
        }
        let source = sources
            .iter()
            .find(|entry| entry.provider == report.provider)
            .map(|entry| &entry.source);
        println!(
            "{:<8} {:<14} {:<12} {}",
            report.provider,
            report.state.as_str(),
            source.map_or("copy", |source| source.as_str()),
            report.home
        );
        // A followed source that has gone missing is not a detail: the
        // deployment has no usable credential, however healthy the rest of the
        // row looks. Named on stderr so it survives a piped table.
        if let Some(
            source @ link_assistant_router::credential_source::CredentialSource::Followed {
                present: false,
                ..
            },
        ) = source
        {
            eprintln!("warning: {} {}", report.provider, source.explain());
        }
    }
    // The API-key providers authorize this deployment against an upstream
    // vendor exactly as the subscriptions above do. Reporting only the
    // OAuth-style set printed an all-absent table on a deployment that could
    // still reach two vendors, which is the surprise issue #561 is about.
    for record in stored_api_key_providers(config) {
        let held = if record.has_encrypted_api_key {
            "stored"
        } else {
            "from-env"
        };
        let state = if record.enabled { held } else { "disabled" };
        // An API key is a value, not a rotating chain, so no follow state
        // applies; the column is filled in rather than left ragged.
        println!(
            "{:<8} {state:<14} {:<12} {}",
            record.name, "api-key", record.base_url
        );
    }
    if refresh_failed {
        ExitCode::from(1)
    } else {
        ExitCode::SUCCESS
    }
}
