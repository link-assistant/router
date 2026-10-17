// Generated draft from src/encoded_request_body.rs; sha256=93719eb74b1053297dc429a2eba5f12d03f09d5fd5eb3cd9653caa7641b540ce
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_656e636f6465645f726571756573745f626f64792e4d41585f4445434f4d5052455353494f4e5f524154494f() {
  return 200n;
}

function rp_656e636f6465645f726571756573745f626f64792e5a5354445f4445434f44455f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_656e636f6465645f726571756573745f626f64792e5a5354445f4445434f44455f4348554e4b5f4259544553() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_656e636f6465645f726571756573745f626f64792e4d41585f504152414c4c454c5f5a5354445f4445434f444553() {
  return 4n;
}

function ml_make_Encoding_Identity() {
  return Object.freeze({ $: 'Identity' });
}

function ml_make_Encoding_Zstd() {
  return Object.freeze({ $: 'Zstd' });
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

export const translated = { ["MAX_DECOMPRESSION_RATIO"]: rp_656e636f6465645f726571756573745f626f64792e4d41585f4445434f4d5052455353494f4e5f524154494f(), ["ZSTD_DECODE_TIMEOUT"]: rp_656e636f6465645f726571756573745f626f64792e5a5354445f4445434f44455f54494d454f5554(), ["ZSTD_DECODE_CHUNK_BYTES"]: rp_656e636f6465645f726571756573745f626f64792e5a5354445f4445434f44455f4348554e4b5f4259544553(), ["MAX_PARALLEL_ZSTD_DECODES"]: rp_656e636f6465645f726571756573745f626f64792e4d41585f504152414c4c454c5f5a5354445f4445434f444553(), ["Encoding"]: Object.freeze({ ["Identity"]: ml_make_Encoding_Identity, ["Zstd"]: ml_make_Encoding_Zstd }) };
export const provenance = {"sourcePath":"src/encoded_request_body.rs","sourceSha256":"93719eb74b1053297dc429a2eba5f12d03f09d5fd5eb3cd9653caa7641b540ce","executable":5,"executableFunctions":0,"executableConstants":4,"executableTypes":1,"executableConstructors":2,"carried":23,"preserved":29,"runtimeParity":false};
