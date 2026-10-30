//! Bounded byte-safe SSE interface. Transport/library internals remain native.
use base64::{Engine as _, engine::general_purpose::STANDARD};
use crate::translation_core::Json;

const MAX_BUFFER: usize = 1_048_576;
const MAX_BLOCKS: usize = 1_024;

/// Preserve pending bytes atomically; no transport chunk is decoded prematurely.
pub fn sse_push_base64(pending: &str, chunk: &str) -> Result<Json, String> {
    // Bound encoded inputs before allocating a decoded buffer.
    if pending.len() > 1_398_104 || chunk.len() > 1_398_104 {
        return Err(String::from("SSE buffer exceeds limit"));
    }
    let mut buffer = STANDARD.decode(pending).map_err(|_| String::from("invalid SSE pending base64"))?;
    let bytes = STANDARD.decode(chunk).map_err(|_| String::from("invalid SSE chunk base64"))?;
    if buffer.len().saturating_add(bytes.len()) > MAX_BUFFER {
        return Err(String::from("SSE buffer exceeds limit"));
    }
    // Reject excessive tiny frames before the original drain-based framer runs.
    let mut delimiter_count = 0;
    let mut at = 0;
    buffer.extend_from_slice(&bytes);
    while at < buffer.len() {
        let remaining = &buffer[at..];
        let width = if remaining.starts_with(b"\r\n\r\n") { 4 } else if remaining.starts_with(b"\n\n") { 2 } else { 0 };
        if width > 0 {
            delimiter_count += 1;
            if delimiter_count > MAX_BLOCKS {
                return Err(String::from("SSE block count exceeds limit"));
            }
            at += width;
        } else {
            at += 1;
        }
    }
    let blocks = crate::sse::push_blocks(&mut buffer, &[]);
    if blocks.len() > MAX_BLOCKS {
        return Err(String::from("SSE block count exceeds limit"));
    }
    Ok(serde_json::json!({"pending": STANDARD.encode(buffer), "blocks": blocks}))
}
