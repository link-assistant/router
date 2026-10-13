// Generated draft from src/telegram.rs; sha256=48a0372ad6b394247e12a9e3d8f8f2aaa264fc334eb8dad59e66df7406e006c9
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_i64 as ml_host_serde_json_value_as_i64 } from "../runtime/json-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_74656c656772616d2e504f4c4c5f54494d454f55545f53454353() {
  return 30n;
}

function rp_74656c656772616d2e4552524f525f4241434b4f4646() {
  return ml_host_std_time_duration_from_secs(5n);
}

function rp_74656c656772616d2e414c4c4f5745445f55504441544553() {
  return "[\"message\"]";
}

function rp_74656c656772616d2e7570646174655f6964(update) {
  ml_validate_rust_value(update, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return (() => {
    const ml_standard_body_1 = ml_host_option_bind(ml_host_serde_json_value_get_string(update, "update_id"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_i64(ml_host_callback_0_0); }, "and_then");
    const ml_standard_body_2 = 0n;
    switch (ml_standard_body_1.$) {
      case "None": {
        return ml_standard_body_2;
      }
      case "Some": {
        const x = ml_standard_body_1.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_1);
      }
    }
  })();
}

export const translated = { ["POLL_TIMEOUT_SECS"]: rp_74656c656772616d2e504f4c4c5f54494d454f55545f53454353(), ["ERROR_BACKOFF"]: rp_74656c656772616d2e4552524f525f4241434b4f4646(), ["ALLOWED_UPDATES"]: rp_74656c656772616d2e414c4c4f5745445f55504441544553(), ["update_id"]: rp_74656c656772616d2e7570646174655f6964 };
export const provenance = {"sourcePath":"src/telegram.rs","sourceSha256":"48a0372ad6b394247e12a9e3d8f8f2aaa264fc334eb8dad59e66df7406e006c9","executable":4,"executableFunctions":1,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":12,"preserved":17,"runtimeParity":false};
