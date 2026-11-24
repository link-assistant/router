// Generated draft from src/subscription_usage_cache.rs; sha256=3494015a3449bc43c2c1ffb08e1d97c4250c55f8501db0f38ed82db9d7c2d4bf
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_737562736372697074696f6e5f75736167652e63616368652e5354414e444152445f43414348455f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((3n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_737562736372697074696f6e5f75736167652e63616368652e414e5448524f5049435f43414348455f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((13n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

export const translated = { ["STANDARD_CACHE_TTL"]: rp_737562736372697074696f6e5f75736167652e63616368652e5354414e444152445f43414348455f54544c(), ["ANTHROPIC_CACHE_TTL"]: rp_737562736372697074696f6e5f75736167652e63616368652e414e5448524f5049435f43414348455f54544c() };
export const provenance = {"sourcePath":"src/subscription_usage_cache.rs","sourceSha256":"3494015a3449bc43c2c1ffb08e1d97c4250c55f8501db0f38ed82db9d7c2d4bf","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":20,"preserved":23,"runtimeParity":false};
