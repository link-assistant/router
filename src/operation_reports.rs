//! Domain reports shared by Rust operations, JSON contracts and generated bindings.
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Check {
    pub name: String,
    pub state: String,
    pub detail: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ProviderHealth {
    pub provider: crate::subscription::SubscriptionProvider,
    pub credential_root: String,
    pub state: String,
    pub models: Vec<String>,
    pub detail: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct DeploymentHealth {
    pub deployment: crate::deploy::registry::Entry,
    pub present: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ModelRecommendation {
    pub provider: crate::subscription::SubscriptionProvider,
    pub model: String,
    pub reason: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct DoctorReport {
    pub status: String,
    pub version: String,
    pub checks: Vec<Check>,
    pub providers: Vec<ProviderHealth>,
    pub deployments: Vec<DeploymentHealth>,
    pub recommended_models: Vec<ModelRecommendation>,
    pub data_dir: std::path::PathBuf,
    pub listen_addr: String,
    pub forwarded_headers: Vec<String>,
    pub output: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct AuthStatusReport {
    pub server: Option<String>,
    pub credentials: Vec<crate::credential_status::CredentialAcceptanceReport>,
    pub sources: Vec<crate::credential_source::SourceReport>,
    pub api_key_providers: Vec<crate::providers::RedactedProviderRecord>,
    pub output: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ClientState {
    pub client: String,
    pub installed: bool,
    pub configured: bool,
    pub config_path: PathBuf,
    pub dialect: String,
    pub base_url: Option<String>,
    pub token_env: Option<String>,
    pub token_env_set: bool,
    /// Router ownership of the effective routing configuration.
    pub ownership_state: crate::clients::OwnershipState,
    /// Highest-precedence source which currently selects the endpoint.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effective_source: Option<crate::clients::ConfigSource>,
    /// Routing-critical key names which disagree; values are never retained.
    pub conflicts: Vec<String>,
    /// Why this client's configuration could not be read, if it could not.
    ///
    /// A damaged file is a property of one row, not of the listing: propagating
    /// it ended the table at that client and silently hid every client after
    /// it, while the error named a *different* client than the one missing
    /// (issue #304).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unreadable: Option<String>,
    /// Why the router cannot manage this client at all, if it cannot.
    ///
    /// `configured: false` is indistinguishable from a real answer for a
    /// client whose reader is a hardcoded `None` (issue #303).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unsupported: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ClientDoctorReport {
    pub client: ClientState,
    pub reachable: bool,
    pub url: Option<String>,
    pub http_status: Option<u16>,
    pub model: Option<String>,
    pub output: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct LogRecordsReport {
    pub correlation_id: String,
    /// Vendor and request records retain their open-ended fields.
    pub records: Vec<Value>,
    pub output: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct TunnelStatusReport {
    pub running: bool,
    pub via: String,
    pub server: String,
    pub local_port: u16,
    pub remote_port: u16,
    pub health_status: Option<u16>,
    pub models_status: Option<u16>,
    pub models_checked: bool,
    pub output: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ServerSelection {
    pub source: String,
    pub url: Option<String>,
    pub token_configured: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ManagedServerStatus {
    pub present: bool,
    pub state: String,
    pub detail: Option<String>,
    pub container: String,
    pub volume: String,
    pub url: Option<String>,
    pub administrator_claimed: bool,
    pub users: usize,
    pub keep_running: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ServerStatusReport {
    pub selection: ServerSelection,
    pub managed: ManagedServerStatus,
    pub output: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ClientRepresentation {
    pub client: String,
    pub advertisements: Vec<Value>,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ModelHealth {
    pub healthy_providers: Vec<String>,
    pub starting_providers: Vec<String>,
    pub degraded_providers: Vec<String>,
    pub degraded_reasons: Value,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ModelRouting {
    pub state: String,
    pub candidate_count: usize,
    pub catalog_conflicts: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ModelExplanationReport {
    pub contract_version: u32,
    pub model_descriptor: crate::model_contract::ModelTruthDescriptor,
    pub requested_selector: String,
    pub selector_kind: String,
    pub served_identity: Option<String>,
    pub client_representation: ClientRepresentation,
    pub route_scope: Value,
    pub capability_provenance: Value,
    pub model_policy: Value,
    pub health: ModelHealth,
    pub routing: ModelRouting,
    pub output: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct BackupVerificationReport {
    pub id: String,
    pub verified: bool,
    pub output: Vec<String>,
}

/// Execute an operation and decode its schema-validated domain data.
pub async fn execute<T: serde::de::DeserializeOwned>(
    context: crate::operation_context::OperationContext,
    command: crate::cli::Command,
) -> Result<crate::operations::OperationResult<T>, crate::operations::OperationError> {
    crate::operations::request(context, command).await?.typed()
}

/// Local doctor facts with an explicit target selection.
pub async fn doctor(
    context: crate::operation_context::OperationContext,
    target: crate::cli::AuthTarget,
) -> Result<crate::operations::OperationResult<DoctorReport>, crate::operations::OperationError> {
    execute(context, crate::cli::Command::Doctor { target }).await
}
/// Subscription credential acceptance and source facts.
pub async fn auth_status(
    context: crate::operation_context::OperationContext,
    target: crate::cli::AuthTarget,
) -> Result<crate::operations::OperationResult<AuthStatusReport>, crate::operations::OperationError>
{
    execute(
        context,
        crate::cli::Command::Auth {
            op: crate::cli::AuthOp::Status {
                target,
                clear_all: false,
                yes: false,
            },
        },
    )
    .await
}
/// Client ownership and live reachability facts.
pub async fn client_doctor(
    context: crate::operation_context::OperationContext,
    client: crate::clients::ClientKind,
) -> Result<crate::operations::OperationResult<ClientDoctorReport>, crate::operations::OperationError>
{
    execute(
        context,
        crate::cli::Command::Clients {
            op: crate::cli::ClientOp::Doctor { client },
        },
    )
    .await
}
/// Effective server selection and managed daemon state.
pub async fn server_status(
    context: crate::operation_context::OperationContext,
) -> Result<crate::operations::OperationResult<ServerStatusReport>, crate::operations::OperationError>
{
    execute(
        context,
        crate::cli::Command::Server {
            op: crate::cli::ServerOp::Status,
        },
    )
    .await
}
/// Decoded request records for one correlation ID.
pub async fn log_records(
    context: crate::operation_context::OperationContext,
    correlation_id: String,
    token: Option<String>,
    target: crate::cli::AuthTarget,
) -> Result<crate::operations::OperationResult<LogRecordsReport>, crate::operations::OperationError>
{
    execute(
        context,
        crate::cli::Command::Logs {
            op: crate::cli::LogsOp::Show {
                correlation_id,
                token,
                target,
            },
        },
    )
    .await
}
/// Actual tunnel process and HTTP status.
pub async fn tunnel_status(
    context: crate::operation_context::OperationContext,
    target: crate::tunnel_command::TunnelTarget,
) -> Result<crate::operations::OperationResult<TunnelStatusReport>, crate::operations::OperationError>
{
    execute(
        context,
        crate::cli::Command::Tunnel(crate::tunnel_command::TunnelArgs {
            op: crate::tunnel_command::TunnelOp::Status(target),
        }),
    )
    .await
}
/// Exact selector identity, routing and capability evidence.
pub async fn model_explanation(
    context: crate::operation_context::OperationContext,
    id: String,
    client: crate::clients::ClientKind,
    target: crate::cli::AuthTarget,
) -> Result<
    crate::operations::OperationResult<ModelExplanationReport>,
    crate::operations::OperationError,
> {
    execute(
        context,
        crate::cli::Command::Models {
            op: crate::cli::ModelOp::Explain { id, client, target },
        },
    )
    .await
}
