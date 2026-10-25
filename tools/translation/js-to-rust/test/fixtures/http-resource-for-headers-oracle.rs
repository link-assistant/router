// Independent native source; execution belongs to JavaScript-gated Rust CI.
#[test]
fn strict_range_updates_keep_nearest_continue_and_boundary_values() {
    let mut count = 0_u64;
    for index in 0_u64..4 {
        if index == 1 {
            continue;
        }
        count = count.saturating_add(1);
    }
    assert_eq!(count, 3);
    let mut index = u64::MAX - 1;
    while index < u64::MAX {
        index = index.saturating_add(1);
    }
    assert_eq!(index, u64::MAX);
    let mut signed = i64::MIN + 1;
    while signed > i64::MIN {
        signed = signed.saturating_sub(1);
    }
    assert_eq!(signed, i64::MIN);
}

#[test]
fn nested_range_scopes_do_not_share_counter_bindings() {
    let mut count = 0_u64;
    for _outer in 0_u64..2 {
        for inner in 0_u64..2 {
            if inner == 0 {
                continue;
            }
            count = count.saturating_add(1);
        }
    }
    assert_eq!(count, 2);
}
