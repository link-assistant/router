// Generated draft from src/encoded_request_body.rs; sha256=93719eb74b1053297dc429a2eba5f12d03f09d5fd5eb3cd9653caa7641b540ce
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_DECOMPRESSION_RATIO() {
  return 200n;
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

function rp_656e636f6465645f726571756573745f626f64792e5a5354445f4445434f44455f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function ZSTD_DECODE_CHUNK_BYTES() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_PARALLEL_ZSTD_DECODES() {
  return 4n;
}

function ml_make_Encoding_Identity() {
  return Object.freeze({ $: 'Identity' });
}

function ml_make_Encoding_Zstd() {
  return Object.freeze({ $: 'Zstd' });
}

export const translated = { ["MAX_DECOMPRESSION_RATIO"]: MAX_DECOMPRESSION_RATIO(), ["ZSTD_DECODE_TIMEOUT"]: rp_656e636f6465645f726571756573745f626f64792e5a5354445f4445434f44455f54494d454f5554(), ["ZSTD_DECODE_CHUNK_BYTES"]: ZSTD_DECODE_CHUNK_BYTES(), ["MAX_PARALLEL_ZSTD_DECODES"]: MAX_PARALLEL_ZSTD_DECODES(), ["Encoding"]: Object.freeze({ ["Identity"]: ml_make_Encoding_Identity, ["Zstd"]: ml_make_Encoding_Zstd }) };
export const provenance = {"sourcePath":"src/encoded_request_body.rs","sourceSha256":"93719eb74b1053297dc429a2eba5f12d03f09d5fd5eb3cd9653caa7641b540ce","executable":5,"executableFunctions":0,"executableConstants":4,"executableTypes":1,"executableConstructors":2,"carried":23,"preserved":29,"runtimeParity":false};
