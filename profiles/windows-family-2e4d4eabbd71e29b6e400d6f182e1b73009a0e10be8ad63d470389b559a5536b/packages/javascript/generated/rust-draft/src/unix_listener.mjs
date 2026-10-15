// Generated draft from src/unix_listener.rs; sha256=f2697b44c95c5f9a7aab7d2fc55a03c80360da08b1f987a4caaf4d47fe0441b5
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_constructor_value_schema_2de08bc29b0d4c87b509131b93180acb17650828492db4c10ec7372b1e04f171 = {"schemaVersion":1,"types":{"SocketAccess":{"kind":"data","name":"SocketAccess","ctors":[{"name":"SocketAccess","fields":[{"name":"mode","type":{"kind":"fixed","bits":32,"signed":false}},{"name":"group","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}}]}]},"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

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
  ml_assert_constructor_input(group, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(group, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  return ml_snapshot_constructor_value(Object.freeze({ $: "SocketAccess", ["mode"]: mode, ["group"]: group }), {"kind":"data","name":"SocketAccess"}, ml_constructor_value_schema_2de08bc29b0d4c87b509131b93180acb17650828492db4c10ec7372b1e04f171);
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

function WIDEST_MODE() {
  return 438n;
}

export const translated = { ["SocketAccess"]: ml_make_SocketAccess_SocketAccess, ["WIDEST_MODE"]: WIDEST_MODE() };
export const provenance = {"sourcePath":"src/unix_listener.rs","sourceSha256":"f2697b44c95c5f9a7aab7d2fc55a03c80360da08b1f987a4caaf4d47fe0441b5","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":15,"preserved":18,"runtimeParity":false};
