// Generated draft from src/account_limits.rs; sha256=2eabc27d4a716f27d202c3b72a311a929002edc1f5351cef71aee571155ed51b
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function rp_6163636f756e745f6c696d6974732e554e49464945445f505245464958() {
  return "anthropic-ratelimit-unified-";
}

function rp_6163636f756e745f6c696d6974732e4d41585f56454e444f525f434f4f4c444f574e() {
  return ml_host_std_time_duration_from_secs(ml_fixed((ml_fixed((ml_fixed((8n * 24n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_6163636f756e745f6c696d6974732e53544154455f46494c45() {
  return "account-limits.json";
}

function rp_6163636f756e745f6c696d6974732e4d4f44454c5f46414d494c494553() {
  return ml_copy_fixed_array(["opus", "sonnet", "haiku"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":3}});
}

function ml_make_LimitScope_Credential() {
  return Object.freeze({ $: 'Credential' });
}

function ml_make_LimitScope_Model(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Model', field0: field0 });
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

function ml_make_ThresholdDecision_Pause(until_unix, window) {
  if (typeof until_unix !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(until_unix, 0n, 18446744073709551615n, "u64 argument until_unix out of range");
  if (!(typeof until_unix === 'bigint' && until_unix >= 0n && until_unix <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof window === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(window))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Pause", ["until_unix"]: until_unix, ["window"]: window });
}

function ml_make_ThresholdDecision_Clear() {
  return Object.freeze({ $: 'Clear' });
}

function ml_make_ThresholdDecision_Ignore() {
  return Object.freeze({ $: 'Ignore' });
}

export const translated = { ["UNIFIED_PREFIX"]: rp_6163636f756e745f6c696d6974732e554e49464945445f505245464958(), ["MAX_VENDOR_COOLDOWN"]: rp_6163636f756e745f6c696d6974732e4d41585f56454e444f525f434f4f4c444f574e(), ["STATE_FILE"]: rp_6163636f756e745f6c696d6974732e53544154455f46494c45(), ["MODEL_FAMILIES"]: rp_6163636f756e745f6c696d6974732e4d4f44454c5f46414d494c494553(), ["LimitScope"]: Object.freeze({ ["Credential"]: ml_make_LimitScope_Credential, ["Model"]: ml_make_LimitScope_Model }), ["ThresholdDecision"]: Object.freeze({ ["Pause"]: ml_make_ThresholdDecision_Pause, ["Clear"]: ml_make_ThresholdDecision_Clear, ["Ignore"]: ml_make_ThresholdDecision_Ignore }) };
export const provenance = {"sourcePath":"src/account_limits.rs","sourceSha256":"2eabc27d4a716f27d202c3b72a311a929002edc1f5351cef71aee571155ed51b","executable":6,"executableFunctions":0,"executableConstants":4,"executableTypes":2,"executableConstructors":5,"carried":31,"preserved":38,"runtimeParity":false};
