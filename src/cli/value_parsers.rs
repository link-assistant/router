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
