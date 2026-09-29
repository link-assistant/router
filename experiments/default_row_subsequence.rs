//! Checks the Default-row matcher used by tests/real_clients/claude_selector.rs
//! against the redraw-damaged text CI captured (run 36600110949).
fn matches(described: &str, models: &[&str]) -> bool {
    let shown = described.split(['[', ')']).next().unwrap_or_default();
    let drawn_from = |model: &str| {
        let mut remaining = model.chars();
        shown.chars().all(|c| remaining.any(|candidate| candidate == c))
    };
    shown.chars().count() >= 4 && models.iter().any(|model| drawn_from(model))
}

fn main() {
    let models = ["future-glm-only"];
    assert!(matches("futu-glm-only[1m])❯2.future-glm-only✔", &models));
    assert!(matches("future-glm-only)❯2.", &models));
    assert!(!matches("Opus5.5(1Mcontext)", &models));
    assert!(!matches("claude-opus-5-5)", &models));
    assert!(!matches("[1m])", &models));
    println!("ok");
}
