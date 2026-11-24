//! A catalog's authenticated thinking metadata must fit its published contract.
use axum::http::Method;
use link_assistant_router::contracts;
use serde_json::json;

fn main() {
    let catalog = json!({"data":[{
        "id":"exact-model", "service":"claude", "owned_by":"anthropic",
        "capability_provenance":{},
        "thinking":{"supported":true,"min_budget_tokens":1024,"max_budget_tokens":8192}
    }]});
    contracts::validation::http(&Method::GET, "/api/models", 200, &catalog).unwrap();
}
