//! Extraction of the authorization URL and the resulting token from a
//! terminal transcript.
//!
//! Two things make this less trivial than a substring search:
//!
//! * A TUI hard-wraps long text at the terminal width, so the URL can arrive
//!   split across lines with no hyphen or marker. Lines that are exactly the
//!   terminal width are therefore re-joined before scanning.
//! * A TUI repaints, so the same URL appears many times in a transcript. The
//!   *last* match is the current one.

use crate::login_pty::PTY_COLS;

/// Hosts an authorization URL is accepted from.
const AUTH_HOSTS: &[&str] = &["claude.ai", "anthropic.com"];

/// Prefix of the long-lived tokens `claude setup-token` prints.
const TOKEN_PREFIXES: &[&str] = &["sk-ant-oat", "sk-ant-"];

/// Undo terminal hard-wrapping: a line that is exactly the terminal width was
/// wrapped by the terminal, not ended by the program, so it continues on the
/// next line.
#[must_use]
pub fn unwrap_terminal_lines(transcript: &str) -> String {
    let width = PTY_COLS as usize;
    let mut out = String::with_capacity(transcript.len());
    let mut lines = transcript.split('\n').peekable();
    while let Some(line) = lines.next() {
        out.push_str(line);
        if lines.peek().is_some() && line.chars().count() != width {
            out.push('\n');
        }
    }
    out
}

/// Find the authorization URL the login flow printed, if any.
///
/// Returns the last `https://` URL on a known Anthropic host, which is the
/// most recently painted one.
#[must_use]
pub fn extract_login_url(transcript: &str) -> Option<String> {
    let text = unwrap_terminal_lines(transcript);
    let mut found = None;
    let mut rest = text.as_str();
    while let Some(idx) = rest.find("https://") {
        let candidate = &rest[idx..];
        let end = candidate
            .find(char::is_whitespace)
            .unwrap_or(candidate.len());
        let url = trim_url_punctuation(&candidate[..end]);
        if AUTH_HOSTS.iter().any(|host| url.contains(host)) {
            found = Some(url.to_string());
        }
        rest = &rest[idx + "https://".len()..];
    }
    found
}

/// Find the long-lived token a successful `setup-token` run printed, if any.
#[must_use]
pub fn extract_token(transcript: &str) -> Option<String> {
    let text = unwrap_terminal_lines(transcript);
    let mut found = None;
    for prefix in TOKEN_PREFIXES {
        let mut rest = text.as_str();
        while let Some(idx) = rest.find(prefix) {
            let candidate = &rest[idx..];
            let end = candidate
                .find(|c: char| !(c.is_ascii_alphanumeric() || c == '-' || c == '_'))
                .unwrap_or(candidate.len());
            let token = &candidate[..end];
            // A bare prefix with nothing after it is a label, not a token.
            if token.len() > prefix.len() + 8 {
                found = Some(token.to_string());
            }
            rest = &rest[idx + prefix.len()..];
        }
        if found.is_some() {
            break;
        }
    }
    found
}

/// Placeholder substituted for a secret that was removed from a transcript.
pub const REDACTED: &str = "[redacted]";

/// Prefixes of every credential that can appear in a login transcript: the
/// upstream tokens the CLI prints, and the router's own credentials, in case a
/// transcript ever picks one up.
const SECRET_PREFIXES: &[&str] = &[
    "sk-ant-",
    crate::token::TOKEN_PREFIX,
    crate::admin::ADMIN_TOKEN_PREFIX,
];

/// Remove credential-looking runs from text that is about to be shown to a
/// client or written to a log.
///
/// The login flow's whole purpose is to obtain a paid-account credential, and
/// the CLI *prints* that credential on the terminal it is driven through — so
/// the transcript is a secret-bearing document, and every excerpt of it that
/// leaves this process has to go through here first. Redaction happens before
/// truncation, so a token cut by a length limit cannot leave a usable prefix
/// behind.
#[must_use]
pub fn redact_secrets(text: &str) -> String {
    let mut out = text.to_string();
    for prefix in SECRET_PREFIXES {
        out = redact_prefix(&out, prefix);
    }
    out
}

/// Replace every `prefix`-led credential run with `prefix[redacted]`.
fn redact_prefix(text: &str, prefix: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(idx) = rest.find(prefix) {
        out.push_str(&rest[..idx]);
        let candidate = &rest[idx..];
        out.push_str(prefix);
        out.push_str(REDACTED);
        rest = &candidate[secret_run_len(candidate)..];
    }
    out.push_str(rest);
    out
}

/// Length of the credential run starting at the beginning of `text`.
///
/// The run is the usual base64url alphabet plus `-` and `_`. A `.` is part of
/// the run only when another such character follows it, so a JWT's dotted
/// segments are swallowed whole while a sentence-ending period is not.
fn secret_run_len(text: &str) -> usize {
    let is_body = |c: char| c.is_ascii_alphanumeric() || c == '-' || c == '_';
    let bytes = text.as_bytes();
    let mut end = 0;
    while end < bytes.len() {
        let c = bytes[end] as char;
        let continues =
            is_body(c) || (c == '.' && bytes.get(end + 1).is_some_and(|&n| is_body(n as char)));
        if !continues {
            break;
        }
        end += 1;
    }
    end
}

/// Remove a specific known secret — the authorization code the human pasted,
/// which the terminal echoes back and which no pattern can recognise.
#[must_use]
pub fn redact_value(text: &str, secret: &str) -> String {
    let secret = secret.trim();
    if secret.len() < 4 {
        return text.to_string();
    }
    text.replace(secret, REDACTED)
}

/// Strip punctuation a sentence may have wrapped the URL in.
fn trim_url_punctuation(url: &str) -> &str {
    url.trim_end_matches(['.', ',', ')', ']', '>', '"', '\'', ';', ':'])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_url_on_its_own_line() {
        let transcript = "Open this URL to log in:\n\nhttps://claude.ai/oauth/authorize?code=true&state=abc\n\nPaste code here:";
        assert_eq!(
            extract_login_url(transcript).as_deref(),
            Some("https://claude.ai/oauth/authorize?code=true&state=abc")
        );
    }

    #[test]
    fn prefers_the_last_repaint() {
        let transcript = "https://claude.ai/oauth/authorize?state=stale\nrepaint\nhttps://claude.ai/oauth/authorize?state=fresh\n";
        assert_eq!(
            extract_login_url(transcript).as_deref(),
            Some("https://claude.ai/oauth/authorize?state=fresh")
        );
    }

    #[test]
    fn rejoins_a_url_wrapped_at_the_terminal_width() {
        let width = PTY_COLS as usize;
        let url = format!(
            "https://claude.ai/oauth/authorize?code=true&state={}",
            "x".repeat(120)
        );
        // Put the URL across a wrap boundary: it starts near the end of one
        // screen line and continues on the next, with no marker of its own.
        let prefix = "Open this URL: ";
        let line = format!("{}{prefix}{url}", "-".repeat(width - prefix.len() - 20));
        let mut wrapped = String::new();
        for (i, ch) in line.chars().enumerate() {
            if i > 0 && i % width == 0 {
                wrapped.push('\n');
            }
            wrapped.push(ch);
        }
        wrapped.push_str("\nPaste code here:");
        assert!(
            wrapped.contains('\n'),
            "the fixture must actually be wrapped"
        );
        assert_eq!(extract_login_url(&wrapped).as_deref(), Some(url.as_str()));
    }

    /// A URL that happens to end *exactly* on a wrap boundary is genuinely
    /// ambiguous: its final screen line is full, so nothing in the byte stream
    /// distinguishes "the terminal wrapped here" from "the program ended the
    /// line here", and the next line's text is joined onto the URL. This test
    /// pins that known limitation rather than pretending it does not exist.
    ///
    /// It is harmless in practice because the recovered URL is a strict prefix
    /// match of the real one plus trailing text, and `PTY_COLS` is deliberately
    /// far wider than any URL Claude prints, so no wrap occurs at all.
    #[test]
    fn a_url_ending_exactly_on_the_boundary_absorbs_the_next_line() {
        let width = PTY_COLS as usize;
        let base = "https://claude.ai/oauth/authorize?state=";
        let url = format!("{base}{}", "x".repeat(width - base.len()));
        assert_eq!(url.len(), width);
        let extracted = extract_login_url(&format!("{url}\nPaste code here:"))
            .expect("the URL is still found, just over-long");
        assert!(extracted.starts_with(&url), "got {extracted}");
    }

    #[test]
    fn ignores_unrelated_urls() {
        assert!(extract_login_url("see https://example.com/docs for help").is_none());
    }

    #[test]
    fn trims_trailing_sentence_punctuation() {
        assert_eq!(
            extract_login_url("visit https://claude.ai/oauth/authorize?x=1.").as_deref(),
            Some("https://claude.ai/oauth/authorize?x=1")
        );
    }

    #[test]
    fn finds_setup_token() {
        let transcript = "Your token:\n\nsk-ant-oat01-ABCDEFGH1234567890\n\nStore it safely.";
        assert_eq!(
            extract_token(transcript).as_deref(),
            Some("sk-ant-oat01-ABCDEFGH1234567890")
        );
    }

    /// The credential the login flow exists to obtain is printed on the very
    /// terminal whose transcript is quoted back in error messages, so this is
    /// the check that a failed login cannot hand the token to the caller.
    #[test]
    fn a_printed_credential_never_survives_redaction() {
        let transcript = "Your token:\n\nsk-ant-oat01-ABCDEFGH1234567890\n\nStore it safely.";
        let redacted = redact_secrets(transcript);
        assert!(!redacted.contains("ABCDEFGH1234567890"), "{redacted}");
        assert_eq!(
            redacted,
            "Your token:\n\nsk-ant-[redacted]\n\nStore it safely."
        );
    }

    #[test]
    fn the_routers_own_credentials_are_redacted_whole() {
        let text = format!(
            "issued {}header.payload.signature and {}deadbeefcafe.",
            crate::token::TOKEN_PREFIX,
            crate::admin::ADMIN_TOKEN_PREFIX
        );
        let redacted = redact_secrets(&text);
        assert!(!redacted.contains("payload"), "{redacted}");
        assert!(!redacted.contains("signature"), "{redacted}");
        assert!(!redacted.contains("deadbeefcafe"), "{redacted}");
        assert!(redacted.ends_with('.'), "sentence punctuation is kept");
    }

    #[test]
    fn text_without_a_credential_is_returned_unchanged() {
        let text = "Paste the code from your browser here.";
        assert_eq!(redact_secrets(text), text);
    }

    #[test]
    fn a_known_pasted_value_is_removed_verbatim() {
        assert_eq!(
            redact_value("echoed: abc123xyz done", "abc123xyz\n"),
            "echoed: [redacted] done"
        );
        // Too short to be a code, and removing it would mangle unrelated text.
        assert_eq!(redact_value("a b a", "a"), "a b a");
    }

    #[test]
    fn ignores_a_bare_token_prefix_mention() {
        assert!(extract_token("tokens start with sk-ant-oat").is_none());
    }
}
