//! Independent Option guard/fallback oracle SOURCE. JavaScript-gated CI only.
use link_assistant_router::{translation_text_core as text,
    translation_owned_results_core as result, translation_http_transport_core as transport};

fn stripped(input: &str) -> Option<&str> {
    let found = text::strip_prefix(input,"x")?;
    Some(found)
}
fn searched(input: &str) -> Result<u64,String> {
    let found = match text::find(input,"é") {
        Some(found) => found,
        None => return result::u64_err("absent"),
    };
    result::u64_ok(found)
}

#[test]
fn source_absence_fallback_and_success_payloads_preserve_unicode_byte_offsets() {
    assert_eq!(stripped("xé"),Some("é"));
    assert_eq!(stripped("é"),None);
    assert_eq!(searched("aé😀"),Ok(1));
    assert_eq!(searched("none"),Err("absent".to_owned()));
    for _ in 0..40 {
        let mut client = transport::client_new(0,0,0,"").unwrap();
        let absent: Option<u64> = None;
        let returned = match absent {
            Some(value) => result::u64_ok(value),
            None => {transport::client_dispose(&mut client); result::u64_err("absent")},
        };
        assert_eq!(returned,Err("absent".to_owned()));
    }
}
