// Independent native compatibility oracle source. CI only after all JS gates.
#[path = "../src/translation_primitive_vectors_core.rs"]
mod vectors;

#[test]
fn owned_bool_operations_retain_values_and_return_no_element_loan() {
    let minimum = false;
    let maximum = true;
    let empty = vectors::vec_bool_new();
    assert_eq!(vectors::vec_bool_len(&empty), 0);
    assert_eq!(vectors::vec_bool_get(&empty, 0), None);
    let values = vectors::vec_bool_from_slice(&[minimum, maximum]);
    assert_eq!(vectors::vec_bool_get(&values, 0), Some(minimum));
    assert_eq!(vectors::vec_bool_get(&values, 1), Some(maximum));
    assert_eq!(vectors::vec_bool_get(&values, u64::MAX), None);
    let copied = vectors::vec_bool_get(&values, 0);
    drop(values);
    assert_eq!(copied, Some(minimum));
    let pushed = vectors::vec_bool_push(vectors::vec_bool_from_slice(&[minimum]), maximum);
    assert_eq!(pushed, vec![minimum, maximum]);
    let appended = vectors::vec_bool_append(pushed, vectors::vec_bool_from_slice(&[minimum]));
    assert_eq!(appended, vec![minimum, maximum, minimum]);
    let replaced = vectors::vec_bool_replace(appended, 0, maximum);
    assert_eq!(replaced, vec![maximum, maximum, minimum]);
    let unchanged = vectors::vec_bool_truncate(replaced, u64::MAX);
    assert_eq!(unchanged, vec![maximum, maximum, minimum]);
    assert_eq!(vectors::vec_bool_truncate(unchanged, 1), vec![maximum]);
    assert_eq!(vectors::vec_bool_truncate(vectors::vec_bool_from_slice(&[minimum]), 0), vec![]);
}

#[test]
fn owned_u8_operations_retain_values_and_return_no_element_loan() {
    let minimum = 0_u8;
    let maximum = 255_u8;
    let empty = vectors::vec_u8_new();
    assert_eq!(vectors::vec_u8_len(&empty), 0);
    assert_eq!(vectors::vec_u8_get(&empty, 0), None);
    let values = vectors::vec_u8_from_slice(&[minimum, maximum]);
    assert_eq!(vectors::vec_u8_get(&values, 0), Some(minimum));
    assert_eq!(vectors::vec_u8_get(&values, 1), Some(maximum));
    assert_eq!(vectors::vec_u8_get(&values, u64::MAX), None);
    let copied = vectors::vec_u8_get(&values, 0);
    drop(values);
    assert_eq!(copied, Some(minimum));
    let pushed = vectors::vec_u8_push(vectors::vec_u8_from_slice(&[minimum]), maximum);
    assert_eq!(pushed, vec![minimum, maximum]);
    let appended = vectors::vec_u8_append(pushed, vectors::vec_u8_from_slice(&[minimum]));
    assert_eq!(appended, vec![minimum, maximum, minimum]);
    let replaced = vectors::vec_u8_replace(appended, 0, maximum);
    assert_eq!(replaced, vec![maximum, maximum, minimum]);
    let unchanged = vectors::vec_u8_truncate(replaced, u64::MAX);
    assert_eq!(unchanged, vec![maximum, maximum, minimum]);
    assert_eq!(vectors::vec_u8_truncate(unchanged, 1), vec![maximum]);
    assert_eq!(vectors::vec_u8_truncate(vectors::vec_u8_from_slice(&[minimum]), 0), vec![]);
}

#[test]
fn owned_i8_operations_retain_values_and_return_no_element_loan() {
    let minimum = -128_i8;
    let maximum = 127_i8;
    let empty = vectors::vec_i8_new();
    assert_eq!(vectors::vec_i8_len(&empty), 0);
    assert_eq!(vectors::vec_i8_get(&empty, 0), None);
    let values = vectors::vec_i8_from_slice(&[minimum, maximum]);
    assert_eq!(vectors::vec_i8_get(&values, 0), Some(minimum));
    assert_eq!(vectors::vec_i8_get(&values, 1), Some(maximum));
    assert_eq!(vectors::vec_i8_get(&values, u64::MAX), None);
    let copied = vectors::vec_i8_get(&values, 0);
    drop(values);
    assert_eq!(copied, Some(minimum));
    let pushed = vectors::vec_i8_push(vectors::vec_i8_from_slice(&[minimum]), maximum);
    assert_eq!(pushed, vec![minimum, maximum]);
    let appended = vectors::vec_i8_append(pushed, vectors::vec_i8_from_slice(&[minimum]));
    assert_eq!(appended, vec![minimum, maximum, minimum]);
    let replaced = vectors::vec_i8_replace(appended, 0, maximum);
    assert_eq!(replaced, vec![maximum, maximum, minimum]);
    let unchanged = vectors::vec_i8_truncate(replaced, u64::MAX);
    assert_eq!(unchanged, vec![maximum, maximum, minimum]);
    assert_eq!(vectors::vec_i8_truncate(unchanged, 1), vec![maximum]);
    assert_eq!(vectors::vec_i8_truncate(vectors::vec_i8_from_slice(&[minimum]), 0), vec![]);
}

#[test]
fn owned_u16_operations_retain_values_and_return_no_element_loan() {
    let minimum = 0_u16;
    let maximum = 65535_u16;
    let empty = vectors::vec_u16_new();
    assert_eq!(vectors::vec_u16_len(&empty), 0);
    assert_eq!(vectors::vec_u16_get(&empty, 0), None);
    let values = vectors::vec_u16_from_slice(&[minimum, maximum]);
    assert_eq!(vectors::vec_u16_get(&values, 0), Some(minimum));
    assert_eq!(vectors::vec_u16_get(&values, 1), Some(maximum));
    assert_eq!(vectors::vec_u16_get(&values, u64::MAX), None);
    let copied = vectors::vec_u16_get(&values, 0);
    drop(values);
    assert_eq!(copied, Some(minimum));
    let pushed = vectors::vec_u16_push(vectors::vec_u16_from_slice(&[minimum]), maximum);
    assert_eq!(pushed, vec![minimum, maximum]);
    let appended = vectors::vec_u16_append(pushed, vectors::vec_u16_from_slice(&[minimum]));
    assert_eq!(appended, vec![minimum, maximum, minimum]);
    let replaced = vectors::vec_u16_replace(appended, 0, maximum);
    assert_eq!(replaced, vec![maximum, maximum, minimum]);
    let unchanged = vectors::vec_u16_truncate(replaced, u64::MAX);
    assert_eq!(unchanged, vec![maximum, maximum, minimum]);
    assert_eq!(vectors::vec_u16_truncate(unchanged, 1), vec![maximum]);
    assert_eq!(vectors::vec_u16_truncate(vectors::vec_u16_from_slice(&[minimum]), 0), vec![]);
}

#[test]
fn owned_i16_operations_retain_values_and_return_no_element_loan() {
    let minimum = -32768_i16;
    let maximum = 32767_i16;
    let empty = vectors::vec_i16_new();
    assert_eq!(vectors::vec_i16_len(&empty), 0);
    assert_eq!(vectors::vec_i16_get(&empty, 0), None);
    let values = vectors::vec_i16_from_slice(&[minimum, maximum]);
    assert_eq!(vectors::vec_i16_get(&values, 0), Some(minimum));
    assert_eq!(vectors::vec_i16_get(&values, 1), Some(maximum));
    assert_eq!(vectors::vec_i16_get(&values, u64::MAX), None);
    let copied = vectors::vec_i16_get(&values, 0);
    drop(values);
    assert_eq!(copied, Some(minimum));
    let pushed = vectors::vec_i16_push(vectors::vec_i16_from_slice(&[minimum]), maximum);
    assert_eq!(pushed, vec![minimum, maximum]);
    let appended = vectors::vec_i16_append(pushed, vectors::vec_i16_from_slice(&[minimum]));
    assert_eq!(appended, vec![minimum, maximum, minimum]);
    let replaced = vectors::vec_i16_replace(appended, 0, maximum);
    assert_eq!(replaced, vec![maximum, maximum, minimum]);
    let unchanged = vectors::vec_i16_truncate(replaced, u64::MAX);
    assert_eq!(unchanged, vec![maximum, maximum, minimum]);
    assert_eq!(vectors::vec_i16_truncate(unchanged, 1), vec![maximum]);
    assert_eq!(vectors::vec_i16_truncate(vectors::vec_i16_from_slice(&[minimum]), 0), vec![]);
}

#[test]
fn owned_u32_operations_retain_values_and_return_no_element_loan() {
    let minimum = 0_u32;
    let maximum = 4294967295_u32;
    let empty = vectors::vec_u32_new();
    assert_eq!(vectors::vec_u32_len(&empty), 0);
    assert_eq!(vectors::vec_u32_get(&empty, 0), None);
    let values = vectors::vec_u32_from_slice(&[minimum, maximum]);
    assert_eq!(vectors::vec_u32_get(&values, 0), Some(minimum));
    assert_eq!(vectors::vec_u32_get(&values, 1), Some(maximum));
    assert_eq!(vectors::vec_u32_get(&values, u64::MAX), None);
    let copied = vectors::vec_u32_get(&values, 0);
    drop(values);
    assert_eq!(copied, Some(minimum));
    let pushed = vectors::vec_u32_push(vectors::vec_u32_from_slice(&[minimum]), maximum);
    assert_eq!(pushed, vec![minimum, maximum]);
    let appended = vectors::vec_u32_append(pushed, vectors::vec_u32_from_slice(&[minimum]));
    assert_eq!(appended, vec![minimum, maximum, minimum]);
    let replaced = vectors::vec_u32_replace(appended, 0, maximum);
    assert_eq!(replaced, vec![maximum, maximum, minimum]);
    let unchanged = vectors::vec_u32_truncate(replaced, u64::MAX);
    assert_eq!(unchanged, vec![maximum, maximum, minimum]);
    assert_eq!(vectors::vec_u32_truncate(unchanged, 1), vec![maximum]);
    assert_eq!(vectors::vec_u32_truncate(vectors::vec_u32_from_slice(&[minimum]), 0), vec![]);
}

#[test]
fn owned_i32_operations_retain_values_and_return_no_element_loan() {
    let minimum = -2147483648_i32;
    let maximum = 2147483647_i32;
    let empty = vectors::vec_i32_new();
    assert_eq!(vectors::vec_i32_len(&empty), 0);
    assert_eq!(vectors::vec_i32_get(&empty, 0), None);
    let values = vectors::vec_i32_from_slice(&[minimum, maximum]);
    assert_eq!(vectors::vec_i32_get(&values, 0), Some(minimum));
    assert_eq!(vectors::vec_i32_get(&values, 1), Some(maximum));
    assert_eq!(vectors::vec_i32_get(&values, u64::MAX), None);
    let copied = vectors::vec_i32_get(&values, 0);
    drop(values);
    assert_eq!(copied, Some(minimum));
    let pushed = vectors::vec_i32_push(vectors::vec_i32_from_slice(&[minimum]), maximum);
    assert_eq!(pushed, vec![minimum, maximum]);
    let appended = vectors::vec_i32_append(pushed, vectors::vec_i32_from_slice(&[minimum]));
    assert_eq!(appended, vec![minimum, maximum, minimum]);
    let replaced = vectors::vec_i32_replace(appended, 0, maximum);
    assert_eq!(replaced, vec![maximum, maximum, minimum]);
    let unchanged = vectors::vec_i32_truncate(replaced, u64::MAX);
    assert_eq!(unchanged, vec![maximum, maximum, minimum]);
    assert_eq!(vectors::vec_i32_truncate(unchanged, 1), vec![maximum]);
    assert_eq!(vectors::vec_i32_truncate(vectors::vec_i32_from_slice(&[minimum]), 0), vec![]);
}

#[test]
fn owned_u64_operations_retain_values_and_return_no_element_loan() {
    let minimum = 0_u64;
    let maximum = 18446744073709551615_u64;
    let empty = vectors::vec_u64_new();
    assert_eq!(vectors::vec_u64_len(&empty), 0);
    assert_eq!(vectors::vec_u64_get(&empty, 0), None);
    let values = vectors::vec_u64_from_slice(&[minimum, maximum]);
    assert_eq!(vectors::vec_u64_get(&values, 0), Some(minimum));
    assert_eq!(vectors::vec_u64_get(&values, 1), Some(maximum));
    assert_eq!(vectors::vec_u64_get(&values, u64::MAX), None);
    let copied = vectors::vec_u64_get(&values, 0);
    drop(values);
    assert_eq!(copied, Some(minimum));
    let pushed = vectors::vec_u64_push(vectors::vec_u64_from_slice(&[minimum]), maximum);
    assert_eq!(pushed, vec![minimum, maximum]);
    let appended = vectors::vec_u64_append(pushed, vectors::vec_u64_from_slice(&[minimum]));
    assert_eq!(appended, vec![minimum, maximum, minimum]);
    let replaced = vectors::vec_u64_replace(appended, 0, maximum);
    assert_eq!(replaced, vec![maximum, maximum, minimum]);
    let unchanged = vectors::vec_u64_truncate(replaced, u64::MAX);
    assert_eq!(unchanged, vec![maximum, maximum, minimum]);
    assert_eq!(vectors::vec_u64_truncate(unchanged, 1), vec![maximum]);
    assert_eq!(vectors::vec_u64_truncate(vectors::vec_u64_from_slice(&[minimum]), 0), vec![]);
}

#[test]
fn owned_i64_operations_retain_values_and_return_no_element_loan() {
    let minimum = -9223372036854775808_i64;
    let maximum = 9223372036854775807_i64;
    let empty = vectors::vec_i64_new();
    assert_eq!(vectors::vec_i64_len(&empty), 0);
    assert_eq!(vectors::vec_i64_get(&empty, 0), None);
    let values = vectors::vec_i64_from_slice(&[minimum, maximum]);
    assert_eq!(vectors::vec_i64_get(&values, 0), Some(minimum));
    assert_eq!(vectors::vec_i64_get(&values, 1), Some(maximum));
    assert_eq!(vectors::vec_i64_get(&values, u64::MAX), None);
    let copied = vectors::vec_i64_get(&values, 0);
    drop(values);
    assert_eq!(copied, Some(minimum));
    let pushed = vectors::vec_i64_push(vectors::vec_i64_from_slice(&[minimum]), maximum);
    assert_eq!(pushed, vec![minimum, maximum]);
    let appended = vectors::vec_i64_append(pushed, vectors::vec_i64_from_slice(&[minimum]));
    assert_eq!(appended, vec![minimum, maximum, minimum]);
    let replaced = vectors::vec_i64_replace(appended, 0, maximum);
    assert_eq!(replaced, vec![maximum, maximum, minimum]);
    let unchanged = vectors::vec_i64_truncate(replaced, u64::MAX);
    assert_eq!(unchanged, vec![maximum, maximum, minimum]);
    assert_eq!(vectors::vec_i64_truncate(unchanged, 1), vec![maximum]);
    assert_eq!(vectors::vec_i64_truncate(vectors::vec_i64_from_slice(&[minimum]), 0), vec![]);
}

#[test]
fn owned_u128_operations_retain_values_and_return_no_element_loan() {
    let minimum = 0_u128;
    let maximum = 340282366920938463463374607431768211455_u128;
    let empty = vectors::vec_u128_new();
    assert_eq!(vectors::vec_u128_len(&empty), 0);
    assert_eq!(vectors::vec_u128_get(&empty, 0), None);
    let values = vectors::vec_u128_from_slice(&[minimum, maximum]);
    assert_eq!(vectors::vec_u128_get(&values, 0), Some(minimum));
    assert_eq!(vectors::vec_u128_get(&values, 1), Some(maximum));
    assert_eq!(vectors::vec_u128_get(&values, u64::MAX), None);
    let copied = vectors::vec_u128_get(&values, 0);
    drop(values);
    assert_eq!(copied, Some(minimum));
    let pushed = vectors::vec_u128_push(vectors::vec_u128_from_slice(&[minimum]), maximum);
    assert_eq!(pushed, vec![minimum, maximum]);
    let appended = vectors::vec_u128_append(pushed, vectors::vec_u128_from_slice(&[minimum]));
    assert_eq!(appended, vec![minimum, maximum, minimum]);
    let replaced = vectors::vec_u128_replace(appended, 0, maximum);
    assert_eq!(replaced, vec![maximum, maximum, minimum]);
    let unchanged = vectors::vec_u128_truncate(replaced, u64::MAX);
    assert_eq!(unchanged, vec![maximum, maximum, minimum]);
    assert_eq!(vectors::vec_u128_truncate(unchanged, 1), vec![maximum]);
    assert_eq!(vectors::vec_u128_truncate(vectors::vec_u128_from_slice(&[minimum]), 0), vec![]);
}

#[test]
fn owned_i128_operations_retain_values_and_return_no_element_loan() {
    let minimum = -170141183460469231731687303715884105728_i128;
    let maximum = 170141183460469231731687303715884105727_i128;
    let empty = vectors::vec_i128_new();
    assert_eq!(vectors::vec_i128_len(&empty), 0);
    assert_eq!(vectors::vec_i128_get(&empty, 0), None);
    let values = vectors::vec_i128_from_slice(&[minimum, maximum]);
    assert_eq!(vectors::vec_i128_get(&values, 0), Some(minimum));
    assert_eq!(vectors::vec_i128_get(&values, 1), Some(maximum));
    assert_eq!(vectors::vec_i128_get(&values, u64::MAX), None);
    let copied = vectors::vec_i128_get(&values, 0);
    drop(values);
    assert_eq!(copied, Some(minimum));
    let pushed = vectors::vec_i128_push(vectors::vec_i128_from_slice(&[minimum]), maximum);
    assert_eq!(pushed, vec![minimum, maximum]);
    let appended = vectors::vec_i128_append(pushed, vectors::vec_i128_from_slice(&[minimum]));
    assert_eq!(appended, vec![minimum, maximum, minimum]);
    let replaced = vectors::vec_i128_replace(appended, 0, maximum);
    assert_eq!(replaced, vec![maximum, maximum, minimum]);
    let unchanged = vectors::vec_i128_truncate(replaced, u64::MAX);
    assert_eq!(unchanged, vec![maximum, maximum, minimum]);
    assert_eq!(vectors::vec_i128_truncate(unchanged, 1), vec![maximum]);
    assert_eq!(vectors::vec_i128_truncate(vectors::vec_i128_from_slice(&[minimum]), 0), vec![]);
}

#[test]
fn explicit_resource_bounds_and_replacement_failures_match_the_core_contract() {
    let full = vec![0_u8; 4096];
    assert_eq!(vectors::vec_u8_len(&full), 4096);
    assert_eq!(vectors::vec_u8_get(&full, 4095), Some(0));
    assert!(std::panic::catch_unwind(|| vectors::vec_u8_push(full, 0)).is_err());
    assert!(std::panic::catch_unwind(|| vectors::vec_u8_append(vec![0; 4096], vec![1])).is_err());
    assert!(std::panic::catch_unwind(|| vectors::vec_u8_from_slice(&[0; 4097])).is_err());
    assert!(std::panic::catch_unwind(|| vectors::vec_u8_len(&vec![0; 4097])).is_err());
    assert!(std::panic::catch_unwind(|| vectors::vec_u8_truncate(vec![0; 4097], 0)).is_err());
    assert!(std::panic::catch_unwind(|| vectors::vec_u8_replace(vec![0], 1, 1)).is_err());
}
