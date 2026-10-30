//! Independent shared vector/native oracle SOURCE. Gated CI only; UNRUN.
use link_assistant_router::translation_text_core as owned;
use serde_json::{json, Value};

fn option(value: Option<&str>) -> Value {
    match value {
        Some(value) => json!({"$":"Some","field0":value}),
        None => json!({"$":"None"}),
    }
}

#[test]
fn fixed_vectors_check_facade_and_independent_native_library_calls() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../tools/translation/test/fixtures/text-ascii-vectors.json"
    ))
    .expect("complete independent vector source");
    for vector in fixture["vectors"].as_array().expect("vector array") {
        let name = vector["operation"].as_str().expect("operation name");
        let value = vector["arguments"][0].as_str().expect("scalar input");
        let other = vector["arguments"][1].as_str().unwrap_or("");
        let (actual, native) = match name {
            "to_ascii_lowercase" => (
                json!(owned::to_ascii_lowercase(value)),
                json!(value.to_ascii_lowercase()),
            ),
            "to_ascii_uppercase" => (
                json!(owned::to_ascii_uppercase(value)),
                json!(value.to_ascii_uppercase()),
            ),
            "is_ascii" => (json!(owned::is_ascii(value)), json!(value.is_ascii())),
            "eq_ignore_ascii_case" => (
                json!(owned::eq_ignore_ascii_case(value, other)),
                json!(value.eq_ignore_ascii_case(other)),
            ),
            "trim_ascii" => (json!(owned::trim_ascii(value)), json!(value.trim_ascii())),
            "trim_ascii_start" => (
                json!(owned::trim_ascii_start(value)),
                json!(value.trim_ascii_start()),
            ),
            "trim_ascii_end" => (
                json!(owned::trim_ascii_end(value)),
                json!(value.trim_ascii_end()),
            ),
            "split_once_left" => (
                option(owned::split_once_left(value, other)),
                option(value.split_once(other).map(|(left, _)| left)),
            ),
            "split_once_right" => (
                option(owned::split_once_right(value, other)),
                option(value.split_once(other).map(|(_, right)| right)),
            ),
            "rsplit_once_left" => (
                option(owned::rsplit_once_left(value, other)),
                option(value.rsplit_once(other).map(|(left, _)| left)),
            ),
            "rsplit_once_right" => (
                option(owned::rsplit_once_right(value, other)),
                option(value.rsplit_once(other).map(|(_, right)| right)),
            ),
            unknown => panic!("unhandled independent operation {unknown}"),
        };
        assert_eq!(actual, vector["expected"], "facade {name}: {value:?}");
        assert_eq!(native, vector["expected"], "native {name}: {value:?}");
    }
}

#[test]
fn borrowed_results_keep_the_receiver_storage_and_scalar_boundaries() {
    let value = String::from(" α::β::γ ");
    for result in [
        Some(owned::trim_ascii(&value)),
        Some(owned::trim_ascii_start(&value)),
        Some(owned::trim_ascii_end(&value)),
        owned::split_once_left(&value, "::"),
        owned::split_once_right(&value, "::"),
        owned::rsplit_once_left(&value, "::"),
        owned::rsplit_once_right(&value, "::"),
    ] {
        let result = result.expect("matching borrowed slice");
        let offset = result.as_ptr() as usize - value.as_ptr() as usize;
        assert!(offset <= value.len());
        assert!(value.is_char_boundary(offset));
        assert!(value.is_char_boundary(offset + result.len()));
        assert_eq!(value.get(offset..offset + result.len()), Some(result));
    }
}

#[test]
fn all_added_parameters_retain_the_existing_successful_resource_domain() {
    let unary: [fn(&str); 6] = [
        |value| { let _ = owned::to_ascii_lowercase(value); },
        |value| { let _ = owned::to_ascii_uppercase(value); },
        |value| { let _ = owned::is_ascii(value); },
        |value| { let _ = owned::trim_ascii(value); },
        |value| { let _ = owned::trim_ascii_start(value); },
        |value| { let _ = owned::trim_ascii_end(value); },
    ];
    let binary: [fn(&str, &str); 5] = [
        |left, right| { let _ = owned::eq_ignore_ascii_case(left, right); },
        |left, right| { let _ = owned::split_once_left(left, right); },
        |left, right| { let _ = owned::split_once_right(left, right); },
        |left, right| { let _ = owned::rsplit_once_left(left, right); },
        |left, right| { let _ = owned::rsplit_once_right(left, right); },
    ];
    let large = "A".repeat(1_048_576);
    assert_eq!(owned::to_ascii_lowercase(&large), "a".repeat(1_048_576));
    let oversized = "A".repeat(1_048_577);
    for operation in unary {
        assert!(std::panic::catch_unwind(|| operation(&oversized)).is_err());
    }
    for operation in binary {
        assert!(std::panic::catch_unwind(|| operation(&oversized, "x")).is_err());
        assert!(std::panic::catch_unwind(|| operation("x", &oversized)).is_err());
    }
}
