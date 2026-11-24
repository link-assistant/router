// GENERATED: definition-only reverse checked TypeScript.
import type {JsonValue} from "../../../../../../js/generated/rust-owned-definitions/rust/src/lib/runtime/json-macro-runtime.mjs";
import { serde_json_value_get_string as __ro_serde_json_value_get_string, serde_json_value_as_i64 as __ro_serde_json_value_as_i64 } from "../../../../../../js/generated/rust-owned-definitions/rust/src/lib/runtime/json-runtime.mjs";

export function rp_74656c656772616d2e7570646174655f6964(input0: JsonValue): bigint {
    const field0 = __ro_serde_json_value_get_string(input0, "update_id");
    if ((field0.$ === "Some")) {
        const scalar = __ro_serde_json_value_as_i64(field0.field0);
        if ((scalar.$ === "Some")) {
            return scalar.field0;
        } else {
            return 0n;
        }
    } else {
        return 0n;
    }
}
