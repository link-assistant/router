//! Independent native branch/alias vector oracle. CI only after all JS gates.
use link_assistant_router::translation_core;
fn values(left: bool, right: bool, seed: u8) -> Vec<u8> {
    let saved = left;
    if saved && !right {
        translation_core::vec![seed, u8::MAX]
    } else if right || !saved {
        translation_core::vec![]
    } else {
        translation_core::vec![0]
    }
}
#[test]
fn all_condition_inputs_and_native_extrema() {
    for left in [false, true] {
        for right in [false, true] {
            for seed in [u8::MIN, u8::MAX] {
                let expected = if left && !right { vec![seed, u8::MAX] } else { vec![] };
                assert_eq!(values(left, right, seed), expected);
            }
        }
    }
}
