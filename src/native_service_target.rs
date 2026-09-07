fn authorize_service(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    service: Service,
) -> Result<(), Response> {
    let (client, _) = crate::client_policy::bound_client(claims)
        .map_err(|message| error(StatusCode::FORBIDDEN, "permission_error", &message))?;
    match service {
        Service::Codex | Service::CodexBackend if client != ClientKind::Codex => Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the Codex service requires a Codex-bound Router token",
        )),
        Service::Anthropic if client != ClientKind::ClaudeCode => Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the Anthropic native service requires a Claude-bound Router token",
        )),
        Service::OpenAi => {
            let provider = crate::provider_proxy::resolve_openai_compatible_provider(state)
                .map_err(|_| unavailable("the native OpenAI provider is unavailable"))?;
            if provider.supports_client(client) {
                Ok(())
            } else {
                Err(error(
                    StatusCode::FORBIDDEN,
                    "permission_error",
                    "the selected OpenAI provider does not support this client",
                ))
            }
        }
        _ => Ok(()),
    }
}

async fn whoami(
    state: &AppState,
    headers: &HeaderMap,
    claims: &crate::token::TokenClaims,
) -> Response {
    if crate::proxy::extract_client_token(headers)
        .is_none_or(|token| !token.starts_with(crate::token::CODEX_TOKEN_PREFIX))
    {
        return error(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "Codex whoami requires the paired Router-issued at- token",
        );
    }
    if let Err(response) = authorize_service(state, claims, Service::Codex) {
        return response;
    }
    let selected = match selected_subscription(
        state,
        headers,
        claims,
        SubscriptionProvider::Codex,
        None,
    )
    .await
    {
        Ok(selected) => selected,
        Err(response) => return response,
    };
    let (_, principal) = crate::client_policy::bound_client(claims).expect("authorized above");
    let user = opaque_handle("usr", principal);
    let account = codex_account_handle(
        principal,
        &selected.name,
        selected.token.account_id.as_deref(),
    );
    let (plan, fedramp) = codex_identity_metadata(state, &selected.name, &selected.token);
    axum::Json(serde_json::json!({
        "email": serde_json::Value::Null,
        "chatgpt_user_id": user,
        "chatgpt_account_id": account,
        "chatgpt_plan_type": plan,
        "chatgpt_account_is_fedramp": fedramp,
    }))
    .into_response()
}

fn opaque_handle(prefix: &str, value: &str) -> String {
    let digest = hex::encode(Sha256::digest(value.as_bytes()));
    format!("{prefix}_{}", &digest[..24])
}

fn codex_account_handle(
    principal: &str,
    account: &str,
    upstream_account_id: Option<&str>,
) -> String {
    opaque_handle(
        "acct",
        &format!(
            "{principal}:{account}:{}",
            upstream_account_id.unwrap_or_default()
        ),
    )
}

fn codex_identity_metadata(
    state: &AppState,
    account: &str,
    token: &crate::subscription::SubscriptionToken,
) -> (String, bool) {
    let claims = codex_identity_claims(&token.access_token).or_else(|| {
        let reader = codex_reader_for_account(state, account)?;
        let source = reader.read_document_for_import().ok()?;
        if source.token.access_token != token.access_token {
            return None;
        }
        let document = serde_json::from_str::<serde_json::Value>(&source.document).ok()?;
        let id_token = document.pointer("/tokens/id_token")?.as_str()?;
        codex_identity_claims(id_token)
    });
    let plan = claims
        .as_ref()
        .and_then(|claims| claims.get("chatgpt_plan_type"))
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|plan| !plan.is_empty() && plan.len() <= 128)
        .unwrap_or("unknown")
        .to_string();
    let fedramp = claims
        .as_ref()
        .and_then(|claims| claims.get("chatgpt_account_is_fedramp"))
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    (plan, fedramp)
}

fn codex_identity_claims(token: &str) -> Option<serde_json::Map<String, serde_json::Value>> {
    use base64::Engine as _;

    let payload = token.split('.').nth(1)?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload)
        .ok()?;
    let document = serde_json::from_slice::<serde_json::Value>(&bytes).ok()?;
    document
        .get("https://api.openai.com/auth")?
        .as_object()
        .cloned()
}

fn codex_reader_for_account(
    state: &AppState,
    account: &str,
) -> Option<crate::subscription::SubscriptionReader> {
    state
        .account_router
        .as_ref()
        .filter(|router| router.provider() == SubscriptionProvider::Codex)
        .and_then(|router| {
            router
                .subscription_readers()
                .into_iter()
                .find_map(|(name, reader)| (name == account).then_some(reader))
        })
        .or_else(|| {
            (account == crate::credential_recovery_store::PRIMARY_ACCOUNT)
                .then(|| {
                    state
                        .subscription_readers
                        .iter()
                        .find(|reader| reader.provider() == SubscriptionProvider::Codex)
                        .or_else(|| {
                            state
                                .subscription_reader
                                .as_ref()
                                .filter(|reader| reader.provider() == SubscriptionProvider::Codex)
                        })
                        .cloned()
                })
                .flatten()
        })
}

async fn target(
    state: &AppState,
    incoming: &HeaderMap,
    claims: &crate::token::TokenClaims,
    service: Service,
    uri: &axum::http::Uri,
    body: Option<&Bytes>,
    exact: Option<&AffinityDestination>,
) -> Result<(Target, AffinityDestination), Response> {
    match service {
        Service::OpenAi => provider_target(state, incoming, uri, exact),
        Service::Anthropic => {
            subscription_target(
                state,
                incoming,
                claims,
                SubscriptionProvider::Claude,
                service,
                uri,
                body,
                exact,
            )
            .await
        }
        Service::Codex | Service::CodexBackend => {
            subscription_target(
                state,
                incoming,
                claims,
                SubscriptionProvider::Codex,
                service,
                uri,
                body,
                exact,
            )
            .await
        }
    }
}

fn provider_target(
    state: &AppState,
    incoming: &HeaderMap,
    uri: &axum::http::Uri,
    exact: Option<&AffinityDestination>,
) -> Result<(Target, AffinityDestination), Response> {
    let provider = crate::provider_proxy::resolve_openai_compatible_provider(state)
        .map_err(|_| unavailable("the native OpenAI provider is unavailable"))?;
    if provider.kind != crate::providers::ProviderKind::OpenAICompatible {
        return Err(unavailable(
            "the selected provider does not implement native OpenAI resource APIs",
        ));
    }
    let key = provider
        .api_key
        .as_deref()
        .ok_or_else(|| unavailable("the native OpenAI provider credential is unavailable"))?;
    let destination = AffinityDestination::StoredProvider {
        name: provider.name.clone(),
        provider_kind: provider.kind,
        base_url: provider.base_url.clone(),
    };
    if exact.is_some_and(|expected| expected != &destination) {
        return Err(unavailable(
            "the native resource's exact provider is unavailable",
        ));
    }
    let path = strip_service_path(uri, Service::OpenAi);
    Ok((
        Target {
            client: state.client.clone(),
            url: crate::provider_proxy::join_openai_compatible_url(&provider.base_url, &path),
            headers: crate::proxy::native_request_headers(incoming, key),
        },
        destination,
    ))
}

#[allow(clippy::too_many_arguments)]
async fn subscription_target(
    state: &AppState,
    incoming: &HeaderMap,
    claims: &crate::token::TokenClaims,
    provider: SubscriptionProvider,
    service: Service,
    uri: &axum::http::Uri,
    body: Option<&Bytes>,
    exact: Option<&AffinityDestination>,
) -> Result<(Target, AffinityDestination), Response> {
    let exact_account = match exact {
        Some(AffinityDestination::Subscription {
            provider: expected,
            account,
            ..
        }) if *expected == provider => Some(account.as_str()),
        Some(_) => {
            return Err(unavailable(
                "the native resource's exact subscription is unavailable",
            ));
        }
        None => None,
    };
    let require_account_binding = provider == SubscriptionProvider::Codex
        && (service == Service::CodexBackend
            || codex_history_notes_operation(uri.path()).is_some());
    let selected = selected_subscription_with_account(
        state,
        incoming,
        claims,
        provider,
        body,
        exact_account,
        require_account_binding,
    )
    .await?;
    let base = state
        .subscription_base_url
        .clone()
        .unwrap_or_else(|| selected.token.base_url(provider));
    let path = if service == Service::Codex {
        codex_subscription_path(uri)
    } else {
        strip_service_path(uri, service)
    };
    let url = if service == Service::CodexBackend {
        let root = base
            .strip_suffix("/codex")
            .unwrap_or(&base)
            .trim_end_matches('/');
        format!("{root}{path}")
    } else if service == Service::Codex
        && exact.is_some()
        && realtime_sideband(Service::Codex, uri.path(), uri.query())
            .ok()
            .flatten()
            .is_some()
    {
        format!("{}{path}", codex_realtime_origin(state))
    } else {
        crate::subscription_proxy::join_subscription_url(provider, &base, &path)
    };
    let mut headers = crate::proxy::native_request_headers(incoming, &selected.token.access_token);
    if provider == SubscriptionProvider::Codex {
        if let Some(account_id) = selected.token.account_id.as_deref()
            && let Ok(value) = HeaderValue::from_str(account_id)
        {
            headers.insert("chatgpt-account-id", value);
        }
        for (name, value) in crate::codex_identity::headers(selected.token.account_id.as_deref()) {
            if let Some(name) = name
                && name != "chatgpt-account-id"
                && !headers.contains_key(&name)
            {
                headers.insert(name, value);
            }
        }
    }
    let destination = AffinityDestination::Subscription {
        provider,
        account: selected.name,
        upstream_account_id: selected.token.account_id,
        base_url: base,
    };
    if exact.is_some_and(|expected| expected != &destination) {
        return Err(unavailable(
            "the native resource's exact subscription account changed",
        ));
    }
    Ok((
        Target {
            client: crate::upstream_client::subscription_client(
                &state.client,
                provider,
                state.subscription_base_url.is_some(),
            )
            .clone(),
            url,
            headers,
        },
        destination,
    ))
}

fn codex_realtime_origin(state: &AppState) -> String {
    let Some(configured) = state.subscription_base_url.as_deref() else {
        return "https://api.openai.com".to_string();
    };
    let Ok(mut url) = reqwest::Url::parse(configured) else {
        return configured.trim_end_matches('/').to_string();
    };
    url.set_path("");
    url.set_query(None);
    url.set_fragment(None);
    url.to_string().trim_end_matches('/').to_string()
}

fn codex_subscription_path(uri: &axum::http::Uri) -> String {
    if uri.path() != "/api/services/codex/v1/live" {
        return strip_service_path(uri, Service::Codex);
    }
    let mut path = "/v1/realtime/calls".to_string();
    path.push('?');
    if let Some(query) = uri.query() {
        path.push_str(query);
        path.push('&');
    }
    path.push_str("intent=quicksilver&architecture=avas");
    path
}

fn strip_service_path(uri: &axum::http::Uri, service: Service) -> String {
    let prefix = match service {
        Service::OpenAi => "/api/services/openai",
        Service::Anthropic => "/api/services/anthropic",
        Service::Codex => "/api/services/codex",
        Service::CodexBackend => "/api/services/codex/backend-api",
    };
    let mut path = uri
        .path()
        .strip_prefix(prefix)
        .unwrap_or_else(|| uri.path())
        .to_string();
    if service == Service::CodexBackend {
        // The configured ChatGPT root already ends in `/backend-api`.
    } else if service == Service::Codex && !path.starts_with("/v1/") {
        path.insert_str(0, "/v1");
    }
    if let Some(query) = uri.query() {
        path.push('?');
        path.push_str(query);
    }
    path
}

fn codex_account_pin(
    state: &AppState,
    headers: &HeaderMap,
    principal: &str,
) -> Result<Option<String>, Response> {
    let values = headers.get_all("chatgpt-account-id");
    let mut values = values.iter();
    let Some(handle) = values.next() else {
        return Ok(None);
    };
    if values.next().is_some() {
        return Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "exactly one Router-issued Codex account handle is required",
        ));
    }
    let handle = handle.to_str().map_err(|_| {
        error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the Codex account handle is invalid",
        )
    })?;
    let accounts = state
        .account_router
        .as_ref()
        .filter(|router| router.provider() == SubscriptionProvider::Codex)
        .map_or_else(
            || {
                codex_reader_for_account(state, crate::credential_recovery_store::PRIMARY_ACCOUNT)
                    .map(|reader| {
                        vec![(
                            crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
                            reader,
                        )]
                    })
                    .unwrap_or_default()
            },
            crate::accounts::AccountRouter::subscription_readers,
        );
    accounts
        .into_iter()
        .find(|(account, reader)| {
            let account_id = reader.read_token().ok().and_then(|token| token.account_id);
            codex_account_handle(principal, account, account_id.as_deref()) == handle
        })
        .map(|(account, _)| Some(account))
        .ok_or_else(|| {
            error(
                StatusCode::FORBIDDEN,
                "permission_error",
                "the Codex account handle is not valid for this Router principal",
            )
        })
}

fn codex_history_notes_operation(path: &str) -> Option<&'static str> {
    match path {
        "/api/services/codex/v1/alpha/history/v2/list_windows" => {
            Some("codex.history.list_windows")
        }
        "/api/services/codex/v1/alpha/history/v2/list_items" => Some("codex.history.list_items"),
        "/api/services/codex/v1/alpha/history/v2/read_item" => Some("codex.history.read_item"),
        "/api/services/codex/v1/alpha/history/v2/search_contents" => {
            Some("codex.history.search_contents")
        }
        "/api/services/codex/v1/alpha/notes/v2/thread_hint" => Some("codex.notes.thread_hint"),
        "/api/services/codex/v1/alpha/notes/v2/list_files_by_prefix" => {
            Some("codex.notes.list_files_by_prefix")
        }
        "/api/services/codex/v1/alpha/notes/v2/read_file" => Some("codex.notes.read_file"),
        "/api/services/codex/v1/alpha/notes/v2/search_contents" => {
            Some("codex.notes.search_contents")
        }
        "/api/services/codex/v1/alpha/notes/v2/append_to_file" => {
            Some("codex.notes.append_to_file")
        }
        "/api/services/codex/v1/alpha/notes/v2/write_file" => Some("codex.notes.write_file"),
        _ => None,
    }
}

pub async fn selected_subscription(
    state: &AppState,
    headers: &HeaderMap,
    claims: &crate::token::TokenClaims,
    provider: SubscriptionProvider,
    body: Option<&Bytes>,
) -> Result<crate::accounts::SelectedSubscriptionAccount, Response> {
    selected_subscription_with_account(state, headers, claims, provider, body, None, false).await
}

async fn selected_subscription_with_account(
    state: &AppState,
    headers: &HeaderMap,
    claims: &crate::token::TokenClaims,
    provider: SubscriptionProvider,
    body: Option<&Bytes>,
    exact_account: Option<&str>,
    require_account_binding: bool,
) -> Result<crate::accounts::SelectedSubscriptionAccount, Response> {
    let (client, principal) = crate::client_policy::bound_client(claims)
        .map_err(|message| error(StatusCode::FORBIDDEN, "permission_error", &message))?;
    let protocol = if provider == SubscriptionProvider::Claude {
        crate::client_policy::ClientProtocol::AnthropicMessages
    } else {
        crate::client_policy::ClientProtocol::OpenAIResponses
    };
    let policy = state
        .provider_store
        .subscription_entitlement_policy()
        .map_err(|_| unavailable("subscription policy is unavailable"))?;
    if policy.decide(Some(client), provider, protocol)
        != crate::client_policy::EntitlementDecision::Native
    {
        return Err(error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "native service access is not entitled for this client and provider",
        ));
    }
    let pinned = state
        .token_manager
        .account_for(&claims.sub)
        .map_err(|_| unavailable("token account binding is unavailable"))?;
    let handle_pin = if provider == SubscriptionProvider::Codex {
        codex_account_pin(state, headers, principal)?
    } else {
        None
    };
    let pinned = if let Some(exact) = exact_account {
        if pinned.as_deref().is_some_and(|token| token != exact)
            || handle_pin.as_deref().is_some_and(|handle| handle != exact)
        {
            return Err(error(
                StatusCode::FORBIDDEN,
                "permission_error",
                "the native resource account does not match this Router token",
            ));
        }
        Some(exact.to_string())
    } else {
        match (pinned, handle_pin) {
            (Some(token), Some(handle)) if token != handle => {
                return Err(error(
                    StatusCode::FORBIDDEN,
                    "permission_error",
                    "the Codex account handle does not match this Router token",
                ));
            }
            (Some(token), _) => Some(token),
            (None, handle) => handle,
        }
    };
    if require_account_binding
        && pinned.is_none()
        && state
            .account_router
            .as_ref()
            .filter(|router| router.provider() == provider)
            .is_some_and(|router| router.subscription_readers().len() > 1)
    {
        return Err(error(
            StatusCode::CONFLICT,
            "invalid_request_error",
            "one exact Codex account identity is required for this control-plane request",
        ));
    }
    let routing_body = body
        .and_then(|body| serde_json::from_slice::<serde_json::Value>(body).ok())
        .unwrap_or_else(|| serde_json::json!({}));
    let context = crate::proxy::request_routing_context(headers, &routing_body, pinned);
    let mut selected = if let Some(router) = state
        .account_router
        .as_ref()
        .filter(|router| router.provider() == provider)
    {
        router
            .select_subscription_where_authoritative(&context, &state.subscription_cache, |_| true)
            .await
            .map_err(|_| unavailable("the bound subscription account is unavailable"))?
    } else {
        if context
            .pinned_account
            .as_deref()
            .is_some_and(|name| name != crate::credential_recovery_store::PRIMARY_ACCOUNT)
        {
            return Err(unavailable("the bound subscription account is unavailable"));
        }
        let reader = state
            .subscription_readers
            .iter()
            .find(|reader| reader.provider() == provider)
            .or_else(|| {
                state
                    .subscription_reader
                    .as_ref()
                    .filter(|reader| reader.provider() == provider)
            })
            .ok_or_else(|| unavailable("the native subscription is not configured"))?;
        let account = crate::credential_recovery_store::PRIMARY_ACCOUNT;
        state.subscription_cache.register_reader(account, reader);
        let token = state
            .subscription_cache
            .load_authoritative(provider, account)
            .await
            .map_err(|_| unavailable("the native subscription credential is unreadable"))?
            .ok_or_else(|| unavailable("the native subscription credential is absent"))?;
        crate::accounts::SelectedSubscriptionAccount {
            name: account.to_string(),
            token,
        }
    };
    selected.token = state
        .subscription_cache
        .get_fresh_loaded(
            &state.client,
            provider,
            &selected.name,
            selected.token,
            chrono::Utc::now().timestamp_millis(),
        )
        .await
        .map_err(|_| unavailable("the native subscription credential cannot refresh"))?;
    Ok(selected)
}

pub async fn relay_http(
    state: &AppState,
    method: &Method,
    body: Bytes,
    target: Target,
) -> Response {
    relay_native_http(state, method, NativeRequestBody::Memory(body), target, None).await
}
