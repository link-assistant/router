// Independent native oracle SOURCE. CI only, after every same-SHA JS gate.
fn record(trace: &mut Vec<&'static str>, label: &'static str, value: bool) -> bool {
    trace.push(label);
    value
}

#[test]
fn let_chains_preserve_binding_and_short_circuit_order() {
    let mut trace = Vec::new();
    let input = Some(7);
    let result = if record(&mut trace, "head", true)
        && let Some(value) = input
        && record(&mut trace, "predicate", value > 0)
        && let Some(other) = Some(value + 1)
    {
        other
    } else {
        0
    };
    assert_eq!(result, 8);
    assert_eq!(trace, ["head", "predicate"]);
    trace.clear();
    let missing: Option<i32> = None;
    if let Some(value) = missing && record(&mut trace, "unreachable", value > 0) {
        panic!("missing value reached the body");
    }
    assert!(trace.is_empty());
    if record(&mut trace, "stopped", false) && let Some(_) = input {
        panic!("false head reached the body");
    }
    assert_eq!(trace, ["stopped"]);
}

#[test]
fn while_let_rebinds_each_iteration_and_grouped_boolean_terms_stay_local() {
    let mut values = [Some(3), Some(2), None, Some(99)].into_iter();
    let mut visited = Vec::new();
    while let Some(next) = values.next() && let Some(value) = next && (value > 0 || value == -1) {
        visited.push(value);
    }
    assert_eq!(visited, [3, 2]);
    assert_eq!(values.next(), Some(Some(99)));
    let outer = 17;
    if let Some(outer) = Some(4) { assert_eq!(outer, 4); }
    assert_eq!(outer, 17);
}
