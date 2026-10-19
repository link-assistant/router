//! Process modes that run before ordinary CLI dispatch.
use std::process::ExitCode;

/// Run daemon modes or the human/JSON CLI adapter.
pub async fn run_from_environment() -> ExitCode {
    let daemon = crate::operation_context::var_os(crate::deploy_relay::STATE_ENV).is_some()
        || crate::operation_context::var_os("LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE")
            .is_some();
    if daemon {
        crate::logging::run(
            &crate::config::default_data_dir(),
            false,
            "daemon",
            Vec::new(),
            true,
            Box::pin(run_inner()),
        )
        .await
    } else {
        run_inner().await
    }
}

/// Run the process adapter, including daemon modes.
async fn run_inner() -> ExitCode {
    match link_assistant_router::deploy_relay::run_from_env().await {
        Ok(Some(())) => return ExitCode::SUCCESS,
        Ok(None) => {}
        Err(error) => {
            eprintln!("error: {error}");
            return ExitCode::from(1);
        }
    }
    match link_assistant_router::codex_loopback_bridge::daemon_request_from_env() {
        Ok(Some(request)) => {
            return match link_assistant_router::codex_loopback_bridge::run_persistent_daemon(
                request,
            )
            .await
            {
                Ok(()) => ExitCode::SUCCESS,
                Err(error) => {
                    eprintln!("error: {error}");
                    ExitCode::from(1)
                }
            };
        }
        Ok(None) => {}
        Err(error) => {
            eprintln!("error: {error}");
            return ExitCode::from(1);
        }
    }
    let arguments =
        link_assistant_router::cli::protect_client_arguments(std::env::args_os().collect(), true);
    crate::operations::run_arguments(arguments).await
}
