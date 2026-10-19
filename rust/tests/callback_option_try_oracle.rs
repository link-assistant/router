//! Independent native Rust oracles for callback-local Option propagation.
//!
//! CI-only and unrun locally. These cases specify Rust behavior; they do not
//! certify a translator's Try/FromResidual ownership or continuation lowering.

use std::cell::RefCell;
use std::rc::Rc;

fn selected(input: &[Option<u8>]) -> Option<u8> {
    input.iter().copied().find_map(|value| {
        let item = value?;
        Some(item + 1)
    })
}

fn expanded(input: &[Option<u8>]) -> Option<u8> {
    input.iter().copied().find_map(|value| {
        let item = match value {
            Some(item) => item,
            None => return None,
        };
        Some(item + 1)
    })
}

#[test]
fn local_failure_resumes_next_callback_and_outer_continues() {
    for input in [vec![], vec![None], vec![None, Some(3)], vec![Some(4), None]] {
        assert_eq!(selected(&input), expanded(&input));
    }
    assert_eq!(selected(&[None, Some(3)]).map(|x| x + 10), Some(14));

    let nested = Some(5u8).and_then(|outer| {
        let inner = [None, Some(2u8)]
            .into_iter()
            .find_map(|value| Some(value? + outer));
        Some(inner? + 1)
    });
    assert_eq!(nested, Some(8));
}

fn operand(tape: &RefCell<Vec<&'static str>>, value: Option<u8>) -> Option<u8> {
    tape.borrow_mut().push("operand");
    value
}

#[test]
fn single_evaluation_and_short_circuit() {
    let tape = RefCell::new(vec![]);
    let callback = |value| -> Option<u8> {
        tape.borrow_mut().push("before");
        let item = operand(&tape, value)?;
        tape.borrow_mut().push("after");
        Some(item)
    };

    assert_eq!(callback(None), None);
    assert_eq!(*tape.borrow(), vec!["before", "operand"]);
    tape.borrow_mut().clear();
    assert_eq!(callback(Some(9)), Some(9));
    assert_eq!(*tape.borrow(), vec!["before", "operand", "after"]);

    let selected = [None, Some(2u8), Some(0)].into_iter().find_map(|value| {
        let item = value?;
        Some(8 / item)
    });
    assert_eq!(selected, Some(4));

    let skipped = [None::<u8>].into_iter().find_map(|value| {
        let item = value?;
        Some(8 / item)
    });
    assert_eq!(skipped, None);
}

struct Note(Rc<RefCell<Vec<&'static str>>>, &'static str);

impl Drop for Note {
    fn drop(&mut self) {
        self.0.borrow_mut().push(self.1);
    }
}

#[test]
fn destructor_oracle_is_a_required_separate_domain() {
    // Arbitrary translated Drop remains a separate, unproved domain.
    let tape = Rc::new(RefCell::new(vec![]));
    let callback = |value: Option<u8>| -> Option<u8> {
        let _first = Note(tape.clone(), "first");
        let _second = Note(tape.clone(), "second");
        let item = value?;
        tape.borrow_mut().push("continued");
        Some(item)
    };

    assert_eq!(callback(None), None);
    assert_eq!(*tape.borrow(), vec!["second", "first"]);
    tape.borrow_mut().clear();
    assert_eq!(callback(Some(2)), Some(2));
    assert_eq!(*tape.borrow(), vec!["continued", "second", "first"]);
}

trait BranchSpelling {
    fn branch(self) -> bool;
}

impl BranchSpelling for Option<u8> {
    fn branch(self) -> bool {
        false
    }
}

#[test]
fn ordinary_same_named_method_is_not_the_language_item() {
    assert!(!Some(3u8).branch());
    assert_eq!(selected(&[Some(3)]), Some(4));
}

fn unrelated_outer(input: &[Option<u8>]) -> u64 {
    let found: Option<String> = input.iter().copied().find_map(|candidate| {
        let item = candidate?;
        Some(format!("item-{item}"))
    });
    match found {
        Some(text) => 100 + text.len() as u64,
        None => 200,
    }
}

fn unrelated_outer_expanded(input: &[Option<u8>]) -> u64 {
    let found: Option<String> = input.iter().copied().find_map(|candidate| {
        let item = match candidate {
            Some(item) => item,
            None => return None,
        };
        Some(format!("item-{item}"))
    });
    match found {
        Some(text) => 100 + text.len() as u64,
        None => 200,
    }
}

#[test]
fn different_input_output_payloads_preserve_an_unrelated_outer_result() {
    for (input, expected) in [
        (vec![], 200),
        (vec![None], 200),
        (vec![None, Some(7), Some(10)], 106),
        (vec![Some(10), None], 107),
    ] {
        assert_eq!(unrelated_outer(&input), expected);
        assert_eq!(unrelated_outer_expanded(&input), expected);
    }
}

fn marked_operand(
    tape: &RefCell<Vec<&'static str>>,
    mark: &'static str,
    value: Option<u8>,
) -> Option<u8> {
    tape.borrow_mut().push(mark);
    value
}

#[test]
fn sequential_propagation_preserves_branch_and_operand_order() {
    for (first, second, take_second, expected, expected_tape) in [
        (None, Some(9), true, None, vec!["first"]),
        (Some(4), None, true, None, vec!["first", "second"]),
        (
            Some(4),
            Some(9),
            true,
            Some(13u16),
            vec!["first", "second", "result"],
        ),
        (
            Some(4),
            None,
            false,
            Some(5u16),
            vec!["first", "else", "result"],
        ),
    ] {
        let tape = RefCell::new(vec![]);
        let callback = || -> Option<u16> {
            let left = marked_operand(&tape, "first", first)?;
            let right = if take_second {
                marked_operand(&tape, "second", second)?
            } else {
                tape.borrow_mut().push("else");
                1
            };
            tape.borrow_mut().push("result");
            Some(u16::from(left) + u16::from(right))
        };
        assert_eq!(callback(), expected);
        assert_eq!(*tape.borrow(), expected_tape);
        tape.borrow_mut().clear();

        let expanded = || -> Option<u16> {
            let left = match marked_operand(&tape, "first", first) {
                Some(item) => item,
                None => return None,
            };
            let right = if take_second {
                match marked_operand(&tape, "second", second) {
                    Some(item) => item,
                    None => return None,
                }
            } else {
                tape.borrow_mut().push("else");
                1
            };
            tape.borrow_mut().push("result");
            Some(u16::from(left) + u16::from(right))
        };
        assert_eq!(expanded(), expected);
        assert_eq!(*tape.borrow(), expected_tape);
    }
}

fn marked_note(tape: &Rc<RefCell<Vec<&'static str>>>) -> Note {
    tape.borrow_mut().push("argument-created");
    Note(tape.clone(), "argument-dropped")
}

fn consume_note(_note: Note, value: u8, tape: &RefCell<Vec<&'static str>>) -> Option<u8> {
    tape.borrow_mut().push("called");
    Some(value)
}

#[test]
fn already_evaluated_argument_is_dropped_before_callback_local_on_propagation() {
    // The first argument exists before `?` in the second argument. On None,
    // the call is skipped and that temporary is dropped before the local.
    // This is native refusal-domain evidence, not translated Drop support.
    for (value, expected, expected_tape) in [
        (
            None,
            None,
            vec!["argument-created", "operand", "argument-dropped", "local"],
        ),
        (
            Some(8u8),
            Some(8u8),
            vec![
                "argument-created",
                "operand",
                "called",
                "argument-dropped",
                "local",
            ],
        ),
    ] {
        let tape = Rc::new(RefCell::new(vec![]));
        let callback = || -> Option<u8> {
            let _local = Note(tape.clone(), "local");
            consume_note(marked_note(&tape), operand(&tape, value)?, &tape)
        };
        assert_eq!(callback(), expected);
        assert_eq!(*tape.borrow(), expected_tape);
    }
}
