// Generated draft from src/gemini/stream.rs; sha256=7679cc0876c4893defd551a9c92b19006fd4aaf5ede8250c752b8b2164676389
// Carried constructs are data, never runtime parity evidence.
function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_61ff3576f2f30911e8214fc756b023949340286b323d02efc3e0e6a436bcbb8f = {"schemaVersion":1,"types":{"SseJsonDecoder":{"kind":"data","name":"SseJsonDecoder","ctors":[{"name":"SseJsonDecoder","fields":[{"name":"buffered","type":{"kind":"array","element":{"kind":"fixed","bits":8,"signed":false}}}]}]}}};

const ml_host_value_refinements_61ff3576f2f30911e8214fc756b023949340286b323d02efc3e0e6a436bcbb8f = new Map([]);

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_make_SseJsonDecoder_SseJsonDecoder(buffered) {
  if (!ml_router_array(buffered, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 255n))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "SseJsonDecoder", ["buffered"]: buffered });
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

function ml_make_NativeStreamTranslator_NativeStreamTranslator(decoder) {
  ml_validate_rust_value(decoder, {"kind":"data","name":"SseJsonDecoder"}, ml_host_value_schema_61ff3576f2f30911e8214fc756b023949340286b323d02efc3e0e6a436bcbb8f, { refinements: ml_host_value_refinements_61ff3576f2f30911e8214fc756b023949340286b323d02efc3e0e6a436bcbb8f });
  return Object.freeze({ $: "NativeStreamTranslator", ["decoder"]: decoder });
}

function ml_make_OpenAiStreamTranslator_OpenAiStreamTranslator(decoder, id, created, model, role_emitted, done, saw_tool_call, next_tool_index) {
  ml_validate_rust_value(decoder, {"kind":"data","name":"SseJsonDecoder"}, ml_host_value_schema_61ff3576f2f30911e8214fc756b023949340286b323d02efc3e0e6a436bcbb8f, { refinements: ml_host_value_refinements_61ff3576f2f30911e8214fc756b023949340286b323d02efc3e0e6a436bcbb8f });
  if (!(typeof id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(id))) throw new TypeError('argument outside supported Rust value domain');
  if (typeof created !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(created, -9223372036854775808n, 9223372036854775807n, "i64 argument created out of range");
  if (!(typeof created === 'bigint' && created >= -9223372036854775808n && created <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof model === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(model))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof role_emitted === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof done === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof saw_tool_call === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (typeof next_tool_index !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(next_tool_index, 0n, 18446744073709551615n, "u64 argument next_tool_index out of range");
  if (!(typeof next_tool_index === 'bigint' && next_tool_index >= 0n && next_tool_index <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "OpenAiStreamTranslator", ["decoder"]: decoder, ["id"]: id, ["created"]: created, ["model"]: model, ["role_emitted"]: role_emitted, ["done"]: done, ["saw_tool_call"]: saw_tool_call, ["next_tool_index"]: next_tool_index });
}

export const translated = { ["SseJsonDecoder"]: ml_make_SseJsonDecoder_SseJsonDecoder, ["NativeStreamTranslator"]: ml_make_NativeStreamTranslator_NativeStreamTranslator, ["OpenAiStreamTranslator"]: ml_make_OpenAiStreamTranslator_OpenAiStreamTranslator };
export const provenance = {"sourcePath":"src/gemini/stream.rs","sourceSha256":"7679cc0876c4893defd551a9c92b19006fd4aaf5ede8250c752b8b2164676389","executable":3,"executableFunctions":0,"executableConstants":0,"executableTypes":3,"executableConstructors":3,"carried":16,"preserved":20,"runtimeParity":false};
