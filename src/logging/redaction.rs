//! Remove URL credentials and query values before diagnostics reach any sink.
pub fn urls(message: &str) -> String {
    let mut result = String::new();
    let mut remaining = message;
    while let Some(start) = remaining
        .find("http://")
        .into_iter()
        .chain(remaining.find("https://"))
        .min()
    {
        result.push_str(&remaining[..start]);
        remaining = &remaining[start..];
        let end = remaining
            .find(|character: char| {
                character.is_whitespace() || matches!(character, '\'' | '"' | ')' | ',' | '>')
            })
            .unwrap_or(remaining.len());
        let candidate = &remaining[..end];
        if let Ok(mut url) = url::Url::parse(candidate)
            && (!url.username().is_empty()
                || url.password().is_some()
                || url.query().is_some()
                || url.fragment().is_some())
        {
            let _ = url.set_username("");
            let _ = url.set_password(None);
            url.set_query(None);
            url.set_fragment(None);
            result.push_str(url.as_str());
        } else {
            result.push_str(candidate);
        }
        remaining = &remaining[end..];
    }
    result.push_str(remaining);
    result
}

#[cfg(test)]
mod tests {
    #[test]
    fn redacts_url_credentials_and_parameters_without_losing_error_context() {
        let message = "connection failed (https://operator:sentinel@router.example/api?token=sentinel#sentinel), retry http://127.0.0.1:8080";
        let safe = super::urls(message);
        assert!(!safe.contains("sentinel"));
        assert!(!safe.contains("operator"));
        assert!(safe.contains(
            "connection failed (https://router.example/api), retry http://127.0.0.1:8080"
        ));
    }
}
