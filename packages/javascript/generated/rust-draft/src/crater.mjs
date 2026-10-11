// Generated draft from src/crater.rs; sha256=aa8cfe2f3416ff1615fa1f7d65d5c4cf67a24e8439aceca3ae81289b94a2b469
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_bool as ml_host_serde_json_value_as_bool } from "../runtime/json-runtime.mjs";

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function ACTIVITY_JSON() {
  return "application/activity+json";
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
};

const serde_json = {
  error: {

  },
};

function LINKED_DATA_JSON() {
  return "application/ld+json; profile=\"https://www.w3.org/ns/activitystreams\"";
}

function DEFAULT_MODEL() {
  return "crater-forgefed";
}

function ml_make_CraterTaskRequest_CraterTaskRequest(model, title, content, assignee, attributed_to) {
  if (!(typeof model === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(model))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof title === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(title))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof content === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(content))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(assignee, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  if (!(typeof attributed_to === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(attributed_to))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "CraterTaskRequest", ["model"]: model, ["title"]: title, ["content"]: content, ["assignee"]: assignee, ["attributed_to"]: attributed_to });
}

function rp_6372617465722e69735f7265736f6c766564(task) {
  ml_validate_rust_value(task, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(task, "isResolved"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_bool(ml_host_callback_2_0); }, "and_then"), false, true);
}

export const translated = { ["ACTIVITY_JSON"]: ACTIVITY_JSON(), ["LINKED_DATA_JSON"]: LINKED_DATA_JSON(), ["DEFAULT_MODEL"]: DEFAULT_MODEL(), ["CraterTaskRequest"]: ml_make_CraterTaskRequest_CraterTaskRequest, ["is_resolved"]: rp_6372617465722e69735f7265736f6c766564 };
export const provenance = {"sourcePath":"src/crater.rs","sourceSha256":"aa8cfe2f3416ff1615fa1f7d65d5c4cf67a24e8439aceca3ae81289b94a2b469","executable":5,"executableFunctions":1,"executableConstants":3,"executableTypes":1,"executableConstructors":1,"carried":37,"preserved":43,"runtimeParity":false};
