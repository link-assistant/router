import type {JsonValue} from "./runtime/json-macro-runtime.mjs";
import { router_core_json_copy as __ro_router_core_json_copy, router_core_json_with_field as __ro_router_core_json_with_field, router_core_json_index_str as __ro_router_core_json_index_str } from "./runtime/json-update-runtime.mjs";

export function copied(value: JsonValue): JsonValue {
    return __ro_router_core_json_copy(value);
}

export function nested(value: JsonValue): JsonValue {
    const local = __ro_router_core_json_copy(value);
    const alias = local;
    return __ro_router_core_json_with_field(local, "nested", alias);
}

export function named(value: JsonValue): JsonValue {
    return __ro_router_core_json_index_str(value, "name");
}
