// Generated draft from src/unix_listener.rs; sha256=f2697b44c95c5f9a7aab7d2fc55a03c80360da08b1f987a4caaf4d47fe0441b5
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

function ml_make_SocketAccess_SocketAccess(mode, group) {
  if (typeof mode !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(mode, 0n, 4294967295n, "u32 argument mode out of range");
  if (!(typeof mode === 'bigint' && mode >= 0n && mode <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(group, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  return Object.freeze({ $: "SocketAccess", ["mode"]: mode, ["group"]: group });
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

export const translated = { ["SocketAccess"]: ml_make_SocketAccess_SocketAccess };
export const provenance = {"sourcePath":"src/unix_listener.rs","sourceSha256":"f2697b44c95c5f9a7aab7d2fc55a03c80360da08b1f987a4caaf4d47fe0441b5","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":16,"preserved":18,"runtimeParity":false};
