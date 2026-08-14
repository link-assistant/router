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
}

#[tokio::main]
async fn main() -> ExitCode {
    lino_arguments::init();
    let arguments =
        link_assistant_router::cli::protect_client_arguments(std::env::args_os().collect(), false);
    let args = <Args as lino_arguments::Parser>::parse_from(arguments);
    link_assistant_router::with_command::run(&args.with).await
}
