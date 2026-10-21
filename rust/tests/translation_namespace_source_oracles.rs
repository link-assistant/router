//! Independent source oracles, executed by Cargo only in gated CI.
//! No local Rust compilation or execution qualified this source.

mod literal_include {
    // Keep the fixture's own physical callsites: oracle -> parent -> child.
    include!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../tools/translation/test/fixtures/literal-include-type/oracle.rs"
    ));
}

mod conditions {
    include!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../tools/translation/test/fixtures/namespace-condition/oracle.rs"
    ));

    #[test]
    fn original_condition_fixture_preserves_short_circuit_and_while_let() {
        main();
    }

    #[test]
    fn every_boolean_and_option_boundary_preserves_evaluation_order() {
        for first in [false, true] {
            for value in [None, Some(0), Some(1), Some(u8::MAX)] {
                for last in [false, true] {
                    let expected_result = first && value.is_some_and(|v| v > 0) && last;
                    let expected_trace = if !first {
                        vec!["first"]
                    } else if value.is_none() {
                        vec!["first", "next"]
                    } else {
                        vec!["first", "next", "last"]
                    };
                    assert_eq!(
                        condition(first, value, last),
                        (expected_result, expected_trace)
                    );
                }
            }
        }
    }

    #[test]
    fn while_let_observes_reverse_order_and_does_not_enter_for_empty_input() {
        for input in [vec![], vec![0], vec![0, 1, u8::MAX]] {
            let expected: Vec<_> = input.iter().rev().copied().collect();
            let mut remaining = input;
            let mut observed = Vec::new();
            while let Some(value) = remaining.pop() {
                observed.push(value);
            }
            assert_eq!(observed, expected);
            assert!(remaining.is_empty());
        }
    }
}
