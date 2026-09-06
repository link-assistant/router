async fn relay_native_http(
    state: &AppState,
    method: &Method,
    body: NativeRequestBody,
    target: Target,
    usage_token_id: Option<&str>,
) -> Response {
    let body_len = body.len();
    let request = target
        .client
        .request(
            reqwest::Method::from_bytes(method.as_str().as_bytes()).expect("valid HTTP method"),
            target.url,
        )
        .headers(target.headers);
    let upstream = match body {
        NativeRequestBody::Memory(bytes) => request.body(bytes).send().await,
        NativeRequestBody::Spool { file, .. } => {
            let Ok(reopened) = file.reopen() else {
                return unavailable("the temporary upload spool could not be opened");
            };
            let async_file = tokio::fs::File::from_std(reopened);
            let result = request.body(async_file).send().await;
            drop(file);
            result
        }
    };
    let Ok(upstream) = upstream else {
        return unavailable("native service upstream request failed");
    };
    let status = StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let headers = crate::proxy::relay_response_headers(upstream.headers());
    let metrics = std::sync::Arc::clone(&state.metrics);
    let mut usage = usage_token_id
        .map(|token_id| crate::usage::UsageTracker::new(state.token_manager.clone(), token_id));
    let stream = upstream.bytes_stream().map(move |chunk| {
        if let Ok(bytes) = &chunk {
            metrics.record_bytes(0, bytes.len() as u64);
            if let Some(usage) = usage.as_mut() {
                usage.feed(bytes);
            }
        }
        chunk
    });
    let mut response = Response::new(Body::from_stream(stream));
    *response.status_mut() = status;
    *response.headers_mut() = headers;
    state.metrics.record_bytes(body_len as u64, 0);
    response
}

fn is_websocket(headers: &HeaderMap) -> bool {
    headers
        .get("upgrade")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.eq_ignore_ascii_case("websocket"))
}

pub async fn upgrade_websocket(
    state: AppState,
    request: Request,
    target: Target,
    usage_token_id: Option<String>,
) -> Response {
    let (mut parts, _) = request.into_parts();
    let upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &state).await {
        Ok(upgrade) => upgrade,
        Err(rejection) => return rejection.into_response(),
    };
    let limit = state.max_proxy_request_bytes;
    let (upstream, upstream_headers) = match connect_upstream_websocket(target, limit).await {
        Ok(connected) => connected,
        Err(response) => return response,
    };
    let token_manager = state.token_manager.clone();
    let metrics = Arc::clone(&state.metrics);
    let mut response = upgrade
        .max_message_size(limit)
        .max_frame_size(limit)
        .on_upgrade(move |downstream| {
            websocket_session(downstream, upstream, token_manager, usage_token_id, metrics)
        });
    for (name, value) in upstream_headers {
        if let Some(name) = name {
            response.headers_mut().append(name, value);
        }
    }
    response
}

async fn connect_upstream_websocket(
    target: Target,
    limit: usize,
) -> Result<(UpstreamWebSocket, HeaderMap), Response> {
    let Ok(mut request) = websocket_url(&target.url)
        .and_then(|url| url.into_client_request().map_err(|error| error.to_string()))
    else {
        return Err(error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "invalid upstream WebSocket URL",
        ));
    };
    for (name, value) in target.headers {
        if let Some(name) = name {
            request.headers_mut().append(name, value);
        }
    }
    let config = tungstenite::protocol::WebSocketConfig::default()
        .max_message_size(Some(limit))
        .max_frame_size(Some(limit))
        .max_write_buffer_size(limit.saturating_mul(2));
    let connected = tokio::time::timeout(
        CONNECT_TIMEOUT,
        tokio_tungstenite::connect_async_with_config(request, Some(config), false),
    )
    .await;
    match connected {
        Err(_) => Err(error(
            StatusCode::GATEWAY_TIMEOUT,
            "api_error",
            "upstream WebSocket connection timed out",
        )),
        Ok(Err(tungstenite::Error::Http(upstream))) => Err(websocket_http_failure(*upstream)),
        Ok(Err(_)) => Err(unavailable("upstream WebSocket connection failed")),
        Ok(Ok((upstream, response))) => {
            let mut headers = crate::proxy::relay_response_headers(response.headers());
            for generated in [
                "sec-websocket-accept",
                "sec-websocket-key",
                "sec-websocket-version",
                "sec-websocket-extensions",
            ] {
                headers.remove(generated);
            }
            Ok((upstream, headers))
        }
    }
}

fn websocket_http_failure(upstream: http::Response<Option<Vec<u8>>>) -> Response {
    let (parts, body) = upstream.into_parts();
    let status = StatusCode::from_u16(parts.status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
    let mut response = Response::new(Body::from(body.unwrap_or_default()));
    *response.status_mut() = status;
    *response.headers_mut() = crate::proxy::relay_response_headers(&parts.headers);
    response
}

async fn websocket_session(
    mut downstream: WebSocket,
    mut upstream: UpstreamWebSocket,
    token_manager: crate::token::TokenManager,
    usage_token_id: Option<String>,
    metrics: Arc<crate::metrics::Metrics>,
) {
    let mut completed_responses = std::collections::HashSet::new();
    loop {
        tokio::select! {
            message = downstream.next() => {
                let Some(Ok(message)) = message else {
                    let _ = upstream.close(None).await;
                    break;
                };
                let message_bytes = websocket_message_len(&message);
                if let (Some(token_id), Message::Text(text)) = (&usage_token_id, &message)
                    && serde_json::from_slice::<serde_json::Value>(text.as_bytes())
                        .ok()
                        .and_then(|event| event.get("type").and_then(serde_json::Value::as_str).map(str::to_string))
                        .as_deref()
                        == Some("response.create")
                    && token_manager.enforce_request_budget(token_id).is_err()
                {
                    close(&mut downstream, 1008, "Router token budget is exhausted").await;
                    let _ = upstream.close(None).await;
                    break;
                }
                let closes = matches!(message, Message::Close(_));
                if upstream.send(downstream_message(message)).await.is_err() || closes {
                    break;
                }
                metrics.record_bytes(message_bytes, 0);
            }
            message = upstream.next() => {
                let Some(Ok(message)) = message else {
                    close(&mut downstream, 1011, "upstream WebSocket disconnected").await;
                    break;
                };
                let message_bytes = tungstenite_message_len(&message);
                let budget_exhausted = if let (Some(token_id), tungstenite::Message::Text(text)) =
                    (&usage_token_id, &message)
                {
                    record_realtime_usage(
                        &token_manager,
                        token_id,
                        &mut completed_responses,
                        text.as_bytes(),
                    )
                } else {
                    false
                };
                let closes = matches!(message, tungstenite::Message::Close(_));
                if downstream.send(upstream_message(message)).await.is_err() || closes {
                    break;
                }
                metrics.record_bytes(0, message_bytes);
                if budget_exhausted {
                    close(&mut downstream, 1008, "Router token budget is exhausted").await;
                    let _ = upstream.close(None).await;
                    break;
                }
            }
        }
    }
}

fn record_realtime_usage(
    token_manager: &crate::token::TokenManager,
    token_id: &str,
    completed_responses: &mut std::collections::HashSet<String>,
    bytes: &[u8],
) -> bool {
    let Ok(event) = serde_json::from_slice::<serde_json::Value>(bytes) else {
        return false;
    };
    if event.get("type").and_then(serde_json::Value::as_str) != Some("response.done") {
        return false;
    }
    let key = event
        .pointer("/response/id")
        .and_then(serde_json::Value::as_str)
        .filter(|id| !id.is_empty())
        .map_or_else(|| hex::encode(Sha256::digest(bytes)), str::to_string);
    if !completed_responses.insert(key) {
        return false;
    }
    if let Some(tokens) = crate::usage::token_count(&event)
        && let Err(error) = token_manager.settle_token_usage(token_id, 0, tokens)
    {
        tracing::warn!(token_id, "failed to persist Realtime token usage: {error}");
    }
    token_manager.enforce_request_budget(token_id).is_err()
}

fn websocket_message_len(message: &Message) -> u64 {
    match message {
        Message::Text(text) => text.len() as u64,
        Message::Binary(bytes) | Message::Ping(bytes) | Message::Pong(bytes) => bytes.len() as u64,
        Message::Close(_) => 0,
    }
}

fn tungstenite_message_len(message: &tungstenite::Message) -> u64 {
    match message {
        tungstenite::Message::Text(text) => text.len() as u64,
        tungstenite::Message::Binary(bytes)
        | tungstenite::Message::Ping(bytes)
        | tungstenite::Message::Pong(bytes) => bytes.len() as u64,
        tungstenite::Message::Close(_) | tungstenite::Message::Frame(_) => 0,
    }
}

fn downstream_message(message: Message) -> tungstenite::Message {
    match message {
        Message::Text(text) => tungstenite::Message::Text(text.to_string().into()),
        Message::Binary(bytes) => tungstenite::Message::Binary(bytes.to_vec().into()),
        Message::Ping(bytes) => tungstenite::Message::Ping(bytes.to_vec().into()),
        Message::Pong(bytes) => tungstenite::Message::Pong(bytes.to_vec().into()),
        Message::Close(frame) => {
            tungstenite::Message::Close(frame.map(|frame| tungstenite::protocol::CloseFrame {
                code: frame.code.into(),
                reason: frame.reason.to_string().into(),
            }))
        }
    }
}

fn upstream_message(message: tungstenite::Message) -> Message {
    match message {
        tungstenite::Message::Text(text) => Message::Text(text.to_string().into()),
        tungstenite::Message::Binary(bytes) => Message::Binary(bytes.to_vec().into()),
        tungstenite::Message::Ping(bytes) => Message::Ping(bytes.to_vec().into()),
        tungstenite::Message::Pong(bytes) => Message::Pong(bytes.to_vec().into()),
        tungstenite::Message::Close(frame) => Message::Close(frame.map(|frame| CloseFrame {
            code: frame.code.into(),
            reason: frame.reason.to_string().into(),
        })),
        tungstenite::Message::Frame(_) => Message::Close(Some(CloseFrame {
            code: 1011,
            reason: "unexpected raw upstream frame".into(),
        })),
    }
}

async fn close(socket: &mut WebSocket, code: u16, reason: &'static str) {
    let _ = socket
        .send(Message::Close(Some(CloseFrame {
            code,
            reason: reason.into(),
        })))
        .await;
}

fn websocket_url(url: &str) -> Result<String, String> {
    let mut url = reqwest::Url::parse(url).map_err(|error| error.to_string())?;
    let scheme = match url.scheme() {
        "https" => "wss",
        "http" => "ws",
        _ => return Err("unsupported WebSocket scheme".into()),
    };
    url.set_scheme(scheme)
        .map_err(|()| "could not set WebSocket scheme".to_string())?;
    Ok(url.to_string())
}

fn rewrite_realtime_location(
    service: Service,
    request_path: &str,
    response: &mut Response,
) -> Result<(), Response> {
    let Some(location) = response.headers().get("location") else {
        return Ok(());
    };
    let location = location.to_str().map_err(|_| {
        error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "upstream Realtime call Location is invalid",
        )
    })?;
    let (path, query) = location
        .split_once('?')
        .map_or((location, None), |(path, query)| (path, Some(query)));
    let call_id = path
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .filter(|call_id| !call_id.is_empty())
        .ok_or_else(|| {
            error(
                StatusCode::BAD_GATEWAY,
                "api_error",
                "upstream Realtime call Location has no call id",
            )
        })?;
    let router_base = match (service, request_path) {
        (Service::OpenAi, "/api/services/openai/v1/realtime/calls") => {
            "/api/services/openai/v1/realtime/calls"
        }
        (Service::Codex, "/api/services/codex/v1/realtime/calls") => {
            "/api/services/codex/v1/realtime/calls"
        }
        (Service::Codex, "/api/services/codex/v1/live") => "/api/services/codex/v1/live",
        _ => return Ok(()),
    };
    let mut rewritten = format!("{router_base}/{call_id}");
    if let Some(query) = query {
        rewritten.push('?');
        rewritten.push_str(query);
    }
    let value = HeaderValue::from_str(&rewritten).map_err(|_| {
        error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "upstream Realtime call Location cannot be relayed safely",
        )
    })?;
    response.headers_mut().insert("location", value);
    Ok(())
}

fn unavailable(message: &str) -> Response {
    error(StatusCode::SERVICE_UNAVAILABLE, "api_error", message)
}

fn not_found() -> Response {
    error(StatusCode::NOT_FOUND, "not_found_error", "route not found")
}

fn error(status: StatusCode, error_type: &str, message: &str) -> Response {
    crate::api_error::PresentedError {
        status,
        error_type,
        message,
    }
    .render(crate::api_error::ApiDialect::OpenAi)
}

fn anthropic_error(status: StatusCode, error_type: &str, message: &str) -> Response {
    crate::api_error::PresentedError {
        status,
        error_type,
        message,
    }
    .render(crate::api_error::ApiDialect::Anthropic)
}
