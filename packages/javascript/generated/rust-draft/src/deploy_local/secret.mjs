// Generated draft from src/deploy_local/secret.rs; sha256=c71ccee74d6f7e25b12dce61a5b7a41015a80748a48570ca289845e0ba30b9f8
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function LABEL_SUFFIX() {
  return "token-secret";
}

function PROBE_ENV() {
  return "ROUTER_DEPLOY_PROBE_TOKEN";
}

function PROBE_SCRIPT() {
  return "const r=await fetch('http://127.0.0.1:8080/api/models',{signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+process.env.ROUTER_DEPLOY_PROBE_TOKEN}});console.log(r.status)";
}

function probe_accepted(status) {
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  return ((status !== 401n) && (status < 500n));
}

export const translated = { "LABEL_SUFFIX": LABEL_SUFFIX(), "PROBE_ENV": PROBE_ENV(), "PROBE_SCRIPT": PROBE_SCRIPT(), probe_accepted };
export const provenance = {"sourcePath":"src/deploy_local/secret.rs","sourceSha256":"c71ccee74d6f7e25b12dce61a5b7a41015a80748a48570ca289845e0ba30b9f8","executable":4,"executableFunctions":1,"executableConstants":3,"carried":11,"preserved":16,"runtimeParity":false};
