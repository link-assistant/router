//! Run the existing image-preflight unit tests without compiling all 2140 units.
//! This imports the real library command boundary; it does not substitute it.
// The public adapter is covered by bounded_process_test; these fixtures call
// the private inspector with an absolute dependency path.
#[allow(dead_code)]
#[path = "../../src/deploy_image.rs"]
mod deploy_image;
mod operation_context {
    pub use link_assistant_router::operation_context::{bounded_output, command};
}
