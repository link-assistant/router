// Generated draft from src/tunnel_command.rs; sha256=3c5a81ac948cc5510f25929859b5cd435fc460b7f938e7b38c3a14bbe446e85e
// Carried constructs are data, never runtime parity evidence.
function TOKEN_ENV() {
  return "LINK_ASSISTANT_ROUTER_TOKEN";
}

function DEFAULT_IMAGE() {
  return "link-assistant-router-tunnel";
}

function SUPERVISOR() {
  return "while :; do \"$@\"; sleep 5; done";
}

export const translated = { "TOKEN_ENV": TOKEN_ENV(), "DEFAULT_IMAGE": DEFAULT_IMAGE(), "SUPERVISOR": SUPERVISOR() };
export const provenance = {"sourcePath":"src/tunnel_command.rs","sourceSha256":"3c5a81ac948cc5510f25929859b5cd435fc460b7f938e7b38c3a14bbe446e85e","executable":3,"carried":30,"preserved":34,"runtimeParity":false};
