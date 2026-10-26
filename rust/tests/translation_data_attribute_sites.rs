//! Native data/attribute edge-case SOURCE. No local Rust tools; UNRUN.
#![allow(dead_code)]

struct Unit;
struct Empty();
struct Pair(#[doc = "First field"] pub u8, #[allow(unused)] bool);

struct Packet<T, const N: usize> {
    #[doc = concat!("Byte", " array")]
    bytes: [u8; N],
    #[allow(unused)]
    r#type: T,
}

enum Message {
    #[doc = "Empty message"]
    Empty,
    Pair(#[doc = "Number"] u8, bool),
    Named {
        #[doc = "Flag"]
        flag: bool,
    },
}

#[repr(u8)]
enum Code {
    Zero = 0,
    Seven = 7,
}

#[test]
fn data_shapes_const_generics_raw_fields_and_attribute_values_remain_independent() {
    let packet = Packet { bytes: [1_u8, 2, 3], r#type: true };
    assert_eq!(packet.bytes, [1, 2, 3]);
    assert!(packet.r#type);
    let empty: Packet<bool, 0> = Packet { bytes: [], r#type: false };
    assert!(empty.bytes.is_empty());
    let Pair(number, flag) = Pair(7, true);
    assert_eq!(number, 7);
    assert!(flag);
    assert!(matches!(Message::Named { flag: true }, Message::Named { flag: true }));
    assert_eq!(Code::Zero as u8, 0);
    assert_eq!(Code::Seven as u8, 7);
}
