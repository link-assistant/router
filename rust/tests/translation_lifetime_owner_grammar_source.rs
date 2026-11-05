// Independent explicit native lifetime receiver/where oracle. UNRUN; gated CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
struct Holder<'a> where 'a: 'static { value: &'a scalar::U64 }
impl<'a> Holder<'a> where 'a: 'static { fn view(&'a self) -> &'a scalar::U64 { self.value } }
fn choose<'a>(value: &'a scalar::U64) -> &'a scalar::U64 where 'a: 'static { value }
static VALUE: u64 = u64::MAX;
static HOLDER: Holder<'static> = Holder { value: &VALUE };
#[test]
fn scalar_aliases_preserve_static_outlives_constraints_and_receiver_borrow() {
    assert!(std::ptr::eq(HOLDER.view(), &VALUE));
    assert!(std::ptr::eq(choose(&VALUE), &VALUE));
    assert_eq!(*HOLDER.view(), u64::MAX);
}
