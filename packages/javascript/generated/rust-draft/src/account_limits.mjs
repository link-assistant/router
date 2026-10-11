// Generated draft from src/account_limits.rs; sha256=2eabc27d4a716f27d202c3b72a311a929002edc1f5351cef71aee571155ed51b
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function UNIFIED_PREFIX() {
  return "anthropic-ratelimit-unified-";
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

function rp_6163636f756e745f6c696d6974732e4d41585f56454e444f525f434f4f4c444f574e() {
  return ml_host_std_time_duration_from_secs(ml_fixed((ml_fixed((ml_fixed((8n * 24n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function STATE_FILE() {
  return "account-limits.json";
}

function ml_make_LimitScope_Credential() {
  return Object.freeze({ $: 'Credential' });
}

function ml_make_LimitScope_Model(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Model', field0: field0 });
}

export const translated = { ["UNIFIED_PREFIX"]: UNIFIED_PREFIX(), ["MAX_VENDOR_COOLDOWN"]: rp_6163636f756e745f6c696d6974732e4d41585f56454e444f525f434f4f4c444f574e(), ["STATE_FILE"]: STATE_FILE(), ["LimitScope"]: Object.freeze({ ["Credential"]: ml_make_LimitScope_Credential, ["Model"]: ml_make_LimitScope_Model }) };
export const provenance = {"sourcePath":"src/account_limits.rs","sourceSha256":"2eabc27d4a716f27d202c3b72a311a929002edc1f5351cef71aee571155ed51b","executable":4,"executableFunctions":0,"executableConstants":3,"executableTypes":1,"executableConstructors":2,"carried":33,"preserved":38,"runtimeParity":false};
