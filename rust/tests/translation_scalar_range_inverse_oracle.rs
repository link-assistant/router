// Independent native range oracle. CI only after all same-SHA JS stages pass.
fn counted(start: u64, end: u64, reverse: bool) -> u64 {
    let mut total = 0;
    if reverse {
        for item in (start..=end).rev() {
            if item == end {
                continue;
            }
            total += 1;
            if total >= 3 {
                break;
            }
        }
    } else {
        for item in start..=end {
            if item == start {
                continue;
            }
            total += 1;
            if total >= 3 {
                break;
            }
        }
    }
    total
}
// Exercise the exact first-yield/drop path of the native range.
#[allow(clippy::never_loop)]
fn signed_first(start: i64, end: i64) -> i64 {
    for item in (start..=end).rev() {
        return item;
    }
    0
}
#[test]
fn inclusive_reverse_empty_and_integer_extremes() {
    for reverse in [false, true] {
        for (start, end, expected) in [
            (0, 0, 0),
            (1, 0, 0),
            (0, 1, 1),
            (0, 8, 3),
            (u64::MAX - 2, u64::MAX, 2),
            (u64::MAX, u64::MAX, 0),
        ] {
            assert_eq!(counted(start, end, reverse), expected);
        }
    }
    assert_eq!(signed_first(i64::MIN, i64::MIN), i64::MIN);
    assert_eq!(signed_first(i64::MIN, i64::MIN + 1), i64::MIN + 1);
    assert_eq!(signed_first(i64::MAX, i64::MAX), i64::MAX);
    assert_eq!(signed_first(4, -2), 0);
    assert_eq!(signed_first(-2, 1), 1);
}
fn endpoint(calls: &mut Vec<&'static str>, tag: &'static str, value: u64) -> u64 {
    calls.push(tag);
    value
}
// Retain the exact Rev::next path used by the checked source profile.
#[test]
#[allow(clippy::manual_next_back)]
fn range_endpoints_run_once_in_source_order_before_the_first_item() {
    let mut calls = Vec::new();
    let first = (endpoint(&mut calls, "start", 0)..=endpoint(&mut calls, "end", 2))
        .rev()
        .next();
    assert_eq!(first, Some(2));
    assert_eq!(calls, ["start", "end"]);
}
