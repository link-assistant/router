// Independent local constant source oracles. UNRUN; gated Rust CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
fn bound() -> scalar::U64 { const LIMIT: scalar::U64 = u64::MAX; LIMIT }
fn minimum() -> scalar::I64 { const LIMIT: scalar::I64 = i64::MIN; LIMIT }
fn hoisted() -> scalar::U64 { let value = LIMIT; const LIMIT: scalar::U64 = 42; value }
fn count() -> scalar::Usize { const LIMIT: scalar::U64 = 255; LIMIT as scalar::Usize }
#[test]
fn local_constants_keep_native_hoisting_and_values() {
    assert_eq!(bound(), u64::MAX);
    assert_eq!(minimum(), i64::MIN);
    assert_eq!(hoisted(), 42);
    assert_eq!(count(), 255);
}
