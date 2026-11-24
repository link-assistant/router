//! Redact credentials before persistence, truncation, or verbose rendering.

pub(super) fn secret_name(name: &str) -> bool {
    crate::request_log::is_secret_name(name) || name.to_ascii_lowercase().contains("cookie")
}

pub(super) fn sanitize(text: &str, secrets: &[String]) -> String {
    let mut text = text.to_string();
    for secret in secrets.iter().filter(|secret| !secret.is_empty()) {
        text = text.replace(secret, "[redacted]");
        // A server may JSON-escape a known credential in its error body.
        let encoded = serde_json::to_string(secret).expect("credential string serializes");
        text = text.replace(&encoded[1..encoded.len() - 1], "[redacted]");
    }
    redact_fields(&redact_urls(&redact_bearers_and_jwts(
        &crate::login_url::redact_secrets(&text),
    )))
}

fn redact_bearers_and_jwts(text: &str) -> String {
    let mut result = String::new();
    let mut copied = 0;
    for (position, _) in text.char_indices() {
        if position < copied {
            continue;
        }
        let rest = &text[position..];
        let bearer = rest
            .get(..7)
            .is_some_and(|prefix| prefix.eq_ignore_ascii_case("bearer "));
        if !bearer && !rest.starts_with("eyJ") {
            continue;
        }
        let start = position + if bearer { 7 } else { 0 };
        let value = &text[start..];
        let end = value
            .find(|c: char| !c.is_ascii_alphanumeric() && !matches!(c, '.' | '-' | '_'))
            .unwrap_or(value.len());
        if end > 0 && (bearer || value[..end].matches('.').count() == 2) {
            result.push_str(&text[copied..start]);
            result.push_str("[redacted]");
            copied = start + end;
        }
    }
    result.push_str(&text[copied..]);
    result
}

fn redact_urls(text: &str) -> String {
    let mut result = String::new();
    let mut rest = text;
    while let Some(start) = [rest.find("http://"), rest.find("https://")]
        .into_iter()
        .flatten()
        .min()
    {
        result.push_str(&rest[..start]);
        let candidate = &rest[start..];
        let end = candidate
            .find(|c: char| {
                c.is_whitespace() || matches!(c, '"' | '\'' | '<' | '>' | ')' | ']' | '}')
            })
            .unwrap_or(candidate.len());
        let candidate = &candidate[..end];
        if let Ok(mut url) = url::Url::parse(candidate) {
            let mut changed = false;
            if !url.username().is_empty() || url.password().is_some() {
                changed = true;
                let _ = url.set_username("redacted");
                let _ = url.set_password(None);
            }
            let query = url
                .query_pairs()
                .map(|(name, value)| {
                    let value = if secret_name(&name) {
                        changed = true;
                        "[redacted]".to_string()
                    } else {
                        value.into_owned()
                    };
                    (name.into_owned(), value)
                })
                .collect::<Vec<_>>();
            if !query.is_empty() {
                url.query_pairs_mut().clear().extend_pairs(query);
            }
            // OAuth responses can carry credentials in the fragment.
            if url.fragment().is_some() {
                changed = true;
                url.set_fragment(Some("redacted"));
            }
            result.push_str(if changed { url.as_str() } else { candidate });
        } else {
            result.push_str(candidate);
        }
        rest = &rest[start + end..];
    }
    result.push_str(rest);
    result
}

/// Handle JSON fields, HTTP headers, query parameters and key=value diagnostics.
fn redact_fields(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut result = String::new();
    let mut copied = 0;
    let mut position = 0;
    while position < bytes.len() {
        if !bytes[position].is_ascii_alphabetic() {
            position += 1;
            continue;
        }
        let start = position;
        while position < bytes.len()
            && (bytes[position].is_ascii_alphanumeric() || matches!(bytes[position], b'_' | b'-'))
        {
            position += 1;
        }
        let name = &text[start..position];
        let mut value = position;
        if bytes.get(value).is_some_and(|b| matches!(b, b'"' | b'\'')) {
            value += 1;
        }
        while bytes.get(value).is_some_and(u8::is_ascii_whitespace) {
            value += 1;
        }
        if !secret_name(name) || !bytes.get(value).is_some_and(|b| matches!(b, b':' | b'=')) {
            continue;
        }
        value += 1;
        while bytes.get(value).is_some_and(u8::is_ascii_whitespace) {
            value += 1;
        }
        // Secret JSON fields may contain objects or arrays rather than strings.
        if bytes.get(value).is_some_and(|b| matches!(b, b'{' | b'[')) {
            let mut values =
                serde_json::Deserializer::from_str(&text[value..]).into_iter::<serde_json::Value>();
            if matches!(values.next(), Some(Ok(_))) {
                result.push_str(&text[copied..value]);
                result.push_str("\"[redacted]\"");
                copied = value + values.byte_offset();
                position = copied;
                continue;
            }
        }
        let quote = bytes
            .get(value)
            .copied()
            .filter(|b| matches!(b, b'"' | b'\''));
        if quote.is_some() {
            value += 1;
        }
        let mut end = value;
        if let Some(quote) = quote {
            while end < bytes.len() && bytes[end] != quote {
                if bytes[end] == b'\\' {
                    end += 1;
                }
                end = (end + 1).min(bytes.len());
            }
        } else {
            // Include the entire value of a Cookie header, including its pairs.
            let cookie =
                name.eq_ignore_ascii_case("cookie") || name.eq_ignore_ascii_case("set-cookie");
            if text[value..]
                .get(..7)
                .is_some_and(|prefix| prefix.eq_ignore_ascii_case("bearer "))
            {
                end += 7;
            }
            if text[end..].starts_with("[redacted]") {
                end += "[redacted]".len();
            }
            while end < bytes.len()
                && !matches!(
                    bytes[end],
                    b'\r' | b'\n' | b'"' | b'\'' | b'}' | b']' | b'&'
                )
                && (cookie
                    || !bytes[end].is_ascii_whitespace() && !matches!(bytes[end], b',' | b';'))
            {
                end += 1;
            }
        }
        result.push_str(&text[copied..value]);
        result.push_str("[redacted]");
        copied = end;
        position = end;
    }
    result.push_str(&text[copied..]);
    result
}
