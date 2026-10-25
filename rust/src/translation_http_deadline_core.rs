//! Closed HTTP deadline operations with explicit cleanup of an interrupted read.
//! Matching JavaScript waits for its known HTTP continuation to release loans.
use crate::translation_async_control_core::{self as control, Cancellation, ControlError};
use crate::translation_core::Json;
use crate::translation_http_transport_core::{self as transport, Client, Stream};
use std::sync::atomic::{AtomicBool, Ordering};

/// Open one owned stream under the actual cancellation/deadline operation.
pub async fn open(
    milliseconds: u64,
    client: &Client,
    request: &Json,
    cancellation: &Cancellation,
) -> Result<Result<Stream, String>, ControlError> {
    control::with_deadline(milliseconds, cancellation, |child| async move {
        transport::open(client, request, &child).await
    })
    .await
}

/// End a started timed-out/cancelled read with its actual stream closed.
pub async fn read(
    milliseconds: u64,
    stream: &mut Stream,
    cancellation: &Cancellation,
) -> Result<Result<Option<String>, String>, ControlError> {
    let started = AtomicBool::new(false);
    let observed = &started;
    let result = {
        let borrowed = &mut *stream;
        control::with_deadline(milliseconds, cancellation, move |child| {
            observed.store(true, Ordering::Relaxed);
            async move { transport::read(borrowed, &child).await }
        })
        .await
    };
    if started.load(Ordering::Relaxed) && result.is_err() {
        transport::close(stream);
    }
    result
}

/// Send and collect a bounded response, dropping its internal stream on timeout.
pub async fn send(
    milliseconds: u64,
    client: &Client,
    request: &Json,
    cancellation: &Cancellation,
) -> Result<Result<Json, String>, ControlError> {
    control::with_deadline(milliseconds, cancellation, |child| async move {
        transport::send(client, request, &child).await
    })
    .await
}
