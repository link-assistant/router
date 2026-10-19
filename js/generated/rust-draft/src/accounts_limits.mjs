// Generated draft from src/accounts_limits.rs; sha256=2b5bfdda60ce2ffb8ff3d52459b13b8b68a56977f18e3db9100f5ff516861a1f
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_constructor_value_schema_e5181cb5e99a479919d85590efe65881c75ae761d73352284cdfb4d81c6d06a3 = {"schemaVersion":1,"types":{"ObservedLimits":{"kind":"data","name":"ObservedLimits","ctors":[{"name":"ObservedLimits","fields":[{"name":"credential_cooldown","type":{"kind":"bool"}},{"name":"model_cooldown","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"paused","type":{"kind":"bool"}}]}]},"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_6163636f756e74732e6c696d6974732e4c494d4954535f534156455f494e54455256414c5f53454353() {
  return 60n;
}

function ml_make_ObservedLimits_ObservedLimits(credential_cooldown, model_cooldown, paused) {
  if (!(typeof credential_cooldown === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(model_cooldown, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(model_cooldown, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  if (!(typeof paused === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "ObservedLimits", ["credential_cooldown"]: credential_cooldown, ["model_cooldown"]: model_cooldown, ["paused"]: paused }), {"kind":"data","name":"ObservedLimits"}, ml_constructor_value_schema_e5181cb5e99a479919d85590efe65881c75ae761d73352284cdfb4d81c6d06a3);
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

function ml_make_LimitCounts_LimitCounts(cooling_down, paused, model_cooldowns) {
  if (typeof cooling_down !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(cooling_down, 0n, 18446744073709551615n, "u64 argument cooling_down out of range");
  if (!(typeof cooling_down === 'bigint' && cooling_down >= 0n && cooling_down <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof paused !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(paused, 0n, 18446744073709551615n, "u64 argument paused out of range");
  if (!(typeof paused === 'bigint' && paused >= 0n && paused <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof model_cooldowns !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(model_cooldowns, 0n, 18446744073709551615n, "u64 argument model_cooldowns out of range");
  if (!(typeof model_cooldowns === 'bigint' && model_cooldowns >= 0n && model_cooldowns <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "LimitCounts", ["cooling_down"]: cooling_down, ["paused"]: paused, ["model_cooldowns"]: model_cooldowns });
}

export const translated = { ["LIMITS_SAVE_INTERVAL_SECS"]: rp_6163636f756e74732e6c696d6974732e4c494d4954535f534156455f494e54455256414c5f53454353(), ["ObservedLimits"]: ml_make_ObservedLimits_ObservedLimits, ["LimitCounts"]: ml_make_LimitCounts_LimitCounts };
export const provenance = {"sourcePath":"src/accounts_limits.rs","sourceSha256":"2b5bfdda60ce2ffb8ff3d52459b13b8b68a56977f18e3db9100f5ff516861a1f","executable":3,"executableFunctions":0,"executableConstants":1,"executableTypes":2,"executableConstructors":2,"carried":9,"preserved":13,"runtimeParity":false};
