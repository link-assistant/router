//! Project native model metadata without inventing provider capability facts.
use serde_json::Value;

pub(super) fn native_model_document(
    model: &str,
    raw: Option<&serde_json::Map<String, Value>>,
) -> Value {
    let mut projected =
        serde_json::Map::from_iter([("name".into(), Value::String(model.to_string()))]);
    if let Some(raw) = raw {
        for key in [
            "baseModelId",
            "version",
            "displayName",
            "description",
            "inputTokenLimit",
            "outputTokenLimit",
            "supportedGenerationMethods",
            "temperature",
            "maxTemperature",
            "topP",
            "topK",
        ] {
            if let Some(value) = raw.get(key) {
                projected.insert(key.into(), value.clone());
            }
        }
    }
    Value::Object(projected)
}
