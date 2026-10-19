// Generated draft from rust/src/gonka.rs; sha256=86cbcb1a513679781705fa59faaf048f49a47d2c4a1bd53cd50f860cfe36d9e1
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_constructor_value_schema_0824dcedca2f82d1c2bcacb0372b9850eb627c5b292c76e613827defec17f9ce = {"schemaVersion":1,"types":{"SseTerminalDetector":{"kind":"data","name":"SseTerminalDetector","ctors":[{"name":"SseTerminalDetector","fields":[{"name":"carry","type":{"kind":"array","element":{"kind":"fixed","bits":8,"signed":false}}},{"name":"terminal_in_discarded_prefix","type":{"kind":"bool"}}]}]}}};

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function rp_676f6e6b612e4d495353494e475f4150495f4b45595f4d455353414745() {
  return "Gonka broker mode requires GONKA_API_KEY";
}

function rp_676f6e6b612e434154414c4f475f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((5n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_676f6e6b612e434154414c4f475f524551554553545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_676f6e6b612e4641494c45445f524546524553485f5245545259() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_676f6e6b612e4d41585f434154414c4f475f4259544553() {
  return ml_fixed((ml_fixed((4n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_676f6e6b612e4d41585f5353455f43415252595f4259544553() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function ml_make_SseTerminalDetector_SseTerminalDetector(carry, terminal_in_discarded_prefix) {
  ml_assert_constructor_input(carry, {"kind":"array","element":{"kind":"fixed","bits":8,"signed":false}}, ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085);
  if (!ml_router_array(carry, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 255n))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof terminal_in_discarded_prefix === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "SseTerminalDetector", ["carry"]: carry, ["terminal_in_discarded_prefix"]: terminal_in_discarded_prefix }), {"kind":"data","name":"SseTerminalDetector"}, ml_constructor_value_schema_0824dcedca2f82d1c2bcacb0372b9850eb627c5b292c76e613827defec17f9ce);
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

export const translated = { ["MISSING_API_KEY_MESSAGE"]: rp_676f6e6b612e4d495353494e475f4150495f4b45595f4d455353414745(), ["CATALOG_TTL"]: rp_676f6e6b612e434154414c4f475f54544c(), ["CATALOG_REQUEST_TIMEOUT"]: rp_676f6e6b612e434154414c4f475f524551554553545f54494d454f5554(), ["FAILED_REFRESH_RETRY"]: rp_676f6e6b612e4641494c45445f524546524553485f5245545259(), ["MAX_CATALOG_BYTES"]: rp_676f6e6b612e4d41585f434154414c4f475f4259544553(), ["MAX_SSE_CARRY_BYTES"]: rp_676f6e6b612e4d41585f5353455f43415252595f4259544553(), ["SseTerminalDetector"]: ml_make_SseTerminalDetector_SseTerminalDetector };
export const provenance = {"sourcePath":"rust/src/gonka.rs","sourceSha256":"86cbcb1a513679781705fa59faaf048f49a47d2c4a1bd53cd50f860cfe36d9e1","executable":7,"executableFunctions":0,"executableConstants":6,"executableTypes":1,"executableConstructors":1,"carried":29,"preserved":37,"runtimeParity":false};
