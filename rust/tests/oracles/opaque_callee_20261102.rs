// CI-only independent changed-callee value/error/evaluation-order oracles.
#[test]
fn helper_replacement_preserves_the_new_explicit_boundary_outcomes() {
    fn first(value: u8) -> Option<u8> { value.checked_add(1) }
    fn second(value: u8) -> Option<u8> { value.checked_sub(1) }
    fn original(value: u8) -> Option<u8> { first(value) }
    fn edited(value: u8) -> Option<u8> { second(value) }
    for (value, before, after) in [
        (0, Some(1), None), (1, Some(2), Some(0)),
        (254, Some(255), Some(253)), (255, None, Some(254)),
    ] {
        assert_eq!(original(value), before);
        assert_eq!(edited(value), after);
    }
}
#[test]
fn repeated_helper_edits_keep_argument_and_callee_effect_order() {
    fn argument(log: &mut Vec<&'static str>, value: u8) -> u8 {
        log.push("argument"); value
    }
    fn first(log: &mut Vec<&'static str>, value: u8) -> u8 {
        log.push("first"); value
    }
    fn second(log: &mut Vec<&'static str>, value: u8) -> u8 {
        log.push("second"); value
    }
    fn original(log: &mut Vec<&'static str>) -> (u8, u8) {
        let left = argument(log, 1); let left = first(log, left);
        let right = argument(log, 2); let right = first(log, right);
        (left, right)
    }
    fn edited(log: &mut Vec<&'static str>) -> (u8, u8) {
        let left = argument(log, 1); let left = second(log, left);
        let right = argument(log, 2); let right = second(log, right);
        (left, right)
    }
    let mut before = Vec::new(); let mut after = Vec::new();
    assert_eq!(original(&mut before), (1, 2));
    assert_eq!(edited(&mut after), (1, 2));
    assert_eq!(before, vec!["argument", "first", "argument", "first"]);
    assert_eq!(after, vec!["argument", "second", "argument", "second"]);
}
