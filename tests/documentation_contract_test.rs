//! Public operating documentation must match enforced transparent proxy policy.

use std::path::Path;

#[test]
fn public_guides_never_promise_synthesized_anthropic_headers() {
    for relative in [
        "README.md",
        "docs/use-cases/cli-claude-code.md",
        "docs/use-cases/per-task-tokens.md",
    ] {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join(relative);
        let text = std::fs::read_to_string(&path).expect("public guide");
        let normalized = text.to_ascii_lowercase();
        for forbidden in [
            "router injects `anthropic-version`",
            "router injects the `anthropic-version`",
            "router injects `anthropic-beta`",
            "router injects the `anthropic-beta`",
            "injects those itself",
            "synthesizes a missing `anthropic-version`",
            "synthesizes a missing `anthropic-beta`",
        ] {
            assert!(
                !normalized.contains(forbidden),
                "{} contradicts transparent native-header policy: {forbidden}",
                path.display()
            );
        }
    }
}
