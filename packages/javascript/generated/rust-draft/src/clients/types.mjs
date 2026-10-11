// Generated draft from src/clients/types.rs; sha256=1c1e65f8bfce65eccc9603acc0b2837c09e80938abf8d8a517fcc9fd10bd55c6
// Carried constructs are data, never runtime parity evidence.
function ml_make_ClientError_ClientError(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ClientError", ["field0"]: field0 });
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

export const translated = { ["ClientError"]: ml_make_ClientError_ClientError };
export const provenance = {"sourcePath":"src/clients/types.rs","sourceSha256":"1c1e65f8bfce65eccc9603acc0b2837c09e80938abf8d8a517fcc9fd10bd55c6","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":11,"preserved":12,"runtimeParity":false};
