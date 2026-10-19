//! CI-only independent Rust oracle for callback-local explicit returns.
//!
//! This new fixture is not a recorded Rust execution. The source-only worker
//! has not run rustc, Cargo, or these tests. Option `?` callback admission stays
//! pending its actual original Try/FromResidual ownership proof.

fn outer() -> u64 {
    let found = (0u8..4u8).any(|value| {
        if value == 2u8 {
            return true;
        }
        false
    });
    if found { 7u64 } else { 9u64 }
}

fn option_outer() -> Option<u8> {
    let found = (0u8..4u8).all(|value| {
        if value == 2u8 {
            return false;
        }
        true
    });
    if found { Some(7u8) } else { None }
}

fn selected(values: &[u8]) -> bool {
    values.iter().copied().map(|value| 255u8 / value).any(|value| {
        if value == 255u8 {
            return true;
        }
        false
    })
}

fn all_small(values: &[u8]) -> bool {
    values.iter().copied().all(|value| {
        if value > 2u8 {
            return false;
        }
        true
    })
}

fn fold(values: &[u64]) -> u64 {
    let total = values.iter().copied().fold(0u64, |sum, value| {
        if value == 0u64 {
            return sum;
        }
        sum + value
    });
    total + 100u64
}

fn nested() -> u64 {
    let found = (0u8..2u8).any(|left| {
        let inner = (0u8..2u8).any(|right| {
            if right == left {
                return true;
            }
            false
        });
        if inner {
            return true;
        }
        false
    });
    if found { 11u64 } else { 13u64 }
}

#[test]
fn return_is_local_to_each_callback_invocation() {
    assert_eq!(outer(), 7);
    assert_eq!(option_outer(), None);
    assert_eq!(fold(&[]), 100);
    assert_eq!(fold(&[1, 0, 2]), 103);
    assert_eq!(fold(&[0, 3, 0, 4]), 107);
    assert_eq!(nested(), 11);
}

#[test]
fn iterator_order_and_short_circuit_control_observable_panics() {
    assert!(selected(&[1, 0]));
    assert!(!selected(&[]));
    assert!(std::panic::catch_unwind(|| selected(&[2, 0])).is_err());
    assert!(!all_small(&[1, 3, 0]));
    assert!(all_small(&[]));
}

#[test]
fn scalar_parameters_and_locals_shadow_without_mutating_an_outer_binding() {
    let value = 7u8;
    let shadow = (0u8..2u8).any(|value| {
        if value == 1u8 {
            return true;
        }
        false
    });
    let local = (0u8..2u8).any(|value| {
        let mut copy = value;
        copy += 1u8;
        if copy == 2u8 {
            return true;
        }
        false
    });
    assert_eq!(value, 7);
    assert!(shadow);
    assert!(local);
}

#[test]
fn local_shadow_and_read_only_capture_leave_outer_mutable_scalar_unchanged() {
    let mut copy = 7u8;
    let local_shadow = (0u8..2u8).any(|value| {
        let mut copy = value;
        copy += 1u8;
        if copy == 2u8 {
            return true;
        }
        false
    });
    assert!(local_shadow);
    assert_eq!(copy, 7);
    let read_only = (0u8..2u8).any(|value| {
        if value < copy {
            return true;
        }
        false
    });
    assert!(read_only);
    assert_eq!(copy, 7);
    // The generated target also observes this same outer binding after the
    // callback completes; no mutation capability is borrowed into the callback.
    copy += 1u8;
    assert_eq!(copy, 8);
}
