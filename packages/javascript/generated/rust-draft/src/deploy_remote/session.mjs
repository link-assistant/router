// Generated draft from src/deploy_remote/session.rs; sha256=85e3307737d25c19db8bf5c9da192962e14a60e7c1c68e183978a86472f97383
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

const ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 = {"schemaVersion":1,"types":{"serde_json.Map_String_Value":{"kind":"data","name":"serde_json.Map_String_Value","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"serde_json.MapEntry"}}}]}]},"serde_json.MapEntry":{"kind":"data","name":"serde_json.MapEntry","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Number":{"kind":"data","name":"serde_json.Number","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"serde_json.Value":{"kind":"data","name":"serde_json.Value","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Number"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Map_String_Value"}}]}]}}};

const ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 = new Map([["serde_json.Number", ml_validate_json_number], ["serde_json.Map_String_Value", ml_validate_json_map]]);

function rp_6465706c6f795f72656d6f74652e73657373696f6e2e444541444c494e455f45584954() {
  return 12n;
}

function rp_6465706c6f795f72656d6f74652e73657373696f6e2e4556454e545f505245464958() {
  return "ROUTER_DEPLOY_EVENT ";
}

function ml_make_Collected_Collected(events, output) {
  ml_validate_rust_value(events, {"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}, ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5, { refinements: ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 });
  if (!ml_router_array(output, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Collected", ["events"]: events, ["output"]: output });
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
  num: {

  },
};

const serde_json = {
  error: {

  },
};

function ml_make_Echo_Keep() {
  return Object.freeze({ $: 'Keep' });
}

function ml_make_Echo_Stdout() {
  return Object.freeze({ $: 'Stdout' });
}

function ml_make_Echo_Stderr() {
  return Object.freeze({ $: 'Stderr' });
}

export const translated = { ["DEADLINE_EXIT"]: rp_6465706c6f795f72656d6f74652e73657373696f6e2e444541444c494e455f45584954(), ["EVENT_PREFIX"]: rp_6465706c6f795f72656d6f74652e73657373696f6e2e4556454e545f505245464958(), ["Collected"]: ml_make_Collected_Collected, ["Echo"]: Object.freeze({ ["Keep"]: ml_make_Echo_Keep, ["Stdout"]: ml_make_Echo_Stdout, ["Stderr"]: ml_make_Echo_Stderr }) };
export const provenance = {"sourcePath":"src/deploy_remote/session.rs","sourceSha256":"85e3307737d25c19db8bf5c9da192962e14a60e7c1c68e183978a86472f97383","executable":4,"executableFunctions":0,"executableConstants":2,"executableTypes":2,"executableConstructors":4,"carried":21,"preserved":26,"runtimeParity":false};
