//! Unadopted JSON edit ABI. This leaf is not registered in the owned facade.
//! The JS counterpart is bounded canonical JSON, with copied snapshots.
use serde_json::Value;

pub struct JsonEditSlot {
    value: Value,
}

pub struct JsonEdit<'a> {
    root: &'a mut Value,
}

impl JsonEditSlot {
    pub fn new(value: Value) -> Self {
        Self { value }
    }

    pub fn snapshot(&self) -> Value {
        self.value.clone()
    }

    pub fn with_edit<R>(&mut self, run: impl FnOnce(&mut JsonEdit<'_>) -> R) -> R {
        with_json_edit(&mut self.value, run)
    }
}

impl JsonEdit<'_> {
    pub fn remove_if_object(&mut self, key: &str) -> Option<Value> {
        remove_if_object(self.root, key)
    }

    pub fn with_reborrow<R>(&mut self, run: impl FnOnce(&mut JsonEdit<'_>) -> R) -> R {
        with_json_edit(&mut *self.root, run)
    }
}

pub fn with_json_edit<R>(root: &mut Value, run: impl FnOnce(&mut JsonEdit<'_>) -> R) -> R {
    run(&mut JsonEdit { root })
}

/// Preserve non-object/missing-key no-op semantics; retain native partial edits.
pub fn remove_if_object(root: &mut Value, key: &str) -> Option<Value> {
    root.as_object_mut().and_then(|object| object.remove(key))
}
