// Independent lifetime-only scalar alias oracle. UNRUN; gated Rust CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
struct Borrowed<'a> { value: &'a scalar::U64, tag: scalar::Bool }
struct Pair<'a>(&'a scalar::I64);
enum Choice<'a> { Empty, Some(&'a scalar::U32) }
type Reference<'a> = Option<&'a scalar::U16>;
fn choose<'a, 'b: 'a>(left: &'a scalar::U64, _right: &'b scalar::U64) -> &'a scalar::U64 { left }
impl<'a> Borrowed<'a> { fn method(&self, value: &'a scalar::U8) -> &'a scalar::U8 { value } }
#[test]
fn scalar_alias_adoption_retains_explicit_native_borrow_regions() {
    let wide = u64::MAX;
    let narrow = u8::MAX;
    let holder = Borrowed { value: &wide, tag: false };
    assert_eq!(*holder.value, u64::MAX);
    assert!(!holder.tag);
    assert!(std::ptr::eq(holder.method(&narrow), &narrow));
    assert!(std::ptr::eq(choose(&wide, &wide), &wide));
    let signed = i64::MIN;
    assert_eq!(*Pair(&signed).0, i64::MIN);
    let unsigned = u32::MAX;
    assert!(matches!(Choice::Some(&unsigned), Choice::Some(value) if *value == u32::MAX));
    assert!(matches!(Choice::Empty, Choice::Empty));
    let small = u16::MAX;
    let reference: Reference<'_> = Some(&small);
    assert_eq!(reference.copied(), Some(u16::MAX));
}
