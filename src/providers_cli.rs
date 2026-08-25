//! `router providers` — manage stored OpenAI-compatible providers.
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit.

use std::process::ExitCode;

use crate::cli::ProviderOp;
use crate::config::Config;
use crate::providers::{ProviderStore, ProviderUpsert};

#[must_use]
pub fn run(config: &Config, op: &ProviderOp) -> ExitCode {
    let store = match ProviderStore::open(&config.data_dir, &config.token_secret) {
        Ok(store) => store,
        Err(e) => {
            eprintln!("error: {e}");
            return ExitCode::from(1);
        }
    };
    run_with(&store, op)
}

/// The same commands against the *selected* router (issue #294).
///
/// The deployment already exposes full CRUD for providers, admin-gated, so
/// these are honoured rather than refused. `import` is the exception in shape
/// only: it reads a file on *this* machine and then declares each provider
/// remotely, which is what an operator means by importing a local manifest
/// into a deployment.
pub async fn run_remote(
    server: &crate::managed_server::ResolvedServer,
    op: &ProviderOp,
) -> ExitCode {
    match remote_result(server, op).await {
        Ok(code) => code,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

/// The call one provider operation makes against the selected router.
///
/// Separated from sending it so the request can be asserted without a server:
/// a wrong path or a body missing a declared model is the kind of mistake an
/// operator only sees as a provider that never wins a route.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Call {
    /// `GET`, `POST` or `DELETE`, as the endpoint expects.
    pub method: &'static str,
    /// The admin route this operation uses.
    pub path: String,
    /// The JSON body, for a `POST`.
    pub body: Option<serde_json::Value>,
}

/// The call `op` makes, for everything but `import`.
///
/// `import` reads a manifest on this machine and then makes one `add` call per
/// provider it declares, so it has no single call of its own.
///
/// # Errors
///
/// Returns an operator-readable message when the provider cannot be encoded.
pub fn call_for(op: &ProviderOp) -> Result<Option<Call>, String> {
    Ok(match op {
        ProviderOp::List { .. } => Some(Call {
            method: "GET",
            path: "/api/providers".to_string(),
            body: None,
        }),
        ProviderOp::Show { name, .. } => Some(Call {
            method: "GET",
            path: format!("/api/providers/{name}"),
            body: None,
        }),
        ProviderOp::Remove { name, .. } => Some(Call {
            method: "DELETE",
            path: format!("/api/providers/{name}"),
            body: None,
        }),
        ProviderOp::Add {
            name,
            kind,
            base_url,
            model,
            models,
            api_key,
            api_key_env,
            enabled,
            ..
        } => Some(Call {
            method: "POST",
            path: "/api/providers".to_string(),
            body: Some(upsert_body(&ProviderUpsert {
                name: name.clone(),
                kind: Some(kind.clone()),
                base_url: base_url.clone(),
                default_model: model.clone(),
                models: Some(models.clone()),
                api_key: api_key.clone(),
                api_key_env: api_key_env.clone(),
                encrypted_api_key: None,
                enabled: Some(*enabled),
            })?),
        }),
        ProviderOp::Import { .. } => None,
    })
}

/// One provider as the endpoint's own request type encodes it.
///
/// Built from [`ProviderUpsert`] rather than a hand-written JSON object, so the
/// remote and local paths cannot describe a provider differently.
///
/// # Errors
///
/// Returns an operator-readable message when the record cannot be encoded.
pub fn upsert_body(upsert: &ProviderUpsert) -> Result<serde_json::Value, String> {
    serde_json::to_value(upsert).map_err(|error| error.to_string())
}

/// The provider records inside a `/api/providers` answer.
#[must_use]
pub fn records_in(answer: &serde_json::Value) -> Vec<serde_json::Value> {
    answer
        .get("data")
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default()
}

async fn remote_result(
    server: &crate::managed_server::ResolvedServer,
    op: &ProviderOp,
) -> Result<ExitCode, String> {
    if let ProviderOp::Import { path, .. } = op {
        // The manifest is this machine's file; the providers it declares are
        // the deployment's. Reading here and declaring there is what "import
        // into that router" means.
        let text = std::fs::read_to_string(path)
            .map_err(|error| format!("could not read {}: {error}", path.display()))?;
        let imported = crate::providers::parse_provider_import(&text)
            .map_err(|error| format!("could not parse {}: {error}", path.display()))?;
        let count = imported.len();
        for record in &imported {
            crate::auth_remote::post(server, "/api/providers", upsert_body(record)?).await?;
        }
        println!("imported {count} providers into {}", server.base_url);
        return Ok(ExitCode::SUCCESS);
    }

    let Some(call) = call_for(op)? else {
        return Ok(ExitCode::from(1));
    };
    let answer = match (call.method, call.body) {
        ("POST", Some(body)) => crate::auth_remote::post(server, &call.path, body).await,
        ("DELETE", _) => crate::auth_remote::delete(server, &call.path).await,
        _ => crate::auth_remote::get(server, &call.path).await,
    };

    match op {
        ProviderOp::List { .. } => {
            print_remote_table(&records_in(&answer?));
            Ok(ExitCode::SUCCESS)
        }
        ProviderOp::Show { name, .. } => match answer {
            Ok(record) => {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&record).unwrap_or_default()
                );
                Ok(ExitCode::SUCCESS)
            }
            // The local path exits 2 for an unknown provider; matching it keeps
            // a script's meaning the same against either target.
            Err(error) if error.contains("404") => {
                eprintln!("not found: {name}");
                Ok(ExitCode::from(2))
            }
            Err(error) => Err(error),
        },
        ProviderOp::Remove { name, .. } => {
            answer?;
            println!("removed {name}");
            Ok(ExitCode::SUCCESS)
        }
        ProviderOp::Add { name, .. } => {
            answer?;
            println!("saved {name}");
            Ok(ExitCode::SUCCESS)
        }
        // Returned above.
        ProviderOp::Import { .. } => Ok(ExitCode::from(1)),
    }
}

/// The provider table, in the one format both paths print.
///
/// Same columns, widths and order as the local table: an operator reading one
/// has no way to tell which machine answered, so a column that differs between
/// them would be worse than no column at all.
///
/// `kind` is taken through [`ProviderKind::as_str`] rather than its serde
/// encoding, which renders `OpenAICompatible` as `open-a-i-compatible` under
/// `kebab-case` and would have shown a spelling no operator ever types.
fn print_remote_table(records: &[serde_json::Value]) {
    println!(
        "{:<20}  {:<18}  {:<32}  {:<10}  default_model",
        "name", "kind", "base_url", "enabled"
    );
    for record in records {
        let text = |key: &str| {
            record
                .get(key)
                .and_then(serde_json::Value::as_str)
                .unwrap_or_default()
        };
        let kind = crate::providers::ProviderKind::from_str_opt(text("kind"))
            .unwrap_or_default()
            .as_str();
        println!(
            "{:<20}  {:<18}  {:<32}  {:<10}  {}",
            text("name"),
            kind,
            text("base_url"),
            record
                .get("enabled")
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(false),
            text("default_model"),
        );
    }
}

/// The same command against an already-open store.
///
/// Split from [`run`] so the operations can be exercised without constructing
/// a whole configuration around them.
#[must_use]
pub fn run_with(store: &ProviderStore, op: &ProviderOp) -> ExitCode {
    match op {
        ProviderOp::List { .. } => match store.list_redacted() {
            Ok(records) => {
                println!(
                    "{:<20}  {:<18}  {:<32}  {:<10}  default_model",
                    "name", "kind", "base_url", "enabled"
                );
                for record in records {
                    println!(
                        "{:<20}  {:<18}  {:<32}  {:<10}  {}",
                        record.name,
                        record.kind.as_str(),
                        record.base_url,
                        record.enabled,
                        record.default_model.unwrap_or_default()
                    );
                }
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        ProviderOp::Add {
            name,
            kind,
            base_url,
            model,
            models,
            api_key,
            api_key_env,
            enabled,
            ..
        } => {
            let input = ProviderUpsert {
                name: name.clone(),
                kind: Some(kind.clone()),
                base_url: base_url.clone(),
                default_model: model.clone(),
                models: Some(models.clone()),
                api_key: api_key.clone(),
                api_key_env: api_key_env.clone(),
                encrypted_api_key: None,
                enabled: Some(*enabled),
            };
            match store.upsert(input) {
                Ok(record) => {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&record.redacted()).unwrap_or_default()
                    );
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("error: {e}");
                    ExitCode::from(1)
                }
            }
        }
        ProviderOp::Show { name, .. } => match store.get(name) {
            Ok(Some(record)) => {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&record.redacted()).unwrap_or_default()
                );
                ExitCode::SUCCESS
            }
            Ok(None) => {
                eprintln!("not found: {name}");
                ExitCode::from(2)
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        ProviderOp::Remove { name, .. } => match store.delete(name) {
            Ok(true) => {
                println!("removed {name}");
                ExitCode::SUCCESS
            }
            Ok(false) => {
                eprintln!("not found: {name}");
                ExitCode::from(2)
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        ProviderOp::Import { path, .. } => match store.import_file(path) {
            Ok(count) => {
                println!("imported {count} provider(s)");
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
    }
}

#[cfg(test)]
#[path = "providers_cli_tests.rs"]
mod tests;
