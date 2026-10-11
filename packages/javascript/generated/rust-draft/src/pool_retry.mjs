// Generated draft from src/pool_retry.rs; sha256=18d4fba664abbeb0e5d14f19e4f7745d49edae0f1be08e8ffacbedbceef3cb69
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

function ml_make_RetryPolicy_RetryPolicy(rounds, max_credentials, max_interval) {
  ml_fixed(rounds, 0n, 4294967295n, "u32 argument rounds out of range");
  if (!(typeof rounds === 'bigint' && rounds >= 0n && rounds <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(max_credentials, 0n, 4294967295n, "u32 argument max_credentials out of range");
  if (!(typeof max_credentials === 'bigint' && max_credentials >= 0n && max_credentials <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(max_interval, {"kind":"data","name":"std.time.Duration"}, ml_host_value_schema_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506, { refinements: ml_host_value_refinements_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506 });
  return Object.freeze({ $: "RetryPolicy", ["rounds"]: rounds, ["max_credentials"]: max_credentials, ["max_interval"]: max_interval });
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

export const translated = { ["RetryPolicy"]: ml_make_RetryPolicy_RetryPolicy };
export const provenance = {"sourcePath":"src/pool_retry.rs","sourceSha256":"18d4fba664abbeb0e5d14f19e4f7745d49edae0f1be08e8ffacbedbceef3cb69","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":5,"preserved":7,"runtimeParity":false};
