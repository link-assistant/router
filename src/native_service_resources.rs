fn native_resource_request(method: &Method, path: &str) -> Option<NativeResourceRequest> {
    if let Some(tail) = path.strip_prefix("/api/services/openai/v1/realtime/calls") {
        return call_resource(method, tail, ResponseNamespace::OpenAiRealtimeCalls);
    }
    if let Some(tail) = path.strip_prefix("/api/services/codex/v1/realtime/calls") {
        return call_resource(method, tail, ResponseNamespace::CodexRealtimeCalls);
    }
    if let Some(tail) = path.strip_prefix("/api/services/codex/v1/live") {
        return call_resource(method, tail, ResponseNamespace::CodexRealtimeCalls);
    }
    if let Some(tail) = path.strip_prefix("/api/services/anthropic/v1/files") {
        return simple_resource(method, tail, ResponseNamespace::AnthropicFiles, true);
    }
    if let Some(tail) = path.strip_prefix("/api/services/anthropic/v1/messages/batches") {
        return simple_resource(method, tail, ResponseNamespace::AnthropicBatches, false);
    }
    if let Some(tail) = path.strip_prefix("/api/services/anthropic/v1/skills") {
        return skill_resource(method, tail);
    }
    if let Some(tail) = path.strip_prefix("/api/services/codex/backend-api/files") {
        return match (method, split_tail(tail).as_slice()) {
            (&Method::POST, []) => Some(resource_create(ResponseNamespace::CodexFiles, None)),
            (&Method::POST, [file_id, "uploaded"]) => Some(resource_use(
                ResponseNamespace::CodexFiles,
                file_id,
                NativeResourceAction::Use,
                None,
            )),
            _ => None,
        };
    }
    None
}

fn native_list_request(method: &Method, path: &str) -> Option<NativeListRequest> {
    if method != Method::GET {
        return None;
    }
    match path {
        "/api/services/anthropic/v1/files" => Some(NativeListRequest {
            namespace: ResponseNamespace::AnthropicFiles,
            parent_id: None,
        }),
        "/api/services/anthropic/v1/messages/batches" => Some(NativeListRequest {
            namespace: ResponseNamespace::AnthropicBatches,
            parent_id: None,
        }),
        "/api/services/anthropic/v1/skills" => Some(NativeListRequest {
            namespace: ResponseNamespace::AnthropicSkills,
            parent_id: None,
        }),
        _ => path
            .strip_prefix("/api/services/anthropic/v1/skills/")
            .and_then(|tail| {
                let segments = split_tail(tail);
                let [skill_id, "versions"] = segments.as_slice() else {
                    return None;
                };
                Some(NativeListRequest {
                    namespace: ResponseNamespace::AnthropicSkillVersions,
                    parent_id: Some((*skill_id).to_string()),
                })
            }),
    }
}

fn native_list_destination(
    state: &AppState,
    owner: &ResponseOwner,
    list: &NativeListRequest,
) -> Result<Option<AffinityDestination>, Response> {
    let affinities = state
        .provider_store
        .response_affinities()
        .list(list.namespace, owner)
        .map_err(|_| unavailable("native resource affinity is unavailable"))?;
    let mut destinations = affinities
        .into_iter()
        .filter(|affinity| {
            list.parent_id
                .as_ref()
                .is_none_or(|parent| affinity.parent_id.as_ref() == Some(parent))
        })
        .map(|affinity| affinity.destination);
    let Some(first) = destinations.next() else {
        return Ok(None);
    };
    if destinations.any(|destination| destination != first) {
        return Err(anthropic_error(
            StatusCode::CONFLICT,
            "invalid_request_error",
            "the requested native resources span multiple subscription accounts",
        ));
    }
    Ok(Some(first))
}

fn call_resource(
    method: &Method,
    tail: &str,
    namespace: ResponseNamespace,
) -> Option<NativeResourceRequest> {
    match (method, split_tail(tail).as_slice()) {
        (&Method::POST, []) => Some(resource_create(namespace, None)),
        (&Method::POST | &Method::DELETE, [call_id]) => Some(resource_use(
            namespace,
            call_id,
            if method == Method::DELETE {
                NativeResourceAction::Delete
            } else {
                NativeResourceAction::Use
            },
            None,
        )),
        (&Method::POST, [call_id, "accept" | "hangup" | "refer" | "reject"]) => Some(resource_use(
            namespace,
            call_id,
            NativeResourceAction::Use,
            None,
        )),
        _ => None,
    }
}

fn simple_resource(
    method: &Method,
    tail: &str,
    namespace: ResponseNamespace,
    content_route: bool,
) -> Option<NativeResourceRequest> {
    match (method, split_tail(tail).as_slice()) {
        (&Method::POST, []) => Some(resource_create(namespace, None)),
        (&Method::GET, [id]) => Some(resource_use(namespace, id, NativeResourceAction::Use, None)),
        (&Method::DELETE, [id]) => Some(resource_use(
            namespace,
            id,
            NativeResourceAction::Delete,
            None,
        )),
        (&Method::GET, [id, "content"]) if content_route => {
            Some(resource_use(namespace, id, NativeResourceAction::Use, None))
        }
        (&Method::POST, [id, "cancel"]) if !content_route => {
            Some(resource_use(namespace, id, NativeResourceAction::Use, None))
        }
        (&Method::GET, [id, "results"]) if !content_route => {
            Some(resource_use(namespace, id, NativeResourceAction::Use, None))
        }
        _ => None,
    }
}

fn skill_resource(method: &Method, tail: &str) -> Option<NativeResourceRequest> {
    let segments = split_tail(tail);
    if ((method == Method::GET || method == Method::POST || method == Method::DELETE)
        && segments.len() == 1)
        || (method == Method::GET && matches!(segments.as_slice(), [_, "versions"]))
    {
        return Some(resource_use(
            ResponseNamespace::AnthropicSkills,
            segments[0],
            if method == Method::DELETE {
                NativeResourceAction::Delete
            } else {
                NativeResourceAction::Use
            },
            None,
        ));
    }
    if ((method == Method::GET || method == Method::POST || method == Method::DELETE)
        && segments.len() == 3)
        || (method == Method::GET && matches!(segments.as_slice(), [_, "versions", _, "content"]))
    {
        return Some(resource_use(
            ResponseNamespace::AnthropicSkillVersions,
            segments[2],
            if method == Method::DELETE {
                NativeResourceAction::Delete
            } else {
                NativeResourceAction::Use
            },
            Some(segments[0]),
        ));
    }
    match (method, segments.as_slice()) {
        (&Method::POST, []) => Some(resource_create(ResponseNamespace::AnthropicSkills, None)),
        (&Method::POST, [skill_id, "versions"]) => Some(NativeResourceRequest {
            namespace: ResponseNamespace::AnthropicSkillVersions,
            action: NativeResourceAction::Create,
            id: Some((*skill_id).to_string()),
            parent_id: Some((*skill_id).to_string()),
        }),
        _ => None,
    }
}

fn split_tail(tail: &str) -> Vec<&str> {
    tail.trim_matches('/')
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect()
}

fn resource_create(namespace: ResponseNamespace, parent_id: Option<&str>) -> NativeResourceRequest {
    NativeResourceRequest {
        namespace,
        action: NativeResourceAction::Create,
        id: parent_id.map(str::to_string),
        parent_id: parent_id.map(str::to_string),
    }
}

fn resource_use(
    namespace: ResponseNamespace,
    id: &str,
    action: NativeResourceAction,
    parent_id: Option<&str>,
) -> NativeResourceRequest {
    NativeResourceRequest {
        namespace,
        action,
        id: Some(id.to_string()),
        parent_id: parent_id.map(str::to_string),
    }
}

fn existing_resource(
    state: &AppState,
    owner: &ResponseOwner,
    resource: &NativeResourceRequest,
) -> Result<Option<ResponseAffinity>, Response> {
    let lookup = if resource.action == NativeResourceAction::Create {
        resource
            .parent_id
            .as_deref()
            .map(|parent_id| (ResponseNamespace::AnthropicSkills, parent_id))
    } else {
        resource.id.as_deref().map(|id| (resource.namespace, id))
    };
    let Some((namespace, id)) = lookup else {
        return Ok(None);
    };
    let store = state.provider_store.response_affinities();
    let found = resource.parent_id.as_deref().map_or_else(
        || store.lookup(namespace, id, owner),
        |parent_id| store.lookup_child(namespace, id, parent_id, owner),
    );
    match found {
        Ok(Some(affinity))
            if resource.action == NativeResourceAction::Create
                || resource.parent_id.is_none()
                || affinity.parent_id == resource.parent_id =>
        {
            Ok(Some(affinity))
        }
        Ok(Some(_) | None) => Err(error(
            StatusCode::NOT_FOUND,
            "not_found_error",
            "the native resource is unavailable",
        )),
        Err(_) => Err(unavailable("native resource affinity is unavailable")),
    }
}

async fn finish_resource_request(
    state: &AppState,
    owner: ResponseOwner,
    destination: AffinityDestination,
    resource: NativeResourceRequest,
    existing: Option<ResponseAffinity>,
    response: Response,
) -> Response {
    match resource.action {
        NativeResourceAction::Create => {
            let fields: &[&str] = match resource.namespace {
                ResponseNamespace::CodexFiles => &["file_id", "id"],
                ResponseNamespace::AnthropicSkillVersions => &["version", "id"],
                ResponseNamespace::OpenAiRealtimeCalls | ResponseNamespace::CodexRealtimeCalls => {
                    &["call_id", "id"]
                }
                _ => &["id"],
            };
            let context = crate::resource_capture::CaptureContext::native(
                resource.namespace,
                owner,
                destination,
                resource.parent_id,
            );
            crate::resource_capture::capture_with_json_fields(state, context, response, fields)
                .await
        }
        NativeResourceAction::Delete if response.status().is_success() => {
            if let Some(affinity) = existing {
                let store = state.provider_store.response_affinities();
                if resource.namespace == ResponseNamespace::AnthropicSkills
                    && store
                        .remove_children(
                            ResponseNamespace::AnthropicSkillVersions,
                            &affinity.response_id,
                            &owner,
                            &affinity.destination,
                        )
                        .is_err()
                {
                    return unavailable("native child resource affinities could not be removed");
                }
                if store.remove_if_matches(&affinity).is_err() {
                    return unavailable("native resource affinity could not be removed");
                }
            }
            response
        }
        NativeResourceAction::Use | NativeResourceAction::Delete => response,
    }
}

async fn filter_native_list_response(
    state: &AppState,
    owner: &ResponseOwner,
    list: &NativeListRequest,
    response: Response,
) -> Response {
    if !response.status().is_success() {
        return response;
    }
    let (mut parts, body) = response.into_parts();
    let Ok(bytes) = axum::body::to_bytes(body, state.max_proxy_request_bytes).await else {
        return anthropic_error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "upstream native resource list exceeds the proxy limit",
        );
    };
    let Ok(serde_json::Value::Object(mut document)) =
        serde_json::from_slice::<serde_json::Value>(&bytes)
    else {
        return anthropic_error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "upstream native resource list is not a JSON object",
        );
    };
    let Ok(affinities) = state
        .provider_store
        .response_affinities()
        .list(list.namespace, owner)
    else {
        return unavailable("native resource affinity is unavailable");
    };
    let owned_ids = affinities
        .into_iter()
        .filter(|affinity| {
            list.parent_id
                .as_ref()
                .is_none_or(|parent| affinity.parent_id.as_ref() == Some(parent))
        })
        .map(|affinity| affinity.response_id)
        .collect::<std::collections::HashSet<_>>();
    let Some(data) = document
        .get_mut("data")
        .and_then(serde_json::Value::as_array_mut)
    else {
        return anthropic_error(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "upstream native resource list has no data array",
        );
    };
    data.retain(|item| list_item_id(item, list.namespace).is_some_and(|id| owned_ids.contains(id)));
    let first_id = data
        .first()
        .and_then(|item| list_item_id(item, list.namespace))
        .map(str::to_string);
    let last_id = data
        .last()
        .and_then(|item| list_item_id(item, list.namespace))
        .map(str::to_string);
    if document.contains_key("first_id") {
        document.insert(
            "first_id".to_string(),
            first_id.map_or(serde_json::Value::Null, serde_json::Value::String),
        );
    }
    if document.contains_key("last_id") {
        document.insert(
            "last_id".to_string(),
            last_id.map_or(serde_json::Value::Null, serde_json::Value::String),
        );
    }
    let Ok(encoded) = serde_json::to_vec(&serde_json::Value::Object(document)) else {
        return unavailable("native resource list could not be encoded");
    };
    parts.headers.remove("content-length");
    Response::from_parts(parts, Body::from(encoded))
}

fn list_item_id(item: &serde_json::Value, namespace: ResponseNamespace) -> Option<&str> {
    let field = if namespace == ResponseNamespace::AnthropicSkillVersions {
        "version"
    } else {
        "id"
    };
    item.get(field)
        .or_else(|| item.get("id"))
        .and_then(serde_json::Value::as_str)
        .filter(|id| !id.is_empty())
}

fn response_references(
    service: Service,
    path: &str,
    body: &[u8],
) -> Vec<(ResponseNamespace, String)> {
    let response_namespace = match (service, path) {
        (
            Service::OpenAi,
            "/api/services/openai/v1/responses/compact"
            | "/api/services/openai/v1/responses/input_tokens",
        ) => Some(ResponseNamespace::OpenAiResponses),
        (Service::Codex, "/api/services/codex/v1/responses/compact") => {
            Some(ResponseNamespace::CodexResponses)
        }
        _ => None,
    };
    let Ok(document) = serde_json::from_slice::<serde_json::Value>(body) else {
        return Vec::new();
    };
    let mut references = Vec::new();
    if let Some(namespace) = response_namespace
        && let Some(id) = document
            .get("previous_response_id")
            .and_then(serde_json::Value::as_str)
            .filter(|id| !id.is_empty())
    {
        references.push((namespace, id.to_string()));
    }
    if service == Service::OpenAi
        && path == "/api/services/openai/v1/responses/input_tokens"
        && let Some(id) = document.get("conversation").and_then(|conversation| {
            conversation
                .as_str()
                .or_else(|| conversation.get("id").and_then(serde_json::Value::as_str))
        })
        && !id.is_empty()
    {
        let reference = (ResponseNamespace::OpenAiConversations, id.to_string());
        if !references.contains(&reference) {
            references.push(reference);
        }
    }
    references
}

fn requires_json_object(service: Service, method: &Method, path: &str) -> bool {
    if method != Method::POST {
        return false;
    }
    match service {
        Service::OpenAi => matches!(
            path,
            "/api/services/openai/v1/responses/compact"
                | "/api/services/openai/v1/responses/input_tokens"
                | "/api/services/openai/v1/images/generations"
                | "/api/services/openai/v1/audio/speech"
        ),
        Service::Codex => matches!(
            path,
            "/api/services/codex/v1/responses/compact"
                | "/api/services/codex/v1/images/generations"
                | "/api/services/codex/v1/images/edits"
                | "/api/services/codex/v1/alpha/search"
        ),
        Service::Anthropic | Service::CodexBackend => false,
    }
}

fn tracks_native_usage(service: Service, path: &str) -> bool {
    match service {
        Service::OpenAi => matches!(
            path,
            "/api/services/openai/v1/responses/compact"
                | "/api/services/openai/v1/images/generations"
                | "/api/services/openai/v1/images/edits"
                | "/api/services/openai/v1/images/variations"
                | "/api/services/openai/v1/audio/speech"
                | "/api/services/openai/v1/audio/transcriptions"
                | "/api/services/openai/v1/audio/translations"
        ),
        Service::Codex => matches!(
            path,
            "/api/services/codex/v1/responses/compact"
                | "/api/services/codex/v1/images/generations"
                | "/api/services/codex/v1/images/edits"
                | "/api/services/codex/v1/alpha/search"
        ),
        Service::Anthropic | Service::CodexBackend => false,
    }
}

fn created_response_namespace(service: Service, path: &str) -> Option<ResponseNamespace> {
    match (service, path) {
        (Service::OpenAi, "/api/services/openai/v1/responses/compact") => {
            Some(ResponseNamespace::OpenAiResponses)
        }
        (Service::Codex, "/api/services/codex/v1/responses/compact") => {
            Some(ResponseNamespace::CodexResponses)
        }
        _ => None,
    }
}

fn referenced_response_affinity(
    state: &AppState,
    owner: &ResponseOwner,
    service: Service,
    path: &str,
    body: &[u8],
) -> Result<Option<ResponseAffinity>, Response> {
    let store = state.provider_store.response_affinities();
    let mut selected: Option<ResponseAffinity> = None;
    for (namespace, id) in response_references(service, path, body) {
        let affinity = store
            .lookup(namespace, &id, owner)
            .map_err(|_| unavailable("resource affinity is unavailable"))?
            .ok_or_else(|| {
                error(
                    StatusCode::NOT_FOUND,
                    "not_found_error",
                    "the referenced response resource is unavailable",
                )
            })?;
        if selected
            .as_ref()
            .is_some_and(|existing| existing.destination != affinity.destination)
        {
            return Err(error(
                StatusCode::CONFLICT,
                "invalid_request_error",
                "the referenced response resources do not share one provider account",
            ));
        }
        selected = Some(affinity);
    }
    Ok(selected)
}

const fn route_belongs(route: crate::route_contract::RouteSpec, service: Service) -> bool {
    matches!(
        (route.id, service),
        (RouteId::NativeOpenAi, Service::OpenAi)
            | (RouteId::NativeAnthropic, Service::Anthropic)
            | (RouteId::NativeCodex, Service::Codex)
            | (RouteId::NativeCodexBackend, Service::CodexBackend)
    )
}
