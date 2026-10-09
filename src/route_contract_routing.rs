//! Runtime routing controls, shared by all management listeners.
use super::{RouteId, RouteMethod, RouteSpec, management};

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
