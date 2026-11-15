//! Independent target metadata oracle source; gated CI only.
// Drafted translation oracle: these shapes mirror the JavaScript source the
// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::redundant_clone)]
#[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
#[target_feature(enable = "sse2")]
#[allow(unsafe_code)]
unsafe fn intrinsic(value: u64) -> u64 {
    value
}

#[rustfmt::skip]
fn selected(value: bool) -> bool { value }

#[derive(Clone, Debug)]
struct Record {
    value: u8,
}

#[test]
#[allow(unsafe_code)]
fn metadata_preserves_ordinary_values_and_original_derived_owner() {
    assert!(!selected(false));
    assert!(selected(true));
    let record = Record { value: 255 };
    assert_eq!(record.clone().value, 255);
    assert_eq!(format!("{record:?}"), "Record { value: 255 }");
    #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
    if std::is_x86_feature_detected!("sse2") {
        for value in [0_u64, 1, u64::MAX] {
            // SAFETY: the native runtime detected the required SSE2 feature.
            assert_eq!(unsafe { intrinsic(value) }, value);
        }
    }
}
