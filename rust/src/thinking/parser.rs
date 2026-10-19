use super::{ThinkingConfig, ThinkingLevel, ThinkingMode};

/// Syntactic suffix extraction, matching the upstream last-opening-parenthesis grammar.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SuffixResult<'a> {
    pub model_name: &'a str,
    pub raw_suffix: Option<&'a str>,
}

impl SuffixResult<'_> {
    /// Interpret recognized suffixes. Invalid text and u32 overflow are ignored.
    #[must_use]
    pub fn config(self) -> Option<ThinkingConfig> {
        let raw = self.raw_suffix?;
        let mode = parse_special_suffix(raw)
            .or_else(|| parse_level_suffix(raw).map(ThinkingMode::Level))
            .or_else(|| {
                parse_numeric_suffix(raw).map(|budget| {
                    if budget == 0 {
                        ThinkingMode::Off
                    } else {
                        ThinkingMode::Budget(budget)
                    }
                })
            })?;
        Some(ThinkingConfig { mode })
    }
}

/// Extract a trailing suffix without interpreting its contents.
#[must_use]
pub fn parse_suffix(model: &str) -> SuffixResult<'_> {
    if let Some(open) = model.rfind('(')
        && model.ends_with(')')
    {
        SuffixResult {
            model_name: &model[..open],
            raw_suffix: Some(&model[open + 1..model.len() - 1]),
        }
    } else {
        SuffixResult {
            model_name: model,
            raw_suffix: None,
        }
    }
}

/// Parse a nonnegative u32 budget; leading zeros, plus and signed zero are accepted.
#[must_use]
pub fn parse_numeric_suffix(raw: &str) -> Option<u32> {
    if raw
        .strip_prefix('-')
        .is_some_and(|digits| !digits.is_empty() && digits.bytes().all(|digit| digit == b'0'))
    {
        Some(0)
    } else {
        raw.parse().ok()
    }
}

/// Parse case-insensitive none/auto, including -1 as automatic thinking.
#[must_use]
pub fn parse_special_suffix(raw: &str) -> Option<ThinkingMode> {
    match raw.to_ascii_lowercase().as_str() {
        "none" => Some(ThinkingMode::Off),
        "auto" | "-1" => Some(ThinkingMode::Auto),
        _ => None,
    }
}

/// Parse one of minimal, low, medium, high, xhigh and max, case-insensitively.
#[must_use]
pub fn parse_level_suffix(raw: &str) -> Option<ThinkingLevel> {
    match raw.to_ascii_lowercase().as_str() {
        "minimal" => Some(ThinkingLevel::Minimal),
        "low" => Some(ThinkingLevel::Low),
        "medium" => Some(ThinkingLevel::Medium),
        "high" => Some(ThinkingLevel::High),
        "xhigh" => Some(ThinkingLevel::XHigh),
        "max" => Some(ThinkingLevel::Max),
        _ => None,
    }
}
