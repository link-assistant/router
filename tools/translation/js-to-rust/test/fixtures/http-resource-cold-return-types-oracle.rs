// Independent native future oracle SOURCE. Gated CI only; never run locally.
use std::future::Future;
use std::pin::pin;
use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
use std::task::{Context, Poll, Wake, Waker};

struct Noop;
impl Wake for Noop { fn wake(self: Arc<Self>) {} }

async fn selected<T>(calls: Arc<AtomicUsize>, value: T) -> T {
    calls.fetch_add(1, Ordering::SeqCst);
    value
}

#[test]
fn creating_and_dropping_a_future_do_not_execute_its_value_body() {
    let calls = Arc::new(AtomicUsize::new(0));
    let pending = selected(calls.clone(), "é😀".to_string());
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    let mut pending = pin!(pending);
    let waker = Waker::from(Arc::new(Noop));
    let mut context = Context::from_waker(&waker);
    assert_eq!(pending.as_mut().poll(&mut context), Poll::Ready("é😀".to_string()));
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    let unpolled = selected(calls.clone(), false);
    drop(unpolled);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}
