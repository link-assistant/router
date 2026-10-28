// Independent original nonbinding pattern oracle. UNRUN; gated CI only.
fn optional(value: &str, input: Option<bool>) -> String {
    let saved = value;
    match input { Some(_) => saved.into(), Option::None => "none".into() }
}
fn result(value: &str, input: Result<bool, String>) -> String {
    match input { Ok(_) => value.into(), Err(_) => "error".into() }
}
fn slice_label(input: &[bool]) -> &'static str {
    match input { [_, ..] => "nonempty", [] => "empty" }
}
// Ignored fields are intentional: the source pattern must introduce no binding.
#[allow(dead_code)]
enum Shape { Tuple(u64), Record { field: bool }, Empty }
fn shape(input: Shape) -> &'static str {
    match input {
        Shape::Tuple(_) => "tuple",
        Shape::Record { field: _, .. } => "record",
        Shape::Empty => "unit",
    }
}
#[test]
fn original_nonbinding_constructor_and_container_shapes() {
    for value in ["", "é😀", "a\0b"] {
        assert_eq!(optional(value, Some(true)), value);
        assert_eq!(optional(value, None), "none");
        assert_eq!(result(value, Ok(true)), value);
        assert_eq!(result(value, Err("ignored".to_owned())), "error");
    }
    assert_eq!(slice_label(&[]), "empty");
    assert_eq!(slice_label(&[true, false]), "nonempty");
    assert_eq!(shape(Shape::Tuple(7)), "tuple");
    assert_eq!(shape(Shape::Record { field: true }), "record");
    assert_eq!(shape(Shape::Empty), "unit");
}
