//! Retain active native exchanges without inspecting or changing body frames.
use super::RequestRouteGuard;
use axum::body::Body;
use axum::response::Response;
use http_body_util::BodyExt as _;

pub(super) fn hold_route(response: Response, guard: RequestRouteGuard) -> Response {
    let (parts, body) = response.into_parts();
    let body = body.map_frame(move |frame| {
        let _keep_route_until_response_body_finishes = &guard;
        frame
    });
    Response::from_parts(parts, Body::new(body))
}
