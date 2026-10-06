from pathlib import Path
p=Path('Cargo.toml'); s=p.read_text().replace('features = ["derive", "env"]', 'features = ["derive", "env", "string"]'); p.write_text(s)
p=Path('src/contracts.rs');s=p.read_text();s=s.replace('    add_json(Cli::command())','''    fn contextual(mut command: clap::Command) -> clap::Command {
        if let Some(context) = crate::operation_context::current() {
            command = command.mut_args(|argument| {
                let value = argument.get_env().and_then(|name| context.environment.get(name)).cloned();
                if argument.get_env().is_some() {
                    let argument = argument.env(None::<std::ffi::OsString>);
                    value.map_or_else(|| argument.clone(), |value| argument.default_value(value))
                } else { argument }
            });
        }
        let names: Vec<_> = command.get_subcommands().map(|sub| sub.get_name().to_owned()).collect();
        for name in names { command = command.mut_subcommand(name, contextual); }
        command
    }
    contextual(add_json(Cli::command()))''');p.write_text(s)
p=Path('src/operation_context.rs');s=p.read_text().replace('    /// Override one environment', '''    /// Scope a synchronous preparation step without changing global dependencies.
    pub fn scope<T>(&self, operation: impl FnOnce() -> T) -> T {
        ACTIVE.sync_scope(self.clone(), operation)
    }

    /// Scope asynchronous dependencies for a lower-level operation.
    pub async fn scope_async<T>(&self, operation: impl std::future::Future<Output = T>) -> T {
        ACTIVE.scope(self.clone(), operation).await
    }

    /// Override one environment''');p.write_text(s)
p=Path('src/bounded_process.rs');s=p.read_text().replace('        command.current_dir(&context.working_directory);','''        if command.get_current_dir().is_none() {
            command.current_dir(&context.working_directory);
        }''');p.write_text(s)
p=Path('src/operations.rs');s=p.read_text();s=s.replace('/// Human/JSON process adapter.', '''/// Execute a typed command with all parser defaults taken from the context.
///
/// ```no_run
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// use link_assistant_router::{cli::Command, operations, operation_context::OperationContext};
/// let response = operations::request(OperationContext::isolated("/tmp/router-example"), Command::Version).await?;
/// assert_eq!(response.data["version"], link_assistant_router::VERSION);
/// # Ok(()) }
/// ```
pub async fn request(context: OperationContext, command: Command) -> Result<OperationResult, OperationError> {
    let mut cli = context.scope(|| crate::cli::try_parse_arguments(vec!["router".into(), "version".into()]))
        .expect("static version request parses");
    cli.command = Some(command);
    execute(context, cli).await
}

/// Human/JSON process adapter.''');s=s.replace('            args.json = args.server.is_some() || args.settings.remote || args.staging.is_some()','            args.json = true');p.write_text(s)
p=Path('src/deploy_cli.rs');s=p.read_text().replace('    if args.json && args.staging.is_none() && !remote {\n        return Err("--json needs --staging, --server or --remote".to_string());\n    }\n','').replace('fn resolve(args:', 'pub(crate) fn resolve(args:');p.write_text(s)
p=Path('src/verification.rs');s=p.read_text().replace('use crate::{bounded_process, verification_client};','use crate::verification_client;');s+='''
/// Run the shared verifier in-process. The result contains the saved result.json document.
///
/// ```no_run
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// use link_assistant_router::{verification, operation_context::OperationContext};
/// let report = verification::run(OperationContext::default(), vec!["--area".into(), "releases".into()]).await?;
/// assert!(report.success);
/// # Ok(()) }
/// ```
pub async fn run(context: crate::operation_context::OperationContext, arguments: Vec<String>) -> Result<crate::operations::OperationResult, crate::operations::OperationError> {
    crate::operations::request(context, crate::cli::Command::Verify(VerificationArgs { arguments })).await
}
''';p.write_text(s)
# Typed deployment facades share the dispatch; no Router subprocess.
p=Path('src/deploy/operations.rs');p.write_text('''//! Deployment operation APIs share the CLI implementation and result schema.
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
pub fn plan(context: &OperationContext, arguments: &DeployArgs) -> Result<LocalPlan, String> {
    context.scope(|| {
        let (args, _, remote) = crate::deploy_cli::resolve(arguments)?;
        if remote { return Err("local plan received a remote target".into()); }
        let data = context.data_dir.clone().unwrap_or_else(crate::config::default_data_dir);
        let root = args.root.clone().unwrap_or_else(|| crate::deploy_cli::default_root(&data));
        let image = args.image.clone().unwrap_or_else(|| format!("ghcr.io/link-assistant/router:v{}", crate::VERSION));
        crate::deploy::immutable_ref(&image)?;
        Ok(LocalPlan { root, image, port:args.port(), mode: if args.mode == Some(DeployMode::Host) { "host" } else { "container" }.into() })
    })
}

/// Apply a deployment with typed options and dependencies.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// use link_assistant_router::{deploy::local, operation_context::OperationContext};
/// let result = local::apply(OperationContext::default(), args).await?;
/// assert!(result.success);
/// # Ok(()) }
/// ```
pub async fn apply(context: OperationContext, arguments: DeployArgs) -> Result<OperationResult, OperationError> {
    crate::operations::request(context, Command::Deploy(arguments)).await
}

/// Inspect deployment status using the same report as `deploy --status --json`.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// let report = link_assistant_router::deploy::local::status(Default::default(), args).await?;
/// assert_eq!(report.operation, "deploy");
/// # Ok(()) }
/// ```
pub async fn status(context: OperationContext, mut arguments: DeployArgs) -> Result<OperationResult, OperationError> {
    arguments.status = true;
    apply(context, arguments).await
}

/// Deploy directly as a supervised or unsupervised host process.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// link_assistant_router::deploy::host::apply(Default::default(), args).await?;
/// # Ok(()) }
/// ```
pub async fn host(context: OperationContext, mut arguments: DeployArgs) -> Result<OperationResult, OperationError> {
    arguments.mode = Some(DeployMode::Host);
    apply(context, arguments).await
}

/// Apply remote SSH settings through the existing bounded remote coordinator.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// link_assistant_router::deploy::remote::apply(Default::default(), args).await?;
/// # Ok(()) }
/// ```
pub async fn remote(context: OperationContext, mut arguments: DeployArgs) -> Result<OperationResult, OperationError> {
    arguments.settings.remote = true;
    apply(context, arguments).await
}

/// Rehearse a deployment in an isolated staging namespace.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// link_assistant_router::deploy::staging::apply(Default::default(), "rehearsal", args).await?;
/// # Ok(()) }
/// ```
pub async fn staging(context: OperationContext, namespace: &str, mut arguments: DeployArgs) -> Result<OperationResult, OperationError> {
    arguments.staging = Some(namespace.into());
    apply(context, arguments).await
}

/// Restore a checkpoint after the coordinator proves all writers have stopped.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::DeployArgs) -> Result<(), Box<dyn std::error::Error>> {
/// link_assistant_router::deploy::checkpoint::restore(Default::default(), args, "/tmp/checkpoint".as_ref(), false).await?;
/// # Ok(()) }
/// ```
pub async fn restore(context: OperationContext, mut arguments: DeployArgs, snapshot: &std::path::Path, replace: bool) -> Result<OperationResult, OperationError> {
    arguments.restore_state = Some(snapshot.into());
    arguments.replace_state = replace;
    apply(context, arguments).await
}
''')
p=Path('src/deploy.rs');s=p.read_text();s+='''
#[path = "deploy/operations.rs"]
mod operations;
/// Local deployment planning, convergence and status.
pub mod local { pub use super::operations::{LocalPlan, apply, plan, status}; }
/// Native host deployment.
pub mod host { pub use super::operations::host as apply; pub use super::operations::status; }
/// Remote SSH deployment.
pub mod remote { pub use super::operations::remote as apply; pub use super::operations::status; }
/// Isolated staging deployments.
pub mod staging { pub use super::operations::staging as apply; }
/// Logical deployment checkpoints, with secrets excluded and validated restore.
pub mod checkpoint {
    pub use super::operations::restore;
    pub use crate::deploy_local::capture_checkpoint as capture;
}
''';p.write_text(s)
p=Path('src/deploy_local.rs');s=p.read_text();s+='''
/// Capture a logical checkpoint, excluding OAuth credentials and preserving token records.
/// Individual files are consistent; callers needing a quiescent snapshot must stop writers.
/// ```no_run
/// # fn example() -> std::io::Result<()> {
/// let snapshot = link_assistant_router::deploy::checkpoint::capture("/tmp/router-deploy".as_ref(), &[], "signing-secret")?;
/// assert!(snapshot.join("manifest.json").exists());
/// # Ok(()) }
/// ```
pub fn capture_checkpoint(root: &Path, records: &[crate::storage::TokenRecord], secret: &str) -> std::io::Result<std::path::PathBuf> {
    data_backup::capture(root, records, secret)
}
''';p.write_text(s)
facades=[('src/auth/import.rs','auth import','AuthOp','Auth','Import', 'import'),('src/logs.rs','logs read','LogsOp','Logs',None,'read')]
Path('src/auth').mkdir(exist_ok=True)
for path,label,optype,family,variant,name in facades:
    Path(path).write_text(f'''//! Importable {label} operation.
/// Execute {label} with typed arguments and scoped dependencies.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::{optype}) -> Result<(), Box<dyn std::error::Error>> {{
/// let report = link_assistant_router::{"auth::import" if family=="Auth" else "logs"}::{name}(Default::default(), args).await?;
/// assert!(report.success);
/// # Ok(()) }}
/// ```
pub async fn {name}(context: crate::operation_context::OperationContext, op: crate::cli::{optype}) -> Result<crate::operations::OperationResult, crate::operations::OperationError> {{
    crate::operations::request(context, crate::cli::Command::{family} {{ op }}).await
}}
''')
p=Path('src/auth.rs');p.write_text(p.read_text()+'\n/// Provider-aware credential import operations.\npub mod import;\n')
p=Path('src/lib.rs');p.write_text(p.read_text()+'\n/// Importable request-log operations.\npub mod logs;\n')
p=Path('src/doctor.rs');s=p.read_text();s+='''
/// Return the complete doctor operation without printing or exiting.
/// ```no_run
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// let report = link_assistant_router::doctor::report(Default::default()).await?;
/// assert_eq!(report.operation, "doctor");
/// # Ok(()) }
/// ```
pub async fn report(context: crate::operation_context::OperationContext) -> Result<crate::operations::OperationResult, crate::operations::OperationError> {
    crate::operations::request(context, crate::cli::Command::Doctor { server: None, management_server: None, token: None }).await
}
''';p.write_text(s)
p=Path('src/admin.rs');s=p.read_text();s+='''
/// Recover a locally owned administrator, sharing `tokens recover-admin`.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::TokenOp) -> Result<(), Box<dyn std::error::Error>> {
/// link_assistant_router::admin::recover(Default::default(), args).await?;
/// # Ok(()) }
/// ```
pub async fn recover(context: crate::operation_context::OperationContext, op: crate::cli::TokenOp) -> Result<crate::operations::OperationResult, crate::operations::OperationError> {
    crate::operations::request(context, crate::cli::Command::Tokens { op }).await
}
''';p.write_text(s)
