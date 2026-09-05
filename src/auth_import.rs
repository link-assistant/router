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
use link_assistant_router::credential_acceptance::AcceptedCredential as ValidatedCandidate;
#[cfg(test)]
use link_assistant_router::credential_acceptance::catalog_base_for_candidate;
use link_assistant_router::subscription::{
    ImportSource, InstallDocumentResult, InstallMode, SubscriptionProvider, SubscriptionReader,
};

#[path = "auth_import_result.rs"]
mod import_result;
#[path = "auth_import_resume.rs"]
mod import_resume;

use import_result::{ImportExecution, ImportFailure, ImportOutcome, ImportPhase, finish};

/// Vendor evidence gathered before an import may touch its destination.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(dead_code)]
enum CredentialProbe {
    Accepted,
    Rejected,
    Unverified,
}

/// Destination and rejection policy selected by the public import flags.
#[derive(Debug, Clone, Copy, Default)]
struct ImportPolicy {
    if_absent: bool,
    /// Whether the caller explicitly asserted the safe-flow capability. This
    /// is diagnostic only and never bypasses candidate validation.
    capability_asserted: bool,
    /// Fresh imports copy an externally owned rotation chain. A resumed
    /// acceptance transaction contains a Router-owned successor and must keep
    /// that provenance when promoted.
    external_refresh_owner: bool,
}

/// Adopt an existing vendor login, when this invocation asked to.
///
/// `None` means no import was requested and the ordinary path should run.
pub async fn run_import(
    config: &link_assistant_router::config::Config,
    op: &AuthOp,
) -> Option<ExitCode> {
    let json = matches!(op, AuthOp::Import { json: true, .. });
    // Import writes this machine's credential home. When another router is the
    // target, doing that anyway produced an error naming the *local* home as
    // though it were the one asked about — a wrong-target action wearing an
    // answer that looks coherent (issue #291). Refuse before any local work.
    if let Some(failure) = refuse_a_remote_import(op).await {
        return Some(finish(&[ImportExecution::failed(None, failure)], json));
    }
    let policy = match op {
        AuthOp::Import {
            if_absent, force, ..
        } => ImportPolicy {
            if_absent: *if_absent,
            capability_asserted: *force,
            external_refresh_owner: true,
        },
        _ => ImportPolicy::default(),
    };
    let requested: Vec<(
        ImportProvider,
        String,
        Option<import_resume::ResumeCandidate>,
    )> = match op {
        AuthOp::Claude {
            from_claude_home: Some(source),
            ..
        } => vec![(ImportProvider::Claude, source.clone(), None)],
        AuthOp::Codex {
            from_codex_home: Some(source),
            ..
        } => vec![(ImportProvider::Codex, source.clone(), None)],
        AuthOp::Import {
            resume: Some(transaction_id),
            ..
        } => match import_resume::resolve_claimed(&config.data_dir, transaction_id).await {
            Ok(candidate) => vec![(
                candidate.provider,
                candidate.source.clone(),
                Some(candidate),
            )],
            Err(failure) => {
                return Some(finish(&[ImportExecution::failed(None, failure)], json));
            }
        },
        AuthOp::Import { all: true, .. } => [
            ImportProvider::Claude,
            ImportProvider::Codex,
            ImportProvider::Gemini,
            ImportProvider::Qwen,
            ImportProvider::Gh,
        ]
        .into_iter()
        .map(|provider| (provider, String::new(), None))
        .collect(),
        AuthOp::Import {
            provider: Some(provider),
            dir,
            ..
        } => vec![(*provider, dir.clone().unwrap_or_default(), None)],
        _ => return None,
    };
    // `--all` adopts what is there and reports what is not, rather than failing
    // on the first provider this machine never logged in to: a workstation with
    // two of five logins is the ordinary case, not an error.
    let adopting_everything = matches!(op, AuthOp::Import { all: true, .. });
    let mut executions = Vec::with_capacity(requested.len());
    for (provider, source, resumed) in requested {
        let outcome = match provider {
            ImportProvider::Gh if policy.if_absent => Err(ImportFailure::not_attempted(
                "--if-absent is supported only for Claude, Codex, Gemini, and Qwen; GitHub import keeps its existing replacement behavior",
            )),
            ImportProvider::Gh => import_github(&config.data_dir, &source)
                .map(|messages| ImportExecution::promoted("github", messages))
                .map_err(ImportFailure::not_attempted),
            other => {
                let Some(subscription) = subscription_of(other) else {
                    continue;
                };
                let mut provider_policy = policy;
                provider_policy.external_refresh_owner = resumed.is_none();
                if resumed.as_ref().is_some_and(|candidate| {
                    destination_has_receipt(config, subscription, &candidate.transaction_id)
                }) {
                    Ok(ImportExecution::promoted(
                        subscription.to_string(),
                        vec![format!(
                            "{subscription:<8} promotion was already committed; completing retained transaction cleanup"
                        )],
                    ))
                } else {
                    import_provider(
                        config,
                        subscription,
                        &source,
                        provider_policy,
                        resumed
                            .as_ref()
                            .map(|candidate| candidate.transaction_id.as_str()),
                    )
                    .await
                }
            }
        };
        let outcome = if let Some(candidate) = resumed.as_ref() {
            reconcile_resumed_import(candidate, outcome)
        } else {
            outcome
        };
        let execution = match outcome {
            Ok(execution) => execution,
            Err(failure) => {
                let absent = adopting_everything && failure.error.starts_with("no ");
                let message = absent.then(|| {
                    format!(
                        "{}: nothing to adopt ({})",
                        provider_label(provider),
                        failure.error
                    )
                });
                let execution = ImportExecution::failed(Some(provider_label(provider)), failure);
                if let Some(message) = message {
                    execution.ignore_failure(message)
                } else {
                    execution
                }
            }
        };
        executions.push(execution);
    }
    Some(finish(&executions, json))
}

/// A resume begins with an already uncertain transaction. Only promotion can
/// retire that uncertainty. A fresh uncertain retry replaces the predecessor
/// transaction; every other result keeps the original recovery ID authoritative.
fn reconcile_resumed_import(
    candidate: &import_resume::ResumeCandidate,
    outcome: Result<ImportExecution, ImportFailure>,
) -> Result<ImportExecution, ImportFailure> {
    match outcome {
        Ok(mut execution) if execution.is_promoted() => {
            if let Err(warning) = import_resume::retire(candidate) {
                execution.mark_cleanup_pending(
                    candidate.transaction_id.clone(),
                    format!("{warning}; retry this transaction ID to complete cleanup"),
                );
            }
            Ok(execution)
        }
        Ok(_) => Err(ImportFailure::retained(
            ImportPhase::Preflight,
            candidate.transaction_id.clone(),
            format!(
                "the destination is already present; retained import transaction {} still requires recovery",
                candidate.transaction_id
            ),
        )),
        Err(failure)
            if matches!(
                failure.outcome,
                ImportOutcome::ExchangeUncertain
                    | ImportOutcome::PersistenceUncertain
                    | ImportOutcome::SuccessorRetained
            ) =>
        {
            let _retired_predecessor = import_resume::retire(candidate);
            Err(failure)
        }
        Err(failure) => Err(ImportFailure::retained(
            failure.phase,
            candidate.transaction_id.clone(),
            format!(
                "{}; retained import transaction {} still requires recovery",
                failure.error, candidate.transaction_id
            ),
        )),
    }
}

/// Refuse an import aimed at a router other than this machine.
///
/// A credential can only be installed where the process running the import can
/// write, and a router reads its subscription credentials from its own home at
/// startup. Nothing accepts a credential document over HTTP — `/api/management/login`
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
async fn refuse_a_remote_import(op: &AuthOp) -> Option<ImportFailure> {
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
        target.management_server.as_deref(),
    )
    .await
    {
        Ok(Some(server)) => server,
        Ok(None) => return None,
        Err(error) => {
            // An unreachable *named* target is an error in its own right;
            // falling back to a local import is the surprise being fixed.
            return Some(ImportFailure::not_attempted(error));
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
    let error = link_assistant_router::auth_remote::remote_import_refusal(
        &server.base_url,
        destination.as_deref(),
    )
    .join("\n");
    Some(ImportFailure::not_attempted(error))
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
fn import_github(data_dir: &std::path::Path, source: &str) -> Result<Vec<String>, String> {
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
    let path = github_proxy::store_credential(data_dir, &token)?;
    let mut messages = vec![format!(
        "github   imported {} from {}",
        path.display(),
        directory.display()
    )];
    // The GitHub routes are decided at startup from whether a credential
    // exists, so adopting one mid-run does not mount them.
    messages.push(
        "github   note: the GitHub routes are mounted at startup; restart to serve them"
            .to_string(),
    );
    Ok(messages)
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
    policy: ImportPolicy,
    resumed_transaction_id: Option<&str>,
) -> Result<ImportExecution, ImportFailure> {
    let user_home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    // An empty value asks for the vendor's own default location.
    //
    // Deliberately not `resolve_home`, which honours `CLAUDE_CODE_HOME` and
    // friends — in a deployment those name the router's *destination*, so
    // resolving the source that way makes every unqualified import refuse
    // itself as a self-import (issue #278). The vendor's conventional home is
    // the thing an operator means by "the login this machine already has".
    let source_home = if source.trim().is_empty() {
        provider.conventional_home(&user_home)
    } else {
        std::path::PathBuf::from(source)
    };
    let destination_home = provider_home(config, provider, &user_home);
    if same_credential_home(&source_home, &destination_home) {
        // A deployment that reads the vendor's own home already holds whatever
        // is there; there is nothing to copy, and copying a file onto itself
        // would truncate it.
        return Err(ImportFailure::not_attempted(format!(
            "{provider} is already read from {}, so there is nothing to adopt",
            destination_home.display()
        )));
    }

    let from = SubscriptionReader::new(provider, &source_home);
    // One selection yields the bytes, their verdict, and their origin. Reading
    // the source a second time to describe it is what let the report and the
    // installed credential name different things (issue #280).
    let source_credential = from.read_document_for_import().map_err(|error| {
        ImportFailure::not_attempted(match error {
            link_assistant_router::subscription::SubscriptionError::NoCredentials(message) => {
                format!("no {provider} credential to import: {message}")
            }
            other => format!("invalid {provider} candidate credential: {other}"),
        })
    })?;
    let ImportSource {
        document,
        token: _,
        origin,
        path: source_path,
    } = &source_credential;
    let where_from = match origin {
        link_assistant_router::platform_keychain::Origin::Keychain => {
            link_assistant_router::platform_keychain::service_name(provider).map_or_else(
                || String::from("the platform keychain"),
                |service| format!("keychain {service:?}"),
            )
        }
        link_assistant_router::platform_keychain::Origin::File
        | link_assistant_router::platform_keychain::Origin::ExternalFile
        | link_assistant_router::platform_keychain::Origin::AdoptedFile => {
            from.discover_credential_path().map_or_else(
                || source_home.display().to_string(),
                |path| path.display().to_string(),
            )
        }
    };

    let destination = SubscriptionReader::new(provider, &destination_home);
    if policy.external_refresh_owner
        && !matches!(
            origin,
            link_assistant_router::platform_keychain::Origin::File
        )
    {
        return Err(ImportFailure::not_attempted(format!(
            "the {provider} credential is owned by {where_from}, which Router cannot durably advance; its refresh token was not spent"
        )));
    }
    // Do not spend a rotating candidate chain when conditional provisioning
    // already has a winner. Installation repeats this check after validation,
    // under the same lock, so a concurrent login/refresh still wins the race.
    if policy.if_absent && destination.has_platform_store_credential() {
        return Ok(ImportExecution::already_present(
            provider.to_string(),
            vec![format!(
                "{provider:<8} already present in the platform credential store; candidate from {where_from} was not validated or installed"
            )],
        ));
    }
    if policy.if_absent
        && let Some(path) = destination
            .existing_document_locked(
                &config.data_dir,
                link_assistant_router::credential_recovery_store::PRIMARY_ACCOUNT,
            )
            .await
            .map_err(ImportFailure::not_attempted)?
    {
        return Ok(ImportExecution::already_present(
            provider.to_string(),
            vec![format!(
                "{provider:<8} already present at {}; candidate from {where_from} was not validated or installed",
                path.display()
            )],
        ));
    }

    // A working access token can be paired with a stale, already-spent refresh
    // link. Prove the chain by forcing one direct OAuth exchange in an isolated
    // durable store, then ask the non-inference catalog with the persisted
    // result. The destination remains untouched throughout both network calls.
    let validated = validate_candidate(&config.data_dir, provider, document).await?;
    let report = describe_credential(validated.token());
    if (policy.if_absent && destination.has_platform_store_credential())
        || (!policy.if_absent
            && destination.candidate_is_shadowed_by_platform_store(validated.token()))
    {
        drop(validated);
        return Err(ImportFailure::safe_failure(
            ImportPhase::Promotion,
            format!(
                "the {provider} platform credential remains authoritative; the external refresh token was not spent"
            ),
        ));
    }
    let receipt_id = resumed_transaction_id.unwrap_or_else(|| validated.transaction_id());
    let promotion_document = if policy.external_refresh_owner {
        let source_path = source_path.as_deref().ok_or_else(|| {
            ImportFailure::not_attempted(format!(
                "the {provider} external credential has no writable source; its refresh token was not spent"
            ))
        })?;
        link_assistant_router::subscription::reference_external_credential(source_path, receipt_id)
            .map_err(ImportFailure::not_attempted)?
    } else {
        link_assistant_router::subscription::mark_promotion_receipt(
            validated.document(),
            receipt_id,
        )
        .map_err(ImportFailure::not_attempted)?
    };
    let promotion = install_candidate(
        &destination,
        &config.data_dir,
        &promotion_document,
        CredentialProbe::Accepted,
        ImportPolicy {
            external_refresh_owner: false,
            ..policy
        },
    )
    .await;
    let installed = match promotion {
        Ok(installed) => installed,
        Err(_error) if destination_has_receipt(config, provider, receipt_id) => {
            let path = destination.discover_credential_path().ok_or_else(|| {
                ImportFailure::safe_failure(
                    ImportPhase::Promotion,
                    format!("the committed {provider} credential could not be located"),
                )
            })?;
            InstallDocumentResult::Installed(path)
        }
        Err(error) => {
            drop(validated);
            return Err(ImportFailure::safe_failure(ImportPhase::Promotion, error));
        }
    };
    let execution = match installed {
        InstallDocumentResult::Installed(path) => {
            let messages = vec![
                format!(
                    "{provider:<8} imported {} from {where_from}",
                    path.display()
                ),
                format!(
                    "{provider:<8} candidate {report}, accepted by the vendor without spending the source refresh token"
                ),
            ];
            // Dropping a successfully promoted candidate removes its isolated
            // staging directory. The complete bytes now live at `path`.
            drop(validated);
            ImportExecution::promoted(provider.to_string(), messages)
        }
        InstallDocumentResult::AlreadyPresent(path) => {
            // A login or refresh won the race after the preflight. The source
            // refresh token was never spent, so no recovery transaction is
            // needed for the discarded duplicate.
            drop(validated);
            ImportExecution::already_present(
                provider.to_string(),
                vec![format!(
                    "{provider:<8} already present at {}; candidate from {where_from} was not installed",
                    path.display()
                )],
            )
        }
    };
    Ok(execution)
}

fn destination_has_receipt(
    config: &link_assistant_router::config::Config,
    provider: SubscriptionProvider,
    transaction_id: &str,
) -> bool {
    let user_home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let destination =
        SubscriptionReader::new(provider, provider_home(config, provider, &user_home));
    destination
        .discover_credential_path()
        .and_then(|path| std::fs::read_to_string(path).ok())
        .is_some_and(|document| {
            link_assistant_router::subscription::has_promotion_receipt(&document, transaction_id)
        })
}

async fn validate_candidate(
    data_dir: &std::path::Path,
    provider: SubscriptionProvider,
    document: &str,
) -> Result<ValidatedCandidate, ImportFailure> {
    link_assistant_router::credential_acceptance::accept_external_candidate(
        data_dir, provider, document, None,
    )
    .await
    .map_err(|failure| ImportFailure::from_acceptance(&failure))
}

#[cfg(test)]
fn import_refresh_prerequisite(
    provider: SubscriptionProvider,
    lookup: impl FnOnce(&str) -> Option<String>,
) -> Result<(), String> {
    if provider != SubscriptionProvider::Gemini {
        return Ok(());
    }
    let variable = link_assistant_router::refresh::GEMINI_CLIENT_SECRET_ENV;
    if lookup(variable).is_some_and(|value| !value.trim().is_empty()) {
        return Ok(());
    }
    Err(format!(
        "Gemini refresh-chain import requires {variable}; set it to the OAuth client secret shipped with Gemini CLI"
    ))
}

fn same_credential_home(source: &std::path::Path, destination: &std::path::Path) -> bool {
    if source == destination {
        return true;
    }
    match (
        std::fs::canonicalize(source),
        std::fs::canonicalize(destination),
    ) {
        (Ok(source), Ok(destination)) => source == destination,
        _ => false,
    }
}

/// Validate a credential in a Router-owned store that is isolated from the
/// serving destination.
///
/// Endpoint overrides exist only so the unit matrix can exercise the exact
/// four vendor layouts and request order against a loopback vendor. Production
/// always uses the provider's public OAuth endpoint and a Router-validated
/// catalog origin; a candidate-controlled `resource_url` can therefore never
/// send the refreshed bearer token outside the vendor allowlist.
#[cfg(test)]
async fn validate_candidate_with(
    data_dir: &std::path::Path,
    provider: SubscriptionProvider,
    document: &str,
    token_url_override: Option<&str>,
    catalog_base_url_override: Option<&str>,
) -> Result<ValidatedCandidate, ImportFailure> {
    link_assistant_router::credential_acceptance::accept_candidate(
        data_dir,
        provider,
        document,
        token_url_override,
        catalog_base_url_override,
    )
    .await
    .map_err(|failure| ImportFailure::from_acceptance(&failure))
}

/// Enforce candidate acceptance policy, then enter the shared writer boundary.
async fn install_candidate(
    destination: &SubscriptionReader,
    data_dir: &std::path::Path,
    document: &str,
    probe: CredentialProbe,
    policy: ImportPolicy,
) -> Result<InstallDocumentResult, String> {
    if policy.capability_asserted {
        tracing::debug!("caller asserted safe-refresh-chain-import-v1");
    }
    let refusal = (probe != CredentialProbe::Accepted).then(|| {
        format!(
            "{} candidate was not accepted by the vendor and cannot be installed",
            destination.provider()
        )
    });
    if !policy.if_absent
        && let Some(error) = refusal
    {
        return Err(error);
    }
    let mode = if policy.if_absent {
        InstallMode::IfAbsent
    } else {
        InstallMode::Replace
    };
    destination
        .install_document_locked_with_refusal(
            data_dir,
            link_assistant_router::credential_recovery_store::PRIMARY_ACCOUNT,
            document,
            mode,
            refusal,
        )
        .await
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

#[cfg(test)]
#[path = "auth_import_tests.rs"]
mod tests;
