// Generated draft from src/usage.rs; sha256=58cb4eb54cd5cc9358b24edb70095c02e74bcb895117f476ca9c344727a0cd2a
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_75736167652e455354494d415445445f43484152535f5045525f544f4b454e() {
  return 4n;
}

function ml_make_Settlement_Settlement(tokens, estimated) {
  ml_fixed(tokens, 0n, 18446744073709551615n, "u64 argument tokens out of range");
  if (!(typeof tokens === 'bigint' && tokens >= 0n && tokens <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof estimated === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Settlement", ["tokens"]: tokens, ["estimated"]: estimated });
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

export const translated = { ["ESTIMATED_CHARS_PER_TOKEN"]: rp_75736167652e455354494d415445445f43484152535f5045525f544f4b454e(), ["Settlement"]: ml_make_Settlement_Settlement };
export const provenance = {"sourcePath":"src/usage.rs","sourceSha256":"58cb4eb54cd5cc9358b24edb70095c02e74bcb895117f476ca9c344727a0cd2a","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":15,"preserved":18,"runtimeParity":false};
