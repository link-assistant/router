// Generated draft from src/deploy_local/secret.rs; sha256=c71ccee74d6f7e25b12dce61a5b7a41015a80748a48570ca289845e0ba30b9f8
// Carried constructs are data, never runtime parity evidence.
function LABEL_SUFFIX() {
  return "token-secret";
}

function PROBE_ENV() {
  return "ROUTER_DEPLOY_PROBE_TOKEN";
}

function PROBE_SCRIPT() {
  return "const r=await fetch('http://127.0.0.1:8080/api/models',{signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+process.env.ROUTER_DEPLOY_PROBE_TOKEN}});console.log(r.status)";
}

export const translated: { "LABEL_SUFFIX": string; "PROBE_ENV": string; "PROBE_SCRIPT": string } = { "LABEL_SUFFIX": LABEL_SUFFIX(), "PROBE_ENV": PROBE_ENV(), "PROBE_SCRIPT": PROBE_SCRIPT() };
export const provenance = {"sourcePath":"src/deploy_local/secret.rs","sourceSha256":"c71ccee74d6f7e25b12dce61a5b7a41015a80748a48570ca289845e0ba30b9f8","executable":3,"carried":12,"preserved":16,"runtimeParity":false};
