//! Independent finite-state native oracle SOURCE. Never run locally.
//! CI executes Rust only after all eight same-SHA JavaScript stages pass.
use link_assistant_router::translation_ordered_text_map_core::*;

const KEYS: [&str; 3] = ["", "a", "😀"];
const VALUES: [&str; 3] = ["", "\0", "é"];

fn pairs(slots: [Option<&str>; 3]) -> Vec<(String, String)> {
    KEYS.iter().zip(slots).filter_map(|(key, value)| {
        value.map(|value| ((*key).to_owned(), value.to_owned()))
    }).collect()
}

#[test]
fn every_small_map_state_and_single_edit_retains_independent_value_semantics() {
    // Absent or one of three values at three keys gives exactly64 states.
    // Expected order is written explicitly in KEYS; no BTreeMap/JS sort oracle.
    for code in 0usize..64 {
        let mut rest = code;
        let mut slots = [None; 3];
        for slot in &mut slots {
            let digit = rest % 4;
            *slot = if digit == 0 { None } else { Some(VALUES[digit - 1]) };
            rest /= 4;
        }
        let expected = pairs(slots);
        // Reverse insertion and an independently superseded value exercise the
        // contract without using the implementation's own sorting routine.
        let mut input = expected.clone();
        input.reverse();
        if let Some((key, _)) = expected.first() {
            input.insert(0, (key.clone(), "superseded".to_owned()));
        }
        let map = text_map_from_pairs(input);
        assert_eq!(text_map_pairs(&map), expected, "state {code}");
        assert_eq!(text_map_len(&map), u64::try_from(expected.len()).unwrap());
        assert_eq!(text_map_keys(&map), expected.iter().map(|(key, _)| key.clone()).collect::<Vec<_>>());
        assert_eq!(text_map_get(&map, "absent"), None);
        assert!(!text_map_contains(&map, "absent"));
        assert_eq!(text_map_pairs(&text_map_remove(text_map_copy(&map), "absent")), expected);
        for key_index in 0..KEYS.len() {
            let key = KEYS[key_index];
            assert_eq!(text_map_get(&map, key), slots[key_index]);
            assert_eq!(text_map_contains(&map, key), slots[key_index].is_some());
            let mut removed = slots;
            removed[key_index] = None;
            assert_eq!(text_map_pairs(&text_map_remove(text_map_copy(&map), key)), pairs(removed));
            for value in VALUES {
                let mut changed = slots;
                changed[key_index] = Some(value);
                let updated = text_map_insert(text_map_copy(&map), key.to_owned(), value.to_owned());
                assert_eq!(text_map_pairs(&updated), pairs(changed));
                assert_eq!(text_map_get(&updated, key), Some(value));
                assert_eq!(text_map_pairs(&map), expected, "copy/edit changed original state {code}");
            }
        }
    }
}

#[test]
fn exact_multibyte_byte_limit_and_oversize_lookup_keys_share_the_native_domain() {
    let payload = "😀".repeat(262_144); // Exactly1048576 UTF-8 bytes.
    let map = text_map_insert(text_map_new(), String::new(), payload.clone());
    assert_eq!(text_map_get(&map, ""), Some(payload.as_str()));
    let key = "😀".repeat(262_144);
    assert_eq!(text_map_get(&map, &key), None);
    assert!(!text_map_contains(&map, &key));
    assert_eq!(text_map_pairs(&text_map_remove(text_map_copy(&map), &key)), text_map_pairs(&map));
    let too_long = format!("{key}a");
    assert!(std::panic::catch_unwind(|| text_map_get(&map, &too_long)).is_err());
    assert!(std::panic::catch_unwind(|| text_map_contains(&map, &too_long)).is_err());
    assert!(std::panic::catch_unwind(|| text_map_remove(text_map_copy(&map), &too_long)).is_err());
    assert_eq!(text_map_get(&map, ""), Some(payload.as_str()));
    let shrunk = text_map_insert(text_map_copy(&map), String::new(), "é".to_owned());
    assert_eq!(text_map_pairs(&shrunk), vec![(String::new(), "é".to_owned())]);
    assert_eq!(text_map_get(&map, ""), Some(payload.as_str()));
}
