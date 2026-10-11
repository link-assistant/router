// Generated draft from src/deploy_local/secret.rs; sha256=c71ccee74d6f7e25b12dce61a5b7a41015a80748a48570ca289845e0ba30b9f8
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_6465706c6f795f6c6f63616c2e7365637265742e4c4142454c5f535546464958() {
  return "token-secret";
}

function rp_6465706c6f795f6c6f63616c2e7365637265742e50524f42455f454e56() {
  return "ROUTER_DEPLOY_PROBE_TOKEN";
}

function rp_6465706c6f795f6c6f63616c2e7365637265742e50524f42455f534352495054() {
  return "const r=await fetch('http://127.0.0.1:8080/api/models',{signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+process.env.ROUTER_DEPLOY_PROBE_TOKEN}});console.log(r.status)";
}

function ml_make_SecretMatch_Matches() {
  return Object.freeze({ $: 'Matches' });
}

function ml_make_SecretMatch_Changed() {
  return Object.freeze({ $: 'Changed' });
}

function ml_make_SecretMatch_Unknown() {
  return Object.freeze({ $: 'Unknown' });
}

function ml_make_SecretMatch_NotSupplied() {
  return Object.freeze({ $: 'NotSupplied' });
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

function rp_6465706c6f795f6c6f63616c2e7365637265742e70726f62655f6163636570746564(status) {
  if (typeof status !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  return ((status !== 401n) && (status < 500n));
}

export const translated = { ["LABEL_SUFFIX"]: rp_6465706c6f795f6c6f63616c2e7365637265742e4c4142454c5f535546464958(), ["PROBE_ENV"]: rp_6465706c6f795f6c6f63616c2e7365637265742e50524f42455f454e56(), ["PROBE_SCRIPT"]: rp_6465706c6f795f6c6f63616c2e7365637265742e50524f42455f534352495054(), ["SecretMatch"]: Object.freeze({ ["Matches"]: ml_make_SecretMatch_Matches, ["Changed"]: ml_make_SecretMatch_Changed, ["Unknown"]: ml_make_SecretMatch_Unknown, ["NotSupplied"]: ml_make_SecretMatch_NotSupplied }), ["probe_accepted"]: rp_6465706c6f795f6c6f63616c2e7365637265742e70726f62655f6163636570746564 };
export const provenance = {"sourcePath":"src/deploy_local/secret.rs","sourceSha256":"c71ccee74d6f7e25b12dce61a5b7a41015a80748a48570ca289845e0ba30b9f8","executable":5,"executableFunctions":1,"executableConstants":3,"executableTypes":1,"executableConstructors":4,"carried":10,"preserved":16,"runtimeParity":false};
