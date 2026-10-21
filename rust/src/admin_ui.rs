//! Serving of the embedded admin UI bundle.
//!
//! The React app in `ui/` is built by Vite into `ui/dist` with stable asset
//! names (`assets/app.js`, `assets/app.css`) and embedded into the binary by
//! `rust-embed`, so the single-container deployment story holds: no separate
//! web server, no assets to mount.
//!
//! Unknown paths fall back to `index.html` so the client-side app owns its own
//! routing; unknown paths under `/api/` do not, because a JSON client should
//! get a `404`, not a page.

use axum::extract::Request;
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use rust_embed::RustEmbed;

/// The built admin UI bundle, embedded at compile time.
#[derive(RustEmbed)]
#[folder = "ui/dist"]
struct Assets;

/// Serve an embedded asset, falling back to `index.html` for app routes.
pub async fn serve_asset(request: Request) -> Response {
    let path = request.uri().path().trim_start_matches('/');
    if let Some(response) = asset_response(path) {
        return response;
    }
    if request.uri().path().starts_with("/api/") {
        return (StatusCode::NOT_FOUND, "not found").into_response();
    }
    asset_response("index.html").unwrap_or_else(|| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "admin UI bundle is missing from this build",
        )
            .into_response()
    })
}

/// Look up one embedded file and wrap it in a response with its MIME type.
fn asset_response(path: &str) -> Option<Response> {
    let path = if path.is_empty() { "index.html" } else { path };
    let file = Assets::get(path)?;
    let mime = content_type(path);
    let mut response = file.data.into_owned().into_response();
    response
        .headers_mut()
        .insert(header::CONTENT_TYPE, HeaderValue::from_static(mime));
    // The bundle is versioned with the binary, and the operator may upgrade at
    // any time, so assets are revalidated rather than cached indefinitely.
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-cache, must-revalidate"),
    );
    Some(response)
}

/// Minimal extension-to-MIME map covering what Vite emits for this app.
fn content_type(path: &str) -> &'static str {
    match path.rsplit_once('.').map(|(_, ext)| ext) {
        Some("html") => "text/html; charset=utf-8",
        Some("js" | "mjs") => "text/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") => "application/json",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("ico") => "image/x-icon",
        Some("woff2") => "font/woff2",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn index_is_embedded() {
        assert!(Assets::get("index.html").is_some());
    }

    #[test]
    fn content_types_are_mapped() {
        assert_eq!(content_type("index.html"), "text/html; charset=utf-8");
        assert_eq!(
            content_type("assets/app.js"),
            "text/javascript; charset=utf-8"
        );
        assert_eq!(content_type("assets/app.css"), "text/css; charset=utf-8");
        assert_eq!(content_type("noext"), "application/octet-stream");
    }
}
