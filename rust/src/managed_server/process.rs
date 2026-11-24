//! Cross-platform liveness check for managed-server lease owners.

#[cfg(unix)]
use std::process::Stdio;

pub(super) fn process_alive(pid: u32) -> bool {
    if pid == std::process::id() {
        return true;
    }
    #[cfg(unix)]
    {
        crate::operation_context::process_output(
            crate::operation_context::command("kill")
                .args(["-0", &pid.to_string()])
                .stdout(Stdio::null())
                .stderr(Stdio::null()),
        )
        .is_ok_and(|output| output.status.success())
    }
    #[cfg(windows)]
    {
        crate::operation_context::process_output(
            &mut crate::operation_context::command("tasklist").args([
                "/FI",
                &format!("PID eq {pid}"),
                "/NH",
            ]),
        )
        .is_ok_and(|output| {
            output.status.success()
                && String::from_utf8_lossy(&output.stdout).contains(&pid.to_string())
        })
    }
}
