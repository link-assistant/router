//! Independent qualified block native oracle SOURCE. CI only; UNRUN.
use std::cell::Cell;
use std::future::Future;
use std::rc::Rc;
use std::task::{Context, Poll, Waker};

#[test]
fn const_item_and_const_expression_keep_their_distinct_values_and_local_types() {
    const COUNT: usize = 2;
    let bytes: [u8; const { 3 }] = const { [1, 2, 3] };
    let width = const {
        struct Local(u16);
        let value = Local(7);
        value.0
    };
    assert_eq!(COUNT, 2);
    assert_eq!(bytes, [1, 2, 3]);
    assert_eq!(width, 7);
}

#[test]
fn async_move_block_defers_effects_until_poll_and_keeps_captured_storage_alive() {
    let visits = Rc::new(Cell::new(0));
    let observed = Rc::clone(&visits);
    let mut future = Box::pin(async move {
        observed.set(observed.get() + 1);
        7_u64
    });
    assert_eq!(visits.get(), 0);
    let waker = Waker::noop();
    let mut context = Context::from_waker(waker);
    assert_eq!(Future::poll(future.as_mut(), &mut context), Poll::Ready(7));
    assert_eq!(visits.get(), 1);
}
