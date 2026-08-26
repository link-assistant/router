//! Stopping the server when it is asked to, rather than when it is killed.
//!
//! Only `ctrl_c` was awaited, so `SIGTERM` -- what `docker stop`, Kubernetes
//! and systemd all send -- reached no handler. As PID 1 in a container the
//! kernel applies no default action either, so the signal was silently
//! discarded and every stop waited out the full grace period before a
//! `SIGKILL`: 30 seconds to shut down an idle deployment, and any in-flight
//! stream severed at the timeout rather than allowed to finish (issue #334).
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit.

/// A shutdown notice that every listener can await.
///
/// The signal has to reach four listeners -- HTTP, HTTPS, the admin UI and the
/// unix socket -- and a future can only be awaited once, so it fans out over a
/// broadcast channel rather than being consumed by whichever listener got it
/// first (issue #334).
#[derive(Clone)]
pub struct Shutdown(tokio::sync::broadcast::Sender<()>);

impl Shutdown {
    /// Start listening for the signals that ask this process to stop.
    pub fn listening() -> Self {
        let (sender, _) = tokio::sync::broadcast::channel(1);
        let notifier = sender.clone();
        tokio::spawn(async move {
            shutdown_signal().await;
            // A send fails only when nothing is listening, which means every
            // listener has already stopped.
            let _ = notifier.send(());
        });
        Self(sender)
    }

    /// A future that resolves when the process should stop serving.
    pub fn notified(&self) -> impl std::future::Future<Output = ()> + Send + 'static {
        let mut receiver = self.0.subscribe();
        async move {
            // `Err` means the sender is gone, which cannot happen while the
            // process is running -- treat it as a shutdown either way rather
            // than leaving a listener awaiting a notice that will never come.
            let _ = receiver.recv().await;
        }
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
