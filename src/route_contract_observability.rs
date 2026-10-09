//! Admin-only observability routes, shared by all management listeners.
use super::{RouteId, RouteMethod, RouteSpec, management};

pub(super) const ROUTES: &[RouteSpec] = &[
    management(
        RouteId::RequestLog,
        RouteMethod::Get,
        "/api/management/logs/requests/{id}",
    ),
    management(
        RouteId::ErrorLogs,
        RouteMethod::Get,
        "/api/management/logs/errors",
    ),
    management(
        RouteId::ErrorLog,
        RouteMethod::Get,
        "/api/management/logs/errors/{name}",
    ),
    management(
        RouteId::ClearLogs,
        RouteMethod::Delete,
        "/api/management/logs",
    ),
    management(
        RouteId::Logging,
        RouteMethod::Patch,
        "/api/management/logging",
    ),
    management(
        RouteId::UsageQueue,
        RouteMethod::Get,
        "/api/management/usage/queue",
    ),
    management(
        RouteId::LatestVersion,
        RouteMethod::Get,
        "/api/management/server/latest-version",
    ),
];
