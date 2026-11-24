// Generated draft from rust/src/log_decode.rs; sha256=6cad5f4d88e96e805d2c74a5eb34bedceb0fa31d4e4ddfe92682d1d79ca0177e
// Carried constructs are data, never runtime parity evidence.
function ml_make_Encoding_Identity() {
  return Object.freeze({ $: 'Identity' });
}

function ml_make_Encoding_Gzip() {
  return Object.freeze({ $: 'Gzip' });
}

function ml_make_Encoding_Deflate() {
  return Object.freeze({ $: 'Deflate' });
}

function ml_make_Encoding_Brotli() {
  return Object.freeze({ $: 'Brotli' });
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

const router_core_base64 = {

};

const serde_json = {
  error: {

  },
};

function rp_6c6f675f6465636f64652e42524f544c495f425546464552() {
  return 4096n;
}

export const translated = { ["Encoding"]: Object.freeze({ ["Identity"]: ml_make_Encoding_Identity, ["Gzip"]: ml_make_Encoding_Gzip, ["Deflate"]: ml_make_Encoding_Deflate, ["Brotli"]: ml_make_Encoding_Brotli, ["Zstd"]: ml_make_Encoding_Zstd }), ["BROTLI_BUFFER"]: rp_6c6f675f6465636f64652e42524f544c495f425546464552() };
export const provenance = {"sourcePath":"rust/src/log_decode.rs","sourceSha256":"6cad5f4d88e96e805d2c74a5eb34bedceb0fa31d4e4ddfe92682d1d79ca0177e","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":5,"carried":4,"preserved":7,"runtimeParity":false};
