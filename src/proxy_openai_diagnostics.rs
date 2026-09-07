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
