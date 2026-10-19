// Shared adapter for both Router binary names. Business logic is in the library.
use std::process::ExitCode;

fn main() -> ExitCode {
    link_assistant_router::entrypoint::run_on_a_deep_stack(
        link_assistant_router::runtime::run_from_environment,
    )
}
