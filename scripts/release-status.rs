//! Shared interpretation of GitHub release metadata for delivery and recovery.

/// A prepared prerelease or draft still requires final publication.
pub fn is_stable_release(release: &serde_json::Value) -> bool {
    release["draft"] == false && release["prerelease"] == false
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn only_an_explicitly_stable_release_counts_as_published() {
        assert!(is_stable_release(
            &json!({"draft": false, "prerelease": false})
        ));
        assert!(!is_stable_release(
            &json!({"draft": false, "prerelease": true})
        ));
        assert!(!is_stable_release(
            &json!({"draft": true, "prerelease": false})
        ));
        assert!(!is_stable_release(&json!({})));
    }
}
