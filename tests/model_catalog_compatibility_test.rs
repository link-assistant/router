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
    assert_eq!(RouteId::AccountPolicy as usize, 94);
    assert_eq!(RouteId::RequestLog as usize, 95);
    assert_eq!(RouteId::ErrorLogs as usize, 96);
    assert_eq!(RouteId::ErrorLog as usize, 97);
    assert_eq!(RouteId::ClearLogs as usize, 98);
    assert_eq!(RouteId::Logging as usize, 99);
    assert_eq!(RouteId::UsageQueue as usize, 100);
    assert_eq!(RouteId::LatestVersion as usize, 101);
    assert_eq!(RouteId::ModelDefinitions as usize, 102);
    assert_eq!(RouteId::Routing as usize, 103);
    assert_eq!(RouteId::CooldownReset as usize, 104);
    assert!(RouteId::Provider < RouteId::Login);
    assert!(RouteId::NativeCodexBackend < RouteId::ModelDefinitions);
    assert!(RouteId::LatestVersion < RouteId::ModelDefinitions);
    assert!(RouteId::ModelDefinitions < RouteId::Routing);
    assert!(RouteId::Routing < RouteId::CooldownReset);
}
