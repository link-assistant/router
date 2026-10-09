//! Resolve visible model identities before authorization; retain the selected account for dispatch.
use crate::account_policy_scope::{PolicyRequest, REQUEST};
use crate::app_state::AppState;
use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{Method, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use serde_json::Value;
use std::sync::{Arc, Mutex};

pub async fn route(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let Some(router) = state
        .account_router
        .as_ref()
        .filter(|r| r.has_routing_policy())
    else {
        return next.run(request).await;
    };
    if request.method() != Method::POST {
        return next.run(request).await;
    }
    let path = request.uri().path().to_string();
    let dialect = crate::api_error::dialect_for_path(&path);
    let failure = |status, message: &str| failure(status, message, dialect);
    let json_model_path = path.ends_with("/messages")
        || path.ends_with("/messages/count_tokens")
        || path.ends_with("/chat/completions")
        || path.ends_with("/responses")
        || path.ends_with("/responses/compact")
        || path.ends_with("/invoke")
        || path.ends_with("/invoke-with-response-stream");
    let path_model = path
        .split_once("/models/")
        .and_then(|(_, tail)| tail.rsplit_once(':'))
        .filter(|(_, action)| {
            matches!(
                *action,
                "generateContent"
                    | "streamGenerateContent"
                    | "countTokens"
                    | "rawPredict"
                    | "streamRawPredict"
            )
        })
        .map(|(model, _)| {
            model
                .strip_suffix("/count-tokens")
                .unwrap_or(model)
                .to_string()
        });
    if !json_model_path && path_model.is_none() {
        return next.run(request).await;
    }
    if state.upstream_provider != crate::config::UpstreamProvider::Auto
        && state.upstream_provider.subscription_provider() != Some(router.provider())
    {
        return next.run(request).await;
    }
    let claims = match crate::proxy::authenticate_client_error(&state, request.headers()) {
        Ok(claims) => claims,
        Err(error) => return error.render(crate::api_error::dialect_for_path(&path)),
    };
    let protocol = if path.contains("/publishers/anthropic/models/") {
        crate::client_policy::ClientProtocol::AnthropicMessages
    } else if path.contains("/models/") {
        crate::client_policy::ClientProtocol::GeminiNative
    } else if path.ends_with("/chat/completions") {
        crate::client_policy::ClientProtocol::OpenAIChat
    } else if path.contains("/responses") {
        crate::client_policy::ClientProtocol::OpenAIResponses
    } else {
        crate::client_policy::ClientProtocol::AnthropicMessages
    };
    let (mut parts, body) = request.into_parts();
    let parsed = match crate::encoded_request_body::read_native_json(
        &parts.headers,
        body,
        state.max_proxy_request_bytes,
        path.contains("/codex/") && path.ends_with("/responses"),
    )
    .await
    {
        Ok(parsed) => parsed,
        Err(response) => return response,
    };
    let mut body = parsed.value;
    let requested = match path_model.as_deref() {
        Some(model) => match crate::native_service::percent_decode_segment(model) {
            Some(model) => Some(model),
            None => return failure(StatusCode::BAD_REQUEST, "invalid encoded model selector"),
        },
        None => body
            .get("model")
            .and_then(Value::as_str)
            .map(str::to_string),
    };
    let Some(requested) = requested.filter(|m| !m.is_empty()) else {
        let bytes = parsed.native.encode(&body).unwrap_or_default();
        return next
            .run(Request::from_parts(parts, Body::from(bytes)))
            .await;
    };
    let pin = match state.token_manager.account_for(&claims.sub) {
        Ok(pin) => pin,
        Err(error) => return failure(StatusCode::SERVICE_UNAVAILABLE, &error.to_string()),
    };
    let mut context = crate::request_routing::request_routing_context(&parts.headers, &body, pin);
    context.model = Some(requested.clone());
    let model_policy = match crate::proxy::model_policy_for_claims(&state, &claims) {
        Ok(policy) => policy,
        Err(error) => return failure(StatusCode::SERVICE_UNAVAILABLE, &error.to_string()),
    };
    // A known alias must never fall through to a guessed native spelling on
    // another account. Its live catalog can prove that spelling is real there.
    let configured_alias = router.subscription_readers().iter().any(|(account, _)| {
        router.routing_policy(account).is_ok_and(|policy| {
            let bare = policy
                .prefix
                .as_ref()
                .and_then(|prefix| requested.strip_prefix(&format!("{prefix}/")))
                .unwrap_or(&requested);
            policy.model_aliases.iter().any(|alias| alias.alias == bare)
        })
    });
    let candidates: Vec<_> = router
        .subscription_readers()
        .into_iter()
        .filter(|(name, _)| {
            context
                .pinned_account
                .as_ref()
                .is_none_or(|pin| pin == name)
        })
        .filter_map(|(name, _)| {
            let mut model = router.upstream_model(&name, &requested)?;
            // Anthropic ingress can select a different native model at a pinned bridge.
            if protocol == crate::client_policy::ClientProtocol::AnthropicMessages
                && router.provider() != crate::subscription::SubscriptionProvider::Claude
                && state.upstream_provider != crate::config::UpstreamProvider::Auto
                && model == requested
            {
                model =
                    crate::anthropic_bridge::resolve_bridge_model_for_account(&state, Some(&name))
                        .ok()?;
                if router.routing_policy(&name).ok()?.excluded(&model) {
                    return None;
                }
            }
            let catalog = state.model_catalogs.status_for(router.provider(), &name);
            if router.provider() == crate::subscription::SubscriptionProvider::Gemini
                && !model.starts_with("models/")
                && catalog
                    .routable_models()
                    .contains(&format!("models/{model}"))
            {
                model = format!("models/{model}");
            }
            let alias = model != requested && !requested.ends_with(&format!("/{model}"));
            if (state.upstream_provider == crate::config::UpstreamProvider::Auto
                || alias
                || configured_alias)
                && !catalog.routable_models().contains(&model)
            {
                return None;
            }
            Some((name, model))
        })
        .collect();
    // Policies on one subscription must not intercept another provider in auto mode.
    // Unowned selectors continue through ordinary routing, including compatible
    // provider aliases. Their original selector and token policy remain intact.
    if state.upstream_provider == crate::config::UpstreamProvider::Auto
        && candidates.is_empty()
        && (crate::subscription::SubscriptionProvider::ALL
            .into_iter()
            .any(|provider| {
                provider != router.provider()
                    && state.model_catalogs.models(provider).contains(&requested)
            })
            || (!configured_alias
                && !router.subscription_readers().iter().any(|(account, _)| {
                    let catalog = state.model_catalogs.status_for(router.provider(), account);
                    catalog.routable_models().contains(&requested)
                        || (router.provider() == crate::subscription::SubscriptionProvider::Gemini
                            && catalog
                                .routable_models()
                                .contains(&format!("models/{requested}")))
                        || router.routing_policy(account).is_ok_and(|policy| {
                            policy
                                .prefix
                                .as_ref()
                                .is_some_and(|prefix| requested.starts_with(&format!("{prefix}/")))
                        })
                })))
    {
        let bytes = parsed.native.encode(&body).unwrap_or_default();
        return next
            .run(Request::from_parts(parts, Body::from(bytes)))
            .await;
    }
    if let Err(response) = crate::client_policy::enforce_subscription_for_claims(
        &state,
        &claims,
        &parts.headers,
        router.provider(),
        protocol,
        &path,
    ) {
        return response;
    }
    if candidates.is_empty() {
        return failure(
            StatusCode::NOT_FOUND,
            "model is excluded, has no matching prefix, or is absent from the account catalog",
        );
    }
    if !candidates.iter().any(|(_, model)| {
        crate::account_policy_catalog::permitted(&model_policy, router.provider(), model)
    }) {
        return failure(
            StatusCode::FORBIDDEN,
            "the credential model policy denies the upstream model",
        );
    }
    let selected = match router
        .select_subscription_where_authoritative(&context, &state.subscription_cache, |name| {
            candidates.iter().any(|(account, model)| {
                account == name
                    && crate::account_policy_catalog::permitted(
                        &model_policy,
                        router.provider(),
                        model,
                    )
                    && router.serves_upstream_model(account, model)
            })
        })
        .await
    {
        Ok(selected) => selected,
        Err(error) => return failure(StatusCode::SERVICE_UNAVAILABLE, &error.to_string()),
    };
    let upstream = candidates
        .iter()
        .find(|(name, _)| name == &selected.name)
        .expect("selected model is eligible")
        .1
        .clone();
    if body.get("model").is_some() {
        body["model"] = Value::String(upstream.clone());
    }
    // URI model surfaces are rewritten as well as JSON surfaces.
    if path.contains("/models/") {
        let rewritten = path.replacen(
            &format!("/models/{}", path_model.as_deref().unwrap_or(&requested)),
            &format!("/models/{upstream}"),
            1,
        );
        let uri = parts
            .uri
            .query()
            .map_or_else(|| rewritten.clone(), |q| format!("{rewritten}?{q}"));
        if let Ok(uri) = uri.parse() {
            parts.uri = uri;
        }
    }
    let bytes = match parsed.native.encode(&body) {
        Ok(bytes) => bytes,
        Err(error) => return failure(StatusCode::BAD_REQUEST, &error),
    };
    parts.headers.remove("content-length");
    if upstream != requested {
        parts.headers.remove("accept-encoding");
    }
    let scope = Arc::new(PolicyRequest {
        state,
        headers: parts.headers.clone(),
        context,
        upstream_model: upstream.clone(),
        model_policy,
        last_action: Mutex::new(None),
        selected: Mutex::new(selected),
    });
    REQUEST
        .scope(Arc::clone(&scope), async {
            let response = next
                .run(Request::from_parts(parts, Body::from(bytes)))
                .await;
            if upstream == requested {
                response
            } else {
                crate::account_policy_response::rewrite(response, &upstream, &requested).await
            }
        })
        .await
}

fn failure(status: StatusCode, message: &str, dialect: crate::api_error::ApiDialect) -> Response {
    crate::api_error::PresentedError {
        status,
        error_type: if status == StatusCode::FORBIDDEN {
            "permission_error"
        } else {
            "routing_policy_error"
        },
        message,
    }
    .render(dialect)
}
