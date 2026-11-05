// Independently authored lazy Rust iterator oracle SOURCE. UNRUN. Existing
// complete same-SHA JavaScript gates precede Cargo; no local Rust invocation.
#[test]
fn native_scalar_identity_map_filter_and_reference_pattern_expectations() {
    let input = [0u64, 1, 2, 3];
    let identity: Vec<_> = input.iter().copied().collect();
    assert_eq!(identity, vec![0, 1, 2, 3]);
    let selected: Vec<_> = input.iter().copied().map(|value| value + 1)
        .filter(|value| *value > 2).collect();
    assert_eq!(selected, vec![3, 4]);
    let flags: Vec<_> = [true, false, true].iter().copied().map(|flag| !flag)
        .filter(|&flag| flag).collect();
    assert_eq!(flags, vec![true]);
    let full: Vec<_> = vec![2u64; 4096].iter().copied().collect();
    assert_eq!(full, vec![2u64; 4096]);
}

#[test]
fn native_lazy_callbacks_keep_first_element_failure_before_later_element_work() {
    let failure = std::panic::catch_unwind(|| {
        let _: Vec<_> = [0u64, u64::MAX].iter().copied()
            .map(|value| value.checked_add(1).expect("later addition overflow"))
            .map(|value| value.checked_div(0).expect("first division zero"))
            .collect();
    }).expect_err("the first element must fail before the later element");
    let message = failure.downcast_ref::<String>().map(String::as_str)
        .or_else(|| failure.downcast_ref::<&str>().copied()).unwrap_or("");
    assert!(message.contains("first division zero"));
    assert!(!message.contains("later addition overflow"));
}
