// Independent native oracle SOURCE for the unchanged canonical stage semantics.
// No new native ABI. UNRUN; existing complete same-SHA JavaScript gate first.
#[test]
fn full_capacity_scalar_stages_preserve_owned_outputs_and_checked_order() {
    let input = vec![2u64; 4096];
    let first: Vec<u64> = input.iter().copied()
        .map(|value| value.checked_add(1).expect("first-stage overflow")).collect();
    let second: Vec<u64> = first.iter().copied().filter(|value| *value > 2).collect();
    assert_eq!(second, vec![3u64; 4096]);
    assert_eq!(input, vec![2u64; 4096]);
    let flags: Vec<bool> = [0u64, 2, 1, 8].iter().copied().map(|value| value > 1).collect();
    let values: Vec<u64> = flags.iter().copied().map(|value| if value { 12 } else { 0 }).collect();
    let selected: Vec<u64> = values.iter().copied().filter(|value| *value > 0).collect();
    assert_eq!(selected, vec![12, 12]);
}

#[test]
fn later_first_stage_failure_still_precedes_the_next_stage() {
    let failure = std::panic::catch_unwind(|| {
        let first: Vec<u64> = [0u64, u64::MAX].iter().copied()
            .map(|value| value.checked_add(1).expect("first-stage overflow")).collect();
        let _second: Vec<u64> = first.iter().copied()
            .map(|value| value.checked_div(0).expect("second-stage zero")).collect();
    }).expect_err("complete eager first stage must fail");
    let message = failure.downcast_ref::<String>().map(String::as_str)
        .or_else(|| failure.downcast_ref::<&str>().copied()).unwrap_or("");
    assert!(message.contains("first-stage overflow"));
}
