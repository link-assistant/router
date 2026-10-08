//! Compile the actual sink and its unit tests without the monolithic libtest.
pub use link_assistant_router::login_url;

#[path = "../../src/logging/redaction.rs"]
pub(crate) mod redaction;
mod logging {
    pub(crate) use crate::redaction;
}
#[path = "../../src/operational_log.rs"]
mod operational_log;
