// Generated draft from src/refresh_recovery_tests.rs; sha256=c835471e82f1f2d9798c0107d1903312f07f367a4d5f82f638f14dd4688cf1e9
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_as_secs as ml_host_duration_as_secs } from "../runtime/time-runtime.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506 = {"schemaVersion":1,"types":{"std.time.Duration":{"kind":"data","name":"std.time.Duration","ctors":[{"name":"Duration","fields":[{"name":"secs","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"nanos","type":{"kind":"fixed","bits":32,"signed":false}}]}]}}};

const ml_host_value_refinements_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506 = new Map([["std.time.Duration", ml_validate_duration]]);

function ml_validate_duration(value) { ml_host_duration_as_secs(value); return true; }

function NOW_MS() {
  return 1700000000000n;
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

function ml_make_Answer_Answer(status, body, delay) {
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof body === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(body))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(delay, {"kind":"data","name":"std.time.Duration"}, ml_host_value_schema_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506, { refinements: ml_host_value_refinements_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506 });
  return Object.freeze({ $: "Answer", ["status"]: status, ["body"]: body, ["delay"]: delay });
}

function INVALID_GRANT() {
  return "{\"error\":\"invalid_grant\",\"error_description\":\"refresh token not found\"}";
}

export const translated = { ["NOW_MS"]: NOW_MS(), ["Answer"]: ml_make_Answer_Answer, ["INVALID_GRANT"]: INVALID_GRANT() };
export const provenance = {"sourcePath":"src/refresh_recovery_tests.rs","sourceSha256":"c835471e82f1f2d9798c0107d1903312f07f367a4d5f82f638f14dd4688cf1e9","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":1,"carried":23,"preserved":27,"runtimeParity":false};
