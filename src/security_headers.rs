//! Response hardening for the admin listener.
//!
//! The admin console keeps its credential in `localStorage` (see `ui/src/api.js`),
//! which makes two browser-side attacks worth closing at the HTTP layer rather
//! than trusting the bundle:
//!
//! * **script injection** — any script that runs on this origin can read the
//!   token. React escapes what it renders, but a Content-Security-Policy that
//!   allows scripts only from this origin means an injected `<script src=…>` or
//!   an exfiltrating `fetch()` to another host fails even if escaping ever does;
//! * **clickjacking** — the console has one-click destructive actions (revoke,
//!   rotate). `frame-ancestors 'none'` plus `X-Frame-Options: DENY` keeps it out
//!   of a third-party frame, and `form-action 'none'` keeps a submitted form
//!   from posting the page's data elsewhere.
//!
//! `style-src` has to allow inline styles: Chakra/emotion injects its rules into
//! a `<style>` element at runtime. That is the one relaxation, and it does not
//! help an attacker reach the token.
//!
//! These are defence in depth. The primary control is still that the admin
//! listener does not exist unless the operator gives it a port, and binds to
//! loopback when they do.

use axum::extract::Request;
use axum::http::{HeaderValue, header};
use axum::middleware::Next;
use axum::response::Response;

/// Content-Security-Policy served with every admin response.
pub const CONTENT_SECURITY_POLICY: &str = "default-src 'self'; \
     script-src 'self'; \
     style-src 'self' 'unsafe-inline'; \
     img-src 'self' data:; \
     font-src 'self' data:; \
     connect-src 'self'; \
     object-src 'none'; \
     base-uri 'none'; \
     form-action 'none'; \
     frame-ancestors 'none'";

/// Headers applied to every response from the admin listener.
const HEADERS: &[(header::HeaderName, &str)] = &[
    (header::CONTENT_SECURITY_POLICY, CONTENT_SECURITY_POLICY),
    (header::X_FRAME_OPTIONS, "DENY"),
    (header::X_CONTENT_TYPE_OPTIONS, "nosniff"),
    (header::REFERRER_POLICY, "no-referrer"),
];

/// Middleware that hardens every admin response.
///
/// Existing headers are overwritten: nothing downstream has a reason to set a
/// weaker policy, and silently keeping one would defeat the point.
pub async fn apply(request: Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    for (name, value) in HEADERS {
        headers.insert(name, HeaderValue::from_static(value));
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_policy_pins_scripts_to_this_origin_and_forbids_framing() {
        assert!(CONTENT_SECURITY_POLICY.contains("script-src 'self'"));
        assert!(CONTENT_SECURITY_POLICY.contains("frame-ancestors 'none'"));
        assert!(
            !CONTENT_SECURITY_POLICY.contains("script-src 'self' 'unsafe-inline'"),
            "inline script would re-open the injection path to the localStorage token"
        );
    }

    #[test]
    fn every_hardening_header_has_a_valid_value() {
        for (name, value) in HEADERS {
            assert!(
                HeaderValue::from_str(value).is_ok(),
                "{name} carries an unsendable value"
            );
        }
    }
}
