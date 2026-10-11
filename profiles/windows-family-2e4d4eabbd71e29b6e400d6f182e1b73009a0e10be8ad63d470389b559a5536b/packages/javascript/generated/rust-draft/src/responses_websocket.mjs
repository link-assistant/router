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

const ml_host_value_schema_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a = {"schemaVersion":1,"types":{"rp_726573706f6e7365735f776562736f636b65742e4e616d657370616365":{"kind":"data","name":"rp_726573706f6e7365735f776562736f636b65742e4e616d657370616365","ctors":[{"name":"OpenAi","fields":[]},{"name":"Codex","fields":[]}]}}};

const ml_host_value_refinements_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a = new Map([]);

function rp_726573706f6e7365735f776562736f636b65742e524553504f4e5345535f50415448() {
  return "/v1/responses";
}

function rp_726573706f6e7365735f776562736f636b65742e4d41585f4e414d45445f53545245414d53() {
  return 32n;
}

function rp_726573706f6e7365735f776562736f636b65742e4d41585f53545245414d5f49445f4348415253() {
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

function rp_726573706f6e7365735f776562736f636b65742e6e616d6573706163655f70617468(namespace) {
  ml_validate_rust_value(namespace, {"kind":"data","name":"rp_726573706f6e7365735f776562736f636b65742e4e616d657370616365"}, ml_host_value_schema_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a, { refinements: ml_host_value_refinements_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a });
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

export const translated = { ["RESPONSES_PATH"]: rp_726573706f6e7365735f776562736f636b65742e524553504f4e5345535f50415448(), ["MAX_NAMED_STREAMS"]: rp_726573706f6e7365735f776562736f636b65742e4d41585f4e414d45445f53545245414d53(), ["MAX_STREAM_ID_CHARS"]: rp_726573706f6e7365735f776562736f636b65742e4d41585f53545245414d5f49445f4348415253(), ["MAX_CONNECTION_AGE"]: rp_726573706f6e7365735f776562736f636b65742e4d41585f434f4e4e454354494f4e5f414745(), ["CONNECT_TIMEOUT"]: rp_726573706f6e7365735f776562736f636b65742e434f4e4e4543545f54494d454f5554(), ["Namespace"]: Object.freeze({ ["OpenAi"]: ml_make_Namespace_OpenAi, ["Codex"]: ml_make_Namespace_Codex }), ["namespace_path"]: rp_726573706f6e7365735f776562736f636b65742e6e616d6573706163655f70617468 };
export const provenance = {"sourcePath":"src/responses_websocket.rs","sourceSha256":"1e03a85abec3035f957494ec5260309017b9b7c90daf8df8cbb3aa0b9769c123","executable":7,"executableFunctions":1,"executableConstants":5,"executableTypes":1,"executableConstructors":2,"carried":48,"preserved":56,"runtimeParity":false};
