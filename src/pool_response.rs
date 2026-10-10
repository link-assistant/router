//! Bounded pre-relay inspection and byte-preserving pool response streams.

use axum::http::{HeaderMap, StatusCode};
use bytes::{Bytes, BytesMut};
use futures_util::{StreamExt, stream::BoxStream};

const MAX_ERROR_BYTES: usize = 16 * 1024;

pub struct PoolResponse {
    status: StatusCode,
    headers: HeaderMap,
    body: BoxStream<'static, reqwest::Result<Bytes>>,
}

impl PoolResponse {
    /// Inspect an error body, or require a body byte before accepting a
    /// streaming success. All inspected bytes remain in the relay stream.
    pub(crate) async fn prepare(
        response: reqwest::Response,
        probe: bool,
    ) -> Result<(Self, Bytes), String> {
        let status = response.status();
        let headers = response.headers().clone();
        let mut body = response.bytes_stream().boxed();
        let mut chunks = Vec::new();
        let mut prefix = BytesMut::new();
        let mut pending = None;
        let inspect_error = !status.is_success();
        if inspect_error || probe {
            loop {
                match body.next().await {
                    Some(Ok(chunk)) if chunk.is_empty() => {}
                    Some(Ok(chunk)) => {
                        if inspect_error {
                            let count = chunk.len().min(MAX_ERROR_BYTES - prefix.len());
                            prefix.extend_from_slice(&chunk[..count]);
                        }
                        chunks.push(Ok(chunk));
                        if !inspect_error || prefix.len() >= MAX_ERROR_BYTES {
                            break;
                        }
                    }
                    Some(Err(error)) if !inspect_error => return Err(error.to_string()),
                    Some(Err(error)) => {
                        pending = Some(Err(error));
                        break;
                    }
                    None if !inspect_error => {
                        return Err("upstream stream ended before its first body byte".into());
                    }
                    None => break,
                }
            }
        }
        Ok((
            Self {
                status,
                headers,
                body: futures_util::stream::iter(chunks)
                    .chain(futures_util::stream::iter(pending))
                    .chain(body)
                    .boxed(),
            },
            prefix.freeze(),
        ))
    }

    pub(crate) fn observe(mut self, mut observer: crate::pool_stream_limits::StreamLimits) -> Self {
        self.body = self
            .body
            .map(move |chunk| {
                if let Ok(bytes) = &chunk {
                    observer.push(bytes);
                }
                chunk
            })
            .boxed();
        self
    }

    pub(crate) const fn status(&self) -> StatusCode {
        self.status
    }
    pub(crate) const fn headers(&self) -> &HeaderMap {
        &self.headers
    }
    pub(crate) fn bytes_stream(self) -> BoxStream<'static, reqwest::Result<Bytes>> {
        self.body
    }

    pub(crate) async fn bytes(self) -> reqwest::Result<Bytes> {
        let mut body = self.body;
        let mut bytes = BytesMut::new();
        while let Some(chunk) = body.next().await {
            bytes.extend_from_slice(&chunk?);
        }
        Ok(bytes.freeze())
    }
}
