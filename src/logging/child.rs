//! Wait for an interactive child while forwarding process shutdown signals.
use std::process::ExitStatus;
use std::time::Duration;

pub async fn supervise(
    child: &mut tokio::process::Child,
    shutdown: impl std::future::Future<Output = &'static str>,
) -> Result<ExitStatus, Box<dyn std::error::Error + Send + Sync>> {
    let pid = child.id();
    let status = tokio::select! {
        result = child.wait() => result?,
        signal = shutdown => {
            #[cfg(unix)]
            if let Some(pid) = pid {
                let _ = crate::operation_context::process_output(
                    crate::operation_context::command("kill")
                        .args([if signal == "SIGTERM" { "-TERM" } else { "-INT" }, &pid.to_string()])
                        .stdout(std::process::Stdio::null())
                        .stderr(std::process::Stdio::null()),
                );
            }
            #[cfg(windows)]
            child.start_kill()?;
            if let Ok(result) = tokio::time::timeout(Duration::from_secs(5), child.wait()).await {
                result?
            } else {
                super::event(format_args!("client_forced_termination child_pid={pid:?} after={signal}"));
                child.start_kill()?;
                child.wait().await?
            }
        }
    };
    super::child_exit("client", pid, status);
    Ok(status)
}
