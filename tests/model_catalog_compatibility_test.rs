//! Preserve the existing public Rust API while adding operator definitions.

use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::route_contract::RouteId;

#[test]
fn catalog_cache_preserves_public_unwind_traits() {
    fn assert_unwind_traits<T: std::panic::UnwindSafe + std::panic::RefUnwindSafe>() {}
    assert_unwind_traits::<ModelCatalogCache>();
}

#[test]
fn existing_route_ids_preserve_discriminants_and_order() {
    // The first and last existing variants after the proposed insertion.
    assert_eq!(RouteId::Login as usize, 12);
    assert_eq!(RouteId::NativeCodexBackend as usize, 93);
    assert!(RouteId::Provider < RouteId::Login);
    assert!(RouteId::NativeCodexBackend < RouteId::ModelDefinitions);
}
