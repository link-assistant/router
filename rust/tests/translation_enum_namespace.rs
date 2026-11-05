//! Native generic/variant oracle SOURCE; only JS-gated CI executes it.
enum Carrier<T> {
    Value(T),
    Empty,
    Record { value: T },
}
use Carrier::{Empty, Record, Value as Present};

#[test]
fn generic_constructor_domains_and_payload_order() {
    let first = Present(String::from("value"));
    let empty: Carrier<String> = Empty;
    let record = Record { value: 17_u64 };
    assert!(matches!(first, Present(value) if value == "value"));
    assert!(matches!(empty, Empty));
    assert!(matches!(record, Record { value: 17 }));
}

enum View<'a, T, const N: usize> {
    One(&'a T),
    Bytes([u8; N]),
}

#[test]
fn lifetime_and_const_parameters_do_not_add_enclosing_constructor_names() {
    let value = 19_u64;
    let view: View<'_, u64, 2> = View::One(&value);
    assert!(matches!(view, View::One(actual) if *actual == 19));
    let bytes: View<'_, u64, 2> = View::Bytes([0, 255]);
    assert!(matches!(bytes, View::Bytes([0, 255])));
}
