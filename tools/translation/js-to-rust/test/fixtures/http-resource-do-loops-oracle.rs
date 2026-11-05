// Independent post-test control oracle SOURCE. Never execute locally for #759.
#[test]
fn continue_checks_the_condition_and_nested_loops_keep_their_own_control() {
    fn post_test(limit: u64) -> u64 {
        let mut count = 0_u64;
        loop {
            count += 1;
            if count >= limit { break; }
        }
        count
    }
    assert_eq!(post_test(0), 1);
    assert_eq!(post_test(1), 1);
    assert_eq!(post_test(3), 3);
    let mut outer = 0_u64;
    let mut inner = 0_u64;
    loop {
        outer += 1;
        inner += post_test(0);
        if outer >= 2 { break; }
    }
    assert_eq!((outer, inner), (2, 2));
}

#[test]
fn a_body_break_skips_the_condition() {
    let mut evaluated = 0;
    let stop = std::hint::black_box(true);
    loop {
        if stop { break; }
        evaluated += 1;
        if evaluated >= 2 { break; }
    }
    assert_eq!(evaluated, 0);
}
