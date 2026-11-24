//! Independent native repetition oracle; CI only after all same-SHA JS gates.
use link_assistant_router::translation_core;

#[test]
fn copy_values_empty_and_machine_counts() {
    let flags = translation_core::vec![true; 4usize];
    let narrow = translation_core::vec![255u8; 3usize];
    let signed = translation_core::vec![-128i8; 2usize];
    let wide = translation_core::vec![u128::MAX; 2usize];
    assert_eq!(flags, [true, true, true, true]);
    assert_eq!(narrow, [255, 255, 255]);
    assert_eq!(signed, [-128, -128]);
    assert_eq!(wide, [u128::MAX, u128::MAX]);
    let empty: Vec<u8> = translation_core::vec![7u8; 0usize];
    assert!(empty.is_empty());
}

#[test]
fn seed_runs_once_including_zero() {
    let mut calls = 0;
    let values = translation_core::vec![{ calls += 1; 7u8 }; 3usize];
    assert_eq!(values, [7, 7, 7]);
    assert_eq!(calls, 1);
    let empty: Vec<u8> = translation_core::vec![{ calls += 1; 7u8 }; 0usize];
    assert!(empty.is_empty());
    assert_eq!(calls, 2);
}

#[test]
fn zero_repetition_keeps_seed_failure() {
    let failure = std::panic::catch_unwind(|| {
        let _values: Vec<u8> = translation_core::vec![{ panic!("seed failure"); #[allow(unreachable_code)] 0u8 }; 0usize];
    });
    assert!(failure.is_err());
}
