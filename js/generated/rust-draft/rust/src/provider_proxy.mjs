// Generated draft from rust/src/provider_proxy.rs; sha256=acdd00cd3e346de590cc41c5c497df1473e69367a2ef118c18ffffe936bb154a
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419 = {"schemaVersion":1,"types":{"rp_6d6574726963732e53757266616365":{"kind":"data","name":"rp_6d6574726963732e53757266616365","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAIChat","fields":[]},{"name":"OpenAIResponses","fields":[]}]}}};

const ml_host_value_refinements_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419 = new Map([]);

import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_70726f76696465725f70726f78792e70726f746f636f6c5f666f725f72657175657374(surface, path) {
  ml_validate_rust_value(surface, {"kind":"data","name":"rp_6d6574726963732e53757266616365"}, ml_host_value_schema_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419, { refinements: ml_host_value_refinements_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419 });
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  if ((() => {
    const ml_text_1 = path;
    const ml_text_2 = "/api/services/gemini/";
    return ml_text_1.includes(ml_text_2);
  })()) {
    return Object.freeze({ $: 'GeminiNative' });
  } else {
  }
  switch (surface.$) {
    case "Anthropic": {
      return Object.freeze({ $: 'AnthropicMessages' });
    }
    case "OpenAIChat": {
      return Object.freeze({ $: 'OpenAIChat' });
    }
    case "OpenAIResponses": {
      return Object.freeze({ $: 'OpenAIResponses' });
    }
    default: {
      return ml_router_unexpected(surface);
    }
  }
}

function rp_70726f76696465725f70726f78792e50524f56494445525f434154414c4f475f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((5n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_70726f76696465725f70726f78792e50524f56494445525f4641494c45445f524546524553485f5245545259() {
  return ml_host_std_time_duration_from_secs(15n);
}

export const translated = { ["protocol_for_request"]: rp_70726f76696465725f70726f78792e70726f746f636f6c5f666f725f72657175657374, ["PROVIDER_CATALOG_TTL"]: rp_70726f76696465725f70726f78792e50524f56494445525f434154414c4f475f54544c(), ["PROVIDER_FAILED_REFRESH_RETRY"]: rp_70726f76696465725f70726f78792e50524f56494445525f4641494c45445f524546524553485f5245545259() };
export const provenance = {"sourcePath":"rust/src/provider_proxy.rs","sourceSha256":"acdd00cd3e346de590cc41c5c497df1473e69367a2ef118c18ffffe936bb154a","executable":3,"executableFunctions":1,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":31,"preserved":35,"runtimeParity":false};
