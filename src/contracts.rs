//! Canonical language-neutral operation and route catalogs generated from Clap
//! and the same route inventory the HTTP listeners use.
use crate::cli::{Cli, Command};
use clap::CommandFactory as _;
use serde_json::{Value, json};

/// CLI parser with a JSON option documented on every command.
#[must_use]
pub fn command() -> clap::Command {
    fn add_json(mut command: clap::Command) -> clap::Command {
        if !command
            .get_arguments()
            .any(|argument| argument.get_long() == Some("json"))
        {
            command = command.arg(
                clap::Arg::new("router_machine_json")
                    .long("json")
                    .action(clap::ArgAction::SetTrue)
                    .help("Return the versioned machine-readable operation result"),
            );
        }
        let names: Vec<_> = command
            .get_subcommands()
            .map(|sub| sub.get_name().to_owned())
            .collect();
        for name in names {
            command = command.mut_subcommand(name, add_json);
        }
        command
    }
    fn contextual(mut command: clap::Command) -> clap::Command {
        if let Some(context) = crate::operation_context::current() {
            command = command.mut_args(|argument| {
                let value = argument
                    .get_env()
                    .and_then(|name| context.environment.get(name))
                    .cloned();
                if argument.get_env().is_some() {
                    let argument = argument.env(clap::builder::Resettable::Reset);
                    match value {
                        Some(value) => argument.default_value(value),
                        None => argument,
                    }
                } else {
                    argument
                }
            });
        }
        let names: Vec<_> = command
            .get_subcommands()
            .map(|sub| sub.get_name().to_owned())
            .collect();
        for name in names {
            command = command.mut_subcommand(name, contextual);
        }
        command
    }
    contextual(add_json(Cli::command()))
}

/// Complete operation catalog, including option metadata used by bindings.
#[must_use]
pub fn operations() -> Vec<Value> {
    fn visit(command: &clap::Command, path: &[String], globals: &[Value], result: &mut Vec<Value>) {
        let own: Vec<_> = command.get_arguments().filter(|arg| arg.get_long() != Some("json"))
            .map(|argument| json!({"name":argument.get_id().as_str(), "flag":argument.get_long(),
                "positional": argument.is_positional(), "required": argument.is_required_set(),
                "multiple": matches!(argument.get_action(), clap::ArgAction::Append),
                "boolean": matches!(argument.get_action(), clap::ArgAction::SetTrue | clap::ArgAction::SetFalse),
                "secret": secret_option(argument.get_id().as_str()),
                "environment": argument.get_env().map(|env| env.to_string_lossy().into_owned())})).collect();
        let options: Vec<_> = globals.iter().chain(own.iter()).cloned().collect();
        if command.get_subcommands().count() == 0 {
            let name = path.join(".");
            result.push(json!({"name":name, "command":path, "schema":format!("link-assistant-router/{}/v1",name.replace('.',"-")), "options":options}));
        } else {
            for child in command.get_subcommands() {
                let mut next = path.to_vec();
                next.push(child.get_name().into());
                visit(child, &next, &options, result);
            }
        }
    }
    let command = command();
    let globals: Vec<_> = command.get_arguments().filter(|argument| argument.is_global_set())
        .map(|argument| json!({"name":argument.get_id().as_str(),"flag":argument.get_long(),"positional":false,"required":false,
            "multiple":matches!(argument.get_action(),clap::ArgAction::Append),"boolean":matches!(argument.get_action(),clap::ArgAction::SetTrue),
            "secret": secret_option(argument.get_id().as_str()),
            "environment":argument.get_env().map(|env|env.to_string_lossy().into_owned())})).collect();
    let mut result = Vec::new();
    for child in command.get_subcommands() {
        visit(child, &[child.get_name().into()], &globals, &mut result);
    }
    result.sort_by(|a, b| a["name"].as_str().cmp(&b["name"].as_str()));
    result
}

/// HTTP routes with their original method, path, authentication and dialect.
#[must_use]
pub fn routes() -> Vec<Value> {
    crate::route_contract::route_specs().iter().map(|route| json!({
        "name":format!("{:?}",route.id),"method":route.method.as_str(),"path":route.template,
        "auth":format!("{:?}",route.auth),"dialect":format!("{:?}",route.dialect),
        "class":format!("{:?}",route.class),"listeners":route.listeners.iter().map(|listener|format!("{listener:?}")).collect::<Vec<_>>()
    })).collect()
}

/// Generated contract document; checked-in publications must match this source.
#[must_use]
pub fn document() -> Value {
    json!({"schema":"link-assistant-router/operation-catalog/v1", "version":crate::VERSION,
        "operations":operations(),"routes":routes(),"languages":["rust","javascript","typescript","python"], "types": types()})
}

/// Canonical operation name for an already-parsed library request.
#[must_use]
pub fn operation_name(command: Option<&Command>) -> String {
    fn name(debug: &str) -> String {
        let first = debug.split([' ', '{', '(']).next().unwrap_or_default();
        let mut result = String::new();
        for (index, character) in first.chars().enumerate() {
            if character.is_uppercase() && index > 0 {
                result.push('-');
            }
            result.extend(character.to_lowercase());
        }
        result
    }
    match command {
        None | Some(Command::Serve) => "serve".into(),
        Some(Command::Version) => "version".into(),
        Some(Command::Contracts) => "contracts".into(),
        Some(Command::Verify(_)) => "verify".into(),
        Some(Command::Tokens { op }) => format!("tokens.{}", name(&format!("{op:?}"))),
        Some(Command::Accounts { op }) => format!("accounts.{}", name(&format!("{op:?}"))),
        Some(Command::Providers { op }) => format!("providers.{}", name(&format!("{op:?}"))),
        Some(Command::Clients {
            op: crate::cli::ClientOp::Backup { op },
        }) => format!("clients.backup.{}", name(&format!("{op:?}"))),
        Some(Command::Clients { op }) => format!("clients.{}", name(&format!("{op:?}"))),
        Some(Command::Models { op }) => format!("models.{}", name(&format!("{op:?}"))),
        Some(Command::Server { op }) => format!("server.{}", name(&format!("{op:?}"))),
        Some(Command::Auth { op }) => format!("auth.{}", name(&format!("{op:?}"))),
        Some(Command::Tls { op }) => format!("tls.{}", name(&format!("{op:?}"))),
        Some(Command::Logs { op }) => format!("logs.{}", name(&format!("{op:?}"))),
        Some(Command::Tunnel(args)) => format!("tunnel.{}", name(&format!("{:?}", args.op))),
        Some(Command::With(_)) => "with".into(),
        Some(Command::Configure(_)) => "configure".into(),
        Some(Command::Usage(_)) => "usage".into(),
        Some(Command::Deploy(_)) => "deploy".into(),
        Some(Command::Doctor { .. }) => "doctor".into(),
    }
}

/// JSON Schemas derived from public HTTP and CLI data types.
#[must_use]
pub fn types() -> Value {
    json!({
        "OperationResult":schemars::schema_for!(crate::operations::OperationResult),
        "ClientStatus":schemars::schema_for!(crate::clients::ClientStatus),
        "MaintenancePlan":schemars::schema_for!(crate::client_lifecycle::maintenance::Plan),
        "BackupManifest":schemars::schema_for!(crate::client_lifecycle::backup::Manifest),
        "TokenImportReport":schemars::schema_for!(crate::token_import::ImportReport),
        "AuthImportReport":crate::auth_import::result_schema(),
        "UsageSnapshot":schemars::schema_for!(crate::metrics::UsageSnapshot),
        "CredentialAcceptanceReport":schemars::schema_for!(crate::credential_status::CredentialAcceptanceReport),
        "AuthDiagnosticsSnapshot":schemars::schema_for!(crate::auth_diagnostics::AuthDiagnosticsSnapshot),
        "EmergencyStatus":schemars::schema_for!(crate::emergency_auth::EmergencyAuthStatus),
        "LoginView":schemars::schema_for!(crate::login::LoginView),
        "BeginLoginRequest":schemars::schema_for!(crate::login_api::BeginLoginRequest),
        "SubmitCodeRequest":schemars::schema_for!(crate::login_api::SubmitCodeRequest),
        "TokenRecord":schemars::schema_for!(crate::storage::TokenRecord),
        "ProviderRecord":schemars::schema_for!(crate::providers::RedactedProviderRecord),
        "ProviderUpsert":schemars::schema_for!(crate::providers::ProviderUpsert),
        "UsageEnvelope":schemars::schema_for!(crate::subscription_usage::UsageEnvelope),
        "AdminStatus":schemars::schema_for!(crate::admin::AdminStatus),
        "TtlRequest":schemars::schema_for!(crate::admin_api::TtlRequest),
        "ConfirmRequest":schemars::schema_for!(crate::admin_api::ConfirmRequest),
        "IssueTokenRequest":schemars::schema_for!(crate::token_admin::IssueTokenRequest),
        "IssueClientTokenRequest":schemars::schema_for!(crate::token_admin::IssueClientTokenRequest),
        "RevokeTokenRequest":schemars::schema_for!(crate::token_admin::RevokeTokenRequest),
        "RotateTokenRequest":schemars::schema_for!(crate::token_admin::RotateTokenRequest),
        "RotateClientTokenRequest":schemars::schema_for!(crate::token_admin::RotateClientTokenRequest)
    })
}

fn secret_option(name: &str) -> bool {
    name.ends_with("_api_key")
        || name.ends_with("_private_key")
        || name.ends_with("_bot_token")
        || matches!(
            name,
            "token"
                | "admin_key"
                | "provider_key"
                | "env"
                | "admin_token"
                | "token_secret"
                | "token_admin_key"
                | "api_key"
                | "openai_api_key"
                | "openai_compatible_api_key"
                | "github_token"
                | "anthropic_api_key"
                | "refresh_token"
                | "access_token"
        )
}

mod generated;
/// Offline CLI and HTTP contract validators.
pub mod validation;
