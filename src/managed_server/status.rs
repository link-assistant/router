//! Structured selection and managed lifecycle facts behind `server status`.
use super::{AnyError, CONTAINER, VOLUME};
use crate::operation_reports::{ManagedServerStatus, ServerSelection};

pub async fn selection() -> Result<(ServerSelection, String), AnyError> {
    for name in ["LINK_ASSISTANT_ROUTER_URL", "ROUTER_URL"] {
        if let Ok(value) = crate::operation_context::var(name) {
            let url = super::normalize_server(&value)?;
            return Ok((
                ServerSelection {
                    source: "environment".into(),
                    url: Some(url.clone()),
                    token_configured: crate::operation_context::var("LINK_ASSISTANT_ROUTER_TOKEN")
                        .or_else(|_| crate::operation_context::var("LINK_ASSISTANT_TOKEN"))
                        .is_ok(),
                },
                format!("environment: {url}"),
            ));
        }
    }
    if let Some(config) = super::load_persisted()? {
        let url = super::normalize_server(&config.server)?;
        let token_configured = config.token.is_some();
        return Ok((
            ServerSelection {
                source: "persisted".into(),
                url: Some(url.clone()),
                token_configured,
            },
            format!(
                "persisted: {url} (token {})",
                if token_configured { "set" } else { "unset" }
            ),
        ));
    }
    if let Some(url) = super::discover_local_router(false).await {
        return Ok((
            ServerSelection {
                source: "discovered".into(),
                url: Some(url.clone()),
                token_configured: crate::operation_context::var("LINK_ASSISTANT_ROUTER_TOKEN")
                    .or_else(|_| crate::operation_context::var("LINK_ASSISTANT_TOKEN"))
                    .is_ok(),
            },
            format!("already-running local server: {url}"),
        ));
    }
    Ok((
        ServerSelection {
            source: "managed".into(),
            url: None,
            token_configured: false,
        },
        "managed local container".into(),
    ))
}

pub fn managed() -> Result<(ManagedServerStatus, String), AnyError> {
    let lock = super::lock_state()?;
    let mut state = super::load_managed()?;
    if let Some(state) = state.as_mut() {
        super::prune_references(state);
        super::save_managed(state)?;
    }
    drop(lock);
    let (lifecycle, detail) = match super::docker_container_state() {
        Ok(state) => (state, None),
        Err(error) => ("unavailable".into(), Some(error.to_string())),
    };
    let report = ManagedServerStatus {
        present: state.is_some(),
        state: lifecycle.clone(),
        detail: detail.clone(),
        container: CONTAINER.into(),
        volume: VOLUME.into(),
        url: state
            .as_ref()
            .map(|state| format!("http://127.0.0.1:{}", state.port)),
        administrator_claimed: state.as_ref().is_some_and(|state| state.claimed),
        users: state.as_ref().map_or(0, |state| state.references.len()),
        keep_running: state.as_ref().is_some_and(|state| state.keep_running),
    };
    let human = match state {
        Some(state) => {
            let subscriptions = if lifecycle == "running" {
                super::docker_subscription_status()
            } else {
                "not queried while stopped".into()
            };
            let lifecycle = detail.map_or(lifecycle, |detail| format!("unavailable ({detail})"));
            format!(
                "{lifecycle}; administrator={}; container={CONTAINER}; volume={VOLUME}; url=http://127.0.0.1:{}; users={}; subscriptions={subscriptions}",
                if state.claimed {
                    "claimed"
                } else {
                    "unclaimed"
                },
                state.port,
                state.references.len()
            )
        }
        None => format!("absent; container={CONTAINER}; volume={VOLUME}"),
    };
    Ok((report, human))
}
