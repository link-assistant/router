//! Deadlines and process ownership for diagnostic commands.

use std::io::{Read, Result};
use std::process::{Command, ExitStatus, Output, Stdio};
use std::time::{Duration, Instant};

#[cfg(not(windows))]
struct Owned(std::process::Child);
#[cfg(windows)]
struct Owned(Box<dyn process_wrap::std::ChildWrapper>);

impl Owned {
    fn try_wait(&mut self) -> Result<Option<ExitStatus>> {
        #[cfg(not(windows))]
        return self.0.try_wait();
        #[cfg(windows)]
        // Keep the job for termination, but poll its leader directly. The
        // wrapper's polling consumes completion-port notifications that a
        // subsequent job wait may require, even after the leader has exited.
        self.0.inner_mut().try_wait()
    }

    fn spawn(command: &mut Command) -> Result<Self> {
        #[cfg(not(windows))]
        return command.spawn().map(Self);
        #[cfg(windows)]
        {
            use process_wrap::std::{CommandWrap, JobObject};
            let mut wrapped = CommandWrap::from(std::mem::replace(command, Command::new("")));
            let child = wrapped.wrap(JobObject).spawn();
            *command = wrapped.into_command();
            child.map(Self)
        }
    }

    #[cfg(not(windows))]
    const fn pipes(&mut self) -> (std::process::ChildStdout, std::process::ChildStderr) {
        (
            self.0.stdout.take().expect("piped stdout"),
            self.0.stderr.take().expect("piped stderr"),
        )
    }
    #[cfg(windows)]
    fn pipes(&mut self) -> (std::process::ChildStdout, std::process::ChildStderr) {
        (
            self.0.stdout().take().expect("piped stdout"),
            self.0.stderr().take().expect("piped stderr"),
        )
    }
}

impl Drop for Owned {
    fn drop(&mut self) {
        // A dedicated group includes wrappers and their vendor grandchildren.
        #[cfg(unix)]
        let _ = Command::new("/bin/kill")
            .args(["-KILL", "--", &format!("-{}", self.0.id())])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
        #[cfg(not(windows))]
        {
            let _ = self.0.kill();
            let _ = self.0.wait();
        }
        #[cfg(windows)]
        {
            // Terminate the whole job, then reap the leader without waiting
            // indefinitely for a possibly already consumed job notification.
            let _ = self.0.start_kill();
            let _ = self.0.inner_mut().wait();
        }
    }
}

fn drain(mut reader: impl Read) -> Result<Vec<u8>> {
    let mut saved = Vec::new();
    let mut bytes = [0; 8192];
    loop {
        let read = reader.read(&mut bytes)?;
        if read == 0 {
            return Ok(saved);
        }
        // Keep draining after the cap, so a noisy child never blocks its pipes.
        let remaining = (8 * 1024 * 1024_usize).saturating_sub(saved.len());
        saved.extend_from_slice(&bytes[..read.min(remaining)]);
    }
}

/// Run a diagnostic with a deadline, draining both pipes concurrently.
/// Terminate the owned Unix process group or Windows job on every exit path.
pub fn output(command: &mut Command, deadline: Duration) -> Result<Output> {
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt as _;
        command.process_group(0);
    }
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = Owned::spawn(command)?;
    let (stdout, stderr) = child.pipes();
    let stdout = std::thread::spawn(move || drain(stdout));
    let stderr = std::thread::spawn(move || drain(stderr));
    let end = Instant::now() + deadline;
    let status = loop {
        if let Some(status) = child.try_wait()? {
            break Some(status);
        }
        if Instant::now() >= end {
            break None;
        }
        std::thread::sleep(Duration::from_millis(20));
    };
    drop(child);
    let stdout = stdout
        .join()
        .map_err(|_| std::io::Error::other("stdout reader failed"))??;
    let stderr = stderr
        .join()
        .map_err(|_| std::io::Error::other("stderr reader failed"))??;
    let status = status.ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::TimedOut, "diagnostic deadline exceeded")
    })?;
    Ok(Output {
        status,
        stdout,
        stderr,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(windows)]
    fn windows_fast_exit_retains_status_and_output_without_a_second_job_wait() {
        let start = Instant::now();
        for _ in 0..8 {
            let result = output(
                Command::new("cmd.exe").args(["/D", "/C", "echo complete & exit /B 17"]),
                Duration::from_secs(1),
            )
            .unwrap();
            assert_eq!(result.status.code(), Some(17));
            assert!(String::from_utf8_lossy(&result.stdout).contains("complete"));
        }
        assert!(start.elapsed() < Duration::from_secs(10));
    }

    #[test]
    #[cfg(windows)]
    fn windows_job_terminates_a_descendant_holding_the_pipes() {
        let start = Instant::now();
        let error = output(
            Command::new("powershell.exe").args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "& cmd.exe /D /S /C 'ping -n 31 127.0.0.1 >nul'",
            ]),
            Duration::from_secs(2),
        )
        .unwrap_err();
        assert_eq!(error.kind(), std::io::ErrorKind::TimedOut);
        assert!(start.elapsed() < Duration::from_secs(6));
    }

    #[test]
    #[cfg(unix)]
    fn a_stalled_grandchild_cannot_keep_output_collection_alive() {
        let start = Instant::now();
        let error = output(
            Command::new("sh").args(["-c", "sleep 30 & wait"]),
            Duration::from_millis(100),
        )
        .unwrap_err();
        assert_eq!(error.kind(), std::io::ErrorKind::TimedOut);
        assert!(start.elapsed() < Duration::from_secs(2));
    }

    #[test]
    #[cfg(unix)]
    fn both_pipes_are_drained_before_waiting_for_exit() {
        let result = output(
            Command::new("sh").args([
                "-c",
                "head -c 100000 /dev/zero; head -c 100000 /dev/zero >&2",
            ]),
            Duration::from_secs(5),
        )
        .unwrap();
        assert!(result.status.success());
        assert_eq!(result.stdout.len(), 100_000);
        assert_eq!(result.stderr.len(), 100_000);
    }
}
