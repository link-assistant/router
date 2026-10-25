//! Explicit by-value deadline error adaptation. Library internals stay native.
use crate::{translation_async_control_core::ControlError,
    translation_http_transport_core::Stream, translation_core::Json};

fn flattened<T>(value: Result<Result<T, String>, ControlError>) -> Result<T, String> {
    match value {
        Ok(result) => result,
        Err(error) => Err(match error {
            ControlError::Cancelled => "HTTP operation cancelled",
            ControlError::Timeout => "HTTP operation timed out",
            ControlError::Closed => "HTTP operation channel closed",
            ControlError::Resource => "HTTP operation resource limit",
            ControlError::InvalidInput => "HTTP operation invalid input",
        }.to_owned()),
    }
}

pub fn flatten_open(value: Result<Result<Stream, String>, ControlError>) -> Result<Stream, String> {
    flattened(value)
}
pub fn flatten_read(value: Result<Result<Option<String>, String>, ControlError>) -> Result<Option<String>, String> {
    flattened(value)
}
pub fn flatten_send(value: Result<Result<Json, String>, ControlError>) -> Result<Json, String> {
    flattened(value)
}
