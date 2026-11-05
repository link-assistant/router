// Independent native oracle SOURCE. CI only after all same-SHA JavaScript gates.
use serde_json::Value;

#[test]
fn predicates_keep_json_kind_and_integer_float_representation_distinct() {
    let cases = [
        ("null", [true, false, false, false, false, false, false, false, false]),
        ("false", [false, true, false, false, false, false, false, false, false]),
        ("\"猫😀\"", [false, false, false, true, false, false, false, false, false]),
        ("[]", [false, false, false, false, true, false, false, false, false]),
        ("{}", [false, false, false, false, false, true, false, false, false]),
        ("0", [false, false, true, false, false, false, true, true, false]),
        ("-1", [false, false, true, false, false, false, false, true, false]),
        ("18446744073709551615", [false, false, true, false, false, false, true, false, false]),
        ("-9223372036854775808", [false, false, true, false, false, false, false, true, false]),
        ("1.0", [false, false, true, false, false, false, false, false, true]),
        ("-0.0", [false, false, true, false, false, false, false, false, true]),
    ];
    for (source, expected) in cases {
        let value: Value = serde_json::from_str(source).unwrap();
        assert_eq!([value.is_null(), value.is_boolean(), value.is_number(), value.is_string(), value.is_array(), value.is_object(), value.is_u64(), value.is_i64(), value.is_f64()], expected, "{source}");
        assert_eq!(Some(&value).is_some_and(|child| child.is_null()), value.is_null());
        assert_ne!(Some(&value).is_none_or(|child| !child.is_object()), value.is_object());
    }
    let absent: Option<&Value> = None;
    assert!(!absent.is_some_and(Value::is_object));
    assert!(absent.is_none_or(Value::is_object));
}
