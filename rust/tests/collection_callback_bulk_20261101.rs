// Independent standard-library oracle SOURCE. UNRUN; schedule only behind the
// complete same-SHA JavaScript CI gate. No local Rust invocation is authorized.
#[test]
fn eager_scalar_map_filter_collection_expectations() {
    let input: [u64; 3] = [0, 1, 10];
    let mapped: Vec<u64> = input.iter().copied().map(|item| item + 2).collect();
    assert_eq!(mapped, vec![2, 3, 12]);
    let input = [0, 2, 1, u64::MAX];
    let selected: Vec<u64> = input.iter().copied().filter(|item| *item > 1).collect();
    assert_eq!(selected, vec![2, u64::MAX]);
    let conditional: Vec<u64> = [0, 2, 0].iter().copied()
        .map(|item| if item == 0 { 7 } else { item }).collect();
    assert_eq!(conditional, vec![7, 2, 7]);
    let truthy: Vec<bool> = [false, true, false, true].iter().copied()
        .filter(|item| *item).collect();
    assert_eq!(truthy, vec![true, true]);
    let empty: Vec<u64> = [].iter().copied().map(|item: u64| item + 2).collect();
    assert_eq!(empty, Vec::<u64>::new());
}

#[test]
fn full_scalar_collection_capacity_expectation() {
    let input = vec![3u64; 4096];
    let selected: Vec<u64> = input.iter().copied().filter(|item| *item > 1).collect();
    assert_eq!(selected.len(), 4096);
    assert_eq!(selected, vec![3u64; 4096]);
    // Rust's unbounded Vec does not establish the target's resource contract;
    // the separate checked target cases require refusal above 4,096 values.
}
