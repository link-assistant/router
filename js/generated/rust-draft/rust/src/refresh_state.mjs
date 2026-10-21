// Generated draft from rust/src/refresh_state.rs; sha256=19e80a6134db539df9d694302359cf150013e24cad3f552ba7f147cfff566495
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_constructor_value_schema_b85c026fadd7eb0541b04e2c3ee10092cdae9a146c8319cb781e18738202a798 = {"schemaVersion":1,"types":{"RouterOption_32_named_4361636865644661696c757265":{"kind":"data","name":"RouterOption_32_named_4361636865644661696c757265","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"CachedFailure"}}]}]},"CachedFailure":{"kind":"data","name":"CachedFailure","ctors":[{"name":"Terminal","fields":[]},{"name":"Transient","fields":[{"name":"failures","type":{"kind":"fixed","bits":32,"signed":false}},{"name":"retry_at_ms","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_constructor_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = {"schemaVersion":1,"types":{"RouterOption_3_i64":{"kind":"data","name":"RouterOption_3_i64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_constructor_value_schema_7aa8b92f1d260d364c80ff295bbb43ea4f371d9f9534578308d69fb62e06beee = {"schemaVersion":1,"types":{"RouterOption_22_rust_fixed_array_32_u8":{"kind":"data","name":"RouterOption_22_rust_fixed_array_32_u8","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"fixed","bits":8,"signed":false},"rustFixedArray":{"length":32}}}]}]}}};

const ml_constructor_value_schema_ca1fe3aef16594bc8d4df60928d1377fae36fdab49fb66a426698eddf3f826f6 = {"schemaVersion":1,"types":{"RefreshAttempt":{"kind":"data","name":"RefreshAttempt","ctors":[{"name":"RefreshAttempt","fields":[{"name":"credential","type":{"kind":"array","element":{"kind":"fixed","bits":8,"signed":false},"rustFixedArray":{"length":32}}},{"name":"failure","type":{"kind":"data","name":"RouterOption_32_named_4361636865644661696c757265"}},{"name":"rotated_at_ms","type":{"kind":"data","name":"RouterOption_3_i64"}},{"name":"rotated_to","type":{"kind":"data","name":"RouterOption_22_rust_fixed_array_32_u8"}}]}]},"RouterOption_32_named_4361636865644661696c757265":{"kind":"data","name":"RouterOption_32_named_4361636865644661696c757265","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"CachedFailure"}}]}]},"CachedFailure":{"kind":"data","name":"CachedFailure","ctors":[{"name":"Terminal","fields":[]},{"name":"Transient","fields":[{"name":"failures","type":{"kind":"fixed","bits":32,"signed":false}},{"name":"retry_at_ms","type":{"kind":"fixed","bits":64,"signed":true}}]}]},"RouterOption_3_i64":{"kind":"data","name":"RouterOption_3_i64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]},"RouterOption_22_rust_fixed_array_32_u8":{"kind":"data","name":"RouterOption_22_rust_fixed_array_32_u8","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"fixed","bits":8,"signed":false},"rustFixedArray":{"length":32}}}]}]}}};

const ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = new Map([]);

const ml_host_value_schema_933b94782117946d4e190cc3fce51cd0cc03276012789eaaf9233239ab4431f2 = {"schemaVersion":1,"types":{"CachedFailure":{"kind":"data","name":"CachedFailure","ctors":[{"name":"Terminal","fields":[]},{"name":"Transient","fields":[{"name":"failures","type":{"kind":"fixed","bits":32,"signed":false}},{"name":"retry_at_ms","type":{"kind":"fixed","bits":64,"signed":true}}]}]},"RouterOption_32_named_4361636865644661696c757265":{"kind":"data","name":"RouterOption_32_named_4361636865644661696c757265","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"CachedFailure"}}]}]}}};

const ml_host_value_refinements_933b94782117946d4e190cc3fce51cd0cc03276012789eaaf9233239ab4431f2 = new Map([]);

const ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = {"schemaVersion":1,"types":{"RouterOption_3_i64":{"kind":"data","name":"RouterOption_3_i64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = new Map([]);

const ml_host_value_schema_7aa8b92f1d260d364c80ff295bbb43ea4f371d9f9534578308d69fb62e06beee = {"schemaVersion":1,"types":{"RouterOption_22_rust_fixed_array_32_u8":{"kind":"data","name":"RouterOption_22_rust_fixed_array_32_u8","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"fixed","bits":8,"signed":false},"rustFixedArray":{"length":32}}}]}]}}};

const ml_host_value_refinements_7aa8b92f1d260d364c80ff295bbb43ea4f371d9f9534578308d69fb62e06beee = new Map([]);

function rp_726566726573682e726566726573685f73746174652e494e495449414c5f4241434b4f46465f4d53() {
  return 1000n;
}

function rp_726566726573682e726566726573685f73746174652e4d41585f4241434b4f46465f4d53() {
  return ml_fixed((ml_fixed((5n * 60n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow") * 1000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function rp_726566726573682e726566726573685f73746174652e524f544154494f4e5f47524143455f4d53() {
  return ml_fixed((ml_fixed((5n * 60n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow") * 1000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function ml_make_RefreshAttempt_RefreshAttempt(credential, failure, rotated_at_ms, rotated_to) {
  ml_assert_constructor_input(credential, {"kind":"array","element":{"kind":"fixed","bits":8,"signed":false},"rustFixedArray":{"length":32}}, ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085);
  credential = ml_copy_fixed_array(credential, {"kind":"array","element":{"kind":"fixed","bits":8,"signed":false},"rustFixedArray":{"length":32}});
  ml_validate_rust_value(credential, {"kind":"array","element":{"kind":"fixed","bits":8,"signed":false},"rustFixedArray":{"length":32}}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_assert_constructor_input(failure, {"kind":"data","name":"RouterOption_32_named_4361636865644661696c757265"}, ml_constructor_value_schema_b85c026fadd7eb0541b04e2c3ee10092cdae9a146c8319cb781e18738202a798);
  ml_validate_rust_value(failure, {"kind":"data","name":"RouterOption_32_named_4361636865644661696c757265"}, ml_host_value_schema_933b94782117946d4e190cc3fce51cd0cc03276012789eaaf9233239ab4431f2, { refinements: ml_host_value_refinements_933b94782117946d4e190cc3fce51cd0cc03276012789eaaf9233239ab4431f2 });
  ml_assert_constructor_input(rotated_at_ms, {"kind":"data","name":"RouterOption_3_i64"}, ml_constructor_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40);
  ml_validate_rust_value(rotated_at_ms, {"kind":"data","name":"RouterOption_3_i64"}, ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40, { refinements: ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 });
  ml_assert_constructor_input(rotated_to, {"kind":"data","name":"RouterOption_22_rust_fixed_array_32_u8"}, ml_constructor_value_schema_7aa8b92f1d260d364c80ff295bbb43ea4f371d9f9534578308d69fb62e06beee);
  ml_validate_rust_value(rotated_to, {"kind":"data","name":"RouterOption_22_rust_fixed_array_32_u8"}, ml_host_value_schema_7aa8b92f1d260d364c80ff295bbb43ea4f371d9f9534578308d69fb62e06beee, { refinements: ml_host_value_refinements_7aa8b92f1d260d364c80ff295bbb43ea4f371d9f9534578308d69fb62e06beee });
  return ml_snapshot_constructor_value(Object.freeze({ $: "RefreshAttempt", ["credential"]: ml_copy_fixed_array(credential, {"kind":"array","element":{"kind":"fixed","bits":8,"signed":false},"rustFixedArray":{"length":32}}), ["failure"]: failure, ["rotated_at_ms"]: rotated_at_ms, ["rotated_to"]: rotated_to }), {"kind":"data","name":"RefreshAttempt"}, ml_constructor_value_schema_ca1fe3aef16594bc8d4df60928d1377fae36fdab49fb66a426698eddf3f826f6);
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

function ml_make_CachedFailure_Terminal() {
  return Object.freeze({ $: 'Terminal' });
}

function ml_make_CachedFailure_Transient(failures, retry_at_ms) {
  if (typeof failures !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(failures, 0n, 4294967295n, "u32 argument failures out of range");
  if (!(typeof failures === 'bigint' && failures >= 0n && failures <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof retry_at_ms !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(retry_at_ms, -9223372036854775808n, 9223372036854775807n, "i64 argument retry_at_ms out of range");
  if (!(typeof retry_at_ms === 'bigint' && retry_at_ms >= -9223372036854775808n && retry_at_ms <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Transient", ["failures"]: failures, ["retry_at_ms"]: retry_at_ms });
}

export const translated = { ["INITIAL_BACKOFF_MS"]: rp_726566726573682e726566726573685f73746174652e494e495449414c5f4241434b4f46465f4d53(), ["MAX_BACKOFF_MS"]: rp_726566726573682e726566726573685f73746174652e4d41585f4241434b4f46465f4d53(), ["ROTATION_GRACE_MS"]: rp_726566726573682e726566726573685f73746174652e524f544154494f4e5f47524143455f4d53(), ["RefreshAttempt"]: ml_make_RefreshAttempt_RefreshAttempt, ["CachedFailure"]: Object.freeze({ ["Terminal"]: ml_make_CachedFailure_Terminal, ["Transient"]: ml_make_CachedFailure_Transient }) };
export const provenance = {"sourcePath":"rust/src/refresh_state.rs","sourceSha256":"19e80a6134db539df9d694302359cf150013e24cad3f552ba7f147cfff566495","executable":5,"executableFunctions":0,"executableConstants":3,"executableTypes":2,"executableConstructors":3,"carried":14,"preserved":20,"runtimeParity":false};
