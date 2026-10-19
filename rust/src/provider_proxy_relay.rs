//! Settled relay of a provider stream (issues #258 and #668).

use futures_util::StreamExt;

/// Response-identity contract applied while a provider stream is relayed.
#[derive(Default)]
pub(super) struct SettledRelayIdentity {
    pub(super) requested_model: Option<String>,
    pub(super) model_policy: Option<crate::model_contract::ModelAccessPolicy>,
    pub(super) selector_kind: crate::model_contract::ModelSelectorKind,
    pub(super) completion_audit: Option<crate::audit::ResponseModelAudit>,
}

/// Relay an upstream stream, recording each frame and settling it at the end.
///
/// Split out so the settlement can be exercised directly: this is the code path
/// whose absence left every `OpenAI` and Gemini stream without a terminal record
/// (issue #258), and a defect here is invisible until a log is read days later.
pub(super) fn settled_relay_stream(
    upstream: reqwest::Response,
    response_log: std::sync::Arc<crate::request_log::RequestLog>,
    correlation_id: String,
    logger: log_lazy::LogLazy,
    mut usage: Option<crate::usage::UsageTracker>,
    model_identity: SettledRelayIdentity,
) -> impl futures_util::Stream<Item = Result<bytes::Bytes, std::io::Error>> + use<> {
    let started = std::time::Instant::now();
    let status = axum::http::StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(axum::http::StatusCode::BAD_GATEWAY);
    let in_band_dialect =
        crate::proxy::in_band_dialect(status, upstream.headers(), upstream.url().path());
    let outcome = std::sync::Arc::new(std::sync::Mutex::new(new_stream_outcome(
        upstream.headers(),
    )));
    let end_outcome = std::sync::Arc::clone(&outcome);
    let end_log = std::sync::Arc::clone(&response_log);
    let end_id = correlation_id.clone();
    let mut identity = crate::output_limit::ResponsesStreamRewriter::new(
        model_identity
            .requested_model
            .as_deref()
            .unwrap_or_default(),
        None,
    );
    if let Some(policy) = model_identity.model_policy.as_ref() {
        identity = identity
            .with_model_policy(policy)
            .with_selector_kind(model_identity.selector_kind);
    }
    let completion_audit = model_identity.completion_audit;
    let identity_state = std::sync::Arc::new(std::sync::Mutex::new((identity, false)));
    let chunk_identity_state = std::sync::Arc::clone(&identity_state);
    let chunk_completion_audit = completion_audit.clone();
    let stream = upstream.bytes_stream().map(move |chunk| {
        let mut settled = outcome.lock().expect("stream outcome lock");
        match &chunk {
            Ok(bytes) => {
                response_log.record_upstream_body(&correlation_id, bytes);
                account_for_frame(&mut settled, bytes);
                if let Some(tracker) = &mut usage {
                    tracker.feed(bytes);
                }
            }
            Err(error) => settled.detail = Some(error.to_string()),
        }
        drop(settled);
        chunk
            .map(|bytes| {
                let mut state = chunk_identity_state
                    .lock()
                    .expect("stream identity state lock");
                let (identity, model_audited) = &mut *state;
                let output = if identity.active() {
                    let output = bytes::Bytes::from(identity.push(&bytes));
                    let served_model = identity.upstream_model().map(str::to_string);
                    if !*model_audited
                        && let (Some(audit), Some(served_model)) =
                            (chunk_completion_audit.as_ref(), served_model.as_deref())
                    {
                        audit.record_verified(served_model);
                        *model_audited = true;
                    }
                    output
                } else {
                    bytes
                };
                drop(state);
                output
            })
            .map_err(std::io::Error::other)
    });
    let stream = stream.chain(futures_util::stream::once(async move {
        let output = {
            let mut state = identity_state.lock().expect("stream identity state lock");
            let (identity, model_audited) = &mut *state;
            let output = identity.finish();
            let served_model = identity.upstream_model().map(str::to_string);
            if !*model_audited
                && let (Some(audit), Some(served_model)) =
                    (completion_audit.as_ref(), served_model.as_deref())
            {
                audit.record_verified(served_model);
                *model_audited = true;
            }
            drop(state);
            output
        };
        Ok::<bytes::Bytes, std::io::Error>(bytes::Bytes::from(output))
    }));
    crate::stream_termination::in_band_errors(stream, in_band_dialect)
        .chain(futures_util::stream::once(async move {
            crate::request_log::settle_stream(
                &end_log,
                &end_id,
                &end_outcome,
                started.elapsed().as_millis(),
                &logger,
            );
            Err(std::io::Error::other(
                crate::request_log::STREAM_END_MARKER,
            ))
        }))
        .take_while(|item| {
            futures_util::future::ready(
                !matches!(item, Err(error) if error.to_string() == crate::request_log::STREAM_END_MARKER),
            )
        })
}

/// Fold one relayed frame into the outcome being accumulated.
///
/// Counting the frame is bookkeeping; noticing the dialect's terminator is the
/// part that matters, since it is what lets the terminal record say the turn
/// completed rather than leaving its ending unknown (issue #258).
pub(super) fn account_for_frame(outcome: &mut crate::request_log::StreamOutcome, bytes: &[u8]) {
    outcome.frames += 1;
    outcome.bytes += bytes.len() as u64;
    if crate::request_log::frame_terminates_stream(bytes) {
        outcome.terminated = true;
    }
}

/// The starting outcome for a stream this relay is about to forward.
///
/// A relay that never settles its streams leaves every one of its exchanges
/// with no terminal record, so the log can only report the ending as unknown
/// (issue #258). `inspectable` comes from the upstream headers, since a
/// compressed body cannot be scanned for a terminator (issue #255).
pub(super) fn new_stream_outcome(
    headers: &reqwest::header::HeaderMap,
) -> crate::request_log::StreamOutcome {
    crate::request_log::StreamOutcome {
        streamed: true,
        terminated: false,
        inspectable: crate::request_log::body_is_inspectable(headers),
        detail: None,
        frames: 0,
        bytes: 0,
        duration_ms: 0,
    }
}
