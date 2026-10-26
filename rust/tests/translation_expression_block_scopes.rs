//! Independent native block namespace/source oracle. CI after JS only; UNRUN.
#![allow(non_local_definitions)]

use std::mem::align_of as measure;
type ScopeMarker = u8;

macro_rules! local_items {
    () => {
        use std::mem::size_of as measure;
        type ScopeMarker = bool;
    };
}

const LOCAL_OBSERVATION: (bool, usize) = {
    local_items!();
    let local: ScopeMarker = true;
    (local, measure::<[u8; 8]>())
};

const EXPORTED_OBSERVATION: u8 = {
    #[macro_export]
    macro_rules! scope_exported_bang {
        () => { 11_u8 };
    }
    scope_exported_bang!()
};

#[test]
fn block_types_and_imports_are_local_while_an_explicit_bang_export_remains_global() {
    let outer: ScopeMarker = 255;
    assert_eq!(outer, 255_u8);
    assert_eq!(measure::<[u8; 8]>(), 1);
    assert_eq!(LOCAL_OBSERVATION, (true, 8));
    assert_eq!(EXPORTED_OBSERVATION, 11);
    assert_eq!(scope_exported_bang!(), 11);
}
