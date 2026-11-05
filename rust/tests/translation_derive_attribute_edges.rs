// Independent native oracle SOURCE; execution belongs to JavaScript-gated CI.
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

#[allow(dead_code)]
#[warn(unused_variables)]
#[deny(unused_must_use)]
#[forbid(unsafe_code)]
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
struct AttributeScalar(u32);

#[allow(dead_code)]
#[derive(Clone, Debug, PartialEq, Eq)]
enum AttributeChoice {
    Empty,
    Text(String),
}

#[test]
fn original_generic_derives_preserve_scalar_and_nested_enum_behavior() {
    let value = AttributeScalar(7);
    let copied = value;
    assert_eq!(copied, value);
    assert_eq!(AttributeScalar::default(), AttributeScalar(0));
    assert!(AttributeScalar(0) < value);
    assert_eq!(format!("{value:?}"), "AttributeScalar(7)");
    let mut left = DefaultHasher::new();
    let mut right = DefaultHasher::new();
    value.hash(&mut left);
    copied.hash(&mut right);
    assert_eq!(left.finish(), right.finish());
    let text = AttributeChoice::Text(String::from("é😀"));
    assert_eq!(text.clone(), text);
    assert_ne!(AttributeChoice::Empty, text);
}
