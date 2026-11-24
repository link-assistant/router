// GENERATED: definition-only reverse checked TypeScript.
import type {JsonValue} from "../../../../../../js/generated/rust-owned-definitions/rust/src/lib/runtime/json-macro-runtime.mjs";
import { json_macro_string as __ro_json_macro_string, json_macro_bool as __ro_json_macro_bool, json_macro_object as __ro_json_macro_object } from "../../../../../../js/generated/rust-owned-definitions/rust/src/lib/runtime/json-macro-runtime.mjs";

export function rp_6465706c6f795f6c6f63616c2e7374617475735f7265706f72742e626c6f636b6572(input0: string, input1: string, input2: boolean): JsonValue {
    const checked_argument0 = __ro_json_macro_string(input0);
    const checked_argument1 = __ro_json_macro_string(input1);
    const checked_argument2 = __ro_json_macro_bool(input2);
    return __ro_json_macro_object([["name", __ro_json_macro_string(input0)], ["reason", __ro_json_macro_string(input1)], ["forceable", __ro_json_macro_bool(input2)]]);
}
