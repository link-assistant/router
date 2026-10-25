// Independent native oracle SOURCE; only gated CI may execute this file.
use link_assistant_router::translation_integer_core as integer;
use link_assistant_router::translation_owned_results_core as outcome;
use link_assistant_router::translation_text_core as text;

fn counted(limit: u64) -> u64 {
    let mut count = 0_u64;
    let mut total = 0_u64;
    while count < limit {
        count = integer::u64_saturating_add(count, 1);
        if count == 2 {
            continue;
        }
        if count == 4 {
            break;
        }
        total = integer::u64_wrapping_add(total, count);
    }
    total
}

fn early(limit: u64) -> u64 {
    let mut count = 0_u64;
    while count < limit {
        count = integer::u64_saturating_add(count, 1);
        if count == 3 {
            return count;
        }
    }
    0
}

fn selected(succeeds: bool) -> Result<u64, String> {
    if succeeds {
        outcome::u64_ok(3)
    } else {
        outcome::u64_err("failed")
    }
}

fn propagated(succeeds: bool) -> Result<u64, String> {
    let mut count = 0_u64;
    while count < 2 {
        let value = selected(succeeds)?;
        count = integer::u64_saturating_add(count, value);
    }
    outcome::u64_ok(count)
}

fn optional(input: &str) -> Option<u64> {
    let mut pending = true;
    while pending {
        text::find(input, "é")?;
        pending = false;
    }
    Some(0)
}

#[test]
fn loop_controls_and_function_exits_preserve_values_and_error_variants() {
    for (limit, expected) in [(0, 0), (1, 1), (2, 1), (3, 4), (4, 4), (8, 4)] {
        assert_eq!(counted(limit), expected);
    }
    for limit in [0, 1, 2, 3, 6] {
        assert_eq!(early(limit), if limit < 3 { 0 } else { 3 });
    }
    assert_eq!(propagated(true), Ok(3));
    assert_eq!(propagated(false), Err(String::from("failed")));
    assert_eq!(optional("hello"), None);
    assert_eq!(optional("é😀"), Some(0));
}
