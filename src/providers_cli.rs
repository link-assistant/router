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

async fn remote_result(
    server: &crate::managed_server::ResolvedServer,
    op: &ProviderOp,
) -> Result<ExitCode, String> {
    match op {
        ProviderOp::List { .. } => {
            let body = crate::auth_remote::get(server, "/api/providers").await?;
            let records = body
                .get("data")
                .and_then(serde_json::Value::as_array)
                .cloned()
                .unwrap_or_default();
            print_remote_table(&records);
            Ok(ExitCode::SUCCESS)
        }
        ProviderOp::Show { name, .. } => {
            match crate::auth_remote::get(server, &format!("/api/providers/{name}")).await {
                Ok(record) => {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&record).unwrap_or_default()
                    );
                    Ok(ExitCode::SUCCESS)
                }
                // The local path exits 2 for an unknown provider; matching it
                // keeps a script's meaning the same against either target.
                Err(error) if error.contains("404") => {
                    eprintln!("not found: {name}");
                    Ok(ExitCode::from(2))
                }
                Err(error) => Err(error),
            }
        }
        ProviderOp::Remove { name, .. } => {
            crate::auth_remote::delete(server, &format!("/api/providers/{name}")).await?;
            println!("removed {name}");
            Ok(ExitCode::SUCCESS)
        }
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
            // The endpoint's own request type, so the remote and local paths
            // cannot describe a provider differently.
            let upsert = ProviderUpsert {
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
            let body = serde_json::to_value(&upsert).map_err(|error| error.to_string())?;
            crate::auth_remote::post(server, "/api/providers", body).await?;
            println!("saved {name}");
            Ok(ExitCode::SUCCESS)
        }
        ProviderOp::Import { path, .. } => {
            // The manifest is this machine's file; the providers it declares
            // are the deployment's. Reading here and declaring there is what
            // "import into that router" means.
            let text = std::fs::read_to_string(path)
                .map_err(|error| format!("could not read {}: {error}", path.display()))?;
            let imported = crate::providers::parse_provider_import(&text)
                .map_err(|error| format!("could not parse {}: {error}", path.display()))?;
            let mut saved = 0;
            for record in imported {
                let body = serde_json::to_value(&record).map_err(|error| error.to_string())?;
                crate::auth_remote::post(server, "/api/providers", body).await?;
                saved += 1;
            }
            println!("imported {saved} providers into {}", server.base_url);
            Ok(ExitCode::SUCCESS)
        }
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
