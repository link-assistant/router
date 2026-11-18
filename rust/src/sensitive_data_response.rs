use std::collections::HashMap;
use std::io;
use std::sync::Arc;

use axum::body::{Body, Bytes};
use axum::response::Response;
use futures_util::{StreamExt, stream};

#[path = "sensitive_data_sse.rs"]
mod sse;

const PREFIX: &[u8] = b"[[Router_";
const SUFFIX: &[u8] = b"]]";
const MAX_TOKEN_BYTES: usize = 116;
const MAX_RESTORED_BYTES: usize = 8 * 1024 * 1024;

#[derive(Clone)]
pub(super) struct Replacements {
    values: Arc<HashMap<Vec<u8>, Vec<u8>>>,
    pending: Vec<u8>,
    restored_bytes: usize,
}

impl Replacements {
    pub(super) fn new(entries: Vec<(String, String)>) -> Option<Self> {
        if entries.len() > 256 {
            return None;
        }
        let mut values = HashMap::with_capacity(entries.len());
        for (token, original) in entries {
            if !valid_token(&token) || original.is_empty() {
                return None;
            }
            let escaped = serde_json::to_vec(&original).ok()?;
            if values
                .insert(token.into_bytes(), escaped[1..escaped.len() - 1].to_vec())
                .is_some()
            {
                return None;
            }
        }
        Some(Self {
            values: Arc::new(values),
            pending: Vec::new(),
            restored_bytes: 0,
        })
    }

    pub(super) fn feed(&mut self, chunk: &[u8], eof: bool) -> io::Result<Bytes> {
        let mut input = std::mem::take(&mut self.pending);
        input.extend_from_slice(chunk);
        let mut output = Vec::with_capacity(input.len());
        let mut remaining = input.as_slice();
        while !remaining.is_empty() {
            let Some(begin) = remaining
                .windows(PREFIX.len())
                .position(|part| part == PREFIX)
            else {
                let len = if eof {
                    remaining.len()
                } else {
                    remaining.len().saturating_sub(PREFIX.len() - 1)
                };
                output.extend_from_slice(&remaining[..len]);
                remaining = &remaining[len..];
                break;
            };
            output.extend_from_slice(&remaining[..begin]);
            remaining = &remaining[begin..];
            let window = &remaining[..remaining.len().min(MAX_TOKEN_BYTES)];
            let finish = window[PREFIX.len()..]
                .windows(SUFFIX.len())
                .position(|part| part == SUFFIX);
            if let Some(finish) = finish {
                let end = PREFIX.len() + finish + SUFFIX.len();
                if let Some(original) = self.values.get(&remaining[..end]) {
                    self.restored_bytes += original.len();
                    if self.restored_bytes > MAX_RESTORED_BYTES {
                        return Err(io::Error::other("sensitive data restoration exceeds limit"));
                    }
                    output.extend_from_slice(original);
                    remaining = &remaining[end..];
                    continue;
                }
            } else if !eof && window.len() < MAX_TOKEN_BYTES {
                break;
            }
            // Keep searching after unknown openers, including overlapping ones.
            output.push(remaining[0]);
            remaining = &remaining[1..];
        }
        self.pending.extend_from_slice(remaining);
        Ok(output.into())
    }
}

fn valid_token(value: &str) -> bool {
    let Some(token) = value
        .strip_prefix("[[Router_")
        .and_then(|token| token.strip_suffix("]]"))
    else {
        return false;
    };
    let mut parts = token.split('_');
    let (Some(namespace), Some(label), Some(number), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return false;
    };
    namespace.len() == 32
        && namespace
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
        && (1..=64).contains(&label.len())
        && label.as_bytes()[0].is_ascii_alphabetic()
        && label.bytes().all(|byte| byte.is_ascii_alphanumeric())
        && (1..=6).contains(&number.len())
        && !number.starts_with('0')
        && number.bytes().all(|byte| byte.is_ascii_digit())
}

pub(super) fn restore(response: Response, replacements: Replacements) -> Response {
    if replacements.values.is_empty() {
        return response;
    }
    let (mut parts, body) = response.into_parts();
    let mime = parts
        .headers
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    let identity = parts
        .headers
        .get("content-encoding")
        .is_none_or(|value| value.as_bytes().eq_ignore_ascii_case(b"identity"));
    if !identity
        || !(matches!(mime.as_str(), "application/json" | "text/event-stream")
            || mime.ends_with("+json"))
    {
        return Response::from_parts(parts, body);
    }
    for name in [
        "content-length",
        "content-md5",
        "digest",
        "content-digest",
        "etag",
    ] {
        parts.headers.remove(name);
    }
    let deltas = (mime == "text/event-stream").then(sse::SseDeltas::default);
    let chunks = stream::unfold(
        (Some(body.into_data_stream()), replacements, deltas),
        |(source, mut replacements, mut deltas)| async move {
            let mut source = source?;
            loop {
                match source.next().await {
                    Some(Ok(chunk)) => {
                        let joined = deltas
                            .as_mut()
                            .map(|state| state.feed(&chunk, false, &replacements.values));
                        match replacements.feed(joined.as_deref().unwrap_or(&chunk), false) {
                            Ok(restored) if restored.is_empty() => {}
                            Ok(restored) => {
                                return Some((Ok(restored), (Some(source), replacements, deltas)));
                            }
                            Err(error) => return Some((Err(error), (None, replacements, deltas))),
                        }
                    }
                    Some(Err(error)) => {
                        return Some((Err(io::Error::other(error)), (None, replacements, deltas)));
                    }
                    None => {
                        let tail = deltas
                            .as_mut()
                            .map(|state| state.feed(&[], true, &replacements.values));
                        return match replacements.feed(tail.as_deref().unwrap_or_default(), true) {
                            Ok(tail) if tail.is_empty() => None,
                            result => Some((result, (None, replacements, deltas))),
                        };
                    }
                }
            }
        },
    );
    Response::from_parts(parts, Body::from_stream(chunks))
}
