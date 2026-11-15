//! Path oracle for the drafted `translation_primitive_results_core` (issue #772).
//!
//! Every accessor and combinator is driven through both its success and its
//! error arm, and every panicking accessor through the arm that panics, so the
//! generated core is exercised as a whole rather than by sampled call sites.
use link_assistant_router::translation_primitive_results_core as r;

fn e() -> String {
    "bad".to_owned()
}

fn panics<T>(call: impl FnOnce() -> T + std::panic::UnwindSafe) -> bool {
    std::panic::catch_unwind(call).is_err()
}

#[test]
fn bool_accessors_cover_both_arms() {
    let ok = || r::bool_ok(true);
    let bad = || r::bool_err("bad");
    let got = r::bool_is_ok(ok());
    assert!(got);
    let got = r::bool_is_ok(bad());
    assert!(!got);
    let got = r::bool_is_err(ok());
    assert!(!got);
    let got = r::bool_is_err(bad());
    assert!(got);
    let got = r::bool_unwrap_or(ok(), false);
    assert!(got);
    let got = r::bool_unwrap_or(bad(), false);
    assert!(!got);
    let got = r::bool_unwrap(ok());
    assert!(got);
    assert!(panics(|| r::bool_unwrap(bad())));
    let got = r::bool_expect(ok(), "why");
    assert!(got);
    assert!(panics(|| r::bool_expect(bad(), "why")));
    let got = r::bool_ok_option(ok());
    assert_eq!(got, Some(true));
    let got = r::bool_ok_option(bad());
    assert!(got.is_none());
    let got = r::bool_err_option(ok());
    assert!(got.is_none());
    let got = r::bool_err_option(bad());
    assert_eq!(got, Some(e()));
    let got = r::bool_unwrap_err(bad());
    assert_eq!(got, e());
    assert!(panics(|| r::bool_unwrap_err(ok())));
    let got = r::bool_expect_err(bad(), "why");
    assert_eq!(got, e());
    assert!(panics(|| r::bool_expect_err(ok(), "why")));
}

#[test]
fn bool_maps_cover_both_arms() {
    let ok = || r::bool_ok(true);
    let bad = || r::bool_err("bad");
    let got = r::bool_to_bool_map(ok(), |_| true);
    assert_eq!(got, Ok(true));
    let got = r::bool_to_bool_map(bad(), |_| true);
    assert_eq!(got, Err(e()));
    let got = r::bool_to_bool_and_then(ok(), |_| Ok(true));
    assert_eq!(got, Ok(true));
    let got = r::bool_to_bool_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::bool_to_bool_and_then(bad(), |_| Ok(true));
    assert_eq!(got, Err(e()));
    let got = r::bool_to_u64_map(ok(), |_| 3);
    assert_eq!(got, Ok(3));
    let got = r::bool_to_u64_map(bad(), |_| 3);
    assert_eq!(got, Err(e()));
    let got = r::bool_to_u64_and_then(ok(), |_| Ok(3));
    assert_eq!(got, Ok(3));
    let got = r::bool_to_u64_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::bool_to_u64_and_then(bad(), |_| Ok(3));
    assert_eq!(got, Err(e()));
    let got = r::bool_to_i64_map(ok(), |_| -3);
    assert_eq!(got, Ok(-3));
    let got = r::bool_to_i64_map(bad(), |_| -3);
    assert_eq!(got, Err(e()));
    let got = r::bool_to_i64_and_then(ok(), |_| Ok(-3));
    assert_eq!(got, Ok(-3));
    let got = r::bool_to_i64_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::bool_to_i64_and_then(bad(), |_| Ok(-3));
    assert_eq!(got, Err(e()));
    let got = r::bool_to_str_map(ok(), |_| "out");
    assert_eq!(got, Ok("out"));
    let got = r::bool_to_str_map(bad(), |_| "out");
    assert_eq!(got, Err(e()));
    let got = r::bool_to_str_and_then(ok(), |_| Ok("out"));
    assert_eq!(got, Ok("out"));
    let got = r::bool_to_str_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::bool_to_str_and_then(bad(), |_| Ok("out"));
    assert_eq!(got, Err(e()));
}

#[test]
fn bool_recovery_covers_both_arms() {
    let ok = || r::bool_ok(true);
    let bad = || r::bool_err("bad");
    let got = r::bool_map_err(ok(), |error| error + "!");
    assert_eq!(got, Ok(true));
    let got = r::bool_map_err(bad(), |error| error + "!");
    assert_eq!(got, Err(e() + "!"));
    let got = r::bool_unwrap_or_else(ok(), |_| false);
    assert!(got);
    let got = r::bool_unwrap_or_else(bad(), |_| false);
    assert!(!got);
    let got = r::bool_or_else(ok(), |_| Err(e()));
    assert_eq!(got, Ok(true));
    let got = r::bool_or_else(bad(), |_| Ok(false));
    assert_eq!(got, Ok(false));
    let got = r::bool_or_else(bad(), |error| Err(error + "!"));
    assert_eq!(got, Err(e() + "!"));
}

#[test]
fn u64_accessors_cover_both_arms() {
    let ok = || r::u64_ok(7);
    let bad = || r::u64_err("bad");
    let got = r::u64_is_ok(ok());
    assert!(got);
    let got = r::u64_is_ok(bad());
    assert!(!got);
    let got = r::u64_is_err(ok());
    assert!(!got);
    let got = r::u64_is_err(bad());
    assert!(got);
    let got = r::u64_unwrap_or(ok(), 8);
    assert_eq!(got, 7);
    let got = r::u64_unwrap_or(bad(), 8);
    assert_eq!(got, 8);
    let got = r::u64_unwrap(ok());
    assert_eq!(got, 7);
    assert!(panics(|| r::u64_unwrap(bad())));
    let got = r::u64_expect(ok(), "why");
    assert_eq!(got, 7);
    assert!(panics(|| r::u64_expect(bad(), "why")));
    let got = r::u64_ok_option(ok());
    assert_eq!(got, Some(7));
    let got = r::u64_ok_option(bad());
    assert!(got.is_none());
    let got = r::u64_err_option(ok());
    assert!(got.is_none());
    let got = r::u64_err_option(bad());
    assert_eq!(got, Some(e()));
    let got = r::u64_unwrap_err(bad());
    assert_eq!(got, e());
    assert!(panics(|| r::u64_unwrap_err(ok())));
    let got = r::u64_expect_err(bad(), "why");
    assert_eq!(got, e());
    assert!(panics(|| r::u64_expect_err(ok(), "why")));
}

#[test]
fn u64_maps_cover_both_arms() {
    let ok = || r::u64_ok(7);
    let bad = || r::u64_err("bad");
    let got = r::u64_to_bool_map(ok(), |_| true);
    assert_eq!(got, Ok(true));
    let got = r::u64_to_bool_map(bad(), |_| true);
    assert_eq!(got, Err(e()));
    let got = r::u64_to_bool_and_then(ok(), |_| Ok(true));
    assert_eq!(got, Ok(true));
    let got = r::u64_to_bool_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::u64_to_bool_and_then(bad(), |_| Ok(true));
    assert_eq!(got, Err(e()));
    let got = r::u64_to_u64_map(ok(), |_| 3);
    assert_eq!(got, Ok(3));
    let got = r::u64_to_u64_map(bad(), |_| 3);
    assert_eq!(got, Err(e()));
    let got = r::u64_to_u64_and_then(ok(), |_| Ok(3));
    assert_eq!(got, Ok(3));
    let got = r::u64_to_u64_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::u64_to_u64_and_then(bad(), |_| Ok(3));
    assert_eq!(got, Err(e()));
    let got = r::u64_to_i64_map(ok(), |_| -3);
    assert_eq!(got, Ok(-3));
    let got = r::u64_to_i64_map(bad(), |_| -3);
    assert_eq!(got, Err(e()));
    let got = r::u64_to_i64_and_then(ok(), |_| Ok(-3));
    assert_eq!(got, Ok(-3));
    let got = r::u64_to_i64_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::u64_to_i64_and_then(bad(), |_| Ok(-3));
    assert_eq!(got, Err(e()));
    let got = r::u64_to_str_map(ok(), |_| "out");
    assert_eq!(got, Ok("out"));
    let got = r::u64_to_str_map(bad(), |_| "out");
    assert_eq!(got, Err(e()));
    let got = r::u64_to_str_and_then(ok(), |_| Ok("out"));
    assert_eq!(got, Ok("out"));
    let got = r::u64_to_str_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::u64_to_str_and_then(bad(), |_| Ok("out"));
    assert_eq!(got, Err(e()));
}

#[test]
fn u64_recovery_covers_both_arms() {
    let ok = || r::u64_ok(7);
    let bad = || r::u64_err("bad");
    let got = r::u64_map_err(ok(), |error| error + "!");
    assert_eq!(got, Ok(7));
    let got = r::u64_map_err(bad(), |error| error + "!");
    assert_eq!(got, Err(e() + "!"));
    let got = r::u64_unwrap_or_else(ok(), |_| 8);
    assert_eq!(got, 7);
    let got = r::u64_unwrap_or_else(bad(), |_| 8);
    assert_eq!(got, 8);
    let got = r::u64_or_else(ok(), |_| Err(e()));
    assert_eq!(got, Ok(7));
    let got = r::u64_or_else(bad(), |_| Ok(8));
    assert_eq!(got, Ok(8));
    let got = r::u64_or_else(bad(), |error| Err(error + "!"));
    assert_eq!(got, Err(e() + "!"));
}

#[test]
fn i64_accessors_cover_both_arms() {
    let ok = || r::i64_ok(-7);
    let bad = || r::i64_err("bad");
    let got = r::i64_is_ok(ok());
    assert!(got);
    let got = r::i64_is_ok(bad());
    assert!(!got);
    let got = r::i64_is_err(ok());
    assert!(!got);
    let got = r::i64_is_err(bad());
    assert!(got);
    let got = r::i64_unwrap_or(ok(), 8);
    assert_eq!(got, -7);
    let got = r::i64_unwrap_or(bad(), 8);
    assert_eq!(got, 8);
    let got = r::i64_unwrap(ok());
    assert_eq!(got, -7);
    assert!(panics(|| r::i64_unwrap(bad())));
    let got = r::i64_expect(ok(), "why");
    assert_eq!(got, -7);
    assert!(panics(|| r::i64_expect(bad(), "why")));
    let got = r::i64_ok_option(ok());
    assert_eq!(got, Some(-7));
    let got = r::i64_ok_option(bad());
    assert!(got.is_none());
    let got = r::i64_err_option(ok());
    assert!(got.is_none());
    let got = r::i64_err_option(bad());
    assert_eq!(got, Some(e()));
    let got = r::i64_unwrap_err(bad());
    assert_eq!(got, e());
    assert!(panics(|| r::i64_unwrap_err(ok())));
    let got = r::i64_expect_err(bad(), "why");
    assert_eq!(got, e());
    assert!(panics(|| r::i64_expect_err(ok(), "why")));
}

#[test]
fn i64_maps_cover_both_arms() {
    let ok = || r::i64_ok(-7);
    let bad = || r::i64_err("bad");
    let got = r::i64_to_bool_map(ok(), |_| true);
    assert_eq!(got, Ok(true));
    let got = r::i64_to_bool_map(bad(), |_| true);
    assert_eq!(got, Err(e()));
    let got = r::i64_to_bool_and_then(ok(), |_| Ok(true));
    assert_eq!(got, Ok(true));
    let got = r::i64_to_bool_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::i64_to_bool_and_then(bad(), |_| Ok(true));
    assert_eq!(got, Err(e()));
    let got = r::i64_to_u64_map(ok(), |_| 3);
    assert_eq!(got, Ok(3));
    let got = r::i64_to_u64_map(bad(), |_| 3);
    assert_eq!(got, Err(e()));
    let got = r::i64_to_u64_and_then(ok(), |_| Ok(3));
    assert_eq!(got, Ok(3));
    let got = r::i64_to_u64_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::i64_to_u64_and_then(bad(), |_| Ok(3));
    assert_eq!(got, Err(e()));
    let got = r::i64_to_i64_map(ok(), |_| -3);
    assert_eq!(got, Ok(-3));
    let got = r::i64_to_i64_map(bad(), |_| -3);
    assert_eq!(got, Err(e()));
    let got = r::i64_to_i64_and_then(ok(), |_| Ok(-3));
    assert_eq!(got, Ok(-3));
    let got = r::i64_to_i64_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::i64_to_i64_and_then(bad(), |_| Ok(-3));
    assert_eq!(got, Err(e()));
    let got = r::i64_to_str_map(ok(), |_| "out");
    assert_eq!(got, Ok("out"));
    let got = r::i64_to_str_map(bad(), |_| "out");
    assert_eq!(got, Err(e()));
    let got = r::i64_to_str_and_then(ok(), |_| Ok("out"));
    assert_eq!(got, Ok("out"));
    let got = r::i64_to_str_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::i64_to_str_and_then(bad(), |_| Ok("out"));
    assert_eq!(got, Err(e()));
}

#[test]
fn i64_recovery_covers_both_arms() {
    let ok = || r::i64_ok(-7);
    let bad = || r::i64_err("bad");
    let got = r::i64_map_err(ok(), |error| error + "!");
    assert_eq!(got, Ok(-7));
    let got = r::i64_map_err(bad(), |error| error + "!");
    assert_eq!(got, Err(e() + "!"));
    let got = r::i64_unwrap_or_else(ok(), |_| 8);
    assert_eq!(got, -7);
    let got = r::i64_unwrap_or_else(bad(), |_| 8);
    assert_eq!(got, 8);
    let got = r::i64_or_else(ok(), |_| Err(e()));
    assert_eq!(got, Ok(-7));
    let got = r::i64_or_else(bad(), |_| Ok(8));
    assert_eq!(got, Ok(8));
    let got = r::i64_or_else(bad(), |error| Err(error + "!"));
    assert_eq!(got, Err(e() + "!"));
}

#[test]
fn str_accessors_cover_both_arms() {
    let ok = || r::str_ok("é");
    let bad = || r::str_err("bad");
    let got = r::str_is_ok(ok());
    assert!(got);
    let got = r::str_is_ok(bad());
    assert!(!got);
    let got = r::str_is_err(ok());
    assert!(!got);
    let got = r::str_is_err(bad());
    assert!(got);
    let got = r::str_unwrap_or(ok(), "out");
    assert_eq!(got, "é");
    let got = r::str_unwrap_or(bad(), "out");
    assert_eq!(got, "out");
    let got = r::str_unwrap(ok());
    assert_eq!(got, "é");
    assert!(panics(|| r::str_unwrap(bad())));
    let got = r::str_expect(ok(), "why");
    assert_eq!(got, "é");
    assert!(panics(|| r::str_expect(bad(), "why")));
    let got = r::str_ok_option(ok());
    assert_eq!(got, Some("é"));
    let got = r::str_ok_option(bad());
    assert!(got.is_none());
    let got = r::str_err_option(ok());
    assert!(got.is_none());
    let got = r::str_err_option(bad());
    assert_eq!(got, Some(e()));
    let got = r::str_unwrap_err(bad());
    assert_eq!(got, e());
    assert!(panics(|| r::str_unwrap_err(ok())));
    let got = r::str_expect_err(bad(), "why");
    assert_eq!(got, e());
    assert!(panics(|| r::str_expect_err(ok(), "why")));
}

#[test]
fn str_maps_cover_both_arms() {
    let ok = || r::str_ok("é");
    let bad = || r::str_err("bad");
    let got = r::str_to_bool_map(ok(), |_| true);
    assert_eq!(got, Ok(true));
    let got = r::str_to_bool_map(bad(), |_| true);
    assert_eq!(got, Err(e()));
    let got = r::str_to_bool_and_then(ok(), |_| Ok(true));
    assert_eq!(got, Ok(true));
    let got = r::str_to_bool_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::str_to_bool_and_then(bad(), |_| Ok(true));
    assert_eq!(got, Err(e()));
    let got = r::str_to_u64_map(ok(), |_| 3);
    assert_eq!(got, Ok(3));
    let got = r::str_to_u64_map(bad(), |_| 3);
    assert_eq!(got, Err(e()));
    let got = r::str_to_u64_and_then(ok(), |_| Ok(3));
    assert_eq!(got, Ok(3));
    let got = r::str_to_u64_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::str_to_u64_and_then(bad(), |_| Ok(3));
    assert_eq!(got, Err(e()));
    let got = r::str_to_i64_map(ok(), |_| -3);
    assert_eq!(got, Ok(-3));
    let got = r::str_to_i64_map(bad(), |_| -3);
    assert_eq!(got, Err(e()));
    let got = r::str_to_i64_and_then(ok(), |_| Ok(-3));
    assert_eq!(got, Ok(-3));
    let got = r::str_to_i64_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::str_to_i64_and_then(bad(), |_| Ok(-3));
    assert_eq!(got, Err(e()));
    let got = r::str_to_str_map(ok(), |_| "out");
    assert_eq!(got, Ok("out"));
    let got = r::str_to_str_map(bad(), |_| "out");
    assert_eq!(got, Err(e()));
    let got = r::str_to_str_and_then(ok(), |_| Ok("out"));
    assert_eq!(got, Ok("out"));
    let got = r::str_to_str_and_then(ok(), |_| Err(e()));
    assert_eq!(got, Err(e()));
    let got = r::str_to_str_and_then(bad(), |_| Ok("out"));
    assert_eq!(got, Err(e()));
}

#[test]
fn str_recovery_covers_both_arms() {
    let ok = || r::str_ok("é");
    let bad = || r::str_err("bad");
    let got = r::str_map_err(ok(), |error| error + "!");
    assert_eq!(got, Ok("é"));
    let got = r::str_map_err(bad(), |error| error + "!");
    assert_eq!(got, Err(e() + "!"));
    let got = r::str_unwrap_or_else(ok(), |_| "out");
    assert_eq!(got, "é");
    let got = r::str_unwrap_or_else(bad(), |_| "out");
    assert_eq!(got, "out");
    let got = r::str_or_else(ok(), |_| Err(e()));
    assert_eq!(got, Ok("é"));
    let got = r::str_or_else(bad(), |_| Ok("out"));
    assert_eq!(got, Ok("out"));
    let got = r::str_or_else(bad(), |error| Err(error + "!"));
    assert_eq!(got, Err(e() + "!"));
}
