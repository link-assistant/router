// Independent native source; execution requires every same-SHA JavaScript stage.
use link_assistant_router::translation_async_control_core::ControlError;

fn nested(value: Result<Option<i64>, ControlError>) -> Result<Option<i64>, ControlError> {
    value
}

#[test]
fn nested_control_optional_values_preserve_native_boundaries_and_other_constructors() {
    for value in [i64::MIN, -1, 0, i64::MAX] {
        assert_eq!(nested(Ok(Some(value))), Ok(Some(value)));
    }
    assert_eq!(nested(Ok(None)), Ok(None));
    assert_eq!(nested(Err(ControlError::Cancelled)), Err(ControlError::Cancelled));
}
