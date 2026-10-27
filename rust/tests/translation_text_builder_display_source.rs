// Independent primitive Display/temporary borrow oracle. UNRUN; gated CI only.
#[test]
fn original_temporary_display_borrows_and_integer_edges() {
    let mut value = String::new();
    value.push_str(&u128::MAX.to_string());
    value.push_str(&i128::MIN.to_string());
    value.push_str(&true.to_string());
    value.push_str(&false.to_string());
    assert_eq!(value, "340282366920938463463374607431768211455-170141183460469231731687303715884105728truefalse");
    for number in [i64::MIN, -1, 0, 1, i64::MAX] {
        let mut result = String::new();
        result.push_str(&number.to_string());
        assert_eq!(result, format!("{}", number));
    }
}
