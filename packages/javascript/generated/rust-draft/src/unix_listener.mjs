// Generated draft from src/unix_listener.rs; sha256=f2697b44c95c5f9a7aab7d2fc55a03c80360da08b1f987a4caaf4d47fe0441b5
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

function ml_make_SocketAccess_SocketAccess(mode, group) {
  ml_fixed(mode, 0n, 4294967295n, "u32 argument mode out of range");
  if (!(typeof mode === 'bigint' && mode >= 0n && mode <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(group, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
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
};

const serde_json = {
  error: {

  },
};

export const translated = { ["SocketAccess"]: ml_make_SocketAccess_SocketAccess };
export const provenance = {"sourcePath":"src/unix_listener.rs","sourceSha256":"f2697b44c95c5f9a7aab7d2fc55a03c80360da08b1f987a4caaf4d47fe0441b5","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":16,"preserved":18,"runtimeParity":false};
