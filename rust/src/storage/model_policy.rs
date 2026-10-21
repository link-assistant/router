use crate::model_contract::ModelAccessPolicy;

use super::TokenRecord;

pub(super) fn encode(record: &TokenRecord) -> String {
    serde_json::to_string(&record.model_policy).expect("model policy is JSON serializable")
}

pub(super) fn decode(raw: Option<&str>) -> Result<ModelAccessPolicy, String> {
    raw.map_or_else(
        || Ok(ModelAccessPolicy::default()),
        |raw| serde_json::from_str(raw).map_err(|error| error.to_string()),
    )
}
