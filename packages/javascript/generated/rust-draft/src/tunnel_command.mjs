// Generated draft from src/tunnel_command.rs; sha256=3c5a81ac948cc5510f25929859b5cd435fc460b7f938e7b38c3a14bbe446e85e
// Carried constructs are data, never runtime parity evidence.
function TOKEN_ENV() {
  return "LINK_ASSISTANT_ROUTER_TOKEN";
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

function DEFAULT_IMAGE() {
  return "link-assistant-router-tunnel";
}

function SUPERVISOR() {
  return "while :; do \"$@\"; sleep 5; done";
}

function ml_make_Checked_Usable() {
  return Object.freeze({ $: 'Usable' });
}

function ml_make_Checked_Refused() {
  return Object.freeze({ $: 'Refused' });
}

function ml_make_Checked_Unreachable() {
  return Object.freeze({ $: 'Unreachable' });
}

export const translated = { ["TOKEN_ENV"]: TOKEN_ENV(), ["DEFAULT_IMAGE"]: DEFAULT_IMAGE(), ["SUPERVISOR"]: SUPERVISOR(), ["Checked"]: Object.freeze({ ["Usable"]: ml_make_Checked_Usable, ["Refused"]: ml_make_Checked_Refused, ["Unreachable"]: ml_make_Checked_Unreachable }) };
export const provenance = {"sourcePath":"src/tunnel_command.rs","sourceSha256":"3c5a81ac948cc5510f25929859b5cd435fc460b7f938e7b38c3a14bbe446e85e","executable":4,"executableFunctions":0,"executableConstants":3,"executableTypes":1,"executableConstructors":3,"carried":29,"preserved":34,"runtimeParity":false};
