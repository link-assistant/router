// Independent native oracle SOURCE. Execute only in JavaScript-gated CI.
use link_assistant_router::translation_integer_core as integer;

fn adjusted(choice: bool) -> u64 {
    let mut total = 0_u64;
    if choice {
        let delta = 2_u64;
        total = integer::u64_wrapping_add(total, delta);
    } else {
        let delta = 3_u64;
        total = integer::u64_wrapping_add(total, delta);
    }
    let delta = 7_u64;
    integer::u64_wrapping_add(total, delta)
}

fn nested(choice: bool) -> u64 {
    let mut value = 1_u64;
    if choice {
        let delta = 2_u64;
        value = integer::u64_wrapping_add(value, delta);
    } else {
        value = integer::u64_saturating_add(value, 1);
    }
    value
}

fn early(choice: bool) -> u64 {
    if choice {
        return 3;
    }
    4
}

#[test]
fn lexical_blocks_and_continuing_assignments_preserve_values() {
    for choice in [false, true] {
        assert_eq!(adjusted(choice), if choice { 9 } else { 10 });
        assert_eq!(nested(choice), if choice { 3 } else { 2 });
        assert_eq!(early(choice), if choice { 3 } else { 4 });
    }
}
