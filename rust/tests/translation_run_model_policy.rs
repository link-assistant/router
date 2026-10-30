//! Independent native selector/policy oracle. SOURCE ONLY; UNRUN. Gated CI only.
use link_assistant_router::{thinking::base_model, model_contract::ModelAccessPolicy};
#[test]
fn interpreted_suffixes_and_literal_overflows_retain_native_selector_authority() {
    for suffix in ["none", "AUTO", "-1", "minimal", "Low", "medium", "high", "xhigh", "max", "0", "+0001", "-000", "4294967295"] {
        let selected = format!("exact({suffix})");
        assert_eq!(base_model(&selected), "exact", "{suffix}");
    }
    for selected in ["exact(unknown)", "exact(4294967296)", "exact(-2)", "exact( 1)", "(high)", "exact(high)tail", "exact(+)"] { assert_eq!(base_model(selected), selected); }
    assert_eq!(base_model("exact(high)(low)"), "exact(high)");
}
#[test]
fn model_policy_duplicates_and_unnamed_substitution_are_refused() {
    let duplicate = ModelAccessPolicy { allowed_models: vec!["one".into(), "one".into()], ..ModelAccessPolicy::default() };
    assert!(duplicate.validate().is_err());
    let unnamed = ModelAccessPolicy { allowed_models: vec!["one".into()], allow_substitution: true, substitution_source: None };
    assert!(unnamed.validate().is_err());
    let exact = ModelAccessPolicy { allowed_models: vec!["one".into()], allow_substitution: false, substitution_source: None };
    assert!(exact.validate().is_ok());
}
