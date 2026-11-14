//! Reading Router's answer to `GET /api/health` off a raw socket.
//!
//! Router answers `200` with the bare body `ok`, but every response passes the
//! request-log layer, which re-streams the body, so the answer arrives with
//! `transfer-encoding: chunked` as `2\r\nok\r\n0\r\n\r\n`. A probe that tells
//! Router apart from any other listener on its port by that `ok` has to decode
//! the chunks; one that looked for a response ending in `ok` never matched a
//! real Router, only mocks that send a `content-length`.

/// Whether `response`, a complete raw HTTP/1.1 response, is Router's ready
/// answer to `GET /api/health`: status `200` and the body `ok`, sent with a
/// length or chunked.
#[must_use]
pub fn is_ready(response: &str) -> bool {
    let Some((head, body)) = response.split_once("\r\n\r\n") else {
        return false;
    };
    let mut lines = head.split("\r\n");
    if !lines.next().unwrap_or_default().starts_with("HTTP/1.1 200 ") {
        return false;
    }
    if lines.any(is_chunked_encoding) {
        dechunk(body).as_deref() == Some("ok")
    } else {
        body == "ok"
    }
}

/// Whether `header` is `Transfer-Encoding: chunked`, in any letter case.
fn is_chunked_encoding(header: &str) -> bool {
    let Some((name, value)) = header.split_once(':') else {
        return false;
    };
    name.trim().eq_ignore_ascii_case("transfer-encoding")
        && value.trim().eq_ignore_ascii_case("chunked")
}

/// The payload of a chunked body, or `None` when it is malformed or ends
/// before its last (zero-size) chunk.
fn dechunk(mut body: &str) -> Option<String> {
    let mut decoded = String::new();
    loop {
        let (size, rest) = body.split_once("\r\n")?;
        let size = size.split(';').next().unwrap_or_default().trim();
        let size = usize::from_str_radix(size, 16).ok()?;
        if size == 0 {
            return Some(decoded);
        }
        decoded.push_str(rest.get(..size)?);
        body = rest.get(size..)?.strip_prefix("\r\n")?;
    }
}

#[cfg(test)]
mod tests {
    use super::is_ready;

    const HEAD: &str = "HTTP/1.1 200 OK\r\ncontent-type: text/plain; charset=utf-8\r\n";

    #[test]
    fn a_real_router_answer_is_chunked_and_ready() {
        // Captured from a Router child in CI (Mutants, 2026-11-14).
        let captured = "HTTP/1.1 200 OK\r\ncontent-type: text/plain; charset=utf-8\r\n\
                        connection: close\r\ntransfer-encoding: chunked\r\n\
                        date: Sat, 14 Nov 2026 17:34:22 GMT\r\n\r\n2\r\nok\r\n0\r\n\r\n";
        assert!(is_ready(captured));
    }

    #[test]
    fn an_ok_that_is_not_chunked_is_ready() {
        for header in ["content-length: 2", "transfer-encoding: identity"] {
            let response = format!("{HEAD}{header}\r\n\r\nok");
            assert!(is_ready(&response), "{response:?}");
        }
    }

    #[test]
    fn chunks_are_joined_and_extensions_ignored() {
        let head = format!("{HEAD}Transfer-Encoding: Chunked\r\n\r\n");
        let response = format!("{head}1;x=y\r\no\r\n1\r\nk\r\n0\r\n\r\n");
        assert!(is_ready(&response));
    }

    #[test]
    fn another_body_or_status_is_not_ready() {
        let chunked = format!("{HEAD}transfer-encoding: chunked\r\n\r\n");
        for response in [
            format!("{HEAD}content-length: 6\r\n\r\nnot ok"),
            format!("{HEAD}\r\n{{\"status\":\"ok\"}}"),
            format!("{chunked}f\r\n{{\"status\":\"ok\"}}\r\n0\r\n\r\n"),
            format!("{chunked}6\r\nnot ok\r\n0\r\n\r\n"),
            "HTTP/1.1 503 Service Unavailable\r\ncontent-length: 2\r\n\r\nok".to_string(),
            "HTTP/1.1 2000 OK\r\ncontent-length: 2\r\n\r\nok".to_string(),
            format!("{HEAD}content-length: 2\r\nok"),
            String::new(),
        ] {
            assert!(!is_ready(&response), "{response:?}");
        }
    }

    #[test]
    fn a_malformed_or_unfinished_chunked_body_is_not_ready() {
        let chunked = format!("{HEAD}transfer-encoding: chunked\r\n\r\n");
        for body in [
            "2\r\nok\r\n",
            "2\r\nok",
            "3\r\nok\r\n0\r\n\r\n",
            "2\r\nokX\r\n0\r\n\r\n",
            "zz\r\nok\r\n0\r\n\r\n",
            "",
        ] {
            assert!(!is_ready(&format!("{chunked}{body}")), "{body:?}");
        }
    }
}
