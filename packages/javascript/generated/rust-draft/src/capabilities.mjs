// Generated draft from src/capabilities.rs; sha256=7a8bb8a76288590bbc9d556b77d4415cd513837a45d88edb278dc5c6b7b6b222
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 = {"schemaVersion":1,"types":{"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572":{"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572","ctors":[{"name":"Claude","fields":[]},{"name":"Codex","fields":[]},{"name":"Gemini","fields":[]},{"name":"Qwen","fields":[]}]}}};

const ml_host_value_refinements_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 = new Map([]);

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_array as ml_host_serde_json_value_as_array } from "../runtime/json-runtime.mjs";

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

import { assertImmutableIterator as ml_assert_immutable_iterator } from "../runtime/iterator-runtime.mjs";

function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

const ml_router_try_return = Symbol('checked Rust early return');
function ml_router_try(value, option) { if (value.$ === (option ? 'Some' : 'Ok')) return value.field0; throw { [ml_router_try_return]: true, value: option ? Object.freeze({ $: 'None' }) : Object.freeze({ $: 'Err', field0: value.field0 }) }; }
function ml_router_propagated(error) { return error && error[ml_router_try_return] === true; }

const ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function ml_make_Capability_Native() {
  return Object.freeze({ $: 'Native' });
}

function ml_make_Capability_Emulated() {
  return Object.freeze({ $: 'Emulated' });
}

function ml_make_Capability_Unsupported() {
  return Object.freeze({ $: 'Unsupported' });
}

function ml_make_Capability_Unknown() {
  return Object.freeze({ $: 'Unknown' });
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

function rp_6361706162696c69746965732e737562736372697074696f6e(provider, _model) {
  ml_validate_rust_value(provider, {"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572"}, ml_host_value_schema_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3, { refinements: ml_host_value_refinements_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 });
  ml_validate_rust_value(_model, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  switch (provider.$) {
    case "Claude": {
      const ml_record1 = Object.freeze({ $: 'Unknown' });
      const ml_record2 = Object.freeze({ $: 'Native' });
      const ml_record3 = Object.freeze({ $: 'Native' });
      const ml_record4 = Object.freeze({ $: 'Native' });
      const ml_record5 = Object.freeze({ $: 'Native' });
      const ml_record6 = Object.freeze({ $: 'Native' });
      const ml_record7 = Object.freeze({ $: 'Native' });
      return Object.freeze({ $: "ProviderCapabilities", ["temperature"]: ml_record1, ["top_p"]: ml_record2, ["stop_sequences"]: ml_record3, ["output_token_limit"]: ml_record4, ["reasoning"]: ml_record5, ["web_search"]: ml_record6, ["web_fetch"]: ml_record7 });
    }
    case "Codex": {
      const ml_record8 = Object.freeze({ $: 'Unsupported' });
      const ml_record9 = Object.freeze({ $: 'Unsupported' });
      const ml_record10 = Object.freeze({ $: 'Emulated' });
      const ml_record11 = Object.freeze({ $: 'Emulated' });
      const ml_record12 = Object.freeze({ $: 'Native' });
      const ml_record13 = Object.freeze({ $: 'Native' });
      const ml_record14 = Object.freeze({ $: 'Unsupported' });
      return Object.freeze({ $: "ProviderCapabilities", ["temperature"]: ml_record8, ["top_p"]: ml_record9, ["stop_sequences"]: ml_record10, ["output_token_limit"]: ml_record11, ["reasoning"]: ml_record12, ["web_search"]: ml_record13, ["web_fetch"]: ml_record14 });
    }
    case "Gemini": {
      const ml_record15 = Object.freeze({ $: 'Native' });
      const ml_record16 = Object.freeze({ $: 'Native' });
      const ml_record17 = Object.freeze({ $: 'Native' });
      const ml_record18 = Object.freeze({ $: 'Native' });
      const ml_record19 = Object.freeze({ $: 'Native' });
      const ml_record20 = Object.freeze({ $: 'Unsupported' });
      const ml_record21 = Object.freeze({ $: 'Unsupported' });
      return Object.freeze({ $: "ProviderCapabilities", ["temperature"]: ml_record15, ["top_p"]: ml_record16, ["stop_sequences"]: ml_record17, ["output_token_limit"]: ml_record18, ["reasoning"]: ml_record19, ["web_search"]: ml_record20, ["web_fetch"]: ml_record21 });
    }
    case "Qwen": {
      const ml_record22 = Object.freeze({ $: 'Native' });
      const ml_record23 = Object.freeze({ $: 'Native' });
      const ml_record24 = Object.freeze({ $: 'Native' });
      const ml_record25 = Object.freeze({ $: 'Native' });
      const ml_record26 = Object.freeze({ $: 'Native' });
      const ml_record27 = Object.freeze({ $: 'Unsupported' });
      const ml_record28 = Object.freeze({ $: 'Unsupported' });
      return Object.freeze({ $: "ProviderCapabilities", ["temperature"]: ml_record22, ["top_p"]: ml_record23, ["stop_sequences"]: ml_record24, ["output_token_limit"]: ml_record25, ["reasoning"]: ml_record26, ["web_search"]: ml_record27, ["web_fetch"]: ml_record28 });
    }
    default: {
      return ml_router_unexpected(provider);
    }
  }
}

function rp_6361706162696c69746965732e756e7361746973666961626c655f666f726365645f746f6f6c5f63686f696365(tools, forced) {
try {
  ml_assert_immutable_iterator(tools);
  ml_validate_rust_value(tools, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  if (!(typeof forced === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!forced) {
    return Object.freeze({ $: 'None' });
  } else {
  }
  const tools_2 = ml_router_try(ml_host_serde_json_value_as_array(ml_router_try(tools, true)), true);
  if ((tools_2.length === 0)) {
    return Object.freeze({ $: 'None' });
  } else {
  }
  const has_function = ml_router_any(ml_router_iter(tools_2, true), (tool) => { const kind = ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(tool, "type"), (ml_host_callback_34_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_34_0); }, "and_then"), "custom", true);
  return !((() => {
    const ml_text_36 = kind;
    const ml_text_37 = "web_search";
    return ml_text_36.startsWith(ml_text_37);
  })() || (() => {
    const ml_text_38 = kind;
    const ml_text_39 = "web_fetch";
    return ml_text_38.startsWith(ml_text_39);
  })()); });
  return ml_host_bool_then(!has_function, () => { return "tool_choice requires a tool call, but the request offers only server-side tools that the provider executes itself; use tool_choice auto or add a client tool"; });

} catch (ml_router_error) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }
}

export const translated = { ["Capability"]: Object.freeze({ ["Native"]: ml_make_Capability_Native, ["Emulated"]: ml_make_Capability_Emulated, ["Unsupported"]: ml_make_Capability_Unsupported, ["Unknown"]: ml_make_Capability_Unknown }), ["subscription"]: rp_6361706162696c69746965732e737562736372697074696f6e, ["unsatisfiable_forced_tool_choice"]: rp_6361706162696c69746965732e756e7361746973666961626c655f666f726365645f746f6f6c5f63686f696365 };
export const provenance = {"sourcePath":"src/capabilities.rs","sourceSha256":"7a8bb8a76288590bbc9d556b77d4415cd513837a45d88edb278dc5c6b7b6b222","executable":3,"executableFunctions":2,"executableConstants":0,"executableTypes":1,"executableConstructors":4,"carried":12,"preserved":16,"runtimeParity":false};
