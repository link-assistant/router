// Independent scalar imperative oracle. CI only after the complete JS gate.
fn early(a: bool, b: bool) -> bool {
    if a {
        return b;
    }
    !b
}
fn counted(limit: u64) -> u64 {
    let mut index = 0_u64;
    let mut total = 0_u64;
    while index < limit {
        index += 1;
        if index == 2 {
            continue;
        }
        total += index;
        if index >= 4 {
            break;
        }
    }
    total
}
fn returned(limit: u64) -> u64 {
    let mut index = 0_u64;
    let mut total = 0_u64;
    while index < limit {
        index += 1;
        if index == 3 {
            return total;
        }
        total += index;
        if index >= 4 {
            break;
        }
    }
    total
}
#[test]
fn zero_continue_break_extreme_and_early_return_paths() {
    for a in [false, true] {
        for b in [false, true] {
            assert_eq!(early(a, b), if a { b } else { !b });
        }
    }
    for (input, expected) in [
        (0, 0),
        (1, 1),
        (2, 1),
        (3, 4),
        (4, 8),
        (5, 8),
        (u64::MAX, 8),
    ] {
        assert_eq!(counted(input), expected);
    }
    for (input, expected) in [(0, 0), (1, 1), (2, 3), (3, 3), (4, 3), (u64::MAX, 3)] {
        assert_eq!(returned(input), expected);
    }
}
