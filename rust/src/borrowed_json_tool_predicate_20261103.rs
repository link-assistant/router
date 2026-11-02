//! Read-only compatibility leaf; intentionally unregistered source draft.
//! No entry, text, depth, or whole-tree validation bound narrows `&Value`.
use serde_json::Value;
pub fn borrowed_json_tool_is_translatable(tool: &Value) -> bool {
    let kind = tool.get("type").and_then(Value::as_str).unwrap_or("function");
    match kind {
        "function" => tool.get("function").unwrap_or(tool).get("name")
            .and_then(Value::as_str).is_some_and(|name| !name.is_empty()),
        "web_search" | "web_fetch" => true,
        _ => false,
    }
}
