//! Independent predicate inverse oracle SOURCE. Rust executes in gated CI only.
#[test]
fn equality_and_ordering_edges_preserve_native_u64_semantics() {
    for (a,b) in [(0_u64,0_u64),(0,1),(1,0),(u64::MAX,u64::MAX)] {
        assert_eq!(a!=b,!(a==b));
        assert_eq!(a<=b,!(a>b));assert_eq!(a>=b,!(a<b));
    }
}
#[test]
fn boolean_operator_edits_preserve_short_circuit_boundaries() {
    for a in [false,true] { for b in [false,true] {
        assert_eq!(a||b,!(!a&&!b));assert_eq!(a&&b,!(!a||!b));
    }}
    let mut calls=0;let _=true||{calls+=1;false};assert_eq!(calls,0);
    let _=false&&{calls+=1;true};assert_eq!(calls,0);
}
#[test]
fn edited_native_threshold_has_the_expected_boundary() {
    for (value,expected) in [(10_u64,true),(11,true),(12,false)] {
        assert_eq!(value /* retained */ <= /* retained */ 11_u64,expected);
    }
}
