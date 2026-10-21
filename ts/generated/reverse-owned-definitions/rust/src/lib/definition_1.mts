// GENERATED: definition-only reverse checked TypeScript.
import type {JsonValue} from "../../../../../../js/generated/rust-owned-definitions/rust/src/lib/runtime/json-macro-runtime.mjs";
import { serde_json_value_get_string as __ro_serde_json_value_get_string, serde_json_value_as_str as __ro_serde_json_value_as_str } from "../../../../../../js/generated/rust-owned-definitions/rust/src/lib/runtime/json-runtime.mjs";

export function rp_6272696467655f726571756573742e6e6f6e656d707479(input0: JsonValue, input1: string): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:string}> {
    const field = __ro_serde_json_value_get_string(input0, input1);
    if ((field.$ === "Some")) {
        const text = __ro_serde_json_value_as_str(field.field0);
        if ((text.$ === "Some")) {
            if ((text.field0 !== "")) {
                return text;
            } else {
                return ({$:'None'});
            }
        } else {
            return ({$:'None'});
        }
    } else {
        return ({$:'None'});
    }
}
