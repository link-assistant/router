// Independent monomorphic field adoption oracle. UNRUN; gated Rust CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
struct Packet { id: scalar::U64, ok: scalar::Bool, coords: (scalar::I16, scalar::F64) }
struct Pair(scalar::U8, scalar::U32);
enum Message { Empty, One(scalar::U64), Named { code: scalar::I32, flag: scalar::Bool }, Nested(Option<(scalar::U8, scalar::U16)>) }
type Scalar = scalar::U128;
static ZERO: scalar::I64 = 0;
#[test]
fn scalar_alias_field_layout_and_native_constructors_retain_assignment_domains() {
    let packet = Packet { id: u64::MAX, ok: false, coords: (i16::MIN, -0.0) };
    assert_eq!(packet.id, u64::MAX);
    assert!(!packet.ok);
    assert_eq!(packet.coords.0, i16::MIN);
    assert!(packet.coords.1.is_sign_negative());
    let pair = Pair(u8::MAX, u32::MAX);
    assert_eq!((pair.0, pair.1), (u8::MAX, u32::MAX));
    assert!(matches!(Message::Empty, Message::Empty));
    assert!(matches!(Message::One(u64::MAX), Message::One(value) if value == u64::MAX));
    assert!(matches!(Message::Named { code: i32::MIN, flag: true }, Message::Named { code, flag } if code == i32::MIN && flag));
    assert!(matches!(Message::Nested(Some((u8::MAX, u16::MAX))), Message::Nested(Some((first, second))) if first == u8::MAX && second == u16::MAX));
    let value: Scalar = u128::MAX;
    assert_eq!(value, u128::MAX);
    assert_eq!(ZERO, 0);
}
