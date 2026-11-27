use axum::extract::{Request, State};
use axum::http::{HeaderName, HeaderValue, Method};
use axum::middleware::Next;
use axum::response::Response;
use schemars::JsonSchema;
use serde::Deserialize;
use tower::{Layer as _, ServiceExt as _};
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};

use crate::app_state::AppState;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub(super) struct Cors {
    origins: Vec<String>,
    methods: Vec<String>,
    headers: Vec<String>,
    credentials: bool,
}

impl Default for Cors {
    fn default() -> Self {
        Self {
            origins: Vec::new(),
            methods: vec!["GET".into(), "POST".into()],
            headers: Vec::new(),
            credentials: false,
        }
    }
}

impl Cors {
    pub(super) fn layer(self) -> Result<Option<CorsLayer>, &'static str> {
        for values in [&self.origins, &self.methods, &self.headers] {
            if values.iter().any(|value| value == "*") && (values.len() != 1 || self.credentials) {
                return Err("CORS wildcard requires a single value and no credentials");
            }
        }
        let origins = if self.origins == ["*"] {
            AllowOrigin::any()
        } else {
            AllowOrigin::list(
                self.origins
                    .iter()
                    .map(|origin| {
                        let parsed = url::Url::parse(origin).map_err(|_| "invalid CORS origin")?;
                        if !matches!(parsed.scheme(), "http" | "https")
                            || parsed.origin().ascii_serialization() != *origin
                        {
                            return Err("invalid CORS origin");
                        }
                        HeaderValue::from_str(origin).map_err(|_| "invalid CORS origin")
                    })
                    .collect::<Result<Vec<_>, _>>()?,
            )
        };
        let methods = if self.methods == ["*"] {
            AllowMethods::any()
        } else {
            AllowMethods::list(
                self.methods
                    .iter()
                    .map(|method| {
                        Method::from_bytes(method.as_bytes()).map_err(|_| "invalid CORS method")
                    })
                    .collect::<Result<Vec<_>, _>>()?,
            )
        };
        let headers = if self.headers == ["*"] {
            AllowHeaders::any()
        } else {
            AllowHeaders::list(
                self.headers
                    .iter()
                    .map(|header| {
                        HeaderName::from_bytes(header.as_bytes()).map_err(|_| "invalid CORS header")
                    })
                    .collect::<Result<Vec<_>, _>>()?,
            )
        };
        if self.origins.is_empty() {
            return Ok(None);
        }
        Ok(Some(
            CorsLayer::new()
                .allow_origin(origins)
                .allow_methods(methods)
                .allow_headers(headers)
                .expose_headers([HeaderName::from_static("x-router-request-id")])
                .allow_credentials(self.credentials),
        ))
    }
}

pub(crate) async fn middleware(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let layer = state
        .request_log
        .runtime_config()
        .and_then(|config| config.cors());
    if let Some(layer) = layer {
        match layer.layer(next).oneshot(request).await {
            Ok(response) => response,
            Err(never) => match never {},
        }
    } else {
        next.run(request).await
    }
}
