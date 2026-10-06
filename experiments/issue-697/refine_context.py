from pathlib import Path
import re
p=Path('src/operation_context.rs');s=p.read_text();s=s.replace('current().map_or_else(\n        || std::env::var_os(name.as_ref()),\n        |context| context.environment.get(name.as_ref()).cloned(),\n    )','ACTIVE.try_with(|context| context.environment.get(name.as_ref()).cloned())\n        .unwrap_or_else(|_| std::env::var_os(name.as_ref()))')
a=s.index('/// Apply the scoped environment');s=s[:a]+'''/// Create a dependency command using the operation environment and directory.
/// A later explicit `env_clear()` remains authoritative (verification relies on it).
pub fn command(program: impl AsRef<OsStr>) -> Command {
    let mut command = Command::new(program);
    if let Some(context) = current() {
        command.env_clear().envs(&context.environment)
            .current_dir(&context.working_directory);
    }
    command
}

/// Execute an external dependency with the operation's finite deadline.
pub fn process_output(command: &mut Command) -> std::io::Result<Output> {
    let deadline = current().map_or(Duration::from_secs(60), |context| context.process_deadline);
    crate::bounded_process::output(command, deadline)
}
''';p.write_text(s)
p=Path('src/bounded_process.rs');s=p.read_text().replace('        crate::operation_context::configure_process(command, &context);\n','');p.write_text(s)
for p in Path('src').rglob('*.rs'):
    if p.name in ['operation_context.rs','bounded_process.rs']:continue
    s=p.read_text();s=s.replace('std::process::Command::new(', 'crate::operation_context::command(')
    if re.search(r'use std::process::(?:Command|\{[^}]*\bCommand\b)',s):
        s=re.sub(r'(?<![:\w])Command::new\(', 'crate::operation_context::command(',s)
        # Only standard process commands have output(); these files use no other output methods.
        if p.as_posix() in ['src/deploy_local/service.rs','src/deploy_local/host_runtime.rs','src/deploy/runtime.rs','src/client_lifecycle/maintenance.rs','src/managed_server/process.rs','src/managed_server/bootstrap.rs','src/managed_server/docker.rs']:
            # Balanced expression replacement for command-building chains.
            start=0
            while True:
                a=s.find('crate::operation_context::command(',start)
                if a<0:break
                b=s.find('.output()',a);end=s.find(';',a)
                if b<0 or (end>=0 and end<b):start=a+30;continue
                expr=s[a:b].rstrip();s=s[:a]+'crate::operation_context::process_output(&mut '+expr+')'+s[b+9:];start=a+len(expr)+50
    p.write_text(s)
p=Path('src/contracts.rs');s=p.read_text();expr='argument.get_id().as_str().contains("secret") || argument.get_id().as_str().contains("key")'
s=s.replace(expr+' || argument.get_id().as_str() == "token"','secret_option(argument.get_id().as_str())').replace(expr,'secret_option(argument.get_id().as_str())');s+='''
fn secret_option(name: &str) -> bool {
    matches!(name, "token" | "admin_token" | "token_secret" | "token_admin_key" |
        "api_key" | "openai_api_key" | "openai_compatible_api_key" | "github_token" |
        "anthropic_api_key" | "refresh_token" | "access_token")
}
''';p.write_text(s)
p=Path('src/deploy_cli.rs');s=p.read_text().replace('    if let Some(instance) = &merged.instance {\n        link_assistant_router::deploy::instance::select(instance)?;\n    }\n','');needle='    let (args, merged, remote) = match resolve(args)';a=s.index(needle);b=s.index('\n',s.index('    };',a))+1;s=s[:b]+'''    if let Some(instance) = &merged.instance {
        if let Err(error) = link_assistant_router::deploy::instance::select(instance) {
            eprintln!("error: {error}");
            return ExitCode::from(2);
        }
    }
'''+s[b:];p.write_text(s)
p=Path('src/deploy/operations.rs');s=p.read_text();s+='''
/// Inspect a host deployment using the host runtime.
pub async fn host_status(context: OperationContext, mut arguments: DeployArgs) -> Result<OperationResult, OperationError> {
    arguments.status = true;
    host(context, arguments).await
}
/// Inspect a remote deployment using the SSH coordinator.
pub async fn remote_status(context: OperationContext, mut arguments: DeployArgs) -> Result<OperationResult, OperationError> {
    arguments.status = true;
    remote(context, arguments).await
}
''';p.write_text(s)
p=Path('src/deploy.rs');s=p.read_text().replace('    pub use super::operations::status;\n}\n/// Remote','    pub use super::operations::host_status as status;\n}\n/// Remote').replace('    pub use super::operations::status;\n}\n/// Isolated','    pub use super::operations::remote_status as status;\n}\n/// Isolated');p.write_text(s)
