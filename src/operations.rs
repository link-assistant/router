//! Complete importable command dispatch with scoped dependencies and results.
//!
//! ```no_run
//! # async fn example() -> Result<(), Box<dyn std::error::Error>> {
//! use link_assistant_router::{cli::{Cli, Command}, operation_context::OperationContext, operations};
//! let cli = link_assistant_router::cli::try_parse_arguments(vec!["router".into(), "version".into()])?;
//! let result = operations::execute(OperationContext::default(), cli).await?;
//! assert!(result.success);
//! # Ok(()) }
//! ```
use crate::cli::{Cli, Command};
use crate::operation_context::{CapturedOutput, OperationContext};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::ffi::OsString;
use std::process::ExitCode;

/// Versioned result returned by every operation and CLI JSON adapter.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, schemars::JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct OperationResult<T = Value> {
    /// Published schema identifier.
    pub schema: String,
    /// Canonical operation name from the generated catalog.
    pub operation: String,
    /// Whether the operation succeeded.
    pub success: bool,
    /// Exact process-compatible exit status, including specialized deploy statuses.
    pub exit_code: u8,
    /// Structured operation data. Legacy reports retain typed output lines.
    pub data: T,
    /// Diagnostic messages, kept separate from operation data.
    pub diagnostics: Vec<String>,
}

/// Typed failure; the full schema-validated result remains available.
#[derive(Debug, Clone)]
pub struct OperationError {
    /// Error response with exit status, operation and diagnostics.
    pub result: OperationResult,
}
impl std::fmt::Display for OperationError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            formatter,
            "{} failed (exit {}): {}",
            self.result.operation,
            self.result.exit_code,
            self.result.diagnostics.join("; ")
        )
    }
}
impl std::error::Error for OperationError {}

fn exit_number(code: ExitCode) -> u8 {
    (0..=u8::MAX)
        .find(|number| ExitCode::from(*number) == code)
        .unwrap_or(1)
}

fn result(operation: String, code: ExitCode, output: CapturedOutput) -> OperationResult {
    let exit_code = exit_number(code);
    let data = if let Some(mut data) = output.data {
        // Domain reports publish facts before their separate human rendering.
        if let Some(lines) = data.get_mut("output") {
            *lines = serde_json::json!(output.stdout.lines().collect::<Vec<_>>());
        }
        data
    } else {
        // Existing JSON documents already own their output field.
        serde_json::from_str(&output.stdout).unwrap_or_else(
            |_| serde_json::json!({"output": output.stdout.lines().collect::<Vec<_>>()}),
        )
    };
    OperationResult {
        schema: format!("link-assistant-router/{}/v1", operation.replace('.', "-")),
        operation,
        success: exit_code == 0,
        exit_code,
        data,
        diagnostics: output.stderr.lines().map(str::to_owned).collect(),
    }
}

/// Perform any parsed CLI operation in-process, capturing output and errors.
/// All state roots and external dependencies belong to `context`.
pub async fn execute(
    mut context: OperationContext,
    mut cli: Cli,
) -> Result<OperationResult, OperationError> {
    if let Some(home) = &context.home {
        cli.home = Some(home.clone());
    }
    if let Some(data_dir) = &context.data_dir {
        cli.data_dir = Some(data_dir.clone());
    }
    context.output = std::sync::Arc::default();
    let operation = crate::contracts::operation_name(cli.command.as_ref());
    force_json(&mut cli.command);
    let sink = context.output.clone();
    let code = crate::operation_context::ACTIVE
        .scope(context, Box::pin(crate::runtime::dispatch(cli)))
        .await;
    let captured = std::mem::take(&mut *sink.lock().expect("operation output lock"));
    let mut result = result(operation, code, captured);
    if let Err(error) = crate::contracts::validation::operation(
        &result.operation,
        &serde_json::to_value(&result).expect("operation result"),
    ) {
        result
            .diagnostics
            .push(format!("operation contract violation: {error}"));
        result.data = serde_json::json!({"output": []});
        result.success = false;
        result.exit_code = 1;
    }
    if result.success {
        Ok(result)
    } else {
        Err(OperationError { result })
    }
}

/// Execute a typed command with all parser defaults taken from the context.
///
/// ```no_run
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// use link_assistant_router::{cli::Command, operations, operation_context::OperationContext};
/// let response = operations::request(OperationContext::isolated("/tmp/router-example"), Command::Version).await?;
/// assert_eq!(response.data["version"], link_assistant_router::VERSION);
/// # Ok(()) }
/// ```
pub async fn request(
    context: OperationContext,
    command: Command,
) -> Result<OperationResult, OperationError> {
    let mut cli = context
        .scope(|| crate::cli::try_parse_arguments(vec!["router".into(), "version".into()]))
        .expect("static version request parses");
    cli.command = Some(command);
    execute(context, cli).await
}

/// Human/JSON process adapter. JSON flags after a forwarded `--` remain client arguments.
pub async fn run_arguments(arguments: Vec<OsString>) -> ExitCode {
    let mut arguments = crate::cli::protect_client_arguments(arguments, true);
    let boundary = arguments
        .iter()
        .position(|argument| argument == "--")
        .unwrap_or(arguments.len());
    let json = arguments[..boundary]
        .iter()
        .any(|argument| argument == "--json");
    if json {
        let mut position = 0;
        arguments.retain(|argument| {
            let keep = position >= boundary || argument != "--json";
            position += 1;
            keep
        });
    }
    let cli = match crate::cli::try_parse_arguments(arguments) {
        Ok(cli) => cli,
        Err(error) if json => {
            let response = result(
                "cli-error".into(),
                ExitCode::from(u8::try_from(error.exit_code()).unwrap_or(2)),
                CapturedOutput {
                    stderr: error.to_string(),
                    ..Default::default()
                },
            );
            std::println!(
                "{}",
                serde_json::to_string(&response).expect("JSON response")
            );
            return ExitCode::from(response.exit_code);
        }
        Err(error) => {
            let _ = error.print();
            return ExitCode::from(u8::try_from(error.exit_code()).unwrap_or(2));
        }
    };
    if !json {
        if !matches!(&cli.command, Some(Command::With(args)) if args.client == crate::clients::ClientKind::ClaudeCode && !args.global && !args.undo)
        {
            crate::logging::init(cli.verbose);
        }
        return Box::pin(crate::runtime::dispatch(cli)).await;
    }
    let mut context = OperationContext::default();
    if matches!(cli.command, Some(Command::Verify(_))) {
        context.process_deadline = std::time::Duration::from_secs(3600);
    }
    let response = match execute(context, cli).await {
        Ok(result) => result,
        Err(error) => error.result,
    };
    std::println!(
        "{}",
        serde_json::to_string(&response).expect("JSON response")
    );
    ExitCode::from(response.exit_code)
}

const fn force_json(command: &mut Option<Command>) {
    use crate::cli::{AccountOp, AuthOp, BackupOp, ClientOp, LogsOp, ProviderOp, TokenOp};
    match command.as_mut() {
        Some(
            Command::Tokens {
                op:
                    TokenOp::List { json, .. }
                    | TokenOp::Import { json, .. }
                    | TokenOp::RecoverAdmin { json, .. }
                    | TokenOp::Show { json, .. },
            }
            | Command::Accounts {
                op: AccountOp::List { json, .. },
            }
            | Command::Providers {
                op: ProviderOp::List { json, .. } | ProviderOp::Show { json, .. },
            }
            | Command::Clients {
                op:
                    ClientOp::List { json, .. }
                    | ClientOp::Show { json, .. }
                    | ClientOp::Reset { json, .. }
                    | ClientOp::Repair { json, .. }
                    | ClientOp::Backup {
                        op: BackupOp::List { json, .. },
                    },
            }
            | Command::Auth {
                op: AuthOp::Import { json, .. },
            }
            | Command::Logs {
                op: LogsOp::Summary { json, .. } | LogsOp::Anomalies { json, .. },
            },
        ) => *json = true,
        Some(Command::Usage(args)) => args.json = true,
        Some(Command::Deploy(args)) => args.json = true,
        Some(Command::Clients {
            op: ClientOp::Install(args) | ClientOp::Update(args) | ClientOp::Reinstall(args),
        }) => args.json = true,
        _ => {}
    }
}

/// Decode another Router's report, preserving compatibility with pre-v1 outputs.
/// New versioned envelopes are validated before their payload is returned.
pub fn decode_payload<T: serde::de::DeserializeOwned>(bytes: &[u8]) -> Result<T, String> {
    let value: Value = serde_json::from_slice(bytes).map_err(|error| error.to_string())?;
    let payload = if value
        .get("schema")
        .and_then(Value::as_str)
        .is_some_and(|schema| schema.starts_with("link-assistant-router/"))
        && value.get("operation").is_some()
    {
        let operation = value["operation"]
            .as_str()
            .ok_or("invalid operation name")?;
        crate::contracts::validation::operation(operation, &value)?;
        if value["success"] != true {
            return Err(format!("remote operation failed: {}", value["diagnostics"]));
        }
        value["data"].clone()
    } else {
        value
    };
    serde_json::from_value(payload).map_err(|error| error.to_string())
}

/// Decode token inventory from either a legacy array or a validated v1 envelope.
/// Failed or unrelated operations cannot be mistaken for an empty inventory.
pub fn decode_token_inventory(bytes: &[u8]) -> Result<Vec<crate::storage::TokenRecord>, String> {
    let value: Value = serde_json::from_slice(bytes).map_err(|error| error.to_string())?;
    if value.is_object() && value["operation"] != "tokens.list" {
        return Err("token inventory envelope must describe tokens.list".into());
    }
    decode_payload(bytes)
}

impl OperationResult {
    /// Read the published domain report using its generated Rust type.
    pub fn typed<T: serde::de::DeserializeOwned>(
        self,
    ) -> Result<OperationResult<T>, OperationError> {
        match serde_json::from_value(self.data.clone()) {
            Ok(data) => Ok(OperationResult {
                schema: self.schema,
                operation: self.operation,
                success: self.success,
                exit_code: self.exit_code,
                data,
                diagnostics: self.diagnostics,
            }),
            Err(error) => {
                let mut result = self;
                result.success = false;
                result.exit_code = 1;
                result
                    .diagnostics
                    .push(format!("domain report decoding failed: {error}"));
                Err(OperationError { result })
            }
        }
    }
}
