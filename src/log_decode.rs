//! Decoding of stored response bodies for log inspection.
//!
//! `stream_not_verifiable` was not a limit of what the log could know — it was
//! a decision not to decompress. The bytes were already stored, and a
//! streaming decoder reads them back into plain SSE, yet on a real deployment
//! 1163 of ~1600 exchanges were declared unknowable, including every streamed
//! one (issue #328).
//!
//! Two properties of the stored form drive the shape here:
//!
//! - The body is stored **frame by frame**, each record independently
//!   base64-encoded. Only the concatenation is a valid compressed stream, so a
//!   one-shot decode of any single record fails; the whole sequence is joined
//!   before decoding.
//! - A stream captured mid-flight has **no end-of-stream marker**. A decoder
//!   that insists on one rejects exactly the truncated streams this exists to
//!   identify, so every decoder here keeps whatever plaintext it produced
//!   before the input ran out.
//!
//! `br` is what the vendor actually returns on the traffic this was found on,
//! so gzip alone would have left most exchanges unreadable.

/// Content encodings a stored body can be decoded from.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Encoding {
    /// No encoding, or an explicit `identity`.
    Identity,
    /// `gzip` or its `x-gzip` spelling.
    Gzip,
    /// Raw `deflate`.
    Deflate,
    /// `br`.
    Brotli,
    /// `zstd`.
    Zstd,
}

impl Encoding {
    /// Read an encoding from a `content-encoding` header value.
    ///
    /// Returns `None` for an encoding this router cannot decode, which is what
    /// keeps "not verifiable" meaning "genuinely unreadable" rather than
    /// "not attempted".
    #[must_use]
    pub fn parse(header: &str) -> Option<Self> {
        // A comma-separated list applies its encodings in order, so the last
        // one is the outermost and the only one a single pass can remove.
        let last = header
            .split(',')
            .map(str::trim)
            .rfind(|part| !part.is_empty())
            .unwrap_or("");
        match last.to_ascii_lowercase().as_str() {
            "" | "identity" => Some(Self::Identity),
            "gzip" | "x-gzip" => Some(Self::Gzip),
            "deflate" => Some(Self::Deflate),
            "br" => Some(Self::Brotli),
            "zstd" => Some(Self::Zstd),
            _ => None,
        }
    }

    /// Whether bytes under this encoding are readable without decoding.
    #[must_use]
    pub const fn is_identity(self) -> bool {
        matches!(self, Self::Identity)
    }
}

/// Decode `body` under `encoding`, keeping whatever plaintext was produced.
///
/// Returns `None` only when nothing at all could be read, so a stream that was
/// cut mid-frame still yields the frames that arrived — which is the case the
/// inspection exists for.
#[must_use]
pub fn decode(body: &[u8], encoding: Encoding) -> Option<String> {
    if body.is_empty() {
        return None;
    }
    let decoded = match encoding {
        Encoding::Identity => body.to_vec(),
        Encoding::Gzip => partial(flate2::read::GzDecoder::new(body)),
        Encoding::Deflate => partial(flate2::read::DeflateDecoder::new(body)),
        Encoding::Brotli => partial(brotli::Decompressor::new(body, BROTLI_BUFFER)),
        Encoding::Zstd => zstd::stream::read::Decoder::new(body).map_or_else(
            |_| Vec::new(),
            |decoder| partial(std::io::BufReader::new(decoder)),
        ),
    };
    if decoded.is_empty() {
        return None;
    }
    // A stream cut mid-character leaves a partial UTF-8 sequence at the end;
    // the frames before it are still readable and still answer the question.
    Some(String::from_utf8_lossy(&decoded).into_owned())
}

/// Brotli's ring buffer size; the crate's own recommended default.
const BROTLI_BUFFER: usize = 4096;

/// Read everything a decoder produces, stopping at the first error.
///
/// A truncated compressed stream errors partway through. Discarding the
/// plaintext already produced would report a truncated stream as unreadable —
/// the exact false negative this module removes.
fn partial<R: std::io::Read>(mut reader: R) -> Vec<u8> {
    let mut decoded = Vec::new();
    let mut chunk = [0_u8; BROTLI_BUFFER];
    loop {
        match reader.read(&mut chunk) {
            // A truncated stream errors partway through; both endings mean
            // "no more plaintext", and what was produced is kept either way.
            Ok(0) | Err(_) => break,
            Ok(read) => decoded.extend_from_slice(&chunk[..read]),
        }
    }
    decoded
}

#[cfg(test)]
#[path = "log_decode_tests.rs"]
mod tests;
