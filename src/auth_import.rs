//! `router auth import` — adopt a login this machine already has.
//!
//! Split from `auth_cli.rs` to keep that file within the repository's
//! 1000-line limit.
//!
//! Authorizing and importing are different operations, not variations of one:
//! authorizing goes and gets a new credential interactively, importing adopts
//! one that already exists. They differ in prerequisites, side effects, and
//! whether a human has to be present — which decides whether a headless
//! deployment can be provisioned at all (issue #278).

use std::process::ExitCode;

use link_assistant_router::cli::{AuthOp, ImportProvider};
use link_assistant_router::subscription::{ImportSource, SubscriptionProvider, SubscriptionReader};

/// Adopt an existing vendor login, when this invocation asked to.
///
/// `None` means no import was requested and the ordinary path should run.
pub async fn run_import(
    config: &link_assistant_router::config::Config,
    op: &AuthOp,
) -> Option<ExitCode> {
    // Import writes this machine's credential home. When another router is the
    // target, doing that anyway produced an error naming the *local* home as
    // though it were the one asked about — a wrong-target action wearing an
    // answer that looks coherent (issue #291). Refuse before any local work.
    if let Some(exit) = refuse_a_remote_import(op).await {
        return Some(exit);
    }
    let requested: Vec<(ImportProvider, String)> = match op {
        AuthOp::Claude {
            from_claude_home: Some(source),
            ..
        } => vec![(ImportProvider::Claude, source.clone())],
        AuthOp::Codex {
            from_codex_home: Some(source),
            ..
        } => vec![(ImportProvider::Codex, source.clone())],
        AuthOp::Import { all: true, .. } => [
            ImportProvider::Claude,
            ImportProvider::Codex,
            ImportProvider::Gemini,
            ImportProvider::Qwen,
            ImportProvider::Gh,
        ]
        .into_iter()
        .map(|provider| (provider, String::new()))
        .collect(),
        AuthOp::Import {
            provider: Some(provider),
            dir,
            ..
        } => vec![(*provider, dir.clone().unwrap_or_default())],
        _ => return None,
    };
    // `--all` adopts what is there and reports what is not, rather than failing
    // on the first provider this machine never logged in to: a workstation with
    // two of five logins is the ordinary case, not an error.
    let adopting_everything = matches!(op, AuthOp::Import { all: true, .. });
    let mut failed = false;
    for (provider, source) in requested {
        let outcome = match provider {
            ImportProvider::Gh => import_github(config, &source),
            other => {
                let Some(subscription) = subscription_of(other) else {
                    continue;
                };
                import_provider(config, subscription, &source).await
            }
        };
        if let Err(error) = outcome {
            if adopting_everything {
                println!("{}: nothing to adopt ({error})", provider_label(provider));
                continue;
            }
            eprintln!("error: {error}");
            failed = true;
        }
    }
    Some(if failed {
        ExitCode::from(1)
    } else {
        ExitCode::SUCCESS
    })
}

/// Refuse an import aimed at a router other than this machine.
///
/// A credential can only be installed where the process running the import can
/// write, and a router reads its subscription credentials from its own home at
/// startup. Nothing accepts a credential document over HTTP — `/api/login`
/// begins an interactive OAuth flow and `submit_code` takes a short-lived
/// code, neither of which adopts a credential that already exists. So there is
/// no remote import to perform, and the honest move is to say so.
///
/// The alternative is what shipped: `--server` parsed and was discarded, and
/// the command answered about the local home. `error: claude is already read
/// from /Users/me/.claude` reads as a coherent reply to a question about the
/// selected server, which is worse than a plain refusal — the operator cannot
/// tell the target was never consulted (issue #291).
///
/// `--local` is the way to ask for this machine, and `--managed` is a local
/// disposable container, so both keep the ordinary path.
async fn refuse_a_remote_import(op: &AuthOp) -> Option<ExitCode> {
    // Decided from the flags alone, so `--local` never contacts a server and
    // never fails because one is unreachable. The per-provider
    // `--from-*-home` flags carry no target and stay local, as they always
    // were.
    if !op.may_be_remote() {
        return None;
    }
    let AuthOp::Import { target, .. } = op else {
        return None;
    };
    let server = match link_assistant_router::auth_remote::target_for(
        target.local,
        target.managed,
        target.server.as_deref(),
    )
    .await
    {
        Ok(Some(server)) => server,
        Ok(None) => return None,
        Err(error) => {
            // An unreachable *named* target is an error in its own right;
            // falling back to a local import is the surprise being fixed.
            eprintln!("error: {error}");
            return Some(ExitCode::from(1));
        }
    };
    // Name the directory the credential would have to land in, when the router
    // will say. "Not from here" alone leaves the operator to guess the next
    // step; the path is the instruction.
    let destination = match op {
        AuthOp::Import {
            provider: Some(provider),
            ..
        } => {
            link_assistant_router::auth_remote::credential_home(&server, provider_label(*provider))
                .await
        }
        _ => None,
    };
    for line in link_assistant_router::auth_remote::remote_import_refusal(
        &server.base_url,
        destination.as_deref(),
    ) {
        eprintln!("{line}");
    }
    Some(ExitCode::from(1))
}

/// The subscription an import target names, when it names one.
const fn subscription_of(provider: ImportProvider) -> Option<SubscriptionProvider> {
    match provider {
        ImportProvider::Claude => Some(SubscriptionProvider::Claude),
        ImportProvider::Codex => Some(SubscriptionProvider::Codex),
        ImportProvider::Gemini => Some(SubscriptionProvider::Gemini),
        ImportProvider::Qwen => Some(SubscriptionProvider::Qwen),
        ImportProvider::Gh => None,
    }
}

/// How an import target names itself in a report.
const fn provider_label(provider: ImportProvider) -> &'static str {
    match provider {
        ImportProvider::Claude => "claude",
        ImportProvider::Codex => "codex",
        ImportProvider::Gemini => "gemini",
        ImportProvider::Qwen => "qwen",
        ImportProvider::Gh => "github",
    }
}

/// Adopt the GitHub credential a `gh` login already holds.
///
/// Shares `run_gh`'s reader so the two spellings cannot drift, and reports in
/// the same column format the subscription imports use.
fn import_github(
    config: &link_assistant_router::config::Config,
    source: &str,
) -> Result<(), String> {
    use link_assistant_router::github_proxy;

    let directory = Some(source)
        .filter(|source| !source.trim().is_empty())
        .map(std::path::PathBuf::from)
        .or_else(github_proxy::gh_config_directory)
        .ok_or_else(|| {
            String::from("no gh configuration directory; name one, or set GH_CONFIG_DIR")
        })?;
    let token = github_proxy::token_from_gh_config(&directory).ok_or_else(|| {
        format!(
            "no GitHub credential in {}; run `gh auth login` there first",
            directory.display()
        )
    })?;
    let path = github_proxy::store_credential(std::path::Path::new(&config.data_dir), &token)?;
    println!(
        "github   imported {} from {}",
        path.display(),
        directory.display()
    );
    // The GitHub routes are decided at startup from whether a credential
    // exists, so adopting one mid-run does not mount them.
    println!("github   note: the GitHub routes are mounted at startup; restart to serve them");
    Ok(())
}

/// Copy a vendor credential into this deployment's home, and say what it is.
///
/// The document is copied rather than re-serialized from a parsed token: that
/// type does not model `id_token`, `auth_mode`, or `scope`, and Codex derives
/// its account id from `id_token` on every read, so a round-trip would drop the
/// field the next read depends on.
async fn import_provider(
    config: &link_assistant_router::config::Config,
    provider: SubscriptionProvider,
    source: &str,
) -> Result<(), String> {
    let user_home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    // An empty value asks for the vendor's own default location.
    //
    // Deliberately not `resolve_home`, which honours `CLAUDE_CODE_HOME` and
    // friends — in a deployment those name the router's *destination*, so
    // resolving the source that way makes every unqualified import refuse
    // itself as a self-import (issue #278). The vendor's conventional home is
    // the thing an operator means by "the login this machine already has".
    let source_home = if source.trim().is_empty() {
        std::path::PathBuf::from(&user_home).join(provider.home_subdir())
    } else {
        std::path::PathBuf::from(source)
    };
    let destination_home = provider_home(config, provider, &user_home);
    if source_home == destination_home {
        // A deployment that reads the vendor's own home already holds whatever
        // is there; there is nothing to copy, and copying a file onto itself
        // would truncate it.
        return Err(format!(
            "{provider} is already read from {}, so there is nothing to adopt",
            destination_home.display()
        ));
    }

    let from = SubscriptionReader::new(provider, &source_home);
    // One selection yields the bytes, their verdict, and their origin. Reading
    // the source a second time to describe it is what let the report and the
    // installed credential name different things (issue #280).
    let source_credential = from
        .read_document_for_import()
        .map_err(|error| format!("no {provider} credential to import: {error}"))?;
    let ImportSource {
        document,
        token,
        origin,
    } = &source_credential;
    let where_from = match origin {
        link_assistant_router::platform_keychain::Origin::Keychain => {
            link_assistant_router::platform_keychain::service_name(provider).map_or_else(
                || String::from("the platform keychain"),
                |service| format!("keychain {service:?}"),
            )
        }
        link_assistant_router::platform_keychain::Origin::File => {
            from.discover_credential_path().map_or_else(
                || source_home.display().to_string(),
                |path| path.display().to_string(),
            )
        }
    };

    // Probe before installing. The stored expiry is a hint; only the vendor
    // knows whether the credential still works, and an operator should learn
    // that here rather than from a 401 on the first served request.
    let verdict = probe_credential(provider, token).await;

    let installed =
        SubscriptionReader::new(provider, &destination_home).install_document(document)?;
    println!(
        "{provider:<8} imported {} from {where_from}",
        installed.display()
    );
    println!("{provider:<8} {}, {verdict}", describe_credential(token));
    // Adopting a credential does not mint one: both holders now rotate the same
    // chain, and revoking it at the vendor revokes it for both.
    println!(
        "{provider:<8} note: the source keeps working; the two now share one rotating \
         chain, and a revocation at the vendor ends both"
    );
    Ok(())
}

/// What an operator needs to know about a credential at import time.
pub fn describe_credential(
    token: &link_assistant_router::subscription::SubscriptionToken,
) -> String {
    let now = chrono::Utc::now().timestamp_millis();
    let expiry = token.expires_at_ms.map_or_else(
        || String::from("no recorded expiry"),
        |expires_at| {
            let minutes = (expires_at - now) / 60_000;
            if expires_at <= now {
                format!("EXPIRED {} ago", humanize_minutes(-minutes))
            } else {
                format!("expires in {}", humanize_minutes(minutes))
            }
        },
    );
    // Without a refresh token the credential cannot be rotated, so it stops
    // working at expiry and no recovery rung can save it. Worth saying plainly.
    let refresh = if token.refresh_token.is_some() {
        "refresh token present"
    } else {
        "NO refresh token, so it cannot be renewed"
    };
    format!("{expiry}, {refresh}")
}

/// Ask the vendor whether a credential still works.
///
/// The same three-valued verdict `auth status` uses: a network failure must not
/// be reported as a bad credential, because refusing an import on an
/// unreachable network would be worse than the problem it guards against. A
/// rejected credential is still installed — the operator asked for it, may know
/// something the probe does not, and the honest move is to say so rather than
/// to overrule them.
async fn probe_credential(
    provider: SubscriptionProvider,
    token: &link_assistant_router::subscription::SubscriptionToken,
) -> &'static str {
    let client = reqwest::Client::new();
    match link_assistant_router::model_catalog::fetch_provider_catalog(
        &client, provider, token, None,
    )
    .await
    {
        Ok(_) => "accepted by the vendor",
        Err(error) if link_assistant_router::model_catalog::is_credential_rejection(&error) => {
            "REJECTED by the vendor — importing it anyway, but it will not serve"
        }
        Err(_) => "not verified (the vendor could not be reached)",
    }
}

/// A duration an operator reads at a glance.
///
/// Truncating to whole hours reported a credential with 119 minutes left as
/// "1 hours", which understates it enough to matter when the question being
/// asked is whether to re-authenticate now.
pub fn humanize_minutes(minutes: i64) -> String {
    if minutes < 90 {
        return format!("{minutes} minutes");
    }
    let hours = minutes / 60;
    if hours < 48 {
        return format!("{hours} hours");
    }
    format!("{} days", hours / 24)
}

/// The credential home this deployment reads `provider` from.
pub fn provider_home(
    config: &link_assistant_router::config::Config,
    provider: SubscriptionProvider,
    user_home: &str,
) -> std::path::PathBuf {
    match provider {
        SubscriptionProvider::Claude => config.login.claude_code_home.clone(),
        SubscriptionProvider::Codex => config.login.codex_home.clone(),
        SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => {
            provider.resolve_home(user_home)
        }
    }
}
