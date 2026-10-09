//! Routing inspection and runtime controls, shared by all management listeners.
use super::{RouteId, RouteMethod, RouteSpec, management};

// Keep this entry at its published position in the parent inventory.
pub(super) const MODEL_DEFINITIONS: RouteSpec = management(
    RouteId::ModelDefinitions,
    RouteMethod::Get,
    "/api/management/routing/model-definitions/{channel}",
);

pub(super) const ROUTES: &[RouteSpec] = &[
    management(
        RouteId::Routing,
        RouteMethod::Patch,
        "/api/management/routing",
    ),
    management(
        RouteId::CooldownReset,
        RouteMethod::Post,
        "/api/management/routing/cooldown/reset",
    ),
];
