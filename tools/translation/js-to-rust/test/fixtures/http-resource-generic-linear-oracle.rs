// Independent native source; execution belongs only to JavaScript-gated Rust CI.
use std::{cell::Cell, rc::Rc};

fn identity<T>(value: T) -> T {
    value
}

fn forward<T>(value: T) -> T {
    let first = identity(value);
    let second = first;
    identity(second)
}

struct Tracked(Rc<Cell<u32>>);

impl Drop for Tracked {
    fn drop(&mut self) {
        self.0.set(self.0.get() + 1);
    }
}

#[test]
fn generic_aliases_forward_one_owner_without_an_intermediate_drop() {
    let drops = Rc::new(Cell::new(0));
    let original = Tracked(Rc::clone(&drops));
    let returned = forward(original);
    assert_eq!(drops.get(), 0);
    drop(returned);
    assert_eq!(drops.get(), 1);
}

#[test]
fn generic_forwarding_keeps_shared_borrow_origins() {
    let original = String::from("é😀");
    let returned = forward(original.as_str());
    assert_eq!(returned, "é😀");
    assert_eq!(original, "é😀");
}
