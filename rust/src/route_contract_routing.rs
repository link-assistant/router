//! Routing inspection and runtime controls, shared by all management listeners.
use super::{RouteAuth, RouteId, RouteMethod, RouteSpec, management};

// Keep this entry at its published position in the parent inventory.
pub(super) const MODEL_DEFINITIONS: RouteSpec = management(
    RouteId::ModelDefinitions,
    RouteMethod::Get,
    "/api/management/routing/model-definitions/{channel}",
);

const fn config(id: RouteId, method: RouteMethod, path: &'static str) -> RouteSpec {
    RouteSpec {
        auth: match method {
            RouteMethod::Get => RouteAuth::ConfigRead,
            _ => RouteAuth::ConfigWrite,
        },
        ..management(id, method, path)
    }
}

const CONFIG_ROOT: &str = "/api/management/config";
const CONFIG_POINTER: &str = "/api/management/config/{*pointer}";

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
    config(RouteId::RuntimeConfig, RouteMethod::Get, CONFIG_ROOT),
    config(RouteId::RuntimeConfig, RouteMethod::Put, CONFIG_ROOT),
    config(RouteId::RuntimeConfig, RouteMethod::Patch, CONFIG_ROOT),
    config(
        RouteId::RuntimeConfigYaml,
        RouteMethod::Get,
        "/api/management/config.yaml",
    ),
    config(
        RouteId::RuntimeConfigSchema,
        RouteMethod::Get,
        "/api/management/config/schema",
    ),
    config(
        RouteId::RuntimeConfigStatus,
        RouteMethod::Get,
        "/api/management/config/status",
    ),
    config(
        RouteId::RuntimeConfigReload,
        RouteMethod::Post,
        "/api/management/config/reload",
    ),
    config(
        RouteId::RuntimeConfigPointer,
        RouteMethod::Get,
        CONFIG_POINTER,
    ),
    config(
        RouteId::RuntimeConfigPointer,
        RouteMethod::Put,
        CONFIG_POINTER,
    ),
    config(
        RouteId::RuntimeConfigPointer,
        RouteMethod::Delete,
        CONFIG_POINTER,
    ),
];
