//! Provider-observation provenance attached before catalog projection.

use serde_json::{Map, Value, json};

pub fn annotate_live_catalog(
    raw: &mut Map<String, Value>,
    source_url: &str,
    endpoint: &str,
    account: &str,
    protocols: &[&str],
) {
    let fetched_at = chrono::Utc::now().to_rfc3339();
    raw.insert("router_source_url".into(), Value::String(source_url.into()));
    raw.insert("router_endpoint".into(), Value::String(endpoint.into()));
    raw.insert("router_account".into(), Value::String(account.into()));
    raw.insert("router_protocols".into(), json!(protocols));
    raw.insert(
        "router_fetched_at".into(),
        Value::String(fetched_at.clone()),
    );
    raw.insert("router_health_generation".into(), Value::String(fetched_at));
}
