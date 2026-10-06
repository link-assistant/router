from pathlib import Path
p=Path('src/main.rs'); s=p.read_text(); a=s.index('\nmod auth_cli;'); b=s.index('\nuse axum',a); mods=s[a:b]; s=s[:a]+'\nuse crate::{auth_cli, bin_doctor, deploy_cli, logs_cli, recover_admin_cli, shutdown};\n'+s[b:]; a=s.index('\nfn main()'); b=s.index('\nasync fn run()',a); s=s[:a]+s[b:]; s=s.replace('async fn run() -> ExitCode {','/// Run the process adapter, including daemon modes.\npub async fn run_from_environment() -> ExitCode {',1)
a=s.index('    let cli = link_assistant_router::cli::parse_arguments(arguments);'); b=a+len('    let cli = link_assistant_router::cli::parse_arguments(arguments);'); s=s[:a]+'''    crate::operations::run_arguments(arguments).await
}

/// Execute a parsed request without spawning the Router binary.
pub async fn dispatch(cli: crate::cli::Cli) -> ExitCode {
'''+s[b:]
s=s.replace('    link_assistant_router::logging::init(verbose);\n', '')
s=s.replace('tracing::error!("Configuration error: {e}");','eprintln!("Configuration error: {e}");')
s=s.replace('        Some(Command::With(args)) => {', '''        Some(Command::Version) => {
            crate::operation_output::record(serde_json::json!({"version": crate::VERSION, "source_commit": crate::SOURCE_COMMIT}));
            println!("router {} ({})", crate::VERSION, crate::SOURCE_COMMIT);
            return ExitCode::SUCCESS;
        }
        Some(Command::Contracts) => {
            println!("{}", crate::contracts::document());
            return ExitCode::SUCCESS;
        }
        Some(Command::Verify(args)) => return crate::verification::run_cli(args.arguments.clone()),
        Some(Command::With(args)) => {''',1)
s=s.replace('            | Command::Tunnel(_),','            | Command::Tunnel(_)\n            | Command::Version\n            | Command::Contracts\n            | Command::Verify(_),',1)
Path('src/runtime.rs').write_text(s)
p.write_text('''// Shared adapter for both Router binary names. Business logic is in the library.
use std::process::ExitCode;

fn main() -> ExitCode {
    link_assistant_router::entrypoint::run_on_a_deep_stack(
        link_assistant_router::runtime::run_from_environment,
    )
}
''')
p=Path('src/lib.rs'); s=p.read_text(); a=s.index('pub mod account_http;'); s=s[:a]+'''// Existing renderers use these scoped sinks. A library operation captures them;
// the human CLI adapter renders normally. No global stdout redirection is used.
#[macro_use]
mod operation_output;
extern crate self as link_assistant_router;

pub mod operation_context;
pub mod operations;
pub mod contracts;
pub mod runtime;
pub mod verification;
'''+s[a:];
for name in ['auth_cli','auth_import','bin_doctor','deploy_cli','deploy_image','deploy_local','deploy_remote','logs_cli','recover_admin_cli','shutdown']:
 s += f'\n/// Shared operational implementation for `{name}`.\npub mod {name};\n'
s+='\n/// Source commit embedded at build time.\npub const SOURCE_COMMIT: &str = env!("ROUTER_SOURCE_COMMIT");\n';p.write_text(s)
# Move parser helpers out of the already-full CLI source before adding commands.
p=Path('src/cli.rs'); s=p.read_text(); a=s.index('/// Parse the CLI'); b=s.index('/// Top-level CLI parser.',a); parser=s[a:b]; parser=parser.replace('pub fn parse_arguments(arguments: Vec<std::ffi::OsString>) -> Cli {','pub fn try_parse_arguments(arguments: Vec<std::ffi::OsString>) -> Result<Cli, clap::Error> {').replace('let matches = command.get_matches_from(arguments);','let matches = command.try_get_matches_from(arguments)?;').replace('let mut cli = Cli::from_arg_matches(&matches).unwrap_or_else(|error| error.exit());','let mut cli = Cli::from_arg_matches(&matches)?;').replace('    cli\n}', '    Ok(cli)\n}',1)
Path('src/cli/parsing.rs').write_text('//! Shared fallible argument parser.\nuse super::{Cli, Command};\n\n'+parser+'''/// Parse human CLI arguments, retaining Clap's established help/error behavior.
pub fn parse_arguments(arguments: Vec<std::ffi::OsString>) -> Cli {
    try_parse_arguments(arguments).unwrap_or_else(|error| error.exit())
}
''')
s=s[:a]+'''mod parsing;
pub use parsing::{parse_arguments, try_parse_arguments};

'''+s[b:]; s=s.replace('pub enum Command {','''pub enum Command {
    /// Report package version and immutable source commit.
    Version,
    /// Print the canonical operation, schema and HTTP contract catalog.
    Contracts,
    /// Run Router-owned verification areas (arguments follow --).
    Verify(crate::verification::VerificationArgs),'''); p.write_text(s)
# Move verification implementation into the crate. Keep rust-script as adapter.
s=Path('scripts/verify-contracts.rs').read_text(); a=s.index('use serde_json'); s=s[a:]; s=s.replace('use std::process::{Command, exit};','use std::process::{Command, ExitCode};'); a=s.index('#[path = "../src/bounded_process.rs"]'); b=s.index('const SCHEMA:',a); s=s[:a]+'use crate::{bounded_process, verification_client};\n\n'+s[b:]; s=s.replace('unit(&["--bin", "router"], "deploy_local")','unit(&["--lib"], "deploy_local")').replace('unit(&["--bin", "router"], "deploy_remote")','unit(&["--lib"], "deploy_remote")'); s=s.replace('fn usage() -> ! {', 'fn usage() -> ExitCode {').replace('    exit(2);\n}', '    ExitCode::from(2)\n}',1)
s=s.replace('fn main() {','''/// Verification adapter shared by the CLI and importable API.
pub fn run_cli(arguments: Vec<String>) -> ExitCode {''',1).replace('let mut args = std::env::args().skip(1);','let mut args = arguments.into_iter();').replace('args.next().unwrap_or_else(|| usage())','match args.next() { Some(value) => value, None => return usage() }').replace('_ => usage(),','_ => return usage(),').replace('                return;','                return ExitCode::SUCCESS;').replace('            usage();', '            return usage();');
import re
s=re.sub(r'(?m)^(\s*)exit\((\d)\);',r'\1return ExitCode::from(\2);',s)
a=s.index('\n#[cfg(test)]\nmod tests'); s=s[:a].rstrip(); s += '\n    PLACEHOLDER' if False else ''; # closing run_cli needs success
pos=s.rfind('\n}')
s=s[:pos]+'\n    crate::operation_output::record(result);\n    ExitCode::SUCCESS\n'+s[pos:]
# Keep original unit tests in a child file so both files remain under 1000 lines.
old=Path('scripts/verify-contracts.rs').read_text(); a=old.index('#[cfg(test)]\nmod tests'); tests=old[a:]; Path('src/verification_tests.rs').write_text(tests[tests.index('    use super::*;'):].rsplit('\n}',1)[0].replace('    use super::*;', 'use super::*;',1))
s+='\n#[cfg(test)]\n#[path="verification_tests.rs"]\nmod tests;\n'
s='''//! Importable Router-owned verification; never launches the Router binary.

/// Arguments accepted by the verification command.
#[derive(clap::Args, Debug)]
pub struct VerificationArgs {
    /// Arguments to the Router verification harness.
    #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
    pub arguments: Vec<String>,
}

'''+s
Path('src/verification.rs').write_text(s)
Path('scripts/verify-contracts.rs').write_text('''#!/usr/bin/env rust-script
//! Run the same verification implementation as the library/CLI.
//! ```cargo
//! [dependencies]
//! link-assistant-router = { path = ".." }
//! ```
fn main() -> std::process::ExitCode {
    link_assistant_router::verification::run_cli(std::env::args().skip(1).collect())
}
''')
