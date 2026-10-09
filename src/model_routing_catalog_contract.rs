//! Exact-ID collision handling shared by every model catalog source.

use serde_json::Value;

use crate::model_catalog::CatalogRecord;

use super::{ModelRouteError, provider_owner};

pub(super) fn project_record(record: CatalogRecord) -> Value {
    let exposed_id = record.canonical_id.clone();
    let mut projected = record.raw;
    projected.insert("id".into(), Value::String(exposed_id));
    let upstream = projected
        .remove("_router_policy_upstream")
        .unwrap_or_else(|| Value::String(record.canonical_id.clone()));
    projected.insert("canonical_id".into(), upstream);
    projected.insert(
        "provider".into(),
        Value::String(record.provider.as_str().to_string()),
    );
    projected
        .entry("object")
        .or_insert_with(|| Value::String("model".into()));
    projected.insert("router_fetched_at".into(), Value::from(record.fetched_at));
    projected
        .entry("owned_by")
        .or_insert_with(|| Value::String(provider_owner(record.provider).to_string()));
    Value::Object(projected)
}

pub(super) fn conflict(catalog: &Value) -> Option<ModelRouteError> {
    let ids = catalog
        .get("catalog_conflicts")
        .and_then(Value::as_array)
        .filter(|ids| !ids.is_empty())?;
    Some(ModelRouteError::Conflict(format!(
        "exact model id collision across healthy providers: {}",
        ids.iter()
            .filter_map(Value::as_str)
            .collect::<Vec<_>>()
            .join(", ")
    )))
}

/// Insert one provider-advertised model without resolving exact-ID collisions
/// by provider order. Conflicting candidates leave the routable `data` set and
/// remain available only to the authenticated diagnostics surface.
pub fn insert_candidate(catalog: &mut Value, candidate: Value) {
    let Some(id) = candidate
        .get("id")
        .and_then(Value::as_str)
        .filter(|id| !id.is_empty())
        .map(str::to_string)
    else {
        return;
    };
    let Some(object) = catalog.as_object_mut() else {
        return;
    };
    let already_conflicted = object
        .get("catalog_conflicts")
        .and_then(Value::as_array)
        .is_some_and(|conflicts| conflicts.iter().any(|conflict| conflict == &id));
    if already_conflicted {
        object
            .entry("catalog_conflict_candidates")
            .or_insert_with(|| Value::Array(Vec::new()))
            .as_array_mut()
            .expect("catalog conflict candidates are an array")
            .push(candidate);
        return;
    }
    let existing = object
        .get_mut("data")
        .and_then(Value::as_array_mut)
        .and_then(|data| {
            data.iter()
                .position(|entry| entry.get("id").and_then(Value::as_str) == Some(&id))
                .map(|position| data.remove(position))
        });
    let Some(existing) = existing else {
        object
            .entry("data")
            .or_insert_with(|| Value::Array(Vec::new()))
            .as_array_mut()
            .expect("catalog data are an array")
            .push(candidate);
        return;
    };
    let conflicts = object
        .entry("catalog_conflicts")
        .or_insert_with(|| Value::Array(Vec::new()))
        .as_array_mut()
        .expect("catalog conflicts are an array");
    conflicts.push(Value::String(id));
    conflicts.sort_by(|left, right| left.as_str().cmp(&right.as_str()));
    let candidates = object
        .entry("catalog_conflict_candidates")
        .or_insert_with(|| Value::Array(Vec::new()))
        .as_array_mut()
        .expect("catalog conflict candidates are an array");
    candidates.push(existing);
    candidates.push(candidate);
}

/// Project one selected account's exact record through the model-truth contract.
pub fn thinking_model_truth(record: &CatalogRecord) -> crate::model_contract::ModelTruthDescriptor {
    let raw = project_record(record.clone());
    let projected = super::aggregate::project_model(
        raw.as_object().expect("record projection is an object"),
        &record.canonical_id,
    );
    let provenance = projected
        .get("capability_provenance")
        .cloned()
        .unwrap_or(Value::Null);
    crate::model_contract::ModelTruthDescriptor {
        upstream_request_model: Some(record.canonical_id.clone()),
        route: serde_json::from_value(provenance["scope"].clone()).unwrap_or_default(),
        capabilities: Value::Object(projected),
        capability_provenance: provenance,
        ..crate::model_contract::ModelTruthDescriptor::default()
    }
}
