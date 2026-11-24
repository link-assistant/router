/// Provider-independent fields owned by the Chat Completions surface.
///
/// Passthrough providers may accept extensions and some provide a default
/// model, so validating the entire normalized request here would narrow their
/// public contract. `messages`, however, belongs to Chat Completions itself and
/// must exist before routing or translating to any upstream dialect (#387).
#[derive(serde::Deserialize)]
struct RequiredChatFields {
    #[allow(dead_code)]
    messages: Vec<openai::ChatMessage>,
}

/// Record dropped tools locally without extending a public vendor protocol.
fn report_dropped_tools(
    state: &AppState,
    headers: &HeaderMap,
    response: Response,
    dropped: &[String],
) -> Response {
    if dropped.is_empty() {
        return response;
    }
    let summary = dropped.join(", ");
    state.logger.debug(|| {
        format!(
            "dropped {} tool(s) Anthropic cannot represent: {summary}",
            dropped.len()
        )
    });
    state.request_log.record(
        &crate::request_log::correlation_id(headers),
        "translation_diagnostic",
        serde_json::json!({"dropped_tools": dropped}),
    );
    response
}
