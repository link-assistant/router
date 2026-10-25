//! Independent native unit, cold callback and cleanup source. Gated CI only.
fn empty() {}
fn explicit() -> () {}
fn early(flag: bool) { if flag { return; } }
#[test]
fn empty_and_early_unit_paths_complete() {
    empty();
    explicit();
    early(false);
    early(true);
}
#[tokio::test]
async fn real_unit_wait_disposal_and_factory_results_keep_their_effects() {
    use link_assistant_router::translation_async_control_core as control;
    let cancellation = control::cancel_new();
    let _ = control::cancel_set(&cancellation);
    control::cancel_wait(&cancellation).await;
    let token = control::cancel_new();
    let result = control::with_deadline(1000, &token, |_child: control::Cancellation| async move {}).await;
    assert_eq!(result, Ok(()));
    let (_sender, mut receiver) = control::channel(1).expect("native unit fixture channel");
    control::dispose(&mut receiver);
    assert_eq!(control::receive(&mut receiver, &token).await, Ok(None));
}
