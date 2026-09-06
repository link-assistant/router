//! Byte-safe incremental Server-Sent Events framing.

/// Append one arbitrary transport chunk and return every complete SSE block.
///
/// Transport chunks may split a multi-byte UTF-8 scalar. Keeping the pending
/// tail as bytes ensures conversion happens only after a complete SSE block is
/// available, so a valid event cannot acquire replacement characters merely
/// because of a network boundary.
pub fn push_blocks(buffer: &mut Vec<u8>, chunk: &[u8]) -> Vec<String> {
    buffer.extend_from_slice(chunk);
    let mut blocks = Vec::new();
    while let Some((index, separator_len)) = find_separator(buffer) {
        let block = buffer.drain(..index).collect::<Vec<_>>();
        buffer.drain(..separator_len);
        blocks.push(String::from_utf8_lossy(&block).into_owned());
    }
    blocks
}

fn find_separator(buffer: &[u8]) -> Option<(usize, usize)> {
    let crlf = buffer.windows(4).position(|window| window == b"\r\n\r\n");
    let lf = buffer.windows(2).position(|window| window == b"\n\n");
    match (crlf, lf) {
        (Some(left), Some(right)) if left <= right => Some((left, 4)),
        (Some(_), Some(right)) => Some((right, 2)),
        (Some(index), None) => Some((index, 4)),
        (None, Some(index)) => Some((index, 2)),
        (None, None) => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_multibyte_scalar_split_across_chunks_is_decoded_once_complete() {
        let frame = "data: {\"delta\":\"世\"}\n\n".as_bytes();
        let character = frame.iter().position(|byte| *byte == 0xe4).unwrap();
        for split in [character + 1, character + 2] {
            let mut buffer = Vec::new();
            assert!(push_blocks(&mut buffer, &frame[..split]).is_empty());
            let blocks = push_blocks(&mut buffer, &frame[split..]);
            assert_eq!(blocks, ["data: {\"delta\":\"世\"}"]);
            assert!(!blocks[0].contains('\u{fffd}'));
        }
    }
}
