//! Explicit bounded UTF-8 text interfaces; std implementations remain native.
const LIMIT: usize = 1_048_576;

fn checked(value: &str) {
    assert!(value.len() <= LIMIT, "text input bound");
}

fn replaced(value: &str, pattern: &str, replacement: &str, count: u64) -> String {
    checked(value);
    checked(pattern);
    checked(replacement);
    let matches = value.matches(pattern).count() as u64;
    let count = count.min(matches);
    let length = value.len() as u64 - count * pattern.len() as u64 + count * replacement.len() as u64;
    assert!(length <= LIMIT as u64, "text output bound");
    value.replacen(pattern, replacement, usize::try_from(count).expect("bounded replacement count"))
}

#[must_use]
pub fn trim(value: &str) -> &str {
    checked(value);
    value.trim()
}

#[must_use]
pub fn trim_start(value: &str) -> &str {
    checked(value);
    value.trim_start()
}

#[must_use]
pub fn trim_end(value: &str) -> &str {
    checked(value);
    value.trim_end()
}

#[must_use]
pub fn is_empty(value: &str) -> bool {
    checked(value);
    value.is_empty()
}

#[must_use]
pub fn contains(value: &str, pattern: &str) -> bool {
    checked(value);
    checked(pattern);
    value.contains(pattern)
}

#[must_use]
pub fn starts_with(value: &str, pattern: &str) -> bool {
    checked(value);
    checked(pattern);
    value.starts_with(pattern)
}

#[must_use]
pub fn ends_with(value: &str, pattern: &str) -> bool {
    checked(value);
    checked(pattern);
    value.ends_with(pattern)
}

#[must_use]
pub fn len_utf8(value: &str) -> u64 {
    checked(value);
    value.len() as u64
}

#[must_use]
pub fn len_chars(value: &str) -> u64 {
    checked(value);
    value.chars().count() as u64
}

#[must_use]
pub fn matches_count(value: &str, pattern: &str) -> u64 {
    checked(value);
    checked(pattern);
    value.matches(pattern).count() as u64
}

#[must_use]
pub fn find(value: &str, pattern: &str) -> Option<u64> {
    checked(value);
    checked(pattern);
    value.find(pattern).map(|index| index as u64)
}

#[must_use]
pub fn rfind(value: &str, pattern: &str) -> Option<u64> {
    checked(value);
    checked(pattern);
    value.rfind(pattern).map(|index| index as u64)
}

#[must_use]
pub fn replace(value: &str, pattern: &str, replacement: &str) -> String {
    checked(value);
    checked(pattern);
    checked(replacement);
    replaced(value, pattern, replacement, u64::MAX)
}

#[must_use]
pub fn replacen(value: &str, pattern: &str, replacement: &str, count: u64) -> String {
    checked(value);
    checked(pattern);
    checked(replacement);
    replaced(value, pattern, replacement, count)
}

#[must_use]
pub fn repeat(value: &str, count: u64) -> String {
    checked(value);
    if value.is_empty() { return String::new(); }
    assert!(count <= (LIMIT / value.len()) as u64, "text output bound");
    value.repeat(usize::try_from(count).expect("bounded repeat count"))
}

#[must_use]
pub fn take_chars(value: &str, count: u64) -> &str {
    checked(value);
    let length = value.chars().count() as u64;
    if count >= length { return value; }
    let end = value.char_indices().nth(usize::try_from(count).expect("bounded character count")).map_or(value.len(), |(index, _)| index);
    &value[..end]
}

#[must_use]
pub fn drop_chars(value: &str, count: u64) -> &str {
    checked(value);
    let length = value.chars().count() as u64;
    if count >= length { return &value[value.len()..]; }
    let start = value.char_indices().nth(usize::try_from(count).expect("bounded character count")).map_or(value.len(), |(index, _)| index);
    &value[start..]
}

#[must_use]
pub fn slice_bytes(value: &str, start: u64, end: u64) -> Option<&str> {
    checked(value);
    if start > end || end > value.len() as u64 { return None; }
    value.get(usize::try_from(start).expect("bounded byte index")..usize::try_from(end).expect("bounded byte index"))
}

#[must_use]
pub fn strip_prefix<'a>(value: &'a str, pattern: &str) -> Option<&'a str> {
    checked(value);
    checked(pattern);
    value.strip_prefix(pattern)
}

#[must_use]
pub fn strip_suffix<'a>(value: &'a str, pattern: &str) -> Option<&'a str> {
    checked(value);
    checked(pattern);
    value.strip_suffix(pattern)
}

/// SHA-256 of scalar UTF-8 text, encoded with the unpadded URL alphabet.
/// Native dependency internals remain outside application translation.
#[must_use]
pub fn sha256_base64_url_no_pad(value: &str) -> String {
    use ::sha2::Digest as _;
    ::base64::Engine::encode(
        &::base64::engine::general_purpose::URL_SAFE_NO_PAD,
        ::sha2::Sha256::digest(value.as_bytes()),
    )
}

/// ASCII-only casing; non-ASCII scalar values remain unchanged.
#[must_use]
pub fn to_ascii_lowercase(value: &str) -> String {
    checked(value);
    value.to_ascii_lowercase()
}

#[must_use]
pub fn to_ascii_uppercase(value: &str) -> String {
    checked(value);
    value.to_ascii_uppercase()
}

#[must_use]
pub fn is_ascii(value: &str) -> bool {
    checked(value);
    value.is_ascii()
}

#[must_use]
pub fn eq_ignore_ascii_case(value: &str, other: &str) -> bool {
    checked(value);
    checked(other);
    value.eq_ignore_ascii_case(other)
}

/// Rust ASCII whitespace excludes vertical tab and nonbreaking space.
#[must_use]
pub fn trim_ascii(value: &str) -> &str {
    checked(value);
    value.trim_ascii()
}

#[must_use]
pub fn trim_ascii_start(value: &str) -> &str {
    checked(value);
    value.trim_ascii_start()
}

#[must_use]
pub fn trim_ascii_end(value: &str) -> &str {
    checked(value);
    value.trim_ascii_end()
}

#[must_use]
pub fn split_once_left<'a>(value: &'a str, pattern: &str) -> Option<&'a str> {
    checked(value);
    checked(pattern);
    value.split_once(pattern).map(|(left, _)| left)
}

#[must_use]
pub fn split_once_right<'a>(value: &'a str, pattern: &str) -> Option<&'a str> {
    checked(value);
    checked(pattern);
    value.split_once(pattern).map(|(_, right)| right)
}

#[must_use]
pub fn rsplit_once_left<'a>(value: &'a str, pattern: &str) -> Option<&'a str> {
    checked(value);
    checked(pattern);
    value.rsplit_once(pattern).map(|(left, _)| left)
}

#[must_use]
pub fn rsplit_once_right<'a>(value: &'a str, pattern: &str) -> Option<&'a str> {
    checked(value);
    checked(pattern);
    value.rsplit_once(pattern).map(|(_, right)| right)
}
