//! Explicit cancellation and bounded pull-channel interfaces; internals stay native.
use base64::{Engine as _, engine::general_purpose::STANDARD};
use std::{future::Future, sync::{Arc, atomic::{AtomicBool, AtomicUsize, Ordering}}, time::Duration};
use tokio::sync::{Notify, OwnedSemaphorePermit, Semaphore, mpsc};

pub const MAX_BYTES: usize = 1_048_576;
pub const MAX_CAPACITY: u64 = 32;
pub const MAX_DELAY_MS: u64 = 86_400_000;
const MAX_PENDING: usize = 32;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ControlError { Cancelled, Timeout, Closed, Resource, InvalidInput }
struct CancellationState { set: AtomicBool, notify: Notify }
#[derive(Clone)]
pub struct Cancellation(Arc<CancellationState>);

#[must_use]
pub fn cancel_new() -> Cancellation {
    Cancellation(Arc::new(CancellationState { set: AtomicBool::new(false), notify: Notify::new() }))
}
#[must_use]
pub fn cancel_clone(value: &Cancellation) -> Cancellation { value.clone() }
#[must_use]
pub fn cancel_set(value: &Cancellation) -> bool {
    let changed = !value.0.set.swap(true, Ordering::AcqRel);
    if changed { value.0.notify.notify_waiters(); }
    changed
}
#[must_use]
pub fn cancel_is_set(value: &Cancellation) -> bool { value.0.set.load(Ordering::Acquire) }
pub async fn cancel_wait(value: &Cancellation) {
    loop {
        let notified = value.0.notify.notified();
        tokio::pin!(notified);
        let _ = notified.as_mut().enable();
        if cancel_is_set(value) { return; }
        notified.await;
    }
}
pub async fn sleep(milliseconds: u64, cancellation: &Cancellation) -> Result<(), ControlError> {
    if milliseconds > MAX_DELAY_MS { return Err(ControlError::InvalidInput); }
    if cancel_is_set(cancellation) { return Err(ControlError::Cancelled); }
    tokio::select! { biased;
        () = cancel_wait(cancellation) => Err(ControlError::Cancelled),
        () = tokio::time::sleep(Duration::from_millis(milliseconds)) => Ok(()),
    }
}
struct CancelOnDrop(Cancellation);
impl Drop for CancelOnDrop { fn drop(&mut self) { let _ = cancel_set(&self.0); } }
pub async fn with_deadline<T, F, Make>(milliseconds: u64, cancellation: &Cancellation, operation: Make) -> Result<T, ControlError>
where F: Future<Output = T>, Make: FnOnce(Cancellation) -> F {
    if milliseconds > MAX_DELAY_MS { return Err(ControlError::InvalidInput); }
    if cancel_is_set(cancellation) { return Err(ControlError::Cancelled); }
    if milliseconds == 0 { return Err(ControlError::Timeout); }
    let child = cancel_new();
    let _guard = CancelOnDrop(child.clone());
    tokio::select! { biased;
        () = cancel_wait(cancellation) => Err(ControlError::Cancelled),
        () = tokio::time::sleep(Duration::from_millis(milliseconds)) => Err(ControlError::Timeout),
        output = operation(child) => Ok(output),
    }
}

struct Chunk { encoded: String, _bytes: OwnedSemaphorePermit }
struct Shared { bytes: Arc<Semaphore>, pending: AtomicUsize }
#[derive(Clone)]
pub struct Sender { inner: mpsc::Sender<Chunk>, shared: Arc<Shared> }
pub struct Receiver { inner: mpsc::Receiver<Chunk>, _keepalive: mpsc::Sender<Chunk>, disposed: bool }
struct Pending(Arc<Shared>);
impl Drop for Pending { fn drop(&mut self) { self.0.pending.fetch_sub(1, Ordering::AcqRel); } }

pub fn channel(capacity: u64) -> Result<(Sender, Receiver), ControlError> {
    if !(1..=MAX_CAPACITY).contains(&capacity) { return Err(ControlError::InvalidInput); }
    let (tx, rx) = mpsc::channel(usize::try_from(capacity).map_err(|_| ControlError::InvalidInput)?);
    let shared = Arc::new(Shared { bytes: Arc::new(Semaphore::new(MAX_BYTES)), pending: AtomicUsize::new(0) });
    Ok((Sender { inner: tx.clone(), shared }, Receiver { inner: rx, _keepalive: tx, disposed: false }))
}
#[must_use]
pub fn sender_clone(value: &Sender) -> Sender { value.clone() }
pub async fn send(value: &Sender, encoded: &str, cancellation: &Cancellation) -> Result<(), ControlError> {
    if cancel_is_set(cancellation) { return Err(ControlError::Cancelled); }
    if encoded.len() > 1_398_104 { return Err(ControlError::Resource); }
    let decoded = STANDARD.decode(encoded).map_err(|_| ControlError::InvalidInput)?;
    if decoded.len() > MAX_BYTES { return Err(ControlError::Resource); }
    if STANDARD.encode(&decoded) != encoded { return Err(ControlError::InvalidInput); }
    let count = u32::try_from(decoded.len()).map_err(|_| ControlError::Resource)?;
    drop(decoded);
    if value.shared.pending.fetch_add(1, Ordering::AcqRel) >= MAX_PENDING {
        value.shared.pending.fetch_sub(1, Ordering::AcqRel);
        return Err(ControlError::Resource);
    }
    let _pending = Pending(value.shared.clone());
    let bytes = tokio::select! { biased;
        () = cancel_wait(cancellation) => return Err(ControlError::Cancelled),
        () = value.inner.closed() => return Err(ControlError::Closed),
        result = value.shared.bytes.clone().acquire_many_owned(count) => result.map_err(|_| ControlError::Closed)?,
    };
    let permit = tokio::select! { biased;
        () = cancel_wait(cancellation) => return Err(ControlError::Cancelled),
        result = value.inner.reserve() => result.map_err(|_| ControlError::Closed)?,
    };
    if cancel_is_set(cancellation) { return Err(ControlError::Cancelled); }
    if value.inner.is_closed() { return Err(ControlError::Closed); }
    permit.send(Chunk { encoded: encoded.to_owned(), _bytes: bytes });
    Ok(())
}
pub async fn receive(value: &mut Receiver, cancellation: &Cancellation) -> Result<Option<String>, ControlError> {
    if cancel_is_set(cancellation) { return Err(ControlError::Cancelled); }
    if value.disposed { return Ok(None); }
    tokio::select! { biased;
        () = cancel_wait(cancellation) => Err(ControlError::Cancelled),
        chunk = value.inner.recv() => Ok(chunk.map(|chunk| chunk.encoded)),
    }
}
pub fn close(value: &mut Receiver) { value.inner.close(); }
pub fn dispose(value: &mut Receiver) {
    value.inner.close();
    value.disposed = true;
    while value.inner.try_recv().is_ok() {}
}
