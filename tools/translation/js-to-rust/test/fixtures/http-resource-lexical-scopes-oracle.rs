// Independent native SOURCE; only the fatal JavaScript-gated Rust CI may run it.
#[test]
fn lexical_scope_control_and_lifetimes() {
    let mut count = 0_u64;
    while count < 3 {
        {
            count = count.saturating_add(1);
            if count == 2 {
                continue;
            }
        }
    }
    assert_eq!(count, 3);
    {
        let local = 2_u64;
        count = count.saturating_add(local);
    }
    assert_eq!(count, 5);
}

fn terminal_scope(input: bool) -> bool {
    {
        if input {
            return true;
        }
    }
    false
}

#[test]
fn nested_scope_return_leaves_the_function() {
    assert!(terminal_scope(true));
    assert!(!terminal_scope(false));
}
