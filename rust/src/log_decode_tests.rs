//! Unit tests for [`crate::log_decode`].

use super::*;
use std::io::Write as _;

/// The SSE a Claude stream ends with, as the vendor sends it.
const TERMINATED: &str = "event: message_start\ndata: {\"type\":\"message_start\"}\n\n\
                          event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n";

fn gzip(plain: &[u8]) -> Vec<u8> {
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    encoder.write_all(plain).expect("gzip");
    encoder.finish().expect("gzip")
}

fn brotli(plain: &[u8]) -> Vec<u8> {
    let mut encoded = Vec::new();
    let mut writer = brotli::CompressorWriter::new(&mut encoded, BROTLI_BUFFER, 5, 22);
    writer.write_all(plain).expect("brotli");
    drop(writer);
    encoded
}

fn zstd(plain: &[u8]) -> Vec<u8> {
    zstd::stream::encode_all(plain, 0).expect("zstd")
}

fn deflate(plain: &[u8]) -> Vec<u8> {
    let mut encoder =
        flate2::write::DeflateEncoder::new(Vec::new(), flate2::Compression::default());
    encoder.write_all(plain).expect("deflate");
    encoder.finish().expect("deflate")
}

/// Every encoding the router advertises round-trips.
///
/// Decoding gzip alone would still have left most exchanges unreadable: `br`
/// is what the vendor actually returns on the traffic this was found on, and
/// it is the one with no stdlib decoder anywhere (issue #328).
#[test]
fn every_advertised_encoding_decodes_to_readable_sse() {
    for (encoding, encode) in [
        (Encoding::Gzip, gzip as fn(&[u8]) -> Vec<u8>),
        (Encoding::Brotli, brotli),
        (Encoding::Zstd, zstd),
        (Encoding::Deflate, deflate),
    ] {
        let decoded = decode(&encode(TERMINATED.as_bytes()), encoding)
            .unwrap_or_else(|| panic!("{encoding:?} must decode"));
        assert_eq!(decoded, TERMINATED, "{encoding:?} must round-trip exactly");
        assert!(
            decoded.contains("message_stop"),
            "{encoding:?}: the terminator must be findable after decoding"
        );
    }
}

/// A stream cut mid-flight keeps the frames that arrived.
///
/// This is the case the inspection exists for. A decoder that insists on an
/// end-of-stream marker rejects exactly the truncated streams it is meant to
/// identify, and reporting them as unreadable is the same false negative under
/// a new name.
#[test]
fn a_truncated_stream_still_yields_the_frames_that_arrived() {
    // Built the way the vendor sends one: each SSE frame flushed as it is
    // produced, so the bytes on the wire are decodable up to the cut. A
    // single-shot compression of the whole body buffers instead, and is not
    // what a relayed stream looks like.
    let framed_gzip = |frames: &[&str]| {
        let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        for frame in frames {
            encoder.write_all(frame.as_bytes()).expect("gzip");
            encoder.flush().expect("flush");
        }
        encoder.finish().expect("gzip")
    };
    let start = "event: message_start\ndata: {\"type\":\"message_start\"}\n\n";
    let stop = "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n";

    let complete = framed_gzip(&[start, stop]);
    let cut_after_start = framed_gzip(&[start]);
    // The truncated capture is a prefix of the complete one, minus the
    // end-of-stream marker the encoder appends on `finish`.
    let cut = &cut_after_start[..cut_after_start.len() - 8];

    for (encoding, bytes, terminated) in [
        (Encoding::Gzip, complete.as_slice(), true),
        (Encoding::Gzip, cut, false),
    ] {
        let decoded = decode(bytes, encoding).unwrap_or_else(|| {
            panic!("{encoding:?}: a truncated stream must still be partly readable")
        });
        assert_eq!(
            decoded.contains("message_stop"),
            terminated,
            "{encoding:?}: a stream cut before its terminator must not appear \
             terminated: {decoded}"
        );
        assert!(
            decoded.contains("message_start"),
            "{encoding:?}: the frames that arrived must be readable: {decoded}"
        );
    }
}

/// The concatenation is the stream, not any single record.
///
/// Bodies are stored frame by frame, each independently base64-encoded, so a
/// one-shot decode of one record fails. Joining first is what makes the stored
/// form readable at all.
#[test]
fn frames_are_decoded_as_one_stream() {
    let complete = gzip(TERMINATED.as_bytes());
    let (first, rest) = complete.split_at(complete.len() / 2);
    assert!(
        decode(first, Encoding::Gzip).is_none_or(|text| !text.contains("message_stop")),
        "half a stream is not a whole one"
    );
    let mut joined = first.to_vec();
    joined.extend_from_slice(rest);
    assert_eq!(
        decode(&joined, Encoding::Gzip).as_deref(),
        Some(TERMINATED),
        "the concatenation decodes even though its parts do not"
    );
}

/// An encoding the router cannot decode stays honestly unknowable.
#[test]
fn an_unknown_encoding_is_not_claimed_as_readable() {
    assert_eq!(Encoding::parse("gzip"), Some(Encoding::Gzip));
    assert_eq!(Encoding::parse("GZIP"), Some(Encoding::Gzip));
    assert_eq!(Encoding::parse("x-gzip"), Some(Encoding::Gzip));
    assert_eq!(Encoding::parse("br"), Some(Encoding::Brotli));
    assert_eq!(Encoding::parse("zstd"), Some(Encoding::Zstd));
    assert_eq!(Encoding::parse("deflate"), Some(Encoding::Deflate));
    assert_eq!(Encoding::parse(""), Some(Encoding::Identity));
    assert_eq!(Encoding::parse("identity"), Some(Encoding::Identity));
    // The last encoding is the outermost one, and the only one a single pass
    // can remove.
    assert_eq!(Encoding::parse("identity, gzip"), Some(Encoding::Gzip));
    // Not decodable, and not claimed to be.
    assert_eq!(Encoding::parse("compress"), None);
    assert_eq!(Encoding::parse("exotic-2026"), None);
}

/// Bytes that are not what the header claims decode to nothing.
///
/// The header is the client's, not a guarantee. Reporting a decode that never
/// happened would put a false terminator verdict on a stream nobody read.
#[test]
fn bytes_that_do_not_match_the_header_decode_to_nothing() {
    assert_eq!(decode(b"", Encoding::Gzip), None);
    assert_eq!(decode(b"", Encoding::Identity), None);
    assert_eq!(decode(b"plain text, not gzip", Encoding::Gzip), None);
    assert_eq!(
        decode(b"plain text", Encoding::Identity).as_deref(),
        Some("plain text"),
        "identity bytes are readable as they stand"
    );
}
