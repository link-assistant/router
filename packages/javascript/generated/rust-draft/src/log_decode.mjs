// Generated draft from src/log_decode.rs; sha256=7dc190395c8ec6d786647c81b143c591337e18ddbdeeeae86038c38d3b945b8e
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
};

const serde_json = {
  error: {

  },
};

function BROTLI_BUFFER() {
  return 4096n;
}

export const translated = { ["Encoding"]: Object.freeze({ ["Identity"]: ml_make_Encoding_Identity, ["Gzip"]: ml_make_Encoding_Gzip, ["Deflate"]: ml_make_Encoding_Deflate, ["Brotli"]: ml_make_Encoding_Brotli, ["Zstd"]: ml_make_Encoding_Zstd }), ["BROTLI_BUFFER"]: BROTLI_BUFFER() };
export const provenance = {"sourcePath":"src/log_decode.rs","sourceSha256":"7dc190395c8ec6d786647c81b143c591337e18ddbdeeeae86038c38d3b945b8e","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":5,"carried":4,"preserved":7,"runtimeParity":false};
