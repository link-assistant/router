//! Stopping the server when it is asked to, rather than when it is killed.
//!
//! Only `ctrl_c` was awaited, so `SIGTERM` -- what `docker stop`, Kubernetes
//! and systemd all send -- reached no handler. As PID 1 in a container the
//! kernel applies no default action either, so the signal was silently
//! discarded and every stop waited out the full grace period before a
//! `SIGKILL`, severing any in-flight stream at the timeout rather than allowing
//! it to finish (issue #334).
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit.

/// A shutdown notice that every listener can await.
///
/// The signal has to reach every primary listener, HTTPS, the admin UI, and the
/// unix socket. A watch value fans it out and also stays set when a signal lands
/// during startup, before every server has constructed its wait future.
#[derive(Clone)]
pub struct Shutdown(tokio::sync::watch::Sender<bool>);

impl Shutdown {
    /// Start listening for the signals that ask this process to stop.
    pub fn listening() -> Self {
        let (sender, _) = tokio::sync::watch::channel(false);
        let notifier = sender.clone();
        tokio::spawn(async move {
            shutdown_signal().await;
            notifier.send_replace(true);
        });
        Self(sender)
    }

    /// A future that resolves when the process should stop serving.
    pub fn notified(&self) -> impl std::future::Future<Output = ()> + Send + 'static {
        let mut receiver = self.0.subscribe();
        async move {
            let already_notified = *receiver.borrow();
            if !already_notified {
                // A closed sender means the process is already stopping, so
                // that outcome must release a listener too.
                let _ = receiver.changed().await;
            }
        }
    }

    #[cfg(test)]
    fn idle() -> Self {
        let (sender, _) = tokio::sync::watch::channel(false);
        Self(sender)
    }

    #[cfg(test)]
    fn trigger(&self) {
        self.0.send_replace(true);
    }
}

async fn shutdown_signal() {
    let interrupt = async {
        if tokio::signal::ctrl_c().await.is_err() {
            // A handler that cannot be installed must not take the process
            // down with it: the other signal may still arrive, and an
            // unstoppable router is worse than one that stops on one signal.
            std::future::pending::<()>().await;
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut signal) => {
                signal.recv().await;
            }
            Err(error) => {
                tracing::warn!("could not listen for SIGTERM: {error}");
                std::future::pending::<()>().await;
            }
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    let name = tokio::select! {
        () = interrupt => "SIGINT",
        () = terminate => "SIGTERM",
    };
    tracing::info!("{name} received; draining in-flight requests before exit");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn a_startup_signal_remains_visible_to_late_listener_futures() {
        let shutdown = Shutdown::idle();
        shutdown.trigger();

        tokio::time::timeout(std::time::Duration::from_millis(50), shutdown.notified())
            .await
            .expect("a signal received during startup must not be lost");
    }
}
