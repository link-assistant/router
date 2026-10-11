// Generated draft from src/conversation_record/store.rs; sha256=95231afb1d4fd503bd9f5c394d058c2468d4bbd5d17c0f8635fbdb5b11b2553a
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = {"schemaVersion":1,"types":{"RouterOption_3_i32":{"kind":"data","name":"RouterOption_3_i32","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":32,"signed":true}}]}]},"std.io.Error":{"kind":"data","name":"std.io.Error","ctors":[{"name":"IoError","fields":[{"name":"kind","type":{"kind":"string"}},{"name":"message","type":{"kind":"string"}},{"name":"raw_os_error","type":{"kind":"data","name":"RouterOption_3_i32"}}]}]}}};

const ml_host_value_refinements_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = new Map([]);

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../../runtime/json-runtime.mjs";

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function HEADER_PHASE() {
  return "recording";
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

function TURN_PHASE() {
  return "turn";
}

function ml_make_Provenance_Provenance(router_version, provider) {
  if (!(typeof router_version === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(router_version))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof provider === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(provider))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Provenance", ["router_version"]: router_version, ["provider"]: provider });
}

function ml_make_LoadError_Unreadable(field0) {
  ml_validate_rust_value(field0, {"kind":"data","name":"std.io.Error"}, ml_host_value_schema_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe, { refinements: ml_host_value_refinements_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe });
  return Object.freeze({ $: 'Unreadable', field0: field0 });
}

function ml_make_LoadError_MissingHeader() {
  return Object.freeze({ $: 'MissingHeader' });
}

function rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e726561645f70726f76656e616e6365(record) {
  ml_validate_rust_value(record, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_record1 = rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e737472696e675f6669656c64(record, "router_version");
  const ml_record2 = rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e737472696e675f6669656c64(record, "provider");
  return Object.freeze({ $: "Provenance", ["router_version"]: ml_record1, ["provider"]: ml_record2 });
}

function rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e737472696e675f6669656c64(record, name) {
  ml_validate_rust_value(record, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(record, name), (ml_host_callback_8_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_8_0); }, "and_then"), "unknown", true);
}

export const translated = { ["HEADER_PHASE"]: HEADER_PHASE(), ["TURN_PHASE"]: TURN_PHASE(), ["Provenance"]: ml_make_Provenance_Provenance, ["LoadError"]: Object.freeze({ ["Unreadable"]: ml_make_LoadError_Unreadable, ["MissingHeader"]: ml_make_LoadError_MissingHeader }), ["read_provenance"]: rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e726561645f70726f76656e616e6365, ["string_field"]: rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e737472696e675f6669656c64 };
export const provenance = {"sourcePath":"src/conversation_record/store.rs","sourceSha256":"95231afb1d4fd503bd9f5c394d058c2468d4bbd5d17c0f8635fbdb5b11b2553a","executable":6,"executableFunctions":2,"executableConstants":2,"executableTypes":2,"executableConstructors":3,"carried":13,"preserved":20,"runtimeParity":false};
