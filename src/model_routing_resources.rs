fn anthropic_message_resource_destination(
    state: &AppState,
    owner: &crate::response_affinity::ResponseOwner,
    body: &Value,
) -> Result<Option<crate::response_affinity::AffinityDestination>, Response> {
    use crate::response_affinity::{AffinityDestination, ResponseNamespace};

    let mut references = Vec::<(ResponseNamespace, String, Option<String>)>::new();
    collect_anthropic_file_references(body, &mut references);
    if let Some(skills) = body
        .get("container")
        .and_then(Value::as_object)
        .and_then(|container| container.get("skills"))
        .and_then(Value::as_array)
    {
        for skill in skills {
            if skill.get("type").and_then(Value::as_str) != Some("custom") {
                continue;
            }
            let skill_id = skill
                .get("skill_id")
                .and_then(Value::as_str)
                .filter(|id| !id.is_empty())
                .ok_or_else(|| {
                    crate::proxy::error_response(
                        StatusCode::BAD_REQUEST,
                        "invalid_request_error",
                        "a custom Anthropic skill requires a non-empty skill_id",
                    )
                })?;
            references.push((
                ResponseNamespace::AnthropicSkills,
                skill_id.to_string(),
                None,
            ));
            if let Some(version) = skill
                .get("version")
                .and_then(Value::as_str)
                .filter(|version| !version.is_empty() && *version != "latest")
            {
                references.push((
                    ResponseNamespace::AnthropicSkillVersions,
                    version.to_string(),
                    Some(skill_id.to_string()),
                ));
            }
        }
    }
    let mut destination: Option<AffinityDestination> = None;
    for (namespace, id, parent_id) in references {
        let store = state.provider_store.response_affinities();
        let affinity = parent_id
            .as_deref()
            .map_or_else(
                || store.lookup(namespace, &id, owner),
                |parent_id| store.lookup_child(namespace, &id, parent_id, owner),
            )
            .map_err(|_| {
                crate::proxy::error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "api_error",
                    "Anthropic native resource affinity is unavailable",
                )
            })?
            .ok_or_else(|| {
                crate::proxy::error_response(
                    StatusCode::NOT_FOUND,
                    "not_found_error",
                    "the referenced Anthropic native resource is unavailable",
                )
            })?;
        if !matches!(
            affinity.destination,
            AffinityDestination::Subscription {
                provider: SubscriptionProvider::Claude,
                ..
            }
        ) {
            return Err(crate::proxy::error_response(
                StatusCode::CONFLICT,
                "invalid_request_error",
                "the referenced resource is not owned by a native Anthropic account",
            ));
        }
        if destination
            .as_ref()
            .is_some_and(|selected| selected != &affinity.destination)
        {
            return Err(crate::proxy::error_response(
                StatusCode::CONFLICT,
                "invalid_request_error",
                "the referenced Anthropic resources do not share one account and workspace",
            ));
        }
        destination = Some(affinity.destination);
    }
    Ok(destination)
}

fn collect_anthropic_file_references(
    value: &Value,
    references: &mut Vec<(
        crate::response_affinity::ResponseNamespace,
        String,
        Option<String>,
    )>,
) {
    match value {
        Value::Object(object) => {
            if matches!(
                object.get("type").and_then(Value::as_str),
                Some("file" | "container_upload")
            ) && let Some(file_id) = object
                .get("file_id")
                .and_then(Value::as_str)
                .filter(|id| !id.is_empty())
            {
                references.push((
                    crate::response_affinity::ResponseNamespace::AnthropicFiles,
                    file_id.to_string(),
                    None,
                ));
            }
            for child in object.values() {
                collect_anthropic_file_references(child, references);
            }
        }
        Value::Array(items) => {
            for item in items {
                collect_anthropic_file_references(item, references);
            }
        }
        Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_) => {}
    }
}
