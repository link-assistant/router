// Generated draft from tests/support/replay_router.rs; sha256=24744847e28b7f55d6227843170379d3f83424b06bd98964b91b55567ffc4db3
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

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

const ml_host_value_schema_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1 = {"schemaVersion":1,"types":{"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1 = new Map([]);

function BRIDGE_MODEL() {
  return "gpt-5-2025-08-07";
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

function ml_make_Cassette_Cassette(name, document, status, headers, body) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(document, {"kind":"data","name":"serde_json.Value"}, ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5, { refinements: ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 });
  if (typeof status !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(headers, {"kind":"array","element":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d"}}, ml_host_value_schema_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1, { refinements: ml_host_value_refinements_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1 });
  if (!ml_router_array(body, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 255n))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Cassette", ["name"]: name, ["document"]: document, ["status"]: status, ["headers"]: headers, ["body"]: body });
}

function ml_make_Surface_AnthropicMessages() {
  return Object.freeze({ $: 'AnthropicMessages' });
}

function ml_make_Surface_AnthropicCountTokens() {
  return Object.freeze({ $: 'AnthropicCountTokens' });
}

function ml_make_Surface_OpenAIChat() {
  return Object.freeze({ $: 'OpenAIChat' });
}

function ml_make_Surface_OpenAIResponses() {
  return Object.freeze({ $: 'OpenAIResponses' });
}

function ml_make_Surface_CodexResponses() {
  return Object.freeze({ $: 'CodexResponses' });
}

export const translated = { ["BRIDGE_MODEL"]: BRIDGE_MODEL(), ["Cassette"]: ml_make_Cassette_Cassette, ["Surface"]: Object.freeze({ ["AnthropicMessages"]: ml_make_Surface_AnthropicMessages, ["AnthropicCountTokens"]: ml_make_Surface_AnthropicCountTokens, ["OpenAIChat"]: ml_make_Surface_OpenAIChat, ["OpenAIResponses"]: ml_make_Surface_OpenAIResponses, ["CodexResponses"]: ml_make_Surface_CodexResponses }) };
export const provenance = {"sourcePath":"tests/support/replay_router.rs","sourceSha256":"24744847e28b7f55d6227843170379d3f83424b06bd98964b91b55567ffc4db3","executable":3,"executableFunctions":0,"executableConstants":1,"executableTypes":2,"executableConstructors":6,"carried":41,"preserved":45,"runtimeParity":false};
