//! Bounded text used in managed-server diagnostics.

pub(super) fn compact(value: &str) -> String {
    const LIMIT: usize = 240;
    let compact = value.split_whitespace().collect::<Vec<_>>().join(" ");
    if compact.chars().count() <= LIMIT {
        compact
    } else {
        format!("{}…", compact.chars().take(LIMIT).collect::<String>())
    }
}
