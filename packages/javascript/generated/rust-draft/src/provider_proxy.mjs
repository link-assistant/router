// Generated draft from src/provider_proxy.rs; sha256=acdd00cd3e346de590cc41c5c497df1473e69367a2ef118c18ffffe936bb154a
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_70726f76696465725f70726f78792e50524f56494445525f434154414c4f475f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((5n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_70726f76696465725f70726f78792e50524f56494445525f4641494c45445f524546524553485f5245545259() {
  return ml_host_std_time_duration_from_secs(15n);
}

export const translated = { ["PROVIDER_CATALOG_TTL"]: rp_70726f76696465725f70726f78792e50524f56494445525f434154414c4f475f54544c(), ["PROVIDER_FAILED_REFRESH_RETRY"]: rp_70726f76696465725f70726f78792e50524f56494445525f4641494c45445f524546524553485f5245545259() };
export const provenance = {"sourcePath":"src/provider_proxy.rs","sourceSha256":"acdd00cd3e346de590cc41c5c497df1473e69367a2ef118c18ffffe936bb154a","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":32,"preserved":35,"runtimeParity":false};
