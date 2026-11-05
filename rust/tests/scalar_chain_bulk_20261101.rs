// Independent standard-library eager-stage oracle SOURCE. All execution UNRUN.
// Existing CI runs native test sources only after all same-SHA JavaScript gates.
#[test]
fn independently_materialized_scalar_stages_preserve_collection_order() {
    let first: Vec<u64> = [0u64, 1, 2, 3].iter().copied().map(|item| item + 1).collect();
    let second: Vec<u64> = first.iter().copied().filter(|item| *item > 2).collect();
    let third: Vec<u64> = second.iter().copied().map(|item| item * 2).collect();
    assert_eq!(third, vec![6, 8]);
    let first: Vec<bool> = [0u64, 2, 1, 8].iter().copied().map(|item| item > 1).collect();
    let second: Vec<bool> = first.iter().copied().filter(|item| *item).collect();
    assert_eq!(second, vec![true, true]);
    let first: Vec<u64> = vec![2u64; 4096].iter().copied().map(|item| item + 1).collect();
    let second: Vec<u64> = first.iter().copied().filter(|item| *item > 2).collect();
    let third: Vec<u64> = second.iter().copied().map(|item| item * 2).collect();
    assert_eq!(third, vec![6u64; 4096]);
}

#[test]
fn first_stage_failure_precedes_the_second_stage_even_for_a_later_element() {
    let failure = std::panic::catch_unwind(|| {
        let first: Vec<u64> = [0u64, u64::MAX].iter().copied()
            .map(|item| item.checked_add(1).expect("first-stage overflow")).collect();
        let _second: Vec<u64> = first.iter().copied()
            .map(|item| item.checked_div(0).expect("second-stage zero")).collect();
    }).expect_err("the first complete stage must fail");
    let message = failure.downcast_ref::<String>().map(String::as_str)
        .or_else(|| failure.downcast_ref::<&str>().copied()).unwrap_or("");
    assert!(message.contains("first-stage overflow"));
    assert!(!message.contains("second-stage zero"));
}
