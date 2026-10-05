//! Small reusable value parsers for command-line and environment inputs.

/// Parse a boolean switch that may also arrive from the environment.
///
/// Clap's plain `bool` accepts only `true`/`false` from an env var, which makes
/// the `=1` spelling used throughout the deployment docs a hard startup error.
pub(super) fn parse_truthy(value: &str) -> Result<bool, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => Ok(true),
        "0" | "false" | "no" | "off" | "" => Ok(false),
        other => Err(format!(
            "expected a boolean (1/0, true/false), got '{other}'"
        )),
    }
}

/// Parse when an account pause lifts into Unix seconds (issue #677).
///
/// Accepts Unix seconds, an RFC 3339 time, or a delay from now written as a
/// number with an `s`, `m`, `h` or `d` suffix.
pub(super) fn parse_until(value: &str) -> Result<u64, String> {
    let value = value.trim();
    if let Ok(unix) = value.parse::<u64>() {
        return Ok(unix);
    }
    if let Ok(time) = chrono::DateTime::parse_from_rfc3339(value) {
        return u64::try_from(time.timestamp())
            .map_err(|_| format!("'{value}' is before the Unix epoch"));
    }
    let unit = value.chars().next_back().unwrap_or('?');
    let amount = value.strip_suffix(unit).unwrap_or_default();
    let scale = match unit {
        's' => 1,
        'm' => 60,
        'h' => 3600,
        'd' => 86_400,
        _ => 0,
    };
    match amount.parse::<u64>() {
        Ok(amount) if scale > 0 => {
            Ok(crate::account_limits::now_unix().saturating_add(amount.saturating_mul(scale)))
        }
        _ => Err(format!(
            "expected Unix seconds, an RFC 3339 time or a delay like 90m, 6h, 2d; got '{value}'"
        )),
    }
}
