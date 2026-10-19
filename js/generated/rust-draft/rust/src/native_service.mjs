// Generated draft from rust/src/native_service.rs; sha256=478d8a6cc9a58defd2fb3c3eefeea81846b4499533530d7539ef1c8dbfb11337
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

function rp_6e61746976655f736572766963652e434f4e4e4543545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function ml_make_Service_OpenAi() {
  return Object.freeze({ $: 'OpenAi' });
}

function ml_make_Service_Anthropic() {
  return Object.freeze({ $: 'Anthropic' });
}

function ml_make_Service_Codex() {
  return Object.freeze({ $: 'Codex' });
}

function ml_make_Service_CodexBackend() {
  return Object.freeze({ $: 'CodexBackend' });
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

const router_core_base64 = {

};

const serde_json = {
  error: {

  },
};

function ml_make_NativeResourceAction_Create() {
  return Object.freeze({ $: 'Create' });
}

function ml_make_NativeResourceAction_Use() {
  return Object.freeze({ $: 'Use' });
}

function ml_make_NativeResourceAction_Delete() {
  return Object.freeze({ $: 'Delete' });
}

export const translated = { ["CONNECT_TIMEOUT"]: rp_6e61746976655f736572766963652e434f4e4e4543545f54494d454f5554(), ["Service"]: Object.freeze({ ["OpenAi"]: ml_make_Service_OpenAi, ["Anthropic"]: ml_make_Service_Anthropic, ["Codex"]: ml_make_Service_Codex, ["CodexBackend"]: ml_make_Service_CodexBackend }), ["NativeResourceAction"]: Object.freeze({ ["Create"]: ml_make_NativeResourceAction_Create, ["Use"]: ml_make_NativeResourceAction_Use, ["Delete"]: ml_make_NativeResourceAction_Delete }) };
export const provenance = {"sourcePath":"rust/src/native_service.rs","sourceSha256":"478d8a6cc9a58defd2fb3c3eefeea81846b4499533530d7539ef1c8dbfb11337","executable":3,"executableFunctions":0,"executableConstants":1,"executableTypes":2,"executableConstructors":7,"carried":45,"preserved":49,"runtimeParity":false};
