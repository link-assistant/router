// Generated draft from src/gonka.rs; sha256=e88edf7455de0af62be89883df2ca5063a60aa59591f22ee75f73dec6e3a15b9
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MISSING_API_KEY_MESSAGE() {
  return "Gonka broker mode requires GONKA_API_KEY";
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

function rp_676f6e6b612e434154414c4f475f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((5n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_676f6e6b612e434154414c4f475f524551554553545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_676f6e6b612e4641494c45445f524546524553485f5245545259() {
  return ml_host_std_time_duration_from_secs(15n);
}

function MAX_CATALOG_BYTES() {
  return ml_fixed((ml_fixed((4n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_SSE_CARRY_BYTES() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { ["MISSING_API_KEY_MESSAGE"]: MISSING_API_KEY_MESSAGE(), ["CATALOG_TTL"]: rp_676f6e6b612e434154414c4f475f54544c(), ["CATALOG_REQUEST_TIMEOUT"]: rp_676f6e6b612e434154414c4f475f524551554553545f54494d454f5554(), ["FAILED_REFRESH_RETRY"]: rp_676f6e6b612e4641494c45445f524546524553485f5245545259(), ["MAX_CATALOG_BYTES"]: MAX_CATALOG_BYTES(), ["MAX_SSE_CARRY_BYTES"]: MAX_SSE_CARRY_BYTES() };
export const provenance = {"sourcePath":"src/gonka.rs","sourceSha256":"e88edf7455de0af62be89883df2ca5063a60aa59591f22ee75f73dec6e3a15b9","executable":6,"executableFunctions":0,"executableConstants":6,"executableTypes":0,"executableConstructors":0,"carried":30,"preserved":37,"runtimeParity":false};
