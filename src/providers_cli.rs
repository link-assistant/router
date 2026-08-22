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
    match op {
        ProviderOp::List => match store.list_redacted() {
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
        ProviderOp::Show { name } => match store.get(name) {
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
        ProviderOp::Remove { name } => match store.delete(name) {
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
        ProviderOp::Import { path } => match store.import_file(path) {
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
