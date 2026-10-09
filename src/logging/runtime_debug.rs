//! Reloadable tracing directives with a bounded, generation-safe debug lease.
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use tracing_subscriber::{EnvFilter, Registry, reload};

pub static CONTROL: OnceLock<Arc<RuntimeDebug>> = OnceLock::new();

pub struct RuntimeDebug {
    handle: reload::Handle<EnvFilter, Registry>,
    baseline: String,
    generation: Mutex<u64>,
}

impl RuntimeDebug {
    pub(crate) fn new(handle: reload::Handle<EnvFilter, Registry>, baseline: String) -> Arc<Self> {
        Arc::new(Self {
            handle,
            baseline,
            generation: Mutex::new(0),
        })
    }

    pub(crate) fn set(
        self: &Arc<Self>,
        enabled: bool,
        ttl: Duration,
        audit: Arc<crate::audit::AuditLog>,
    ) -> Result<(), String> {
        let mut generation = self
            .generation
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let filter = if enabled {
            EnvFilter::new("debug")
        } else {
            EnvFilter::new(&self.baseline)
        };
        self.handle
            .reload(filter)
            .map_err(|error| error.to_string())?;
        *generation = generation.wrapping_add(1);
        let current = *generation;
        let ttl_secs = if enabled { ttl.as_secs() } else { 0 };
        audit.record_logging_change(enabled, "operator", ttl_secs);
        super::process::event(format_args!(
            "runtime_logging_changed debug={enabled} ttl_secs={ttl_secs}"
        ));
        drop(generation);
        if enabled {
            let control = Arc::clone(self);
            tokio::spawn(async move {
                tokio::time::sleep(ttl).await;
                let mut generation = control
                    .generation
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner);
                if *generation != current {
                    return;
                }
                match control.handle.reload(EnvFilter::new(&control.baseline)) {
                    Ok(()) => {
                        *generation = generation.wrapping_add(1);
                        audit.record_logging_change(false, "ttl_expired", 0);
                        super::process::event(format_args!(
                            "runtime_debug_reverted reason=ttl_expired"
                        ));
                    }
                    Err(error) => tracing::error!("runtime debug logging revert failed: {error}"),
                }
                drop(generation);
            });
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tracing_subscriber::prelude::*;

    #[tokio::test(start_paused = true)]
    async fn debug_reverts_to_original_directives_and_old_timer_cannot_revert_new_toggle() {
        let root = tempfile::tempdir().unwrap();
        let audit_path = root.path().join("audit.jsonl");
        let audit = Arc::new(crate::audit::AuditLog::to_path(audit_path.to_str()));
        let baseline = "warn,link_assistant_router=info";
        let (layer, handle) = reload::Layer::new(EnvFilter::new(baseline));
        let _subscriber = tracing_subscriber::registry().with(layer);
        let control = RuntimeDebug::new(handle, baseline.into());
        control
            .set(true, Duration::from_secs(10), Arc::clone(&audit))
            .unwrap();
        tokio::task::yield_now().await;
        assert_eq!(
            control.handle.with_current(ToString::to_string).unwrap(),
            "debug"
        );
        tokio::time::advance(Duration::from_secs(5)).await;
        control
            .set(true, Duration::from_secs(20), Arc::clone(&audit))
            .unwrap();
        tokio::task::yield_now().await;
        tokio::time::advance(Duration::from_secs(5)).await;
        tokio::task::yield_now().await;
        assert_eq!(
            control.handle.with_current(ToString::to_string).unwrap(),
            "debug"
        );
        tokio::time::advance(Duration::from_secs(15)).await;
        tokio::task::yield_now().await;
        assert_eq!(
            control.handle.with_current(ToString::to_string).unwrap(),
            EnvFilter::new(baseline).to_string()
        );
        let records = std::fs::read_to_string(&audit_path).unwrap();
        assert_eq!(records.lines().count(), 3);
        assert!(records.contains("ttl_expired"));
        control
            .set(true, Duration::from_secs(10), Arc::clone(&audit))
            .unwrap();
        control.set(false, Duration::from_secs(10), audit).unwrap();
        assert_eq!(
            control.handle.with_current(ToString::to_string).unwrap(),
            EnvFilter::new(baseline).to_string()
        );
    }
}
