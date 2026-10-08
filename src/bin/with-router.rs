//! Standalone entry point for the temporary router client wrapper.

use std::process::ExitCode;

use link_assistant_router::cli::WithArgs;
use lino_arguments::Parser as LinoParser;

#[derive(Debug, LinoParser)]
#[command(
    name = "with-router",
    version,
    about = "Run or permanently configure an agentic CLI against Link.Assistant.Router"
)]
struct Args {
    #[command(flatten)]
    with: WithArgs,
    /// Mirror operational diagnostics to stderr and enable debug tracing.
    #[arg(long, env = "VERBOSE", value_parser = clap::builder::BoolishValueParser::new())]
    verbose: bool,
    /// Persistent Router data, including operational logs.
    #[arg(long, env = "DATA_DIR")]
    data_dir: Option<std::path::PathBuf>,
}

#[tokio::main]
async fn main() -> ExitCode {
    lino_arguments::init();
    let arguments =
        link_assistant_router::cli::protect_client_arguments(std::env::args_os().collect(), false);
    let boundary = arguments
        .iter()
        .position(|argument| argument == "--")
        .unwrap_or(arguments.len());
    if arguments[..boundary]
        .iter()
        .any(|argument| argument == "--json")
    {
        let nested = std::iter::once("router".into())
            .chain(std::iter::once("with".into()))
            .chain(arguments.into_iter().skip(1))
            .collect();
        return link_assistant_router::operations::run_arguments(nested).await;
    }
    let args = <Args as lino_arguments::Parser>::parse_from(arguments);
    let data_dir = args
        .data_dir
        .unwrap_or_else(link_assistant_router::config::default_data_dir);
    link_assistant_router::logging::run_launcher(&args.with, &data_dir, args.verbose).await
}
