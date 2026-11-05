//! Independent complete actual owner-declaration excerpt oracle SOURCE, UNRUN.
//! This compiles the exact private ImportPolicy/CredentialSharing declarations
//! in a separate fixture scope; it does not admit the original auth_import module.
/// Destination and rejection policy selected by the public import flags.
#[derive(Debug, Clone, Copy, Default)]
struct ImportPolicy {
    if_absent: bool,
    /// Whether the caller explicitly asserted the safe-flow capability. This
    /// is diagnostic only and never bypasses candidate validation.
    capability_asserted: bool,
    /// A retained acceptance transaction contains a Router-owned successor
    /// whose refresh chain may be advanced during recovery. Fresh imports keep
    /// this false because the source remains owned by the vendor client.
    router_owned_candidate: bool,
    /// Whether the credential is followed, copied, or followed-or-refused.
    sharing: CredentialSharing,
}

/// How the imported credential relates to the vendor client's own store.
///
/// One three-state choice rather than two flags, so "follow *and* snapshot" —
/// which clap already rejects at the command line — cannot be constructed here
/// either (issue #574).
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
enum CredentialSharing {
    /// Follow the vendor's file where possible; copy where it is not, saying so.
    ///
    /// The historical default: following keeps one refresh chain with one
    /// refresher, and a copy still beats refusing to provision at all.
    #[default]
    PreferFollow,
    /// Follow or refuse. A copy that will drift is not an acceptable outcome.
    RequireFollow,
    /// Copy deliberately, for a caller that wants the credential frozen.
    Snapshot,
}


fn copied(input: &[ImportPolicy]) -> Vec<ImportPolicy> { input.iter().copied().collect() }
fn flags(input: &[ImportPolicy]) -> Vec<bool> { input.iter().copied().map(|row| row.if_absent).collect() }
fn edited_flags(input: &[ImportPolicy]) -> Vec<bool> { input.iter().copied().map(|row| row.capability_asserted).collect() }
fn sharing(input: &[ImportPolicy]) -> Vec<CredentialSharing> { input.iter().copied().map(|row| row.sharing).collect() }
fn checked_copy(input: &[ImportPolicy]) -> Vec<ImportPolicy> { assert!(input.len() <= 4096, "explicit bounded receiving facade"); copied(input) }
#[test]
fn recursive_copy_record_identity_and_actual_owned_fields_preserve_original_values() {
 let values=[ImportPolicy {if_absent:true, capability_asserted:false, router_owned_candidate:true, sharing:CredentialSharing::PreferFollow},ImportPolicy {if_absent:false, capability_asserted:true, router_owned_candidate:false, sharing:CredentialSharing::RequireFollow},ImportPolicy {if_absent:true, capability_asserted:true, router_owned_candidate:false, sharing:CredentialSharing::Snapshot}];
 assert_eq!(flags(&values),vec![true,false,true]);assert_eq!(edited_flags(&values),vec![false,true,true]);assert_eq!(sharing(&values),vec![CredentialSharing::PreferFollow,CredentialSharing::RequireFollow,CredentialSharing::Snapshot]);
 let result=checked_copy(&values);assert_ne!(result.as_ptr(),values.as_ptr());assert_eq!(flags(&result),flags(&values));assert_eq!(sharing(&result),sharing(&values));assert!(result[0].router_owned_candidate);assert!(!result[1].router_owned_candidate);
 assert!(copied(&[]).is_empty());assert!(flags(&[]).is_empty());assert!(sharing(&[]).is_empty());let full=vec![values[0];4096];assert_eq!(checked_copy(&full).len(),4096);assert_eq!(edited_flags(&full),vec![false;4096]);assert!(std::panic::catch_unwind(||checked_copy(&vec![values[0];4097])).is_err());
 // Raw native slices/Vec remain unbounded; only checked_copy is a bounded facade.
 assert_eq!(copied(&vec![values[0];4097]).len(),4097);
}

#[derive(Clone, Copy)]
struct Bounds { small: u8, wide: u128, signed: i128 }
#[test]
fn independent_primitive_field_oracle_uses_real_native_widths() {
 let value=Bounds {small:u8::MAX,wide:u128::MAX,signed:i128::MIN};let input=vec![value;4096];
 let copied:Vec<Bounds>=input.iter().copied().collect();let wide:Vec<u128>=input.iter().copied().map(|row|row.wide).collect();assert_eq!(copied.len(),4096);assert_eq!(wide,vec![u128::MAX;4096]);assert_eq!(copied[0].small,u8::MAX);assert_eq!(copied[0].signed,i128::MIN);
}
