//! Shared semantics for Anthropic responses translated to `OpenAI` surfaces.

use serde_json::{Value, json};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct StopSemantics {
    pub chat_finish_reason: &'static str,
    pub response_status: &'static str,
    pub incomplete_reason: Option<&'static str>,
    pub refusal: bool,
}

#[must_use]
pub fn stop_semantics(reason: Option<&str>) -> StopSemantics {
    match reason.unwrap_or("end_turn") {
        "end_turn" | "stop_sequence" => complete("stop"),
        "tool_use" => complete("tool_calls"),
        "refusal" => incomplete("content_filter", "content_filter", true),
        "max_tokens" | "pause_turn" | "model_context_window_exceeded" => {
            incomplete("length", "max_output_tokens", false)
        }
        _ => incomplete("length", "max_output_tokens", false),
    }
}

const fn complete(chat_finish_reason: &'static str) -> StopSemantics {
    StopSemantics {
        chat_finish_reason,
        response_status: "completed",
        incomplete_reason: None,
        refusal: false,
    }
}

const fn incomplete(
    chat_finish_reason: &'static str,
    reason: &'static str,
    refusal: bool,
) -> StopSemantics {
    StopSemantics {
        chat_finish_reason,
        response_status: "incomplete",
        incomplete_reason: Some(reason),
        refusal,
    }
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct AnthropicUsage {
    input_tokens: u64,
    cache_creation_input_tokens: u64,
    cache_read_input_tokens: u64,
    output_tokens: u64,
    service_tier: Option<String>,
    server_tool_use: Option<Value>,
}

impl AnthropicUsage {
    pub fn absorb(&mut self, usage: Option<&Value>) {
        let Some(usage) = usage else {
            return;
        };
        update(&mut self.input_tokens, usage, "input_tokens");
        update(
            &mut self.cache_creation_input_tokens,
            usage,
            "cache_creation_input_tokens",
        );
        update(
            &mut self.cache_read_input_tokens,
            usage,
            "cache_read_input_tokens",
        );
        update(&mut self.output_tokens, usage, "output_tokens");
        if let Some(tier) = usage.get("service_tier").and_then(Value::as_str) {
            self.service_tier = Some(tier.to_string());
        }
        if let Some(server_tool_use) = usage.get("server_tool_use") {
            self.server_tool_use = Some(server_tool_use.clone());
        }
    }

    #[must_use]
    pub fn from_value(usage: Option<&Value>) -> Self {
        let mut mapped = Self::default();
        mapped.absorb(usage);
        mapped
    }

    #[must_use]
    pub const fn total_input(&self) -> u64 {
        self.input_tokens
            .saturating_add(self.cache_creation_input_tokens)
            .saturating_add(self.cache_read_input_tokens)
    }

    #[must_use]
    pub fn chat(&self) -> Value {
        let input = self.total_input();
        json!({
            "prompt_tokens": input,
            "completion_tokens": self.output_tokens,
            "total_tokens": input.saturating_add(self.output_tokens),
            "prompt_tokens_details": {"cached_tokens": self.cache_read_input_tokens},
        })
    }

    #[must_use]
    pub fn responses(&self) -> Value {
        let input = self.total_input();
        let mut usage = json!({
            "input_tokens": input,
            "input_tokens_details": {"cached_tokens": self.cache_read_input_tokens},
            "output_tokens": self.output_tokens,
            "output_tokens_details": {"reasoning_tokens": 0},
            "total_tokens": input.saturating_add(self.output_tokens),
        });
        if let Some(server_tool_use) = &self.server_tool_use {
            usage["server_tool_use"] = server_tool_use.clone();
        }
        usage
    }

    #[must_use]
    pub fn openai_service_tier(&self) -> Option<&'static str> {
        match self.service_tier.as_deref() {
            Some("standard") => Some("default"),
            Some("priority") => Some("priority"),
            _ => None,
        }
    }
}

/// Map `OpenAI` usage back to Anthropic without double-counting cache hits.
#[must_use]
pub fn openai_usage_to_anthropic(usage: Option<&Value>) -> Value {
    let input_total = usage
        .and_then(|value| {
            value
                .get("input_tokens")
                .or_else(|| value.get("prompt_tokens"))
        })
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let output = usage
        .and_then(|value| {
            value
                .get("output_tokens")
                .or_else(|| value.get("completion_tokens"))
        })
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let cached = usage
        .and_then(|value| {
            value
                .pointer("/input_tokens_details/cached_tokens")
                .or_else(|| value.pointer("/prompt_tokens_details/cached_tokens"))
        })
        .and_then(Value::as_u64)
        .unwrap_or(0)
        .min(input_total);
    json!({
        "input_tokens": input_total.saturating_sub(cached),
        "cache_creation_input_tokens": 0,
        "cache_read_input_tokens": cached,
        "output_tokens": output,
    })
}

#[must_use]
pub fn anthropic_service_tier_from_openai(value: Option<&Value>) -> Option<&'static str> {
    match value.and_then(Value::as_str) {
        Some("default" | "auto") => Some("standard"),
        Some("priority") => Some("priority"),
        _ => None,
    }
}

fn update(slot: &mut u64, usage: &Value, key: &str) {
    if let Some(value) = usage.get(key).and_then(Value::as_u64) {
        *slot = value;
    }
}

/// Concatenate Anthropic text blocks and build flat `OpenAI` URL annotations.
#[must_use]
pub fn anthropic_text_and_annotations(content: Option<&Value>) -> (String, Vec<Value>) {
    let mut text = String::new();
    let mut annotations = Vec::new();
    for block in content
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
    {
        if block.get("type").and_then(Value::as_str) != Some("text") {
            continue;
        }
        let block_text = block
            .get("text")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let base = text.chars().count() as u64;
        let mut search_from = 0_usize;
        for citation in block
            .get("citations")
            .and_then(Value::as_array)
            .map(Vec::as_slice)
            .unwrap_or_default()
        {
            let Some(url) = citation_url(citation) else {
                continue;
            };
            let Some(cited) = citation.get("cited_text").and_then(Value::as_str) else {
                continue;
            };
            let Some((start, end, next)) = find_char_range(block_text, cited, search_from) else {
                continue;
            };
            search_from = next;
            annotations.push(json!({
                "type": "url_citation",
                "url": url,
                "title": citation.get("title").cloned().unwrap_or(Value::Null),
                "start_index": base.saturating_add(start),
                "end_index": base.saturating_add(end),
            }));
        }
        text.push_str(block_text);
    }
    (text, annotations)
}

fn citation_url(citation: &Value) -> Option<&str> {
    match citation.get("type").and_then(Value::as_str) {
        Some("web_search_result_location") => citation.get("url").and_then(Value::as_str),
        Some("search_result_location") => citation
            .get("source")
            .and_then(Value::as_str)
            .filter(|source| source.starts_with("https://") || source.starts_with("http://")),
        _ => None,
    }
}

fn find_char_range(text: &str, cited: &str, from: usize) -> Option<(u64, u64, usize)> {
    let relative = text.get(from..)?.find(cited)?;
    let start_byte = from + relative;
    let end_byte = start_byte + cited.len();
    let start = text.get(..start_byte)?.chars().count() as u64;
    let end = text.get(..end_byte)?.chars().count() as u64;
    Some((start, end, end_byte))
}

#[must_use]
pub fn chat_annotations(flat: &[Value]) -> Vec<Value> {
    flat.iter()
        .map(|annotation| {
            json!({
                "type": "url_citation",
                "url_citation": {
                    "url": annotation.get("url").cloned().unwrap_or(Value::Null),
                    "title": annotation.get("title").cloned().unwrap_or(Value::Null),
                    "start_index": annotation.get("start_index").cloned().unwrap_or(Value::Null),
                    "end_index": annotation.get("end_index").cloned().unwrap_or(Value::Null),
                }
            })
        })
        .collect()
}

#[must_use]
pub fn annotation_from_anthropic_delta(
    delta: &Value,
    text: &str,
    from: usize,
) -> Option<(Value, usize)> {
    let citation = delta.get("citation")?;
    let url = citation_url(citation)?;
    let cited = citation.get("cited_text").and_then(Value::as_str)?;
    let (start, end, next) = find_char_range(text, cited, from)?;
    Some((
        json!({
            "type": "url_citation",
            "url": url,
            "title": citation.get("title").cloned().unwrap_or(Value::Null),
            "start_index": start,
            "end_index": end,
        }),
        next,
    ))
}

/// Convert URL/document annotations to Anthropic citations without changing
/// their order or Unicode character offsets.
pub fn openai_annotations_to_anthropic(
    text: &str,
    annotations: Option<&Value>,
    chat_shape: bool,
) -> Result<Vec<Value>, String> {
    let Some(annotations) = annotations else {
        return Ok(Vec::new());
    };
    let annotations = annotations
        .as_array()
        .ok_or_else(|| "annotations must be an array".to_string())?;
    annotations
        .iter()
        .enumerate()
        .map(|(index, wrapper)| {
            let annotation = if chat_shape {
                wrapper.get("url_citation").unwrap_or(wrapper)
            } else {
                wrapper
            };
            let kind = annotation
                .get("type")
                .and_then(Value::as_str)
                .or_else(|| wrapper.get("type").and_then(Value::as_str))
                .unwrap_or("url_citation");
            let start = annotation
                .get("start_index")
                .and_then(Value::as_u64)
                .ok_or_else(|| format!("annotations[{index}].start_index is required"))?;
            let end = annotation
                .get("end_index")
                .and_then(Value::as_u64)
                .ok_or_else(|| format!("annotations[{index}].end_index is required"))?;
            let cited_text = char_slice(text, start, end)
                .ok_or_else(|| format!("annotations[{index}] has invalid text offsets"))?;
            match kind {
                "url_citation" => Ok(json!({
                    "type": "web_search_result_location",
                    "url": required_annotation_string(annotation, "url", index)?,
                    "title": required_annotation_string(annotation, "title", index)?,
                    "cited_text": cited_text,
                })),
                "file_citation" => Ok(json!({
                    "type": "char_location",
                    "document_index": annotation.get("document_index").and_then(Value::as_u64)
                        .ok_or_else(|| format!("annotations[{index}].document_index is required"))?,
                    "document_title": annotation.get("filename").or_else(|| annotation.get("title"))
                        .and_then(Value::as_str)
                        .ok_or_else(|| format!("annotations[{index}].filename is required"))?,
                    "start_char_index": start,
                    "end_char_index": end,
                    "cited_text": cited_text,
                })),
                _ => Err(format!(
                    "annotations[{index}] type {kind} cannot be represented by Anthropic"
                )),
            }
        })
        .collect()
}

fn required_annotation_string<'a>(
    annotation: &'a Value,
    field: &str,
    index: usize,
) -> Result<&'a str, String> {
    annotation
        .get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| format!("annotations[{index}].{field} is required"))
}

fn char_slice(text: &str, start: u64, end: u64) -> Option<String> {
    if end < start {
        return None;
    }
    let start = usize::try_from(start).ok()?;
    let end = usize::try_from(end).ok()?;
    Some(text.chars().skip(start).take(end - start).collect())
        .filter(|slice: &String| slice.chars().count() == end - start)
}

/// Validate every annotation in a successful upstream `OpenAI` response.
pub fn validate_openai_response_citations(payload: &Value) -> Result<(), String> {
    if let Some(message) = payload.pointer("/choices/0/message")
        && let Some(text) = message.get("content").and_then(Value::as_str)
    {
        openai_annotations_to_anthropic(text, message.get("annotations"), true)?;
    }
    for item in payload
        .get("output")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        for part in item
            .get("content")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            if let Some(text) = part.get("text").and_then(Value::as_str) {
                openai_annotations_to_anthropic(text, part.get("annotations"), false)?;
            }
        }
    }
    Ok(())
}

pub fn validate_anthropic_response_citations(content: Option<&Value>) -> Result<(), String> {
    for (block_index, block) in content
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .enumerate()
    {
        let Some(citations) = block.get("citations") else {
            continue;
        };
        let citations = citations
            .as_array()
            .ok_or_else(|| format!("content[{block_index}].citations must be an array"))?;
        let text = block
            .get("text")
            .and_then(Value::as_str)
            .ok_or_else(|| format!("content[{block_index}].text is required"))?;
        let mut from = 0;
        for (citation_index, citation) in citations.iter().enumerate() {
            citation_url(citation).ok_or_else(|| {
                format!("content[{block_index}].citations[{citation_index}] is not a compatible URL citation")
            })?;
            let cited = citation
                .get("cited_text")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| {
                    format!(
                        "content[{block_index}].citations[{citation_index}].cited_text is required"
                    )
                })?;
            let (_, _, next) = find_char_range(text, cited, from).ok_or_else(|| {
                format!("content[{block_index}].citations[{citation_index}] does not match its text block")
            })?;
            from = next;
        }
    }
    Ok(())
}
