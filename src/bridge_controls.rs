//! Execution-control validation for stateless Responses-to-Anthropic bridges.

use serde_json::Value;

pub fn validate_responses(request: &crate::responses::OpenAIResponseRequest) -> Result<(), String> {
    crate::safety_identifier::validate_openai(request.safety_identifier.as_deref())?;
    if request
        .top_p
        .is_some_and(|top_p| !(0.0..=1.0).contains(&top_p))
    {
        return Err("top_p must be between 0 and 1".into());
    }
    if request.temperature.is_some() && request.top_p.is_some() {
        return Err("temperature and top_p cannot both be represented by Anthropic".into());
    }
    if request.background == Some(true) {
        return Err(
            "background responses cannot be created through an Anthropic bridge; use a synchronous request"
                .into(),
        );
    }
    if request.store == Some(true) {
        return Err(
            "stored responses cannot be created through an Anthropic bridge; use store=false"
                .into(),
        );
    }
    if request
        .truncation
        .as_ref()
        .filter(|value| !value.is_null())
        .is_some_and(|value| value.as_str() != Some("disabled"))
    {
        return Err("only truncation=disabled can be represented by an Anthropic bridge".into());
    }
    if request
        .stream_options
        .as_ref()
        .filter(|value| !value.is_null())
        .is_some_and(|value| value.as_object().is_none_or(|options| !options.is_empty()))
    {
        return Err("non-empty stream_options cannot be represented by an Anthropic bridge".into());
    }
    if let Some(limit) = request.max_tool_calls {
        if limit == 0 {
            return Err("max_tool_calls must be greater than zero".into());
        }
        let server_tools = request
            .tools
            .as_ref()
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter(|tool| {
                matches!(
                    tool.get("type").and_then(Value::as_str),
                    Some("web_search" | "web_fetch")
                )
            })
            .count();
        if server_tools > 1 {
            return Err(
                "max_tool_calls cannot be enforced losslessly across multiple server tools".into(),
            );
        }
    }
    Ok(())
}

pub fn install_max_tool_calls(body: &mut Value, limit: Option<u32>) {
    let Some(limit) = limit else {
        return;
    };
    let Some(tools) = body.get_mut("tools").and_then(Value::as_array_mut) else {
        return;
    };
    let mut server_tools = tools.iter_mut().filter(|tool| {
        tool.get("type")
            .and_then(Value::as_str)
            .is_some_and(|kind| kind.starts_with("web_search_") || kind.starts_with("web_fetch_"))
    });
    if let Some(tool) = server_tools.next()
        && server_tools.next().is_none()
    {
        tool["max_uses"] = Value::from(limit);
    }
}
