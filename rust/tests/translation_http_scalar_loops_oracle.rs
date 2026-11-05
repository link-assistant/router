//! Independent scalar mutation/loop SOURCE. JavaScript-gated Rust CI only.
use link_assistant_router::translation_integer_core as integer;

fn counted(limit: u64) -> u64 {
    let mut count = 0;
    let mut total = 0;
    while count < limit {
        total = integer::u64_wrapping_add(total,count);
        count = integer::u64_saturating_add(count,1);
    }
    total
}

fn nested(limit: u64) -> u64 {
    let mut outer = 0;
    let mut total = 0;
    while outer < limit {
        let mut inner = 0;
        while inner < limit {
            total = integer::u64_wrapping_add(total,1);
            inner = integer::u64_saturating_add(inner,1);
        }
        outer = integer::u64_saturating_add(outer,1);
    }
    total
}

#[test]
fn scalar_loopback_states_keep_wrapping_totals_and_nested_scope() {
    for (limit,expected) in [(0,0),(1,0),(5,10),(10,45)] {assert_eq!(counted(limit),expected);}
    assert_eq!(nested(0),0);
    assert_eq!(nested(1),1);
    assert_eq!(nested(3),9);
}
