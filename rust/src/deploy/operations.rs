//! Deployment operation APIs share the CLI implementation and result schema.
use crate::cli::{Command, DeployArgs, DeployMode};
use crate::operation_context::OperationContext;
use crate::operations::{OperationError, OperationResult};

/// Inspectable local deployment plan; creating a plan performs no process calls.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LocalPlan {
    /// Effective deployment filesystem root.
    pub root: std::path::PathBuf,
    /// Immutable image reference.
    pub image: String,
    /// Stable front-door port.
    pub port: u16,
    /// Host or container deployment mode.
    pub mode: String,
}

/// A rejected plan, before any deployment mutation or process execution.
#[derive(Debug, Clone)]
pub struct PlanError(pub String);
impl std::fmt::Display for PlanError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.0)
    }
}
impl std::error::Error for PlanError {}

/// Resolve a local plan without applying it.
/// ```no_run
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// use link_assistant_router::{deploy::local, cli::{Command, try_parse_arguments}, operation_context::OperationContext};
/// let cli = try_parse_arguments(vec!["router".into(), "deploy".into(), "--image".into(), "router:v1.0.0".into()])?;
/// let Some(Command::Deploy(args)) = cli.command else { unreachable!() };
/// let plan = local::plan(&OperationContext::default(), &args)?;
/// assert_eq!(plan.port, 8080);
/// # Ok(()) }
/// ```
pub fn plan(context: &OperationContext, arguments: &DeployArgs) -> Result<LocalPlan, PlanError> {
    context
        .scope(|| {
            let (args, _, remote) = crate::deploy_cli::resolve(arguments)?;
            if remote {
                return Err("local plan received a remote target".into());
            }
            let data = context
                .data_dir
                .clone()
                .unwrap_or_else(crate::config::default_data_dir);
            let root = args.root.as_ref().map_or_else(
                || {
                    let name = args.settings.instance.as_deref().map_or_else(
                        || Ok("deploy".to_owned()),
                        |name| {
                            crate::deploy::instance::validate(name)?;
                            Ok::<_, String>(format!("deploy-{name}"))
                        },
                    )?;
                    Ok(data.join(name))
                },
                |root| crate::deploy_config::expand_home(root),
            )?;
            let root = if root.is_absolute() {
                root
            } else {
                context.working_directory.join(root)
            };
            let image = args
                .image
                .clone()
                .unwrap_or_else(|| format!("ghcr.io/link-assistant/router:{}", crate::VERSION));
            crate::deploy::immutable_ref(&image)?;
            Ok(LocalPlan {
                root,
                image,
                port: args.port(),
                mode: if args.mode == Some(DeployMode::Host) {
                    "host"
                } else {
                    "container"
                }
                .into(),
            })
        })
        .map_err(PlanError)
}

/// Apply a deployment with typed options and dependencies.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// use link_assistant_router::{deploy::local, operation_context::OperationContext};
/// let result = local::apply(OperationContext::default(), args).await?;
/// assert!(result.success);
/// # Ok(()) }
/// ```
pub async fn apply(
    context: OperationContext,
    arguments: DeployArgs,
) -> Result<OperationResult, OperationError> {
    crate::operations::request(context, Command::Deploy(arguments)).await
}

/// Inspect deployment status using the same report as `deploy --status --json`.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// let report = link_assistant_router::deploy::local::status(Default::default(), args).await?;
/// assert_eq!(report.operation, "deploy");
/// # Ok(()) }
/// ```
pub async fn status(
    context: OperationContext,
    mut arguments: DeployArgs,
) -> Result<OperationResult, OperationError> {
    arguments.status = true;
    apply(context, arguments).await
}

/// Deploy directly as a supervised or unsupervised host process.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// link_assistant_router::deploy::host::apply(Default::default(), args).await?;
/// # Ok(()) }
/// ```
pub async fn host(
    context: OperationContext,
    mut arguments: DeployArgs,
) -> Result<OperationResult, OperationError> {
    arguments.mode = Some(DeployMode::Host);
    apply(context, arguments).await
}

/// Apply remote SSH settings through the existing bounded remote coordinator.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// link_assistant_router::deploy::remote::apply(Default::default(), args).await?;
/// # Ok(()) }
/// ```
pub async fn remote(
    context: OperationContext,
    mut arguments: DeployArgs,
) -> Result<OperationResult, OperationError> {
    arguments.settings.remote = true;
    apply(context, arguments).await
}

/// Rehearse a deployment in an isolated staging namespace.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// link_assistant_router::deploy::staging::apply(Default::default(), "rehearsal", args).await?;
/// # Ok(()) }
/// ```
pub async fn staging(
    context: OperationContext,
    namespace: &str,
    mut arguments: DeployArgs,
) -> Result<OperationResult, OperationError> {
    arguments.staging = Some(namespace.into());
    apply(context, arguments).await
}

/// Restore a checkpoint after the coordinator proves all writers have stopped.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// link_assistant_router::deploy::checkpoint::restore(Default::default(), args, "/tmp/checkpoint".as_ref(), false).await?;
/// # Ok(()) }
/// ```
pub async fn restore(
    context: OperationContext,
    mut arguments: DeployArgs,
    snapshot: &std::path::Path,
    replace: bool,
) -> Result<OperationResult, OperationError> {
    arguments.restore_state = Some(snapshot.into());
    arguments.replace_state = replace;
    apply(context, arguments).await
}

/// Inspect a host deployment using the host runtime.
pub async fn host_status(
    context: OperationContext,
    mut arguments: DeployArgs,
) -> Result<OperationResult, OperationError> {
    arguments.status = true;
    host(context, arguments).await
}
/// Inspect a remote deployment using the SSH coordinator.
pub async fn remote_status(
    context: OperationContext,
    mut arguments: DeployArgs,
) -> Result<OperationResult, OperationError> {
    arguments.status = true;
    remote(context, arguments).await
}
