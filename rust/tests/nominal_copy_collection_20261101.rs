//! Independent actual production unit-enum collection oracle SOURCE. UNRUN.
//! Existing complete JavaScript gate precedes Cargo; no native invocation here.
use link_assistant_router::client_policy::EntitlementDecision;

fn bounded_copy(input: &[EntitlementDecision]) -> Vec<EntitlementDecision> {
    assert!(input.len() <= 4096, "explicit receiving profile envelope");
    input.iter().copied().collect()
}

#[test]
fn actual_nominal_copy_and_derived_clone_preserve_aliases_order_and_detached_vectors() {
    use EntitlementDecision::{Denied, Native, Override, Proxied};
    let input = [Native, Override, Proxied, Override, Denied, Override];
    let copied = bounded_copy(&input);
    let cloned: Vec<_> = input.iter().cloned().collect();
    assert_eq!(copied, vec![Native, Override, Proxied, Override, Denied, Override]);
    assert_eq!(cloned, copied);
    let mut detached = copied;
    detached[0] = Denied;
    assert_eq!(input[0], Native);
    assert_eq!(cloned[0], Native);
    assert!(bounded_copy(&[]).is_empty());
    assert_eq!(bounded_copy(&vec![Override; 4096]), vec![Override; 4096]);
}

#[test]
fn raw_native_std_collection_remains_unbounded_while_receiving_facade_is_explicitly_bounded() {
    let raw = vec![EntitlementDecision::Native; 4097];
    let copied: Vec<_> = raw.iter().copied().collect();
    assert_eq!(copied.len(), 4097);
    assert!(std::panic::catch_unwind(|| bounded_copy(&raw)).is_err());
}
