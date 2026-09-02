//! Mapping an inbound request path to its upstream path.
//!
//! Split from `proxy.rs` to keep that file within the repository's 1000-line
//! limit.

/// Resolve the upstream path from the incoming request path.
///
/// Maps all supported API format paths to the correct upstream path:
/// - `/v1/messages` -> `/v1/messages` (Anthropic Messages)
/// - `/v1/messages/count_tokens` -> `/v1/messages/count_tokens` (Anthropic Messages)
/// - `/invoke` -> `/invoke` (Bedrock)
/// - `/invoke-with-response-stream` -> `/invoke-with-response-stream` (Bedrock)
/// - Paths ending in `:rawPredict` or `:streamRawPredict` -> pass through (Vertex)
/// - `/api/latest/anthropic/*` -> `/*` (legacy)
#[must_use]
pub fn resolve_upstream_path(path: &str) -> String {
    if let Some(rest) = path.strip_prefix("/api/services/anthropic") {
        return rest.to_string();
    }
    if let Some(rest) = path.strip_prefix("/api/services/bedrock") {
        return rest.to_string();
    }
    if let Some(rest) = path.strip_prefix("/api/services/vertex") {
        return rest.to_string();
    }
    if let Some(rest) = path.strip_prefix("/api/anthropic") {
        return rest.to_string();
    }
    // Legacy prefix: strip and forward
    if let Some(rest) = path.strip_prefix("/api/latest/anthropic") {
        return rest.to_string();
    }

    // All other paths (Anthropic /v1/*, Bedrock /invoke*, Vertex *:rawPredict)
    // are forwarded as-is to the upstream
    path.to_string()
}
