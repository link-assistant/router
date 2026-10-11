// Generated draft from src/responses_websocket.rs; sha256=1e03a85abec3035f957494ec5260309017b9b7c90daf8df8cbb3aa0b9769c123
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_4c96ee7b933298ead9dc1a1cdfd2cdfceaae609e477fa5c7133f3b496e478f16 = {"schemaVersion":1,"types":{"Namespace":{"kind":"data","name":"Namespace","ctors":[{"name":"OpenAi","fields":[]},{"name":"Codex","fields":[]}]}}};

const ml_host_value_refinements_4c96ee7b933298ead9dc1a1cdfd2cdfceaae609e477fa5c7133f3b496e478f16 = new Map([]);

function RESPONSES_PATH() {
  return "/v1/responses";
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

function MAX_NAMED_STREAMS() {
  return 32n;
}

function MAX_STREAM_ID_CHARS() {
  return 256n;
}

function rp_726573706f6e7365735f776562736f636b65742e4d41585f434f4e4e454354494f4e5f414745() {
  return ml_host_std_time_duration_from_secs(ml_fixed((60n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_726573706f6e7365735f776562736f636b65742e434f4e4e4543545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function ml_make_Namespace_OpenAi() {
  return Object.freeze({ $: 'OpenAi' });
}

function ml_make_Namespace_Codex() {
  return Object.freeze({ $: 'Codex' });
}

function namespace_path(namespace) {
  ml_validate_rust_value(namespace, {"kind":"data","name":"Namespace"}, ml_host_value_schema_4c96ee7b933298ead9dc1a1cdfd2cdfceaae609e477fa5c7133f3b496e478f16, { refinements: ml_host_value_refinements_4c96ee7b933298ead9dc1a1cdfd2cdfceaae609e477fa5c7133f3b496e478f16 });
  switch (namespace.$) {
    case "OpenAi": {
      return "/api/services/openai/v1/responses";
    }
    case "Codex": {
      return "/api/services/codex/v1/responses";
    }
    default: {
      return ml_router_unexpected(namespace);
    }
  }
}

export const translated = { ["RESPONSES_PATH"]: RESPONSES_PATH(), ["MAX_NAMED_STREAMS"]: MAX_NAMED_STREAMS(), ["MAX_STREAM_ID_CHARS"]: MAX_STREAM_ID_CHARS(), ["MAX_CONNECTION_AGE"]: rp_726573706f6e7365735f776562736f636b65742e4d41585f434f4e4e454354494f4e5f414745(), ["CONNECT_TIMEOUT"]: rp_726573706f6e7365735f776562736f636b65742e434f4e4e4543545f54494d454f5554(), ["Namespace"]: Object.freeze({ ["OpenAi"]: ml_make_Namespace_OpenAi, ["Codex"]: ml_make_Namespace_Codex }), ["namespace_path"]: namespace_path };
export const provenance = {"sourcePath":"src/responses_websocket.rs","sourceSha256":"1e03a85abec3035f957494ec5260309017b9b7c90daf8df8cbb3aa0b9769c123","executable":7,"executableFunctions":1,"executableConstants":5,"executableTypes":1,"executableConstructors":2,"carried":48,"preserved":56,"runtimeParity":false};
