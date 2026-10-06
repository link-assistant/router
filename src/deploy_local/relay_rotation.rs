//! Keep the front-door relay on the deployed Router image (issue #627).
//!
//! The relay runs the same image as the backend, so a backend update that
//! kept the old relay left relay protocol and security fixes behind while
//! status called the deployment converged. Docker cannot hand a published
//! port from one container to another, so the relay is rotated only when it
//! carries no established connection: waiting preserves every stream, and
//! exactly one relay ever publishes the listener. A connection attempted in
//! the sub-second gap between removal and the new relay's listener is refused
//! and retried by the client; it never reaches a second endpoint.

use super::state::Active;
use super::{Coordinator, RELAY};

#[cfg(not(test))]
const RELAY_IDLE_ATTEMPTS: usize = 120;
#[cfg(test)]
const RELAY_IDLE_ATTEMPTS: usize = 3;

#[derive(Debug, Eq, PartialEq)]
pub(super) enum Rotation {
    /// The relay already runs the active backend's image.
    Current,
    Rotated,
    /// Clients kept connections open for the whole idle window.
    Deferred {
        connections: u64,
    },
}

impl Coordinator<'_> {
    /// The relay's image reference when it runs other code than the active
    /// backend. Image ids decide: a second tag of the same image is not skew.
    pub(super) fn relay_skew(&self, active: &Active) -> Result<Option<String>, String> {
        if !self.docker.exists(&RELAY.value()) {
            return Ok(None);
        }
        let relay_id = self.docker.container_image_id(&RELAY.value())?;
        if relay_id == active.image_id {
            return Ok(None);
        }
        self.docker.image_ref(&RELAY.value()).map(Some)
    }

    /// Print both versions so mixed images are never reported as converged.
    pub(super) fn print_versions(&self, active: &Active) -> Result<bool, String> {
        println!(
            "backend_image={} image_id={}",
            active.image_ref, active.image_id
        );
        if self.docker.exists(&RELAY.value()) {
            println!(
                "relay_image={} image_id={}",
                self.docker.image_ref(&RELAY.value())?,
                self.docker.container_image_id(&RELAY.value())?
            );
        } else {
            println!("relay_image=absent");
        }
        let skew = self.relay_skew(active)?.is_some();
        println!("version_skew={skew}");
        Ok(!skew)
    }

    /// Wait for two consecutive zero observations, like a backend drain,
    /// but bounded: an always-busy relay defers instead of hanging.
    fn relay_idle(&self, backend: &str) -> Result<Result<(), u64>, String> {
        let mut zero_observations = 0_u8;
        let mut last = 0;
        for _ in 0..RELAY_IDLE_ATTEMPTS {
            last = self.connection_count(backend)?;
            if last == 0 {
                zero_observations = zero_observations.saturating_add(1);
                if zero_observations == 2 {
                    return Ok(Ok(()));
                }
            } else {
                zero_observations = 0;
            }
            #[cfg(not(test))]
            std::thread::sleep(std::time::Duration::from_secs(1));
        }
        Ok(Err(last))
    }

    /// Replace the relay with one on the active image once it is idle. A
    /// failed replacement restores the previous relay image.
    pub(super) fn rotate_relay(&self, active: &Active) -> Result<Rotation, String> {
        let Some(previous) = self.relay_skew(active)? else {
            return Ok(Rotation::Current);
        };
        if !self.docker.owned(&RELAY.value(), self.root, "relay") {
            return Err(format!("refusing to rotate unowned relay {RELAY}"));
        }
        println!(
            "relay_rotation=pending relay_image={previous} backend_image={}",
            active.image_ref
        );
        if let Err(connections) = self.relay_idle(&active.backend)? {
            if !self.force {
                println!(
                    "relay_rotation=deferred connections={connections} reason=established connections were never idle"
                );
                return Ok(Rotation::Deferred { connections });
            }
            println!("force_update accepted relay_rotation connections={connections}");
        }
        self.remove_relay()?;
        let origin = format!("http://{RELAY}:8080");
        let replaced = self
            .docker
            .run_relay(&active.image_ref, self.root, active.port)
            .and_then(|()| self.wait_healthy(&active.backend, &origin));
        if let Err(error) = replaced {
            self.remove_relay()?;
            self.docker.run_relay(&previous, self.root, active.port)?;
            self.wait_healthy(&active.backend, &origin)?;
            return Err(format!(
                "relay rotation failed and relay image {previous} was restored: {error}"
            ));
        }
        println!("relay_rotation=complete relay_image={}", active.image_ref);
        Ok(Rotation::Rotated)
    }

    /// Converge the relay after a backend change or on a no-op run.
    pub(super) fn converge_relay(&self, active: &Active) -> Result<Rotation, String> {
        let rotation = self.rotate_relay(active)?;
        if let Rotation::Deferred { connections } = rotation {
            return Err(format!(
                "{RELAY} still runs an older image because {connections} established connection(s) never became idle; rerun `router deploy` when clients are idle, or pass --force-update to interrupt them"
            ));
        }
        Ok(rotation)
    }
}
