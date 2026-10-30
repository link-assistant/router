//! Independent native local item/source-scope oracle. CI only; UNRUN.
type RouterBlockMarker = u64;

#[test]
fn local_data_alias_constants_statics_and_crate_bindings_remain_in_their_block() {
    assert_eq!(core::mem::size_of::<RouterBlockMarker>(), 8);
    {
        struct RouterBlockMarker(bool);
        enum Message {
            Empty,
            Flag(bool),
        }
        type Alias = RouterBlockMarker;
        const FLAG: bool = true;
        static COUNT: u64 = 7;
        extern crate core as block_core;
        let value = RouterBlockMarker(FLAG);
        assert!(value.0);
        assert_eq!(COUNT, 7);
        assert_eq!(block_core::mem::size_of::<Alias>(), 1);
        let empty = Message::Empty;
        let message = Message::Flag(value.0);
        assert!(matches!(empty, Message::Empty));
        assert!(matches!(message, Message::Flag(true)));
    }
    assert_eq!(core::mem::size_of::<RouterBlockMarker>(), 8);
    {
        type Alias = u16;
        const FLAG: bool = false;
        static COUNT: u64 = 9;
        assert_eq!(core::mem::size_of::<Alias>(), 2);
        let observed = FLAG;
        assert!(!observed);
        assert_eq!(COUNT, 9);
    }
}

#[test]
fn local_initializers_and_type_macros_stay_at_their_source_sites() {
    macro_rules! local_type {
        () => {
            u16
        };
    }
    macro_rules! local_value {
        () => {
            9_usize
        };
    }
    type Local = local_type!();
    const COUNT: usize = local_value!();
    static FLAG: bool = true;
    assert_eq!(core::mem::size_of::<Local>(), 2);
    assert_eq!(COUNT, 9);
    assert!(FLAG);
}
