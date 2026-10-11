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

export const translated = { ["UNIFIED_PREFIX"]: rp_6163636f756e745f6c696d6974732e554e49464945445f505245464958(), ["MAX_VENDOR_COOLDOWN"]: rp_6163636f756e745f6c696d6974732e4d41585f56454e444f525f434f4f4c444f574e(), ["STATE_FILE"]: rp_6163636f756e745f6c696d6974732e53544154455f46494c45(), ["MODEL_FAMILIES"]: rp_6163636f756e745f6c696d6974732e4d4f44454c5f46414d494c494553() };
export const provenance = {"sourcePath":"src/account_limits.rs","sourceSha256":"2eabc27d4a716f27d202c3b72a311a929002edc1f5351cef71aee571155ed51b","executable":4,"executableFunctions":0,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":33,"preserved":38,"runtimeParity":false};
